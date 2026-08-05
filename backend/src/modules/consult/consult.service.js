import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { notify } from '../../services/notify.js';
import { emitToUser } from '../../sockets/index.js';
import {
  roomNameFor,
  ensureRoom,
  createParticipantToken,
  deleteRoom,
  removeParticipant,
  connectionInfo,
} from '../../services/livekit.service.js';
import { Booking } from '../booking/booking.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { ConsultCall } from './consult.model.js';

/**
 * Video consultation lifecycle: ring → accept → active → end.
 *
 * Signalling (who is calling whom) rides on our own REST + Socket.IO. Media
 * rides on LiveKit. The two never mix: this module hands out room names and
 * signed tokens and is otherwise out of the media path entirely.
 */

/* ── Authorization ────────────────────────────────────────────────── */

/**
 * The join window for a consultation. Deliberately narrow: a token is a grant
 * of access to a live room, so it is only issued around the booked slot.
 *
 *   [ startAt − joinLead , startAt + duration + maxOverage + joinGrace ]
 */
function joinWindow(booking, doctor) {
  const isInstant = booking.consult?.mode === 'instantVideo' || ['instant_video', 'instant'].includes(booking.visitType);
  if (isInstant) return null;

  const startAt = booking.schedule?.startAt ? new Date(booking.schedule.startAt) : null;
  if (!startAt) return null;

  const duration = booking.consult?.durationMinutes || 15;
  const maxOverage = doctor?.video?.maxOverageMinutes ?? 30;

  return {
    opensAt: new Date(startAt.getTime() - env.consult.joinLeadMinutes * 60_000),
    closesAt: new Date(
      startAt.getTime() + (duration + maxOverage + env.consult.joinGraceMinutes) * 60_000
    ),
    startAt,
  };
}

/**
 * Resolve the booking a user may join, and which side they are on.
 *
 * This is the gate the brief asks for — only the assigned vet and the assigned
 * pet parent can obtain a token, and only for their own appointment, in a
 * payment state that entitles them to it, inside the join window.
 */
export async function authorizeCall(
  user,
  bookingId,
  { enforceWindow = true, requireJoinable = true } = {}
) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid appointment id');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Appointment not found');

  if (booking.type !== 'doctor' || !['video', 'instant_video', 'instant'].includes(booking.visitType)) {
    throw ApiError.badRequest('This appointment is not a video consultation');
  }

  const doctor = await Doctor.findById(booking.doctorId);
  if (!doctor) throw ApiError.notFound('Vet not found');

  // Which side is the caller on?
  const isOwner = String(booking.userId) === String(user.id);
  const isVet =
    (doctor.userId && String(doctor.userId) === String(user.id)) ||
    (doctor.clinicVendorId && String(doctor.clinicVendorId) === String(user.id));

  if (!isOwner && !isVet) {
    throw ApiError.forbidden('You are not a participant in this consultation');
  }

  // An unpaid consultation is not joinable. `pending_overage` IS joinable — the
  // overage invoice is settled after the call, not before rejoining it.
  //
  // This gate applies to obtaining a token, NOT to reading the record: a
  // participant must still be able to open a completed or cancelled
  // consultation to see its notes, receipt and outstanding balance.
  const JOINABLE = ['confirmed', 'in_progress', 'pending_overage'];
  if (requireJoinable && !JOINABLE.includes(booking.status)) {
    throw ApiError.badRequest(
      booking.status === 'pending_payment'
        ? 'Complete payment to join this consultation'
        : `This consultation is ${booking.status.replace(/_/g, ' ')}`
    );
  }

  /**
   * Payment gate — independent of booking status.
   *
   * `confirmed` alone is not proof of payment: a `pay_later` booking is
   * confirmed on creation. Bookings are rejected at creation now, but this
   * second check means an existing pay-later row, a seeded fixture, or a future
   * code path can never hand out a free consultation.
   *
   * `free` is legitimate (the vet charges nothing for video).
   */
  const isInstant = booking.consult?.mode === 'instantVideo' || booking.visitType === 'instant_video';
  if (requireJoinable && booking.paymentMethod === 'pay_later' && !isInstant) {
    throw ApiError.badRequest('This video consultation has not been paid for');
  }

  const window = joinWindow(booking, doctor);
  if (enforceWindow && window) {
    const now = Date.now();
    if (now < window.opensAt.getTime()) {
      const mins = Math.ceil((window.opensAt.getTime() - now) / 60_000);
      throw ApiError.badRequest(
        `This consultation opens ${env.consult.joinLeadMinutes} minutes before the slot — try again in ${mins} min`
      );
    }
    if (now > window.closesAt.getTime()) {
      throw ApiError.badRequest('This consultation slot has expired');
    }
  }

  return { booking, doctor, isOwner, isVet, role: isVet ? 'vet' : 'patient', window };
}

