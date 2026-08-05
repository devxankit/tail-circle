import { ApiError } from '../../utils/ApiError.js';
import { refundPayment } from '../../services/razorpay.service.js';
import { notify } from '../../services/notify.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { Payment } from '../payment/payment.model.js';
import { Provider } from '../provider/provider.model.js';
import { ServiceOffering } from '../provider/serviceOffering.model.js';
import { Doctor, modeForVisitType } from '../provider/doctor.model.js';
import { getDoctorSlots } from '../provider/availability.service.js';
import { Event } from '../provider/event.model.js';
import { Pet } from '../pet/pet.model.js';
import { Address } from '../address/address.model.js';
import { SlotBooking } from './slot.model.js';
import { Booking, CANCELLABLE_BOOKING_STATUSES } from './booking.model.js';

const toPaise = (rupees) => Math.round(rupees * 100);

const isObjectId = (v) => /^[0-9a-f]{24}$/i.test(String(v));

/** Find by Mongo id or mock legacyId (string for providers, number for docs/events). */
function idOrLegacyFilter(id, { numericLegacy = false } = {}) {
  const or = [];
  if (isObjectId(id)) or.push({ _id: id });
  or.push({ legacyId: numericLegacy ? Number(id) || -1 : String(id) });
  return { $or: or };
}

/** Resolve offerings by legacyId, scoped to provider (or platform-wide). */
async function resolveOfferings(providerId, providerType, refs) {
  if (!refs?.length) return [];
  const offerings = await ServiceOffering.find({
    legacyId: { $in: refs.map((r) => r.refId) },
    providerType,
    active: true,
    $or: [{ providerId }, { providerId: null }],
  });
  const byLegacy = new Map(offerings.map((o) => [o.legacyId, o]));
  return refs.map((r) => {
    const offering = byLegacy.get(r.refId);
    if (!offering) throw ApiError.badRequest(`Unknown service item: ${r.refId}`);
    return {
      kind: offering.kind,
      refId: offering.legacyId,
      name: offering.name,
      price: offering.price,
      unit: offering.unit,
      qty: Math.max(1, r.qty || 1),
    };
  });
}

// Fixed pricing adjustments the mock flows display — mirrored exactly so the
// charged amount equals what the price-summary screens show (rupees).
const PRICING_RULES = {
  daycare: { discount: 300, platformFee: 49 },
  grooming: { discount: 100, homeVisitFee: 50 },
  doctor: { onlinePlatformFee: 29 }, // DoctorCheckout shows it for prepaid only
};

/** Human labels for consult modes — used in item names and error messages. */
const MODE_LABEL = {
  inClinic: 'Clinic Consultation',
  video: 'Video Consultation',
  instantVideo: 'Instant Video Call',
  homeVisit: 'Home Visit',
  emergency: 'Emergency Consultation',
};

/**
 * Modes that must be paid before the appointment exists.
 *
 * In-clinic and home visits involve a physical handover, so cash-on-arrival is
 * legitimate. A video consult does not: the room opens as soon as the vet
 * starts it and there is no point at which anyone can collect payment, so
 * `pay_later` would hand out a free consultation.
 */
const PREPAID_MODES = new Set(['video', 'instantVideo']);

/**
 * Was there a completed consult with this vet for this pet recently enough to
 * price as a follow-up? Window is the vet's own `policies.followUpWindowDays`.
 */
async function isFollowUpVisit(userId, doctor, petId) {
  const days = doctor.policies?.followUpWindowDays ?? 0;
  if (!days || !petId) return false;

  const since = new Date(Date.now() - days * 86_400_000);
  const previous = await Booking.exists({
    userId,
    doctorId: doctor._id,
    petId,
    status: 'completed',
    updatedAt: { $gte: since },
  });
  return Boolean(previous);
}

/** Take one seat in a slot atomically; throws when the slot is full. */
async function takeSlot({ providerId, doctorId = null, date, time, capacity }) {
  const filter = { providerId, doctorId, date, time };
  await SlotBooking.updateOne(
    filter,
    { $setOnInsert: { ...filter, capacity, booked: 0 } },
    { upsert: true }
  );
  const res = await SlotBooking.updateOne(
    { ...filter, $expr: { $lt: ['$booked', ['$capacity']] } },
    { $inc: { booked: 1 } }
  );
  if (res.modifiedCount === 0) {
    throw ApiError.badRequest('That slot just filled up — please pick another time');
  }
}

