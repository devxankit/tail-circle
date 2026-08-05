import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { logger } from '../../utils/logger.js';
import { receiveWebhook } from '../../services/livekit.service.js';
import * as consult from './consult.service.js';
// Side-effect import: registers the `consult_overage` Razorpay purpose handler.
import './consult.payment.js';

const router = Router();

/**
 * Video consultation signalling.
 *
 * Every token-issuing route runs through `authorizeCall()`, which checks the
 * caller is the assigned vet or the assigned pet parent, that the booking is
 * paid and is a video consult, and that we are inside the join window.
 */

/* ── LiveKit webhook (public, signature-verified) ─────────────────── */
/**
 * Mounted BEFORE `authenticate` and with its own raw body parser: LiveKit signs
 * the exact bytes it sent, so the JSON parser must not touch them first.
 *
 * Always 200s. A webhook that retries forever because our fulfilment threw is
 * worse than a dropped event — failures are logged and the event is dropped.
 */
router.post(
  '/webhook/livekit',
  express.raw({ type: '*/*' }),
  asyncHandler(async (req, res) => {
    try {
      const event = await receiveWebhook(req.body.toString('utf8'), req.get('Authorization'));
      const result = await consult.applyWebhookEvent(event);
      logger.info(`LiveKit webhook ${event.event}: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.warn(`LiveKit webhook rejected: ${err.message}`);
    }
    res.status(200).json({ received: true });
  })
);

/* ── Authenticated call lifecycle ─────────────────────────────────── */

router.use(authenticate);

/** Any live call this user is party to — for resuming after a page reload. */
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await consult.getActiveCall(req.user) });
  })
);

/** Vet starts the consultation; the pet parent's device rings. */
router.post(
  '/:bookingId/start',
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      statusCode: 201,
      message: 'Consultation started',
      data: await consult.startCall(req.user, req.params.bookingId),
    });
  })
);

/** Either side joins — for the pet parent this is accepting the call. */
router.post(
  '/:bookingId/join',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await consult.joinCall(req.user, req.params.bookingId) });
  })
);

router.post(
  '/:bookingId/reject',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await consult.rejectCall(req.user, req.params.bookingId) });
  })
);

router.post(
  '/:bookingId/end',
  validate(z.object({ notes: z.string().max(5000).optional() })),
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      message: 'Consultation ended',
      data: await consult.endCall(req.user, req.params.bookingId, { notes: req.body.notes }),
    });
  })
);

/** Pet parent approves per-minute charging past the booked duration. */
router.post(
  '/:bookingId/overage/consent',
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      message: 'Extra time approved',
      data: await consult.consentToOverage(req.user, req.params.bookingId),
    });
  })
);

/** Vet forgives the overage before it is invoiced. */
router.post(
  '/:bookingId/overage/waive',
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      message: 'Extra charge waived',
      data: await consult.waiveOverage(req.user, req.params.bookingId),
    });
  })
);

/** Rehydrate state + a fresh token. */
router.get(
  '/:bookingId',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await consult.getCall(req.user, req.params.bookingId) });
  })
);

export default router;
