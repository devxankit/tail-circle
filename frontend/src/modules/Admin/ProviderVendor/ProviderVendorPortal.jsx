import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Save, Store, Clock,
  ClipboardList, LayoutDashboard, User, IndianRupee, Star, CalendarCheck,
} from 'lucide-react';
import {
  VERTICAL_COPY,
  fetchProviderSummary, fetchProviderProfile, updateProviderProfile,
  fetchProviderServices, createProviderService, updateProviderService, deleteProviderService,
  fetchProviderSlots, saveProviderSlots,
  fetchProviderBookings, updateProviderBookingStatus,
} from '../../../services/providerVendor';
import { fetchVendorProfile, addVendorDocument, removeVendorDocument, uploadVendorFile } from '../../../services/vendor';

/**
 * Vendor portal for the Provider-backed verticals — grooming salons and daycare
 * centres. One component serves both because they manage identical shapes; the
 * `vertical` prop switches the API mount point and the wording.
 *
 * Everything is scoped server-side to the vendor's own Provider, so this screen
 * never sends or receives another vendor's data.
 */
export function ProviderVendorPortal({ vertical = 'grooming' }) {
  const copy = VERTICAL_COPY[vertical] || VERTICAL_COPY.grooming;
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'dashboard';

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchProviderSummary(vertical));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
    }
  }, [vertical]);

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
        <button onClick={load} className="px-5 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold">
          Retry
        </button>
      </div>
    );
  }

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'bookings', label: 'Bookings', icon: ClipboardList },
    { key: 'services', label: copy.servicePlural, icon: Store },
    { key: 'slots', label: 'Time Slots', icon: Clock },
    { key: 'profile', label: `${copy.providerNoun === 'salon' ? 'Salon' : 'Centre'} Profile`, icon: User },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">{summary?.providerName || copy.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {summary?.listedPublicly
            ? 'Live — pet parents can find and book you.'
            : `Not listed yet — approval status: ${summary?.approvalStatus || 'pending'}.`}
        </p>
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

      {view === 'dashboard' && <Dashboard summary={summary} copy={copy} />}
      {view === 'bookings' && <Bookings vertical={vertical} copy={copy} onChanged={load} />}
      {view === 'services' && <Services vertical={vertical} copy={copy} onChanged={load} />}
      {view === 'slots' && <Slots vertical={vertical} />}
      {view === 'profile' && <Profile vertical={vertical} copy={copy} onChanged={load} />}
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */

