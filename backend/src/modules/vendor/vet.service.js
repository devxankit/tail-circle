import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { Doctor, CONSULT_MODES } from '../provider/doctor.model.js';
import { Availability } from '../provider/availability.model.js';
import { User } from '../user/user.model.js';
import { VendorProfile } from './vendor.models.js';
import { normalizePhone } from '../../utils/phone.js';
import {
  getOrCreateAvailability,
  getDoctorSlots,
  nowInZone,
} from '../provider/availability.service.js';

/**
 * Vet self-management — the write side of the vet dashboard: profile, per-mode
 * fees and consult durations, video/overage settings, policies, and the working
 * schedule that drives slot generation.
 *
 * Scoping today is by `clinicVendorId` (the clinic tenant). Phase 2 layers
 * per-vet logins on top by narrowing `ownedDoctorFilter()` to a single doctor
 * when the caller is staff rather than the clinic owner — every function here
 * goes through that one helper so the change lands in a single place.
 *
 * Fields a vet must never set themselves (verification status, ratings, review
 * counts, ownership ids) are simply absent from the whitelists below.
 */

/* ── Scoping ──────────────────────────────────────────────────────── */

/**
 * Normalize a caller into `{ clinicVendorId, doctorIds, doctorId }`.
 *
 * Accepts a `req.vetScope` (see middleware/vetScope.js) or, for the check
 * scripts and older callers, a bare clinic vendor id. Scoping by `doctorIds`
 * rather than by tenant is what stops a staff vet editing a colleague's fees,
 * schedule or documents.
 */
async function normalizeScope(scopeOrId) {
  if (scopeOrId && typeof scopeOrId === 'object' && Array.isArray(scopeOrId.doctorIds)) {
    return scopeOrId;
  }
  const doctors = await Doctor.find({ clinicVendorId: scopeOrId }).select('_id').sort({ createdAt: 1 });
  return {
    clinicVendorId: scopeOrId,
    doctorIds: doctors.map((d) => String(d._id)),
    doctorId: doctors.length === 1 ? String(doctors[0]._id) : null,
    isOwner: true,
  };
}

/** Mongo filter for the doctors this caller may administer. */
function ownedDoctorFilter(scope, doctorId = null) {
  if (doctorId) {
    if (!mongoose.isValidObjectId(doctorId)) throw ApiError.badRequest('Invalid doctor id');
    if (!scope.doctorIds.includes(String(doctorId))) {
      // Distinguish the two refusals honestly: a staff vet is being told they
      // are out of scope, not that their colleague is a stranger to the clinic.
      throw ApiError.forbidden(
        scope.isOwner
          ? 'That vet is not part of your clinic'
          : 'You can only manage your own vet profile'
      );
    }
    return { _id: doctorId };
  }
  return { _id: { $in: scope.doctorIds } };
}

/**
 * Resolve which doctor to act on. With no id, a caller who manages exactly one
 * vet (solo practitioner, or a staff vet) acts as themselves; a clinic owner
 * with several vets must say which one.
 */
async function resolveDoctor(scopeOrId, doctorId) {
  const scope = await normalizeScope(scopeOrId);
  if (!scope.doctorIds.length) {
    throw ApiError.badRequest('No vet profile is linked to this clinic account yet');
  }

  const targetId = doctorId || scope.doctorId || (scope.doctorIds.length === 1 ? scope.doctorIds[0] : null);
  if (!targetId) {
    throw ApiError.badRequest('doctorId is required for a clinic with multiple vets');
  }

  const doctor = await Doctor.findOne(ownedDoctorFilter(scope, targetId));
  if (!doctor) throw ApiError.notFound('Doctor not found in this clinic');
  return doctor;
}

/**
 * Drop the public doctor response cache after any profile change.
 *
 * `/doctors` and `/doctors/:id` are wrapped in `cacheResponse('doctors', 120)`.
 * Without this, a vet who switches video off — or changes a fee — keeps being
 * advertised on the old terms for up to two minutes. The booking gate always
 * re-reads from the database so nothing is ever mispriced, but the listing must
 * not disagree with it.
 */
async function refreshPublicDoctorCache() {
  await invalidate('doctors:resp:*');
}

/* ── Serialization ────────────────────────────────────────────────── */

