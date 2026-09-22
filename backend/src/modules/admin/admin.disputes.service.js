import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { notify } from '../../services/notify.js';
import { Booking } from '../booking/booking.model.js';
import { Payment } from '../payment/payment.model.js';
import { writeAudit } from './admin.service.js';

/**
 * Dispute resolution.
 *
 * A dispute was previously a status with nowhere to go: a booking could be
 * marked `disputed` and then sat there, while the partner's earning settled
 * into the next payout regardless. Two halves fix that — the payout hold in
 * vendor.service.js, and this, which gives an operator a way to actually rule.
 *
 * Every outcome is explicit about where the money ends up, because "resolved"
 * on its own tells a customer nothing and tells finance less.
 */

export const DISPUTE_OUTCOMES = {
  refund_full: {
    label: 'Refund the customer in full',
    describe: 'The customer was refunded in full and the partner earning reversed.',
  },
  refund_partial: {
    label: 'Refund the customer in part',
    describe: 'The customer was partially refunded and the partner earning reduced accordingly.',
  },
  reject: {
    label: 'Reject the dispute',
    describe: 'The dispute was not upheld. The service stands and the partner is paid.',
  },
  goodwill: {
    label: 'Refund without fault',
    describe: 'The customer was refunded as a goodwill gesture. No violation recorded against the partner.',
  },
};

const rupees = (paise) => Math.round((paise || 0) / 100);

/** Disputes awaiting a decision, oldest first — the longest wait is worst. */
export async function listDisputes({ status = 'open', page = 1, limit = 50 } = {}) {
  const filter = status === 'open'
    ? { status: 'disputed' }
    : status === 'resolved'
      ? { 'dispute.resolvedAt': { $ne: null } }
      : { 'dispute.raisedAt': { $ne: null } };

  const perPage = Math.min(200, Math.max(1, Number(limit) || 50));
  const current = Math.max(1, Number(page) || 1);

  const [rows, total] = await Promise.all([
    Booking.find(filter)
      .populate('userId', 'name phone email')
      .populate('providerId', 'name')
      .populate('doctorId', 'name')
      .sort({ 'dispute.raisedAt': 1 })
      .skip((current - 1) * perPage)
      .limit(perPage),
    Booking.countDocuments(filter),
  ]);

  const { resolveBookingVendor } = await import('../booking/booking.service.js');
  const serialised = [];
  for (const b of rows) {
    const { vendorId, vendorType } = await resolveBookingVendor(b);
    const raisedAt = b.dispute?.raisedAt;
    serialised.push({
      _id: String(b._id),
      bookingNo: b.bookingNo,
      type: b.type,
      status: b.status,
      customerName: b.userId?.name || 'Guest',
      customerPhone: b.userId?.phone || '—',
      vendorId: vendorId ? String(vendorId) : null,
      vendorType,
      vendorName: b.providerId?.name || b.doctorId?.name || 'Platform',
      amount: rupees(b.amounts?.total),
      refundedAmount: rupees(b.refundedAmount),
      refundStatus: b.refundStatus,
      raisedBy: b.dispute?.raisedBy || null,
      reason: b.dispute?.reason || '',
      raisedAt,
      /* Days open is the number an operator triages on. */
      daysOpen: raisedAt ? Math.floor((Date.now() - new Date(raisedAt)) / 86_400_000) : 0,
      resolvedAt: b.dispute?.resolvedAt || null,
      resolution: b.dispute?.resolution || null,
      scheduledFor: b.schedule?.startDate || null,
    });
  }

  return { rows: serialised, total, page: current, pages: Math.ceil(total / perPage) || 1 };
}

