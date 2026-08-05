import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, fetchMe } from '../../../../services/auth';
import { fetchUnreadCount } from '../../../../services/notifications';

export function TopHeader() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: '', image: null });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const applyUser = (user) => {
      if (!user) return;
      setProfile({
        name: user.name ? user.name.split(' ')[0] : (user.phone ? `User (${user.phone.slice(-4)})` : 'User'),
        image: user.avatarUrl || null,
      });
    };
    applyUser(getStoredUser());
    fetchMe().then(applyUser).catch(() => {});
    fetchUnreadCount().then(setUnread).catch(() => {});
  }, []);

  return (
    <div className="sticky top-0 z-50 px-4 py-3 bg-bg-primary/90 backdrop-blur-md flex justify-between items-center border-b border-border-light/50">
      <div
        onClick={() => navigate('/app/profile')}
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center overflow-hidden border border-primary-main/20 shrink-0">
          {profile.image ? (
            <img
              src={profile.image}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-primary-main to-teal-400 text-white font-extrabold flex items-center justify-center text-sm uppercase">
              {profile.name ? profile.name[0] : 'U'}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-text-secondary font-medium">Good Morning!</span>
          <div className="flex items-center gap-1">
            <h2 className="text-lg font-bold text-text-primary leading-tight">{profile.name}</h2>
            <ChevronDown size={16} className="text-text-secondary mt-0.5" />
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/app/notifications')}
        className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center relative hover:bg-border-light transition-colors"
      >
        <Bell size={20} className="text-text-primary" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-bg-primary"></span>
        )}
      </button>
    </div>
  );
}
