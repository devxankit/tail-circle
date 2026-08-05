import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { Review, REVIEW_TARGETS } from './review.model.js';
import { Product } from '../shop/product.model.js';
import { Order } from '../order/order.model.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createReviewSchema = z.object({
  targetType: z.enum(REVIEW_TARGETS),
  targetId: objectId,
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(2000).default(''),
  images: z.array(z.string().url()).max(5).default([]),
});

/** GET /reviews?targetType=product&targetId= — public. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.query;
    if (!REVIEW_TARGETS.includes(targetType) || !targetId) {
      throw ApiError.badRequest('targetType and targetId are required');
    }
    const reviews = await Review.find({ targetType, targetId, status: 'visible' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name avatarUrl');
    sendSuccess(res, { data: reviews });
  })
);

/** POST /reviews — one per user per target; upserts on re-review. */
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    const { targetType, targetId, rating, text, images } = req.body;

    // Verified purchase = a delivered order containing this product.
    let verifiedPurchase = false;
    if (targetType === 'product') {
      verifiedPurchase = Boolean(
        await Order.exists({
          userId: req.user.id,
          status: 'delivered',
          'items.productId': targetId,
        })
      );
    }

    const review = await Review.findOneAndUpdate(
      { userId: req.user.id, targetType, targetId },
      { $set: { rating, text, images, verifiedPurchase, status: 'visible' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Refresh the aggregate cached on the product card.
    if (targetType === 'product') {
      const agg = await Review.aggregate([
        { $match: { targetType: 'product', targetId: review.targetId, status: 'visible' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg[0]) {
        await Product.updateOne(
          { _id: targetId },
          { $set: { rating: Math.round(agg[0].avg * 10) / 10, ratingCount: agg[0].count } }
        );
        await invalidate('shop:*');
      }
    }

    sendSuccess(res, { statusCode: 201, message: 'Review saved', data: review });
  })
);

export default router;