function serializeVet(d) {
  return {
    id: String(d._id),
    name: d.name,
    identity: d.identity,
    credentials: {
      registrationNumber: d.credentials?.registrationNumber || '',
      council: d.credentials?.council || '',
      registrationYear: d.credentials?.registrationYear ?? null,
      documents: d.credentials?.documents || [],
      // Read-only to the vet — set by admin review.
      verification: {
        status: d.credentials?.verification?.status || 'pending',
        reviewedAt: d.credentials?.verification?.reviewedAt || null,
        rejectionReason: d.credentials?.verification?.rejectionReason || '',
      },
    },
    practice: d.practice,
    experience: d.experience,
    clinicInfo: d.clinicInfo,
    modes: d.modes,
    about: d.about,
    video: d.video,
    policies: d.policies,
    rating: d.rating,
    reviews: d.reviews,
    active: d.active,
  };
}

function serializeAvailability(a) {
  return {
    doctorId: String(a.doctorId),
    weekly: (a.weekly || []).map((d) => ({
      day: d.day,
      enabled: d.enabled,
      blocks: (d.blocks || []).map((b) => ({
        start: b.start,
        end: b.end,
        modes: b.modes || [],
        capacity: b.capacity ?? 1,
      })),
    })),
    slotMinutes: a.slotMinutes,
    bufferMinutes: a.bufferMinutes,
    emergency: {
      enabled: a.emergency?.enabled ?? false,
      alwaysOn: a.emergency?.alwaysOn ?? false,
      blocks: a.emergency?.blocks || [],
    },
    blackouts: a.blackouts || [],
    leadTimeMinutes: a.leadTimeMinutes,
    horizonDays: a.horizonDays,
    timezone: a.timezone,
    active: a.active,
  };
}

/* ── Vets in the clinic ───────────────────────────────────────────── */

/** Vets this caller may administer — the whole clinic, or just themselves. */
export async function listVets(scopeOrId) {
  const scope = await normalizeScope(scopeOrId);
  const doctors = await Doctor.find(ownedDoctorFilter(scope)).sort({ createdAt: 1 });
  return doctors.map(serializeVet);
}

export async function getVetProfile(clinicVendorId, doctorId) {
  return serializeVet(await resolveDoctor(clinicVendorId, doctorId));
}

/**
 * Add a second (or third...) vet to an existing clinic. Only the clinic owner
 * may do this — a staff vet has no one below them to add.
 *
 * The new vet gets their own `User` + `VendorProfile` (auto-approved, since an
 * already-approved clinic owner is vouching for them — `withVendor` requires
 * every login to own a VendorProfile) and a `Doctor` record tied back to the
 * owner via `clinicVendorId`. Credentials stay `pending` until an admin
 * reviews them, same as any solo signup, so the new vet is not publicly
 * listed until then.
 */
export async function addVetToClinic(scope, payload) {
  if (!scope.isOwner) throw ApiError.forbidden('Only the clinic owner can add a vet');

  const email = payload.email?.toLowerCase().trim();
  if (!email) throw ApiError.badRequest('Email is required');
  if (await User.findOne({ email })) throw ApiError.conflict('An account with this email already exists');
  if (!payload.password || payload.password.length < 6) {
    throw ApiError.badRequest('A password of at least 6 characters is required');
  }

  const owner = await VendorProfile.findOne({ userId: scope.clinicVendorId });
  if (!owner) throw ApiError.notFound('Clinic profile not found');

  const phone = normalizePhone(payload.phone || owner.phone);
  const fullName = (payload.fullName || '').trim();
  if (!fullName) throw ApiError.badRequest('Vet name is required');
  const title = payload.title || 'Dr.';
  const fee = Number(payload.consultFee) || 0;

  const user = await User.create({
    name: fullName,
    email,
    phone,
    role: 'vendor',
    vendorType: 'clinic',
    isPhoneVerified: false,
    passwordHash: await bcrypt.hash(payload.password, 10),
  });

  await VendorProfile.create({
    userId: user._id,
    businessName: owner.businessName,
    vendorType: 'clinic',
    email,
    phone,
    city: owner.city,
    address: owner.address,
    // Vouched for by an already-approved clinic owner — no separate KYC queue.
    // Payouts still settle to the clinic tenant (clinicVendorId), not here.
    approvalStatus: 'approved',
  });

  const doctor = await Doctor.create({
    userId: user._id,
    clinicVendorId: scope.clinicVendorId,
    name: `${title} ${fullName}`.trim(),
    price: fee,
    identity: { title, fullName },
    credentials: {
      registrationNumber: payload.registrationNumber || '',
      council: payload.council || '',
      verification: { status: 'pending' },
    },
    clinicInfo: { clinicName: owner.businessName, address: { city: owner.city } },
    modes: { inClinic: { enabled: true, fee, durationMinutes: 15 }, video: { enabled: false, fee: 0, durationMinutes: 15 } },
    active: true,
  });

  await refreshPublicDoctorCache();
  return serializeVet(doctor);
}

/* ── Profile updates ──────────────────────────────────────────────── */

