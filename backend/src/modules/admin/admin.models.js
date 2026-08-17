import mongoose from 'mongoose';

/**
 * Super-admin platform models (Phase 11). AuditLog is append-only and written
 * on every mutating admin action; Banner backs the user-app Home rails
 * (public `GET /banners`); PlatformSetting is a typed key/value store for
 * commission/tax/feature flags.
 */

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: '' },
    action: { type: String, required: true }, // e.g. vendor.approve
    targetType: { type: String, default: '' }, // vendor|user|banner|setting|payout|post
    targetId: { type: String, default: '' },
    before: { type: Object, default: null },
    after: { type: Object, default: null },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);
auditLogSchema.index({ at: -1 });

const bannerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // fresh_food|adoption|daycare|home_hero…
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    link: { type: String, default: '' },
    slot: { type: String, default: 'Home Hero' },
    btnText: { type: String, default: '' }, // Home carousel CTA
    bg: { type: String, default: '' }, // Home carousel gradient classes
    badge: { type: String, default: '' }, // small overlay pill, e.g. "20% OFF" (Home Offers slot)
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
    seedKey: { type: String },
  },
  { timestamps: true }
);
bannerSchema.index({ seedKey: 1 }, { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } });
bannerSchema.index({ active: 1, sort: 1 });

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    label: { type: String, default: '' },
    group: { type: String, default: 'general' }, // commission|tax|feature|meal_trial|general
  },
  { timestamps: true }
);

/**
 * Generic admin catalog-config store. Backs the ~12 bespoke config datasets the
 * super-admin "services" screens render (product categories, doctor consultation
 * types & specializations, service add-ons & facility amenities, memorial
 * services & packages, event categories & add-ons & pending approvals, grooming
 * services, day-care packages & partner facilities). Each row keeps the mock
 * object verbatim in `data` (React icons stored as `iconName` strings), grouped
 * by `group`. Retires the hardcoded arrays in those views.
 */
const adminConfigSchema = new mongoose.Schema(
  {
    group: { type: String, required: true, index: true },
    sort: { type: Number, default: 0 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    seedKey: { type: String }, // set only by the seeder, for idempotent upsert
  },
  { timestamps: true, minimize: false }
);
adminConfigSchema.index({ group: 1, sort: 1 });
adminConfigSchema.index({ seedKey: 1 }, { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } });

const actionItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true }, // 'Vendor Approval' | 'Refund Request' | 'Moderation'
    type: { type: String, required: true }, // 'Doctor / Clinic', 'Meal Provider', 'Event Refund', 'Spam Feed Report', etc.
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    details: { type: String, default: '' },
    priority: { type: String, enum: ['Urgent', 'High', 'Medium', 'Normal'], default: 'Medium' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'resolved'], default: 'pending' },
    targetId: { type: String, default: '' },
    navPath: { type: String, default: '' },
    docName: { type: String, default: '' },
    applicant: { type: String, default: '' },
    amount: { type: String, default: '' },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    note: { type: String, default: '' },
    seedKey: { type: String },
  },
  { timestamps: true }
);
actionItemSchema.index({ status: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const Banner = mongoose.model('Banner', bannerSchema);
export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
export const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);
export const AdminActionItem = mongoose.model('AdminActionItem', actionItemSchema);
