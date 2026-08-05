import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { notify } from '../../services/notify.js';
import { Doctor, VERIFICATION_STATUSES } from '../provider/doctor.model.js';
import { Availability } from '../provider/availability.model.js';

/**
 * Admin credential review for veterinary doctors.
 *
 * A vet is only listed in the user app once `credentials.verification.status`
 * is `approved` (enforced in provider.routes.js), so this is the gate between a
 * self-declared registration number and a bookable professional.
 *
 * Reviewers see the verification documents — degree, licence, clinic
 * authorization, ID proof — which are stripped from every public response by
 * `PUBLIC_DOCTOR_PROJECTION`.
 */

/** What can be missing before a vet is fit to approve. */
function completeness(doctor) {
  const missing = [];
  if (!doctor.identity?.fullName) missing.push('full name');
  if (!doctor.credentials?.registrationNumber) missing.push('registration number');
  if (!doctor.credentials?.council) missing.push('issuing council');

  const docs = doctor.credentials?.documents || [];
  const kinds = new Set(docs.map((d) => d.kind));
  if (!kinds.has('degree')) missing.push('degree certificate');
  if (!kinds.has('license')) missing.push('licence document');
  if (!kinds.has('id_proof')) missing.push('ID proof');

  if (!doctor.clinicInfo?.clinicName) missing.push('clinic name');
  if (!doctor.clinicInfo?.address?.city) missing.push('clinic city');

  const enabled = Object.entries(doctor.modes || {}).filter(([, m]) => m?.enabled);
  if (!enabled.length) missing.push('at least one consultation mode');
  if (enabled.some(([, m]) => !(m.fee > 0))) missing.push('a fee for every enabled mode');

  return missing;
}

function serializeApplication(doctor, availability) {
  const workingDays = (availability?.weekly || []).filter((d) => d.enabled).length;
  return {
    id: String(doctor._id),
    name: doctor.name,
    identity: doctor.identity,
    credentials: doctor.credentials,      // includes documents — admin only
    practice: doctor.practice,
    experience: doctor.experience,
    clinicInfo: doctor.clinicInfo,
    modes: doctor.modes,
    about: doctor.about,
    video: doctor.video,
    policies: doctor.policies,
    clinicVendorId: doctor.clinicVendorId ? String(doctor.clinicVendorId) : null,
    userId: doctor.userId ? String(doctor.userId) : null,
    active: doctor.active,
    submittedAt: doctor.createdAt,
    workingDays,
    hasSchedule: workingDays > 0,
    missing: completeness(doctor),
    listedPublicly: doctor.active && doctor.credentials?.verification?.status === 'approved',
  };
}

/** Vets awaiting review, newest first. Filter with `?status=`. */
export async function listVetApplications({ status = 'pending' } = {}) {
  const filter = {};
  if (status && status !== 'all') {
    if (!VERIFICATION_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter['credentials.verification.status'] = status;
  }
  const doctors = await Doctor.find(filter).sort({ createdAt: -1 }).limit(200);
  const availabilities = await Availability.find({ doctorId: { $in: doctors.map((d) => d._id) } });
  const byDoctor = new Map(availabilities.map((a) => [String(a.doctorId), a]));
  return doctors.map((d) => serializeApplication(d, byDoctor.get(String(d._id))));
}

export async function getVetApplication(doctorId) {
  if (!mongoose.isValidObjectId(doctorId)) throw ApiError.badRequest('Invalid doctor id');
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Vet not found');
  const availability = await Availability.findOne({ doctorId: doctor._id });
  return serializeApplication(doctor, availability);
}

/**
 * Approve a vet — this is what puts them in front of pet parents.
 *
 * Refuses while mandatory credentials are missing unless `force` is set, so an
 * incomplete profile cannot be waved through by accident.
 */
export async function approveVet(admin, doctorId, { force = false } = {}) {
  if (!mongoose.isValidObjectId(doctorId)) throw ApiError.badRequest('Invalid doctor id');
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Vet not found');

  const missing = completeness(doctor);
  if (missing.length && !force) {
    throw ApiError.badRequest(`Cannot approve — still missing: ${missing.join(', ')}`);
  }

  doctor.credentials.verification = {
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: admin.id,
    rejectionReason: '',
  };
  // Mark the submitted documents as checked.
  for (const d of doctor.credentials.documents || []) d.verified = true;
  doctor.markModified('credentials');
  await doctor.save();
  await invalidate('doctors:resp:*');

  if (doctor.userId) {
    notify(doctor.userId, {
      title: 'You are verified',
      body: 'Your veterinary profile has been approved and is now live for bookings.',
      type: 'vet',
    }).catch(() => {});
  }
  return serializeApplication(doctor, await Availability.findOne({ doctorId: doctor._id }));
}

/** Reject with a reason, or ask for a resubmission. */
export async function rejectVet(admin, doctorId, { reason, allowResubmit = true }) {
  if (!mongoose.isValidObjectId(doctorId)) throw ApiError.badRequest('Invalid doctor id');
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required so the vet can correct it');

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Vet not found');

  doctor.credentials.verification = {
    status: allowResubmit ? 'resubmit' : 'rejected',
    reviewedAt: new Date(),
    reviewedBy: admin.id,
    rejectionReason: reason.trim(),
  };
  doctor.markModified('credentials');
  await doctor.save();
  await invalidate('doctors:resp:*');   // pull them from the listing immediately

  if (doctor.userId) {
    notify(doctor.userId, {
      title: allowResubmit ? 'More information needed' : 'Application rejected',
      body: reason.trim(),
      type: 'vet',
    }).catch(() => {});
  }
  return serializeApplication(doctor, await Availability.findOne({ doctorId: doctor._id }));
}

/** Suspend or restore a live vet without touching their verification history. */
export async function setVetActive(admin, doctorId, active) {
  if (!mongoose.isValidObjectId(doctorId)) throw ApiError.badRequest('Invalid doctor id');
  const doctor = await Doctor.findByIdAndUpdate(
    doctorId,
    { $set: { active: Boolean(active) } },
    { new: true }
  );
  if (!doctor) throw ApiError.notFound('Vet not found');
  await invalidate('doctors:resp:*');
  return serializeApplication(doctor, await Availability.findOne({ doctorId: doctor._id }));
}
