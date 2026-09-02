import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Save, Clock,
  ClipboardList, LayoutDashboard, User, IndianRupee, Star, CalendarCheck,
  Home, Sparkles, MapPin, Phone, X, Eye, ChevronLeft, ChevronRight, Users,
  ImagePlus, Upload, ArrowLeft, ArrowRight,
} from 'lucide-react';
import {
  fetchProviderSummary, fetchProviderProfile, updateProviderProfile,
  fetchProviderServices, createProviderService, updateProviderService, deleteProviderService,
  fetchProviderBookings, updateProviderBookingStatus,
} from '../../../services/providerVendor';
import {
  fetchVendorProfile, updateVendorProfile,
  addVendorDocument, removeVendorDocument, uploadVendorFile,
} from '../../../services/vendor';
import { dedupePhotos } from '../../../services/groomingApi';
import VerificationBanner from '../components/VerificationBanner';

/**
 * Daycare centre vendor portal.
 *
 * Daycare is boarding measured in days, not appointments in slots, so this is
 * built around days rather than reusing the grooming shape:
 *
 *   Plans     → the customer's plan cards (per day / week / month)
 *   Add-ons   → pickup & drop, meals, extra playtime
 *   Capacity  → how many pets a day; a full day disappears from the calendar
 *   Occupancy → who is in on a given day, across multi-day stays
 *
 * The generic Provider portal it replaced offered a grooming-style "time slot"
 * editor that daycare has no use for, and no way at all to set the daily
 * capacity, the per-day rates, or the fees the price summary shows.
 */

const pad = (n) => String(n).padStart(2, '0');
const YMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bookings', label: 'Bookings', icon: ClipboardList },
  { key: 'plans', label: 'Plans', icon: Home },
  { key: 'addons', label: 'Add-ons', icon: Sparkles },
  { key: 'capacity', label: 'Capacity & Rates', icon: Users },
  { key: 'profile', label: 'Centre Profile', icon: User },
];

