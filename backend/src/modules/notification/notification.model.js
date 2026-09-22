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

    /*
     * Per-channel delivery outcome.
     *
     * A failed push used to be a `logger.warn` and nothing else: nobody could
     * answer "did the customer actually get told their booking was cancelled?",
     * which is the question that matters when someone turns up to a service
     * that is not happening. Each channel records whether it was attempted, how
     * it went, and why it failed, so Admin can see delivery health and retry.
     */
    delivery: {
      socket: {
        status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
        error: { type: String, default: null },
        at: { type: Date, default: null },
      },
      push: {
        status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
        error: { type: String, default: null },
        at: { type: Date, default: null },
        devices: { type: Number, default: 0 },
        /* Retry counter, so a permanently dead token is not retried forever. */
        attempts: { type: Number, default: 0 },
      },
    },

    seedKey: { type: String }, // idempotent seeding natural key (seeder only)
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
/* Delivery-health queries: recent failures across all users. */
notificationSchema.index({ 'delivery.push.status': 1, createdAt: -1 });
notificationSchema.index(
  { seedKey: 1 },
  { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