async function releaseSlot({ providerId, doctorId = null, date, time }) {
  await SlotBooking.updateOne(
    { providerId, doctorId, date, time, booked: { $gt: 0 } },
    { $inc: { booked: -1 } }
  );
}

/**
 * Build the priced booking skeleton per vertical. Every price comes from the
 * catalog; client numbers are never trusted.
 */
async function buildBooking(user, payload) {
  const { type } = payload;
  const base = {
    userId: user.id,
    type,
    schedule: {
      startDate: payload.schedule?.startDate || null,
      endDate: payload.schedule?.endDate || null,
      time: payload.schedule?.time || null,
      durationDays: payload.schedule?.durationDays || null,
    },
    visitType: payload.visitType || null,
    meta: payload.meta || {},
    items: [],
  };

  // Pet snapshot (optional for events/memorial)
  if (payload.petId) {
    const pet = await Pet.findOne({ _id: payload.petId, ownerId: user.id, deletedAt: null });
    if (!pet) throw ApiError.badRequest('Select a valid pet');
    base.petId = pet.id;
    base.petSnapshot = {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      age: pet.age,
      avatar: pet.avatarUrl || pet.photos?.[0] || '',
    };
  }

  if (type === 'event') {
    const event = await Event.findOne({
      ...idOrLegacyFilter(payload.eventId, { numericLegacy: true }),
      status: 'published',
    });
    if (!event) throw ApiError.badRequest('Event not found');
    base.eventId = event.id;
    base.items = [
      {
        kind: 'ticket',
        refId: String(event.legacyId ?? event.id),
        name: event.title,
        price: event.price,
        qty: Math.max(1, payload.ticketQty || 1),
      },
    ];
  } else if (type === 'daycare' || type === 'grooming') {
    const provider = await Provider.findOne({
      ...idOrLegacyFilter(payload.providerId),
      active: true,
    });
    if (!provider) throw ApiError.badRequest('Provider not found');
    base.providerId = provider.id;

    if (payload.addressId) {
      const address = await Address.findOne({ _id: payload.addressId, userId: user.id });
      if (!address) throw ApiError.badRequest('Select a valid address');
      base.addressId = address.id;
      base.addressSnapshot = {
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        locality: address.locality,
        city: address.city,
        pincode: address.pincode,
      };
    }

    base.items = await resolveOfferings(provider._id, type, payload.items);

    if (type === 'daycare' || type === 'grooming') {
      if (!base.schedule.startDate || !base.schedule.time) {
        throw ApiError.badRequest('Pick a date and time slot');
      }
      await takeSlot({
        providerId: provider.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
        capacity: 2,
      });
      base._slot = { providerId: provider.id, date: base.schedule.startDate, time: base.schedule.time };
    }
  } else if (type === 'doctor') {
    const doctor = await Doctor.findOne({
      ...idOrLegacyFilter(payload.doctorId, { numericLegacy: true }),
      active: true,
    });
    if (!doctor) throw ApiError.badRequest('Doctor not found');
    base.doctorId = doctor.id;

    const visitType = payload.visitType || 'clinic';
    const isInstant = visitType === 'instant_video' || visitType === 'instant';
    const mode = isInstant ? 'instantVideo' : modeForVisitType(visitType);
    if (!mode) throw ApiError.badRequest('Invalid consultation type');

    const offersMode = doctor.offersMode(mode) || (isInstant && doctor.offersMode('video'));
    if (!offersMode) {
      throw ApiError.badRequest(`${doctor.name} does not offer ${MODE_LABEL[mode]} appointments`);
    }

    if (PREPAID_MODES.has(mode) && payload.paymentMethod === 'pay_later') {
      throw ApiError.badRequest(
        `${MODE_LABEL[mode]} must be paid for in advance — pay-at-clinic is only available for in-person visits`
      );
    }

    let isFollowUp = false;
    let fee = 0;
    let durationMinutes = 15;

    if (isInstant) {
      const now = new Date();
      const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      base.schedule.startDate = ymd;
      base.schedule.time = hhmm;
      base.schedule.startAt = now;
      durationMinutes = doctor.modes?.instantVideo?.durationMinutes || doctor.modes?.video?.durationMinutes || 15;
      fee = doctor.feeFor('instantVideo') ?? doctor.feeFor('video') ?? doctor.videoPrice ?? 499;
      base.visitType = 'video';
      base.consult = {
        mode: 'instantVideo',
        durationMinutes,
        isFollowUp: false,
      };
    } else {
      if (!base.schedule.startDate || !base.schedule.time) {
        throw ApiError.badRequest('Pick a date and time slot');
      }

      const { slots } = await getDoctorSlots({
        doctorId: doctor.id,
        date: base.schedule.startDate,
        visitType,
        includeFull: true,
      });
      const slot = slots.find((s) => s.time === base.schedule.time);
      if (!slot) throw ApiError.badRequest('That time is not available — please pick another slot');
      if (!slot.available) throw ApiError.badRequest('That slot just filled up — please pick another time');

      isFollowUp = await isFollowUpVisit(user.id, doctor, base.petId);
      fee = doctor.feeFor(mode, { followUp: isFollowUp });
      if (fee == null) throw ApiError.badRequest('This consultation type is unavailable');

      base.visitType = visitType;
      base.schedule.startAt = slot.startAt ? new Date(slot.startAt) : null;
      durationMinutes = slot.durationMinutes;
      base.consult = {
        mode,
        durationMinutes,
        isFollowUp,
      };
    }

    base.items = [
      {
        kind: 'consultation',
        refId: String(doctor.legacyId ?? doctor.id),
        name: `${isInstant ? 'Instant ' : isFollowUp ? 'Follow-up ' : ''}${MODE_LABEL[mode] || 'Video Consultation'} — ${doctor.name}`,
        price: fee,
        qty: 1,
      },
    ];

    if (payload.paymentMethod === 'razorpay') {
      base.items.push({
        kind: 'fee', refId: null, name: 'Platform Fee',
        price: PRICING_RULES.doctor.onlinePlatformFee, qty: 1,
      });
    }
    if (!isInstant && slot) {
      await takeSlot({
        providerId: doctor.providerId || doctor.id,
        doctorId: doctor.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
        capacity: slot.capacity || 1,
      });
      base._slot = {
        providerId: doctor.providerId || doctor.id,
        doctorId: doctor.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
      };
    }
  } else if (type === 'event') {
    const event = await Event.findOne({
      ...idOrLegacyFilter(payload.eventId, { numericLegacy: true }),
      status: 'published',
    });
    if (!event) throw ApiError.badRequest('Event not found');
    const qty = Math.max(1, Math.min(10, payload.ticketQty || 1));

    // Atomic capacity guard on ticket sales.
    const res = await Event.updateOne(
      { _id: event.id, $expr: { $lte: [{ $add: ['$sold', qty] }, '$capacity'] } },
      { $inc: { sold: qty } }
    );
    if (res.modifiedCount === 0) throw ApiError.badRequest('Not enough tickets left');

    base.eventId = event.id;
    base.meta.ticketQty = qty;
    base._eventRelease = { eventId: event.id, qty };
    base.items = [
      { kind: 'ticket', refId: String(event.legacyId ?? event.id), name: event.title, price: event.price, qty },
    ];
    // The Review Booking screen displays a ₹49 platform fee; the quick ticket
    // sheet doesn't — the fee is charged only where the UI shows it.
    if (payload.meta?.withPlatformFee && event.price > 0) {
      base.items.push({ kind: 'fee', refId: null, name: 'Platform Fee', price: 49, qty: 1 });
    }
  } else if (type === 'memorial') {
    // Callback request — free, confirmed immediately.
    if (!payload.meta?.contact?.phone) throw ApiError.badRequest('A contact number is required');
    base.items = [{ kind: 'package', refId: null, name: 'Memorial Support Callback', price: 0, qty: 1 }];
  }

  const isAddonKind = (k) => k === 'addon' || k === 'menu_item';
  const baseAmount = toPaise(
    base.items.filter((i) => !isAddonKind(i.kind)).reduce((s, i) => s + i.price * i.qty, 0)
  );
  const addonAmount = toPaise(
    base.items.filter((i) => isAddonKind(i.kind)).reduce((s, i) => s + i.price * i.qty, 0)
  );
  const discount = toPaise(base._discount || 0);
  delete base._discount;
  base.amounts = {
    base: baseAmount,
    addons: addonAmount,
    discount,
    tax: 0, // booking flows display no extra tax in the mock UI
    total: Math.max(0, baseAmount + addonAmount - discount),
  };
  return base;
}

