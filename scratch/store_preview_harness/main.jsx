// Temporary harness for Play Store screenshots. Renders the app's real UI
// components with fictional demo content (no API, no user data).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import {
  Clock, CalendarCheck, Home as HomeIcon, ClipboardList, Star, IndianRupee, ChevronDown, RefreshCw,
  PawPrint, Calendar, MapPin, Check, X, Video, AlertTriangle, Wallet, Info, Send, Filter, MessageCircle,
  Heart, MoreHorizontal, ArrowLeft, Search, Mic, AlertCircle, CheckCircle2,
} from 'lucide-react';
import '../src/index.css';
import { AppBar } from '../src/modules/Admin/vendor/mobile/AppBar';
import { VendorBottomNav } from '../src/modules/Admin/vendor/mobile/VendorBottomNav';
import { StatGrid } from '../src/modules/Admin/vendor/mobile/StatTile';
import { StatusBadge } from '../src/modules/Admin/vendor/mobile/StatusBadge';
import { ListCard, CardAction } from '../src/modules/Admin/vendor/mobile/ListCard';
import { SegmentedTabs } from '../src/modules/Admin/vendor/mobile/SegmentedTabs';
import { DayStrip } from '../src/modules/Admin/vendor/mobile/DayStrip';
import { SectionLabel } from '../src/modules/Admin/vendor/mobile/FormSection';
import { PrimaryButton } from '../src/modules/Admin/vendor/mobile/StickyActionBar';
import { getNavForType } from '../src/modules/Admin/vendor/mobile/vendorNavConfig';
import { DataTable } from '../src/modules/Admin/components/DataTable';
import { BottomNav } from '../src/modules/user/components/navigation/BottomNav';
import { BehaviourCompatibility } from '../src/modules/user/features/matches/BehaviourCompatibility';
import { cn } from '../src/modules/user/utils/cn';

const params = new URLSearchParams(location.search);
const screen = params.get('screen');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const dayOffset = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };
const inr = (n) => `₹${n.toLocaleString('en-IN')}`;

/* ── Vendor chrome ─────────────────────────────────────────── */

function VendorScreen({ type, business, active, children, sticky }) {
  const nav = getNavForType(type);
  return (
    <div className="vendor-app w-full h-screen bg-bg-primary relative flex flex-col overflow-hidden font-sans">
      <AppBar
        business={{ name: business }}
        typeLabel={{ grooming: 'Grooming Partner', clinic: 'Veterinarian Partner' }[type]}
        isMulti
        bell={{ unreadCount: 3, showCount: true }}
        onBellClick={() => {}}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="px-4 pt-4 space-y-4">{children}</div>
      </div>
      {sticky && (
        <div className="absolute inset-x-0 z-40" style={{ bottom: 80 }}>
          <div className="bg-white/95 backdrop-blur-md border-t border-border-light px-4 pt-3 pb-3 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2 items-center">{sticky}</div>
          </div>
        </div>
      )}
      <VendorBottomNav tabs={nav.tabs} activeKey={active} />
    </div>
  );
}

