import crypto from 'crypto';
import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { notify } from '../../services/notify.js';
import { getIO, emitToUser } from '../../sockets/index.js';
import { Booking } from '../booking/booking.model.js';
import { Doctor } from '../provider/doctor.model.js';
import {
  PatientRecord,
  MedicalRecord,
  Prescription,
  LabReport,
  FollowUp,
  VaccineReminder,
  EmergencyRequest,
  VideoRoom,
} from './clinic.models.js';

/* ── Helpers ──────────────────────────────────────────────────────── */

const TYPE_LABEL = { clinic: 'Clinic Visit', video: 'Video Consultation', home: 'Home Visit', emergency: 'Emergency' };

function displayDate(ymd) {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(date) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Doctors the caller may see.
 *
 * Accepts either a bare `clinicVendorId` (legacy callers and the check scripts)
 * or a `req.vetScope` object. A staff vet's scope carries only their own id, so
 * passing the scope through is what keeps one vet out of another's appointments.
 */
async function clinicDoctorIds(scopeOrId) {
  if (isScope(scopeOrId)) return scopeOrId.doctorIds;
  const docs = await Doctor.find({ clinicVendorId: scopeOrId }).select('_id');
  return docs.map((d) => d._id);
}

/**
 * Is this a `req.vetScope` rather than a bare tenant id?
 *
 * Must test for the scope's own shape, not `typeof === 'object'` — a Mongoose
 * ObjectId is also an object, and treating one as a scope silently yields
 * `undefined` for the tenant key.
 */
const isScope = (v) => Boolean(v) && typeof v === 'object' && Array.isArray(v.doctorIds);

/** Tenant key for clinic-wide collections, from either a scope or a bare id. */
const tenantOf = (scopeOrId) => (isScope(scopeOrId) ? scopeOrId.clinicVendorId : scopeOrId);

/** The primary Doctor row that represents this clinic (for stamping records). */
async function primaryDoctor(scope) {
  // A staff vet stamps records with their own identity; the clinic owner falls
  // back to the clinic's first doctor.
  if (isScope(scope) && scope.doctorId) {
    return Doctor.findById(scope.doctorId).select('_id name');
  }
  return Doctor.findOne({ clinicVendorId: tenantOf(scope) }).select('_id name');
}

function serializeAppointment(b) {
  const ct = b.meta?.consultType || b.visitType || 'clinic';
  const owner = b.meta?.ownerName || b.userId?.name || '';
  return {
    id: String(b._id),
    date: displayDate(b.schedule?.startDate),
    time: b.schedule?.time || '',
    petName: b.petSnapshot?.name || '',
    species: b.petSnapshot?.species || '',
    breed: b.petSnapshot?.breed || '',
    owner,
    phone: b.meta?.ownerPhone || b.userId?.phone || '',
    type: TYPE_LABEL[ct] || 'Clinic Visit',
    issue: b.meta?.issue || b.meta?.symptoms || '',
    status: b.meta?.clinicStatus || 'Pending',
    fee: Math.round((b.amounts?.total || 0) / 100),
    notes: b.meta?.notes || '',
  };
}

async function getOwnedBooking(clinicVendorId, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid appointment id');
  const doctorIds = await clinicDoctorIds(clinicVendorId);
  const b = await Booking.findOne({ _id: id, type: 'doctor', doctorId: { $in: doctorIds } }).populate(
    'userId',
    'name phone'
  );
  if (!b) throw ApiError.notFound('Appointment not found');
  return b;
}

/* ── Appointments ─────────────────────────────────────────────────── */

export async function listAppointments(scope) {
  const doctorIds = await clinicDoctorIds(scope);
  const bookings = await Booking.find({ type: 'doctor', doctorId: { $in: doctorIds } })
    .populate('userId', 'name phone')
    .sort({ 'schedule.startDate': 1, createdAt: -1 });
  return bookings.map(serializeAppointment);
}

export async function updateAppointmentStatus(scope, id, status) {
  const clinicVendorId = tenantOf(scope);
  const b = await getOwnedBooking(scope, id);
  b.meta = { ...(b.meta || {}), clinicStatus: status };
  if (status === 'Confirmed' && b.status === 'pending_payment') b.status = 'confirmed';
  b.markModified('meta');
  await b.save();

  if (b.userId?._id && status === 'Confirmed') {
    await notify(b.userId._id, {
      title: 'Appointment confirmed',
      body: `Your ${TYPE_LABEL[b.meta?.consultType || b.visitType] || 'clinic'} appointment for ${b.petSnapshot?.name || 'your pet'} is confirmed.`,
      type: 'booking',
      link: '/appointments',
    }).catch(() => {});
  }
  return serializeAppointment(b);
}

export async function addConsultationNotes(scope, id, notes) {
  const clinicVendorId = tenantOf(scope);
  const b = await getOwnedBooking(scope, id);
  b.meta = { ...(b.meta || {}), clinicStatus: 'Completed', notes };
  b.status = 'completed';
  b.markModified('meta');
  await b.save();

  const doc = await primaryDoctor(scope);
  const ct = b.meta?.consultType || b.visitType || 'clinic';
  const encounterType = ct === 'video' ? 'Video Consult' : ct === 'emergency' ? 'Emergency' : 'Clinical Visit';
  const firstLine = (notes || '').split('\n')[0].slice(0, 120);

  await MedicalRecord.create({
    clinicVendorId,
    doctorId: doc?._id || null,
    appointmentId: b._id,
    recordNo: `REC-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    petName: b.petSnapshot?.name || '',
    owner: b.userId?.name || b.meta?.ownerName || '',
    phone: b.userId?.phone || b.meta?.ownerPhone || '',
    type: encounterType,
    diagnosis: firstLine || 'Consultation completed',
    treatment: notes || '',
    doctorName: doc?.name || '',
    fileAvailable: false,
  });

  if (b.userId?._id) {
    await notify(b.userId._id, {
      title: 'Consultation completed',
      body: `${doc?.name || 'The doctor'} added notes for ${b.petSnapshot?.name || 'your pet'}.`,
      type: 'vet',
      link: '/appointments',
    }).catch(() => {});
  }
  return serializeAppointment(b);
}

/* ── Patients ─────────────────────────────────────────────────────── */

function serializePatient(p) {
  return {
    id: String(p._id),
    name: p.name,
    species: p.species,
    breed: p.breed,
    owner: p.owner,
    phone: p.phone,
    age: p.age,
    gender: p.gender,
    weight: p.weight,
    lastVisit: p.lastVisit,
    status: p.status,
    vaccinations: p.vaccinations,
    visits: p.visits,
    allergies: p.allergies || [],
  };
}

export async function listPatients(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await PatientRecord.find({ clinicVendorId }).sort({ createdAt: 1 });
  return rows.map(serializePatient);
}

/* ── Medical records ──────────────────────────────────────────────── */

function serializeRecord(r) {
  return {
    id: r.recordNo || String(r._id),
    date: r.date,
    petName: r.petName,
    owner: r.owner,
    phone: r.phone,
    type: r.type,
    diagnosis: r.diagnosis,
    treatment: r.treatment,
    doctor: r.doctorName,
    fileAvailable: r.fileAvailable,
    weight: r.weight,
    temp: r.temp,
  };
}

export async function listMedicalRecords(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await MedicalRecord.find({ clinicVendorId }).sort({ createdAt: -1 });
  return rows.map(serializeRecord);
}

export async function createMedicalRecord(scope, body) {
  const clinicVendorId = tenantOf(scope);
  const doc = await primaryDoctor(scope);
  const rec = await MedicalRecord.create({
    clinicVendorId,
    doctorId: doc?._id || null,
    recordNo: `REC-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    petName: body.petName,
    owner: body.owner || '',
    phone: body.phone || '',
    type: body.type || 'Clinical Visit',
    diagnosis: body.diagnosis || '',
    treatment: body.treatment || '',
    weight: body.weight || '',
    temp: body.temp || '',
    doctorName: doc?.name || '',
    fileAvailable: false,
  });
  return serializeRecord(rec);
}

/* ── Prescriptions ────────────────────────────────────────────────── */

function serializePrescription(p) {
  return {
    id: String(p._id),
    date: p.date,
    petName: p.petName,
    owner: p.owner,
    diagnosis: p.diagnosis,
    items: p.items,
    notes: p.notes,
    followUpDate: p.followUpDate,
    status: p.status,
  };
}

export async function listPrescriptions(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await Prescription.find({ clinicVendorId }).sort({ createdAt: -1 });
  return rows.map(serializePrescription);
}

export async function createPrescription(scope, body) {
  const clinicVendorId = tenantOf(scope);
  const doc = await primaryDoctor(scope);
  let patient = null;
  if (body.patientId && mongoose.isValidObjectId(body.patientId)) {
    patient = await PatientRecord.findOne({ _id: body.patientId, clinicVendorId });
  }
  const items = (body.medicines || []).filter((m) => m && m.name).map((m) => ({
    name: m.name,
    dosage: m.dosage || '',
    frequency: m.frequency || '',
    duration: m.duration || '',
  }));
  const rx = await Prescription.create({
    clinicVendorId,
    doctorId: doc?._id || null,
    patientRecordId: patient?._id || null,
    ownerUserId: patient?.ownerUserId || null,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    petName: patient?.name || body.petName || '',
    owner: patient?.owner || body.owner || '',
    diagnosis: body.diagnosis || '',
    items,
    notes: body.notes || '',
    followUpDate: body.followUpDate || '',
    status: 'active',
  });

  if (patient?.ownerUserId) {
    await notify(patient.ownerUserId, {
      title: 'New prescription',
      body: `${doc?.name || 'Your vet'} issued a prescription for ${patient.name}.`,
      type: 'vet',
      link: '/appointments',
    }).catch(() => {});
  }
  return serializePrescription(rx);
}

/* ── Lab reports ──────────────────────────────────────────────────── */

function serializeLab(r) {
  return {
    id: r.reportNo || String(r._id),
    date: r.date,
    patient: r.patient,
    owner: r.owner,
    testType: r.testType,
    status: r.status,
    doctor: r.doctorName,
  };
}

export async function listLabReports(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await LabReport.find({ clinicVendorId }).sort({ createdAt: -1 });
  return rows.map(serializeLab);
}

export async function createLabReport(scope, body) {
  const clinicVendorId = tenantOf(scope);
  const doc = await primaryDoctor(scope);
  const rec = await LabReport.create({
    clinicVendorId,
    doctorId: doc?._id || null,
    reportNo: `LAB-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    patient: body.patient || '',
    owner: body.owner || '',
    testType: body.testType || '',
    status: body.status || 'Processing',
    doctorName: doc?.name || '',
    resultUrl: body.resultUrl || '',
  });
  return serializeLab(rec);
}

/* ── Follow-ups ───────────────────────────────────────────────────── */

function serializeFollowUp(f) {
  return {
    id: f.fuNo || String(f._id),
    _id: String(f._id),
    petName: f.petName,
    owner: f.owner,
    phone: f.phone,
    reason: f.reason,
    dueDate: f.dueDate,
    status: f.status,
    priority: f.priority,
    notes: f.notes,
  };
}

export async function listFollowUps(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await FollowUp.find({ clinicVendorId }).sort({ createdAt: -1 });
  return rows.map(serializeFollowUp);
}

export async function createFollowUp(scope, body) {
  const clinicVendorId = tenantOf(scope);
  const f = await FollowUp.create({
    clinicVendorId,
    fuNo: `FU-${Date.now().toString().slice(-6)}`,
    petName: body.petName,
    owner: body.owner || '',
    phone: body.phone || '',
    reason: body.reason || '',
    dueDate: body.dueDate || '',
    priority: body.priority || 'Medium',
    status: 'Scheduled',
    notes: '',
  });
  return serializeFollowUp(f);
}

export async function updateFollowUp(scope, id, patch) {
  const clinicVendorId = tenantOf(scope);
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid follow-up id');
  const set = {};
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
  if (patch.notes !== undefined) set.notes = patch.notes;
  const f = await FollowUp.findOneAndUpdate({ _id: id, clinicVendorId }, { $set: set }, { new: true });
  if (!f) throw ApiError.notFound('Follow-up not found');
  return serializeFollowUp(f);
}

/* ── Vaccinations ─────────────────────────────────────────────────── */

export async function listVaccinations(scope) {
  const clinicVendorId = tenantOf(scope);
  const rows = await VaccineReminder.find({ clinicVendorId }).sort({ createdAt: 1 });
  const shape = (r) => ({
    id: String(r._id),
    petName: r.petName,
    owner: r.owner,
    vaccine: r.vaccine,
    date: r.date,
    status: r.status,
  });
  return {
    upcoming: rows.filter((r) => r.status === 'Due Soon' || r.status === 'Scheduled').map(shape),
    missed: rows.filter((r) => r.status === 'Overdue').map(shape),
    completed: rows.filter((r) => r.status === 'Completed').map(shape),
  };
}

/* ── Emergency requests ───────────────────────────────────────────── */

function serializeEmergency(e) {
  return {
    id: e.emNo || String(e._id),
    _id: String(e._id),
    petName: e.petName,
    species: e.species,
    breed: e.breed,
    ownerName: e.ownerName,
    phone: e.phone,
    location: e.location,
    timeElapsed: timeAgo(e.createdAt),
    severity: e.severity,
    issue: e.issue,
    status: e.status === 'open' ? 'Pending' : e.status,
  };
}

export async function listEmergencies() {
  const rows = await EmergencyRequest.find({ status: 'open' }).sort({ createdAt: -1 });
  return rows.map(serializeEmergency);
}

export async function acceptEmergency(scope, id) {
  const clinicVendorId = tenantOf(scope);
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid request id');
  // First clinic to accept wins.
  const res = await EmergencyRequest.updateOne(
    { _id: id, status: 'open' },
    { $set: { status: 'accepted', clinicVendorId, acceptedAt: new Date() } }
  );
  if (res.modifiedCount === 0) throw ApiError.conflict('This emergency was already handled');
  const e = await EmergencyRequest.findById(id);
  if (e?.userId) {
    await notify(e.userId, {
      title: 'A vet accepted your emergency',
      body: `Help is on the way for ${e.petName}.`,
      type: 'vet',
    }).catch(() => {});
  }
  return serializeEmergency(e);
}

export async function declineEmergency(scope, id) {
  const clinicVendorId = tenantOf(scope);
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid request id');
  const e = await EmergencyRequest.findByIdAndUpdate(id, { $set: { status: 'declined' } }, { new: true });
  if (!e) throw ApiError.notFound('Request not found');
  return serializeEmergency(e);
}

/** User-side: raise an emergency; broadcast to every connected clinic. */
export async function reportEmergency(userId, body) {
  const e = await EmergencyRequest.create({
    userId,
    petId: body.petId || null,
    emNo: `EM-${Date.now().toString().slice(-6)}`,
    petName: body.petName || '',
    species: body.species || '',
    breed: body.breed || '',
    ownerName: body.ownerName || '',
    phone: body.phone || '',
    location: body.location || '',
    severity: body.severity || 'High',
    issue: body.issue || '',
    status: 'open',
  });
  try {
    getIO()?.to('clinics').emit('emergency:new', serializeEmergency(e));
  } catch {
    /* best-effort */
  }
  return serializeEmergency(e);
}

/* ── Video consultation rooms ─────────────────────────────────────── */

/**
 * Superseded by the LiveKit consult service.
 *
 * This used to mint a `crypto.randomBytes` "token" that no media server ever
 * validated — it could not join a call. Real rooms and signed LiveKit JWTs now
 * come from `POST /api/consults/:bookingId/start`, which also enforces that the
 * caller is the assigned vet and that the slot is inside its join window.
 *
 * Kept as a redirect so any client still calling the old endpoint fails loudly
 * instead of silently receiving a token that cannot connect.
 */
export async function createVideoRoom(scope, appointmentId) {
  const b = await getOwnedBooking(scope, appointmentId);
  throw ApiError.badRequest(
    `Video consultations now start via POST /api/consults/${b._id}/start`
  );
}
