import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Thin Razorpay client: order creation, signature verification and refunds.
 * All amounts are integer PAISE end to end — never rupees, never floats.
 */

let client = null;

export function getRazorpay() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw ApiError.serviceUnavailable('Payments are not configured');
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
}

/** Create a Razorpay order. `amountPaise` must be a positive integer. */
export async function createRazorpayOrder({ amountPaise, receipt, notes = {} }) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw ApiError.badRequest('Invalid payment amount');
  }
  try {
    return await getRazorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes,
    });
  } catch (err) {
    logger.error(`Razorpay order create failed: ${err?.error?.description || err.message}`);
    throw ApiError.serviceUnavailable('Could not initiate payment, please retry');
  }
}

/** Constant-time check of the client-side checkout signature. */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
}

/** Constant-time check of the webhook signature over the RAW request body. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
}

/** Full or partial refund; omit amountPaise for a full refund. */
export async function refundPayment(razorpayPaymentId, amountPaise) {
  try {
    const payload = amountPaise ? { amount: amountPaise } : {};
    return await getRazorpay().payments.refund(razorpayPaymentId, payload);
  } catch (err) {
    logger.error(`Razorpay refund failed for ${razorpayPaymentId}: ${err?.error?.description || err.message}`);
    throw ApiError.serviceUnavailable('Refund could not be processed, support has been notified');
  }
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
