import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../../services/notifications';

export function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications()
      .then(({ items }) => setNotifications(items))
      .catch(() => {});
  }, []);

  const handleNotificationClick = (notif) => {
    // Mark as read (optimistic + server)
    setNotifications(notifications.map(n =>
      n.id === notif.id ? { ...n, unread: false } : n
    ));
    if (notif.unread) markNotificationRead(notif.id).catch(() => {});

    // Navigate to the relevant page
    if (notif.link) {
      setTimeout(() => {
        navigate(notif.link);
      }, 200); // slight delay to show the read state before navigating
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-50 animate-in slide-in-from-bottom-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-light sticky top-0 bg-white z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors">
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <h1 className="text-xl font-bold text-text-primary ml-2">Notifications</h1>
        </div>
        <button onClick={markAllAsRead} className="p-2 text-primary-main hover:bg-primary-light/20 rounded-full transition-colors active:scale-95" title="Mark all as read">
          <CheckCircle2 size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            onClick={() => handleNotificationClick(notif)}
            className={`flex items-start p-4 border-b border-border-light transition-colors cursor-pointer hover:bg-bg-secondary active:scale-[0.99] ${notif.unread ? 'bg-primary-light/10' : 'bg-white'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'vet' ? 'bg-accent-teal/20 text-accent-teal' : notif.type === 'shop' ? 'bg-blue-100 text-blue-500' : 'bg-primary-light text-primary-main'}`}>
              {notif.type === 'vet' ? '🩺' : notif.type === 'shop' ? '📦' : '🐾'}
            </div>
            <div className="ml-3 flex-1">
              <h4 className={`text-sm ${notif.unread ? 'font-bold text-text-primary' : 'font-medium text-text-primary'}`}>
                {notif.title}
              </h4>
              <p className="text-sm text-text-secondary mt-0.5 leading-snug">{notif.msg}</p>
              <span className="text-xs text-text-disabled mt-1 block">{notif.time}</span>
            </div>
            {notif.unread && <div className="w-2.5 h-2.5 bg-primary-main rounded-full mt-2 shrink-0"></div>}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-text-disabled">
            <Bell size={48} className="mb-4 opacity-50" />
            <p>You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
