import mongoose from 'mongoose';

/**
 * FCM registration tokens, one document per device. Registered/refreshed by
 * the app after notification permission is granted; stale tokens are pruned
 * automatically when FCM reports them invalid.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
export default DeviceToken;
