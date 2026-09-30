import React, { useEffect, useState } from 'react';
import { Bell, Calendar, AlertTriangle, Check, Loader2, Info } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../../../services/notifications';
import { ChipTabs, SkeletonList } from '../../vendor/mobile';

const TYPE_ICON = {
  booking: Calendar,
  vet: AlertTriangle,
  system: Info,
};

const TYPE_COLOR = {
  booking: 'border-l-accent-teal',
  vet: 'border-l-error',
  system: 'border-l-text-disabled',
};

/** Real notifications from GET /notifications — same feed the customer app reads. */
export function NotificationsView({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    fetchNotifications()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    setProcessing(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    } finally {
      setProcessing(false);
    }
  };

  const toggleRead = async (item) => {
    if (!item.unread) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
    try {
      await markNotificationRead(item.id);
    } catch {
      load();
    }
  };

  const filtered = items.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    return n.type === filter;
  });

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 px-1">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 flex-wrap">
            <Bell size={18} className="text-primary-main" /> Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-primary-main text-white">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-xs text-text-secondary mt-1">New appointments and clinic alerts.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={processing}
            className="min-h-[40px] px-3 border border-border-light text-xs font-bold text-text-primary bg-white rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 shrink-0"
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-success" />}
            Mark all as read
          </button>
        )}
      </div>

      <ChipTabs
        items={[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'booking', label: 'Appointments' },
          { key: 'vet', label: 'Alerts' },
        ]}
        activeKey={filter}
        onSelect={setFilter}
      />
      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider px-1">
        Showing {filtered.length} of {items.length}
      </p>

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const Icon = TYPE_ICON[item.type] || Info;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => toggleRead(item)}
                className={`w-full text-left flex items-start gap-3 p-4 bg-white border border-border-light border-l-4 rounded-2xl shadow-sm transition active:bg-bg-primary ${TYPE_COLOR[item.type] || 'border-l-text-disabled'} ${item.unread ? '' : 'opacity-75'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-bg-primary border border-border-light flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm text-text-primary ${item.unread ? 'font-bold' : 'font-semibold'}`}>{item.title}</h4>
                    {item.unread && <span className="w-2 h-2 rounded-full bg-primary-main shrink-0" />}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{item.msg}</p>
                  <span className="text-[11px] text-text-secondary/80 font-medium mt-1.5 block">{item.time}</span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-white border border-border-light rounded-[20px] flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-bg-primary rounded-full flex items-center justify-center mb-3">
                <Bell size={22} className="text-text-disabled" />
              </div>
              <p className="font-bold text-text-primary text-sm">No notifications</p>
              <p className="text-xs text-text-secondary mt-1">New appointments will show up here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsView;
