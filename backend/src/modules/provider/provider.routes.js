import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheResponse } from '../../services/cache.service.js';
import { Provider, PROVIDER_TYPES } from './provider.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { Doctor, PUBLIC_DOCTOR_PROJECTION, modeForVisitType } from './doctor.model.js';
import { Event, EventMeta } from './event.model.js';
import { getSlots, getDayAvailability, quoteConsult } from '../booking/booking.service.js';
import { getDoctorSlots } from './availability.service.js';
import { authenticate } from '../../middleware/auth.js';
import { reportEmergency } from '../vendor/clinic.vendor.service.js';
import { User } from '../user/user.model.js';

const router = Router();

function idOrLegacy(id) {
  const or = [{ legacyId: String(id) }];
  if (mongoose.isValidObjectId(id)) or.push({ _id: id });
  return { $or: or };
}

/**
 * Public shape of a bookable item.
 *
 * `id` is the handle the booking screens send back as `items[].refId`. Seeded
 * offerings carry a mock `legacyId` ('pkg_2'); anything a vendor creates from
 * their dashboard has none, so its Mongo id is the handle. `resolveOfferings`
 * in booking.service.js accepts either, which is what lets a salon's own
 * packages actually be booked — previously only legacyId resolved, so nothing
 * a vendor added was ever purchasable.
 */
function publicOffering(o) {
  return {
    id: o.legacyId || String(o._id),
    _id: String(o._id),
    legacyId: o.legacyId || null,
    kind: o.kind,
    name: o.name,
    description: o.description || '',
    price: o.price,
    unit: o.unit || null,
    includes: o.includes || [],
    category: o.category || null,
    isPopular: Boolean(o.isPopular),
    badge: o.badge || null,
  };
}

/** GET /providers?type=daycare — public listing (cached). */
router.get(
  '/',
  cacheResponse('providers', 120),
  asyncHandler(async (req, res) => {
    const filter = { active: true, approvalStatus: 'approved' };
    if (req.query.type) {
      if (!PROVIDER_TYPES.includes(req.query.type)) throw ApiError.badRequest('Invalid type');
      filter.type = req.query.type;
    }
    const providers = await Provider.find(filter).sort({ rating: -1 }).limit(100);
    sendSuccess(res, { data: providers });
  })
);

/** GET /providers/:id — detail + offerings grouped by kind. */
router.get(
  '/:id',
  cacheResponse('providers', 120),
  asyncHandler(async (req, res) => {
    const provider = await Provider.findOne({ ...idOrLegacy(req.params.id), active: true });
    if (!provider) throw ApiError.notFound('Provider not found');

    const offerings = await ServiceOffering.find({
      providerType: provider.type,
      active: true,
      $or: [{ providerId: provider.id }, { providerId: null }],
    }).sort({ price: 1 });

    /*
     * Platform-wide rows (`providerId: null`) are a shared extras list. They
     * may contribute add-ons and menu items to any provider, but never plans or
     * packages: a plan is the thing this centre delivers at its own price, so
     * serving the shared demo plans made every daycare centre advertise
     * "Day Pass ₹499" no matter what it actually charges — and charge that.
     *
     * A provider with no plans of its own still falls back to the shared list,
     * so a centre that has not published one yet is not left unbookable.
     */
    const grouped = { plans: [], packages: [], addons: [], menu: [] };
    const ownFixed = { plan: [], package: [] };
    const sharedFixed = { plan: [], package: [] };

    for (const o of offerings) {
      const item = publicOffering(o);
      const isOwn = String(o.providerId || '') === String(provider.id);
      if (o.kind === 'plan' || o.kind === 'package') {
        (isOwn ? ownFixed : sharedFixed)[o.kind].push(item);
      } else if (o.kind === 'addon') {
        grouped.addons.push(item);
      } else {
        grouped.menu.push(item);
      }
    }

    grouped.plans = ownFixed.plan.length ? ownFixed.plan : sharedFixed.plan;
    grouped.packages = ownFixed.package.length ? ownFixed.package : sharedFixed.package;

    sendSuccess(res, { data: { provider, offerings: grouped } });
  })
);

/**
 * GET /providers/:id/availability?from=YYYY-MM-DD&days=60 — daycare day grid.
 *
 * Daycare is booked by the day, not by time slot, so its calendar asks here
 * rather than `/slots` (which is driven by a grooming-style slot template a
 * centre never has).
 */
router.get(
  '/:id/availability',
  asyncHandler(async (req, res) => {
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw ApiError.badRequest('from=YYYY-MM-DD is required');
    const data = await getDayAvailability({ providerId: req.params.id, from, days: req.query.days });
    sendSuccess(res, { data });
  })
);

/** GET /providers/:id/slots?date=YYYY-MM-DD — never cached. */
router.get(
  '/:id/slots',
  asyncHandler(async (req, res) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')) {
      throw ApiError.badRequest('date=YYYY-MM-DD is required');
    }
    const slots = await getSlots({ providerId: req.params.id, date: req.query.date });
    sendSuccess(res, { data: slots });
  })
);

export default router;

/* ── doctors ──────────────────────────────────────────── */

export const doctorRouter = Router();

doctorRouter.get(
  '/',
  cacheResponse('doctors', 120),
  asyncHandler(async (_req, res) => {
    // Only vets who cleared document verification are listed publicly.
    const doctors = await Doctor.find({
      active: true,
      'credentials.verification.status': 'approved',
    })
      .select(PUBLIC_DOCTOR_PROJECTION)
      .sort({ rating: -1 });
    sendSuccess(res, { data: doctors });
  })
);

/** User-side: raise an emergency request — broadcast to every online clinic. */
doctorRouter.post(
  '/emergencies',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await reportEmergency(req.user.id, req.body || {});
    sendSuccess(res, { statusCode: 201, message: 'Emergency broadcast to nearby clinics', data });
  })
);

