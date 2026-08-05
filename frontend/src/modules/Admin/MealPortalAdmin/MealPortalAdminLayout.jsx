import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Utensils, FileText, CalendarCheck, Truck, Map, 
  Store, ListChecks, Users, HeartPulse, Package, Tag, Wallet, 
  BarChart3, Settings, LogOut, Bell, Search, Menu, Globe
} from 'lucide-react';
import { cn } from '../../user/utils/cn';

export function MealPortalAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuSections = [
    {
      title: 'Main Platform',
      items: [
        { path: '/admin/meal-portal/dashboard', label: 'Platform Overview', icon: LayoutDashboard },
        { path: '/admin/meal-portal/plans', label: 'All Meal Plans', icon: Utensils },
        { path: '/admin/meal-portal/subscriptions', label: 'Global Subscriptions', icon: FileText },
        { path: '/admin/meal-portal/trials', label: 'Trial Meal Controls', icon: CalendarCheck },
        { path: '/admin/meal-portal/deliveries', label: 'Delivery Operations', icon: Truck },
        { path: '/admin/meal-portal/tracking', label: 'Live GPS Tracking', icon: Map },
      ]
    },
    {
      title: 'Operations & Vendors',
      items: [
        { path: '/admin/meal-portal/vendors', label: 'Vendor Management', icon: Store },
        { path: '/admin/meal-portal/kitchens', label: 'Global Kitchen Queue', icon: ListChecks },
        { path: '/admin/meal-portal/inventory', label: 'Platform Inventory', icon: Package },
      ]
    },
    {
      title: 'Customers & Support',
      items: [
        { path: '/admin/meal-portal/nutrition', label: 'Pet Nutrition DB', icon: HeartPulse },
        { path: '/admin/meal-portal/support', label: 'Reviews & Tickets', icon: Tag },
        { path: '/admin/meal-portal/users', label: 'User Directory', icon: Users },
      ]
    },
    {
      title: 'Finance & Analytics',
      items: [
        { path: '/admin/meal-portal/finance', label: 'Revenue & Settlements', icon: Wallet },
        { path: '/admin/meal-portal/analytics', label: 'Reports & Analytics', icon: BarChart3 },
        { path: '/admin/meal-portal/settings', label: 'Platform Settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Dark Navy Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#40716F] flex flex-col transition-all duration-300 ease-in-out shadow-2xl shadow-slate-900/50",
        "w-[280px] -translate-x-full sm:w-[64px] sm:translate-x-0 lg:w-[240px]",
        sidebarOpen && "translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="h-[56px] lg:h-[72px] px-4 lg:px-6 flex items-center shrink-0 border-b border-white/10 overflow-hidden">
          <Link to="/" className="flex items-center gap-2 min-w-max">
            <Globe className="text-slate-400" size={24} />
            <span className="text-xl font-black text-white tracking-tighter block sm:hidden lg:block">Meal<span className="text-slate-400">Portal</span><span className="text-[10px] ml-1 text-slate-400 font-normal uppercase tracking-widest">HQ</span></span>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 block sm:hidden lg:block">
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = location.pathname.includes(item.path);
                return (
                  <div key={item.label} className="relative group">
                    <Link
                      to={item.path}
                      onClick={() => { if(window.innerWidth < 1024) setSidebarOpen(false); }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                        active ? "bg-slate-700 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon size={18} className={cn("shrink-0 transition-transform", active ? "text-white" : "text-slate-500", !active && "group-hover:scale-110")} />
                      <span className="block sm:hidden lg:block">{item.label}</span>
                    </Link>
                    {/* Tooltip for Tablet */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none hidden sm:block lg:hidden z-50 whitespace-nowrap shadow-lg border border-slate-700">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 shadow-inner">
                SA
              </div>
              <div className="overflow-hidden hidden lg:block">
                <p className="text-white text-xs font-bold truncate">Super Admin</p>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> System Active</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-black rounded-lg text-slate-300 text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              <LogOut size={13} className="shrink-0" /> <span className="block sm:hidden lg:block">Exit Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 sm:pl-[64px] lg:pl-[240px]">
        
        {/* Top Navbar */}
        <header className="h-[56px] lg:h-[72px] bg-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm border-b border-slate-100">
          <div className="flex items-center gap-4 flex-1">
            <button className="sm:hidden p-2 -ml-2 rounded-xl text-gray-400 hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            
            {/* Global Search */}
            <div className="hidden md:flex relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Global search across users, vendors, orders..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer">
              <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
                <Bell size={18} />
              </div>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
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
