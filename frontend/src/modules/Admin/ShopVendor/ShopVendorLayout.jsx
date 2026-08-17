import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useShopVendor } from './context/ShopVendorContext';
import { ToastProvider } from './components/Toast';
import { GlobalSearch } from './components/GlobalSearch';
import {
  LayoutDashboard, ShoppingBag, ShoppingCart,
  Package, RefreshCcw, Star, Wallet, Settings,
  LogOut, Bell, Menu, CheckCircle, Store, Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../user/utils/cn';

import { updateVendorProfile } from '../../../services/vendor';

import VerificationBanner from '../components/VerificationBanner';

export function ShopVendorLayout() {
  const { profile, setProfile, notifications, setNotifications } = useShopVendor();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [togglingStore, setTogglingStore] = useState(false);

  // Refs for outside-click detection
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickActionsRef = useRef(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target)) setIsQuickActionsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const storeOpen = profile.status === 'Online';
  const toggleStoreOpen = async () => {
    if (togglingStore) return;
    const nextOnline = !storeOpen;
    setTogglingStore(true);
    setProfile(prev => ({ ...prev, status: nextOnline ? 'Online' : 'Offline' }));
    try {
      await updateVendorProfile({ online: nextOnline });
    } catch (err) {
      setProfile(prev => ({ ...prev, status: storeOpen ? 'Online' : 'Offline' }));
    } finally {
      setTogglingStore(false);
    }
  };

  const isVerified = profile.verification === 'Approved';
  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkNotifRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleLogout = () => {
    navigate('/vendor/login');
  };

  const navGroups = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/vendor/shop-provider', icon: LayoutDashboard, exact: true },
        { name: 'Product Management', path: '/vendor/shop-provider/products', icon: ShoppingBag },
        { name: 'Orders', path: '/vendor/shop-provider/orders', icon: ShoppingCart },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Inventory & Stock', path: '/vendor/shop-provider/inventory', icon: Package },
        { name: 'Returns & Refunds', path: '/vendor/shop-provider/returns', icon: RefreshCcw },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Customer Feedback', path: '/vendor/shop-provider/feedback', icon: Star },
        { name: 'Finance Center', path: '/vendor/shop-provider/finance', icon: Wallet },
        { name: 'Business Control Center', path: '/vendor/shop-provider/settings', icon: Settings },
      ]
    }
  ];

  // Derive page title from location
  const pageTitle = (() => {
    const path = location.pathname;
    if (path === '/vendor/shop-provider') return 'Dashboard';
    if (path.includes('/products')) return 'Product Management';
    if (path.includes('/orders')) return 'Orders';
    if (path.includes('/inventory')) return 'Inventory & Stock';
    if (path.includes('/returns')) return 'Returns & Refunds';
    if (path.includes('/feedback')) return 'Customer Feedback';
    if (path.includes('/finance')) return 'Finance Center';
    if (path.includes('/settings')) return 'Business Control Center';
    return 'Store Operations';
  })();

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#FAF7F2] font-sans overflow-hidden selection:bg-orange-500/20">
        
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
            <div className="flex items-center gap-2 cursor-pointer min-w-max" onClick={() => navigate('/vendor/shop-provider')}>
              <span className="text-white text-2xl font-black tracking-tight block sm:hidden lg:block">Tail<span className="text-white font-serif italic">Circle</span></span>
              <span className="text-white text-2xl font-black tracking-tight hidden sm:block lg:hidden">T<span className="text-white font-serif italic">C</span></span>
              <span className="bg-neutral-900 border border-neutral-700 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-1 mt-1 block sm:hidden lg:block">Shop</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                          {/* Notification badge for Orders */}
                          {item.path.includes('/orders') && unreadCount > 0 && isVerified && (
                            <span className="ml-auto bg-[#F87B68]/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center block sm:hidden lg:block">
                              {unreadCount}
                            </span>
                          )}
                        </NavLink>
                        {/* Tooltip for Tablet */}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-[#40716F] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none hidden sm:block lg:hidden z-50 whitespace-nowrap shadow-lg border border-slate-700">
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
                <div className="w-10 h-10 bg-[#F87B68] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0 overflow-hidden">
                  {profile.logo ? <img src={profile.logo} className="w-full h-full object-cover" alt="Logo"/> : profile.businessName.charAt(0)}
                </div>
                <div className="overflow-hidden hidden lg:block">
                  <h4 className="text-sm font-bold text-white truncate">{profile.businessName}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Shop Partner</span>
                    {isVerified && <CheckCircle size={10} className="text-emerald-400" />}
                  </div>
                </div>
              </div>
              
              {/* Store status pill */}
              <div
                onClick={toggleStoreOpen}
                className="flex items-center justify-between bg-slate-700/60 hover:bg-slate-700 px-3 py-2 rounded-xl cursor-pointer transition"
              >
                <span className="text-xs font-bold text-slate-300">{storeOpen ? 'Store is Open' : 'Store is Closed'}</span>
                <div className={cn("w-9 h-5 rounded-full relative transition-colors duration-200", storeOpen ? "bg-emerald-500" : "bg-slate-600")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200", storeOpen ? "right-0.5" : "left-0.5")} />
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-black text-slate-300 hover:text-white rounded-lg text-xs font-bold transition z-10 cursor-pointer"
              >
                <LogOut size={14} className="shrink-0" /> <span className="block sm:hidden lg:block">Terminate Session</span>
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
              <div>
                <h1 className="text-xl font-black text-slate-900 hidden sm:block">{pageTitle}</h1>
                {isVerified && (
                  <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", storeOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={toggleStoreOpen}>
                      {storeOpen ? 'Store Open' : 'Store Closed'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Global Search */}
              <GlobalSearch disabled={!isVerified} />

              {/* Quick Actions Dropdown */}
              {isVerified && (
                <div ref={quickActionsRef} className="relative hidden sm:block">
                  <button 
                    onClick={() => { setIsQuickActionsOpen(!isQuickActionsOpen); setIsNotificationsOpen(false); setIsProfileOpen(false); }}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-full text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer"
                  >
                    + Quick Action
                  </button>
                  {isQuickActionsOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 py-2">
                      <p className="px-4 pt-2 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quick Actions</p>
                      <button onClick={() => { setIsQuickActionsOpen(false); navigate('/vendor/shop-provider/products', { state: { openAdd: true } }); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center text-xs">+</span>
                        Add Product
                      </button>
                      <button onClick={() => { setIsQuickActionsOpen(false); navigate('/vendor/shop-provider/inventory'); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center"><Package size={11} /></span>
                        Update Stock
                      </button>
                      <button onClick={() => { setIsQuickActionsOpen(false); navigate('/vendor/shop-provider/orders'); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><ShoppingCart size={11} /></span>
                        View New Orders
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button 
                  onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); setIsQuickActionsOpen(false); }}
                  className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative cursor-pointer"
                  disabled={!isVerified}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && isVerified && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {isNotificationsOpen && isVerified && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 transition cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkNotifRead(notif.id)}
                            className={cn(
                              "p-4 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer flex gap-3 items-start",
                              !notif.read && "bg-orange-50/30"
                            )}
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              !notif.read ? "bg-orange-500" : "bg-transparent"
                            )} />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800">{notif.message}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{notif.time}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-sm font-semibold">No notifications</div>
                      )}
                    </div>
                    {unreadCount === 0 && (
                      <div className="p-3 text-center border-t border-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All caught up!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar */}
              <div ref={profileRef} className="relative">
                <button 
                  onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); setIsQuickActionsOpen(false); }}
                  className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer border-2 border-white ring-2 ring-slate-100 overflow-hidden"
                >
                  {profile.logo ? <img src={profile.logo} className="w-full h-full object-cover" alt="Logo"/> : profile.businessName.charAt(0)}
                </button>
                
                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 py-2">
                    <div className="px-4 py-3 border-b border-slate-50">
                      <p className="text-sm font-black text-slate-900">{profile.businessName}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{profile.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", storeOpen ? "bg-emerald-500" : "bg-slate-400")} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{storeOpen ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                    <button onClick={() => { setIsProfileOpen(false); navigate('/vendor/shop-provider/settings'); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer">Account Settings</button>
                    <button onClick={() => { setIsProfileOpen(false); navigate('/vendor/shop-provider/finance'); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer">Finance Center</button>
                    <div className="border-t border-slate-50 mt-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer">Terminate Session</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative custom-scrollbar">
            <div className="max-w-7xl mx-auto min-h-full">
              <VerificationBanner
                approvalStatus={profile?.approvalStatus || 'pending'}
                kycPath="/vendor/shop-provider/settings"
              />
              <Outlet />
            </div>
          </div>

        </main>
      </div>
    </ToastProvider>
  );
}
