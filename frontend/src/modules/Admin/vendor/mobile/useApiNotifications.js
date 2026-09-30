import { useEffect, useState } from 'react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../../../services/notifications';

/**
 * The notifications the grooming / daycare / adoption / clinic header showed:
 * the same fetch and the same mark-read calls, moved out of VendorLayout and
 * shaped for NotificationsSheet.
 */
export function useApiNotifications() {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    fetchNotifications().then((res) => setNotifications(res.items)).catch(() => setNotifications([]));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch { /* best-effort */ }
  };

  const handleNotifClick = async (n) => {
    if (!n.unread) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    try { await markNotificationRead(n.id); } catch { /* best-effort */ }
  };

  return {
    items: notifications.map((n) => ({ id: n.id, title: n.title, body: n.msg, time: n.time, unread: n.unread })),
    unreadCount: notifications.filter((n) => n.unread).length,
    showDot: notifications.some((n) => n.unread),
    onMarkAllRead: handleMarkAllRead,
    onItemClick: (item) => handleNotifClick(notifications.find((n) => n.id === item.id) || item),
  };
}

export default useApiNotifications;
