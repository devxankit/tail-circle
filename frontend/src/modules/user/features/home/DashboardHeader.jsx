import React, { useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchUnreadCount } from '../../../../services/notifications';

const SEARCH_DATABASE = [];
const PLACEHOLDERS = [];

export function DashboardHeader() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchUnreadCount().then(setUnread).catch(() => {});
  }, []);

  // Search bar logic has been moved or removed
  return (
    <div className="px-4 py-3 bg-[#FAF7F2] relative z-50">
      
      {/* Top Row: Logo & Icons */}
      <div className="flex justify-between items-center mb-5 mt-1">
        {/* Left: Logo & Text */}
        <div className="flex items-center gap-3">
          <img src="/logo/Tail-removebg-preview.png" alt="TailCircle Logo" className="w-[52px] h-[52px] object-contain" />
          <div className="flex flex-col">
            <h1 className="text-[26px] font-black leading-none flex gap-1.5 tracking-tighter">
              <span className="text-[#4C8684]">Tail</span>
              <span className="text-[#F87B68]">Circle</span>
            </h1>
            <p className="text-[11px] font-semibold text-gray-500 mt-1.5 flex items-center gap-1.5">
              India's trusted pet community
            </p>
          </div>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/app/notifications')} 
            className="w-[42px] h-[42px] bg-white rounded-full flex items-center justify-center relative shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-gray-100/50 hover:bg-gray-50 transition-colors"
          >
            <Bell size={20} className="text-gray-700" strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#F87B68] rounded-full border-2 border-white box-content"></span>
            )}
          </button>
          <button 
            onClick={() => navigate('/app/profile')} 
            className="w-[42px] h-[42px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-gray-100/50 hover:bg-gray-50 transition-colors"
          >
            <User size={20} className="text-gray-700" strokeWidth={2} />
          </button>
        </div>
      </div>


    </div>
  );
}
