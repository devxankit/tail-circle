import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Short-lived OTP codes for phone login. Documents auto-expire via a
 * TTL index on `expiresAt`.
 */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