/** Assign `patch[key]` onto `target[key]` for whitelisted keys only. */
function applyWhitelist(target, patch, keys) {
  let touched = false;
  for (const key of keys) {
    if (patch?.[key] === undefined) continue;
    target[key] = patch[key];
    touched = true;
  }
  return touched;
}

const IDENTITY_KEYS = ['title', 'fullName', 'profilePhoto'];
const PRACTICE_KEYS = [
  'primarySpecialties', 'secondarySpecialties', 'speciesTreated',
  'conditionsHandled', 'languages',
];
const EXPERIENCE_KEYS = ['totalYears', 'yearsInCurrentClinic'];
const ABOUT_KEYS = ['bio', 'treatmentApproach'];
const VIDEO_KEYS = ['digitalPrescription', 'overagePerMinute', 'graceMinutes', 'maxOverageMinutes'];
const POLICY_KEYS = [
  'cancellationHours', 'cancellationNote', 'rescheduleHours', 'rescheduleNote',
  'refundNote', 'noShowNote', 'followUpWindowDays',
];
const MODE_KEYS = ['enabled', 'fee', 'followUpFee', 'durationMinutes'];
const CREDENTIAL_KEYS = ['registrationNumber', 'council', 'registrationYear'];

/**
 * Patch the vet's own profile. Verification status, rating and ownership are
 * deliberately unreachable from here.
 *
 * Changing credentials after approval re-opens verification — a vet cannot
 * silently swap in a different registration number once they are live.
 */
export async function updateVetProfile(clinicVendorId, doctorId, patch = {}) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);

  applyWhitelist(doctor.identity, patch.identity, IDENTITY_KEYS);
  applyWhitelist(doctor.practice, patch.practice, PRACTICE_KEYS);
  applyWhitelist(doctor.experience, patch.experience, EXPERIENCE_KEYS);
  applyWhitelist(doctor.about, patch.about, ABOUT_KEYS);
  applyWhitelist(doctor.video, patch.video, VIDEO_KEYS);
  applyWhitelist(doctor.policies, patch.policies, POLICY_KEYS);

  if (patch.clinicInfo) {
    const ci = patch.clinicInfo;
    if (ci.clinicName !== undefined) doctor.clinicInfo.clinicName = ci.clinicName;
    if (ci.address) {
      applyWhitelist(doctor.clinicInfo.address, ci.address, [
        'line1', 'landmark', 'locality', 'city', 'state', 'pincode', 'mapsUrl',
      ]);
    }
    if (ci.facilities) {
      applyWhitelist(doctor.clinicInfo.facilities, ci.facilities, [
        'medicines', 'diagnostics', 'surgery', 'grooming',
        'vaccination', 'labSampleCollection', 'hospitalization',
      ]);
    }
    if (Array.isArray(ci.geo?.coordinates) && ci.geo.coordinates.length === 2) {
      doctor.clinicInfo.geo = { type: 'Point', coordinates: ci.geo.coordinates.map(Number) };
    }
  }

  // Per-mode fees / durations / on-off. This is where a vet turns video consults
  // on or off — the booking layer rejects any mode that is not enabled here.
  if (patch.modes) {
    for (const mode of CONSULT_MODES) {
      if (!patch.modes[mode]) continue;
      applyWhitelist(doctor.modes[mode], patch.modes[mode], MODE_KEYS);
      if (doctor.modes[mode].enabled && !(doctor.modes[mode].fee >= 0)) {
        throw ApiError.badRequest(`A consultation fee is required to offer ${mode}`);
      }
    }
  }

  if (patch.credentials) {
    const before = `${doctor.credentials.registrationNumber}|${doctor.credentials.council}`;
    applyWhitelist(doctor.credentials, patch.credentials, CREDENTIAL_KEYS);
    const after = `${doctor.credentials.registrationNumber}|${doctor.credentials.council}`;
    if (before !== after && doctor.credentials.verification.status === 'approved') {
      doctor.credentials.verification.status = 'pending';
      doctor.credentials.verification.reviewedAt = null;
      doctor.markModified('credentials');
    }
  }

  await doctor.save();
  await refreshPublicDoctorCache();
  return serializeVet(doctor);
}

/** Attach a verification document. Re-verification is required after upload. */
export async function addVetDocument(clinicVendorId, doctorId, { kind, url, label = '' }) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  doctor.credentials.documents.push({ kind, url, label, uploadedAt: new Date(), verified: false });
  if (doctor.credentials.verification.status === 'rejected') {
    doctor.credentials.verification.status = 'resubmit';
  }
  doctor.markModified('credentials');
  await doctor.save();
  await refreshPublicDoctorCache();
  return serializeVet(doctor);
}

