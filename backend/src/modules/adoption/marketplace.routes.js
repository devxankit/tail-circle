import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { MarketplaceListing } from './adoption.models.js';

const router = Router();

/** GET /marketplace/listings — public buy tab. */
router.get(
  '/listings',
  asyncHandler(async (_req, res) => {
    const listings = await MarketplaceListing.find({ status: { $in: ['active', 'booked'] } }).sort({
      createdAt: -1,
    });
    sendSuccess(res, { data: listings });
  })
);

router.use(authenticate);

/** POST /marketplace/listings — Sell tab. */
router.post(
  '/listings',
  validate(
    z.object({
      name: z.string().trim().min(1).max(60),
      species: z.string().trim().max(30).default('Dog'),
      breed: z.string().trim().max(60).default(''),
      age: z.string().trim().max(30).default(''),
      gender: z.string().trim().max(20).default(''),
      price: z.string().trim().max(20).default('0'),
      location: z.string().trim().max(120).default(''),
      vaccinated: z.string().trim().max(40).default('Not Vaccinated'),
      img: z.string().max(1_000_000).default(''), // data URL or upload URL
    })
  ),
  asyncHandler(async (req, res) => {
    const listing = await MarketplaceListing.create({
      ...req.body,
      sellerId: req.user.id,
      seller: req.user.name || 'TailCircle Member',
      verification: false,
      cert: 'General Breeder Record',
      status: 'active',
    });
    sendSuccess(res, { statusCode: 201, message: 'Listing published', data: listing });
  })
);

/** POST /marketplace/listings/:id/book-meet — meet-the-pet request. */
router.post(
  '/listings/:id/book-meet',
  asyncHandler(async (req, res) => {
    const listing = await MarketplaceListing.findOne({ _id: req.params.id, status: 'active' });
    if (!listing) throw ApiError.badRequest('Listing not available');
    listing.status = 'booked';
    await listing.save();
    sendSuccess(res, { message: 'Meeting booked', data: listing });
  })
);

export default router;
