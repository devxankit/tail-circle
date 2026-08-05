import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { usePetEvents } from './context/PetEventsContext';
import { vendorLogout } from '../../../services/vendor';
import { markAllNotificationsRead } from '../../../services/notifications';
import {
  LayoutDashboard, CalendarDays, Ticket, CalendarClock,
  Package, Image as ImageIcon, MessageSquare, Star,
  Wallet, Settings, LogOut, Bell, Search, Menu, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../../user/utils/cn';

export function PetEventsLayout() {
  const { profile, notifications, markAllRead } = usePetEvents();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isVerified = profile.verification === 'Approved';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  const navGroups = [
    {
      title: 'CORE OPERATIONS',
      items: [
        { name: 'Dashboard', path: '/vendor/events-organizer', icon: LayoutDashboard, exact: true },
        { name: 'Events', path: '/vendor/events-organizer/events', icon: CalendarDays },
        { name: 'Bookings', path: '/vendor/events-organizer/bookings', icon: Ticket },
        { name: 'Availability Calendar', path: '/vendor/events-organizer/calendar', icon: CalendarClock },
      ]
    },
    {
      title: 'EVENT MANAGEMENT',
      items: [
        { name: 'Packages & Add-ons', path: '/vendor/events-organizer/packages', icon: Package },
        { name: 'Event Gallery', path: '/vendor/events-organizer/gallery', icon: ImageIcon },
        { name: 'Customer Requests', path: '/vendor/events-organizer/requests', icon: MessageSquare },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Customer Feedback', path: '/vendor/events-organizer/feedback', icon: Star },
        { name: 'Finance Center', path: '/vendor/events-organizer/finance', icon: Wallet },
        { name: 'Business Control Center', path: '/vendor/events-organizer/settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-[#FAF7F2] font-sans overflow-hidden selection:bg-slate-300">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Pure Black & White Theme */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-black border-r border-neutral-800 text-neutral-300 flex flex-col transition-all duration-300 z-50 shadow-2xl lg:shadow-none",
        "w-[280px] -translate-x-full sm:w-[64px] sm:translate-x-0 lg:w-[240px]",
        isMobileMenuOpen && "translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-[56px] lg:h-[72px] flex items-center px-4 lg:px-8 border-b border-neutral-800 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 cursor-pointer min-w-max" onClick={() => navigate('/vendor/events-organizer')}>
            <span className="text-white text-2xl font-black tracking-tight block sm:hidden lg:block">Tail<span className="text-neutral-400">Circle</span></span>
            <span className="text-white text-2xl font-black tracking-tight hidden sm:block lg:hidden">T<span className="text-neutral-400">C</span></span>
            <span className="bg-neutral-900 border border-neutral-700 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-1 mt-1 block sm:hidden lg:block">Events</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
          {navGroups.map((group, i) => (
            <div key={i}>
              <h3 className="px-4 text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-3 block sm:hidden lg:block">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <div key={item.name} className="relative group">
                      <NavLink
                        to={isVerified ? item.path : '#'}
                        onClick={(e) => {
                          if (!isVerified) e.preventDefault();
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold",
                          isActive 
                            ? "bg-white text-black font-bold shadow-md shadow-white/10" 
                            : "hover:bg-neutral-900 hover:text-white text-neutral-400",
                          !isVerified && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-300"
                        )}
                      >
                        <Icon size={18} className={cn("shrink-0 transition-transform", isActive ? "scale-110 text-black" : "group-hover:scale-110 text-neutral-400 group-hover:text-white")} />
                        <span className="block sm:hidden lg:block">{item.name}</span>
                      </NavLink>
                      {/* Tooltip for Tablet */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none hidden sm:block lg:hidden z-50 whitespace-nowrap shadow-lg border border-slate-700">
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile Card */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 shrink-0">
          <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 bg-slate-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0 overflow-hidden">
                {profile.logo ? <img src={profile.logo} className="w-full h-full object-cover" alt="Logo"/> : profile.businessName.charAt(0)}
              </div>
              <div className="overflow-hidden hidden lg:block">
                <h4 className="text-sm font-bold text-white truncate">{profile.businessName}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Event Organizer</span>
                  {isVerified && <CheckCircle size={10} className="text-emerald-400" />}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-black text-slate-300 hover:text-white rounded-lg text-xs font-bold transition z-10 cursor-pointer"
            >
              <LogOut size={14} className="shrink-0" /> <span className="block sm:hidden lg:block">Terminate</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 sm:ml-[64px] lg:ml-[240px]">
        
        {/* Top Navbar */}
        <header className="h-[56px] lg:h-[72px] bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 lg:px-10 shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              className="sm:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black text-slate-900 hidden sm:block">Event Operations</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Global Search */}
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 w-64 focus-within:ring-2 focus-within:ring-slate-300 focus-within:border-slate-400 transition-all">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search events, bookings..." 
                className="bg-transparent border-none outline-none ml-2 text-sm font-semibold w-full text-slate-700 placeholder:text-slate-400"
                disabled={!isVerified}
              />
            </div>

            {/* Quick Action Button */}
            {isVerified && (
              <button 
                onClick={() => navigate('/vendor/events-organizer/events/create')}
                className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-full text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer"
              >
                + Create Event
              </button>
            )}

            {/* Status Toggle */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className={cn("w-2 h-2 rounded-full shadow-sm animate-pulse", profile.status === 'Online' ? "bg-emerald-500" : "bg-slate-400")} />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{profile.status}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative cursor-pointer"
                disabled={!isVerified}
              >
                <Bell size={18} />
                {unreadCount > 0 && isVerified && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {isNotificationsOpen && isVerified && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                    <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded-md">{unreadCount} New</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className={cn("p-4 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer", !notif.read && "bg-slate-50/50")}>
                          <p className="text-sm font-semibold text-slate-800">{notif.message}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm font-semibold">No notifications</div>
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-50 text-center">
                    <button onClick={markAllRead} disabled={!unreadCount} className="text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50 transition cursor-pointer">Mark all as read</button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer border-2 border-white ring-2 ring-slate-100 overflow-hidden"
              >
                {profile.logo ? <img src={profile.logo} className="w-full h-full object-cover" alt="Logo"/> : profile.businessName.charAt(0)}
              </button>
              
              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 py-2">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-sm font-black text-slate-900">{profile.businessName}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{profile.email}</p>
                  </div>
                  <button onClick={() => navigate('/vendor/events-organizer/settings')} className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer">Account Settings</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer">Terminate Session</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative custom-scrollbar">
          {!isVerified ? (
            <div className="absolute inset-0 bg-[#FAF7F2] z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <AlertCircle size={40} className="text-slate-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Account Pending Verification</h2>
              <p className="text-slate-500 font-medium max-w-md mb-8">
                Your Pet Events Organizer account is currently under review by our admin team. You will receive an email once approved.
              </p>
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm w-full max-w-md text-left mb-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Status Checklist</h3>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Business Details Submitted</span>
                    <CheckCircle size={18} className="text-emerald-500" />
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Identity Documents</span>
                    <CheckCircle size={18} className="text-emerald-500" />
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Admin Approval</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded border border-slate-200 animate-pulse">Pending</span>
                  </li>
                </ul>
              </div>

              <button onClick={handleLogout} className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition shadow-lg cursor-pointer">
                Log Out
              </button>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto min-h-full">
              <Outlet />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
