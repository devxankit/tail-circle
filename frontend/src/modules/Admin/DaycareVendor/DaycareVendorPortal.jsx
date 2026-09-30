import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Plus, Trash2, Save, Clock,
  ClipboardList, IndianRupee, Star, CalendarCheck,
  Home, MapPin, Phone, X, Eye, ChevronRight, Users,
  ImagePlus, Pencil,
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
import { PendingBookingRequests } from '../components/PendingBookingRequests';
import {
  StatGrid, StatusBadge, SegmentedTabs, BottomSheet, StickyActionBar, PrimaryButton,
  FormSection, ScreenHeader, SectionLabel, Input as KitInput, Select, Textarea, Toggle,
  ChipPicker as KitChipPicker, FieldPair, ImageTiles, EmptyState, SkeletonList, ScreenError,
  InlineError, CardAction, useConfirm, fieldClass, DayStrip, DateNav, FilterChips,
  KycDocumentsBlock, PhotoUrlInput,
} from '../vendor/mobile';

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
 *
 * In the partner app the views are reached from the bottom nav (Home,
 * Bookings, Plans → Plans / Add-ons / Capacity & rates) and More (Centre
 * profile); the `?view=` values are the ones the old sidebar used.
 */

const pad = (n) => String(n).padStart(2, '0');
const YMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

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
    return <SkeletonList rows={4} />;
  }

  if (error) {
    return <ScreenError message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-4">
      <VerificationBanner
        approvalStatus={summary?.approvalStatus || 'pending'}
        onOpenKyc={() => go('profile')}
      />

      {summary?.listedPublicly && !summary?.acceptingBookings && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-[20px] bg-white border border-warning/30 text-warning text-xs font-bold shadow-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          Bookings paused — turn "Currently accepting bookings" back on in your profile.
        </div>
      )}

      {(view === 'dashboard' || view === 'bookings') && <PendingBookingRequests compact onChange={load} />}
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
    { label: 'In today', value: summary.todaysBookings, icon: Clock, tone: 'primary' },
    { label: 'Upcoming stays', value: summary.upcomingBookings, icon: CalendarCheck, tone: 'teal' },
    { label: 'Places free today', value: summary.placesFreeToday ?? 0, icon: Users, tone: 'teal' },
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
    <div className="space-y-4">
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-lg font-black leading-tight">{summary?.providerName || 'Day Care Partner'}</p>
        <p className="text-xs font-medium opacity-90 mt-1">
          {summary?.listedPublicly
            ? 'Live — pet parents can find and book you.'
            : `Not listed yet — approval status: ${summary?.approvalStatus || 'pending'}.`}
        </p>
        <div className="mt-5 flex items-center gap-2 opacity-85">
          <IndianRupee size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Gross revenue</span>
        </div>
        <p className="text-[32px] font-black leading-none mt-1">{rupees(summary.grossRevenue)}</p>
        <p className="text-[11px] opacity-85 mt-2">
          Across {summary.completedBookings} completed and {summary.upcomingBookings} upcoming stays.
        </p>
      </div>

      <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-bold text-text-primary">Today's occupancy</h2>
          <span className="text-sm font-black text-text-primary">{occupied} of {capacity}</span>
        </div>
        <div className="h-3 rounded-full bg-bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-error' : pct >= 80 ? 'bg-warning' : 'bg-[#4C8684]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {pct >= 100
            ? 'Full — today no longer appears on the booking calendar.'
            : `${summary.placesFreeToday ?? 0} place${(summary.placesFreeToday ?? 0) === 1 ? '' : 's'} still bookable today.`}
        </p>
      </div>

      <StatGrid tiles={stats} />

      <StatGrid
        tiles={[
          { label: `Rating · ${summary.ratingCount ?? 0} reviews`, value: summary.rating ?? 0, icon: Star, tone: 'warning' },
          { label: 'Day rate', value: `₹${summary.pricePerDay || 0}`, icon: Home, hint: 'The "starts at" figure on your listing card.' },
        ]}
      />

      <div>
        <SectionLabel>Booking readiness</SectionLabel>
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
          <div className="flex items-start gap-2 px-4 pt-4 pb-2">
            <Eye size={16} className="text-text-secondary mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary leading-snug">
              Each item is a step of the customer's booking screen. An empty one stops the booking there.
            </p>
          </div>
          {checklist.map((c) => (
            <button
              key={c.label}
              onClick={() => onGo(c.tab)}
              className="w-full flex items-start gap-3 text-left px-4 py-3.5 border-t border-border-light active:bg-bg-primary"
            >
              <span className={`mt-0.5 shrink-0 ${c.done ? 'text-success' : c.optional ? 'text-text-disabled' : 'text-warning'}`}>
                {c.done ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-text-primary">{c.label}</span>
                <span className="block text-xs text-text-secondary mt-0.5">{c.hint}</span>
              </span>
              <ChevronRight size={18} className="text-text-disabled shrink-0 self-center" />
            </button>
          ))}
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
      <SegmentedTabs
        items={[{ key: 'day', label: "Who's in" }, { key: 'all', label: 'All bookings' }]}
        activeKey={mode}
        onSelect={setMode}
      />

      {mode === 'day' ? (
        <div className="space-y-3">
          <DateNav value={date} onChange={setDate} onShift={shiftDay} onToday={() => setDate(YMD(new Date()))} />
          <DayStrip value={date} onChange={setDate} />
          <p className="text-xs text-text-secondary px-1">
            Shows every stay that covers this day, including multi-day boardings that started earlier.
          </p>
        </div>
      ) : (
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: 'Every status' }, ...Object.keys(NEXT_STATUS).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]}
        />
      )}

      <p className="text-xs font-bold text-text-secondary px-1">
        {loading ? '…' : `${rows.length} ${mode === 'day' ? 'pet' : 'booking'}${rows.length === 1 ? '' : 's'}`}
      </p>

      <InlineError>{err}</InlineError>

      {loading ? (
        <SkeletonList rows={3} />
      ) : !rows.length ? (
        <EmptyState icon={CalendarCheck} text={mode === 'day' ? `No pets booked in for ${date}.` : 'No bookings yet.'} />
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
    <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-text-primary leading-snug">
              {b.petSnapshot?.name || b.petId?.name || 'Pet'}
              <span className="font-medium text-text-secondary"> · {b.userId?.name || 'Customer'}</span>
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {b.bookingNo} • {b.schedule?.startDate || '—'}
              {b.schedule?.endDate ? ` → ${b.schedule.endDate}` : ''}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Drop-off {b.meta?.dropoffTime || b.schedule?.time || '—'} · Pick-up {b.meta?.pickupTime || '—'}
              {b.meta?.visitOption ? ` · ${b.meta.visitOption}` : ''}
            </p>
            {(b.petSnapshot?.breed || b.petId?.breed) && (
              <p className="text-xs text-text-secondary mt-0.5">
                {b.petSnapshot?.breed || b.petId?.breed}
                {b.petSnapshot?.age ? ` · ${b.petSnapshot.age}` : ''}
                {b.meta?.petAnswers?.vaccinated === false ? ' · ⚠ not vaccinated' : ''}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <StatusBadge status={b.status} />
            <p className="text-[15px] font-black text-text-primary mt-1.5">{rupees(b.amounts?.total)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {b.paymentMethod === 'pay_later' ? 'Collect at drop-off' : b.paymentMethod === 'free' ? 'No charge' : 'Paid online'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-lg bg-accent-teal/10 text-[#4C8684]">
            {days} day{days === 1 ? '' : 's'}
          </span>
          {priced.map((i, idx) => (
            <span key={idx} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-bg-primary border border-border-light text-text-primary">
              {i.name}{i.qty > 1 ? ` ×${i.qty}` : ''} · ₹{i.price}
            </span>
          ))}
          {fees.map((i, idx) => (
            <span key={`f${idx}`} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-warning/10 text-warning">
              {i.name} · ₹{i.price}
            </span>
          ))}
        </div>

        {b.meta?.petAnswers?.instructions && (
          <p className="mt-3 text-xs text-text-primary bg-bg-primary border border-border-light rounded-xl p-3">
            “{b.meta.petAnswers.instructions}”
          </p>
        )}

        {addr && (
          <div className="mt-3 flex items-start gap-2 text-xs text-text-primary bg-accent-teal/5 border border-accent-teal/20 rounded-xl p-3">
            <MapPin size={14} className="text-[#4C8684] shrink-0 mt-0.5" />
            <span>{[addr.line1, addr.locality, addr.city, addr.pincode].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {b.userId?.phone && (
          <a href={`tel:${b.userId.phone}`} className="mt-3 min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-xl bg-accent-teal/10 text-xs font-bold text-[#4C8684]">
            <Phone size={14} /> {b.userId.phone}
          </a>
        )}
      </div>

      {NEXT_STATUS[b.status]?.length > 0 && (
        <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border-light flex-wrap">
          {NEXT_STATUS[b.status].map((s) => (
            <CardAction
              key={s}
              onClick={() => onMove(b._id, s)}
              disabled={busy}
              tone={s === 'in_progress' || s === 'completed' ? 'teal' : 'neutral'}
              className="flex-1 capitalize"
            >
              {busy ? '…' : `Mark ${s.replace(/_/g, ' ')}`}
            </CardAction>
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
  const confirm = useConfirm();
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
    if (!(await confirm({
      title: `Remove this ${copy.noun}?`,
      message: 'Customers will stop seeing it immediately.',
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    try {
      await deleteProviderService('daycare', id);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <SkeletonList rows={3} />;

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={copy.title}
        subtitle={copy.blurb}
        action={(
          <button
            onClick={() => setForm(blank(copy.kinds[0]))}
            className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25"
          >
            <Plus size={16} /> Add {copy.noun}
          </button>
        )}
      />

      {!form && <InlineError>{err}</InlineError>}

      <BottomSheet
        open={!!form}
        onClose={() => setForm(null)}
        fullScreen
        title={`${form?._id ? 'Edit' : 'New'} ${copy.noun}`}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setForm(null)}>Cancel</PrimaryButton>
            <PrimaryButton
              onClick={save}
              disabled={busy || !form || form.name.trim().length < 2}
              loading={busy}
              icon={Save}
            >
              Save
            </PrimaryButton>
          </div>
        )}
      >
        {form && (
          <div className="space-y-4 pb-4">
            <InlineError>{err}</InlineError>
            <KitInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <KitInput label="Price (₹)" type="number" inputMode="decimal" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <Select
              label="Billed"
              value={form.unit || ''}
              onChange={(v) => setForm({ ...form, unit: v || null })}
              options={copy.units.map(([value, label]) => ({ value, label }))}
              hint={form.unit === 'day'
                ? 'Charged once for each day of the stay.'
                : 'Charged once for the whole stay.'}
            />
            {kind === 'plan' && (
              <KitInput label="Badge (optional)" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} />
            )}
            <Textarea
              label="Description"
              rows={2}
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
            />
            {kind === 'plan' && (
              <IncludesEditor value={form.includes || []} onChange={(includes) => setForm({ ...form, includes })} />
            )}
          </div>
        )}
      </BottomSheet>

      {!rows.length ? (
        <EmptyState text={`No ${copy.noun}s yet — add one so customers can book.`} />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s._id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold text-text-primary">{s.name}</p>
                      {s.badge && <StatusBadge label={s.badge} tone="primary" />}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{s.unit ? `per ${s.unit}` : 'one-off'}</p>
                    {s.description && <p className="text-xs text-text-secondary mt-1">{s.description}</p>}
                  </div>
                  <span className="text-[15px] font-black text-text-primary shrink-0">₹{s.price}</span>
                </div>
                {(s.includes || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.includes.map((inc) => (
                      <span key={inc} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-accent-teal/10 text-[#4C8684]">{inc}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border-light">
                <CardAction icon={Pencil} className="flex-1" onClick={() => setForm({ ...s, includes: s.includes || [], badge: s.badge || '' })}>Edit</CardAction>
                <CardAction icon={Trash2} tone="danger" onClick={() => remove(s._id)}>Remove</CardAction>
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
      <label className="block text-xs font-bold text-text-secondary mb-1">What's included</label>
      <p className="text-xs text-text-secondary mb-2">
        Listed under the plan name on the customer's booking screen — "Playtime", "Rest Area", "Priority Slots".
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((inc) => (
          <span key={inc} className="inline-flex items-center gap-1 text-[13px] font-semibold pl-3 pr-1 min-h-[36px] rounded-full bg-accent-teal/10 text-[#4C8684]">
            {inc}
            <button type="button" aria-label={`Remove ${inc}`} onClick={() => onChange(value.filter((x) => x !== inc))} className="w-8 h-8 rounded-full flex items-center justify-center">
              <X size={14} />
            </button>
          </span>
        ))}
        {!value.length && <span className="text-xs text-text-disabled">Nothing listed yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. Supervised Playtime"
          className={`${fieldClass} flex-1 min-w-0`}
        />
        <button type="button" onClick={add} className="h-12 px-4 rounded-xl bg-bg-secondary text-text-primary text-sm font-bold shrink-0">Add</button>
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

  if (loading) return <SkeletonList rows={3} />;
  if (!p) return <EmptyState text={err || 'Profile unavailable'} />;

  return (
    <div className="space-y-4">
      <InlineError>{err}</InlineError>

      <FormSection
        icon={Users}
        title="Daily capacity"
        description="How many pets you can board on any one day. Once a day reaches this number it stops appearing on the customer's calendar — a stay that crosses a full day is refused outright rather than half-booked."
      >
        <KitInput
          label="Pets per day"
          type="number"
          inputMode="numeric"
          value={details.dailyCapacity ?? 20}
          onChange={(v) => setDetail('dailyCapacity', Number(v))}
        />
      </FormSection>

      <FormSection
        title="Headline rates"
        description="Shown on your listing card. The prices actually charged come from your care plans — keep these in step with them."
      >
        <KitInput label="Per day (₹)" type="number" inputMode="decimal" value={details.pricePerDay ?? 0} onChange={(v) => setDetail('pricePerDay', Number(v))} />
        <FieldPair>
          <KitInput label="Per week (₹)" type="number" inputMode="decimal" value={details.pricePerWeek ?? 0} onChange={(v) => setDetail('pricePerWeek', Number(v))} />
          <KitInput label="Per month (₹)" type="number" inputMode="decimal" value={details.pricePerMonth ?? 0} onChange={(v) => setDetail('pricePerMonth', Number(v))} />
        </FieldPair>
      </FormSection>

      <FormSection
        title="Fees & discount"
        description="Both appear as their own line on the customer's price summary, and both are what actually gets charged."
      >
        <KitInput label="Platform fee (₹)" type="number" inputMode="decimal" value={fees.platformFee ?? 49} onChange={(v) => setFee('platformFee', Number(v))} />
        <KitInput label="Promo discount off every booking (₹)" type="number" inputMode="decimal" value={fees.discount ?? 300} onChange={(v) => setFee('discount', Number(v))} />
      </FormSection>

      <div className="flex items-center gap-2">
        <PrimaryButton onClick={save} disabled={busy} loading={busy} icon={Save} tone="teal">
          Save capacity & rates
        </PrimaryButton>
        {saved && (
          <span className="text-success text-sm font-bold flex items-center gap-1 shrink-0">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
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

  if (loading) return <SkeletonList rows={4} />;
  if (!p) return <EmptyState text={err || 'Profile unavailable'} />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary px-1">This is the card and header pet parents see in the app.</p>
      <InlineError>{err}</InlineError>

      <FormSection title="Centre profile">
        <KitInput label="Centre name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <KitInput label="Area / locality" value={p.distanceText} onChange={(v) => setP({ ...p, distanceText: v })} />
        <FieldPair>
          <KitInput label="Opens at" value={p.openTime} onChange={(v) => setP({ ...p, openTime: v })} />
          <KitInput label="Closes at" value={p.closeTime} onChange={(v) => setP({ ...p, closeTime: v })} />
        </FieldPair>
        <Textarea label="About" rows={3} value={p.about || ''} onChange={(v) => setP({ ...p, about: v })} />
        <KitChipPicker
          label="Pets you board"
          options={PET_TYPES}
          value={p.supportedPets || []}
          onChange={(supportedPets) => setP({ ...p, supportedPets })}
        />
        <p className="text-xs text-text-secondary">
          Drop-off and pick-up times offered to customers are generated from your opening hours above.
        </p>
        <Toggle
          label="Currently accepting bookings"
          checked={p.isOpen ?? true}
          onChange={(v) => setP({ ...p, isOpen: v })}
        />
      </FormSection>

      <PhotoManager
        cover={p.image}
        gallery={p.gallery || []}
        onChange={(next) => setP({ ...p, ...next })}
      />

      <FormSection title="Bank account & payout details" description="Required to receive payouts for bookings.">
        <KitInput label="Bank name" value={bankData.bankName} onChange={(v) => setBankData({ ...bankData, bankName: v })} />
        <KitInput label="Account holder name" value={bankData.accountHolder} onChange={(v) => setBankData({ ...bankData, accountHolder: v })} />
        <KitInput label="Account number" inputMode="numeric" value={bankData.accountNumber} onChange={(v) => setBankData({ ...bankData, accountNumber: v })} />
        <KitInput label="IFSC code" value={bankData.ifsc} onChange={(v) => setBankData({ ...bankData, ifsc: v.toUpperCase() })} />
        <VendorDocuments />
      </FormSection>

      <StickyActionBar
        note={saved ? (
          <span className="text-success text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>
        ) : null}
      >
        <PrimaryButton onClick={save} disabled={busy} loading={busy} icon={Save}>
          Save profile
        </PrimaryButton>
      </StickyActionBar>
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
    <FormSection
      icon={ImagePlus}
      title="Centre photos"
      description="Customers swipe through these at the top of your page. The first one is your cover — it is also the thumbnail on the search results card. Up to 20 photos."
    >
      <InlineError>{err}</InlineError>

      {!photos.length && (
        <p className="text-center py-3 text-xs text-text-secondary">
          No photos yet — your page shows an empty grey banner.
        </p>
      )}

      <ImageTiles
        photos={photos}
        showCover
        onRemove={(i) => commit(photos.filter((x) => x !== photos[i]))}
        onMove={move}
        onFiles={handleFiles}
        uploading={uploading}
        addLabel="Upload photos"
        max={20}
      />

      <PhotoUrlInput value={url} onChange={setUrl} onAdd={addUrl} />
      <p className="text-xs text-text-secondary">Photos save when you tap Save profile.</p>
    </FormSection>
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
    <KycDocumentsBlock
      documents={profile.documents || []}
      docKinds={DOC_KINDS}
      docKind={docKind}
      onDocKind={setDocKind}
      onRemove={handleRemove}
      onFile={handleFile}
      uploading={uploading}
      err={err}
      inputId="daycareDocUpload"
    />
  );
}

export default DaycareVendorPortal;
