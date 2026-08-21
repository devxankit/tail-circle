import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as orderService from './order.service.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        packSizeIndex: z.number().int().min(0).max(20).default(0),
        qty: z.number().int().min(1).max(99),
        // Grouping marker only -- the discount it earns is looked up from the
        // breed catalogue server-side, so a forged slug buys nothing.
        bundleSlug: z.string().trim().max(80).nullish(),
      })
    )
    .min(1)
    .max(50),
  addressId: objectId,
  paymentMethod: z.enum(['razorpay', 'cod']),
});

const returnSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

router.use(authenticate);

/** POST /orders/checkout */
router.post(
  '/checkout',
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const data = await orderService.checkout(req.user, req.body);
    sendSuccess(res, { statusCode: 201, message: 'Order created', data });
  })
);

/** GET /orders — my orders (excludes abandoned pending_payment). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await orderService.listOrders(req.user.id) });
  })
);

/** GET /orders/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await orderService.getOrder(req.user.id, req.params.id) });
  })
);

/** POST /orders/:id/cancel */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Order cancelled', data: order });
  })
);

/** POST /orders/:id/return */
router.post(
  '/:id/return',
  validate(returnSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.requestReturn(req.user.id, req.params.id, req.body.reason);
    sendSuccess(res, { message: 'Return requested', data: order });
  })
);

export default router;