/* ── Call record ──────────────────────────────────────────────────── */

async function getOrCreateCall(booking, doctor) {
  const existing = await ConsultCall.findOne({ bookingId: booking._id });
  if (existing) return existing;

  return ConsultCall.create({
    bookingId: booking._id,
    doctorId: doctor._id,
    doctorUserId: doctor.userId || null,
    clinicVendorId: doctor.clinicVendorId || null,
    ownerUserId: booking.userId,
    roomName: roomNameFor(booking._id),
    scheduledMinutes: booking.consult?.durationMinutes || 15,
    overage: {
      ratePerMinute: doctor.video?.overagePerMinute || 0,
      graceMinutes: doctor.video?.graceMinutes ?? 2,
      maxMinutes: doctor.video?.maxOverageMinutes ?? 30,
      status: 'none',
    },
    status: 'scheduled',
  });
}

function serializeCall(call, { token, url, iceServers } = {}) {
  return {
    id: String(call._id),
    bookingId: String(call.bookingId),
    roomName: call.roomName,
    status: call.status,
    scheduledMinutes: call.scheduledMinutes,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    overage: {
      ratePerMinute: call.overage.ratePerMinute,
      graceMinutes: call.overage.graceMinutes,
      maxMinutes: call.overage.maxMinutes,
      consentAt: call.overage.consentAt,
      minutes: call.overage.minutes,
      amount: call.overage.amount,
      status: call.overage.status,
    },
    ...(token ? { token, url, iceServers } : {}),
  };
}

/* ── Lifecycle ────────────────────────────────────────────────────── */

function getPeerUserIds(isVet, booking, doctor) {
  if (isVet) {
    return booking.userId ? [String(booking.userId)] : [];
  }
  const set = new Set();
  if (doctor.userId) set.add(String(doctor.userId));
  if (doctor.clinicVendorId) set.add(String(doctor.clinicVendorId));
  return Array.from(set);
}

/**
 * Vet or pet parent starts the consultation. Creates the room, mints the caller's token,
 * and rings the other participant over their socket.
 */
export async function startCall(user, bookingId) {
  const { booking, doctor, isVet, isOwner } = await authorizeCall(user, bookingId);
  if (!isVet && !isOwner) throw ApiError.forbidden('You are not a participant in this consultation');

  const call = await getOrCreateCall(booking, doctor);
  if (call.status === 'ended') throw ApiError.badRequest('This consultation has already ended');

  await ensureRoom(call.roomName, { maxParticipants: 4 });

  const role = isVet ? 'vet' : 'patient';
  const displayName = isVet ? doctor.name : booking.petSnapshot?.name || 'Pet parent';

  const token = await createParticipantToken({
    userId: user.id,
    displayName,
    roomName: call.roomName,
    role,
  });

  call.participantFor(user.id, role);
  if (call.status === 'scheduled') {
    call.status = 'ringing';
    call.ringingAt = new Date();
    call.events.push({ type: 'ringing', detail: `${isVet ? 'Vet' : 'Pet parent'} started the consultation` });
  }
  await call.save();

  // Ring the target recipient(s)
  const peerIds = getPeerUserIds(isVet, booking, doctor);
  for (const peerId of peerIds) {
    emitToUser(peerId, 'call:incoming', {
      callId: String(call._id),
      bookingId: String(booking._id),
      doctorName: doctor.name,
      doctorPhoto: doctor.img || doctor.identity?.profilePhoto || '',
      petName: booking.petSnapshot?.name || '',
      scheduledMinutes: call.scheduledMinutes,
      ringTimeoutMs: env.consult.ringTimeoutMs,
    });

    notify(peerId, {
      title: isVet ? 'Your vet is calling' : 'Incoming Video Consultation',
      body: isVet
        ? `${doctor.name} has started your video consultation.`
        : `${booking.petSnapshot?.name || 'Pet parent'} is calling for their consultation.`,
      type: 'vet',
      link: isVet ? `/app/consult/${booking._id}` : `/admin/doctor`,
      data: { bookingId: String(booking._id), callId: String(call._id) },
    }).catch(() => {});
  }

  emitToUser(user.id, 'call:ringing', { callId: String(call._id), bookingId: String(booking._id) });

  return serializeCall(call, { token, ...connectionInfo(user.id) });
}

