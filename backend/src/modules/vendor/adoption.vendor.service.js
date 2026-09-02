import { ApiError } from '../../utils/ApiError.js';
import { notify } from '../../services/notify.js';
import { invalidate } from '../../services/cache.service.js';
import {
  AdoptionListing,
  AdoptionApplication,
  APPLICATION_STEPS,
} from '../adoption/adoption.models.js';
import { advanceApplication, rejectApplication, LISTER_STEPS } from '../adoption/adoption.routes.js';

/**
 * Shelter / rescue / breeder portal — the counterparty the adoption flow was
 * missing.
 *
 * Before this, an applicant walked their own application from "submitted" to
 * "approved" with nobody reviewing it: the person rehoming the animal never
 * even learned an application existed. The vetting steps (home check, approve,
 * decline, meet) belong here; the adopter still owns submitting, signing the
 * agreement and paying the fee.
 */

const dropPublicCache = () => invalidate('adoption:*').catch(() => {});

const toVendorListing = (l) => ({
  id: String(l._id),
  _id: String(l._id),
  legacyId: l.legacyId,
  name: l.name,
  type: l.type,
  breed: l.breed,
  age: l.age,
  gender: l.gender,
  price: l.price,
  status: l.status,
  location: l.location,
  images: l.images || [],
  vaccinated: l.vaccinated,
  dewormed: l.dewormed,
  neutered: l.neutered,
  about: l.about,
  traits: l.traits || [],
  createdAt: l.createdAt,
});

const toVendorApplication = (a) => ({
  id: String(a._id),
  _id: String(a._id),
  applicationNo: a.applicationNo,
  status: a.status,
  // What this shelter is allowed to do next, so the portal never offers a
  // button the server will refuse.
  nextStep: nextListerStep(a.status),
  canDecline: !['completed', 'rejected', 'cancelled'].includes(a.status),
  applicant: a.userId?.name || 'Adopter',
  applicantPhone: a.userId?.phone || '',
  pet: a.listingId?.name || '',
  petBreed: a.listingId?.breed || '',
  listingId: String(a.listingId?._id || a.listingId || ''),
  form: a.form || {},
  homeCheck: a.homeCheck || null,
  meet: a.meet || null,
  feePaise: a.feePaise,
  fee: Math.round((a.feePaise || 0) / 100),
  decisionReason: a.decision?.reason || '',
  submittedAt: a.createdAt,
  timeline: a.timeline || [],
});

/** The next pipeline step this shelter drives, or null if it is the adopter's turn. */
function nextListerStep(status) {
  const idx = APPLICATION_STEPS.indexOf(status);
  const next = APPLICATION_STEPS[idx + 1];
  return LISTER_STEPS.includes(next) ? next : null;
}

/* ── Listings ─────────────────────────────────────────────── */

export async function listVendorListings(vendorId) {
  const listings = await AdoptionListing.find({ vendorId }).sort({ createdAt: -1 }).limit(200);
  return listings.map(toVendorListing);
}

export async function createListing(vendorId, vendorName, body) {
  const listing = await AdoptionListing.create({
    legacyId: `ADOPT-V-${Date.now()}`,
    vendorId,
    sourceType: 'vendor',
    name: body.name,
    type: body.type || 'Dog',
    breed: body.breed,
    age: body.age || 'Young',
    gender: body.gender || 'Male',
    price: Number(body.price) || 0,
    weight: body.weight || 'Medium',
    location: body.location || '',
    distance: body.location || 'Near You',
    vaccinated: Boolean(body.vaccinated),
    dewormed: Boolean(body.dewormed),
    neutered: Boolean(body.neutered),
    images: body.images?.length ? body.images : [],
    about: body.about || '',
    traits: body.traits || [],
    contactPhone: body.contactPhone || '',
    contactEmail: body.contactEmail || '',
    status: 'Available',
    shelter: {
      name: vendorName,
      // Earned, not assumed: only an approved adoption partner's listings carry
      // the badge, and `listVendorListings` is already behind the approval gate.
      verified: true,
      image: body.logo || '',
    },
  });
  await dropPublicCache();
  return toVendorListing(listing);
}

async function ownedListing(vendorId, id) {
  const listing = await AdoptionListing.findOne({ _id: id, vendorId });
  if (!listing) throw ApiError.notFound('Listing not found');
  return listing;
}

export async function updateListing(vendorId, id, body) {
  const listing = await ownedListing(vendorId, id);

  // A pet that is reserved or already gone must not be quietly re-listed or
  // re-priced out from under the adopter who is mid-application.
  if (body.status && body.status !== listing.status) {
    if (['Pending', 'Adopted'].includes(listing.status) && body.status === 'Available') {
      throw ApiError.badRequest(
        `${listing.name} is ${listing.status.toLowerCase()} — decline the open application before re-listing`
      );
    }
    listing.status = body.status;
  }

  for (const field of [
    'name', 'type', 'breed', 'age', 'gender', 'weight', 'location',
    'about', 'contactPhone', 'contactEmail',
  ]) {
    if (body[field] != null) listing[field] = body[field];
  }
  for (const flag of ['vaccinated', 'dewormed', 'neutered']) {
    if (body[flag] != null) listing[flag] = Boolean(body[flag]);
  }
  if (body.price != null) {
    if (listing.status === 'Pending') {
      throw ApiError.badRequest('This pet is reserved — its fee cannot change mid-application');
    }
    listing.price = Number(body.price) || 0;
  }
  if (Array.isArray(body.images)) listing.images = body.images;
  if (Array.isArray(body.traits)) listing.traits = body.traits;

  await listing.save();
  await dropPublicCache();
  return toVendorListing(listing);
}

