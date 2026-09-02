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