/**
 * GET /doctors/:id/slots?date=YYYY-MM-DD&visitType=clinic|video|home|emergency
 *
 * Slots come from the vet's own schedule. `visitType` is significant: a vet who
 * only takes video in the evening returns nothing for `visitType=video` in the
 * morning, and a vet who has not enabled a mode returns nothing at all with
 * `meta.reason = 'mode_not_offered'`.
 */
doctorRouter.get(
  '/:id/slots',
  asyncHandler(async (req, res) => {
    const { slots, meta } = await getDoctorSlots({
      doctorId: req.params.id,
      date: req.query.date,
      visitType: req.query.visitType || 'clinic',
      includeFull: req.query.includeFull === 'true',
    });
    sendSuccess(res, { data: slots, meta });
  })
);

/**
 * GET /doctors/:id/quote?visitType=&petId=&paymentMethod= (auth)
 *
 * What this consultation will actually cost this customer, follow-up rate
 * included. The checkout screen priced from the public slots endpoint, which
 * has no idea who is asking and so always quoted the standard fee — a returning
 * customer was shown the full price and billed the follow-up one.
 */
doctorRouter.get(
  '/:id/quote',
  authenticate,
  asyncHandler(async (req, res) => {
    const or = [{ legacyId: Number(req.params.id) || -1 }];
    if (mongoose.isValidObjectId(req.params.id)) or.push({ _id: req.params.id });
    const doctor = await Doctor.findOne({ $or: or, active: true });
    if (!doctor) throw ApiError.notFound('Doctor not found');

    const mode = modeForVisitType(req.query.visitType || 'clinic');
    if (!mode) throw ApiError.badRequest('Invalid consultation type');
    if (!doctor.offersMode(mode)) {
      throw ApiError.badRequest(`${doctor.name} does not offer this consultation type`);
    }

    const quote = await quoteConsult({
      userId: req.user.id,
      doctor,
      mode,
      petId: mongoose.isValidObjectId(req.query.petId) ? req.query.petId : null,
      paymentMethod: req.query.paymentMethod === 'pay_later' ? 'pay_later' : 'razorpay',
    });
    sendSuccess(res, { data: quote });
  })
);

doctorRouter.get(
  '/:id',
  cacheResponse('doctors', 120),
  asyncHandler(async (req, res) => {
    const or = [{ legacyId: Number(req.params.id) || -1 }];
    if (mongoose.isValidObjectId(req.params.id)) or.push({ _id: req.params.id });
    const doctor = await Doctor.findOne({ $or: or, active: true }).select(
      PUBLIC_DOCTOR_PROJECTION
    );
    if (!doctor) throw ApiError.notFound('Doctor not found');
    sendSuccess(res, { data: doctor });
  })
);

import { Booking } from '../booking/booking.model.js';
import { CustomerRequest } from '../vendor/event.models.js';

/* ── events ───────────────────────────────────────────── */

export const eventRouter = Router();

eventRouter.get(
  '/',
  cacheResponse('events', 120),
  asyncHandler(async (req, res) => {
    const filter = { status: 'published' };
    if (req.query.category && req.query.category !== 'all') {
      filter.category = new RegExp(`^${String(req.query.category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    const events = await Event.find(filter).sort({ legacyId: 1 });
    sendSuccess(res, { data: events });
  })
);

/** Category chips + package templates for the events screen rails. */
eventRouter.get(
  '/meta',
  cacheResponse('events', 300),
  asyncHandler(async (_req, res) => {
    const meta = await EventMeta.find().sort({ sort: 1 });
    sendSuccess(res, {
      data: {
        categories: meta.filter((m) => m.kind === 'category').map((m) => m.data),
        packageTemplates: meta.filter((m) => m.kind === 'package_template').map((m) => m.data),
      },
    });
  })
);

/** GET /events/my-tickets (auth) — user's purchased event passes. */
eventRouter.get(
  '/my-tickets',
  authenticate,
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ userId: req.user.id, type: 'event' })
      .sort({ createdAt: -1 })
      .populate('eventId');
    sendSuccess(res, { data: bookings });
  })
);

/** POST /events/requests (auth) — submit custom party/package enquiry. */
eventRouter.post(
  '/requests',
  authenticate,
  asyncHandler(async (req, res) => {
    let targetVendorId = req.body.vendorId;
    if (!targetVendorId || !mongoose.isValidObjectId(targetVendorId)) {
      const defaultVendor = await User.findOne({ role: 'vendor', vendorType: 'events' });
      if (defaultVendor) targetVendorId = defaultVendor._id;
    }
    if (!targetVendorId) throw ApiError.badRequest('No event vendor available for requests');

    const request = await CustomerRequest.create({
      vendorId: targetVendorId,
      userId: req.user.id,
      customer: req.user.name || 'Pet Parent',
      pet: req.body.petName || 'Pet',
      type: req.body.packageType || 'Birthday',
      date: req.body.date || '',
      budget: req.body.budget || '₹10,000',
      message: req.body.notes || 'Package inquiry submitted',
      status: 'New',
    });
    sendSuccess(res, { statusCode: 201, message: 'Event request submitted to organizer', data: request });
  })
);

eventRouter.get(
  '/:id',
  cacheResponse('events', 60),
  asyncHandler(async (req, res) => {
    const or = [{ legacyId: Number(req.params.id) || -1 }];
    if (mongoose.isValidObjectId(req.params.id)) or.push({ _id: req.params.id });
    const event = await Event.findOne({ $or: or });
    if (!event) throw ApiError.notFound('Event not found');
    sendSuccess(res, { data: event });
  })
);
