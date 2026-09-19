import { Notification } from '../modules/notification/notification.model.js';
import { emitToUser } from '../sockets/index.js';
import { SOCKET_EVENTS } from '../sockets/events.js';
import { sendToUser } from './fcm.service.js';
import { logger } from '../utils/logger.js';

/**
 * Single entry point for user notifications. Every channel fans out from one
 * call so callers never juggle DB + socket + push individually:
 *   1. persist an in-app Notification document,
 *   2. push it live to any open tab (socket `notification:new`),
 *   3. fire an FCM push to registered devices (fire-and-forget).
 *
 * A push/socket failure must never bounce the business operation that
 * triggered it, so everything past the DB write is best-effort.
 */
export async function notify(userId, { title, body = '', type = 'system', link = null, data = {} }) {
  const doc = await Notification.create({ userId, title, body, type, link, data });

  /*
   * Each channel's outcome is recorded on the document rather than only logged.
   * Delivery failures were previously invisible to everyone except whoever was
   * tailing the logs, so "the customer says they were never told" had no answer.
   */
  try {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, serialize(doc));
    markChannel(doc._id, 'socket', { status: 'sent' });
  } catch (err) {
    logger.warn(`notify: socket emit failed for user ${userId}: ${err.message}`);
    markChannel(doc._id, 'socket', { status: 'failed', error: err.message });
  }

  // FCM is async fire-and-forget; stamp pushedAt when at least one device got it.
  sendToUser(userId, { title, body, data: { type, link: link || '', ...toStringMap(data) } })
    .then((res) => {
      const sent = res?.sent || 0;
      if (sent > 0) {
        Notification.updateOne({ _id: doc._id }, { $set: { pushedAt: new Date() } }).catch(() => {});
        markChannel(doc._id, 'push', { status: 'sent', devices: sent });
      } else {
        // No registered device is not a failure — it is a user who has not
        // granted push. Distinguished so it does not pollute the failure rate.
        markChannel(doc._id, 'push', { status: 'skipped', error: 'no registered devices' });
      }
    })
    .catch((err) => {
      logger.warn(`notify: FCM failed for user ${userId}: ${err.message}`);
      markChannel(doc._id, 'push', { status: 'failed', error: err.message });
    });

  return doc;
}

/** Record one channel's delivery outcome. Never throws into the caller. */
function markChannel(id, channel, { status, error = null, devices = 0 }) {
  Notification.updateOne(
    { _id: id },
    {
      $set: {
        [`delivery.${channel}.status`]: status,
        [`delivery.${channel}.error`]: error,
        [`delivery.${channel}.at`]: new Date(),
        ...(channel === 'push' ? { 'delivery.push.devices': devices } : {}),
      },
    }
  ).catch(() => {});
}

/**
 * Re-send notifications whose push failed.
 *
 * Failures were visible but never retried, which meant a customer whose phone
 * was briefly unreachable simply never found out their booking was cancelled.
 * FCM failures are overwhelmingly transient — a dropped connection, a token
 * refresh mid-flight — so one retry recovers most of them.
 *
 * Only `failed` is retried. `skipped` means the user has no registered device,
 * which retrying cannot fix, and `sent` is already delivered.
 *
 * Attempts are capped so a permanently broken token cannot be retried forever
 * on every sweep.
 */
export async function retryFailedPushes({ hours = 24, limit = 100, maxAttempts = 3 } = {}) {
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await Notification.find({
    createdAt: { $gte: since },
    'delivery.push.status': 'failed',
    'delivery.push.attempts': { $lt: maxAttempts },
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  let recovered = 0;
  for (const doc of rows) {
    try {
      const res = await sendToUser(doc.userId, {
        title: doc.title,
        body: doc.body,
        data: { type: doc.type, link: doc.link || '', ...toStringMap(doc.data || {}) },
      });
      const sent = res?.sent || 0;
      if (sent > 0) {
        recovered += 1;
        await Notification.updateOne(
          { _id: doc._id },
          {
            $set: {
              pushedAt: new Date(),
              'delivery.push.status': 'sent',
              'delivery.push.error': null,
              'delivery.push.at': new Date(),
              'delivery.push.devices': sent,
            },
            $inc: { 'delivery.push.attempts': 1 },
          }
        );
      } else {
        await Notification.updateOne(
          { _id: doc._id },
          {
            $inc: { 'delivery.push.attempts': 1 },
            $set: { 'delivery.push.at': new Date() },
          }
        );
      }
    } catch (err) {
      await Notification.updateOne(
        { _id: doc._id },
        {
          $inc: { 'delivery.push.attempts': 1 },
          $set: { 'delivery.push.error': err.message, 'delivery.push.at': new Date() },
        }
      ).catch(() => {});
    }
  }

  if (recovered) logger.info(`Notification retry recovered ${recovered}/${rows.length} failed push(es)`);
  return { attempted: rows.length, recovered };
}

/**
 * Notification delivery health for the Admin platform screen: how many went
 * out, how many failed, and the most recent failures with their reasons.
 */
export async function deliveryHealth({ hours = 24, limit = 50 } = {}) {
  const since = new Date(Date.now() - hours * 3600_000);
  const [agg] = await Notification.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pushSent: { $sum: { $cond: [{ $eq: ['$delivery.push.status', 'sent'] }, 1, 0] } },
        pushFailed: { $sum: { $cond: [{ $eq: ['$delivery.push.status', 'failed'] }, 1, 0] } },
        pushSkipped: { $sum: { $cond: [{ $eq: ['$delivery.push.status', 'skipped'] }, 1, 0] } },
        socketFailed: { $sum: { $cond: [{ $eq: ['$delivery.socket.status', 'failed'] }, 1, 0] } },
      },
    },
  ]);

  const failures = await Notification.find({
    createdAt: { $gte: since },
    $or: [{ 'delivery.push.status': 'failed' }, { 'delivery.socket.status': 'failed' }],
  })
    .populate('userId', 'name phone')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    windowHours: hours,
    total: agg?.total || 0,
    pushSent: agg?.pushSent || 0,
    pushFailed: agg?.pushFailed || 0,
    pushSkipped: agg?.pushSkipped || 0,
    socketFailed: agg?.socketFailed || 0,
    failures: failures.map((n) => ({
      id: String(n._id),
      user: n.userId?.name || 'Unknown',
      phone: n.userId?.phone || '—',
      title: n.title,
      type: n.type,
      pushError: n.delivery?.push?.error || null,
      socketError: n.delivery?.socket?.error || null,
      createdAt: n.createdAt,
    })),
  };
}

/** Shape a Notification doc for the socket/API (matches list() output). */
export function serialize(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    body: doc.body,
    type: doc.type,
    link: doc.link,
    data: doc.data || {},
    read: doc.read,
    createdAt: doc.createdAt,
  };
}

export async function listForUser(userId, { limit = 50 } = {}) {
  const docs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  return docs.map(serialize);
}

export async function unreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

export async function markRead(userId, id) {
  await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
}

export async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
}

function toStringMap(data) {
  return Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)]));
}
