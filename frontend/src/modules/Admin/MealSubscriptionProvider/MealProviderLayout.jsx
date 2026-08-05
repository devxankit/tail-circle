import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, FileText, CalendarCheck, Truck, ListChecks, HeartPulse, Package, Tag, Settings, LogOut, Bell, Search, Map, Wallet, Menu, Users, Star, MessageSquare, CreditCard, Shield, Activity, Receipt, Bookmark, MapPin } from 'lucide-react';
import { useMealProvider } from './context/MealProviderContext';
import { vendorLogout } from '../../../services/vendor';
import { cn } from '../../user/utils/cn';

export function MealProviderLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useMealProvider();

  const menuSections = [
    {
      title: 'Core Operations',
      items: [
        { path: '/vendor/meal-provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/vendor/meal-provider/plans', label: 'Meal Plans', icon: Utensils },
        { path: '/vendor/meal-provider/subscriptions', label: 'Active Subscriptions', icon: FileText },
        { path: '/vendor/meal-provider/trials', label: 'Trial Meal Requests', icon: CalendarCheck },
      ]
    },
    {
      title: 'Logistics',
      items: [
        { path: '/vendor/meal-provider/kitchen', label: 'Kitchen Queue', icon: ListChecks },
        { path: '/vendor/meal-provider/delivery-board', label: 'Delivery Operations', icon: Truck },
        { path: '/vendor/meal-provider/live-tracking', label: 'Live Tracking', icon: Map },
      ]
    },
    {
      title: 'Management',
      items: [
        { path: '/vendor/meal-provider/feedback', label: 'Customer Feedback', icon: MessageSquare },
        { path: '/vendor/meal-provider/finance', label: 'Finance Center', icon: Wallet },
        { path: '/vendor/meal-provider/settings', label: 'Business Control Center', icon: Settings },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Black & White Theme Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-[72px] px-6 flex items-center shrink-0 border-b border-neutral-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tighter">Tail<span className="text-neutral-400">Circle</span></span>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = location.pathname.includes(item.path);
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => { if(window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                      active ? "bg-white text-black font-bold shadow-md shadow-white/10" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    )}
                  >
                    <item.icon size={18} className={active ? "text-black" : "text-neutral-400 group-hover:text-white"} />
                    <span className="block sm:hidden lg:block">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-800">
          <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 border border-neutral-700">
                {profile.businessName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-bold truncate">{profile.businessName}</p>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Meal Provider</p>
              </div>
            </div>
            <button
              onClick={() => {
                vendorLogout();
                navigate('/vendor/login');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-black rounded-lg text-slate-300 text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              <LogOut size={13} /> Terminate
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 transition-all duration-300">
        
        {/* Top Navbar */}
        <header className="h-[72px] bg-white flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 rounded-xl text-gray-400 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Operations Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Kitchen Live</span>
            </div>
            <div className="relative cursor-pointer">
              <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
                <Bell size={18} />
              </div>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-white font-bold cursor-pointer shadow-md">
              {profile.businessName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
