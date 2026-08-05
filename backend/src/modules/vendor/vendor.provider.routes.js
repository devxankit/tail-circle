import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../../middleware/auth.js';
import { withVendor, requireType } from '../../middleware/vendorGuard.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { Provider } from '../provider/provider.model.js';
import { ServiceOffering } from '../provider/serviceOffering.model.js';
import { Booking } from '../booking/booking.model.js';
import { SlotBooking } from '../booking/slot.model.js';

/**
 * Vendor portal for the two Provider-backed verticals — grooming salons and
 * daycare centres. Both manage the same shapes (a Provider, a service menu, a
 * slot template, and incoming bookings), so one factory serves both rather than
 * two near-identical routers drifting apart.
 *
 *   router.use('/vendor/grooming', providerVendorRouter('grooming'));
 *   router.use('/vendor/daycare',  providerVendorRouter('daycare'));
 *
 * Isolation rules enforced here:
 *   • `withVendor` + `requireType` — only an approved vendor of THIS type.
 *   • Every query is scoped to `vendorUserId`; a vendor can never read or
 *     adopt another's salon. (The previous implementation fell back to
 *     "any provider of this type" and claimed it, which let the first caller
 *     take over a salon that wasn't theirs.)
 */

/** The vendor's own Provider. Never falls back to somebody else's. */
async function ownProvider(req, providerType) {
  const provider = await Provider.findOne({ vendorUserId: req.user.id, type: providerType });
  if (!provider) {
    throw ApiError.notFound(
      `No ${providerType} profile is linked to this account. Contact support if this is unexpected.`
    );
  }
  return provider;
}

const timeStr = z.string().regex(/^\d{1,2}:\d{2}(\s?[AaPp][Mm])?$/, 'time must be HH:mm or h:mm AM');

