import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { refundPayment } from '../../services/razorpay.service.js';
import { notify } from '../../services/notify.js';
import { reverseLedgerForRefund } from '../vendor/vendor.service.js';
import { Payment } from './payment.model.js';
import { Refund } from './refund.model.js';

/**
 * The single path money takes backwards on this platform.
 *
 * Refunds were previously inlined into `cancelBooking` and `cancelOrder`:
 * each called Razorpay, set `payment.status = 'refunded'` unconditionally,
 * left the vendor's earning row standing, and recorded nothing an operator
 * could reconcile against. Partial refunds were impossible, admin-initiated
 * refunds did not exist, and a gateway failure threw after capacity had
 * already been released.
 *
 * Everything routes through `issueRefund` now, which makes four guarantees:
 *
 *   1. Intent is durable before the gateway is called, so a refund that dies
 *      mid-flight is a visible, retryable `Refund` row — never a silent loss.
 *   2. The refundable balance is reserved atomically, so two concurrent
 *      requests cannot refund the same rupee twice.
 *   3. The vendor's earning is clawed back in proportion, so the platform
 *      never pays out on money it handed back.
 *   4. A gateway failure rolls the reservation back rather than leaving the
 *      payment looking more refunded than it is.
 *
 * All amounts are integer paise.
 */

const inr = (paise) => Math.round((paise || 0) / 100).toLocaleString('en-IN');

/** Paise still refundable on a payment. */
export function refundableAmount(payment) {
  if (!payment || payment.status === 'created' || payment.status === 'failed') return 0;
  return Math.max(0, (payment.amount || 0) - (payment.refundedAmount || 0));
}

/**
 * Refund a payment, in full or in part.
 *
 * `amountPaise` omitted means "everything still refundable". Returns the
 * Refund document; callers should check `.status`, because a failed refund is
 * a recorded outcome rather than a thrown exception — the surrounding
 * cancellation must still complete, and Admin retries the money separately.
 */
export async function issueRefund({
  payment,
  amountPaise = null,
  reason,
  initiatedBy = 'system',
  actor = null,
  refType = 'other',
  refId = null,
  label = '',
  notifyCustomer = true,
}) {
  if (!payment) throw ApiError.badRequest('No payment to refund');
  if (!reason || !String(reason).trim()) {
    throw ApiError.badRequest('A refund reason is required');
  }
  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    throw ApiError.badRequest(`Payment is ${payment.status} and cannot be refunded`);
  }
  if (!payment.razorpayPaymentId) {
    throw ApiError.badRequest('Payment has no gateway reference to refund against');
  }

  const available = refundableAmount(payment);
  if (available <= 0) throw ApiError.badRequest('This payment is already fully refunded');

  const amount = amountPaise == null ? available : Math.round(Number(amountPaise));
  if (!Number.isInteger(amount) || amount <= 0) {
    throw ApiError.badRequest('Invalid refund amount');
  }
  if (amount > available) {
    throw ApiError.badRequest(`Only ${inr(available)} is still refundable on this payment`);
  }

  /*
   * Reserve the amount before calling the gateway.
   *
   * The guard re-checks the balance inside the same atomic update, so two
   * operators clicking Refund at once cannot both pass the check above and
   * both succeed — the second update matches nothing and is rejected here.
   */
  const reserved = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      $expr: { $lte: [{ $add: ['$refundedAmount', amount] }, '$amount'] },
    },
    { $inc: { refundedAmount: amount } },
    { new: true }
  );
  if (!reserved) {
    throw ApiError.conflict('Refund exceeds the payment balance - it may have just been refunded');
  }

  const refund = await Refund.create({
    paymentId: payment._id,
    userId: payment.userId,
    refType,
    refId,
    label,
    amount,
    paymentAmount: payment.amount,
    isPartial: amount < payment.amount,
    reason: String(reason).trim(),
    initiatedBy,
    actorId: actor?.id || actor?._id || null,
    actorName: actor?.name || actor?.email || '',
    status: 'pending',
    attempts: 1,
    lastAttemptAt: new Date(),
  });

  return settleRefund(refund, reserved, { notifyCustomer, label });
}

/**
 * Retry a failed refund. Re-reserves the amount and re-runs the same flow, so
 * a retry that fails again is simply another recorded attempt.
 */
export async function retryRefund(refundId, actor = null) {
  if (!mongoose.isValidObjectId(refundId)) throw ApiError.badRequest('Invalid refund id');
  const refund = await Refund.findById(refundId);
  if (!refund) throw ApiError.notFound('Refund not found');
  if (refund.status === 'processed') throw ApiError.badRequest('This refund already succeeded');
  if (refund.status === 'cancelled') throw ApiError.badRequest('This refund was cancelled');

  const payment = await Payment.findById(refund.paymentId);
  if (!payment) throw ApiError.notFound('Payment not found');

  const reserved = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      $expr: { $lte: [{ $add: ['$refundedAmount', refund.amount] }, '$amount'] },
    },
    { $inc: { refundedAmount: refund.amount } },
    { new: true }
  );
  if (!reserved) throw ApiError.conflict('Refund no longer fits the payment balance');

  refund.attempts += 1;
  refund.lastAttemptAt = new Date();
  if (actor) refund.actorName = actor.name || actor.email || refund.actorName;
  await refund.save();

  return settleRefund(refund, reserved, { notifyCustomer: true, label: refund.label });
}

/**
 * Call the gateway for an already-reserved refund and record the outcome.
 * Shared by the first attempt and every retry so both follow identical
 * success and rollback paths.
 */
