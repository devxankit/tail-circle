import mongoose from 'mongoose';
import { VENDOR_TYPES } from '../vendor/vendor.models.js';

const { Schema } = mongoose;

/**
 * Core account for the platform. Regular pet owners authenticate via
 * phone + OTP; staff/vendors/admins may also use email + password.
 */
const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true, unique: true, sparse: true, index: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, select: false },
    avatarUrl: { type: String },

    bio: { type: String, trim: true, maxlength: 200, default: '' },
    points: { type: Number, default: 0 },
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    dob: { type: Date, default: null },
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    notificationPrefs: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },

    role: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user',
      index: true,
    },
    /**
     * Fine-grained vendor type.
     *
     * Derived from `VENDOR_TYPES` rather than listed again here. This used to be
     * a second hand-written copy of the same enum, and it fell behind: adding
     * the adoption partner type updated VendorProfile but not this, so an
     * adoption vendor could be created yet could never log in — saving the user
     * threw "`adoption` is not a valid enum value for path `vendorType`".
     *
     * `meal_portal` is a retired value kept only so any historical row still
     * validates; nothing writes it any more.
     */
    vendorType: {
      type: String,
      enum: [...VENDOR_TYPES, 'meal_portal', null],
      default: null,
    },
    /**
     * Every business line this account operates.
     *
     * A vendor may run more than one (a grooming salon that also takes daycare
     * bookings), so this — not the single `vendorType` above — is the truth for
     * "what is this account allowed to do". `vendorType` stays as the *primary*
     * line: the one their panel opens on and the default when a request does
     * not say which business it is for.
     *
     * Kept in step by `syncVendorTypes()` below, so the two can never drift.
     */
    vendorTypes: {
      type: [{ type: String, enum: [...VENDOR_TYPES, 'meal_portal'] }],
      default: [],
      index: true,
    },

    /*
     * The vendor's own open/closed switch.
     *
     * Deliberately separate from `Provider.active` and `approvalStatus`, which
     * belong to the platform: an admin suspending a business and a groomer
     * closing for the afternoon are different events, and one flag for both
     * would let a vendor lift their own suspension.
     *
     * Defaults to open, and absent on every row written before this existed --
     * so all the reads below treat "not false" as online rather than testing
     * for true.
     */
    vendorOnline: { type: Boolean, default: true },
    vendorOfflineAt: { type: Date, default: null },

    // Admin staff RBAC (role: 'admin').
    adminRole: {
      type: String,
      enum: ['super', 'ops', 'finance', 'support', 'moderator', null],
      default: null,
    },
    permissions: { type: [String], default: [] },

    isPhoneVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    // Updated when a user's last active socket disconnects — powers real
    // "Online" / "Last seen" presence instead of a hardcoded chat label.
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Keep `vendorType` (primary) and `vendorTypes` (all lines) consistent.
 *
 * Rows written before multi-line support have only `vendorType`, and older code
 * paths still set just that one. Normalising on save means every read can trust
 * `vendorTypes` to be the complete list, with `vendorType` always a member of
 * it — no call site has to handle the half-populated case.
 */
userSchema.pre('save', function syncVendorTypes() {
  if (this.role !== 'vendor') return;
  const types = new Set((this.vendorTypes || []).filter(Boolean));
  if (this.vendorType) types.add(this.vendorType);
  this.vendorTypes = [...types];
  // Primary must be one of the lines; fall back to the first if it was cleared.
  if (!this.vendorType && this.vendorTypes.length) this.vendorType = this.vendorTypes[0];
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
export default User;
