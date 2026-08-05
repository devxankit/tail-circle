import mongoose from 'mongoose';

/**
 * Server-side registry of issued refresh tokens (stored as SHA-256 hashes,
 * never raw). Enables rotation, logout revocation and reuse detection —
 * presenting an already-rotated token revokes the whole family (theft
 * response). Expired docs are removed automatically by the TTL index.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
