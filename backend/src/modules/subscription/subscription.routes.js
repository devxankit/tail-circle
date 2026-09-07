import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import {
  listPlans,
  serializePlan,
  getMySubscription,
  getEntitlement,
  listMyHistory,
  cancelMySubscription,
  startCheckout,
} from './subscription.service.js';

/**
 * User-facing match subscription API. Mounted at /subscriptions.
 *
 * The admin half of the feature lives in subscription.admin.service.js and is
 * mounted under /admin alongside the rest of the super-admin surface.
 */
const router = Router();
router.use(authenticate);

/** GET /subscriptions/plans — the purchasable catalog. */
router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    const plans = await listPlans();
    sendSuccess(res, { data: plans.map(serializePlan) });
  })
);

/**
 * GET /subscriptions/me — current plan, live quota and the catalog in one
 * call, so the subscription screen and the paywall sheet each need only one
 * request to render completely.
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await getMySubscription(req.user.id) });
  })
);

/**
 * GET /subscriptions/entitlement — just the quota.
 *
 * Deliberately small: the swipe deck polls this after a like to keep its
 * counter honest across devices, and does not want the plan catalog attached.
 */
router.get(
  '/entitlement',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await getEntitlement(req.user.id) });
  })
);

/** GET /subscriptions/history — past and present purchases. */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await listMyHistory(req.user.id) });
  })
);

/**
 * POST /subscriptions/checkout — open a Razorpay order for a plan.
 *
 * Only the plan id crosses the wire; the amount is recomputed server-side from
 * the plan document by the payment dispatcher.
 */
router.post(
  '/checkout',
  validate(z.object({ planId: z.string().regex(/^[0-9a-fA-F]{24}$/) })),
  asyncHandler(async (req, res) => {
    const result = await startCheckout(req.user, req.body.planId);
    sendSuccess(res, { statusCode: 201, message: 'Checkout ready', data: result });
  })
);

/** POST /subscriptions/cancel — stop renewal; the plan runs to its expiry. */
router.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const data = await cancelMySubscription(req.user.id);
    sendSuccess(res, { message: 'Renewal turned off', data });
  })
);

export default router;
