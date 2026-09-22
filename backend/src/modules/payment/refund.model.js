import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

export const REFUND_STATUSES = ['pending', 'processed', 'failed', 'cancelled'];
export const REFUND_REF_TYPES = ['booking', 'order', 'subscription', 'meal_order', 'other'];
export const REFUND_INITIATORS = ['customer', 'vendor', 'admin', 'system'];

/**
 * One row per refund attempt — the register Admin reconciles against.
 *
 * Refunds used to leave no trace beyond `Payment.refundedAmount` and a line in
 * the booking timeline, so "what was refunded, why, by whom, and did it
 * actually land?" was unanswerable. Every backward money movement now writes
 * one of these BEFORE the gateway is called, so a refund that fails midway is
 * a visible, retryable row rather than a silent divergence between what the
 * customer was told and what Razorpay did.
 *
 * Amounts are integer paise, like every other amount on the platform.
 */
const refundSchema = new mongoose.Schema(
  {
    refundNo: { type: String, unique: true },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refType: { type: String, enum: REFUND_REF_TYPES, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    /** Human reference of the refunded thing ("Booking TCG12345678"). */
    label: { type: String, default: '' },

    amount: { type: Number, required: true, min: 1 }, // paise
    /** Payment total at the time, so a partial refund is explainable later. */
    paymentAmount: { type: Number, default: 0 },
    isPartial: { type: Boolean, default: false },

    /*
     * Why the money went back. Required — an unexplained refund is exactly the
     * hole this model exists to close, and the founder's reconciliation
     * question is "why was it refunded?", not "was it refunded?".
     */
    reason: { type: String, required: true },
    initiatedBy: { type: String, enum: REFUND_INITIATORS, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },

    status: { type: String, enum: REFUND_STATUSES, default: 'pending', index: true },
    razorpayRefundId: { type: String, default: null },
    failureReason: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },

    /*
     * Whether the vendor's earning for this reference has been clawed back.
     * Tracked separately from `status` because the gateway refund and the
     * ledger reversal are two different writes: a processed refund whose
     * reversal failed still overpays the vendor, and Admin has to be able to
     * see that specific state.
     */
    ledgerReversed: { type: Boolean, default: false },
    ledgerReversalError: { type: String, default: null },
  },
  { timestamps: true }
);

refundSchema.index({ refType: 1, refId: 1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ createdAt: -1 });

refundSchema.pre('validate', function assignRefundNo() {
  if (!this.refundNo) {
    this.refundNo = `RFD${randomBytes(5).toString('hex').toUpperCase()}`;
  }
});

export const Refund = mongoose.model('Refund', refundSchema);
export default Refund;
