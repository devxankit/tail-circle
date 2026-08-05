import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheResponse } from '../../services/cache.service.js';
import { Product } from './product.model.js';
import { ProductCategory } from './productCategory.model.js';

const router = Router();

const MAX_LIMIT = 100;

/**
 * GET /shop/products — public catalog with the filter set the UI uses.
 * ?category= &petType= &search= &brand= &minPrice= &maxPrice= &specialDiet=
 * &lifeStage= &productType= &newArrivals=1 &bestsellers=1
 * &sort=price_asc|price_desc|rating|newest &page= &limit=
 */
router.get(
  '/products',
  cacheResponse('shop', 120),
  asyncHandler(async (req, res) => {
    const q = req.query;
    const filter = { active: true, deletedAt: null };

    if (q.category && q.category !== 'All') filter.category = q.category;
    if (q.petType && q.petType !== 'All Pets') filter.petType = q.petType;
    if (q.brand) filter.brand = q.brand;
    if (q.specialDiet) filter.specialDiet = q.specialDiet;
    if (q.lifeStage) filter.lifeStage = q.lifeStage;
    if (q.productType) filter.productType = q.productType;
    if (q.newArrivals) filter.isNewArrival = true;
    if (q.bestsellers) filter.isBestseller = true;
    if (q.minPrice || q.maxPrice) {
      filter.price = {
        ...(q.minPrice ? { $gte: Number(q.minPrice) } : {}),
        ...(q.maxPrice ? { $lte: Number(q.maxPrice) } : {}),
      };
    }
    if (q.search) {
      // Prefix/substring match feels right for a small catalog's search box.
      const rx = new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { brand: rx }, { tag: rx }];
    }

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { rating: -1, ratingCount: -1 },
      newest: { createdAt: -1 },
    };
    const sort = sortMap[q.sort] || { isBestseller: -1, legacyId: 1 };

    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || MAX_LIMIT));

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);

    sendSuccess(res, { data: { items, total, page, pages: Math.ceil(total / limit) } });
  })
);

/** GET /shop/products/:id — by ObjectId, slug or legacy numeric id. */
router.get(
  '/products/:id',
  cacheResponse('shop', 120),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const or = [{ slug: id }];
    if (mongoose.isValidObjectId(id)) or.push({ _id: id });
    if (/^\d+$/.test(id)) or.push({ legacyId: Number(id) });

    const product = await Product.findOne({ $or: or, active: true, deletedAt: null });
    if (!product) throw ApiError.notFound('Product not found');
    sendSuccess(res, { data: product });
  })
);

/** GET /shop/categories */
router.get(
  '/categories',
  cacheResponse('shop', 300),
  asyncHandler(async (_req, res) => {
    const categories = await ProductCategory.find({ active: true }).sort({ sort: 1, name: 1 });
    sendSuccess(res, { data: categories });
  })
);

export default router;
