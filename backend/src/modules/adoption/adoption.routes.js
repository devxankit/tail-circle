import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheResponse } from '../../services/cache.service.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import {
  AdoptionListing,
  AdoptionBreed,
  AdoptionApplication,
  APPLICATION_STEPS,
} from './adoption.models.js';

const router = Router();

function listingFilter(id) {
  const or = [{ legacyId: String(id) }];
  if (mongoose.isValidObjectId(id)) or.push({ _id: id });
  return { $or: or };
}

/* ── public catalog ───────────────────────────────────── */

/** GET /adoption/pets?breed= — listing feed. */
router.get(
  '/pets',
  cacheResponse('adoption', 120),
  asyncHandler(async (req, res) => {
    const filter = { status: { $in: ['Available', 'Pending'] } };
    if (req.query.breed) filter.breed = new RegExp(`^${String(req.query.breed).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const pets = await AdoptionListing.find(filter).sort({ legacyId: 1 }).limit(200);
    sendSuccess(res, { data: pets });
  })
);

/** GET /adoption/breeds — breed cards with live counts. */
router.get(
  '/breeds',
  cacheResponse('adoption', 120),
  asyncHandler(async (_req, res) => {
    const [breeds, counts] = await Promise.all([
      AdoptionBreed.find().sort({ sort: 1 }),
      AdoptionListing.aggregate([
        { $match: { status: 'Available' } },
        { $group: { _id: '$breed', count: { $sum: 1 } } },
      ]),
    ]);
    const countByBreed = new Map(counts.map((c) => [c._id, c.count]));
    sendSuccess(res, {
      data: breeds.map((b) => ({
        name: b.name,
        image: b.image,
        size: b.size,
        traits: b.traits,
        count: countByBreed.get(b.name) || 0,
      })),
    });
  })
);

/** GET /adoption/pets/:id */
router.get(
  '/pets/:id',
  cacheResponse('adoption', 60),
  asyncHandler(async (req, res) => {
    const pet = await AdoptionListing.findOne(listingFilter(req.params.id));
    if (!pet) throw ApiError.notFound('Pet not found');
    sendSuccess(res, { data: pet });
  })
);

/* ── applications & user pet listings (auth) ────────── */

router.use(authenticate);

/** POST /adoption/pets — create a new adoption listing by logged in user */
router.post(
  '/pets',
  validate(
    z.object({
      name: z.string().min(1).max(100),
      type: z.string().optional().default('Dog'),
      breed: z.string().min(1).max(100),
      age: z.string().optional().default('Young'),
      gender: z.string().optional().default('Male'),
      price: z.number().min(0).default(0),
      distance: z.string().optional().default('Near You'),
      weight: z.string().optional().default('Medium'),
      location: z.string().optional().default('Indore'),
      vaccinated: z.boolean().optional().default(false),
      dewormed: z.boolean().optional().default(false),
      neutered: z.boolean().optional().default(false),
      images: z.array(z.string()).optional().default([]),
      about: z.string().optional().default(''),
      traits: z.array(z.string()).optional().default([]),
      contactPhone: z.string().optional().default(''),
      contactEmail: z.string().optional().default(''),
    })
  ),
  asyncHandler(async (req, res) => {
    const legacyId = `ADOPT-USER-${Date.now()}`;
    const images = req.body.images && req.body.images.length > 0
      ? req.body.images
      : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80'];

    const listing = await AdoptionListing.create({
      legacyId,
      postedBy: req.user.id,
      name: req.body.name,
      type: req.body.type || 'Dog',
      breed: req.body.breed,
      age: req.body.age || 'Young',
      gender: req.body.gender || 'Male',
      price: req.body.price || 0,
      distance: req.body.distance || 'Near You',
      weight: req.body.weight || 'Medium',
      location: req.body.location || req.user.city || 'Indore',
      vaccinated: Boolean(req.body.vaccinated),
      dewormed: Boolean(req.body.dewormed),
      neutered: Boolean(req.body.neutered),
      images,
      about: req.body.about || 'A loving pet looking for a forever home.',
      traits: req.body.traits || ['Friendly', 'Playful'],
      contactPhone: req.body.contactPhone || req.user.phone || '',
      contactEmail: req.body.contactEmail || req.user.email || '',
      shelter: {
        name: req.user.name || 'Pet Parent',
        verified: true,
        image: req.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
    });

    // Ensure breed entry exists so rail cards reflect count dynamically
    const breedName = req.body.breed;
    const existingBreed = await AdoptionBreed.findOne({ name: new RegExp(`^${breedName}$`, 'i') });
    if (!existingBreed) {
      await AdoptionBreed.create({
        name: breedName,
        image: images[0],
        size: req.body.weight || 'Medium',
        traits: (req.body.traits || ['Friendly', 'Playful']).join(' • '),
      });
    }

    sendSuccess(res, { statusCode: 201, message: 'Adoption listing created successfully', data: listing });
  })
);

/** GET /adoption/my-listings — fetch pets posted by logged in user */
router.get(
  '/my-listings',
  asyncHandler(async (req, res) => {
    const listings = await AdoptionListing.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    sendSuccess(res, { data: listings });
  })
);

/** PATCH /adoption/my-listings/:id — update user's own listing */
router.patch(
  '/my-listings/:id',
  asyncHandler(async (req, res) => {
    const listing = await AdoptionListing.findOne({ _id: req.params.id, postedBy: req.user.id });
    if (!listing) throw ApiError.notFound('Listing not found or unauthorized');

    if (req.body.status) listing.status = req.body.status;
    if (req.body.name) listing.name = req.body.name;
    if (req.body.about) listing.about = req.body.about;
    if (req.body.price !== undefined) listing.price = req.body.price;

    await listing.save();
    sendSuccess(res, { message: 'Listing updated successfully', data: listing });
  })
);

/** DELETE /adoption/my-listings/:id — delete user's own listing */
router.delete(
  '/my-listings/:id',
  asyncHandler(async (req, res) => {
    const result = await AdoptionListing.deleteOne({ _id: req.params.id, postedBy: req.user.id });
    if (result.deletedCount === 0) throw ApiError.notFound('Listing not found or unauthorized');
    sendSuccess(res, { message: 'Listing deleted successfully' });
  })
);

/** POST /adoption/applications — one active application per listing. */
router.post(
  '/applications',
  validate(
    z.object({
      listingId: z.string().max(60),
      form: z.record(z.string(), z.unknown()).default({}),
    })
  ),
  asyncHandler(async (req, res) => {
    const listing = await AdoptionListing.findOne(listingFilter(req.body.listingId));
    if (!listing) throw ApiError.badRequest('Pet not found');
    if (listing.status !== 'Available') throw ApiError.badRequest('This pet is no longer available');

    const existing = await AdoptionApplication.findOne({
      userId: req.user.id,
      listingId: listing.id,
      status: { $nin: ['rejected', 'cancelled'] },
    });
    if (existing) {
      return sendSuccess(res, { message: 'Application already in progress', data: existing });
    }

    const application = await AdoptionApplication.create({
      userId: req.user.id,
      listingId: listing.id,
      form: req.body.form,
      feePaise: Math.round(listing.price * 100),
      timeline: [{ status: 'submitted', note: 'Application submitted' }],
    });
    sendSuccess(res, { statusCode: 201, message: 'Application submitted', data: application });
  })
);

/** GET /adoption/applications — MyAdoptions. */
router.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const apps = await AdoptionApplication.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('listingId');
    sendSuccess(res, { data: apps });
  })
);

/**
 * POST /adoption/applications/:id/advance — walk the pipeline one step.
 * Steps are strictly sequential; jumping ahead is rejected. (Admin
 * moderation of approvals lands in Phase 11 — until then the walkthrough
 * mirrors the mock's self-serve flow.)
 */
router.post(
  '/applications/:id/advance',
  validate(
    z.object({
      step: z.enum(['home_check_scheduled', 'approved', 'meet_scheduled', 'agreement_signed']),
      scheduledAt: z.string().max(60).optional(),
      notes: z.string().max(500).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const application = await AdoptionApplication.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!application) throw ApiError.notFound('Application not found');

    const currentIdx = APPLICATION_STEPS.indexOf(application.status);
    const nextIdx = APPLICATION_STEPS.indexOf(req.body.step);
    if (nextIdx !== currentIdx + 1) {
      throw ApiError.badRequest(`Cannot move from ${application.status} to ${req.body.step}`);
    }

    application.status = req.body.step;
    if (req.body.step === 'home_check_scheduled') {
      application.homeCheck = { scheduledAt: req.body.scheduledAt || null, notes: req.body.notes || '' };
    }
    if (req.body.step === 'meet_scheduled') {
      application.meet = { scheduledAt: req.body.scheduledAt || null };
    }
    if (req.body.step === 'agreement_signed') {
      application.agreementAcceptedAt = new Date();
    }
    application.timeline.push({ status: req.body.step, note: req.body.notes || '' });
    await application.save();

    // Lock the listing once an application passes approval.
    if (req.body.step === 'approved') {
      await AdoptionListing.updateOne(
        { _id: application.listingId, status: 'Available' },
        { $set: { status: 'Pending' } }
      );
    }
    sendSuccess(res, { message: 'Application updated', data: application });
  })
);

/** POST /adoption/applications/:id/pay-fee — Razorpay, or free completion. */
router.post(
  '/applications/:id/pay-fee',
  asyncHandler(async (req, res) => {
    const application = await AdoptionApplication.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!application) throw ApiError.notFound('Application not found');
    if (application.status !== 'agreement_signed') {
      throw ApiError.badRequest('Sign the agreement before paying the fee');
    }

    if (application.feePaise === 0) {
      await completeAdoption(application);
      return sendSuccess(res, { message: 'Adoption complete', data: { application } });
    }

    const payment = await createPaymentOrder(req.user, 'adoption_fee', {
      applicationId: application.id,
    });
    application.paymentId = payment.paymentId;
    await application.save();
    sendSuccess(res, { statusCode: 201, message: 'Fee order created', data: { application, razorpay: payment } });
  })
);

async function completeAdoption(application) {
  application.status = 'completed';
  application.timeline.push({ status: 'completed', note: 'Adoption complete — welcome home!' });
  await application.save();
  await AdoptionListing.updateOne({ _id: application.listingId }, { $set: { status: 'Adopted' } });
}

registerPurposeHandler('adoption_fee', {
  computeAmount: async (user, payload) => {
    const application = await AdoptionApplication.findOne({
      _id: payload.applicationId,
      userId: user.id,
      status: 'agreement_signed',
    });
    if (!application) throw ApiError.badRequest('Application not ready for payment');
    return { amountPaise: application.feePaise, refId: application.id };
  },
  onPaid: async (payment) => {
    const application = await AdoptionApplication.findOne({
      _id: payment.refId,
      status: 'agreement_signed',
    });
    if (!application) return;
    application.paymentId = payment.id;
    await completeAdoption(application);
  },
});

export default router;
