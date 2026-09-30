import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Save, Clock,
  ClipboardList, IndianRupee, Star, CalendarCheck,
  Home, MapPin, X, Eye, ChevronRight,
  ImagePlus, Navigation, Pencil,
} from 'lucide-react';
import {
  fetchProviderSummary, fetchProviderProfile, updateProviderProfile,
  fetchProviderServices, createProviderService, updateProviderService, deleteProviderService,
  fetchProviderSlots, saveProviderSlots,
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
  FormSection, ScreenHeader, SectionLabel, Input as KitInput, Select, Textarea, Toggle, Checkbox,
  ChipPicker as KitChipPicker, FieldPair, ImageTiles, EmptyState, SkeletonList, ScreenError,
  InlineError, CardAction, useConfirm, fieldClass, DayStrip, DateNav, FilterChips,
  KycDocumentsBlock, PhotoUrlInput,
} from '../vendor/mobile';

/**
 * Grooming salon vendor portal.
 *
 * Laid out to mirror the customer's booking screens one-for-one, because every
 * field here is something a pet parent reads on the other side:
 *
 *   Packages   → "1. Choose a Package"   (name, price, the `includes` chips,
 *                                         the "popular" ribbon)
 *   Add-ons    → "2. Add Extra Services" (the icon grid)
 *   Time slots → the date + slot strip   (only these times are bookable)
 *   Salon      → the hero card, visit types, travel fee and promo discount
 *   Bookings   → what the customer actually sent through checkout
 *
 * Daycare centres keep the generic `ProviderVendorPortal`; the two verticals
 * had diverged far enough that sharing one form left grooming unable to edit
 * half of what its customers see.
 *
 * In the partner app the views are reached from the bottom nav (Home,
 * Bookings, Services → Packages / Add-ons / Time slots) and More (Salon
 * profile); the `?view=` values are the ones the old sidebar used.
 */

