import mongoose from 'mongoose';

/**
 * Clinic / veterinary doctor suite (Phase 10). Every document is hard-scoped by
 * `clinicVendorId` (the vendor User._id of the clinic) so a doctor only ever
 * sees their own patients, records, prescriptions and lab work. Display fields
 * are denormalized to mirror the DoctorManagement mock 1:1 — the appointment
 * feed itself rides on the shared Booking model (type `doctor`).
 *
 * Optional string keys use `partialFilterExpression: { $type: 'string' }` for
 * their unique index so seed re-runs never collide on null (see memory).
 */

const partialString = (field) => ({
  unique: true,
  partialFilterExpression: { [field]: { $type: 'string' } },
});

/* ── Patient registry (pets a clinic has treated) ─────────────────── */
const patientRecordSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mrn: { type: String, default: '' },
    name: { type: String, required: true },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    owner: { type: String, default: '' },
    phone: { type: String, default: '' },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    weight: { type: String, default: '' },
    allergies: { type: [String], default: [] },
    lastVisit: { type: String, default: '' },
    status: { type: String, default: 'Healthy ✓' },
    vaccinations: { type: String, default: 'Up to date' },
    visits: { type: Number, default: 0 },
    seedKey: { type: String },
  },
  { timestamps: true }
);
patientRecordSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Medical encounter records ────────────────────────────────────── */
const medicalRecordSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    patientRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', default: null },
    recordNo: { type: String, default: '' },
    date: { type: String, default: '' },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    phone: { type: String, default: '' },
    type: { type: String, default: 'Clinical Visit' }, // Clinical Visit|Surgery|Video Consult|Emergency
    diagnosis: { type: String, default: '' },
    treatment: { type: String, default: '' },
    weight: { type: String, default: '' },
    temp: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    fileAvailable: { type: Boolean, default: false },
    seedKey: { type: String },
  },
  { timestamps: true }
);
medicalRecordSchema.index({ clinicVendorId: 1, createdAt: -1 });
medicalRecordSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Prescriptions ────────────────────────────────────────────────── */
const prescriptionSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    patientRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    date: { type: String, default: '' },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    items: [
      {
        _id: false,
        name: { type: String, default: '' },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        duration: { type: String, default: '' },
      },
    ],
    notes: { type: String, default: '' },
    followUpDate: { type: String, default: '' },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    seedKey: { type: String },
  },
  { timestamps: true }
);
prescriptionSchema.index({ clinicVendorId: 1, createdAt: -1 });
prescriptionSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Lab reports ──────────────────────────────────────────────────── */
const labReportSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    reportNo: { type: String, default: '' },
    date: { type: String, default: '' },
    patient: { type: String, default: '' }, // pet name
    owner: { type: String, default: '' },
    testType: { type: String, default: '' },
    status: { type: String, default: 'Processing' }, // Ready|Processing|Ordered|Sample Collected
    doctorName: { type: String, default: '' },
    resultUrl: { type: String, default: '' },
    seedKey: { type: String },
  },
  { timestamps: true }
);
labReportSchema.index({ clinicVendorId: 1, createdAt: -1 });
labReportSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Follow-ups ───────────────────────────────────────────────────── */
const followUpSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    patientRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', default: null },
    fuNo: { type: String, default: '' },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    phone: { type: String, default: '' },
    reason: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    status: { type: String, default: 'Scheduled' }, // Pending Call|Scheduled|Rescheduled|Completed
    priority: { type: String, default: 'Medium' }, // High|Medium|Low
    notes: { type: String, default: '' },
    seedKey: { type: String },
  },
  { timestamps: true }
);
followUpSchema.index({ clinicVendorId: 1, createdAt: -1 });
followUpSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Vaccination reminders (clinic-tracked) ───────────────────────── */
const vaccineReminderSchema = new mongoose.Schema(
  {
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', default: null },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    vaccine: { type: String, default: '' },
    date: { type: String, default: '' },
    status: { type: String, default: 'Scheduled' }, // Due Soon|Scheduled|Overdue|Completed
    seedKey: { type: String },
  },
  { timestamps: true }
);
vaccineReminderSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Emergency requests ───────────────────────────────────────────── */
const emergencyRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // accepted-by
    emNo: { type: String, default: '' },
    petName: { type: String, default: '' },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    severity: { type: String, default: 'High' }, // Critical|High|Medium
    issue: { type: String, default: '' },
    status: { type: String, enum: ['open', 'accepted', 'declined', 'resolved'], default: 'open' },
    acceptedAt: { type: Date, default: null },
    seedKey: { type: String },
  },
  { timestamps: true }
);
emergencyRequestSchema.index({ status: 1, createdAt: -1 });
emergencyRequestSchema.index({ seedKey: 1 }, partialString('seedKey'));

/* ── Video consultation rooms ─────────────────────────────────────── */
const videoRoomSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    roomId: { type: String, required: true, unique: true },
    token: { type: String, default: '' },
    status: { type: String, enum: ['open', 'ended'], default: 'open' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PatientRecord = mongoose.model('PatientRecord', patientRecordSchema);
export const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export const Prescription = mongoose.model('Prescription', prescriptionSchema);
export const LabReport = mongoose.model('LabReport', labReportSchema);
export const FollowUp = mongoose.model('FollowUp', followUpSchema);
export const VaccineReminder = mongoose.model('VaccineReminder', vaccineReminderSchema);
export const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);
export const VideoRoom = mongoose.model('VideoRoom', videoRoomSchema);
