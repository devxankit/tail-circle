import { redis, isRedisReady } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../../services/razorpay.service.js';
import { Payment } from './payment.model.js';

/**
 * Purpose-handler dispatcher. Each domain module (shop, bookings, meals,
 * wallet, adoption) registers itself once at import time:
 *
 *   registerPurposeHandler('order', {
 *     // Recompute the amount from the DB — NEVER from client input.
 *     computeAmount: async (user, payload) => ({ amountPaise, refId, notes }),
 *     // Fulfil after a verified payment (idempotent — may run twice).
 *     onPaid: async (payment) => { ... },
 *     onFailed: async (payment) => { ... }, // optional
 *   });
 */
const handlers = new Map();

export function registerPurposeHandler(purpose, handler) {
  handlers.set(purpose, handler);
}

function getHandler(purpose) {
  const handler = handlers.get(purpose);
  if (!handler) throw ApiError.badRequest(`Unknown payment purpose: ${purpose}`);
  return handler;
}

/** Create a Payment row + Razorpay order for the client checkout to open. */
export async function createOrder(user, purpose, payload) {
  const { amountPaise, refId = null, notes = {} } = await getHandler(purpose).computeAmount(
    user,
    payload
  );

  const rzpOrder = await createRazorpayOrder({
    amountPaise,
    receipt: `tc_${purpose}_${Date.now()}`,
    notes: { purpose, userId: String(user.id), ...notes },
  });

  const payment = await Payment.create({
    userId: user.id,
    purpose,
    refId,
    amount: amountPaise,
    razorpayOrderId: rzpOrder.id,
    notes,
  });

  return {
    paymentId: payment.id,
    razorpayOrderId: rzpOrder.id,
    amount: amountPaise,
    currency: 'INR',
  };
}

/**
 * Client-side confirmation after Razorpay checkout succeeds. The webhook is
 * the authoritative backstop; this path gives the user instant feedback.
 */
export async function verifyPayment(user, { razorpayOrderId, razorpayPaymentId, signature }) {
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (String(payment.userId) !== String(user.id)) throw ApiError.forbidden();

  if (!verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature })) {
    throw ApiError.badRequest('Payment signature verification failed');
  }

  await markPaid(payment, { razorpayPaymentId });
  return { status: 'paid', purpose: payment.purpose, refId: payment.refId };
}

/**
 * Razorpay webhook (raw body verified upstream in the route). Idempotent:
 * every event id is processed at most once (Redis guard + status check).
 */
export async function handleWebhook(rawBody, signature) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  const eventId = event?.payload?.payment?.entity?.id
    ? `${event.event}:${event.payload.payment.entity.id}`
    : null;

  if (eventId && isRedisReady()) {
    try {
      const first = await redis.set(`webhook:rzp:${eventId}`, '1', 'EX', 172_800, 'NX');
      if (first === null) return { duplicate: true }; // already processed
    } catch {
      // fall through — markPaid/markFailed are idempotent anyway
    }
  }

  const entity = event?.payload?.payment?.entity;
  if (!entity?.order_id) return { ignored: true };

  const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
  if (!payment) {
    logger.warn(`Webhook for unknown order ${entity.order_id} (${event.event})`);
    return { ignored: true };
  }

  switch (event.event) {
    case 'payment.captured':
      await markPaid(payment, {
        razorpayPaymentId: entity.id,
        method: entity.method,
        webhookVerifiedAt: new Date(),
      });
      break;
    case 'payment.failed':
      await markFailed(payment, entity);
      break;
    default:
      return { ignored: true };
  }
  return { processed: true };
}

/** Transition to paid exactly once, then dispatch fulfilment. */
async function markPaid(payment, fields) {
  const fresh = await Payment.findOneAndUpdate(
    { _id: payment.id, status: { $in: ['created', 'failed'] } },
    { $set: { status: 'paid', ...fields } },
    { new: true }
  );
  if (!fresh) {
    // Already paid (verify + webhook race) — just backfill webhook metadata.
    if (fields.webhookVerifiedAt) {
      await Payment.updateOne(
        { _id: payment.id, webhookVerifiedAt: null },
        { $set: { webhookVerifiedAt: fields.webhookVerifiedAt, method: fields.method } }
      );
    }
    return;
  }

  try {
    await handlers.get(fresh.purpose)?.onPaid?.(fresh);
  } catch (err) {
    // Fulfilment failures must not bounce the webhook into endless retries.
    logger.error(`Fulfilment failed for payment ${fresh.id} (${fresh.purpose}): ${err.message}`);
  }
}

async function markFailed(payment, entity) {
  const fresh = await Payment.findOneAndUpdate(
    { _id: payment.id, status: 'created' },
    {
      $set: {
        status: 'failed',
        razorpayPaymentId: entity.id,
        failureReason: entity.error_description || entity.error_code || 'failed',
      },
    },
    { new: true }
  );
  if (fresh) await handlers.get(fresh.purpose)?.onFailed?.(fresh);
}
