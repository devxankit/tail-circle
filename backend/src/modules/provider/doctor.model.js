import mongoose from 'mongoose';

/**
 * Veterinary doctor — the professional record behind every `type: 'doctor'`
 * booking, and the login identity for the vet dashboard.
 *
 * Two field groups live here on purpose:
 *
 *  1. **Structured fields** (`credentials`, `practice`, `modes`, `clinicInfo`…)
 *     — the source of truth, captured at registration and edited from the vet
 *     dashboard.
 *  2. **Flat display fields** (`name`, `spec`, `price`, `videoPrice`…) — the
 *     original user-app listing shape, kept so DoctorList/DoctorDetail and the
 *     `legacyId` seeds keep rendering unchanged. These are *derived*: the
 *     pre-save hook below re-projects them from the structured fields, so
 *     nothing writes them directly any more.
 *
 * Ownership: `userId` is the vet's own login (User, role `vendor`).
 * `clinicVendorId` is the owning clinic tenant — for a solo vet both point at
 * the same User. Everything clinic-scoped keys off `clinicVendorId`; per-vet
 * scoping keys off `userId` (see middleware/vetScope.js).
 *
 * Settlement/GST is NOT duplicated here — it lives on VendorProfile and is
 * reached through `clinicVendorId`.
 */

export const CONSULT_MODES = ['inClinic', 'video', 'instantVideo', 'homeVisit', 'emergency'];

/**
 * Bookings carry the shorter `visitType` slug (shared with grooming, which uses
 * salon/home); the vet profile keys its config by mode name. Translate here so
 * the two vocabularies can never drift apart.
 */
export const VISIT_TYPE_TO_MODE = {
  clinic: 'inClinic',
  video: 'video',
  instant_video: 'instantVideo',
  instant: 'instantVideo',
  home: 'homeVisit',
  emergency: 'emergency',
};

export const MODE_TO_VISIT_TYPE = Object.fromEntries(
  Object.entries(VISIT_TYPE_TO_MODE).map(([visitType, mode]) => [mode, visitType])
);

/** Mode key for a booking's visitType, or null when it isn't a consult mode. */
export const modeForVisitType = (visitType) => VISIT_TYPE_TO_MODE[visitType] || null;

/**
 * Field exclusions for every **unauthenticated** doctor route.
 *
 * `credentials.documents` holds ID proof / degree certificate / clinic
 * authorization URLs — never public. The registration number and council stay
 * visible on purpose: they are trust signals the listing is meant to display.
 * Ownership ids are internal plumbing.
 *
 *   Doctor.find(filter).select(PUBLIC_DOCTOR_PROJECTION)
 */
export const PUBLIC_DOCTOR_PROJECTION = [
  '-credentials.documents',
  '-credentials.verification.reviewedBy',
  '-credentials.verification.rejectionReason',
  '-userId',
  '-clinicVendorId',
  '-__v',
].join(' ');

export const SPECIES_OPTIONS = [
  'dogs', 'cats', 'birds', 'rabbits', 'exotic_pets', 'reptiles', 'livestock', 'equine',
];

export const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected', 'resubmit'];

export const DOCUMENT_KINDS = [
  'degree',          // degree certificate
  'license',         // registration / license certificate
  'clinic_auth',     // clinic authorization proof
  'id_proof',        // government ID
  'other',
];

