import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheResponse } from '../../services/cache.service.js';
import { Breed } from './breed.model.js';

const router = Router();

/** GET /breeds?petType=dog&size=large — public catalog (cached 5 min). */
router.get(
  '/',
  cacheResponse('breeds', 300),
  asyncHandler(async (req, res) => {
    const filter = { active: true };
    if (req.query.petType) filter.petType = String(req.query.petType).toLowerCase();
    if (req.query.size) filter.size = String(req.query.size).toLowerCase();

    const breeds = await Breed.find(filter)
      .select('-shopData') // heavy shop blobs only on the detail route
      .sort({ popularity: -1, name: 1 })
      .limit(200);
    sendSuccess(res, { data: breeds });
  })
);

/** GET /breeds/:slug — full detail incl. shop recommendation data. */
router.get(
  '/:slug',
  cacheResponse('breeds', 300),
  asyncHandler(async (req, res) => {
    const breed = await Breed.findOne({ slug: req.params.slug, active: true });
    if (!breed) throw ApiError.notFound('Breed not found');
    sendSuccess(res, { data: breed });
  })
);

export default router;
