import mongoose from 'mongoose';

/**
 * Partner compliance: the record of every time a partner failed to deliver what
 * a customer paid for, and the policy that decides what happens next.
 *
 * The platform previously had no concept of a partner doing something wrong. A
 * vendor could cancel a confirmed booking, decline every request, or simply
 * leave a paid booking sitting untouched past its service date, and nothing
 * anywhere recorded it — so nobody could answer "is this partner reliable?"
 * until customers started complaining.
 *
 * Everything here is per BUSINESS LINE, not per account. A partner who runs
 * grooming and daycare has two independent standings, matching how approval and
 * commission already work: a grooming no-show must not suspend their daycare.
 */

/* ── Violation catalogue ──────────────────────────────────────────── */

/**
 * The things a partner can be marked down for.
 *
 * `defaultPoints` is only a default — an operator re-weights any of these from
 * the Admin policy screen, and can switch one off entirely. Kept as a catalogue
 * rather than free text so the same failure is always counted the same way and
 * the numbers on the vendor-performance screen mean something.
 */
export const VIOLATION_CATALOGUE = {
  vendor_cancelled_booking: {
    label: 'Cancelled a confirmed booking',
    description: 'Partner cancelled after the customer had a confirmed booking.',
    defaultPoints: 2,
    severity: 'high',
    autoDetected: true,
  },
  vendor_cancelled_late: {
    label: 'Cancelled at the last minute',
    description: 'Partner cancelled within 24 hours of the service time.',
    defaultPoints: 3,
    severity: 'critical',
    autoDetected: true,
  },
  vendor_rejected_booking: {
    label: 'Declined a booking request',
    description: 'Partner declined a request they were asked to accept.',
    defaultPoints: 1,
    severity: 'low',
    autoDetected: true,
  },
  no_response: {
    label: 'Did not respond to a request',
    description: 'Partner let a booking request expire without answering.',
    defaultPoints: 1,
    severity: 'medium',
    autoDetected: true,
  },
  service_not_delivered: {
    label: 'Service not delivered',
    description:
      'A paid booking passed its service date and was never marked started or completed.',
    defaultPoints: 3,
    severity: 'critical',
    autoDetected: true,
  },
  vendor_no_show: {
    label: 'Partner no-show',
    description: 'Customer attended and the partner did not.',
    defaultPoints: 3,
    severity: 'critical',
    autoDetected: false,
  },
  order_not_fulfilled: {
    label: 'Order not fulfilled',
    description: 'A paid order sat unshipped past the fulfilment window.',
    defaultPoints: 2,
    severity: 'high',
    autoDetected: true,
  },
  dispute_upheld: {
    label: 'Customer dispute upheld',
    description: 'Admin ruled a customer dispute against the partner.',
    defaultPoints: 3,
    severity: 'critical',
    autoDetected: false,
  },
  late_completion: {
    label: 'Completed late',
    description: 'Service was delivered, but well after the booked time.',
    defaultPoints: 1,
    severity: 'low',
    autoDetected: true,
  },
  quality_complaint: {
    label: 'Upheld quality complaint',
    description: 'A customer complaint about service quality was upheld.',
    defaultPoints: 2,
    severity: 'high',
    autoDetected: false,
  },
};

export const VIOLATION_TYPES = Object.keys(VIOLATION_CATALOGUE);
export const VIOLATION_STATUSES = ['active', 'forgiven', 'upheld'];
export const VIOLATION_SOURCES = ['auto', 'admin', 'customer_dispute', 'support'];

/* ── One recorded violation ───────────────────────────────────────── */

const violationSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /* Which business line. Null only on rows predating multi-line support. */
    vendorType: { type: String, default: null, index: true },
    vendorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', default: null },

    type: { type: String, enum: VIOLATION_TYPES, required: true, index: true },
    /* Snapshotted from policy at the time, so re-weighting a rule later cannot
     * silently reprice a partner's history — the same reasoning as
     * `commissionRate` on a ledger entry. */
    points: { type: Number, required: true, min: 0 },
    severity: { type: String, default: 'medium' },

    refType: { type: String, enum: ['booking', 'order', 'dispute', 'manual'], default: 'manual' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    refLabel: { type: String, default: '' }, // "Booking TCG12345678"

    reason: { type: String, required: true },
    detail: { type: String, default: '' },
    customerImpact: { type: String, default: '' }, // what the customer experienced

    source: { type: String, enum: VIOLATION_SOURCES, default: 'auto' },
    raisedByName: { type: String, default: 'System' },

    /*
     * `active` counts toward the threshold. `forgiven` is an operator deciding
     * it should not (a genuine emergency, a customer at fault). `upheld` is an
     * operator confirming it after the partner appealed — it still counts, but
     * the record shows it was reviewed rather than merely never looked at.
     */
    status: { type: String, enum: VIOLATION_STATUSES, default: 'active', index: true },
    reviewedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedByName: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },

    /* Set when the partner has seen the warning in their panel, so Admin can
     * tell "they were told and did it again" from "nobody ever told them". */
    acknowledgedAt: { type: Date, default: null },

    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

