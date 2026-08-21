import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboard, approveVendorGuarded, fetchPendingVendors, resolveActionItemApi } from '../../../services/admin';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import {
  Users, Store, Wallet, Calendar, BellRing, ShieldCheck, Send,
  Star, ArrowUpRight, ArrowDownRight, ChevronRight, CheckCircle2,
  AlertTriangle, Zap, Package, Clock, Activity, Check, X, Eye, Filter,
  ShieldAlert, RefreshCw, FileText, ExternalLink, MessageSquare, DollarSign,
  AlertCircle, ThumbsUp, ThumbsDown, CheckSquare, Sparkles
} from 'lucide-react';
import { ChartCard, ToggleGroup, CustomTooltip, COLORS } from '../components/ChartCard';
import { Modal } from '../components/Modal';

/* ── palette shorthand ── */
const C = COLORS;

/* ── generate revenue 30-day data ── */
const gen30days = () =>
  Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 4, 1 + i);
    const label = `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
    const base = 40000 + Math.random() * 55000;
    return { day: label, thisMonth: Math.round(base), lastMonth: Math.round(base * 0.78 + Math.random() * 8000) };
  });

const revData30 = gen30days();
const revData7  = revData30.slice(23);
const revData3m = (() => {
  const months = ['Mar 1','Mar 8','Mar 15','Mar 22','Apr 1','Apr 8','Apr 15','Apr 22','May 1','May 8','May 15','May 22','May 29'];
  return months.map(day => ({
    day,
    thisMonth: Math.round(35000 + Math.random() * 65000),
    lastMonth: Math.round(28000 + Math.random() * 50000),
  }));
})();

/* ── donut data ── */
const donutData = [
  { name: 'Shop',     value: 910000, color: C.teal   },
  { name: 'Meal',     value: 720000, color: C.blue   },
  { name: 'Event',    value: 420000, color: C.amber  },
  { name: 'Doctor',   value: 580000, color: C.purple },
  { name: 'Memorial', value: 180000, color: C.red    },
];
const totalRevDonut = donutData.reduce((s, d) => s + d.value, 0);

/* ── bar chart data ── */
const weekUsersData = [
  { day: 'Mon', value: 42 }, { day: 'Tue', value: 58 }, { day: 'Wed', value: 71 },
  { day: 'Thu', value: 65 }, { day: 'Fri', value: 80 }, { day: 'Sat', value: 95 }, { day: 'Sun', value: 52 },
];
const ordersBookingsData = [
  { day: 'Mon', orders: 88,  bookings: 42 },
  { day: 'Tue', orders: 124, bookings: 58 },
  { day: 'Wed', orders: 103, bookings: 71 },
  { day: 'Thu', orders: 142, bookings: 65 },
  { day: 'Fri', orders: 189, bookings: 80 },
  { day: 'Sat', orders: 212, bookings: 95 },
  { day: 'Sun', orders: 96,  bookings: 52 },
];
const topVendorsBar = [
  { name: 'Happy Paws Store', revenue: 450000 },
  { name: 'Dr. Rohit Gupta',  revenue: 320000 },
  { name: 'Fresh Meals Ltd',  revenue: 280000 },
  { name: 'Pet Events Magic', revenue: 250000 },
  { name: 'Gentle Care Mem',  revenue: 180000 },
];

/* ── KPI sparklines ── */
const kpis = [
  { title: 'Total Users',    value: '12,450',  label: 'Owners',       change: '+2.3%', up: true,  icon: Users,    color: C.teal,   data: [320,410,380,500,470,620,580,710,680,760], path: '/admin/users' },
  { title: 'Active Vendors', value: '342',     label: 'Vetted',       change: '-0.8%', up: false, icon: Store,    color: C.blue,   data: [80,95,88,102,97,90,88,92,88,85], path: '/admin/vendors' },
  { title: 'Revenue Today',  value: '₹95,200', label: 'Platform',     change: '+12.1%',up: true,  icon: Wallet,   color: C.amber,  data: [420,510,480,600,580,720,700,810,790,950], path: '/admin/finance/transactions' },
  { title: 'Appointments',   value: '148',     label: 'Today',        change: '+5.3%', up: true,  icon: Calendar, color: C.purple, data: [20,35,28,42,38,55,48,60,52,70], path: '/admin/operations/appointments' },
];

/* ── Initial Action Items requiring Admin Attention ── */
const initialActionItems = [
  {
    id: 'ACT-101',
    category: 'Vendor Approval',
    type: 'Veterinarian Partner',
    title: 'Dr. Happy Paws Vet Clinic Registration',
    subtitle: 'Medical License & Clinic Verification Pending',
    details: 'Submitted Practice License #VET-88219 and Clinic Registration Certificate for admin audit.',
    priority: 'Urgent',
    time: '12 mins ago',
    targetId: 'VND-101',
    navPath: '/admin/vendors/pending',
    docName: 'Practice_License_2026.pdf',
    applicant: 'Dr. Ramesh Sharma (Mumbai)'
  },
  {
    id: 'ACT-102',
    category: 'Vendor Approval',
    type: 'Fresh Meals Partner',
    title: 'NutriPaw Organic Meals Co.',
    subtitle: 'FSSAI Food Safety Cert Verification',
    details: 'Applied for Fresh Pet Meal Subscription program. Commission rate requested: 10%.',
    priority: 'High',
    time: '45 mins ago',
    targetId: 'VND-102',
    navPath: '/admin/vendors/pending',
    docName: 'FSSAI_Food_Safety_Cert.pdf',
    applicant: 'Ananya Roy (Bengaluru)'
  },
  {
    id: 'ACT-103',
    category: 'Refund Request',
    type: 'Event Refund',
    title: 'Refund Request #TXN-901',
    subtitle: 'Customer: Rahul Kumar • Amount: ₹1,500',
    details: 'Pet Event "Monsoon Dog Splash" was rescheduled. Client requested immediate full refund.',
    priority: 'Urgent',
    time: '1 hour ago',
    targetId: 'TXN-901',
    navPath: '/admin/operations/refunds',
    amount: '₹1,500',
    applicant: 'Rahul Kumar'
  },
  {
    id: 'ACT-104',
    category: 'Moderation',
    type: 'Spam Feed Report',
    title: 'Reported Feed Post #RPT-501',
    subtitle: 'Reported by: Aisha Khan • Reason: Commercial Spam',
    details: 'Content contains unauthorized external links and unauthorized promotional spam.',
    priority: 'High',
    time: '2 hours ago',
    targetId: 'RPT-501',
    navPath: '/admin/platform/reports',
    applicant: 'Reported User: Spammer_88'
  },
  {
    id: 'ACT-105',
    category: 'Refund Request',
    type: 'Order Return',
    title: 'Refund Request #TXN-902',
    subtitle: 'Customer: Priya Dev • Amount: ₹850',
    details: 'Incorrect dog harness sizing delivered. Item returned and inspected by vendor.',
    priority: 'Medium',
    time: '3 hours ago',
    targetId: 'TXN-902',
    navPath: '/admin/operations/refunds',
    amount: '₹850',
    applicant: 'Priya Dev'
  },
  {
    id: 'ACT-106',
    category: 'Vendor Approval',
    type: 'Memorial Service',
    title: 'Rainbow Bridge Care Services',
    subtitle: 'Last Ride Partner Registration',
    details: 'Submitted tax registry and service menu for pet cremation & memorial plaques.',
    priority: 'Medium',
    time: '5 hours ago',
    targetId: 'VND-103',
    navPath: '/admin/vendors/pending',
    docName: 'GST_Registry_Cert.pdf',
    applicant: 'Sanjay Dutt (Delhi)'
  },
  {
    id: 'ACT-107',
    category: 'Moderation',
    type: 'Review Comment',
    title: 'Review Flag #RPT-502',
    subtitle: 'Reported by: Rahul Kumar • Reason: Abusive Language',
    details: 'Inappropriate language used in seller review comment on vendor page.',
    priority: 'Normal',
    time: '6 hours ago',
    targetId: 'RPT-502',
    navPath: '/admin/platform/reports',
    applicant: 'Reported User: AngryReviewer'
  }
];

/* ── partners table ── */
const partners = [
  { rank:1, name:'Happy Paws Shop Store',    role:'Shop',          revenue:'₹4,50,000', rating:4.8, up:true  },
  { rank:2, name:'Dr. Rohit Gupta Clinic',   role:'Doctor',        revenue:'₹3,20,000', rating:4.9, up:true  },
  { rank:3, name:'Fresh Meals Prep Ltd',     role:'Fresh Meals Partner', revenue:'₹2,80,000', rating:4.5, up:true  },
  { rank:4, name:'Pet Event Magic',          role:'Event',         revenue:'₹2,50,000', rating:4.6, up:false },
  { rank:5, name:'Gentle Care Memorials',    role:'Memorial',      revenue:'₹1,80,000', rating:5.0, up:true  },
  { rank:6, name:'Ravi Pet Clinic',          role:'Shop',          revenue:'₹1,55,000', rating:4.7, up:true  },
];

const roleBadge = r => ({
  Shop:           'bg-teal-50 text-teal-700 border-teal-100',
  Doctor:         'bg-blue-50 text-blue-700 border-blue-100',
  'Fresh Meals Partner':'bg-emerald-50 text-emerald-700 border-emerald-100',
  Event:          'bg-purple-50 text-purple-700 border-purple-100',
  Memorial:       'bg-slate-100 text-slate-600 border-slate-200',
}[r] || 'bg-gray-50 text-gray-500 border-gray-100');

const priorityBadge = p => ({
  Urgent: 'bg-rose-100 text-rose-800 border-rose-200',
  High:   'bg-amber-100 text-amber-800 border-amber-200',
  Medium: 'bg-blue-100 text-blue-800 border-blue-200',
  Normal: 'bg-slate-100 text-slate-700 border-slate-200',
}[p] || 'bg-gray-100 text-gray-700 border-gray-200');

/* ── axis style ── */
const axisTick = { fontSize: 11, fill: '#A0AEC0' };
const gridStroke = '#F0F4F8';

/* ── custom tooltip formatter ── */
const rupeeFmt = v => `₹${(v/1000).toFixed(0)}k`;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [revRange, setRevRange] = useState('1M');
  const [modalOpen, setModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ scope: 'All', title: '', message: '' });
  const [alertSent, setAlertSent] = useState(false);

  // Action Center States
  const [actionItems, setActionItems] = useState([]);
  const [actionCategory, setActionCategory] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);

  const revChartData = revRange === '7D' ? revData7 : revRange === '3M' ? revData3m : revData30;
  const showEvery = revRange === '3M' ? 2 : revRange === '1M' ? 5 : 1;

  // Live KPI headline numbers + Backend Action Items
  const [live, setLive] = useState(null);

  const loadDashboardData = () => {
    fetchAdminDashboard().then(res => {
      setLive(res);
      if (res?.actionItems && Array.isArray(res.actionItems)) {
        setActionItems(res.actionItems);
      }
    }).catch(err => {
      console.warn('Backend fetch failed, using default action center items:', err);
      setActionItems(initialActionItems);
    });
  };

  useEffect(() => { 
    loadDashboardData();
  }, []);

  const kpiCards = live ? kpis.map(k => {
    if (k.title === 'Total Users')    return { ...k, value: (live.kpis.totalUsers || 0).toLocaleString('en-IN') };
    if (k.title === 'Active Vendors') return { ...k, value: String(live.kpis.activeVendors || 0) };
    if (k.title === 'Revenue Today')  return { ...k, value: '₹' + (live.kpis.revenueToday || 0).toLocaleString('en-IN') };
    if (k.title === 'Appointments')   return { ...k, value: String(live.kpis.appointmentsToday || 0) };
    return k;
  }) : kpis;

  // Trigger Toast Notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Direct Approve Handler (Backend Connected)
  const handleApproveAction = async (item, e) => {
    if (e) e.stopPropagation();
    try {
      if (item.category === 'Vendor Approval' && item.targetId) {
        await approveVendorGuarded(item.targetId, item.title);
      }
      await resolveActionItemApi(item.id || item.seedKey || item.targetId, { action: 'approve', note: actionReason });
    } catch (err) {
      console.error('Action resolve failed:', err);
    }
    setActionItems(prev => prev.filter(i => i.id !== item.id));
    setCompletedCount(c => c + 1);
    if (selectedAction?.id === item.id) {
      setActionModalOpen(false);
      setSelectedAction(null);
    }
    showToast(`✓ Action Completed: "${item.title}" approved successfully!`);
    loadDashboardData();
  };

  // Direct Reject / Dismiss Handler (Backend Connected)
  const handleRejectAction = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedAction(item);
    setActionReason('');
    setActionModalOpen(true);
  };

  const confirmRejectAction = async () => {
    if (!selectedAction) return;
    try {
      await resolveActionItemApi(selectedAction.id || selectedAction.seedKey || selectedAction.targetId, { action: 'reject', note: actionReason });
    } catch (err) {
      console.error('Action reject failed:', err);
    }
    setActionItems(prev => prev.filter(i => i.id !== selectedAction.id));
    setCompletedCount(c => c + 1);
    showToast(`✕ Action Item "${selectedAction.title}" rejected/dismissed.`);
    setActionModalOpen(false);
    setSelectedAction(null);
    loadDashboardData();
  };



  const handleBroadcast = e => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    setAlertSent(true);
    setTimeout(() => { setAlertSent(false); setModalOpen(false); setBroadcastForm({ scope:'All', title:'', message:'' }); }, 2000);
  };

  // Filtered action items
  const filteredActions = actionItems.filter(item => {
    if (actionCategory !== 'All' && item.category !== actionCategory) return false;
    if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
    return true;
  });

  const countVendor = actionItems.filter(i => i.category === 'Vendor Approval').length;
  const countRefund = actionItems.filter(i => i.category === 'Refund Request').length;
  const countModeration = actionItems.filter(i => i.category === 'Moderation').length;
  const countUrgent = actionItems.filter(i => i.priority === 'Urgent').length;

  return (
    <div className="space-y-6 pb-6 relative">

      {/* ── Floating Action Toast ── */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="text-emerald-400 shrink-0" size={18} />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── System Health & Quick Action Control Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border bg-slate-900 border-slate-800 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-black tracking-wider text-slate-100 uppercase">PLATFORM HEALTH: 99.98%</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">ALL SYSTEMS ONLINE</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {actionItems.length} action items require admin review • {countUrgent} urgent priority
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl uppercase tracking-wider transition shadow-sm cursor-pointer">
            <BellRing size={12} /> Broadcast Warning
          </button>
        </div>
      </div>

      {/* ── ADMIN ACTION COMMAND CENTER (PRIMARY SPOTLIGHT) ── */}
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-teal-50/20 rounded-2xl border border-teal-200/60 shadow-lg p-5 sm:p-6 relative overflow-hidden">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-500" />

        {/* Action Center Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
              <CheckSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Admin Action Required Center</h2>
                <span className="bg-rose-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                  {actionItems.length} Pending
                </span>
                {completedCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    {completedCount} Resolved Today ✓
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Review and act immediately on pending vendor registrations, refund requests, and content moderation alerts.
              </p>
            </div>
          </div>

          {/* Quick Summary Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button 
              onClick={() => { setActionCategory('Vendor Approval'); setPriorityFilter('All'); }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${actionCategory === 'Vendor Approval' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              <Store size={13} /> Vendors <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px]">{countVendor}</span>
            </button>
            <button 
              onClick={() => { setActionCategory('Refund Request'); setPriorityFilter('All'); }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${actionCategory === 'Refund Request' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              <DollarSign size={13} /> Refunds <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">{countRefund}</span>
            </button>
            <button 
              onClick={() => { setActionCategory('Moderation'); setPriorityFilter('All'); }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${actionCategory === 'Moderation' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              <ShieldAlert size={13} /> Moderation <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px]">{countModeration}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            {['All', 'Vendor Approval', 'Refund Request', 'Moderation'].map(cat => (
              <button key={cat} onClick={() => setActionCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${actionCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority:</span>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-teal-500">
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent Only ({countUrgent})</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Pending Action Cards Grid */}
        {filteredActions.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-xl border border-slate-200/70 p-6">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={36} />
            <h4 className="text-sm font-bold text-slate-800">All Action Items Clear!</h4>
            <p className="text-xs text-slate-500 mt-1">There are currently no pending tasks under this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActions.map(item => (
              <div 
                key={item.id}
                onClick={() => { setSelectedAction(item); setActionModalOpen(true); }}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-teal-400 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group relative"
              >
                <div>
                  {/* Top Badge Line */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {item.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${priorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{item.time}</span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-teal-600 transition leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {item.subtitle}
                  </p>

                  {/* Snippet / Details */}
                  <p className="text-[11.5px] text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {item.details}
                  </p>
                </div>

                {/* Quick Action Button Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedAction(item); setActionModalOpen(true); }}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                  >
                    <Eye size={13} /> Quick Review
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={(e) => handleRejectAction(item, e)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Reject or Reject with Note"
                    >
                      <X size={12} /> Reject
                    </button>
                    <button 
                      onClick={(e) => handleApproveAction(item, e)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-black transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Approve immediately"
                    >
                      <Check size={13} /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI Cards (Interactive) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiCards.map((k, i) => (
          <div key={i} 
            onClick={() => k.path && navigate(k.path)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-0.5 hover:border-teal-200 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform" style={{ background: k.color + '18' }}>
                <k.icon size={17} style={{ color: k.color }} />
              </div>
              <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${k.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {k.up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>} {k.change}
              </span>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{k.title}</p>
            <p className="text-[22px] font-black text-slate-900 leading-none group-hover:text-teal-600 transition">{k.value}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 mb-3">
              <span>{k.label}</span>
              <span className="text-teal-600 font-bold opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">View <ChevronRight size={10}/></span>
            </div>
            {/* Sparkline */}
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={k.data.map((v,j)=>({ v, j }))} margin={{ top:2, right:0, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id={`sg${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={k.color} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={k.color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={k.color} strokeWidth={2}
                  fill={`url(#sg${i})`} dot={false} isAnimationActive={true} animationDuration={800}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: Area + Donut ── */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch">

        {/* CHART 1 — Revenue Last 30 Days */}
        <div className="lg:w-[60%] min-w-0">
          <ChartCard title="Revenue Last 30 Days" subtitle="This month vs last month"
            toggle={<ToggleGroup options={['7D','1M','3M']} value={revRange} onChange={setRevRange}/>}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revChartData} margin={{ top:10, right:8, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.teal} stopOpacity={0.15}/>
                    <stop offset="100%" stopColor={C.teal} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridStroke}/>
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false}
                  interval={showEvery - 1} dy={6}/>
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={rupeeFmt} width={44}/>
                <Tooltip content={<CustomTooltip formatter={rupeeFmt}/>}/>
                <Area type="monotone" dataKey="thisMonth" name="This Month" stroke={C.teal} strokeWidth={2.5}
                  fill="url(#areaGrad)" dot={false} activeDot={{ r:5, fill:C.teal }} animationDuration={800}/>
                <Line type="monotone" dataKey="lastMonth" name="Last Month" stroke={C.blue} strokeWidth={2}
                  strokeDasharray="5 3" dot={false} activeDot={{ r:4, fill:C.blue }} animationDuration={800}/>
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-5 mt-1">
              {[{c:C.teal,dash:false,l:'This Month'},{c:C.blue,dash:true,l:'Last Month'}].map((x,i)=>(
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <svg width="20" height="2" viewBox="0 0 20 2">
                    <line x1="0" y1="1" x2="20" y2="1" stroke={x.c} strokeWidth="2.5" strokeDasharray={x.dash?"5 3":"0"}/>
                  </svg>
                  {x.l}
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* CHART 2 — Revenue by Vendor Type (Donut) */}
        <div className="lg:w-[40%] min-w-0">
          <ChartCard title="Revenue by Vendor Type" subtitle="Platform billing distribution">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Donut */}
              <div className="relative shrink-0" style={{ width:160, height:160 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={donutData} cx={75} cy={75} innerRadius={52} outerRadius={78}
                      paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={600}>
                      {donutData.map((d,i)=><Cell key={i} fill={d.color} stroke="none"/>)}
                    </Pie>
                    <Tooltip formatter={v=>`₹${(v/100000).toFixed(1)}L`} content={<CustomTooltip />}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                  <span className="text-[15px] font-black text-slate-800">₹28.1L</span>
                </div>
              </div>
              {/* Legend right */}
              <div className="flex flex-col gap-2 flex-1">
                {donutData.map((d,i)=>(
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:d.color }}/>
                      <span className="text-[11px] font-medium text-slate-600">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-800">₹{(d.value/100000).toFixed(1)}L</span>
                      <span className="text-[10px] text-slate-400 ml-1">{Math.round(d.value/totalRevDonut*100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Charts Row 2: 3 bar charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* CHART 3 — New Users This Week */}
        <ChartCard title="New Users This Week" subtitle="Daily registrations Mon–Sun">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekUsersData} margin={{ top:14, right:8, left:-20, bottom:0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke}/>
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} dy={6}/>
              <YAxis tick={axisTick} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="value" name="Users" fill={C.teal} radius={[4,4,0,0]} maxBarSize={36}
                isAnimationActive animationDuration={600} animationEasing="ease-out">
                <LabelList dataKey="value" position="top" style={{ fontSize:10, fill:'#A0AEC0' }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CHART 4 — Orders vs Bookings */}
        <ChartCard title="Orders vs Bookings" subtitle="This week grouped comparison">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersBookingsData} margin={{ top:14, right:8, left:-20, bottom:0 }} barGap={3}>
              <CartesianGrid vertical={false} stroke={gridStroke}/>
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} dy={6}/>
              <YAxis tick={axisTick} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:'#718096', paddingTop:4 }}/>
              <Bar dataKey="orders"   name="Orders"   fill={C.teal} radius={[4,4,0,0]} barSize={14}
                isAnimationActive animationDuration={600}/>
              <Bar dataKey="bookings" name="Bookings" fill={C.blue} radius={[4,4,0,0]} barSize={14}
                isAnimationActive animationDuration={700}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CHART 5 — Top 5 Vendors by Revenue (horizontal) */}
        <ChartCard title="Top 5 Vendors by Revenue" subtitle="Monthly gross billing">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={topVendorsBar} margin={{ top:4, right:48, left:0, bottom:0 }}>
              <CartesianGrid horizontal={false} stroke={gridStroke}/>
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={rupeeFmt}/>
              <YAxis type="category" dataKey="name" width={105} tick={axisTick} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip formatter={rupeeFmt}/>}/>
              <Bar dataKey="revenue" name="Revenue" fill={C.teal} radius={[0,4,4,0]} maxBarSize={22}
                isAnimationActive animationDuration={600}>
                <LabelList dataKey="revenue" position="right" formatter={rupeeFmt} style={{ fontSize:10, fill:'#718096' }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Partners Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide">Top Performing Partners</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Ranked by monthly gross billing</p>
          </div>
          <span 
            onClick={() => navigate('/admin/vendors')}
            className="text-[11px] font-bold text-teal-500 hover:text-teal-700 cursor-pointer flex items-center gap-0.5 transition">
            View All <ChevronRight size={12}/>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/70">
                {['#','Vendor','Type','Revenue','Rating','Trend'].map(h=>(
                  <th key={h} className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {partners.map(p=>(
                <tr key={p.rank} className="hover:bg-teal-50/40 transition-colors group">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500">{p.rank}</span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-teal-600 transition">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${roleBadge(p.role)}`}>{p.role}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-black text-slate-800 whitespace-nowrap">{p.revenue}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400"/>
                      <span className="text-[12px] font-black text-slate-700">{p.rating}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${p.up?'text-emerald-600':'text-rose-500'}`}>
                      {p.up ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                      {p.up ? 'Growing' : 'Declining'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action Review Modal ── */}
      {selectedAction && (
        <Modal 
          isOpen={actionModalOpen} 
          onClose={() => setActionModalOpen(false)} 
          title={`Action Review: ${selectedAction.category}`}
          footer={(
            <>
              <button 
                onClick={() => {
                  if (selectedAction.navPath) {
                    navigate(selectedAction.navPath);
                    setActionModalOpen(false);
                  }
                }}
                className="px-3.5 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer mr-auto"
              >
                Go to Full Page <ExternalLink size={13} />
              </button>

              <button 
                onClick={confirmRejectAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                Confirm Reject / Dismiss
              </button>

              <button 
                onClick={() => handleApproveAction(selectedAction)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                Approve & Resolve Now <Check size={14} />
              </button>
            </>
          )}
        >
          <div className="space-y-4 text-slate-700">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Item ID</span>
                <p className="text-xs font-bold text-slate-900">{selectedAction.targetId || selectedAction.id}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority</span>
                <p><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${priorityBadge(selectedAction.priority)}`}>{selectedAction.priority}</span></p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Submitted</span>
                <p className="text-xs font-semibold text-slate-700">{selectedAction.time}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">{selectedAction.title}</h4>
              <p className="text-xs text-slate-500 font-semibold">{selectedAction.subtitle}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Details & Context</span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{selectedAction.details}</p>

              {selectedAction.docName && (
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                    <FileText size={14} className="text-teal-600" /> Attached File: {selectedAction.docName}
                  </span>
                  <span className="text-teal-600 font-bold hover:underline cursor-pointer">Preview Doc</span>
                </div>
              )}

              {selectedAction.applicant && (
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-bold">Applicant / User:</span> {selectedAction.applicant}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Note / Rejection Reason (Optional for Reject)
              </label>
              <textarea 
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="Enter feedback note if rejecting or requesting changes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 resize-none min-h-[70px]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Broadcast Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Broadcast System Warning"
        footer={(
          <>
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition cursor-pointer">
              Cancel
            </button>
            <button onClick={handleBroadcast}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer">
              Transmit Now <Send size={12}/>
            </button>
          </>
        )}>
        {alertSent ? (
          <div className="text-center py-6 text-emerald-600 font-semibold space-y-2">
            <ShieldCheck size={40} className="mx-auto text-emerald-500 animate-bounce"/>
            <p>BROADCAST ALERT TRANSMITTED SUCCESSFULLY!</p>
          </div>
        ) : (
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Audience *</label>
              <select value={broadcastForm.scope} onChange={e => setBroadcastForm({...broadcastForm, scope:e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white cursor-pointer">
                <option value="All">All Registered Clients & Partners</option>
                <option value="Users">Pet Owners Only</option>
                <option value="Vendors">Vendors / Partners Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Alert Title *</label>
              <input type="text" required value={broadcastForm.title}
                onChange={e => setBroadcastForm({...broadcastForm, title:e.target.value})}
                placeholder="e.g. Scheduled Maintenance Window"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Message Body *</label>
              <textarea required value={broadcastForm.message}
                onChange={e => setBroadcastForm({...broadcastForm, message:e.target.value})}
                placeholder="Type the warning or announcement content..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 min-h-[90px] bg-white resize-none"/>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default AdminDashboard;