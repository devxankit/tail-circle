import React, { useState, useEffect } from 'react';
import { fetchAdminDashboard } from '../../../services/admin';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import {
  Users, Store, Wallet, Calendar, BellRing, ShieldCheck, Send,
  Star, ArrowUpRight, ArrowDownRight, ChevronRight, CheckCircle2,
  AlertTriangle, Zap, Package, Clock, Activity
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
  { title: 'Total Users',    value: '12,450',  label: 'Owners',       change: '+2.3%', up: true,  icon: Users,    color: C.teal,   data: [320,410,380,500,470,620,580,710,680,760] },
  { title: 'Active Vendors', value: '342',     label: 'Vetted',       change: '-0.8%', up: false, icon: Store,    color: C.blue,   data: [80,95,88,102,97,90,88,92,88,85] },
  { title: 'Revenue Today',  value: '₹95,200', label: 'Platform',     change: '+12.1%',up: true,  icon: Wallet,   color: C.amber,  data: [420,510,480,600,580,720,700,810,790,950] },
  { title: 'Appointments',   value: '148',     label: 'Today',        change: '+5.3%', up: true,  icon: Calendar, color: C.purple, data: [20,35,28,42,38,55,48,60,52,70] },
];

/* ── partners table ── */
const partners = [
  { rank:1, name:'Happy Paws Shop Store',    role:'Shop',          revenue:'₹4,50,000', rating:4.8, up:true  },
  { rank:2, name:'Dr. Rohit Gupta Clinic',   role:'Doctor',        revenue:'₹3,20,000', rating:4.9, up:true  },
  { rank:3, name:'Fresh Meals Prep Ltd',     role:'Meal Provider', revenue:'₹2,80,000', rating:4.5, up:true  },
  { rank:4, name:'Pet Event Magic',          role:'Event',         revenue:'₹2,50,000', rating:4.6, up:false },
  { rank:5, name:'Gentle Care Memorials',    role:'Memorial',      revenue:'₹1,80,000', rating:5.0, up:true  },
  { rank:6, name:'Ravi Pet Clinic',          role:'Shop',          revenue:'₹1,55,000', rating:4.7, up:true  },
];

const roleBadge = r => ({
  Shop:           'bg-teal-50 text-teal-700 border-teal-100',
  Doctor:         'bg-blue-50 text-blue-700 border-blue-100',
  'Meal Provider':'bg-emerald-50 text-emerald-700 border-emerald-100',
  Event:          'bg-purple-50 text-purple-700 border-purple-100',
  Memorial:       'bg-slate-100 text-slate-600 border-slate-200',
}[r] || 'bg-gray-50 text-gray-500 border-gray-100');

/* ── axis style ── */
const axisTick = { fontSize: 11, fill: '#A0AEC0' };
const gridStroke = '#F0F4F8';

/* ── custom tooltip formatter ── */
const rupeeFmt = v => `₹${(v/1000).toFixed(0)}k`;

export function AdminDashboard() {
  const [revRange, setRevRange] = useState('1M');
  const [modalOpen, setModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ scope: 'All', title: '', message: '' });
  const [alertSent, setAlertSent] = useState(false);

  const revChartData = revRange === '7D' ? revData7 : revRange === '3M' ? revData3m : revData30;
  const showEvery = revRange === '3M' ? 2 : revRange === '1M' ? 5 : 1;

  // Live KPI headline numbers (charts stay decorative demo series).
  const [live, setLive] = useState(null);
  useEffect(() => { fetchAdminDashboard().then(setLive).catch(() => {}); }, []);
  const kpiCards = live ? kpis.map(k => {
    if (k.title === 'Total Users')    return { ...k, value: (live.kpis.totalUsers || 0).toLocaleString('en-IN') };
    if (k.title === 'Active Vendors') return { ...k, value: String(live.kpis.activeVendors || 0) };
    if (k.title === 'Revenue Today')  return { ...k, value: '₹' + (live.kpis.revenueToday || 0).toLocaleString('en-IN') };
    if (k.title === 'Appointments')   return { ...k, value: String(live.kpis.appointmentsToday || 0) };
    return k;
  }) : kpis;

  const handleBroadcast = e => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    setAlertSent(true);
    setTimeout(() => { setAlertSent(false); setModalOpen(false); setBroadcastForm({ scope:'All', title:'', message:'' }); }, 2000);
  };

  return (
    <div className="space-y-6 pb-6">

      {/* ── Health Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border"
        style={{ background:'rgba(0,200,150,0.05)', borderColor:'rgba(0,200,150,0.2)' }}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-[11.5px] font-bold text-slate-700 tracking-wide">
            ALL NODES ACTIVE &nbsp;·&nbsp; HEALTH INDEX: <span className="text-teal-600">99.98%</span>
          </span>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-lg uppercase tracking-wider transition shadow-sm cursor-pointer">
          <BellRing size={11} /> Broadcast Warning
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiCards.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.color + '18' }}>
                <k.icon size={17} style={{ color: k.color }} />
              </div>
              <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${k.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {k.up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>} {k.change}
              </span>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{k.title}</p>
            <p className="text-[22px] font-black text-slate-900 leading-none">{k.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-3">{k.label}</p>
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
          <span className="text-[11px] font-bold text-teal-500 hover:text-teal-700 cursor-pointer flex items-center gap-0.5 transition">
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