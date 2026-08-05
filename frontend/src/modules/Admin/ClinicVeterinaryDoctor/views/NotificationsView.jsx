import React, { useEffect, useState } from 'react';
import { Bell, Calendar, AlertTriangle, FileText, Check, Loader2, Info } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../../../services/notifications';

const TYPE_ICON = {
  booking: Calendar,
  vet: AlertTriangle,
  system: Info,
};

const TYPE_COLOR = {
  booking: 'border-l-blue-500 bg-blue-50/20',
  vet: 'border-l-red-500 bg-red-50/20',
  system: 'border-l-gray-400 bg-gray-50/20',
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
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Bell size={18} className="text-[#F87B68]" /> Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#F87B68] text-white">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">New appointments and clinic alerts.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={processing}
            className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-xs font-black text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-emerald-500" />}
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'booking', label: 'Appointments' },
              { id: 'vet', label: 'Alerts' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filter === tab.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Showing {filtered.length} of {items.length}
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="flex-1 divide-y divide-gray-100">
            {filtered.map(item => {
              const Icon = TYPE_ICON[item.type] || Info;
              return (
                <div
                  key={item.id}
                  onClick={() => toggleRead(item)}
                  className={`flex items-start gap-4 p-4 border-l-4 transition hover:bg-gray-50/50 cursor-pointer ${TYPE_COLOR[item.type] || 'border-l-gray-400 bg-gray-50/20'} ${item.unread ? 'bg-white font-semibold' : 'opacity-75'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                      {item.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#F87B68]" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.msg}</p>
                    <span className="text-[10px] text-gray-400 font-medium mt-2 block">{item.time}</span>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Bell size={22} className="text-gray-300" />
                </div>
                <p className="font-bold text-gray-600 text-sm">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">New appointments will show up here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsView;
