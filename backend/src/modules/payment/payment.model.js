import mongoose from 'mongoose';

export const PAYMENT_PURPOSES = [
  'order',
  'booking',
  'subscription',
  'wallet_topup',
  'adoption_fee',
  // Overtime on a video consultation, invoiced after the call. Amount is always
  // recomputed from the ConsultCall — see consult/consult.payment.js.
  'consult_overage',
];

export const PAYMENT_STATUSES = ['created', 'paid', 'failed', 'refunded', 'partially_refunded'];

/**
 * One row per payment attempt, shared by every purchasable thing on the
 * platform. `purpose` + `refId` point at the domain document (Order,
 * Booking, …); fulfilment runs through the purpose-handler dispatcher in
 * payment.service.js. Amounts are integer paise.
 */
const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    amount: { type: Number, required: true, min: 1 }, // paise
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null, index: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'created', index: true },
    method: { type: String, default: null }, // upi | card | netbanking | wallet
    webhookVerifiedAt: { type: Date, default: null },
    refundedAmount: { type: Number, default: 0 }, // paise
    failureReason: { type: String, default: null },
    notes: { type: Object, default: {} },
  },
  { timestamps: true }
);

paymentSchema.index({ purpose: 1, refId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
