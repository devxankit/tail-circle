import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Bell, LogOut, LayoutDashboard, Users, PawPrint, Store, 
  Settings, Shield, ChevronDown, ChevronRight, Activity, Calendar, 
  ShoppingBag, ClipboardList, Briefcase, FileText, PieChart, 
  ShieldAlert, Cpu, Database, Search, Package, DollarSign,
  HeartPulse, Navigation, MessageSquare, AlertTriangle, Layers
} from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';
import { adminLogout } from '../../../services/admin';

const navigationGroups = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Pets', path: '/admin/pets', icon: PawPrint },
    ]
  },
  {
    title: 'Vendors',
    icon: Store,
    subItems: [
      { label: 'All Vendors', path: '/admin/vendors' },
      { label: 'Pending Approvals', path: '/admin/vendors/pending' },
      { label: 'Shop Partners', path: '/admin/vendors/shop' },
      { label: 'Fresh Meals Partners', path: '/admin/vendors/meal' },
      { label: 'Events Partners', path: '/admin/vendors/event' },
      { label: 'Doctors / Clinics', path: '/admin/vendors/doctors' },
      { label: 'Last Ride Partners', path: '/admin/vendors/memorial' },
      { label: 'Vendor Documents', path: '/admin/vendors/documents' },
      { label: 'Vendor Performance', path: '/admin/vendors/performance' },
    ]
  },
  {
    title: 'Operations',
    icon: Briefcase,
    subItems: [
      { label: 'Orders', path: '/admin/operations/orders' },
      { label: 'Bookings', path: '/admin/operations/bookings' },
      { label: 'Appointments', path: '/admin/operations/appointments' },
      { label: 'Deliveries', path: '/admin/operations/deliveries' },
      { label: 'Returns & Refunds', path: '/admin/operations/refunds' },
      { label: 'Support Tickets', path: '/admin/operations/support' },
    ]
  },
  {
    title: 'Services',
    icon: Layers,
    subItems: [
      { label: 'Products', path: '/admin/services/products' },
      { label: 'Product Categories', path: '/admin/services/product-categories' },
      { label: 'Meal Plans', path: '/admin/services/meal-plans' },
      { label: 'Doctor Services', path: '/admin/services/doctor-services' },
      { label: 'Event Categories', path: '/admin/services/event-categories' },
      { label: 'Memorial Packages', path: '/admin/services/memorial-packages' },
      { label: 'Grooming / Day Care', path: '/admin/services/grooming' },
      { label: 'Add-ons & Amenities', path: '/admin/services/addons' },
      { label: 'Breed Management', path: '/admin/services/breeds' },
    ]
  },
  {
    title: 'Finance',
    icon: DollarSign,
    subItems: [
      { label: 'Transactions', path: '/admin/finance/transactions' },
      { label: 'Payments', path: '/admin/finance/payments' },
      { label: 'Commission', path: '/admin/finance/commission' },
      { label: 'Vendor Payouts', path: '/admin/finance/payouts' },
      { label: 'Wallet', path: '/admin/finance/wallet' },
      { label: 'Tax / GST Reports', path: '/admin/finance/tax' },
    ]
  },
  {
    title: 'Platform',
    icon: Settings,
    subItems: [
      { label: 'Notifications', path: '/admin/platform/notifications' },
      { label: 'Community', path: '/admin/platform/community' },
      { label: 'Reviews', path: '/admin/platform/reviews' },
      { label: 'Banners & Content', path: '/admin/platform/content' },
      { label: 'Reports', path: '/admin/platform/reports' },
      { label: 'Security', path: '/admin/platform/security' },
      { label: 'Admin Staff & Roles', path: '/admin/platform/staff' },
      { label: 'Settings', path: '/admin/platform/settings' },
    ]
  }
];