async function settleRefund(refund, reservedPayment, { notifyCustomer, label }) {
  try {
    const result = await refundPayment(reservedPayment.razorpayPaymentId, refund.amount);
    refund.status = 'processed';
    refund.razorpayRefundId = result?.id || null;
    refund.failureReason = null;
    refund.processedAt = new Date();
    await refund.save();

    // Reflect the settled balance on the payment itself.
    await Payment.updateOne(
      { _id: reservedPayment._id },
      {
        $set: {
          status:
            reservedPayment.refundedAmount >= reservedPayment.amount ? 'refunded' : 'partially_refunded',
        },
      }
    );

    await applyLedgerReversal(refund, reservedPayment);
    if (notifyCustomer) await notifyRefund(refund, label);
    return refund;
  } catch (err) {
    /*
     * Gateway said no. Release the reservation so the payment's refundable
     * balance is honest again, and leave a failed row for Admin to retry —
     * the customer is still owed this money and somebody has to see that.
     */
    await Payment.updateOne({ _id: reservedPayment._id }, { $inc: { refundedAmount: -refund.amount } });
    refund.status = 'failed';
    refund.failureReason = err?.message || 'Refund failed at the payment gateway';
    await refund.save();
    logger.error(`Refund ${refund.refundNo} failed: ${refund.failureReason}`);
    return refund;
  }
}

/**
 * Claw the vendor's share back. Kept separate from the gateway call and
 * flagged on the Refund, because a processed refund whose reversal failed
 * still overpays the vendor and Admin must be able to find that row.
 */
async function applyLedgerReversal(refund, payment) {
  if (refund.ledgerReversed) return;
  try {
    await reverseLedgerForRefund({
      refType: refund.refType,
      refId: refund.refId,
      refundId: refund._id,
      refundedPaise: refund.amount,
      paymentAmountPaise: payment?.amount || refund.paymentAmount,
      label: `Refund ${refund.refundNo}${refund.label ? ` - ${refund.label}` : ''}`,
    });
    refund.ledgerReversed = true;
    refund.ledgerReversalError = null;
  } catch (err) {
    refund.ledgerReversed = false;
    refund.ledgerReversalError = err?.message || 'Ledger reversal failed';
    logger.error(`Ledger reversal failed for refund ${refund.refundNo}: ${refund.ledgerReversalError}`);
  }
  await refund.save();
}

/** Re-run a reversal that failed after a successful gateway refund. */
export async function retryLedgerReversal(refundId) {
  const refund = await Refund.findById(refundId);
  if (!refund) throw ApiError.notFound('Refund not found');
  if (refund.status !== 'processed') {
    throw ApiError.badRequest('Only a processed refund can be reversed in the ledger');
  }
  if (refund.ledgerReversed) return refund;
  const payment = await Payment.findById(refund.paymentId);
  await applyLedgerReversal(refund, payment || { amount: refund.paymentAmount });
  return refund;
}

async function notifyRefund(refund, label) {
  await notify(refund.userId, {
    title: refund.isPartial ? 'Partial refund issued' : 'Refund issued',
    body: `${inr(refund.amount)} for ${label || 'your order'} is on its way back to your original payment method (3-5 working days).`,
    type: 'wallet',
    link: '/app/profile/bookings',
    data: { refundId: String(refund._id), refundNo: refund.refundNo },
  }).catch(() => {});
}

/** Admin refund register, newest first. */
export async function listRefunds({ status, refType, from, to, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (refType && refType !== 'All') filter.refType = refType;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const perPage = Math.min(200, Math.max(1, Number(limit) || 50));
  const current = Math.max(1, Number(page) || 1);

  const [rows, total] = await Promise.all([
    Refund.find(filter)
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((current - 1) * perPage)
      .limit(perPage)
      .lean(),
    Refund.countDocuments(filter),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.refundNo,
      _id: String(r._id),
      customerName: r.userId?.name || 'Guest',
      customerPhone: r.userId?.phone || '-',
      refType: r.refType,
      reference: r.label || '-',
      amount: Math.round(r.amount / 100),
      paymentAmount: Math.round((r.paymentAmount || 0) / 100),
      isPartial: r.isPartial,
      reason: r.reason,
      initiatedBy: r.initiatedBy,
      actorName: r.actorName || '-',
      status: r.status,
      attempts: r.attempts,
      failureReason: r.failureReason,
      ledgerReversed: r.ledgerReversed,
      ledgerReversalError: r.ledgerReversalError,
      razorpayRefundId: r.razorpayRefundId || '-',
      createdAt: r.createdAt,
      processedAt: r.processedAt,
    })),
    total,
    page: current,
    pages: Math.ceil(total / perPage) || 1,
  };
}

/** Headline numbers for the finance dashboard. */
export async function refundTotals() {
  const [agg] = await Refund.aggregate([
    {
      $group: {
        _id: null,
        processedAmount: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, '$amount', 0] } },
        processedCount: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
        failedAmount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] } },
        failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        unreversedCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'processed'] }, { $eq: ['$ledgerReversed', false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return {
    processedAmount: Math.round((agg?.processedAmount || 0) / 100),
    processedCount: agg?.processedCount || 0,
    failedAmount: Math.round((agg?.failedAmount || 0) / 100),
    failedCount: agg?.failedCount || 0,
    pendingCount: agg?.pendingCount || 0,
    unreversedCount: agg?.unreversedCount || 0,
  };
}