function Dashboard({ summary, copy }) {
  const stats = [
    { label: 'Total bookings', value: summary.totalBookings, icon: ClipboardList },
    { label: 'Upcoming', value: summary.upcomingBookings, icon: CalendarCheck },
    { label: 'Today', value: summary.todaysBookings, icon: Clock },
    { label: `Active ${copy.serviceNoun}s`, value: summary.activeServices, icon: Store },
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
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={16} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900">Gross revenue</h2>
          </div>
          <p className="text-3xl font-black text-gray-900">₹{((summary.grossRevenue || 0) / 100).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Across {summary.completedBookings} completed and {summary.upcomingBookings} upcoming bookings.
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

function Bookings({ vertical, copy, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchProviderBookings(vertical)
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [vertical]);

  useEffect(() => { load(); }, [load]);

  const move = async (id, status) => {
    setBusy(id);
    try {
      await updateProviderBookingStatus(vertical, id, status);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;

  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!rows.length ? (
        <Empty text={`No ${copy.bookingNoun}s yet.`} />
      ) : rows.map((b) => (
        <div key={b._id} className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-gray-900">
                {b.petSnapshot?.name || b.petId?.name || 'Pet'}
                <span className="font-medium text-gray-500"> · {b.userId?.name || 'Customer'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {b.bookingNo} • {b.schedule?.startDate || '—'} {b.schedule?.time || ''}
                {b.schedule?.durationDays ? ` • ${b.schedule.durationDays} days` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(b.items || []).map((i) => `${i.name} ×${i.qty}`).join(', ')}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${STATUS_STYLE[b.status] || ''}`}>
                {b.status.replace(/_/g, ' ')}
              </span>
              <p className="font-black text-gray-900 mt-2">₹{((b.amounts?.total || 0) / 100).toFixed(2)}</p>
            </div>
          </div>
          {NEXT_STATUS[b.status]?.length > 0 && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
              {NEXT_STATUS[b.status].map((s) => (
                <button
                  key={s}
                  onClick={() => move(b._id, s)}
                  disabled={busy === b._id}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-50"
                >
                  {busy === b._id ? '…' : `Mark ${s.replace(/_/g, ' ')}`}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Services ─────────────────────────────────────────────── */

const blankService = (kind) => ({ name: '', description: '', price: 0, kind, category: '', unit: null });

function Services({ vertical, copy, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchProviderServices(vertical)
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [vertical]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price) || 0,
        kind: form.kind,
        category: form.category || undefined,
        ...(form.unit ? { unit: form.unit } : {}),
      };
      if (form._id) await updateProviderService(vertical, form._id, payload);
      else await createProviderService(vertical, payload);
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
    if (!window.confirm('Remove this item?')) return;
    try {
      await deleteProviderService(vertical, id);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        onClick={() => setForm(blankService(copy.defaultKind))}
        className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2"
      >
        <Plus size={15} /> Add {copy.serviceNoun}
      </button>

      {form && (
        <div className="bg-white rounded-2xl border-2 border-[#40716F] p-5 space-y-3">
          <h3 className="font-bold text-gray-900">{form._id ? 'Edit' : 'New'} {copy.serviceNoun}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Type</label>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value={copy.defaultKind}>{copy.serviceNoun}</option>
                <option value="addon">Add-on</option>
                {vertical === 'grooming' && <option value="menu_item">Menu item</option>}
              </select>
            </div>
            {vertical === 'daycare' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Billed per</label>
                <select value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">One-off</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            )}
            <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} className="md:col-span-2" />
            <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="md:col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setForm(null)} className="px-4 h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancel</button>
            <button onClick={save} disabled={busy || !form.name} className="px-4 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {!rows.length ? (
        <Empty text={`No ${copy.serviceNoun}s yet — add one so customers can book.`} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.kind}{s.category ? ` • ${s.category}` : ''}{s.unit ? ` • per ${s.unit}` : ''}
                  </p>
                  {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-black text-gray-900">₹{s.price}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setForm({ ...s })} className="text-xs font-bold text-[#40716F] hover:underline">Edit</button>
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

/* ── Slot template ────────────────────────────────────────── */

function Slots({ vertical }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchProviderSlots(vertical)
      .then((s) => setSlots(s || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [vertical]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      setSlots(await saveProviderSlots(vertical, slots));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 size={22} className="animate-spin text-gray-400" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Bookable time slots</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Customers can only pick times listed here. An empty list means nothing is bookable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 size={15} /> Saved</span>}
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-2">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg p-2 border border-gray-200">
            <input
              type="text" placeholder="09:00 AM" value={s.time}
              onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-32"
            />
            <select
              value={s.period || 'Morning'}
              onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, period: e.target.value } : x)))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            >
              <option>Morning</option><option>Afternoon</option><option>Evening</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">capacity</span>
              <input
                type="number" min={1} max={50} value={s.capacity ?? 1}
                onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, capacity: Math.max(1, Number(e.target.value) || 1) } : x)))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="ml-auto text-gray-400 hover:text-red-500">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!slots.length && <Empty text="No slots configured — customers cannot book yet." />}
      </div>

      <button
        onClick={() => setSlots([...slots, { time: '09:00 AM', period: 'Morning', capacity: 1 }])}
        className="text-xs font-bold text-[#40716F] flex items-center gap-1 hover:underline"
      >
        <Plus size={14} /> Add slot
      </button>
    </div>
  );
}

/* ── Profile ──────────────────────────────────────────────── */

function Profile({ vertical, copy, onChanged }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchProviderProfile(vertical)
      .then(setP)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [vertical]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      setP(await updateProviderProfile(vertical, {
        name: p.name,
        about: p.about,
        image: p.image,
        openTime: p.openTime,
        closeTime: p.closeTime,
        startingPrice: Number(p.startingPrice) || 0,
        supportedPets: p.supportedPets,
        visitTypes: p.visitTypes,
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
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-bold text-gray-900">{copy.providerNoun === 'salon' ? 'Salon' : 'Centre'} profile</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 size={15} /> Saved</span>}
          <button onClick={save} disabled={busy} className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <Input label="Area / locality" value={p.distanceText} onChange={(v) => setP({ ...p, distanceText: v })} />
        <Input label="Opens at" value={p.openTime} onChange={(v) => setP({ ...p, openTime: v })} />
        <Input label="Closes at" value={p.closeTime} onChange={(v) => setP({ ...p, closeTime: v })} />
        <Input label="Starting price (₹)" type="number" value={p.startingPrice} onChange={(v) => setP({ ...p, startingPrice: v })} />
        <Input label="Cover image URL" value={p.image} onChange={(v) => setP({ ...p, image: v })} />
        <Input label="Pets accepted (comma separated)" value={(p.supportedPets || []).join(', ')}
          onChange={(v) => setP({ ...p, supportedPets: v.split(',').map((x) => x.trim()).filter(Boolean) })} className="md:col-span-2" />
        {vertical === 'grooming' && (
          <Input label="Visit types (comma separated)" value={(p.visitTypes || []).join(', ')}
            onChange={(v) => setP({ ...p, visitTypes: v.split(',').map((x) => x.trim()).filter(Boolean) })} className="md:col-span-2" />
        )}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">About</label>
          <textarea rows={3} value={p.about || ''} onChange={(e) => setP({ ...p, about: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y" />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={p.isOpen ?? true} onChange={(e) => setP({ ...p, isOpen: e.target.checked })} className="rounded" />
          Currently accepting bookings
        </label>
      </div>

      <VendorDocuments />
    </div>
  );
}

const DOC_KINDS = [
  { value: 'license', label: 'Business License' },
  { value: 'owner_id', label: 'Owner ID Proof' },
  { value: 'gst', label: 'GST Certificate' },
];

/** KYC document re-upload — shared VendorProfile.documents, reviewed by admin. */
function VendorDocuments() {
  const [profile, setProfile] = useState(null);
  const [docKind, setDocKind] = useState('license');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const load = () => fetchVendorProfile().then(setProfile).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

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
      setErr(e2?.response?.data?.message || 'Could not upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index) => {
    try {
      setProfile(await removeVendorDocument(index));
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not remove document');
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
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${d.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : d.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
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
        <input type="file" id="providerDocUpload" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        <button onClick={() => document.getElementById('providerDocUpload').click()} disabled={uploading} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
      </div>
    </div>
  );
}

/* ── Primitives ───────────────────────────────────────────── */

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

export default ProviderVendorPortal;