/** Raise a dispute on a customer's behalf — from a support call, usually. */
export async function adminRaiseDispute(actor, bookingId, { reason, raisedBy = 'customer' }, ip) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to raise a dispute');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  const { raiseDispute } = await import('../booking/booking.service.js');
  await raiseDispute(booking, { raisedBy, reason: reason.trim(), actor });

  await writeAudit(actor, {
    action: 'dispute.raise',
    targetType: 'booking',
    targetId: bookingId,
    after: { raisedBy, reason: reason.trim() },
    ip,
  });

  await notify(booking.userId, {
    title: 'We are looking into your booking',
    body: `Your dispute for booking ${booking.bookingNo} has been opened and is being reviewed.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id) },
  }).catch(() => {});

  return { bookingNo: booking.bookingNo, status: booking.status };
}

/**
 * Rule on a dispute.
 *
 * The outcome drives both the money and the booking's final status, so an
 * operator cannot accidentally close a dispute without saying what happened to
 * the customer's payment. Refunds run through the same central engine as every
 * other refund, which means the partner clawback happens automatically.
 */
export async function resolveDispute(
  actor,
  bookingId,
  { outcome, note = '', amountPaise = null, recordViolation: shouldRecordViolation = true },
  ip
) {
  if (!mongoose.isValidObjectId(bookingId)) throw ApiError.badRequest('Invalid booking id');
  if (!DISPUTE_OUTCOMES[outcome]) throw ApiError.badRequest(`Unknown dispute outcome '${outcome}'`);
  if (!note?.trim()) throw ApiError.badRequest('A resolution note is required');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status !== 'disputed') {
    throw ApiError.badRequest(`Booking ${booking.bookingNo} is ${booking.status}, not disputed`);
  }

  const before = { status: booking.status, refundStatus: booking.refundStatus };
  const { refundBooking, pushTimeline } = await import('../booking/booking.service.js');

  let refund = null;
  if (outcome === 'refund_full' || outcome === 'refund_partial' || outcome === 'goodwill') {
    if (outcome === 'refund_partial' && !amountPaise) {
      throw ApiError.badRequest('A partial refund needs an amount');
    }
    refund = await refundBooking(booking, {
      amountPaise: outcome === 'refund_partial' ? amountPaise : null,
      reason: `Dispute resolved: ${note.trim()}`,
      initiatedBy: 'admin',
      actor,
    });
  }

  /*
   * Where the booking lands. A rejected dispute returns to `completed` — the
   * service stood — while an upheld one becomes `refunded`, so the payout hold
   * releases and finance reads the right thing.
   */
  booking.status = outcome === 'reject' ? 'completed' : 'refunded';
  booking.dispute = {
    ...(booking.dispute?.toObject?.() || booking.dispute || {}),
    resolvedAt: new Date(),
    resolution: `${DISPUTE_OUTCOMES[outcome].label}: ${note.trim()}`,
  };
  pushTimeline(
    booking,
    booking.status,
    `Dispute resolved — ${DISPUTE_OUTCOMES[outcome].label}. ${note.trim()}`,
    'admin',
    actor
  );
  await booking.save();

  /*
   * An upheld dispute is a service failure and is scored as one — except for a
   * goodwill refund, which is the platform choosing to pay rather than the
   * partner having done anything wrong.
   */
  if (shouldRecordViolation && (outcome === 'refund_full' || outcome === 'refund_partial')) {
    try {
      const { recordViolation } = await import('../compliance/compliance.service.js');
      const { resolveBookingVendor } = await import('../booking/booking.service.js');
      const { vendorId, vendorType } = await resolveBookingVendor(booking);
      if (vendorId) {
        await recordViolation({
          vendorId,
          vendorType,
          type: 'dispute_upheld',
          refType: 'booking',
          refId: booking._id,
          refLabel: `Booking ${booking.bookingNo}`,
          reason: 'Customer dispute upheld',
          detail: note.trim(),
          customerImpact: 'Customer was refunded after disputing the service.',
          source: 'admin',
          actor,
        });
      }
    } catch {
      /* Compliance bookkeeping must never block the resolution itself. */
    }
  }

  await writeAudit(actor, {
    action: 'dispute.resolve',
    targetType: 'booking',
    targetId: bookingId,
    before,
    after: {
      outcome,
      status: booking.status,
      note: note.trim(),
      refundNo: refund?.refundNo || null,
      refundAmount: refund ? rupees(refund.amount) : 0,
    },
    ip,
  });

  await notify(booking.userId, {
    title: outcome === 'reject' ? 'Your dispute has been reviewed' : 'Your dispute has been resolved',
    body: DISPUTE_OUTCOMES[outcome].describe,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id) },
  }).catch(() => {});

  return {
    bookingNo: booking.bookingNo,
    status: booking.status,
    outcome,
    refund: refund ? { refundNo: refund.refundNo, status: refund.status, amount: rupees(refund.amount) } : null,
  };
}

/** Headline numbers for the disputes screen. */
export async function disputeSummary() {
  const [open, resolved] = await Promise.all([
    Booking.find({ status: 'disputed' }).select('dispute.raisedAt amounts.total').lean(),
    Booking.countDocuments({ 'dispute.resolvedAt': { $ne: null } }),
  ]);

  const now = Date.now();
  const ages = open.map((b) => (b.dispute?.raisedAt ? (now - new Date(b.dispute.raisedAt)) / 86_400_000 : 0));
  return {
    open: open.length,
    resolved,
    valueAtRisk: rupees(open.reduce((s, b) => s + (b.amounts?.total || 0), 0)),
    oldestDays: ages.length ? Math.floor(Math.max(...ages)) : 0,
    /* Anything past a week is a customer who has been waiting too long. */
    overSevenDays: ages.filter((d) => d > 7).length,
  };
}
