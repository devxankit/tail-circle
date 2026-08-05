import { z } from 'zod';
import { PAYMENT_PURPOSES } from './payment.model.js';

export const createOrderSchema = z.object({
  purpose: z.enum(PAYMENT_PURPOSES),
  // Purpose-specific payload (e.g. { orderId } or { bookingId }) —
  // validated in depth by the purpose handler, never trusted for amounts.
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  signature: z.string().min(1),
});
