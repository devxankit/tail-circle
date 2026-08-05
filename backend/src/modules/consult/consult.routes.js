import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { logger } from '../../utils/logger.js';
import * as consult from './consult.service.js';
// Side-effect import: registers the `consult_overage` Razorpay purpose handler.
import './consult.payment.js';

const router = Router();

/**
 * Video consultation signalling.
 *
 * Every route runs through `authorizeCall()`, which checks the caller is the
 * assigned vet or the assigned pet parent, that the booking is paid and is a
 * video consult, and that we are inside the join window. The actual WebRTC
 * offer/answer/ICE exchange and the join/leave timing this module bills from
 * happen over Socket.IO (`sockets/index.js`), not REST — there is no media
 * server webhook to receive here anymore.
 */

/**
 * The global error handler only logs 5xx/non-operational errors — a rejected
 * `authorizeCall()` (wrong window, unpaid, not a participant, …) is a normal
 * 4xx and is deliberately silent there. For this feature that silence makes a
 * failed "answer the call" invisible in ops logs, so every consult route logs
 * its own failures regardless of status code.
 */
function logged(handler) {
  return asyncHandler(async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      logger.warn(
        `consult ${req.method} ${req.originalUrl} — user ${req.user?.id || 'anon'} — ${err.statusCode || 500} ${err.message}`
      );
      throw err;
    }
  });
}

/* ── Authenticated call lifecycle ─────────────────────────────────── */

router.use(authenticate);

/** Any live call this user is party to — for resuming after a page reload. */
router.get(
  '/active',
  logged(async (req, res) => {
    sendSuccess(res, { data: await consult.getActiveCall(req.user) });
  })
);

/** Vet starts the consultation; the pet parent's device rings. */
router.post(
  '/:bookingId/start',
  logged(async (req, res) => {
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
  logged(async (req, res) => {
    sendSuccess(res, { data: await consult.joinCall(req.user, req.params.bookingId) });
  })
);

router.post(
  '/:bookingId/reject',
  logged(async (req, res) => {
    sendSuccess(res, { data: await consult.rejectCall(req.user, req.params.bookingId) });
  })
);

router.post(
  '/:bookingId/end',
  validate(z.object({ notes: z.string().max(5000).optional() })),
  logged(async (req, res) => {
    sendSuccess(res, {
      message: 'Consultation ended',
      data: await consult.endCall(req.user, req.params.bookingId, { notes: req.body.notes }),
    });
  })
);

/** Pet parent approves per-minute charging past the booked duration. */
router.post(
  '/:bookingId/overage/consent',
  logged(async (req, res) => {
    sendSuccess(res, {
      message: 'Extra time approved',
      data: await consult.consentToOverage(req.user, req.params.bookingId),
    });
  })
);

/** Vet forgives the overage before it is invoiced. */
router.post(
  '/:bookingId/overage/waive',
  logged(async (req, res) => {
    sendSuccess(res, {
      message: 'Extra charge waived',
      data: await consult.waiveOverage(req.user, req.params.bookingId),
    });
  })
);

/** Rehydrate state + fresh TURN credentials when the call is live. */
router.get(
  '/:bookingId',
  logged(async (req, res) => {
    sendSuccess(res, { data: await consult.getCall(req.user, req.params.bookingId) });
  })
);

export default router;
