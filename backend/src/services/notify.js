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

  try {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, serialize(doc));
  } catch (err) {
    logger.warn(`notify: socket emit failed for user ${userId}: ${err.message}`);
  }

  // FCM is async fire-and-forget; stamp pushedAt when at least one device got it.
  sendToUser(userId, { title, body, data: { type, link: link || '', ...toStringMap(data) } })
    .then((res) => {
      if (res?.sent > 0) Notification.updateOne({ _id: doc._id }, { $set: { pushedAt: new Date() } }).catch(() => {});
    })
    .catch((err) => logger.warn(`notify: FCM failed for user ${userId}: ${err.message}`));

  return doc;
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