// Reusable Collapsible Menu Item
const CollapsibleNavGroup = ({ group, currentPath, openGroups, toggleGroup }) => {
  const isOpen = openGroups[group.title];
  const isActiveGroup = group.subItems.some(sub => currentPath.startsWith(sub.path));

  return (
    <div className="mb-1 relative group">
      <button
        onClick={() => toggleGroup(group.title)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer",
          isActiveGroup ? "bg-slate-800 text-white" : "text-slate-200 hover:text-white hover:bg-white/10"
        )}
      >
        <div className="flex items-center gap-3">
          {group.icon && <group.icon size={18} className={isActiveGroup ? "text-white shrink-0" : "text-slate-300 shrink-0"} />}
          <span className="block sm:hidden lg:block">{group.title}</span>
        </div>
        <div className="block sm:hidden lg:block">
          {isOpen ? <ChevronDown size={14} className="text-slate-300 shrink-0" /> : <ChevronRight size={14} className="text-slate-300 shrink-0" />}
        </div>
      </button>
      
      {/* Tooltip for Tablet */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none hidden sm:block lg:hidden z-50 whitespace-nowrap shadow-lg border border-slate-700">
        {group.title}
      </div>

      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out sm:hidden lg:block",
        isOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="pl-9 pr-2 space-y-1 py-1">
          {group.subItems.map((subItem) => {
            const isSubActive = currentPath === subItem.path;
            return (
              <Link
                key={subItem.path}
                to={subItem.path}
                className={cn(
                  "block px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isSubActive 
                    ? "bg-[#66B4B1]/10 text-[#66B4B1]" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
              >
                {subItem.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [admin, setAdmin] = useState({ name: 'SuperAdmin', role: 'System Administrator' });
  
  // Track open accordion groups
  const [openGroups, setOpenGroups] = useState({
    Vendors: location.pathname.includes('/vendors'),
    Operations: location.pathname.includes('/operations'),
    Services: location.pathname.includes('/services'),
    Finance: location.pathname.includes('/finance'),
    Platform: location.pathname.includes('/platform')
  });

  useEffect(() => {
    const token = localStorage.getItem('tc_access_token');
    const info = localStorage.getItem('admin_info');
    if (!token || !info) {
      navigate('/admin/login');
    } else {
      setAdmin(JSON.parse(info));
    }
  }, [navigate]);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Find active label for header
  const getHeaderTitle = () => {
    for (const group of navigationGroups) {
      if (group.items) {
        const found = group.items.find(i => i.path === location.pathname);
        if (found) return found.label;
      }
      if (group.subItems) {
        const found = group.subItems.find(i => i.path === location.pathname);
        if (found) return found.label;
      }
    }
    return 'Platform Command Center';
  };

  return (
    <div className="min-h-screen flex font-sans" style={{ background: '#F8FAFC' }}>

      {/* ── Dark Slate Sidebar (Admin) ─────────────────── */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 bg-[#0B1120]",
          /* Mobile: Off-screen or overlay */
          "w-[280px] -translate-x-full sm:w-[64px] sm:translate-x-0 lg:w-[240px]",
          /* If sidebarOpen is true on mobile, override translate */
          sidebarOpen && "translate-x-0"
        )}
        style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.08)' }}
      >
        {/* Brand Header */}
        <div className="h-[56px] lg:h-[72px] px-4 lg:px-6 flex items-center justify-between shrink-0 border-b border-white/5 overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-max">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">TC</span>
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tight leading-none">TailCircle</p>
              <p className="text-emerald-400/80 text-[10px] font-semibold uppercase tracking-widest leading-none mt-1">Super Admin</p>
            </div>
          </div>
          <button
            className="sm:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-4 flex-1 overflow-y-auto custom-scrollbar">
          {navigationGroups.map((group, idx) => {
            if (group.items) {
              // Flat items
              return (
                <div key={idx} className="mb-4">
                  <p className="px-3 mb-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest block sm:hidden lg:block">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const active = location.pathname === item.path;
                      return (
                        <div key={item.path} className="relative group">
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                              active
                                ? "bg-[#66B4B1] text-white shadow-lg shadow-[#80C1BF]/20"
                                : "text-slate-200 hover:text-white hover:bg-white/10"
                            )}
                          >
                            <item.icon size={18} className={active ? "text-white shrink-0" : "text-slate-300 shrink-0"} />
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
                </div>
              );
            } else {
              // Grouped Accordion Items
              return (
                <CollapsibleNavGroup 
                  key={idx} 
                  group={group} 
                  currentPath={location.pathname} 
                  openGroups={openGroups} 
                  toggleGroup={toggleGroup} 
                />
              );
            }
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 shrink-0 border-t border-white/5">
          <div className="bg-slate-800/20 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-[#66B4B1] font-bold text-sm border border-slate-600">
                S
              </div>
              <div className="overflow-hidden">
                <p className="text-gray-200 text-xs font-bold truncate">System Admin</p>
                <p className="text-[#66B4B1] text-[10px] font-extrabold uppercase tracking-widest leading-none mt-1">SUPERADMIN</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10"
            >
              Sign Out →
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────── */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0 max-w-full overflow-x-hidden sm:ml-[64px] lg:ml-[240px]")}>

        {/* Top Navbar */}
        <header className="h-[56px] lg:h-[72px] bg-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30" style={{ boxShadow: '0 1px 0 #E8EAF0' }}>
          <div className="flex items-center gap-4">
            <button
              className="p-2 -ml-2 rounded-xl text-gray-400 hover:bg-gray-100 cursor-pointer transition sm:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-[11px] text-gray-400 font-semibold">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">
                {getHeaderTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:flex items-center">
              <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search platform..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64 transition"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System Online
            </div>

            <div className="relative">
              <button
                className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 relative cursor-pointer transition"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              </button>
            </div>

            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm cursor-pointer shrink-0 bg-slate-800 shadow-sm">
              {admin.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0 max-w-full" style={{ background: '#F8FAFC' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 sm:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

export default AdminLayout;