export async function removeListing(vendorId, id) {
  const listing = await ownedListing(vendorId, id);
  const open = await AdoptionApplication.countDocuments({
    listingId: listing._id,
    status: { $nin: ['completed', 'rejected', 'cancelled'] },
  });
  if (open > 0) {
    throw ApiError.badRequest(
      `${open} application${open === 1 ? ' is' : 's are'} still open for ${listing.name} — decline them first`
    );
  }
  listing.status = 'Withdrawn';
  await listing.save();
  await dropPublicCache();
  return { id: String(listing._id), status: listing.status };
}

/* ── Applications ─────────────────────────────────────────── */

export async function listVendorApplications(vendorId, { status } = {}) {
  const listingIds = await AdoptionListing.find({ vendorId }).distinct('_id');
  const filter = { listingId: { $in: listingIds } };
  if (status) filter.status = status;

  const apps = await AdoptionApplication.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name phone')
    .populate('listingId', 'name breed');
  return apps.map(toVendorApplication);
}

async function ownedApplication(vendorId, id) {
  const listingIds = await AdoptionListing.find({ vendorId }).distinct('_id');
  const app = await AdoptionApplication.findOne({ _id: id, listingId: { $in: listingIds } })
    .populate('userId', 'name phone')
    .populate('listingId', 'name breed');
  if (!app) throw ApiError.notFound('Application not found');
  return app;
}

/** Move an application along one of the shelter's own steps. */
export async function reviewApplication(vendorId, id, { step, scheduledAt, notes }) {
  if (!LISTER_STEPS.includes(step)) {
    throw ApiError.badRequest(`${step} is the adopter's step, not the shelter's`);
  }
  const app = await ownedApplication(vendorId, id);
  await advanceApplication(app, step, { scheduledAt, notes, actorId: vendorId });

  const COPY = {
    home_check_scheduled: ['Home check scheduled', 'The shelter has scheduled a home check for your application.'],
    approved: ['Application approved!', 'Good news — your adoption application has been approved.'],
    meet_scheduled: ['Meet & greet scheduled', 'Your meet and greet has been scheduled.'],
  };
  const [title, body] = COPY[step] || ['Application updated', 'Your adoption application was updated.'];
  await notify(app.userId?._id || app.userId, {
    title,
    body,
    type: 'system',
    link: '/app/adopt/my-adoptions',
    data: { applicationId: String(app._id) },
  }).catch(() => {});

  return toVendorApplication(app);
}

/** Decline an application, freeing the animal if it was holding the reservation. */
export async function declineApplication(vendorId, id, reason) {
  const app = await ownedApplication(vendorId, id);
  await rejectApplication(app, reason, vendorId);
  await notify(app.userId?._id || app.userId, {
    title: 'Adoption application declined',
    body: reason
      ? `Your application was not taken forward: ${reason}`
      : 'Your adoption application was not taken forward this time.',
    type: 'system',
    link: '/app/adopt/my-adoptions',
    data: { applicationId: String(app._id) },
  }).catch(() => {});
  await dropPublicCache();
  return toVendorApplication(app);
}

/* ── Dashboard ────────────────────────────────────────────── */

export async function adoptionSummary(vendorId) {
  const listingIds = await AdoptionListing.find({ vendorId }).distinct('_id');
  const inPipeline = { $nin: ['completed', 'rejected', 'cancelled'] };

  const [available, reserved, adopted, openApps, awaitingReview, completed] = await Promise.all([
    AdoptionListing.countDocuments({ vendorId, status: 'Available' }),
    AdoptionListing.countDocuments({ vendorId, status: 'Pending' }),
    AdoptionListing.countDocuments({ vendorId, status: 'Adopted' }),
    AdoptionApplication.countDocuments({ listingId: { $in: listingIds }, status: inPipeline }),
    // Applications sitting on the shelter's desk, waiting for a decision.
    AdoptionApplication.countDocuments({
      listingId: { $in: listingIds },
      status: { $in: ['submitted', 'home_check_scheduled', 'approved'] },
    }),
    AdoptionApplication.find({ listingId: { $in: listingIds }, status: 'completed' }).select('feePaise'),
  ]);

  return {
    availableListings: available,
    reservedListings: reserved,
    adoptedListings: adopted,
    totalListings: available + reserved + adopted,
    openApplications: openApps,
    awaitingYourReview: awaitingReview,
    completedAdoptions: completed.length,
    // paise, matching every other money figure in the API
    feesCollected: completed.reduce((sum, a) => sum + (a.feePaise || 0), 0),
  };
}
