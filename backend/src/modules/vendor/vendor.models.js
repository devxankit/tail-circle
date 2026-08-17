import mongoose from 'mongoose';

/**
 * Vendor platform models. A vendor is a User (role: vendor, vendorType: …)
 * plus a VendorProfile carrying KYC, bank, approval state and commission.
 * Money flows are tracked as VendorLedgerEntry rows (one per paid
 * order/booking/subscription) that settle into Payout batches.
 */

export const VENDOR_TYPES = [
  'shop',
  'meal_subscription',
  'events',
  'memorial',
  'clinic',
  // Service verticals backed by a Provider record (type grooming / daycare)
  // rather than their own catalog models.
  'grooming',
  'daycare',
];
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true, trim: true },
    registrationNo: { type: String, unique: true }, // generated (TCV-XXXXXX)
    vendorType: { type: String, enum: VENDOR_TYPES, required: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    logo: { type: String, default: '' },
    online: { type: Boolean, default: true }, // storefront open/closed toggle

    documents: [
      {
        _id: false,
        kind: { type: String, required: true },
        url: { type: String, default: '' },
        // KYC verification workflow, driven by the admin VendorDocuments screen.
        status: { type: String, enum: ['Pending', 'Verified', 'Rejected', 'Re-upload'], default: 'Pending' },
        verifiedBy: { type: String, default: '' },
        verifiedAt: { type: Date, default: null },
      },
    ],
    bank: {
      bankName: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumberEnc: { type: String, default: null, select: false }, // AES at rest
      ifsc: { type: String, default: '' },
      accountType: { type: String, default: 'Saving' },
    },
    gst: {
      hasGst: { type: Boolean, default: false },
      number: { type: String, default: '' },
    },

    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, default: null },
    commissionRate: { type: Number, default: 0.15 }, // platform commission fraction
    rating: { type: Number, default: 0 },

    policies: {
      codEnabled: { type: Boolean, default: true },
      returnsEnabled: { type: Boolean, default: true },
      minOrderValue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

vendorProfileSchema.pre('save', function assignRegNo() {
  if (!this.registrationNo) {
    this.registrationNo = `TCV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
});

export const VendorProfile = mongoose.model('VendorProfile', vendorProfileSchema);

/**
 * One row per settleable transaction. `gross` is what the customer paid (paise),
 * `commission` the platform cut, `net` the vendor's share. Rolled into a Payout
 * when settled. Idempotent on (refType, refId) so re-fulfilment can't double-post.
 */
const vendorLedgerEntrySchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refType: { type: String, enum: ['order', 'booking', 'subscription'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    label: { type: String, default: '' }, // display ("Order ORD-1234")
    gross: { type: Number, required: true }, // paise
    commission: { type: Number, required: true }, // paise
    net: { type: Number, required: true }, // paise
    status: { type: String, enum: ['unsettled', 'settled'], default: 'unsettled', index: true },
    settledPayoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
  },
  { timestamps: true }
);
vendorLedgerEntrySchema.index({ refType: 1, refId: 1 }, { unique: true });
vendorLedgerEntrySchema.index({ vendorId: 1, createdAt: -1 });

export const VendorLedgerEntry = mongoose.model('VendorLedgerEntry', vendorLedgerEntrySchema);

const payoutSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, default: '' }, // "Nov 2023" / free-form
    grossAmount: { type: Number, default: 0 }, // paise
    commission: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'processing', 'paid'], default: 'pending', index: true },
    utr: { type: String, default: null },
    lineItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorLedgerEntry' }],
  },
  { timestamps: true }
);
payoutSchema.index({ vendorId: 1, createdAt: -1 });

export const Payout = mongoose.model('Payout', payoutSchema);