export function providerVendorRouter(providerType) {
  const router = Router();
  router.use(authenticate, authorize('vendor'));
  const guard = [withVendor, requireType(providerType)];

  const dropPublicCache = () => invalidate('providers:resp:*');

  /* ── Profile ────────────────────────────────────────────── */

  router.get('/profile', ...guard, asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await ownProvider(req, providerType) });
  }));

  router.patch(
    '/profile',
    ...guard,
    validate(
      z.object({
        name: z.string().trim().min(2).max(120).optional(),
        about: z.string().max(2000).optional(),
        image: z.string().max(2000).optional(),
        gallery: z.array(z.string().max(2000)).max(20).optional(),
        openTime: z.string().max(10).optional(),
        closeTime: z.string().max(10).optional(),
        startingPrice: z.number().min(0).optional(),
        supportedPets: z.array(z.string().max(40)).max(20).optional(),
        visitTypes: z.array(z.string().max(40)).max(10).optional(),
        distanceText: z.string().max(120).optional(),
        isOpen: z.boolean().optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
    ),
    asyncHandler(async (req, res) => {
      const provider = await ownProvider(req, providerType);
      const { details, ...rest } = req.body;
      Object.assign(provider, rest);
      // `details` is a free-form blob per vertical — merge, never replace, so a
      // partial save cannot wipe the slot template.
      if (details) provider.details = { ...(provider.details || {}), ...details };
      await provider.save();
      await dropPublicCache();
      sendSuccess(res, { message: 'Profile updated', data: provider });
    })
  );

  /* ── Service menu ───────────────────────────────────────── */

  router.get('/services', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    const services = await ServiceOffering.find({ providerId: provider._id }).sort({ createdAt: -1 });
    sendSuccess(res, { data: services });
  }));

  router.post(
    '/services',
    ...guard,
    validate(
      // Mirrors ServiceOffering exactly — anything else is silently dropped by
      // Mongoose, which is how the old grooming screen "saved" mrp/durationMin
      // that never existed.
      z.object({
        name: z.string().trim().min(2).max(120),
        description: z.string().max(1000).optional(),
        price: z.number().min(0),
        kind: z.enum(['plan', 'package', 'addon', 'menu_item']).optional(),
        unit: z.enum(['day', 'week', 'month']).nullable().optional(),
        category: z.string().max(60).nullable().optional(),
        includes: z.array(z.string().max(120)).max(20).optional(),
        isPopular: z.boolean().optional(),
        badge: z.string().max(40).nullable().optional(),
        active: z.boolean().optional(),
      })
    ),
    asyncHandler(async (req, res) => {
      const provider = await ownProvider(req, providerType);
      const service = await ServiceOffering.create({
        ...req.body,
        kind: req.body.kind || (providerType === 'daycare' ? 'plan' : 'package'),
        providerId: provider._id,
        providerType,
        active: true,
      });
      await dropPublicCache();
      sendSuccess(res, { statusCode: 201, message: 'Service created', data: service });
    })
  );

  router.patch('/services/:id', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid service id');
    const service = await ServiceOffering.findOneAndUpdate(
      { _id: req.params.id, providerId: provider._id },   // ownership in the filter
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) throw ApiError.notFound('Service not found');
    await dropPublicCache();
    sendSuccess(res, { message: 'Service updated', data: service });
  }));

  router.delete('/services/:id', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid service id');
    const service = await ServiceOffering.findOneAndDelete({ _id: req.params.id, providerId: provider._id });
    if (!service) throw ApiError.notFound('Service not found');
    await dropPublicCache();
    sendSuccess(res, { message: 'Service removed' });
  }));

  /* ── Slot template ──────────────────────────────────────── */
  // Customers can only book times that appear here; an empty template means
  // the booking screen shows no slots at all.

  router.get('/slots', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    sendSuccess(res, { data: provider.details?.slotTemplate || [] });
  }));

  router.put(
    '/slots',
    ...guard,
    validate(
      z.object({
        slotTemplate: z.array(
          z.object({
            time: timeStr,
            period: z.enum(['Morning', 'Afternoon', 'Evening']).optional(),
            capacity: z.number().int().min(1).max(50).optional(),
          })
        ).max(40),
      })
    ),
    asyncHandler(async (req, res) => {
      const provider = await ownProvider(req, providerType);
      provider.details = { ...(provider.details || {}), slotTemplate: req.body.slotTemplate };
      provider.markModified('details');
      await provider.save();
      await dropPublicCache();
      sendSuccess(res, { message: 'Slots updated', data: provider.details.slotTemplate });
    })
  );

  /* ── Bookings ───────────────────────────────────────────── */

  router.get('/bookings', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    const filter = { providerId: provider._id, type: providerType };
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name phone avatarUrl')
      .populate('petId', 'name breed species avatarUrl');
    sendSuccess(res, { data: bookings });
  }));

  /** Move a booking through its lifecycle. Ownership is part of the filter. */
  router.patch(
    '/bookings/:id/status',
    ...guard,
    validate(z.object({ status: z.enum(['confirmed', 'in_progress', 'completed', 'no_show', 'cancelled']), note: z.string().max(300).optional() })),
    asyncHandler(async (req, res) => {
      const provider = await ownProvider(req, providerType);
      if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid booking id');
      const booking = await Booking.findOne({ _id: req.params.id, providerId: provider._id });
      if (!booking) throw ApiError.notFound('Booking not found');

      booking.status = req.body.status;
      booking.timeline.push({ status: req.body.status, note: req.body.note || `Updated by ${provider.name}` });
      await booking.save();
      sendSuccess(res, { message: 'Booking updated', data: booking });
    })
  );

  /* ── Dashboard summary ──────────────────────────────────── */

  router.get('/summary', ...guard, asyncHandler(async (req, res) => {
    const provider = await ownProvider(req, providerType);
    const today = new Date().toISOString().slice(0, 10);

    const [total, upcoming, completed, todays, services, revenue] = await Promise.all([
      Booking.countDocuments({ providerId: provider._id, type: providerType }),
      Booking.countDocuments({ providerId: provider._id, type: providerType, status: { $in: ['confirmed', 'in_progress'] } }),
      Booking.countDocuments({ providerId: provider._id, type: providerType, status: 'completed' }),
      Booking.countDocuments({ providerId: provider._id, type: providerType, 'schedule.startDate': today }),
      ServiceOffering.countDocuments({ providerId: provider._id, active: true }),
      Booking.aggregate([
        { $match: { providerId: provider._id, type: providerType, status: { $in: ['confirmed', 'in_progress', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amounts.total' } } },
      ]),
    ]);

    sendSuccess(res, {
      data: {
        providerName: provider.name,
        approvalStatus: provider.approvalStatus,
        listedPublicly: provider.active && provider.approvalStatus === 'approved',
        totalBookings: total,
        upcomingBookings: upcoming,
        completedBookings: completed,
        todaysBookings: todays,
        activeServices: services,
        // paise, matching every other money figure in the API
        grossRevenue: revenue[0]?.total || 0,
        rating: provider.rating,
        ratingCount: provider.ratingCount,
      },
    });
  }));

  return router;
}

export default providerVendorRouter;