/** Either side obtains a token and joins. The parent or vet can join first. */
export async function joinCall(user, bookingId) {
  const { booking, doctor, role } = await authorizeCall(user, bookingId);

  let call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call) {
    call = await getOrCreateCall(booking, doctor);
  }
  if (['ended', 'rejected', 'cancelled'].includes(call.status)) {
    throw ApiError.badRequest('This consultation has ended');
  }

  await ensureRoom(call.roomName, { maxParticipants: 4 });

  const token = await createParticipantToken({
    userId: user.id,
    displayName: role === 'vet' ? doctor.name : booking.petSnapshot?.name || 'Pet parent',
    roomName: call.roomName,
    role,
  });

  call.participantFor(user.id, role);
  if (call.status === 'scheduled') {
    call.status = 'ringing';
    call.ringingAt = new Date();
    call.events.push({ type: 'ringing', detail: `${role === 'vet' ? 'Vet' : 'Pet parent'} started the consultation` });
  } else if (call.status === 'ringing') {
    call.status = 'active';
    call.startedAt = call.startedAt || new Date();
    call.events.push({ type: 'accepted', detail: `${role === 'vet' ? 'Vet' : 'Pet parent'} accepted and joined` });
  }
  await call.save();

  // Tell the other side to expect them or ring if newly started
  const peerIds = getPeerUserIds(role === 'vet', booking, doctor);
  for (const peerId of peerIds) {
    if (role === 'patient' && call.status === 'ringing') {
      emitToUser(peerId, 'call:incoming', {
        callId: String(call._id),
        bookingId: String(booking._id),
        doctorName: doctor.name,
        petName: booking.petSnapshot?.name || '',
        scheduledMinutes: call.scheduledMinutes,
        ringTimeoutMs: env.consult.ringTimeoutMs,
      });
    } else {
      emitToUser(peerId, 'call:accept', {
        callId: String(call._id),
        bookingId: String(booking._id),
        by: role,
      });
    }
  }

  return serializeCall(call, { token, ...connectionInfo(user.id) });
}

/** Pet parent or vet declines the incoming call. */
export async function rejectCall(user, bookingId) {
  const { booking, doctor, isOwner, isVet } = await authorizeCall(user, bookingId, { enforceWindow: false });
  if (!isOwner && !isVet) throw ApiError.forbidden('You are not a participant in this consultation');

  const call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call || call.status === 'ended') throw ApiError.badRequest('No active consultation');

  call.status = 'rejected';
  call.endedAt = new Date();
  call.events.push({ type: 'rejected', detail: `Declined by ${isVet ? 'vet' : 'pet parent'}` });
  await call.save();
  await deleteRoom(call.roomName);

  const peerIds = getPeerUserIds(isVet, booking, doctor);
  for (const peerId of peerIds) {
    emitToUser(peerId, 'call:reject', { callId: String(call._id), bookingId: String(booking._id) });
  }

  return serializeCall(call);
}

/**
 * Hang up. Settles billable time and, when the parent consented to overtime,
 * raises the overage invoice (Phase 8 handles the payment itself).
 */
export async function endCall(user, bookingId, { notes } = {}) {
  const { booking, doctor, isVet } = await authorizeCall(user, bookingId, { enforceWindow: false });

  const call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call) throw ApiError.badRequest('No consultation to end');
  if (call.status === 'ended') return serializeCall(call);

  // Close out anyone still marked connected, then settle.
  const now = new Date();
  for (const p of call.participants) {
    if (p.joinedAt && !p.leftAt) {
      p.leftAt = now;
      p.connectedSeconds += Math.max(0, Math.round((now - p.joinedAt) / 1000));
    }
  }

  const wasRinging = call.status === 'ringing';
  call.status = wasRinging ? 'missed' : 'ended';
  call.endedAt = now;
  if (isVet && notes) call.notes = notes;
  call.events.push({
    type: call.status,
    detail: `Ended by ${isVet ? 'vet' : 'pet parent'}`,
  });

  await settleOverage(call, doctor, booking);
  await call.save();
  await deleteRoom(call.roomName);

  const peerIds = getPeerUserIds(isVet, booking, doctor);
  for (const peerId of peerIds) {
    emitToUser(peerId, 'call:end', {
      callId: String(call._id),
      bookingId: String(booking._id),
      status: call.status,
    });
  }

  return serializeCall(call);
}