/** Roll back whatever capacity the failed/cancelled booking held. */
async function releaseCapacity(booking) {
  if (booking._slot || (booking.schedule?.time && (booking.providerId || booking.doctorId))) {
    const slot = booking._slot || {
      providerId: booking.doctorId ? (await Doctor.findById(booking.doctorId))?.providerId || booking.doctorId : booking.providerId,
      doctorId: booking.doctorId || null,
      date: booking.schedule.startDate,
      time: booking.schedule.time,
    };
    if (slot.providerId && slot.date && slot.time) await releaseSlot(slot);
  }
  if (booking.type === 'event' && booking.eventId) {
    const qty = booking.meta?.ticketQty || 1;
    await Event.updateOne({ _id: booking.eventId }, { $inc: { sold: -qty } });
  }
}

/** POST /bookings — creates the booking; Razorpay bookings await payment. */
export async function createBooking(user, payload) {
  const draft = await buildBooking(user, payload);
  const isFree = draft.amounts.total === 0;
  const isInstant = draft.visitType === 'instant_video' || draft.consult?.mode === 'instantVideo';
  const paymentMethod = isFree ? 'free' : payload.paymentMethod;
  const autoConfirm = paymentMethod !== 'razorpay' || isInstant;

  const booking = await Booking.create({
    ...draft,
    paymentMethod,
    status: autoConfirm ? 'confirmed' : 'pending_payment',
    timeline: [
      {
        status: autoConfirm ? 'confirmed' : 'pending_payment',
        note: autoConfirm ? 'Booking created' : 'Awaiting payment',
      },
    ],
  });

  if (autoConfirm) {
    await notifyBookingConfirmed(booking);
    return { booking };
  }

  const payment = await createPaymentOrder(user, 'booking', { bookingId: booking.id });
  booking.paymentId = payment.paymentId;
  await booking.save();
  return { booking, razorpay: payment };
}