export function DaycareVendorPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'dashboard';

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchProviderSummary('daycare'));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const go = (v) => setSearchParams(v === 'dashboard' ? {} : { view: v });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
        <AlertCircle size={32} className="text-amber-500" />
        <p className="font-bold text-gray-800">{error}</p>
        <button onClick={load} className="px-5 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <VerificationBanner
        approvalStatus={summary?.approvalStatus || 'pending'}
        onOpenKyc={() => go('profile')}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{summary?.providerName || 'Day Care Partner'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {summary?.listedPublicly
              ? 'Live — pet parents can find and book you.'
              : `Not listed yet — approval status: ${summary?.approvalStatus || 'pending'}.`}
          </p>
        </div>
        {summary?.listedPublicly && !summary?.acceptingBookings && (
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            Bookings paused — turn "Currently accepting bookings" back on in your profile.
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              view === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {view === 'dashboard' && <Dashboard summary={summary} onGo={go} />}
      {view === 'bookings' && <Bookings onChanged={load} />}
      {view === 'plans' && <Catalogue kind="plan" onChanged={load} />}
      {view === 'addons' && <Catalogue kind="addon" onChanged={load} />}
      {view === 'capacity' && <CapacityAndRates onChanged={load} />}
      {view === 'profile' && <Profile onChanged={load} />}
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */

function Dashboard({ summary, onGo }) {
  const capacity = summary.dailyCapacity || 0;
  const occupied = summary.occupiedToday || 0;
  const pct = capacity ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;

  const stats = [
    { label: 'In today', value: summary.todaysBookings, icon: Clock },
    { label: 'Upcoming stays', value: summary.upcomingBookings, icon: CalendarCheck },
    { label: 'Places free today', value: summary.placesFreeToday ?? 0, icon: Users },
    { label: 'Total bookings', value: summary.totalBookings, icon: ClipboardList },
  ];

  const checklist = [
    {
      done: summary.packageCount > 0,
      label: `${summary.packageCount} plan${summary.packageCount === 1 ? '' : 's'} listed`,
      hint: 'Customers pick one of these first — with none, they cannot book.',
      tab: 'plans',
    },
    {
      done: capacity > 0,
      label: `${capacity} pets a day`,
      hint: 'Once a day hits this number it disappears from the booking calendar.',
      tab: 'capacity',
    },
    {
      done: summary.addonCount > 0,
      label: `${summary.addonCount} add-on${summary.addonCount === 1 ? '' : 's'} offered`,
      hint: 'Pickup & drop, meals, extra playtime — optional, but they add up.',
      tab: 'addons',
      optional: true,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <Icon size={18} className="text-gray-400 mb-3" />
            <p className="text-2xl font-black text-gray-900">{value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900">Today's occupancy</h2>
          <span className="text-sm font-bold text-gray-500">{occupied} of {capacity}</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#40716F]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {pct >= 100
            ? 'Full — today no longer appears on the booking calendar.'
            : `${summary.placesFreeToday ?? 0} place${(summary.placesFreeToday ?? 0) === 1 ? '' : 's'} still bookable today.`}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Eye size={16} className="text-gray-400" />
          <h2 className="font-bold text-gray-900">Booking readiness</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Each item is a step of the customer's booking screen. An empty one stops the booking there.
        </p>
        <div className="space-y-2">
          {checklist.map((c) => (
            <button
              key={c.label}
              onClick={() => onGo(c.tab)}
              className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition"
            >
              <span className={`mt-0.5 shrink-0 ${c.done ? 'text-emerald-600' : c.optional ? 'text-gray-300' : 'text-amber-500'}`}>
                {c.done ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              </span>
              <span>
                <span className="block text-sm font-bold text-gray-900">{c.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{c.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={16} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900">Gross revenue</h2>
          </div>
          <p className="text-3xl font-black text-gray-900">{rupees(summary.grossRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Across {summary.completedBookings} completed and {summary.upcomingBookings} upcoming stays.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-amber-500" />
            <h2 className="font-bold text-gray-900">Rating</h2>
          </div>
          <p className="text-3xl font-black text-gray-900">{summary.rating ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.ratingCount ?? 0} reviews</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Home size={16} className="text-gray-400" />
            <h2 className="font-bold text-gray-900">Day rate</h2>
          </div>
          <p className="text-3xl font-black text-gray-900">₹{summary.pricePerDay || 0}</p>
          <p className="text-xs text-gray-500 mt-1">The "starts at" figure on your listing card.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Bookings ─────────────────────────────────────────────── */

const NEXT_STATUS = {
  pending_payment: [],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const STATUS_STYLE = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  no_show: 'bg-gray-100 text-gray-500 border-gray-200',
  pending_payment: 'bg-purple-50 text-purple-700 border-purple-200',
};

function Bookings({ onChanged }) {
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(() => YMD(new Date()));
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    fetchProviderBookings('daycare', mode === 'day' ? { date } : { status: status || undefined })
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [mode, date, status]);

  useEffect(() => { load(); }, [load]);

  const move = async (id, next) => {
    setBusy(id);
    setErr('');
    try {
      await updateProviderBookingStatus('daycare', id, next);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const shiftDay = (delta) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(YMD(d));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {[['day', "Who's in"], ['all', 'All bookings']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-4 h-9 text-sm font-bold transition ${
                mode === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'day' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDay(-1)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 h-9 text-sm font-medium"
            />
            <button onClick={() => shiftDay(1)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setDate(YMD(new Date()))} className="px-3 h-9 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
              Today
            </button>
          </div>
        ) : (
          <select
            value={status} onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 h-9 text-sm font-medium"
          >
            <option value="">Every status</option>
            {Object.keys(NEXT_STATUS).map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}

        <span className="ml-auto text-sm font-bold text-gray-500">
          {loading ? '…' : `${rows.length} ${mode === 'day' ? 'pet' : 'booking'}${rows.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {mode === 'day' && (
        <p className="text-xs text-gray-500 -mt-2">
          Shows every stay that covers this day, including multi-day boardings that started earlier.
        </p>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      {loading ? (
        <Loader2 size={22} className="animate-spin text-gray-400" />
      ) : !rows.length ? (
        <Empty text={mode === 'day' ? `No pets booked in for ${date}.` : 'No bookings yet.'} />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => <BookingCard key={b._id} b={b} busy={busy === b._id} onMove={move} />)}
        </div>
      )}
    </div>
  );
}

function BookingCard({ b, busy, onMove }) {
  const days = b.meta?.dates?.length || b.schedule?.durationDays || 1;
  const priced = (b.items || []).filter((i) => i.kind !== 'fee');
  const fees = (b.items || []).filter((i) => i.kind === 'fee');
  const addr = b.addressSnapshot;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900">
              {b.petSnapshot?.name || b.petId?.name || 'Pet'}
              <span className="font-medium text-gray-500"> · {b.userId?.name || 'Customer'}</span>
            </p>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
              {days} day{days === 1 ? '' : 's'}
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {b.bookingNo} • {b.schedule?.startDate || '—'}
            {b.schedule?.endDate ? ` → ${b.schedule.endDate}` : ''}
          </p>

          <p className="text-xs text-gray-500 mt-0.5">
            Drop-off {b.meta?.dropoffTime || b.schedule?.time || '—'} · Pick-up {b.meta?.pickupTime || '—'}
            {b.meta?.visitOption ? ` · ${b.meta.visitOption}` : ''}
          </p>

          {(b.petSnapshot?.breed || b.petId?.breed) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {b.petSnapshot?.breed || b.petId?.breed}
              {b.petSnapshot?.age ? ` · ${b.petSnapshot.age}` : ''}
              {b.meta?.petAnswers?.vaccinated === false ? ' · ⚠ not vaccinated' : ''}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {priced.map((i, idx) => (
              <span key={idx} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
                {i.name}{i.qty > 1 ? ` ×${i.qty}` : ''} · ₹{i.price}
              </span>
            ))}
            {fees.map((i, idx) => (
              <span key={`f${idx}`} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                {i.name} · ₹{i.price}
              </span>
            ))}
          </div>

          {b.meta?.petAnswers?.instructions && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              “{b.meta.petAnswers.instructions}”
            </p>
          )}

          {addr && (
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-600 bg-violet-50/60 border border-violet-100 rounded-xl p-2.5">
              <MapPin size={14} className="text-violet-500 shrink-0 mt-0.5" />
              <span>{[addr.line1, addr.locality, addr.city, addr.pincode].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {b.userId?.phone && (
            <a href={`tel:${b.userId.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#40716F]">
              <Phone size={13} /> {b.userId.phone}
            </a>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${STATUS_STYLE[b.status] || ''}`}>
            {(b.status || '').replace(/_/g, ' ')}
          </span>
          <p className="font-black text-gray-900 mt-2">{rupees(b.amounts?.total)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {b.paymentMethod === 'pay_later' ? 'Collect at drop-off' : b.paymentMethod === 'free' ? 'No charge' : 'Paid online'}
          </p>
        </div>
      </div>

      {NEXT_STATUS[b.status]?.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
          {NEXT_STATUS[b.status].map((s) => (
            <button
              key={s}
              onClick={() => onMove(b._id, s)}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-50"
            >
              {busy ? '…' : `Mark ${s.replace(/_/g, ' ')}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Plans & add-ons ──────────────────────────────────────── */

const CATALOGUE_COPY = {
  plan: {
    title: 'Care plans',
    noun: 'plan',
    kinds: ['plan'],
    blurb: 'The plan cards on the customer\'s booking screen. They pick exactly one.',
    units: [['day', 'Per day'], ['week', 'Per week'], ['month', 'Per month']],
  },
  addon: {
    title: 'Add-ons',
    noun: 'add-on',
    kinds: ['addon'],
    blurb: 'Extras a customer can tick alongside their plan — pickup & drop, meals, playtime.',
    units: [['day', 'Per day'], ['', 'One-off']],
  },
};

const blank = (kind) => ({ name: '', description: '', price: 0, kind, unit: 'day', includes: [], badge: '' });

function Catalogue({ kind, onChanged }) {
  const copy = CATALOGUE_COPY[kind];
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchProviderServices('daycare')
      .then(setAll)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => all.filter((s) => copy.kinds.includes(s.kind)), [all, copy.kinds]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        price: Number(form.price) || 0,
        kind: form.kind,
        unit: form.unit || null,
        includes: kind === 'plan' ? (form.includes || []) : undefined,
        badge: kind === 'plan' ? (form.badge || null) : undefined,
      };
      if (form._id) await updateProviderService('daycare', form._id, payload);
      else await createProviderService('daycare', payload);
      setForm(null);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Remove this ${copy.noun}? Customers will stop seeing it immediately.`)) return;
    try {
      await deleteProviderService('daycare', id);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900">{copy.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{copy.blurb}</p>
        </div>
        <button
          onClick={() => setForm(blank(copy.kinds[0]))}
          className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 shrink-0"
        >
          <Plus size={15} /> Add {copy.noun}
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {form && (
        <div className="bg-white rounded-2xl border-2 border-[#40716F] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{form._id ? 'Edit' : 'New'} {copy.noun}</h3>
            <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Billed</label>
              <select
                value={form.unit || ''}
                onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {copy.units.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {form.unit === 'day'
                  ? 'Charged once for each day of the stay.'
                  : 'Charged once for the whole stay.'}
              </p>
            </div>
            {kind === 'plan' && (
              <Input label="Badge (optional)" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} />
            )}
            <Input
              label="Description" value={form.description}
              onChange={(v) => setForm({ ...form, description: v })} className="md:col-span-2"
            />
          </div>

          {kind === 'plan' && (
            <IncludesEditor value={form.includes || []} onChange={(includes) => setForm({ ...form, includes })} />
          )}

          <div className="flex gap-2">
            <button onClick={() => setForm(null)} className="px-4 h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancel</button>
            <button
              onClick={save}
              disabled={busy || form.name.trim().length < 2}
              className="px-4 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {!rows.length ? (
        <Empty text={`No ${copy.noun}s yet — add one so customers can book.`} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{s.name}</p>
                    {s.badge && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{s.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.unit ? `per ${s.unit}` : 'one-off'}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                  {(s.includes || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.includes.map((inc) => (
                        <span key={inc} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EAF3F1] text-[#40716F]">{inc}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-black text-gray-900">₹{s.price}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setForm({ ...s, includes: s.includes || [], badge: s.badge || '' })} className="text-xs font-bold text-[#40716F] hover:underline">Edit</button>
                    <button onClick={() => remove(s._id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The bullet list a customer reads under a plan name. */
function IncludesEditor({ value, onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next) || value.length >= 20) return;
    onChange([...value, next]);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">What's included</label>
      <p className="text-xs text-gray-500 mb-2">
        Listed under the plan name on the customer's booking screen — "Playtime", "Rest Area", "Priority Slots".
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((inc) => (
          <span key={inc} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg bg-[#EAF3F1] text-[#40716F]">
            {inc}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== inc))} className="hover:text-red-500">
              <X size={11} />
            </button>
          </span>
        ))}
        {!value.length && <span className="text-xs text-gray-400">Nothing listed yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. Supervised Playtime"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button type="button" onClick={add} className="px-3 h-9 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">Add</button>
      </div>
    </div>
  );
}

/* ── Capacity & rates ─────────────────────────────────────── */

function CapacityAndRates({ onChanged }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchProviderProfile('daycare')
      .then(setP)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const details = p?.details || {};
  const fees = details.daycareFees || {};

  const setDetail = (key, value) => setP({ ...p, details: { ...details, [key]: value } });
  const setFee = (key, value) => setP({ ...p, details: { ...details, daycareFees: { ...fees, [key]: value } } });

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const next = await updateProviderProfile('daycare', {
        dailyCapacity: Math.max(1, Number(details.dailyCapacity) || 20),
        pricing: {
          pricePerDay: Number(details.pricePerDay) || 0,
          pricePerWeek: Number(details.pricePerWeek) || 0,
          pricePerMonth: Number(details.pricePerMonth) || 0,
        },
        daycareFees: {
          platformFee: Number(fees.platformFee ?? 49) || 0,
          discount: Number(fees.discount ?? 300) || 0,
        },
        startingPrice: Number(details.pricePerDay) || Number(p.startingPrice) || 0,
      });
      setP(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;
  if (!p) return <Empty text={err || 'Profile unavailable'} />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Daily capacity</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              How many pets you can board on any one day. Once a day reaches this number it stops appearing on
              the customer's calendar — a stay that crosses a full day is refused outright rather than half-booked.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saved && <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 size={15} /> Saved</span>}
            <button onClick={save} disabled={busy} className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="max-w-xs">
          <Input
            label="Pets per day"
            type="number"
            value={details.dailyCapacity ?? 20}
            onChange={(v) => setDetail('dailyCapacity', Number(v))}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900">Headline rates</h3>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">
          Shown on your listing card. The prices actually charged come from your care plans — keep these in step
          with them.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Per day (₹)" type="number" value={details.pricePerDay ?? 0} onChange={(v) => setDetail('pricePerDay', Number(v))} />
          <Input label="Per week (₹)" type="number" value={details.pricePerWeek ?? 0} onChange={(v) => setDetail('pricePerWeek', Number(v))} />
          <Input label="Per month (₹)" type="number" value={details.pricePerMonth ?? 0} onChange={(v) => setDetail('pricePerMonth', Number(v))} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900">Fees &amp; discount</h3>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">
          Both appear as their own line on the customer's price summary, and both are what actually gets charged.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Platform fee (₹)" type="number" value={fees.platformFee ?? 49} onChange={(v) => setFee('platformFee', Number(v))} />
          <Input label="Promo discount off every booking (₹)" type="number" value={fees.discount ?? 300} onChange={(v) => setFee('discount', Number(v))} />
        </div>
      </div>
    </div>
  );
}

/* ── Profile ──────────────────────────────────────────────── */

const PET_TYPES = ['Dogs', 'Cats', 'Rabbits', 'Birds'];

function Profile({ onChanged }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [bankData, setBankData] = useState({ bankName: '', accountHolder: '', accountNumber: '', ifsc: '' });

  useEffect(() => {
    fetchProviderProfile('daycare')
      .then(setP)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchVendorProfile()
      .then((vp) => {
        if (vp?.bank) {
          setBankData({
            bankName: vp.bank.bankName || '',
            accountHolder: vp.bank.accountHolder || vp.businessName || '',
            accountNumber: '',
            ifsc: vp.bank.ifsc || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      if (bankData.bankName || bankData.accountNumber) {
        await updateVendorProfile({ bank: bankData });
      }
      setP(await updateProviderProfile('daycare', {
        name: p.name,
        about: p.about,
        image: p.image,
        gallery: p.gallery || [],
        openTime: p.openTime,
        closeTime: p.closeTime,
        supportedPets: p.supportedPets,
        distanceText: p.distanceText,
        isOpen: p.isOpen,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;
  if (!p) return <Empty text={err || 'Profile unavailable'} />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Centre profile</h2>
            <p className="text-sm text-gray-500 mt-0.5">This is the card and header pet parents see in the app.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saved && <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 size={15} /> Saved</span>}
            <button onClick={save} disabled={busy} className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Centre name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
          <Input label="Area / locality" value={p.distanceText} onChange={(v) => setP({ ...p, distanceText: v })} />
          <Input label="Opens at" value={p.openTime} onChange={(v) => setP({ ...p, openTime: v })} />
          <Input label="Closes at" value={p.closeTime} onChange={(v) => setP({ ...p, closeTime: v })} />
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">About</label>
            <textarea
              rows={3} value={p.about || ''} onChange={(e) => setP({ ...p, about: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
            />
          </div>
          <ChipPicker
            label="Pets you board"
            options={PET_TYPES}
            value={p.supportedPets || []}
            onChange={(supportedPets) => setP({ ...p, supportedPets })}
          />
        </div>

        <p className="text-xs text-gray-500">
          Drop-off and pick-up times offered to customers are generated from your opening hours above.
        </p>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox" checked={p.isOpen ?? true}
            onChange={(e) => setP({ ...p, isOpen: e.target.checked })}
            className="rounded"
          />
          Currently accepting bookings
        </label>
      </div>

      <PhotoManager
        cover={p.image}
        gallery={p.gallery || []}
        onChange={(next) => setP({ ...p, ...next })}
      />

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-1">Bank account &amp; payout details</h3>
        <p className="text-xs text-gray-500 mb-3">Required to receive payouts for bookings.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Bank name" value={bankData.bankName} onChange={(v) => setBankData({ ...bankData, bankName: v })} />
          <Input label="Account holder name" value={bankData.accountHolder} onChange={(v) => setBankData({ ...bankData, accountHolder: v })} />
          <Input label="Account number" value={bankData.accountNumber} onChange={(v) => setBankData({ ...bankData, accountNumber: v })} />
          <Input label="IFSC code" value={bankData.ifsc} onChange={(v) => setBankData({ ...bankData, ifsc: v.toUpperCase() })} />
        </div>
        <VendorDocuments />
      </div>
    </div>
  );
}

/** The centre's photo strip, in the order customers swipe it. */
function PhotoManager({ cover, gallery, onChange }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const photos = useMemo(() => dedupePhotos([cover, ...(gallery || [])]), [cover, gallery]);

  const commit = (next) => {
    const clean = dedupePhotos(next).slice(0, 20);
    onChange({ image: clean[0] || '', gallery: clean.slice(1) });
  };

  const addUrl = () => {
    const next = url.trim();
    if (!next) return;
    if (photos.length !== dedupePhotos([...photos, next]).length) {
      setErr('That photo is already in the strip');
      return;
    }
    setErr('');
    setUrl('');
    commit([...photos, next]);
  };

  const handleFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = null;
    if (!files.length) return;
    setUploading(true);
    setErr('');
    try {
      const urls = await Promise.all(files.map((f) => uploadVendorFile(f, 'daycare-gallery')));
      commit([...photos, ...urls.filter(Boolean)]);
    } catch (e2) {
      setErr(e2?.message || 'Could not upload those photos');
    } finally {
      setUploading(false);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <ImagePlus size={16} className="text-gray-400" />
        <h3 className="font-bold text-gray-900">Centre photos</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Customers swipe through these at the top of your page. The first one is your cover — it is also the
        thumbnail on the search results card. Up to 20 photos.
      </p>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {!photos.length ? (
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-4">
          No photos yet — your page shows an empty grey banner.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {photos.map((src, i) => (
            <div key={src} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={src} alt={`Centre photo ${i + 1}`} className="w-full h-28 object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-[#40716F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cover</span>
              )}
              <button
                type="button" onClick={() => commit(photos.filter((x) => x !== src))} title="Remove"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                <button
                  type="button" onClick={() => move(i, i - 1)} disabled={i === 0} title="Move earlier"
                  className="w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center disabled:opacity-30"
                >
                  <ArrowLeft size={12} />
                </button>
                <span className="text-[10px] font-bold text-white bg-black/55 px-1.5 rounded-full">{i + 1}</span>
                <button
                  type="button" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} title="Move later"
                  className="w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center disabled:opacity-30"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="Paste an image URL…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button type="button" onClick={addUrl} className="px-4 h-[38px] rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">Add URL</button>
        <input type="file" id="daycarePhotoUpload" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        <button
          type="button"
          onClick={() => document.getElementById('daycarePhotoUpload').click()}
          disabled={uploading}
          className="px-4 h-[38px] rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : 'Upload photos'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Photos save when you hit Save at the top of this page.</p>
    </div>
  );
}

const DOC_KINDS = [
  { value: 'license', label: 'Business License' },
  { value: 'owner_id', label: 'Owner ID Proof' },
  { value: 'gst', label: 'GST Certificate' },
];

function VendorDocuments() {
  const [profile, setProfile] = useState(null);
  const [docKind, setDocKind] = useState('license');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { fetchVendorProfile().then(setProfile).catch((e) => setErr(e.message)); }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setUploading(true);
    setErr('');
    try {
      const url = await uploadVendorFile(file, 'vendor-kyc');
      setProfile(await addVendorDocument(docKind, url));
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || 'Could not upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index) => {
    try {
      setProfile(await removeVendorDocument(index));
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || 'Could not remove document');
    }
  };

  if (!profile) return null;

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <h3 className="font-bold text-gray-900 text-sm mb-3">Compliance documents</h3>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <div className="space-y-2 mb-3">
        {(profile.documents || []).map((d, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-gray-800 shrink-0">{DOC_KINDS.find((k) => k.value === d.kind)?.label || d.kind}</span>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 truncate">{d.url}</a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                d.status === 'Verified' ? 'bg-emerald-100 text-emerald-700'
                  : d.status === 'Rejected' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>{d.status}</span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!(profile.documents || []).length && <p className="text-sm text-gray-400">No documents uploaded yet.</p>}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <select value={docKind} onChange={(e) => setDocKind(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <input type="file" id="daycareDocUpload" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        <button
          onClick={() => document.getElementById('daycareDocUpload').click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </div>
    </div>
  );
}

/* ── Primitives ───────────────────────────────────────────── */

function ChipPicker({ label, hint, options, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = (value || []).includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== opt) : [...(value || []), opt])}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                on ? 'bg-[#40716F] border-[#40716F] text-white' : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{label}</label>
      <input
        type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
      {text}
    </div>
  );
}

export default DaycareVendorPortal;