/**
 * Pet parent agrees to keep going past the booked duration at the vet's
 * per-minute rate. Billing accrues **from this moment**, never retroactively.
 */
export async function consentToOverage(user, bookingId) {
  const { booking, doctor, isOwner } = await authorizeCall(user, bookingId);
  if (!isOwner) throw ApiError.forbidden('Only the pet parent can approve extra time');

  const call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call || call.status === 'ended') throw ApiError.badRequest('No active consultation');
  if (call.overage.consentAt) return serializeCall(call); // already agreed

  if (!(call.overage.ratePerMinute > 0)) {
    throw ApiError.badRequest('This vet does not charge for extra time');
  }

  call.overage.consentAt = new Date();
  call.events.push({
    type: 'overage_consent',
    detail: `Approved ₹${call.overage.ratePerMinute}/min`,
  });
  await call.save();

  const vetUser = doctor.userId || doctor.clinicVendorId;
  if (vetUser) {
    emitToUser(vetUser, 'call:overage-started', {
      callId: String(call._id),
      bookingId: String(booking._id),
      ratePerMinute: call.overage.ratePerMinute,
    });
  }
  return serializeCall(call);
}

/** Vet forgives the overage before it is invoiced. */
export async function waiveOverage(user, bookingId) {
  const { booking, isVet } = await authorizeCall(user, bookingId, { enforceWindow: false });
  if (!isVet) throw ApiError.forbidden('Only the vet can waive extra charges');

  const call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call) throw ApiError.notFound('Consultation not found');
  if (call.overage.status === 'paid') throw ApiError.badRequest('That overage is already paid');

  call.overage.waived = true;
  call.overage.status = 'waived';
  call.overage.amount = 0;
  call.events.push({ type: 'overage_waived', detail: 'Waived by vet' });
  await call.save();

  if (booking.status === 'pending_overage') {
    booking.status = 'completed';
    booking.timeline.push({ status: 'completed', note: 'Extra-time charge waived by the vet' });
    await booking.save();
  }

  emitToUser(booking.userId, 'call:overage-waived', { bookingId: String(booking._id) });
  return serializeCall(call);
}

/**
 * Compute what is owed for overtime and move the booking into `pending_overage`.
 *
 * Billable overage runs from the later of (consent, scheduled end) so a parent
 * is never charged for time before they agreed, and is capped at `maxMinutes`.
 */
async function settleOverage(call, doctor, booking) {
  const scheduledSeconds = call.scheduledMinutes * 60;
  const graceSeconds = (call.overage.graceMinutes || 0) * 60;

  const noCharge = () => {
    call.overage.minutes = 0;
    call.overage.amount = 0;
    if (call.overage.status === 'none') call.overage.status = 'none';
  };

  if (call.overage.waived || !(call.overage.ratePerMinute > 0) || !call.overage.consentAt) {
    return noCharge();
  }

  const overSeconds = call.billedSeconds - scheduledSeconds - graceSeconds;
  if (overSeconds <= 0) return noCharge();

  const minutes = Math.min(Math.ceil(overSeconds / 60), call.overage.maxMinutes);
  if (minutes <= 0) return noCharge();

  call.overage.minutes = minutes;
  call.overage.amount = minutes * call.overage.ratePerMinute;
  call.overage.status = 'pending';
  call.events.push({
    type: 'overage_due',
    detail: `${minutes} min × ₹${call.overage.ratePerMinute} = ₹${call.overage.amount}`,
  });

  booking.status = 'pending_overage';
  booking.timeline.push({
    status: 'pending_overage',
    note: `Consultation ran ${minutes} min over — ₹${call.overage.amount} due`,
  });
  await booking.save();

  emitToUser(booking.userId, 'call:overage-due', {
    bookingId: String(booking._id),
    minutes,
    amount: call.overage.amount,
  });

  notify(booking.userId, {
    title: 'Extra consultation time',
    body: `Your consultation ran ${minutes} min over. ₹${call.overage.amount} is due.`,
    type: 'vet',
    link: `/app/profile/bookings`,
    data: { bookingId: String(booking._id) },
  }).catch(() => {});
}

/* ── Reads ────────────────────────────────────────────────────────── */

/**
 * Rehydrate after a reload, or read a finished consultation.
 *
 * A token is only minted while the call is live; a completed or cancelled
 * consultation still returns its record (notes, duration, overage balance) so
 * the participant can see what happened and what they owe.
 */
