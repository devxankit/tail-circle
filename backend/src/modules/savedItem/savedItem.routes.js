import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { Product } from '../shop/product.model.js';

/** Wishlist — products now, providers/pets later via targetType. */
const savedItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['product', 'provider', 'adoption_listing'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);
savedItemSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
export const SavedItem = mongoose.model('SavedItem', savedItemSchema);

const router = Router();
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const toggleSchema = z.object({
  targetType: z.enum(['product', 'provider', 'adoption_listing']).default('product'),
  targetId: objectId,
});

router.use(authenticate);

/** GET /saved-items — hydrated products for the SavedItems screen. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const saved = await SavedItem.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const productIds = saved.filter((s) => s.targetType === 'product').map((s) => s.targetId);
    const products = await Product.find({ _id: { $in: productIds }, active: true, deletedAt: null });
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const items = saved
      .map((s) => ({
        _id: s.id,
        targetType: s.targetType,
        targetId: s.targetId,
        savedAt: s.createdAt,
        product: byId.get(String(s.targetId)) || null,
      }))
      .filter((s) => s.targetType !== 'product' || s.product);
    sendSuccess(res, { data: items });
  })
);

/** POST /saved-items — save (idempotent). */
router.post(
  '/',
  validate(toggleSchema),
  asyncHandler(async (req, res) => {
    await SavedItem.updateOne(
      { userId: req.user.id, ...req.body },
      { $setOnInsert: { userId: req.user.id, ...req.body } },
      { upsert: true }
    );
    sendSuccess(res, { statusCode: 201, message: 'Saved' });
  })
);

/** DELETE /saved-items — unsave. */
router.delete(
  '/',
  validate(toggleSchema),
  asyncHandler(async (req, res) => {
    await SavedItem.deleteOne({ userId: req.user.id, ...req.body });
    sendSuccess(res, { message: 'Removed' });
  })
);

export default router;
