import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheResponse } from '../../services/cache.service.js';
import { Breed } from './breed.model.js';

const router = Router();

/**
 * GET /breeds?petType=dog&size=large — public catalog (cached 5 min).
 *
 * `?withShopData=1` includes the shop-recommendation blobs. Shop-by-Breed
 * needs them for every breed at once; without the flag it had to follow up
 * with one detail request per breed, which at catalog size meant 100+ round
 * trips to open the screen. Off by default so the pickers that only want
 * names stay light.
 */
router.get(
  '/',
  cacheResponse('breeds', 300),
  asyncHandler(async (req, res) => {
    const filter = { active: true };
    if (req.query.petType) filter.petType = String(req.query.petType).toLowerCase();
    if (req.query.size) filter.size = String(req.query.size).toLowerCase();

    const withShopData = ['1', 'true', 'yes'].includes(String(req.query.withShopData).toLowerCase());

    const breeds = await Breed.find(filter)
      .select(withShopData ? '-__v' : '-shopData')
      .sort({ popularity: -1, name: 1 })
      .limit(500);
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