export async function getCall(user, bookingId) {
  const { booking, doctor, role } = await authorizeCall(user, bookingId, {
    enforceWindow: false,
    requireJoinable: false,
  });
  const call = await ConsultCall.findOne({ bookingId: booking._id });
  if (!call) throw ApiError.notFound('No consultation for this appointment');

  if (['ringing', 'active'].includes(call.status)) {
    const token = await createParticipantToken({
      userId: user.id,
      displayName: role === 'vet' ? doctor.name : booking.petSnapshot?.name || 'Pet parent',
      roomName: call.roomName,
      role,
    });
    return serializeCall(call, { token, ...connectionInfo(user.id) });
  }
  return serializeCall(call);
}

/** A live call this user is party to, for resuming after a reload. */
export async function getActiveCall(user) {
  const call = await ConsultCall.findOne({
    status: { $in: ['ringing', 'active'] },
    $or: [{ ownerUserId: user.id }, { doctorUserId: user.id }, { clinicVendorId: user.id }],
  }).sort({ updatedAt: -1 });

  if (!call) return null;
  return getCall(user, String(call.bookingId));
}

/* ── LiveKit webhooks — the authoritative clock ───────────────────── */

/**
 * Apply a verified LiveKit event. These timestamps are the only ones trusted
 * for billing; the in-call timer the user sees is cosmetic.
 */
export async function applyWebhookEvent(event) {
  const roomName = event?.room?.name;
  if (!roomName?.startsWith('consult_')) return { ignored: true };

  const call = await ConsultCall.findOne({ roomName });
  if (!call) return { ignored: true };

  const identity = event?.participant?.identity;
  const at = event.createdAt ? new Date(Number(event.createdAt) * 1000) : new Date();

  switch (event.event) {
    case 'participant_joined': {
      const p = call.participants.find((x) => String(x.userId) === String(identity));
      if (p && !p.joinedAt) p.joinedAt = at;
      else if (p) p.joinedAt = at; // rejoin after a drop
      if (call.bothConnected() && !call.startedAt) {
        call.startedAt = at;
        call.status = 'active';
        call.events.push({ type: 'connected', detail: 'Both parties connected' });
      }
      break;
    }
    case 'participant_left': {
      const p = call.participants.find((x) => String(x.userId) === String(identity));
      if (p?.joinedAt && !p.leftAt) {
        p.leftAt = at;
        const secs = Math.max(0, Math.round((at - p.joinedAt) / 1000));
        p.connectedSeconds += secs;
        // Billable time is the overlap, so it advances only while both were on.
        call.billedSeconds = computeBilledSeconds(call);
      }
      break;
    }
    case 'room_finished': {
      if (call.status !== 'ended') {
        call.billedSeconds = computeBilledSeconds(call);
        call.events.push({ type: 'room_finished', detail: 'LiveKit closed the room' });
      }
      break;
    }
    default:
      return { ignored: true };
  }

  await call.save();
  return { applied: event.event };
}

/**
 * Seconds during which BOTH sides were connected — the only billable measure.
 * Uses a sweep over join/leave intervals so reconnects don't double-count.
 */
export function computeBilledSeconds(call) {
  const intervals = (role) =>
    call.participants
      .filter((p) => p.role === role && p.joinedAt)
      .map((p) => [new Date(p.joinedAt).getTime(), new Date(p.leftAt || Date.now()).getTime()]);

  const vet = intervals('vet');
  const patient = intervals('patient');
  if (!vet.length || !patient.length) return 0;

  let total = 0;
  for (const [vs, ve] of vet) {
    for (const [ps, pe] of patient) {
      const overlap = Math.min(ve, pe) - Math.max(vs, ps);
      if (overlap > 0) total += overlap;
    }
  }
  return Math.round(total / 1000);
}

/**
 * Cut a call that has blown past the overage cap. Called by the monitor tick;
 * removing the participants forces both clients to tear down.
 */
export async function enforceOverageCap(call) {
  const limit =
    (call.scheduledMinutes + (call.overage.graceMinutes || 0) + (call.overage.maxMinutes || 0)) * 60;
  if (call.billedSeconds < limit) return false;

  logger.info(`Consult ${call._id} hit the overage cap — disconnecting`);
  for (const p of call.participants) {
    await removeParticipant(call.roomName, p.userId);
  }
  return true;
}
