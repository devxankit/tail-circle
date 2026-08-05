import mongoose from 'mongoose';

/**
 * In-app notification, one document per user event. Written through the
 * single `notify()` service entry (src/services/notify.js), which also emits
 * a live socket event and fires an FCM push. Display fields (title, body,
 * type icon, relative time) mirror the mock in `Notifications.jsx`.
 */
export const NOTIFICATION_TYPES = ['vet', 'shop', 'match', 'booking', 'wallet', 'system'];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    link: { type: String, default: null }, // in-app route to open on tap
    data: { type: Object, default: {} }, // extra payload (ids etc.)
    read: { type: Boolean, default: false },
    pushedAt: { type: Date, default: null }, // when FCM push went out
    seedKey: { type: String }, // idempotent seeding natural key (seeder only)
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index(
  { seedKey: 1 },
  { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