/** Per-mode consult configuration. A mode the vet has not enabled is unbookable. */
const modeConfigSchema = new mongoose.Schema(
  {
    _id: false,
    enabled: { type: Boolean, default: false },
    fee: { type: Number, default: 0, min: 0 },        // rupees
    followUpFee: { type: Number, default: null },     // null → same as `fee`
    durationMinutes: { type: Number, default: 15, min: 5, max: 180 },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    _id: false,
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    label: { type: String, default: '' },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },

    /* ── Ownership ────────────────────────────────────────────────── */
    // The vet's own login. Null only for legacy seed rows not yet claimed.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    // Owning clinic tenant — scopes patients, records, prescriptions, labs.
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /* ── Public identity ──────────────────────────────────────────── */
    identity: {
      title: { type: String, default: 'Dr.', trim: true },
      fullName: { type: String, default: '', trim: true },   // as it appears publicly
      profilePhoto: { type: String, default: '' },
    },

    /* ── Credentials & verification ───────────────────────────────── */
    credentials: {
      registrationNumber: { type: String, default: '', trim: true },
      council: { type: String, default: '', trim: true },     // issuing veterinary council
      registrationYear: { type: Number, default: null },
      documents: { type: [documentSchema], default: [] },
      verification: {
        status: { type: String, enum: VERIFICATION_STATUSES, default: 'pending', index: true },
        reviewedAt: { type: Date, default: null },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        rejectionReason: { type: String, default: '' },
      },
    },

    /* ── Practice ─────────────────────────────────────────────────── */
    practice: {
      primarySpecialties: { type: [String], default: [] },
      secondarySpecialties: { type: [String], default: [] },
      speciesTreated: { type: [String], default: [] },        // dogs, cats, exotic_pets…
      conditionsHandled: { type: [String], default: [] },     // dermatology, dental, surgery consult…
      languages: { type: [String], default: [] },
    },

    experience: {
      totalYears: { type: Number, default: 0, min: 0 },
      yearsInCurrentClinic: { type: Number, default: 0, min: 0 },
    },

    /* ── Clinic / hospital ────────────────────────────────────────── */
    clinicInfo: {
      clinicName: { type: String, default: '', trim: true },
      address: {
        line1: { type: String, default: '' },
        landmark: { type: String, default: '' },
        locality: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        mapsUrl: { type: String, default: '' },     // Google Maps pin
      },
      geo: {
        type: { type: String, enum: ['Point'], default: undefined },
        coordinates: { type: [Number], default: undefined },   // [lng, lat]
      },
      // What the clinic can actually do on-site.
      facilities: {
        medicines: { type: Boolean, default: false },
        diagnostics: { type: Boolean, default: false },
        surgery: { type: Boolean, default: false },
        grooming: { type: Boolean, default: false },
        vaccination: { type: Boolean, default: false },
        labSampleCollection: { type: Boolean, default: false },
        hospitalization: { type: Boolean, default: false },
      },
    },

    /* ── Consultation modes ───────────────────────────────────────── */
    // A mode with `enabled: false` is rejected at booking time — this is what
    // lets a vet decide whether they take video consults at all.
    modes: {
      inClinic: { type: modeConfigSchema, default: () => ({ enabled: true }) },
      video: { type: modeConfigSchema, default: () => ({ enabled: false }) },
      instantVideo: { type: modeConfigSchema, default: () => ({ enabled: false }) },
      homeVisit: { type: modeConfigSchema, default: () => ({ enabled: false }) },
      emergency: { type: modeConfigSchema, default: () => ({ enabled: false }) },
    },

    /* ── About ────────────────────────────────────────────────────── */
    about: {
      bio: { type: String, default: '', maxlength: 2000 },
      treatmentApproach: { type: String, default: '', maxlength: 2000 },
    },

    /* ── Video consult settings ───────────────────────────────────── */
    video: {
      digitalPrescription: { type: Boolean, default: true },
      // Overage billing: charged only after the owner consents mid-call.
      overagePerMinute: { type: Number, default: 0, min: 0 },   // rupees/min
      graceMinutes: { type: Number, default: 2, min: 0, max: 15 },
      maxOverageMinutes: { type: Number, default: 30, min: 0 },
    },

    /* ── Policies ─────────────────────────────────────────────────── */
    policies: {
      cancellationHours: { type: Number, default: 4, min: 0 },  // free-cancel window
      cancellationNote: { type: String, default: '' },
      rescheduleHours: { type: Number, default: 4, min: 0 },
      rescheduleNote: { type: String, default: '' },
      refundNote: { type: String, default: '' },
      noShowNote: { type: String, default: '' },
      followUpWindowDays: { type: Number, default: 7, min: 0 },
    },

    /* ── Flat display projection (derived — see pre-save hook) ────── */
    name: { type: String, trim: true, required: true },
    spec: { type: String, default: '' },
    clinic: { type: String, default: '' },
    expText: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    location: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },        // in-clinic fee, rupees
    videoPrice: { type: Number, default: null },            // null → video not offered
    img: { type: String, default: '' },
    nextAvailable: { type: String, default: '' },
    availability: { type: String, default: 'Available' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSchema.index({ 'clinicInfo.geo': '2dsphere' }, { sparse: true });
doctorSchema.index({ active: 1, 'credentials.verification.status': 1 });
doctorSchema.index({ 'credentials.registrationNumber': 1 });

/**
 * Keep the flat display fields in step with the structured ones so the existing
 * user-app screens never read stale values. Structured fields win whenever they
 * are populated; legacy rows without them keep whatever they already had.
 */
doctorSchema.pre('save', function syncDisplayFields() {
  const { identity, practice, clinicInfo, experience, modes } = this;

  if (identity?.fullName) {
    const title = (identity.title || '').trim();
    this.name = title ? `${title} ${identity.fullName}`.trim() : identity.fullName;
  }
  if (identity?.profilePhoto) this.img = identity.profilePhoto;

  if (practice?.primarySpecialties?.length) {
    this.spec = practice.primarySpecialties.join(', ');
  }
  if (clinicInfo?.clinicName) this.clinic = clinicInfo.clinicName;

  const { locality, city } = clinicInfo?.address || {};
  const place = [locality, city].filter(Boolean).join(', ');
  if (place) this.location = place;

  if (experience?.totalYears) {
    this.expText = `${experience.totalYears}+ yrs exp`;
  }

  // Fee projection — `videoPrice: null` is the signal that video is not offered.
  if (modes?.inClinic?.enabled && modes.inClinic.fee > 0) this.price = modes.inClinic.fee;
  this.videoPrice = modes?.video?.enabled ? modes.video.fee : null;
});

/** Fee for a booking mode, honouring the follow-up rate. `null` when unoffered. */
doctorSchema.methods.feeFor = function feeFor(mode, { followUp = false } = {}) {
  const config = this.modes?.[mode];
  if (!config?.enabled) return null;
  if (followUp && config.followUpFee != null) return config.followUpFee;
  return config.fee;
};

/** Whether this vet currently accepts bookings in the given mode. */
doctorSchema.methods.offersMode = function offersMode(mode) {
  return Boolean(this.modes?.[mode]?.enabled);
};

export const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
