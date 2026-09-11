import mongoose from 'mongoose';

/**
 * A commission rate change queued to take effect at a future moment.
 *
 * Deliberately a queue of pending instructions rather than a time-versioned
 * rate table. Settlement stays exactly as it is — it reads today's rate and
 * nothing else — so scheduling adds no work and no risk to the path that
 * writes money. A small applier turns a due row into an ordinary rate change
 * through the same admin setter an operator would use, which means scheduled
 * changes get the same validation, bounds check and audit entry.
 *
 * `scope` says what the change targets:
 *   global   — the platform default          (targetKey: 'default')
 *   category — one vendor category           (targetKey: the vendorType)
 *   vendor   — one vendor's own rate         (targetKey: the VendorProfile id)
 */
const commissionScheduleSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'category', 'vendor'], required: true },
    targetKey: { type: String, required: true },
    /** Human label for the target, so a listing reads without extra lookups. */
    targetLabel: { type: String, default: '' },
    /** Percentage, matching what the operator typed. Converted on apply. */
    percent: { type: Number, required: true, min: 0, max: 100 },
    /**
     * Null on a vendor-scoped row means "clear the override and go back to
     * inheriting", which is a real instruction and not the same as 0%.
     */
    clearsOverride: { type: Boolean, default: false },
    effectiveFrom: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'applied', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    /** What the rate was immediately before this was applied, for the audit trail. */
    previousPercent: { type: Number, default: null },
    appliedAt: { type: Date, default: null },
    error: { type: String, default: '' },
    note: { type: String, default: '' },
    createdByName: { type: String, default: '' },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

/* The applier's query: everything due, oldest first. */
commissionScheduleSchema.index({ status: 1, effectiveFrom: 1 });

export const CommissionSchedule = mongoose.model('CommissionSchedule', commissionScheduleSchema);
