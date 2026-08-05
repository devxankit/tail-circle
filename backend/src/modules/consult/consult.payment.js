import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { notify } from '../../services/notify.js';
import { emitToUser } from '../../sockets/index.js';
import { registerPurposeHandler } from '../payment/payment.service.js';
import { Booking } from '../booking/booking.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { ConsultCall } from './consult.model.js';

/**
 * Razorpay purpose handler for video-consultation overtime.
 *
 * Registered at import time, the same way booking/order/wallet do it. The
 * dispatcher in payment.service.js recomputes the amount server-side and
 * fulfils exactly once (Redis event guard + a status-gated transition), so this
 * handler only has to be idempotent, not transactional.
 *
 * Money rule: the amount is recomputed from the ConsultCall on every order —
 * never taken from the client, and never re-derived from a timer in a browser.
 */

const toPaise = (rupees) => Math.round(rupees * 100);

registerPurposeHandler('consult_overage', {
  /** Recompute what is owed. Throws unless there is a genuine pending overage. */
  computeAmount: async (user, payload) => {
    const call = await ConsultCall.findOne({ bookingId: payload.bookingId });
    if (!call) throw ApiError.notFound('No consultation found for that appointment');

    // Only the pet parent pays.
    if (String(call.ownerUserId) !== String(user.id)) {
      throw ApiError.forbidden('This charge belongs to another account');
    }

    if (call.overage.status === 'paid') throw ApiError.badRequest('This charge is already paid');
    if (call.overage.waived || call.overage.status === 'waived') {
      throw ApiError.badRequest('The vet waived this charge');
    }
    if (call.overage.status !== 'pending' || !(call.overage.amount > 0)) {
      throw ApiError.badRequest('There is nothing outstanding for this consultation');
    }

    return {
      amountPaise: toPaise(call.overage.amount),
      refId: String(call._id),
      notes: {
        kind: 'consult_overage',
        bookingId: String(call.bookingId),
        minutes: String(call.overage.minutes),
        ratePerMinute: String(call.overage.ratePerMinute),
      },
    };
  },

  /**
   * Settle: mark the overage paid, complete the booking (which releases the
   * digital prescription), and credit the vet's ledger. Safe to run twice.
   */
  onPaid: async (payment) => {
    const call = await ConsultCall.findById(payment.refId);
    if (!call || call.overage.status === 'paid') return;

    call.overage.status = 'paid';
    call.overage.paymentId = payment._id;
    call.events.push({
      type: 'overage_paid',
      detail: `₹${call.overage.amount} received`,
    });
    await call.save();

    const booking = await Booking.findById(call.bookingId);
    if (booking && booking.status === 'pending_overage') {
      booking.status = 'completed';
      booking.timeline.push({
        status: 'completed',
        note: `Extra-time charge of ₹${call.overage.amount} paid`,
      });
      await booking.save();
    }

    await creditVetLedger(call, booking);

    emitToUser(call.ownerUserId, 'call:overage-paid', {
      bookingId: String(call.bookingId),
      amount: call.overage.amount,
    });

    // Only promise a prescription if this vet actually issues digital ones —
    // `video.digitalPrescription` is what they declared on their profile.
    const vet = await Doctor.findById(call.doctorId).select('video');
    const tail = vet?.video?.digitalPrescription
      ? ' Your prescription is now available.'
      : '';

    notify(call.ownerUserId, {
      title: 'Payment received',
      body: `₹${call.overage.amount} for extra consultation time.${tail}`,
      type: 'vet',
      link: '/app/profile/bookings',
      data: { bookingId: String(call.bookingId) },
    }).catch(() => {});
  },

  onFailed: async (payment) => {
    const call = await ConsultCall.findById(payment.refId);
    if (!call) return;
    call.events.push({ type: 'overage_payment_failed', detail: payment.failureReason || 'failed' });
    await call.save();
  },
});

/**
 * Post the vet's share of the overage to the vendor ledger, mirroring how
 * booking revenue is recorded. Best-effort: a ledger hiccup must not bounce the
 * Razorpay webhook into a retry loop.
 */
async function creditVetLedger(call, booking) {
  try {
    const { postLedgerEntry } = await import('../vendor/vendor.service.js');
    const { VendorProfile } = await import('../vendor/vendor.models.js');

    const vendorId = call.clinicVendorId
      || (await Doctor.findById(call.doctorId).select('clinicVendorId'))?.clinicVendorId;
    if (!vendorId) return;

    const profile = await VendorProfile.findOne({ userId: vendorId });
    await postLedgerEntry({
      vendorId,
      refType: 'consult_overage',
      refId: call._id,
      label: `Extra consultation time — ${booking?.bookingNo || call.bookingId}`,
      gross: toPaise(call.overage.amount),
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch (err) {
    logger.warn(`Overage ledger entry failed for call ${call._id}: ${err.message}`);
  }
}

export default { purpose: 'consult_overage' };
