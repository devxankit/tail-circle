import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Save, X,
  LayoutDashboard, ClipboardList, PawPrint, Phone, Home,
  HeartHandshake, IndianRupee, Eye, CalendarCheck,
} from 'lucide-react';
import {
  fetchAdoptionSummary, fetchAdoptionListings, createAdoptionListing,
  updateAdoptionListing, withdrawAdoptionListing,
  fetchAdoptionApplications, reviewAdoptionApplication, declineAdoptionApplication,
} from '../../../services/vendor';
import VerificationBanner from '../components/VerificationBanner';

/**
 * Adoption partner portal — shelters, rescues and breeders.
 *
 * This is the counterparty the adoption flow never had. Applications used to be
 * driven entirely by the applicant, who scheduled their own home check and then
 * approved their own adoption; whoever was rehoming the animal was never told
 * an application existed. The vetting steps live here now, and the adopter
 * keeps only what is genuinely theirs: applying, signing, and paying.
 */

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'applications', label: 'Applications', icon: ClipboardList },
  { key: 'listings', label: 'Pets', icon: PawPrint },
];

/** The pipeline as the shelter experiences it. */
const STEP_LABEL = {
  submitted: 'New application',
  home_check_scheduled: 'Home check scheduled',
  approved: 'Approved — reserved',
  meet_scheduled: 'Meet & greet scheduled',
  agreement_signed: 'Agreement signed',
  completed: 'Adopted',
  rejected: 'Declined',
  cancelled: 'Cancelled',
};

const STEP_ACTION = {
  home_check_scheduled: 'Schedule home check',
  approved: 'Approve application',
  meet_scheduled: 'Schedule meet & greet',
};

const STATUS_STYLE = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  home_check_scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-violet-50 text-violet-700 border-violet-200',
  meet_scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  agreement_signed: 'bg-teal-50 text-teal-700 border-teal-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const LISTING_STATUS_STYLE = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-violet-50 text-violet-700 border-violet-200',
  Adopted: 'bg-gray-100 text-gray-600 border-gray-200',
  Withdrawn: 'bg-gray-100 text-gray-400 border-gray-200',
};

export function AdoptionVendorPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'dashboard';

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchAdoptionSummary());
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
      <VerificationBanner approvalStatus="approved" onOpenKyc={() => go('dashboard')} />

      <div>
        <h1 className="text-2xl font-black text-gray-900">Adoption Partner</h1>
        <p className="text-sm text-gray-500 mt-1">
          List pets, review who applies for them, and decide who takes them home.
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
            {key === 'applications' && summary?.awaitingYourReview > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F87B68] text-white text-[10px] font-black flex items-center justify-center">
                {summary.awaitingYourReview}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === 'dashboard' && <Dashboard summary={summary} onGo={go} />}
      {view === 'applications' && <Applications onChanged={load} />}
      {view === 'listings' && <Listings onChanged={load} />}
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */

function Dashboard({ summary, onGo }) {
  const stats = [
    { label: 'Awaiting your review', value: summary.awaitingYourReview, icon: ClipboardList, urgent: true },
    { label: 'Pets available', value: summary.availableListings, icon: PawPrint },
    { label: 'Reserved', value: summary.reservedListings, icon: CalendarCheck },
    { label: 'Adopted', value: summary.adoptedListings, icon: HeartHandshake },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, urgent }) => (
          <button
            key={label}
            onClick={() => onGo(urgent ? 'applications' : 'listings')}
            className={`text-left bg-white rounded-2xl border p-5 transition hover:border-gray-300 ${
              urgent && value > 0 ? 'border-[#F87B68]/40' : 'border-gray-200'
            }`}
          >
            <Icon size={18} className={urgent && value > 0 ? 'text-[#F87B68] mb-3' : 'text-gray-400 mb-3'} />
            <p className="text-2xl font-black text-gray-900">{value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={16} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900">Adoption fees collected</h2>
          </div>
          <p className="text-3xl font-black text-gray-900">
            ₹{((summary.feesCollected || 0) / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Across {summary.completedAdoptions} completed adoption{summary.completedAdoptions === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-gray-400" />
            <h2 className="font-bold text-gray-900">How adoption works here</h2>
          </div>
          <ol className="text-xs text-gray-600 space-y-1.5 mt-2 list-decimal list-inside leading-relaxed">
            <li>You list a pet — it appears in the app straight away.</li>
            <li>Adopters apply with a questionnaire; every one lands in your inbox.</li>
            <li>You schedule a home check, then approve or decline.</li>
            <li>Approving reserves the pet — no one else can be approved for it.</li>
            <li>You schedule the meet &amp; greet.</li>
            <li>The adopter signs the agreement and pays the fee. Everyone else is closed out automatically.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ── Applications ─────────────────────────────────────────── */

function Applications({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const [scheduling, setScheduling] = useState(null); // { id, step }
  const [declining, setDeclining] = useState(null);
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchAdoptionApplications()
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const runStep = async (id, step, extra = {}) => {
    setBusy(id);
    setErr('');
    try {
      await reviewAdoptionApplication(id, { step, ...extra });
      setScheduling(null);
      setWhen('');
      setNote('');
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const decline = async (id) => {
    setBusy(id);
    setErr('');
    try {
      await declineAdoptionApplication(id, note);
      setDeclining(null);
      setNote('');
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
        <Empty text="No applications yet. They appear here the moment someone applies for one of your pets." />
      ) : rows.map((a) => (
        <div key={a._id} className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-gray-900">
                {a.applicant}
                <span className="font-medium text-gray-500"> — applying for {a.pet || 'a pet'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {a.applicationNo} · {a.petBreed} · applied {new Date(a.submittedAt).toLocaleDateString('en-IN')}
              </p>
              {a.applicantPhone && (
                <a href={`tel:${a.applicantPhone}`} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#40716F]">
                  <Phone size={13} /> {a.applicantPhone}
                </a>
              )}

              {Object.keys(a.form || {}).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(a.form).slice(0, 6).map(([k, v]) => (
                    <span key={k} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
                      <span className="text-gray-500">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              )}

              {a.homeCheck?.scheduledAt && (
                <p className="mt-2 text-xs text-gray-600 flex items-center gap-1.5">
                  <Home size={13} className="text-gray-400" /> Home check {a.homeCheck.scheduledAt}
                  {a.homeCheck.notes ? ` — ${a.homeCheck.notes}` : ''}
                </p>
              )}
              {a.meet?.scheduledAt && (
                <p className="mt-1 text-xs text-gray-600 flex items-center gap-1.5">
                  <CalendarCheck size={13} className="text-gray-400" /> Meet &amp; greet {a.meet.scheduledAt}
                </p>
              )}
              {a.status === 'rejected' && a.decisionReason && (
                <p className="mt-2 text-xs text-red-600">Declined — {a.decisionReason}</p>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${STATUS_STYLE[a.status] || ''}`}>
                {STEP_LABEL[a.status] || a.status}
              </span>
              {a.fee > 0 && <p className="font-black text-gray-900 mt-2">₹{a.fee}</p>}
            </div>
          </div>

          {/* Whose turn it is. The server refuses anything else, so the portal
              only ever offers the step it will actually accept. */}
          {(a.nextStep || a.canDecline) && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap items-center">
              {a.nextStep && (
                <button
                  onClick={() => (
                    a.nextStep === 'approved'
                      ? runStep(a._id, 'approved')
                      : setScheduling({ id: a._id, step: a.nextStep })
                  )}
                  disabled={busy === a._id}
                  className="px-3 py-1.5 rounded-lg bg-[#40716F] text-white text-xs font-bold disabled:opacity-50"
                >
                  {busy === a._id ? '…' : STEP_ACTION[a.nextStep]}
                </button>
              )}
              {!a.nextStep && a.canDecline && (
                <span className="text-xs text-gray-500 font-medium">
                  Waiting on the adopter to {a.status === 'meet_scheduled' ? 'sign the agreement' : 'pay the fee'}.
                </span>
              )}
              {a.canDecline && (
                <button
                  onClick={() => { setDeclining(a._id); setNote(''); }}
                  disabled={busy === a._id}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-50"
                >
                  Decline
                </button>
              )}
            </div>
          )}

          {scheduling?.id === a._id && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase">
                {scheduling.step === 'home_check_scheduled' ? 'Home check date' : 'Meet & greet date'}
              </label>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="date" value={when} onChange={(e) => setWhen(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Note for the adopter (optional)"
                  className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => runStep(a._id, scheduling.step, { scheduledAt: when, notes: note })}
                  disabled={!when || busy === a._id}
                  className="px-4 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50"
                >
                  Confirm
                </button>
                <button onClick={() => setScheduling(null)} className="px-3 text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {declining === a._id && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase">
                Why are you declining? The adopter is told.
              </label>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Home not suitable for a high-energy dog"
                  className="flex-1 min-w-[220px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => decline(a._id)}
                  disabled={busy === a._id}
                  className="px-4 rounded-lg bg-[#F87B68] text-white text-sm font-bold disabled:opacity-50"
                >
                  Decline
                </button>
                <button onClick={() => setDeclining(null)} className="px-3 text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Listings ─────────────────────────────────────────────── */

const blankPet = () => ({
  name: '', type: 'Dog', breed: '', age: 'Young', gender: 'Male',
  price: 0, location: '', about: '', images: [],
  vaccinated: false, dewormed: false, neutered: false,
});

function Listings({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchAdoptionListings()
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        breed: form.breed.trim(),
        age: form.age,
        gender: form.gender,
        price: Number(form.price) || 0,
        location: form.location || undefined,
        about: form.about || undefined,
        images: form.images?.filter(Boolean),
        vaccinated: form.vaccinated,
        dewormed: form.dewormed,
        neutered: form.neutered,
      };
      if (form._id) await updateAdoptionListing(form._id, payload);
      else await createAdoptionListing(payload);
      setForm(null);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (row) => {
    if (!window.confirm(`Take ${row.name} off the app?`)) return;
    setErr('');
    try {
      await withdrawAdoptionListing(row._id);
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
          <h2 className="font-bold text-gray-900">Pets you are rehoming</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            A pet goes live the moment you add it. Approving an application reserves it automatically.
          </p>
        </div>
        <button
          onClick={() => setForm(blankPet())}
          className="px-4 h-10 rounded-xl bg-[#40716F] text-white text-sm font-bold flex items-center gap-2 shrink-0"
        >
          <Plus size={15} /> Add a pet
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {form && (
        <div className="bg-white rounded-2xl border-2 border-[#40716F] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{form._id ? 'Edit' : 'New'} pet</h3>
            <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Breed" value={form.breed} onChange={(v) => setForm({ ...form, breed: v })} />
            <Select
              label="Species" value={form.type} onChange={(v) => setForm({ ...form, type: v })}
              options={['Dog', 'Cat', 'Rabbit', 'Bird']}
            />
            <Select
              label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })}
              options={['Baby', 'Young', 'Adult', 'Senior']}
            />
            <Select
              label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
              options={['Male', 'Female']}
            />
            <Input
              label="Adoption fee (₹) — 0 for free"
              type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })}
            />
            <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <Input
              label="Photo URL"
              value={form.images?.[0] || ''}
              onChange={(v) => setForm({ ...form, images: v ? [v] : [] })}
            />
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">About this pet</label>
              <textarea
                rows={3} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[['vaccinated', 'Vaccinated'], ['dewormed', 'Dewormed'], ['neutered', 'Neutered']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox" checked={Boolean(form[key])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setForm(null)} className="px-4 h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancel</button>
            <button
              onClick={save}
              disabled={busy || !form.name.trim() || !form.breed.trim()}
              className="px-4 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {!rows.length ? (
        <Empty text="No pets listed yet — add one so adopters can find them." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <PawPrint size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${LISTING_STATUS_STYLE[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.breed} · {p.age} · {p.gender}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.price > 0 ? `₹${p.price} adoption fee` : 'Free to a good home'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.vaccinated && <Tag>Vaccinated</Tag>}
                    {p.dewormed && <Tag>Dewormed</Tag>}
                    {p.neutered && <Tag>Neutered</Tag>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => setForm({ ...p })} className="text-xs font-bold text-[#40716F] hover:underline">Edit</button>
                  {p.status !== 'Withdrawn' && p.status !== 'Adopted' && (
                    <button onClick={() => withdraw(p)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              {p.status === 'Pending' && (
                <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] font-semibold text-violet-700 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Reserved for an approved applicant.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Primitives ───────────────────────────────────────────── */

const Tag = ({ children }) => (
  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EAF3F1] text-[#40716F]">{children}</span>
);

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

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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

export default AdoptionVendorPortal;
