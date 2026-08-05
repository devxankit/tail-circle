import { api } from './api';
import { requestPushToken, onForegroundPush } from './firebase';

/**
 * Notifications service — replaces the hardcoded array in Notifications.jsx.
 * Maps server documents to the mock's display shape
 * `{ id, title, msg, time, unread, type, link }` so the screen and the header
 * badge render identically.
 */

export async function fetchNotifications() {
  const { data } = await api.get('/notifications');
  return {
    items: (data.items || []).map(mapNotification),
    unread: data.unread || 0,
  };
}

export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.unread || 0;
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all');
}

export async function markNotificationRead(id) {
  await api.post(`/notifications/${id}/read`);
}

function mapNotification(n) {
  return {
    id: n.id,
    title: n.title,
    msg: n.body,
    time: timeAgo(n.createdAt),
    unread: !n.read,
    type: n.type,
    link: n.link,
  };
}

/** "just now" / "5m ago" / "2h ago" / "1d ago" — matches the mock strings. */
export function timeAgo(createdAt) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

/**
 * Register this browser for push (called once after login) and forward
 * foreground pushes to a handler. Best-effort — returns an unsubscribe fn.
 */
export async function enablePushNotifications(onPush) {
  try {
    const token = await requestPushToken();
    if (token) await api.post('/users/me/fcm-token', { token, platform: 'web' });
  } catch {
    // permission denied / unsupported — silently skip.
  }
  if (typeof onPush === 'function') {
    return onForegroundPush(onPush);
  }
  return () => {};
}
