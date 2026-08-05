import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut, LayoutDashboard, Store, ClipboardList, ShieldAlert, Heart, Calendar, HelpCircle, FileText, User, Search, Video, Users, Syringe, Clock, Activity, CreditCard, Award, Settings } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';
import { getStoredVendor, vendorLogout } from '../../../services/vendor';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../../services/notifications';

// Backend vendorType → the portal role slug the menus/routes use.
const TYPE_TO_SLUG = {
  shop: 'shop',
  clinic: 'doctor',
  meal_subscription: 'meal',
  events: 'event',
  memorial: 'memorial',
  grooming: 'grooming',
  daycare: 'daycare',
};

export function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const stored = getStoredVendor();
  const vendorRole = TYPE_TO_SLUG[stored?.profile?.vendorType] || 'shop';

  const vendorName = stored?.profile?.businessName || (vendorRole === 'doctor' ? 'Dr.' : 'My Business');

  const vendorLogo = stored?.profile?.logo;

  const handleLogout = () => {
    vendorLogout();
    navigate('/vendor/login');
  };

  const getMenuSections = () => {
    if (vendorRole === 'doctor') {
      return [
        {
          title: 'MAIN',
          items: [
            { label: 'Dashboard', path: '/vendor/doctor/consultations', search: '?view=dashboard', icon: LayoutDashboard },
            { label: 'Appointments', path: '/vendor/doctor/consultations', search: '?view=appointments_list', icon: Calendar },
            { label: 'Emergency Requests', path: '/vendor/doctor/consultations', search: '?view=emergency', icon: ShieldAlert },
            { label: 'Video Consultations', path: '/vendor/doctor/consultations', search: '?view=video_consultations', icon: Video },
            { label: 'Patient Registry', path: '/vendor/doctor/consultations', search: '?view=patients_list', icon: Users },
            { label: 'Medical Records', path: '/vendor/doctor/consultations', search: '?view=medical_records', icon: ClipboardList },
            { label: 'Prescriptions', path: '/vendor/doctor/consultations', search: '?view=prescriptions', icon: FileText },
            { label: 'Vaccination Tracker', path: '/vendor/doctor/consultations', search: '?view=vaccinations', icon: Syringe },
          ]
        },
        {
          title: 'OPERATIONS',
          items: [
            { label: 'Follow-Ups', path: '/vendor/doctor/consultations', search: '?view=follow_ups', icon: Activity },
            { label: 'Clinic Schedule', path: '/vendor/doctor/consultations', search: '?view=schedule', icon: Clock },
            { label: 'Availability Calendar', path: '/vendor/doctor/consultations', search: '?view=availability', icon: Calendar },
            { label: 'Lab Reports', path: '/vendor/doctor/consultations', search: '?view=lab_reports', icon: FileText },
            { label: 'Billing & Payments', path: '/vendor/payouts', icon: CreditCard },
          ]
        },
        {
          title: 'COMMUNICATION',
          items: [
            { label: 'Notifications', path: '/vendor/doctor/consultations', search: '?view=notifications', icon: Bell },
            { label: 'Client Support', path: '/vendor/support', icon: HelpCircle },
          ]
        },
        {
          title: 'ACCOUNT',
          items: [
            // Vet profile, per-mode fees, video overtime rate and policies —
            // the generic /vendor/profile page has none of these.
            { label: 'Profile & Fees', path: '/vendor/doctor/consultations', search: '?view=vet_profile', icon: User },
            { label: 'Certifications', path: '/vendor/doctor/consultations', search: '?view=vet_profile', icon: Award },
            { label: 'Earnings & Payouts', path: '/vendor/payouts', icon: CreditCard },
            { label: 'Settings', path: '/vendor/settings', icon: Settings },
          ]
        }
      ];
    }

    // Grooming salon and daycare centre — both Provider-backed, same shape.
    if (vendorRole === 'grooming' || vendorRole === 'daycare') {
      const base = vendorRole === 'grooming' ? '/vendor/grooming-provider' : '/vendor/daycare-provider';
      const serviceLabel = vendorRole === 'grooming' ? 'Packages & Add-ons' : 'Plans & Add-ons';
      return [
        {
          title: 'MAIN',
          items: [
            { label: 'Dashboard', path: base, icon: LayoutDashboard },
            { label: 'Bookings', path: base, search: '?view=bookings', icon: ClipboardList },
            { label: serviceLabel, path: base, search: '?view=services', icon: Store },
            { label: 'Time Slots', path: base, search: '?view=slots', icon: Clock },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { label: vendorRole === 'grooming' ? 'Salon Profile' : 'Centre Profile', path: base, search: '?view=profile', icon: User },
            { label: 'Earnings & Payouts', path: '/vendor/payouts', icon: CreditCard },
            { label: 'Client Support', path: '/vendor/support', icon: HelpCircle },
            { label: 'Settings', path: '/vendor/settings', icon: Settings },
          ],
        },
      ];
    }

    // Default generic / Shop Vendor menus
    return [
      {
        title: 'MAIN',
        items: [
          ...(vendorRole === 'shop' ? [{ label: 'Shop Operations Portal', path: '/vendor/shop-provider', icon: Store }] : []),
          ...(vendorRole === 'meal' ? [{ label: 'Meal Provider Portal', path: '/vendor/meal-provider/dashboard', icon: Heart }] : []),
          ...(vendorRole === 'event' ? [{ label: 'Events Portal', path: '/vendor/events-organizer', icon: Calendar }] : []),
          ...(vendorRole === 'memorial' ? [{ label: 'Memorial Portal', path: '/vendor/memorial-provider', icon: ShieldAlert }] : []),
        ]
      },
      {
        title: 'HELP',
        items: [
          { label: 'Settlements & Payouts', path: '/vendor/payouts', icon: FileText },
          { label: 'Client Support', path: '/vendor/support', icon: HelpCircle }
        ]
      }
    ];
  };

  const menuSections = getMenuSections();

  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    fetchNotifications().then((res) => setNotifications(res.items)).catch(() => setNotifications([]));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch { /* best-effort */ }
  };

  const handleNotifClick = async (n) => {
    if (!n.unread) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    try { await markNotificationRead(n.id); } catch { /* best-effort */ }
  };

  const currentPage = menuSections.flatMap(s => s.items).find(item => {
    const itemFullUrl = item.search ? item.path + item.search : item.path;
    const currentFullUrl = location.pathname + location.search;
    return item.search 
      ? currentFullUrl === itemFullUrl 
      : location.pathname === item.path && (!location.search || vendorRole !== 'doctor');
  });

  useEffect(() => {
    const token = localStorage.getItem('tc_access_token');
    const info = localStorage.getItem('vendor_info');
    if (!token || !info) {
      navigate('/vendor/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex vendor-area" style={{ background: '#F8FAFC' }}>

      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 sm:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* ── Black & White Theme Sidebar (Vendor) ────────────────────────── */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 bg-black border-r border-neutral-800",
          "w-[280px] -translate-x-full sm:w-[64px] sm:translate-x-0 lg:w-[240px]",
          sidebarOpen && "translate-x-0"
        )}
        style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.2)' }}
      >
        {/* Brand Header */}
        <div className="h-[56px] lg:h-[72px] px-4 lg:px-6 flex items-center justify-between shrink-0 border-b border-neutral-800 overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-max">
            {/* Logo Circle */}
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              {vendorLogo ? (
                <img src={vendorLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm tracking-tight">{vendorName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-black text-sm tracking-tight leading-none truncate w-[130px]">{vendorName}</p>
              <p className="text-neutral-400 text-[10px] font-semibold uppercase tracking-widest leading-none mt-1 truncate">
                {vendorRole} PORTAL
              </p>
            </div>
          </div>
          <button
            className="sm:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav Section Label */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest block sm:hidden lg:block">Main</p>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 flex-1 space-y-4 overflow-y-auto custom-scrollbar pb-6">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="pt-2 pb-1 px-3">
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest block sm:hidden lg:block">{section.title}</p>
                </div>
              )}
              {section.items.map((item) => {
                const itemFullUrl = item.search ? item.path + item.search : item.path;
                const currentFullUrl = location.pathname + location.search;
                const active = item.search 
                  ? currentFullUrl === itemFullUrl 
                  : location.pathname === item.path && (!location.search || vendorRole !== 'doctor');
                
                return (
                  <div key={item.label} className="relative group">
                    <Link
                      to={itemFullUrl}
                      onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                        active
                          ? "bg-white text-black font-bold shadow-md shadow-white/10"
                          : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                      )}
                    >
                      <item.icon size={18} className={cn("shrink-0", active ? "text-black" : "text-neutral-400 group-hover:text-white")} />
                      <span className="block sm:hidden lg:block">{item.label}</span>
                    </Link>
                    {/* Tooltip for Tablet */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none hidden sm:block lg:hidden z-50 whitespace-nowrap shadow-lg border border-neutral-800">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer – Profile + Logout */}
        <div className="p-4 shrink-0 border-t border-neutral-800">
          <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 border border-neutral-700 overflow-hidden">
                {vendorLogo ? (
                  <img src={vendorLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  vendorName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden hidden lg:block">
                <p className="text-white text-xs font-bold truncate">{vendorName}</p>
                <p className="text-neutral-400 text-[10px] font-semibold uppercase tracking-wider truncate">{vendorRole} Partner</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white text-xs font-bold transition cursor-pointer border border-neutral-700"
            >
              <LogOut size={13} className="shrink-0" />
              <span className="block sm:hidden lg:block">Terminate Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
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
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                {currentPage?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 relative cursor-pointer transition"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={17} />
                {notifications.some((n) => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">Notifications</span>
                      <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-slate-600 hover:underline cursor-pointer">Mark all read</button>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} onClick={() => handleNotifClick(n)} className={cn("p-4 text-sm hover:bg-gray-50 transition cursor-pointer", n.unread && "bg-slate-50/50")}>
                          <p className={cn("text-gray-700", n.unread ? "font-semibold" : "font-normal")}>{n.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{n.msg}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                        </div>
                      ))}
                      {!notifications.length && (
                        <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm cursor-pointer shrink-0 bg-slate-800">
              {vendorLogo ? (
                <img src={vendorLogo} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
              ) : (
                vendorName ? vendorName.charAt(0).toUpperCase() : 'V'
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto" style={{ background: '#F8FAFC' }}>
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

export default VendorLayout;