/**
 * Credit the earning vendor when a booking is paid, so it shows up in their
 * ledger, dashboard totals and payout requests. Best-effort — a ledger hiccup
 * must never bounce the Razorpay webhook into a retry loop.
 *
 * Resolves the vendor per vertical: events pay the organizer, doctor
 * consultations pay the clinic that owns the vet.
 */
async function recordBookingLedger(booking) {
  if (!booking.amounts?.total) return;
  try {
    const { postLedgerEntry } = await import('../vendor/vendor.service.js');
    const { VendorProfile } = await import('../vendor/vendor.models.js');

    let vendorId = null;
    let label = '';

    if (booking.type === 'event' && booking.eventId) {
      const event = await Event.findById(booking.eventId).select('vendorId');
      vendorId = event?.vendorId || null;
      label = `Event booking ${booking.bookingNo}`;
    } else if (booking.type === 'doctor' && booking.doctorId) {
      // Consultation revenue belongs to the clinic that owns the vet.
      const doctor = await Doctor.findById(booking.doctorId).select('clinicVendorId name');
      vendorId = doctor?.clinicVendorId || null;
      const kind = MODE_LABEL[booking.consult?.mode] || 'Consultation';
      label = `${kind} ${booking.bookingNo}${doctor?.name ? ` — ${doctor.name}` : ''}`;
    } else if ((booking.type === 'grooming' || booking.type === 'daycare') && booking.providerId) {
      const provider = await Provider.findById(booking.providerId).select('vendorUserId name');
      vendorId = provider?.vendorUserId || null;
      const kind = booking.type === 'grooming' ? 'Grooming' : 'Daycare';
      label = `${kind} booking ${booking.bookingNo}${provider?.name ? ` — ${provider.name}` : ''}`;
    }

    if (!vendorId) return;
    const profile = await VendorProfile.findOne({ userId: vendorId });
    await postLedgerEntry({
      vendorId,
      refType: 'booking',
      refId: booking._id,
      label,
      gross: booking.amounts.total,
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch {
    // ledger is best-effort
  }
}

/** In-app + push notification for a confirmed booking. Best-effort. */
async function notifyBookingConfirmed(booking) {
  await notify(booking.userId, {
    title: 'Booking Confirmed',
    body: `Your ${booking.type || 'appointment'} booking is confirmed.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: booking.type || '' },
  }).catch(() => {});

  // Also tell the vet whose calendar just filled up — the dashboard's
  // notification bell was previously always empty because nothing here ever
  // notified the vendor side of a new booking.
  if (booking.type === 'doctor' && booking.doctorId) {
    const doctor = await Doctor.findById(booking.doctorId).select('userId name');
    if (doctor?.userId) {
      await notify(doctor.userId, {
        title: 'New Appointment',
        body: `${booking.petSnapshot?.name ? `${booking.petSnapshot.name}'s` : 'A'} appointment was just booked for ${booking.schedule?.startDate || 'soon'}${booking.schedule?.time ? ` at ${booking.schedule.time}` : ''}.`,
        type: 'booking',
        link: '/vendor/doctor/consultations?view=appointments_list',
        data: { bookingId: String(booking._id), type: 'doctor' },
      }).catch(() => {});
    }
  }
}

registerPurposeHandler('booking', {
  computeAmount: async (user, payload) => {
    const booking = await Booking.findOne({
      _id: payload.bookingId,
      userId: user.id,
      status: 'pending_payment',
    });
    if (!booking) throw ApiError.badRequest('Booking not found or already paid');
    return { amountPaise: booking.amounts.total, refId: booking.id };
  },
  onPaid: async (payment) => {
    const res = await Booking.findOneAndUpdate(
      { _id: payment.refId, status: 'pending_payment' },
      {
        $set: { status: 'confirmed', paymentId: payment.id },
        $push: { timeline: { status: 'confirmed', note: 'Payment received' } },
      },
      { new: true }
    );
    if (res) {
      await notifyBookingConfirmed(res);
      await recordBookingLedger(res);
    }
  },
  onFailed: async (payment) => {
    await Booking.updateOne(
      { _id: payment.refId, status: 'pending_payment' },
      { $push: { timeline: { status: 'pending_payment', note: 'Payment failed — retry available' } } }
    );
  },
});

export async function listBookings(userId, type) {
  const filter = { userId };
  if (type) filter.type = type;
  return Booking.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('providerId', 'name image type')
    .populate('doctorId', 'name clinic img')
    .populate('eventId', 'title img location timeText');
}

export async function getBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId })
    .populate('providerId', 'name image type details openTime closeTime cancellationPolicy')
    .populate('doctorId', 'name clinic img spec location')
    .populate('eventId', 'title img location timeText dateDay monthText');
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

/** Cancel within policy; paid bookings auto-refund and capacity is released. */
export async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking can no longer be cancelled');
  }

  const wasConfirmed = booking.status === 'confirmed';

  // Doctor bookings follow the vet's own free-cancellation window. Cancelling
  // inside it still releases the slot, but forfeits the refund.
  let refundable = true;
  if (booking.type === 'doctor' && booking.doctorId && booking.schedule?.startAt) {
    const doctor = await Doctor.findById(booking.doctorId).select('policies name');
    const hours = doctor?.policies?.cancellationHours ?? 4;
    const hoursToStart = (new Date(booking.schedule.startAt) - Date.now()) / 3_600_000;
    if (hoursToStart < hours) {
      refundable = false;
      booking.timeline.push({
        status: 'cancelled',
        note: `Cancelled inside the ${hours}h free-cancellation window — not refundable`,
      });
    }
  }

  await releaseCapacity(booking);

  if (refundable && wasConfirmed && booking.paymentMethod === 'razorpay' && booking.paymentId) {
    const payment = await Payment.findById(booking.paymentId);
    if (payment?.status === 'paid' && payment.razorpayPaymentId) {
      await refundPayment(payment.razorpayPaymentId);
      payment.status = 'refunded';
      payment.refundedAmount = payment.amount;
      await payment.save();
      booking.timeline.push({ status: 'refunded', note: 'Refund initiated to source' });
    }
  }

  booking.status = 'cancelled';
  booking.timeline.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await booking.save();
  return booking;
}

/**
 * Slot availability for a **provider** (daycare / grooming) on a date, from its
 * `details.slotTemplate` blob. Returns a bare array — the grooming booking
 * screen consumes it directly.
 *
 * Doctors do NOT come through here: vet slots are generated from the vet's own
 * working days, blocks and consult duration by
 * `provider/availability.service.js → getDoctorSlots()`.
 */
export async function getSlots({ providerId, date }) {
  const provider = await Provider.findOne({ ...idOrLegacyFilter(providerId), active: true });
  if (!provider) throw ApiError.notFound('Provider not found');
  const template = provider.details?.slotTemplate || [];

  const counters = await SlotBooking.find({ providerId: provider.id, doctorId: null, date });
  const byTime = new Map(counters.map((c) => [c.time, c]));

  return template.map((t) => {
    const counter = byTime.get(t.time);
    return {
      time: t.time,
      period: t.period,
      available: !counter || counter.booked < counter.capacity,
    };
  });
}