const YMD = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function GroomingVendorPortal() {
  const vertical = 'grooming';
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
      {view === 'packages' && <Catalogue kind="package" onChanged={load} />}
      {view === 'addons' && <Catalogue kind="addon" onChanged={load} />}
      {view === 'slots' && <Slots />}
      {view === 'profile' && <Profile onChanged={load} />}
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */

function Dashboard({ summary, onGo }) {
  const stats = [
    { label: 'Today', value: summary.todaysBookings, icon: Clock, tone: 'primary' },
    { label: 'Upcoming', value: summary.upcomingBookings, icon: CalendarCheck, tone: 'teal' },
    { label: 'Home visits due', value: summary.upcomingHomeVisits, icon: Home, tone: 'teal' },
    { label: 'Total bookings', value: summary.totalBookings, icon: ClipboardList },
  ];

  // What a pet parent needs before your salon is bookable at all. Each row maps
  // to a step of their booking screen, which is why an empty one blocks it.
  const checklist = [
    {
      done: summary.packageCount > 0,
      label: `${summary.packageCount} package${summary.packageCount === 1 ? '' : 's'} listed`,
      hint: 'Customers pick one of these first — with none, they cannot book.',
      tab: 'packages',
    },
    {
      done: summary.slotCount > 0,
      label: `${summary.slotCount} bookable time${summary.slotCount === 1 ? '' : 's'} a day`,
      hint: 'The slot strip on the booking screen is exactly this list.',
      tab: 'slots',
    },
    {
      done: (summary.visitTypes || []).length > 0,
      label: (summary.visitTypes || []).join(' · ') || 'No visit type set',
      hint: 'Salon Visit and/or Home Visit — the toggle shown at checkout.',
      tab: 'profile',
    },
    {
      done: summary.addonCount > 0,
      label: `${summary.addonCount} add-on${summary.addonCount === 1 ? '' : 's'} offered`,
      hint: 'Optional, but this is the "Add Extra Services" grid.',
      tab: 'addons',
      optional: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero: who is live and what they have earned. */}
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-lg font-black leading-tight">{summary?.providerName || 'Grooming Partner'}</p>
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
          Across {summary.completedBookings} completed and {summary.upcomingBookings} upcoming appointments.
        </p>
      </div>

      <StatGrid tiles={stats} />

      <StatGrid
        tiles={[
          { label: `Rating · ${summary.ratingCount ?? 0} reviews`, value: summary.rating ?? 0, icon: Star, tone: 'warning' },
          {
            label: 'Daily capacity',
            value: summary.dailyCapacity ?? 0,
            icon: Clock,
            hint: `Pets across ${summary.slotCount ?? 0} slots — the seats customers compete for.`,
          },
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

/* ── Appointments ─────────────────────────────────────────── */

const NEXT_STATUS = {
  pending_payment: [],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function Bookings({ onChanged }) {
  const [mode, setMode] = useState('day'); // day sheet | full list
  const [date, setDate] = useState(() => YMD(new Date()));
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    fetchProviderBookings('grooming', mode === 'day' ? { date } : { status: status || undefined })
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [mode, date, status]);

  useEffect(() => { load(); }, [load]);

  const move = async (id, next) => {
    setBusy(id);
    setErr('');
    try {
      await updateProviderBookingStatus('grooming', id, next);
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
        items={[{ key: 'day', label: 'Day sheet' }, { key: 'all', label: 'All appointments' }]}
        activeKey={mode}
        onSelect={setMode}
      />

      {mode === 'day' ? (
        <div className="space-y-3">
          <DateNav value={date} onChange={setDate} onShift={shiftDay} onToday={() => setDate(YMD(new Date()))} />
          <DayStrip value={date} onChange={setDate} />
        </div>
      ) : (
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: 'Every status' }, ...Object.keys(NEXT_STATUS).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]}
        />
      )}

      <p className="text-xs font-bold text-text-secondary px-1">
        {loading ? '…' : `${rows.length} appointment${rows.length === 1 ? '' : 's'}`}
      </p>

      <InlineError>{err}</InlineError>

      {loading ? (
        <SkeletonList rows={3} />
      ) : !rows.length ? (
        <EmptyState icon={CalendarCheck} text={mode === 'day' ? `Nothing booked for ${date}.` : 'No appointments yet.'} />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => <BookingCard key={b._id} b={b} busy={busy === b._id} onMove={move} />)}
        </div>
      )}
    </div>
  );
}

function BookingCard({ b, busy, onMove }) {
  const isHome = b.visitType === 'home';
  const addr = b.addressSnapshot;
  const priced = (b.items || []).filter((i) => i.kind !== 'fee');
  const fees = (b.items || []).filter((i) => i.kind === 'fee');

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
              {b.bookingNo} • {b.schedule?.startDate || '—'} {b.schedule?.time || ''}
            </p>
            {(b.petSnapshot?.breed || b.petId?.breed) && (
              <p className="text-xs text-text-secondary mt-0.5">
                {b.petSnapshot?.breed || b.petId?.breed}
                {b.petSnapshot?.age ? ` · ${b.petSnapshot.age}` : ''}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <StatusBadge status={b.status} />
            <p className="text-[15px] font-black text-text-primary mt-1.5">{rupees(b.amounts?.total)}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {b.paymentMethod === 'pay_later' ? 'Collect at salon' : b.paymentMethod === 'free' ? 'No charge' : 'Paid online'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${
            isHome ? 'bg-accent-teal/10 text-[#4C8684]' : 'bg-bg-secondary text-text-secondary'
          }`}>
            {isHome ? 'Home visit' : 'Salon visit'}
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

        {isHome && addr && (
          <div className="mt-3 flex items-start gap-2 text-xs text-text-primary bg-accent-teal/5 border border-accent-teal/20 rounded-xl p-3">
            <MapPin size={14} className="text-[#4C8684] shrink-0 mt-0.5" />
            <span>
              {[addr.line1, addr.locality, addr.city, addr.pincode].filter(Boolean).join(', ')}
              {addr.phone ? <span className="block font-bold mt-0.5">{addr.name} · {addr.phone}</span> : null}
            </span>
          </div>
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

/* ── Packages & add-ons ───────────────────────────────────── */

const CATALOGUE_COPY = {
  package: {
    title: 'Packages',
    noun: 'package',
    // `menu_item` rows are per-salon à-la-carte services; the customer's screen
    // shows them in the same "Add Extra Services" grid as platform add-ons, so
    // the two are managed together here.
    kinds: ['package'],
    blurb: 'Step 1 of the customer\'s booking screen. They pick exactly one of these.',
    showIncludes: true,
    showCategory: false,
  },
  addon: {
    title: 'Add-ons & à-la-carte',
    noun: 'add-on',
    kinds: ['addon', 'menu_item'],
    blurb: 'Step 2 — the "Add Extra Services" grid. Customers can pick any number.',
    showIncludes: false,
    showCategory: true,
  },
};

const blank = (kind) => ({
  name: '', description: '', price: 0, kind, category: '', includes: [], isPopular: false,
});

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
    fetchProviderServices('grooming')
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
        category: copy.showCategory ? (form.category || undefined) : undefined,
        includes: copy.showIncludes ? (form.includes || []) : undefined,
        isPopular: copy.showIncludes ? Boolean(form.isPopular) : undefined,
      };
      if (form._id) await updateProviderService('grooming', form._id, payload);
      else await createProviderService('grooming', payload);
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
      await deleteProviderService('grooming', id);
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

            {copy.showCategory && (
              <>
                <Select
                  label="Type"
                  value={form.kind}
                  onChange={(v) => setForm({ ...form, kind: v })}
                  options={[{ value: 'addon', label: 'Add-on' }, { value: 'menu_item', label: 'À-la-carte service' }]}
                />
                <KitInput
                  label="Category (groups it on the menu)"
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                />
              </>
            )}

            <Textarea
              label="Description"
              rows={2}
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
            />

            {copy.showIncludes && (
              <>
                <IncludesEditor
                  value={form.includes || []}
                  onChange={(includes) => setForm({ ...form, includes })}
                />
                <Checkbox
                  label="Highlight as the most popular package"
                  checked={Boolean(form.isPopular)}
                  onChange={(v) => setForm({ ...form, isPopular: v })}
                />
              </>
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
                      {s.isPopular && <StatusBadge label="Popular" tone="primary" />}
                      {s.kind === 'menu_item' && <StatusBadge label="À la carte" tone="neutral" />}
                    </div>
                    {s.category && <p className="text-xs text-text-secondary mt-0.5">{s.category}</p>}
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
                <CardAction icon={Pencil} className="flex-1" onClick={() => setForm({ ...s, includes: s.includes || [] })}>Edit</CardAction>
                <CardAction icon={Trash2} tone="danger" onClick={() => remove(s._id)}>Remove</CardAction>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The chips a customer reads under a package name on the booking card. */
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
        Shown as chips on the customer's package card, one per service — "Bath", "Nail Trim", "Blow Dry".
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
          placeholder="e.g. Ear Cleaning"
          className={`${fieldClass} flex-1 min-w-0`}
        />
        <button type="button" onClick={add} className="h-12 px-4 rounded-xl bg-bg-secondary text-text-primary text-sm font-bold shrink-0">Add</button>
      </div>
    </div>
  );
}

/* ── Time slots ───────────────────────────────────────────── */

const PERIODS = ['Morning', 'Afternoon', 'Evening'];

/** "14:30" or "2:30 pm" → the "02:30 PM" label the booking screen renders. */
function normaliseTime(raw) {
  const text = String(raw || '').trim();
  const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec(text);
  if (!m) return null;
  let hours = Number(m[1]);
  const mins = Number(m[2]);
  if (mins > 59) return null;
  const suffix = m[3]?.toUpperCase();
  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    if (suffix === 'PM' && hours !== 12) hours += 12;
    if (suffix === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23) return null;
  const period = hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : 'Evening';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return {
    time: `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`,
    period,
    minutes: hours * 60 + mins,
  };
}

function Slots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState('09:00 AM');
  const [draftCapacity, setDraftCapacity] = useState(1);

  useEffect(() => {
    fetchProviderSlots('grooming')
      .then((s) => setSlots(s || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addSlot = () => {
    const parsed = normaliseTime(draft);
    if (!parsed) { setErr('Enter a time like 09:00 AM or 14:30'); return; }
    if (slots.some((s) => s.time === parsed.time)) { setErr(`${parsed.time} is already on the list`); return; }
    setErr('');
    setSlots([...slots, { time: parsed.time, period: parsed.period, capacity: Math.max(1, Number(draftCapacity) || 1) }]);
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      // Sorted before saving so the customer's slot strip reads chronologically
      // rather than in the order the salon happened to type them.
      const ordered = [...slots].sort(
        (a, b) => (normaliseTime(a.time)?.minutes ?? 0) - (normaliseTime(b.time)?.minutes ?? 0)
      );
      setSlots(await saveProviderSlots('grooming', ordered));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <SkeletonList rows={3} />;

  const byPeriod = PERIODS.map((p) => ({
    period: p,
    items: slots
      .filter((s) => (s.period || normaliseTime(s.time)?.period) === p)
      .sort((a, b) => (normaliseTime(a.time)?.minutes ?? 0) - (normaliseTime(b.time)?.minutes ?? 0)),
  }));

  const totalSeats = slots.reduce((s, t) => s + (Number(t.capacity) || 1), 0);

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Bookable time slots"
        subtitle="These are the only times a customer can pick, every day. Capacity is how many pets you can take in one slot — the booking screen greys a slot out once it is full."
      />

      <div className="flex items-center gap-2">
        <PrimaryButton onClick={save} disabled={busy} loading={busy} icon={Save} tone="teal">
          Save slots
        </PrimaryButton>
        {saved && (
          <span className="text-success text-sm font-bold flex items-center gap-1 shrink-0">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
      </div>

      <InlineError>{err}</InlineError>

      <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-3">
        <FieldPair>
          <KitInput
            label="Time"
            value={draft}
            onChange={setDraft}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSlot(); } }}
            placeholder="09:00 AM"
          />
          <KitInput
            label="Pets per slot"
            type="number" min={1} max={50} inputMode="numeric"
            value={draftCapacity}
            onChange={setDraftCapacity}
          />
        </FieldPair>
        <button onClick={addSlot} className="w-full h-12 rounded-xl bg-text-primary text-white text-sm font-bold flex items-center justify-center gap-1.5">
          <Plus size={16} /> Add slot
        </button>
        <p className="text-xs font-bold text-text-secondary text-center">
          {slots.length} slots · {totalSeats} pets a day
        </p>
      </div>

      {!slots.length ? (
        <EmptyState icon={Clock} text="No slots configured — your salon shows no bookable times at all." />
      ) : (
        <div className="space-y-4">
          {byPeriod.filter((g) => g.items.length).map((group) => (
            <div key={group.period}>
              <SectionLabel>{group.period}</SectionLabel>
              <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
                {group.items.map((s, i) => (
                  <div key={s.time} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border-light' : ''}`}>
                    <span className="font-bold text-text-primary text-sm flex-1">{s.time}</span>
                    <label className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">pets</span>
                      <input
                        type="number" min={1} max={50} inputMode="numeric" value={s.capacity ?? 1}
                        onChange={(e) => setSlots(slots.map((x) => (
                          x.time === s.time ? { ...x, capacity: Math.max(1, Number(e.target.value) || 1) } : x
                        )))}
                        className="w-16 h-11 rounded-xl border border-border-light px-2 text-center text-[16px] font-bold text-text-primary"
                      />
                    </label>
                    <button
                      onClick={() => setSlots(slots.filter((x) => x.time !== s.time))}
                      aria-label={`Remove ${s.time}`}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-error bg-error/5 shrink-0"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye size={16} className="text-text-secondary" />
          <h3 className="text-[15px] font-bold text-text-primary">What the customer sees</h3>
        </div>
        <p className="text-xs text-text-secondary mb-3">Unsaved edits appear here first.</p>
        {!slots.length ? (
          <p className="text-sm text-text-disabled">"No slots open on this date. Try another date."</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            {byPeriod.flatMap((g) => g.items).map((s) => (
              <div key={s.time} className="min-w-[110px] rounded-[12px] border border-border-light bg-white py-3 text-center shrink-0">
                <p className="text-[13px] font-black text-text-primary">{s.time}</p>
                <p className="text-[11px] text-text-secondary mt-0.5">{s.period || normaliseTime(s.time)?.period}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Salon profile ────────────────────────────────────────── */

const VISIT_TYPES = ['Salon Visit', 'Home Visit'];
const PET_TYPES = ['Dogs', 'Cats', 'Rabbits', 'Birds'];

function Profile({ onChanged }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const [bankData, setBankData] = useState({ bankName: '', accountHolder: '', accountNumber: '', ifsc: '' });

  useEffect(() => {
    fetchProviderProfile('grooming')
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

  const fees = p?.details?.groomingFees || {};

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  const handleDetectLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    setGpsStatus('Fetching live GPS location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;
        setGpsStatus(`📍 Captured Live GPS: ${lat}, ${lng}`);

        let updateObj = {
          ...p,
          geoCoords: { lat, lng },
        };

        try {
          if (window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat, lng } });
            if (res.results && res.results[0]) {
              const comp = res.results[0].address_components;
              let city = '', state = '', pincode = '', street = '';
              for (const c of comp) {
                if (c.types.includes('locality')) city = c.long_name;
                if (c.types.includes('administrative_area_level_1')) state = c.long_name;
                if (c.types.includes('postal_code')) pincode = c.long_name;
                if (c.types.includes('route') || c.types.includes('sublocality_level_1')) {
                  street = street ? `${street}, ${c.long_name}` : c.long_name;
                }
              }
              if (city) updateObj.city = updateObj.city || city;
              if (state) updateObj.state = updateObj.state || state;
              if (pincode) updateObj.pincode = updateObj.pincode || pincode;
              if (street) updateObj.distanceText = updateObj.distanceText || street;
              if (res.results[0].formatted_address) {
                updateObj.address = updateObj.address || res.results[0].formatted_address;
              }
            }
          }
        } catch {}

        setP(updateObj);
        setDetectingGps(false);
      },
      (err) => {
        setGpsStatus(`Could not fetch location: ${err.message}`);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      if (bankData.bankName || bankData.accountNumber) {
        await updateVendorProfile({ bank: bankData });
      }
      const next = await updateProviderProfile('grooming', {
        name: p.name,
        about: p.about,
        image: p.image,
        gallery: p.gallery || [],
        openTime: p.openTime,
        closeTime: p.closeTime,
        startingPrice: Number(p.startingPrice) || 0,
        supportedPets: p.supportedPets,
        visitTypes: p.visitTypes,
        distanceText: p.distanceText,
        address: p.address,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        geoCoords: p.geoCoords,
        isOpen: p.isOpen,
        groomingFees: {
          travelFee: Number(fees.travelFee ?? 50) || 0,
          discount: Number(fees.discount ?? 100) || 0,
        },
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

  const setFee = (key, value) => setP({
    ...p,
    details: { ...(p.details || {}), groomingFees: { ...fees, [key]: value } },
  });

  if (loading) return <SkeletonList rows={4} />;
  if (!p) return <EmptyState text={err || 'Profile unavailable'} />;

  const homeVisitOffered = (p.visitTypes || []).includes('Home Visit');

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary px-1">This is the card and header pet parents see in the app.</p>
      <InlineError>{err}</InlineError>

      <FormSection title="Salon profile">
        <KitInput label="Salon name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <FieldPair>
          <KitInput label="Opens at" value={p.openTime} onChange={(v) => setP({ ...p, openTime: v })} />
          <KitInput label="Closes at" value={p.closeTime} onChange={(v) => setP({ ...p, closeTime: v })} />
        </FieldPair>
        <KitInput
          label="Starting price (₹) — the 'starts at' figure on your card"
          type="number" inputMode="decimal" value={p.startingPrice} onChange={(v) => setP({ ...p, startingPrice: v })}
        />
        <Textarea label="About" rows={3} value={p.about || ''} onChange={(v) => setP({ ...p, about: v })} />
      </FormSection>

      {/* Shop Location & Map Settings */}
      <FormSection
        icon={MapPin}
        title="Shop Address & Location Pin"
        description="Set your shop address, city, pincode, and GPS coordinates so customers can find and navigate to your salon."
      >
        <button
          type="button"
          onClick={handleDetectLiveGps}
          disabled={detectingGps}
          className="w-full h-12 rounded-xl bg-accent-teal/10 text-[#4C8684] text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
        >
          {detectingGps ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          {detectingGps ? 'Fetching GPS…' : 'Use Live GPS Location'}
        </button>

        {gpsStatus && (
          <div className="p-3 bg-success/5 border border-success/25 rounded-xl text-xs font-medium text-text-primary space-y-1">
            <p>{gpsStatus}</p>
            {p.geoCoords?.lat && (
              <span className="inline-block text-[11px] bg-success/10 text-success px-2 py-0.5 rounded font-bold">
                {p.geoCoords.lat}, {p.geoCoords.lng}
              </span>
            )}
          </div>
        )}

        <KitInput
          label="Shop / Building Address"
          placeholder="e.g. Shop 14, Lotus Park, Link Road"
          value={p.address || ''}
          onChange={(v) => setP({ ...p, address: v })}
        />
        <KitInput
          label="Area / Locality"
          placeholder="e.g. Bandra West"
          value={p.distanceText || ''}
          onChange={(v) => setP({ ...p, distanceText: v })}
        />
        <KitInput
          label="City"
          placeholder="e.g. Mumbai"
          value={p.city || ''}
          onChange={(v) => setP({ ...p, city: v })}
        />
        <KitInput
          label="State"
          placeholder="e.g. Maharashtra"
          value={p.state || ''}
          onChange={(v) => setP({ ...p, state: v })}
        />
        <KitInput
          label="Pincode / Postal Code"
          placeholder="e.g. 400050"
          inputMode="numeric"
          value={p.pincode || ''}
          onChange={(v) => setP({ ...p, pincode: v })}
        />
        <FieldPair>
          <KitInput
            label="Latitude"
            type="number"
            step="0.00001"
            inputMode="decimal"
            value={p.geoCoords?.lat ?? ''}
            onChange={(v) =>
              setP({
                ...p,
                geoCoords: { ...(p.geoCoords || {}), lat: v ? Number(v) : null },
              })
            }
          />
          <KitInput
            label="Longitude"
            type="number"
            step="0.00001"
            inputMode="decimal"
            value={p.geoCoords?.lng ?? ''}
            onChange={(v) =>
              setP({
                ...p,
                geoCoords: { ...(p.geoCoords || {}), lng: v ? Number(v) : null },
              })
            }
          />
        </FieldPair>
      </FormSection>

      <FormSection title="Pets & visits">
        <KitChipPicker
          label="Pets you groom"
          options={PET_TYPES}
          value={p.supportedPets || []}
          onChange={(supportedPets) => setP({ ...p, supportedPets })}
        />
        <KitChipPicker
          label="Visit types offered"
          hint="Customers see exactly these options at checkout."
          options={VISIT_TYPES}
          value={p.visitTypes || []}
          onChange={(visitTypes) => setP({ ...p, visitTypes })}
        />
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

      <FormSection
        title="Fees & discount"
        description="Both appear as their own line on the customer's price summary, and both are what actually gets charged."
      >
        <KitInput
          label="Home-visit travel fee (₹)"
          type="number"
          inputMode="decimal"
          value={fees.travelFee ?? 50}
          onChange={(v) => setFee('travelFee', Number(v))}
          hint={!homeVisitOffered ? "Not charged — you don't offer home visits." : undefined}
        />
        <KitInput
          label="Promo discount off every booking (₹)"
          type="number"
          inputMode="decimal"
          value={fees.discount ?? 100}
          onChange={(v) => setFee('discount', Number(v))}
        />
      </FormSection>

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

/**
 * The salon's photo strip, as the customer swipes it.
 *
 * The profile only ever had a single "Cover image URL" box, so a salon had no
 * way to add the extra photos the detail screen's slider is built to show.
 * Order matters — position 1 is the cover, and it is the thumbnail used on the
 * listing card — so photos can be shuffled left/right here.
 */
function PhotoManager({ cover, gallery, onChange }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  // One ordered list; the first entry is the cover. Keeping them merged here
  // avoids the "cover is also in the gallery, so it shows twice" duplicate.
  const photos = useMemo(() => dedupePhotos([cover, ...(gallery || [])]), [cover, gallery]);

  const commit = (next) => {
    const clean = dedupePhotos(next).slice(0, 20);
    onChange({ image: clean[0] || '', gallery: clean.slice(1) });
  };

  const addUrl = () => {
    const next = url.trim();
    if (!next) return;
    // Same-photo-different-size counts as a duplicate, so compare on the path.
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
      const urls = await Promise.all(files.map((f) => uploadVendorFile(f, 'grooming-gallery')));
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
      title="Salon photos"
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

/** KYC document upload — shared VendorProfile.documents, reviewed by admin. */
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
      inputId="groomingDocUpload"
    />
  );
}

export default GroomingVendorPortal;