/* Collapsed / expanded booking-request card — markup from PendingBookingRequests (compact). */
function RequestsCard({ expanded = false, rows = [] }) {
  return (
    <div className="bg-white rounded-[20px] border-2 shadow-sm overflow-hidden border-accent-teal/50">
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left">
          <span className="w-10 h-10 rounded-xl bg-accent-teal/15 text-[#4C8684] flex items-center justify-center shrink-0">
            <Clock size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-text-primary leading-tight">2 requests waiting</span>
            <span className="block mt-0.5 text-[12px] font-bold text-warning">08:42 left on the next</span>
          </span>
          <ChevronDown size={20} className={`text-text-secondary shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
        <div className="w-12 flex items-center justify-center text-text-secondary border-l border-border-light shrink-0">
          <RefreshCw size={17} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {rows.map((r) => (
            <div key={r.bookingNo} className="rounded-2xl border p-3.5 border-border-light bg-bg-primary">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-bold text-text-primary">{r.service}</span>
                <span className="text-[12px] text-text-secondary font-mono">{r.bookingNo}</span>
                {r.home && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-teal/10 text-[#4C8684]">home visit</span>
                )}
              </div>
              <div className="mt-2 space-y-1.5 text-[13px] text-text-primary">
                <p className="flex items-start gap-1.5"><PawPrint size={14} className="text-text-secondary mt-0.5 shrink-0" /><span>{r.pet} · {r.customer}</span></p>
                <p className="flex items-start gap-1.5"><Calendar size={14} className="text-text-secondary mt-0.5 shrink-0" /><span>{r.when}</span></p>
                <p className="flex items-center gap-1.5 font-black"><IndianRupee size={14} className="text-text-secondary shrink-0" />{r.amount.toLocaleString('en-IN')}</p>
                {r.area && <p className="flex items-start gap-1.5 text-[12px] text-text-secondary"><MapPin size={13} className="mt-0.5 shrink-0" />{r.area}</p>}
                <p className="text-[12px] text-text-secondary">{r.items}</p>
              </div>
              <p className="flex items-center gap-1.5 mt-2 text-[12px] font-bold text-amber-600"><Clock size={13} />{r.left} left to respond</p>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-accent-teal text-white rounded-xl text-[14px] font-bold"><Check size={17} /> Accept</button>
                <button className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-white border border-border-light text-text-primary rounded-xl text-[14px] font-bold"><X size={17} /> Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REQUESTS = [
  { service: 'Grooming', bookingNo: 'TCG10263', pet: 'Simba (Golden Retriever)', customer: 'Ishaan K.', when: `${dayOffset(1)} · 11:00 AM`, amount: 1899, area: 'Koramangala, Bengaluru', home: true, items: 'Royal Spa Package · De-shedding Treatment', left: '8m 42s' },
  { service: 'Grooming', bookingNo: 'TCG10265', pet: 'Mochi (Persian Cat)', customer: 'Ananya P.', when: `${dayOffset(1)} · 4:30 PM`, amount: 999, items: 'Cat Bath & Brush · Nail Trim', left: '24m 10s' },
];

/* ── V1: grooming dashboard ─────────────────────────────────── */

function VendorDashboard() {
  return (
    <VendorScreen type="grooming" business="Paws & Glow Studio" active="home">
      <RequestsCard />
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-lg font-black leading-tight">Paws & Glow Studio</p>
        <p className="text-xs font-medium opacity-90 mt-1">Live — pet parents can find and book you.</p>
        <div className="mt-5 flex items-center gap-2 opacity-85">
          <IndianRupee size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Gross revenue</span>
        </div>
        <p className="text-[32px] font-black leading-none mt-1">₹1,84,350</p>
        <p className="text-[11px] opacity-85 mt-2">Across 214 completed and 18 upcoming appointments.</p>
      </div>
      <StatGrid tiles={[
        { label: 'Today', value: 9, icon: Clock, tone: 'primary' },
        { label: 'Upcoming', value: 18, icon: CalendarCheck, tone: 'teal' },
        { label: 'Home visits due', value: 4, icon: HomeIcon, tone: 'teal' },
        { label: 'Total bookings', value: 232, icon: ClipboardList },
      ]} />
      <StatGrid tiles={[
        { label: 'Rating · 186 reviews', value: 4.9, icon: Star, tone: 'warning' },
        { label: 'Daily capacity', value: 24, icon: Clock, hint: 'Pets across 8 slots — the seats customers compete for.' },
      ]} />
    </VendorScreen>
  );
}

/* ── V2: bookings day sheet ─────────────────────────────────── */

function BookingCard({ b }) {
  const NEXT = { confirmed: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'], completed: [] };
  return (
    <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-text-primary leading-snug">
              {b.pet}<span className="font-medium text-text-secondary"> · {b.customer}</span>
            </p>
            <p className="text-xs text-text-secondary mt-0.5">{b.no} • {ymd(today)} {b.time}</p>
            <p className="text-xs text-text-secondary mt-0.5">{b.breed}</p>
          </div>
          <div className="text-right shrink-0">
            <StatusBadge status={b.status} />
            <p className="text-[15px] font-black text-text-primary mt-1.5">{inr(b.total)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">{b.payLater ? 'Collect at salon' : 'Paid online'}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${b.home ? 'bg-accent-teal/10 text-[#4C8684]' : 'bg-bg-secondary text-text-secondary'}`}>
            {b.home ? 'Home visit' : 'Salon visit'}
          </span>
          {b.items.map(([n, p]) => (
            <span key={n} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-bg-primary border border-border-light text-text-primary">{n} · ₹{p}</span>
          ))}
        </div>
        {b.home && b.addr && (
          <div className="mt-3 flex items-start gap-2 text-xs text-text-primary bg-accent-teal/5 border border-accent-teal/20 rounded-xl p-3">
            <MapPin size={14} className="text-[#4C8684] shrink-0 mt-0.5" />
            <span>{b.addr}</span>
          </div>
        )}
      </div>
      {NEXT[b.status]?.length > 0 && (
        <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border-light flex-wrap">
          {NEXT[b.status].map((s) => (
            <CardAction key={s} tone={s === 'in_progress' || s === 'completed' ? 'teal' : 'neutral'} className="flex-1 capitalize">
              {`Mark ${s.replace(/_/g, ' ')}`}
            </CardAction>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorBookings() {
  const marks = { [dayOffset(-1)]: 7, [dayOffset(0)]: 6, [dayOffset(1)]: 8, [dayOffset(2)]: 5, [dayOffset(3)]: 9 };
  return (
    <VendorScreen type="grooming" business="Paws & Glow Studio" active="bookings">
      <SegmentedTabs items={[{ key: 'day', label: 'Day sheet' }, { key: 'all', label: 'All appointments' }]} activeKey="day" onSelect={() => {}} />
      <DayStrip value={ymd(today)} onChange={() => {}} marks={marks} />
      <p className="text-xs font-bold text-text-secondary px-1">6 appointments</p>
      <div className="space-y-3">
        <BookingCard b={{ pet: 'Bruno', customer: 'Aarav M.', no: 'TCG10248', time: '10:30 AM', breed: 'Labrador Retriever · 3 yrs', status: 'in_progress', total: 1499, items: [['Full Spa & De-shedding', 1299], ['Nail Trim', 200]] }} />
        <BookingCard b={{ pet: 'Coco', customer: 'Riya S.', no: 'TCG10251', time: '12:00 PM', breed: 'Shih Tzu · 2 yrs', status: 'confirmed', total: 1149, home: true, addr: '12th Main, Indiranagar, Bengaluru, 560038', items: [['Bath & Blow-dry', 899], ['Paw Massage', 250]] }} />
        <BookingCard b={{ pet: 'Mochi', customer: 'Kabir T.', no: 'TCG10254', time: '3:30 PM', breed: 'Persian Cat · 4 yrs', status: 'confirmed', total: 999, payLater: true, items: [['Cat Bath & Brush', 799], ['Ear Cleaning', 200]] }} />
      </div>
    </VendorScreen>
  );
}

/* ── V3: vet clinic dashboard ───────────────────────────────── */

function VendorClinic() {
  return (
    <VendorScreen type="clinic" business="CarePlus Vet Clinic" active="home">
      <StatGrid tiles={[
        { label: "Today's Appointments", value: 12, icon: Calendar, tone: 'teal' },
        { label: 'Emergency Requests', value: 1, icon: AlertTriangle, tone: 'error', hint: 'Needs attention' },
        { label: 'Video Consults', value: 5, icon: Video, tone: 'primary' },
        { label: "Today's Earnings", value: '₹9,850', icon: IndianRupee, tone: 'success' },
      ]} />
      <div>
        <SectionLabel action={<span className="bg-primary-main text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>}>Action Required</SectionLabel>
        <ListCard
          highlight
          title="Neha's Simba"
          subtitle="Limping after a fall at the park"
          badge={<span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary"><span className="w-1.5 h-1.5 rounded-full bg-error" />Emergency Request</span>}
          amount={<span className="text-[11px] font-semibold text-text-secondary">Just now</span>}
          footer={<><CardAction tone="primary" className="flex-1">Review & Accept</CardAction><CardAction tone="outline" className="flex-1">Reschedule</CardAction></>}
        />
      </div>
      <div>
        <SectionLabel action={<span className="min-h-[36px] inline-flex items-center text-xs font-bold text-primary-main">View full schedule</span>}>Today's Appointments</SectionLabel>
        <div className="space-y-3">
          <ListCard
            title="Arjun's Max"
            subtitle="(Beagle)"
            badge={<StatusBadge label="Confirmed" tone="info" />}
            amount={<span className="inline-flex items-center gap-1 text-[12px] font-bold text-text-primary"><Clock size={12} className="text-text-secondary" /> 11:30 AM</span>}
            footer={<><CardAction tone="primary" icon={Video} className="flex-1">Join Call</CardAction><CardAction tone="outline" className="flex-1">View Record</CardAction></>}
          >
            <p className="text-xs text-text-secondary">Issue: Itchy skin & ear scratching</p>
            <div className="mt-2"><StatusBadge label="Video Consultation" tone="neutral" size="xs" /></div>
          </ListCard>
          <ListCard
            title="Priya's Oreo"
            subtitle="(Indie Cat)"
            badge={<StatusBadge label="Confirmed" tone="info" />}
            amount={<span className="inline-flex items-center gap-1 text-[12px] font-bold text-text-primary"><Clock size={12} className="text-text-secondary" /> 12:15 PM</span>}
            footer={<><CardAction tone="primary" className="flex-1">Start Checkup</CardAction><CardAction tone="outline" className="flex-1">View Record</CardAction></>}
          >
            <p className="text-xs text-text-secondary">Issue: Annual vaccination</p>
            <div className="mt-2"><StatusBadge label="Clinic Visit" tone="neutral" size="xs" /></div>
          </ListCard>
        </div>
      </div>
    </VendorScreen>
  );
}

/* ── V4: earnings & payouts ─────────────────────────────────── */

function VendorPayouts() {
  const payoutColumns = [
    { key: '_id', label: 'Payout ID', render: (row) => row._id.slice(-8).toUpperCase() },
    { key: 'period', label: 'Period' },
    { key: 'netAmount', label: 'Amount Settled', render: (row) => inr(row.netAmount) },
    { key: 'status', label: 'State', render: (row) => <StatusBadge status={row.status} label={<span className="inline-flex items-center gap-1"><Check size={10} /> {row.status}</span>} /> },
    { key: 'utr', label: 'UTR', render: (row) => row.utr },
  ];
  const payouts = [
    { _id: '6702c1d9a4e1b7f03c9d2e41', period: '28 Sep – 4 Oct', netAmount: 41860, status: 'paid', utr: 'N27826104821' },
    { _id: '66f98b02c7d5e3a1f04b8c17', period: '21 Sep – 27 Sep', netAmount: 38240, status: 'paid', utr: 'N27026093374' },
  ];
  return (
    <VendorScreen
      type="grooming"
      business="Paws & Glow Studio"
      active="earnings"
      sticky={<PrimaryButton icon={Send} tone="dark">Request Payout</PrimaryButton>}
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
          <p className="text-xs font-bold uppercase tracking-wide opacity-85">Pending Payout</p>
          <p className="text-[34px] font-black leading-none mt-1.5">₹48,250</p>
          <p className="text-[11px] opacity-85 mt-2">23 unsettled entries</p>
        </div>
        <StatGrid tiles={[
          { label: 'Total Settled', value: '₹3,12,480', icon: Wallet, tone: 'teal' },
          { label: 'Platform Commission', value: '10%', icon: Info, tone: 'primary' },
        ]} />
        <div>
          <SectionLabel>Payout History</SectionLabel>
          <DataTable forceMobile columns={payoutColumns} data={payouts} emptyMessage="No payouts requested yet." />
        </div>
      </div>
    </VendorScreen>
  );
}

/* ── U2: Meet & Match deck (MatchSwipe markup) ──────────────── */

function UserMatches() {
  return (
      <div className="flex flex-col h-screen w-full relative overflow-hidden font-sans">
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full bg-[#f4f1eb] overflow-hidden relative">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-[#f4f1eb] z-10 shrink-0">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4C8684] shadow-sm border border-white relative"><Filter size={20} strokeWidth={2.5} /></button>
              <div className="flex bg-white/50 p-1 rounded-full border border-white shadow-sm backdrop-blur-sm">
                <button className="px-5 py-1.5 rounded-full text-sm font-bold bg-[#4C8684] text-white shadow-md">Discover</button>
                <button className="px-5 py-1.5 rounded-full text-sm font-bold text-gray-500 scale-95 opacity-80">Liked You</button>
              </div>
              <div className="relative">
                <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F87B68] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white"><MessageCircle size={20} strokeWidth={2.5} /></button>
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#f4f1eb]"></span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-2 bg-[#e8e4db]/70 border-y border-[#dcd7cc] text-xs font-bold text-slate-700">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Location:</span>
              <span className="flex items-center gap-1.5 bg-white text-[#4C8684] px-3.5 py-1 rounded-full border border-slate-200/80">
                <MapPin size={13} className="text-rose-500 fill-rose-500/20" />
                <span className="font-black text-slate-900">Bengaluru</span>
                <ChevronDown size={13} className="text-slate-400" />
              </span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black text-[#222] tracking-tight">Luna</h1>
                  <p className="text-sm font-bold text-gray-500 mt-0.5">Siberian Husky • 2 yrs</p>
                </div>
                <span className="text-gray-400 p-1"><MoreHorizontal size={24} /></span>
              </div>
              <div className="px-4 mb-4 relative">
                <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm relative bg-gray-200">
                  <img src="/generated_matches/husky_1_1782415091249.png" alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-5 pt-12">
                    <div className="flex items-center text-white/90 text-sm font-bold gap-1 mb-1"><MapPin size={14} /><span>2.4 km away</span></div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Vaccinated', 'High Energy', 'Friendly'].map((tag) => (
                        <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/30">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] z-10 border border-slate-100">
                  <Heart size={26} strokeWidth={2.5} className="text-[#F87B68]" />
                </button>
              </div>
              <div className="px-4 mb-4 -mt-1">
                <BehaviourCompatibility behaviour={{ level: 'High', value: 0.92, shared: ['Playful', 'Loves the park', 'Gentle with pups'] }} />
              </div>
              <div className="px-4 mb-4 relative">
                <div className="bg-white rounded-[24px] p-6 shadow-sm min-h-[140px] flex flex-col justify-center border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">My perfect playdate</p>
                  <h3 className="text-[22px] font-serif text-[#222] leading-[1.3]">Zoomies at Cubbon Park, then a long nap.</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
  );
}

/* ── U3: Find Vets (DoctorList markup) ──────────────────────── */

function Avatar({ src, pos, size = '300%' }) {
  return (
    <div
      className="w-[72px] h-[72px] rounded-full shrink-0 border border-gray-100 bg-gray-100"
      style={{ backgroundImage: `url(${src})`, backgroundSize: size, backgroundPosition: pos }}
    />
  );
}

function DoctorCard({ doc }) {
  return (
    <div className="bg-white rounded-[24px] border border-border-light p-4 shadow-sm relative">
      <div className="flex gap-4">
        <Avatar src={doc.img} pos={doc.pos} size={doc.size} />
        <div className="flex-1 pt-0.5">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-black text-gray-900 text-[16px] leading-tight">{doc.name}</h3>
            <div className="px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 bg-[#FAF7F2] text-[#66B4B1]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#66B4B1]"></div>
              <span className="text-[11px] font-bold">Available</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#66B4B1]/30 text-[#66B4B1] px-1.5 py-0.5 rounded-md w-max mb-2">
            <CheckCircle2 size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
          </div>
          <p className="text-[#66B4B1] text-[14px] font-bold leading-tight mb-0.5">{doc.spec}</p>
          <p className="text-gray-400 text-[12px] font-medium mb-3">{doc.clinic}</p>
          <div className="flex gap-2.5 mb-2 flex-wrap">
            <span className="flex items-center gap-1 text-[#66B4B1] border border-[#66B4B1] px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white"><Video size={12} strokeWidth={2.5} /> Video</span>
            {doc.clinicVisit && <span className="flex items-center gap-1 text-[#F87B68] border border-[#F87B68] px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white"><MapPin size={12} strokeWidth={2.5} /> In-Clinic</span>}
            {doc.homeVisit && <span className="flex items-center gap-1 text-gray-600 border border-gray-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white"><MapPin size={12} strokeWidth={2.5} /> Home Visit</span>}
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] bg-gray-100 my-3"></div>
      <div className="flex items-center gap-4 text-[12px] text-gray-500 font-medium mb-3">
        <div className="flex items-center gap-1 text-gray-700">
          <Star size={14} className="fill-[#F6C0B6] text-[#F87B68]" />
          <span className="font-bold text-gray-800">{doc.rating}</span>
          <span className="text-gray-400">({doc.reviews})</span>
        </div>
        <div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /><span>{doc.exp}</span></div>
        <div className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /><span>{doc.km}</span></div>
      </div>
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#66B4B1] mb-4">
        <AlertCircle size={14} className="shrink-0" />
        <span>Next: {doc.next} • ₹{doc.price} consult</span>
      </div>
      <div className="flex gap-3">
        <button className="flex-1 bg-white border border-[#66B4B1] text-[#66B4B1] font-bold py-2.5 rounded-[14px] text-[14px] flex justify-center items-center gap-2 shadow-sm"><Video size={18} /> Video Call</button>
        <button className="flex-1 bg-[#F87B68] text-white font-bold py-2.5 rounded-[14px] text-[14px] flex justify-center items-center gap-2 shadow-sm"><Calendar size={18} /> Book Appointment</button>
      </div>
    </div>
  );
}

function UserVets() {
  const specialties = ['All', 'Small Animals', 'Dermatology', 'Dental', 'Surgery'];
  return (
    <div className="flex flex-col h-screen bg-[#FAF7F2] text-text-primary font-sans overflow-hidden">
      <div className="bg-[#FAF7F2] pt-4 pb-2 px-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-2 -ml-2 rounded-full"><ArrowLeft size={24} className="text-gray-800" /></span>
          <h1 className="text-xl font-bold text-gray-900 mx-auto -ml-2">Find Vets</h1>
          <div className="w-10"></div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <div className="w-full bg-white h-12 rounded-[16px] pl-12 pr-11 border border-border-light text-[14px] font-medium shadow-sm flex items-center text-gray-400">Search vet name, clinic or specialty...</div>
          <span className="absolute right-3 top-2.5 p-2 rounded-full text-[#66B4B1]"><Mic size={16} /></span>
        </div>
        <div className="flex overflow-hidden gap-2.5 pb-2 -mx-4 px-4">
          {specialties.map((spec, i) => (
            <span key={spec} className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap border ${i === 0 ? 'bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm' : 'bg-white border-gray-200 text-gray-600'}`}>{spec}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        <div className="bg-[#FEF4F3] rounded-[16px] p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#F87B68] shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-[#D96B5B] font-bold text-[14px] leading-tight mb-0.5">Pet Emergency?</h3>
              <p className="text-[#F87B68] text-[12px] font-medium">Call our 24/7 emergency helpline</p>
            </div>
          </div>
          <span className="bg-[#F87B68] text-white px-4 py-2 rounded-full text-[13px] font-bold shadow-sm">Call Now</span>
        </div>
        <DoctorCard doc={{ name: 'Dr. Meera Iyer', spec: 'Small Animal Specialist', clinic: 'Bloom Pet Clinic, Indiranagar', img: '/images/vet_consultation.png', pos: '79% 15%', size: '340%', rating: '4.9', reviews: 312, exp: '9 yrs', km: '1.8 km', next: 'Today, 11:30 AM', price: 499, clinicVisit: true }} />
        <DoctorCard doc={{ name: 'Dr. Sana Qureshi', spec: 'Dermatology & Skin Care', clinic: 'PawCare Hospital, HSR Layout', img: '/assets/quick_links/vet_checkup.png', pos: '72% 14%', size: '360%', rating: '4.8', reviews: 198, exp: '7 yrs', km: '3.4 km', next: 'Today, 2:00 PM', price: 599, homeVisit: true }} />
      </div>
    </div>
  );
}

/* Floating piece for U3: the instant-consult box from the booking sheet. */
function InstantConsult() {
  return (
    <div id="clip" className="w-[360px] p-3 bg-[#FAF7F2] rounded-[24px] font-sans">
      <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h4 className="font-black text-gray-900 text-[15px] flex items-center gap-2"><Video size={16} className="text-amber-600" /> Instant Video Consultation</h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">Call Dr. Meera Iyer right now. No pre-scheduled slot required!</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase whitespace-nowrap">Available Now</span>
        </div>
        <div className="bg-white/80 rounded-xl p-3.5 text-xs space-y-2 border border-amber-100">
          <div className="flex justify-between text-gray-600"><span>Video Consultation Fee</span><span className="font-bold text-gray-800">₹499</span></div>
          <div className="flex justify-between text-gray-600"><span>Platform &amp; Convenience Fee</span><span className="font-bold text-gray-800">₹29</span></div>
          <div className="h-px bg-gray-200 my-1"></div>
          <div className="flex justify-between font-bold text-gray-900 text-[14px]"><span>Total Amount Payable</span><span className="text-amber-700 font-black">₹528</span></div>
        </div>
      </div>
      <button className="mt-3 w-full h-[52px] rounded-full text-[16px] font-black bg-amber-500 text-white flex items-center justify-center gap-2 shadow-sm"><Video size={18} /> Pay ₹528 & Call Now</button>
    </div>
  );
}

/* Floating piece for V2: the expanded request card. */
function RequestClip() {
  return (
    <div id="clip" className="w-[361px] p-0 font-sans bg-transparent">
      <RequestsCard expanded rows={[REQUESTS[0]]} />
    </div>
  );
}

const SCREENS = {
  'v-dash': VendorDashboard,
  'v-bookings': VendorBookings,
  'v-clinic': VendorClinic,
  'v-payouts': VendorPayouts,
  'u-matches': UserMatches,
  'u-vets': UserVets,
  'clip-instant': InstantConsult,
  'clip-request': RequestClip,
};

const Screen = SCREENS[screen] || (() => <p className="p-6">Unknown screen</p>);
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={[screen === 'u-matches' ? '/app/matches' : '/vendor']}><Screen /></MemoryRouter>
);
