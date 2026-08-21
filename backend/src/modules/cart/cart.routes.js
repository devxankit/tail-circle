import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as cartService from './cart.service.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const putCartSchema = z.object({
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
    .max(50),
});

const addItemSchema = z.object({
  productId: objectId,
  packSizeIndex: z.number().int().min(0).max(20).default(0),
  qty: z.number().int().min(1).max(99).default(1),
  bundleSlug: z.string().trim().max(80).nullish(),
});

router.use(authenticate);

/** GET /cart — hydrated with live prices/stock. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await cartService.getHydratedCart(req.user.id) });
  })
);

/** PUT /cart — replace items (client merges its guest cart on login). */
router.put(
  '/',
  validate(putCartSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await cartService.replaceCart(req.user.id, req.body.items) });
  })
);

/** POST /cart/items — add/increment one line. */
router.post(
  '/items',
  validate(addItemSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await cartService.addItem(req.user.id, req.body) });
  })
);

export default router;