export async function removeVetDocument(clinicVendorId, doctorId, index) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  const docs = doctor.credentials.documents || [];
  if (index < 0 || index >= docs.length) throw ApiError.badRequest('No such document');
  docs.splice(index, 1);
  doctor.markModified('credentials');
  await doctor.save();
  await refreshPublicDoctorCache();
  return serializeVet(doctor);
}

/* ── Availability ─────────────────────────────────────────────────── */

export async function getVetAvailability(clinicVendorId, doctorId) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  return serializeAvailability(await getOrCreateAvailability(doctor._id));
}

const AVAILABILITY_KEYS = [
  'slotMinutes', 'bufferMinutes', 'leadTimeMinutes', 'horizonDays', 'timezone', 'active',
];

/**
 * Replace the working schedule. `weekly` is sent whole (all 7 days) so the vet
 * dashboard can save the grid in one call without diffing.
 */
export async function updateVetAvailability(clinicVendorId, doctorId, patch = {}) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  const availability = await getOrCreateAvailability(doctor._id);

  if (Array.isArray(patch.weekly)) {
    if (patch.weekly.length !== 7) {
      throw ApiError.badRequest('weekly must contain all 7 days (0 = Sunday)');
    }
    availability.weekly = patch.weekly.map((d, i) => ({
      day: d.day ?? i,
      enabled: Boolean(d.enabled),
      blocks: (d.blocks || []).map((b) => ({
        start: b.start,
        end: b.end,
        modes: (b.modes || []).filter((m) => CONSULT_MODES.includes(m)),
        capacity: Math.max(1, Number(b.capacity) || 1),
      })),
    }));
  }

  if (patch.emergency) {
    const e = patch.emergency;
    if (e.enabled !== undefined) availability.emergency.enabled = Boolean(e.enabled);
    if (e.alwaysOn !== undefined) availability.emergency.alwaysOn = Boolean(e.alwaysOn);
    if (Array.isArray(e.blocks)) {
      availability.emergency.blocks = e.blocks.map((b) => ({
        start: b.start,
        end: b.end,
        modes: ['emergency'],
        capacity: Math.max(1, Number(b.capacity) || 1),
      }));
    }
  }

  applyWhitelist(availability, patch, AVAILABILITY_KEYS);

  await availability.save();     // pre-validate rejects malformed / inverted blocks
  return serializeAvailability(availability);
}

/** Block a date out (leave, holiday). Idempotent per date. */
export async function addVetBlackout(clinicVendorId, doctorId, { date, reason = '' }) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  const availability = await getOrCreateAvailability(doctor._id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw ApiError.badRequest('date=YYYY-MM-DD is required');
  }
  const existing = availability.blackouts.find((b) => b.date === date);
  if (existing) existing.reason = reason;
  else availability.blackouts.push({ date, reason });

  await availability.save();
  return serializeAvailability(availability);
}

export async function removeVetBlackout(clinicVendorId, doctorId, date) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  const availability = await getOrCreateAvailability(doctor._id);
  availability.blackouts = availability.blackouts.filter((b) => b.date !== date);
  await availability.save();
  return serializeAvailability(availability);
}

/**
 * Preview what patients will see for a date — the same generator the public
 * endpoint uses, so the dashboard can never disagree with the booking screen.
 */
export async function previewVetSlots(clinicVendorId, doctorId, { date, visitType = 'clinic' }) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  return getDoctorSlots({ doctorId: doctor._id, date, visitType, includeFull: true });
}

/** Working-day flags across the booking horizon — drives the dashboard calendar. */
export async function getVetCalendar(clinicVendorId, doctorId, { days = 30 } = {}) {
  const doctor = await resolveDoctor(clinicVendorId, doctorId);
  const availability = await getOrCreateAvailability(doctor._id);
  const tz = availability.timezone || 'Asia/Kolkata';
  const today = nowInZone(tz).date;
  const [y, m, d] = today.split('-').map(Number);

  const blackouts = new Map((availability.blackouts || []).map((b) => [b.date, b.reason]));
  const span = Math.min(days, availability.horizonDays ?? 30);

  return Array.from({ length: span }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const date = dt.toISOString().slice(0, 10);
    const weekday = dt.getUTCDay();
    const day = (availability.weekly || []).find((w) => w.day === weekday);
    const blackedOut = blackouts.has(date);
    return {
      date,
      weekday,
      working: Boolean(day?.enabled) && !blackedOut,
      blackedOut,
      reason: blackouts.get(date) || '',
      modes: blackedOut
        ? []
        : [...new Set((day?.blocks || []).flatMap((b) => (b.modes?.length ? b.modes : CONSULT_MODES)))],
    };
  });
}