/*
 * One violation of a given type per reference per business line.
 *
 * The auto-detection sweeps re-run every few minutes over the same open
 * bookings, so without this a single undelivered service would accrue a fresh
 * violation on every pass and suspend an innocent partner within the hour.
 */
violationSchema.index(
  { vendorId: 1, vendorType: 1, type: 1, refType: 1, refId: 1 },
  { unique: true, partialFilterExpression: { refId: { $type: 'objectId' } } }
);
violationSchema.index({ vendorId: 1, vendorType: 1, status: 1, occurredAt: -1 });
violationSchema.index({ status: 1, occurredAt: -1 });

export const VendorViolation = mongoose.model('VendorViolation', violationSchema);

/* ── Configurable policy ──────────────────────────────────────────── */

const ruleSchema = new mongoose.Schema(
  {
    _id: false,
    type: { type: String, enum: VIOLATION_TYPES, required: true },
    points: { type: Number, required: true, min: 0, max: 100 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * The single policy document. One row, fetched through `getPolicy()`, which
 * creates it from defaults on first read.
 *
 * Everything an operator asked to be able to decide lives here: how many
 * violations are tolerated, over what window, what each kind is worth, whether
 * hitting the limit suspends automatically or only raises a flag, and the SLA
 * clocks the auto-detection runs against.
 */
const policySchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'policy', unique: true },

    /** Points a business line may accrue before it trips. Default 3. */
    threshold: { type: Number, default: 3, min: 1, max: 100 },
    /** Rolling window violations are counted over. Older ones stop counting. */
    windowDays: { type: Number, default: 90, min: 1, max: 730 },
    /**
     * What happens at the threshold.
     *
     * `flag` raises an Urgent item in Admin's queue and leaves the partner
     * trading until a human decides. `suspend` stops them taking new work
     * immediately. Configurable because the right answer differs between a
     * launch city where supply is thin and a mature market.
     */
    actionAtThreshold: { type: String, enum: ['flag', 'suspend'], default: 'flag' },
    /** Warn the partner in their panel once they reach this many points. */
    warnAtPoints: { type: Number, default: 1, min: 0 },

    rules: { type: [ruleSchema], default: [] },

    /*
     * Nothing that happened before this is ever scored.
     *
     * Without it, switching compliance on retroactively penalises every partner
     * for every historical booking that was never marked complete — including
     * all the test and pre-launch data. A partner would open their panel on day
     * one already suspended for things that happened before the rules existed,
     * which is both unfair and a good way to lose supply at launch.
     *
     * Defaults to the moment the policy is created. An operator can move it
     * forward to give partners a grace period after announcing the rules.
     */
    enforcementStartsAt: { type: Date, default: Date.now },

    /* ── SLA clocks the sweeps measure against ──────────────────────── */
    sla: {
      /** Hours a partner has to accept or decline a request. */
      vendorResponseHours: { type: Number, default: 2, min: 1, max: 168 },
      /** Days after the service date before an untouched booking is a failure. */
      serviceCompletionGraceDays: { type: Number, default: 2, min: 0, max: 30 },
      /** Days a paid order may sit unshipped. */
      orderFulfilmentDays: { type: Number, default: 3, min: 1, max: 60 },
      /** Hours before the service time that a cancel counts as last-minute. */
      lastMinuteCancelHours: { type: Number, default: 24, min: 1, max: 168 },
    },

    updatedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

export const CompliancePolicy = mongoose.model('CompliancePolicy', policySchema);

/** Rule list seeded from the catalogue when no policy exists yet. */
export function defaultRules() {
  return VIOLATION_TYPES.map((type) => ({
    type,
    points: VIOLATION_CATALOGUE[type].defaultPoints,
    enabled: true,
  }));
}
