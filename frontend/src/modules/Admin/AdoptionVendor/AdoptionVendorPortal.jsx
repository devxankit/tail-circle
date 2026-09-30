import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Plus, Trash2, Save,
  ClipboardList, PawPrint, Phone, Home,
  HeartHandshake, IndianRupee, Eye, CalendarCheck, Pencil,
} from 'lucide-react';
import {
  fetchAdoptionSummary, fetchAdoptionListings, createAdoptionListing,
  updateAdoptionListing, withdrawAdoptionListing,
  fetchAdoptionApplications, reviewAdoptionApplication, declineAdoptionApplication,
} from '../../../services/vendor';
import VerificationBanner from '../components/VerificationBanner';
import {
  StatGrid, StatusBadge, BottomSheet, PrimaryButton, ScreenHeader, SectionLabel,
  Input as KitInput, Select as KitSelect, Textarea, Checkbox, FieldPair, EmptyState, SkeletonList,
  ScreenError, InlineError, CardAction, useConfirm, useNavBadge,
} from '../vendor/mobile';

/**
 * Adoption partner portal — shelters, rescues and breeders.
 *
 * This is the counterparty the adoption flow never had. Applications used to be
 * driven entirely by the applicant, who scheduled their own home check and then
 * approved their own adoption; whoever was rehoming the animal was never told
 * an application existed. The vetting steps live here now, and the adopter
 * keeps only what is genuinely theirs: applying, signing, and paying.
 *
 * In the partner app: Home, Applications (with the awaiting-review count on
 * its tab) and Pets are bottom-nav tabs on the same `?view=` values.
 */

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

/** Pipeline stage → badge tone. */
const STATUS_TONE = {
  submitted: 'warning',
  home_check_scheduled: 'info',
  approved: 'primary',
  meet_scheduled: 'info',
  agreement_signed: 'info',
  completed: 'success',
  rejected: 'error',
  cancelled: 'neutral',
};

const LISTING_TONE = {
  Available: 'success',
  Pending: 'primary',
  Adopted: 'neutral',
  Withdrawn: 'neutral',
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

  // The count the Applications tab used to carry, now on the bottom nav.
  useNavBadge('applications', summary?.awaitingYourReview || 0);

  const go = (v) => setSearchParams(v === 'dashboard' ? {} : { view: v });

  if (loading) {
    return <SkeletonList rows={4} />;
  }

  if (error) {
    return <ScreenError message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-4">
      <VerificationBanner approvalStatus="approved" onOpenKyc={() => go('dashboard')} />

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
    <div className="space-y-4">
      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-5 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-lg font-black leading-tight">Adoption Partner</p>
        <p className="text-xs font-medium opacity-90 mt-1">
          List pets, review who applies for them, and decide who takes them home.
        </p>
        <div className="mt-5 flex items-center gap-2 opacity-85">
          <IndianRupee size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Adoption fees collected</span>
        </div>
        <p className="text-[32px] font-black leading-none mt-1">
          ₹{((summary.feesCollected || 0) / 100).toLocaleString('en-IN')}
        </p>
        <p className="text-[11px] opacity-85 mt-2">
          Across {summary.completedAdoptions} completed adoption{summary.completedAdoptions === 1 ? '' : 's'}.
        </p>
      </div>

      <StatGrid
        tiles={stats.map(({ label, value, icon, urgent }) => ({
          label,
          value,
          icon,
          tone: urgent && value > 0 ? 'primary' : 'neutral',
          onClick: () => onGo(urgent ? 'applications' : 'listings'),
        }))}
      />

      <div>
        <SectionLabel>How adoption works here</SectionLabel>
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
          <div className="flex items-start gap-2">
            <Eye size={16} className="text-text-secondary mt-0.5 shrink-0" />
            <ol className="text-xs text-text-primary space-y-2 list-decimal list-inside leading-relaxed">
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

  if (loading) return <SkeletonList rows={3} />;

  const schedulingRow = scheduling ? rows.find((r) => r._id === scheduling.id) : null;
  const decliningRow = declining ? rows.find((r) => r._id === declining) : null;

  return (
    <div className="space-y-3">
      <InlineError>{err}</InlineError>
      {!rows.length ? (
        <EmptyState icon={ClipboardList} text="No applications yet. They appear here the moment someone applies for one of your pets." />
      ) : rows.map((a) => (
        <div key={a._id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-text-primary leading-snug">
                  {a.applicant}
                  <span className="font-medium text-text-secondary"> — applying for {a.pet || 'a pet'}</span>
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {a.applicationNo} · {a.petBreed} · applied {new Date(a.submittedAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <StatusBadge label={STEP_LABEL[a.status] || a.status} tone={STATUS_TONE[a.status] || 'neutral'} />
                {a.fee > 0 && <p className="text-[15px] font-black text-text-primary mt-1.5">₹{a.fee}</p>}
              </div>
            </div>

            {a.applicantPhone && (
              <a href={`tel:${a.applicantPhone}`} className="mt-3 min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-xl bg-accent-teal/10 text-xs font-bold text-[#4C8684]">
                <Phone size={14} /> {a.applicantPhone}
              </a>
            )}

            {Object.keys(a.form || {}).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(a.form).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-bg-primary border border-border-light text-text-primary">
                    <span className="text-text-secondary">{k}:</span> {String(v)}
                  </span>
                ))}
              </div>
            )}

            {a.homeCheck?.scheduledAt && (
              <p className="mt-3 text-xs text-text-primary flex items-center gap-1.5">
                <Home size={14} className="text-text-secondary shrink-0" /> Home check {a.homeCheck.scheduledAt}
                {a.homeCheck.notes ? ` — ${a.homeCheck.notes}` : ''}
              </p>
            )}
            {a.meet?.scheduledAt && (
              <p className="mt-1.5 text-xs text-text-primary flex items-center gap-1.5">
                <CalendarCheck size={14} className="text-text-secondary shrink-0" /> Meet &amp; greet {a.meet.scheduledAt}
              </p>
            )}
            {a.status === 'rejected' && a.decisionReason && (
              <p className="mt-2 text-xs text-error">Declined — {a.decisionReason}</p>
            )}
          </div>

          {/* Whose turn it is. The server refuses anything else, so the portal
              only ever offers the step it will actually accept. */}
          {(a.nextStep || a.canDecline) && (
            <div className="px-4 pb-4 pt-3 border-t border-border-light space-y-2">
              {!a.nextStep && a.canDecline && (
                <p className="text-xs text-text-secondary font-medium">
                  Waiting on the adopter to {a.status === 'meet_scheduled' ? 'sign the agreement' : 'pay the fee'}.
                </p>
              )}
              <div className="flex gap-2">
                {a.nextStep && (
                  <CardAction
                    tone="teal"
                    className="flex-1"
                    onClick={() => (
                      a.nextStep === 'approved'
                        ? runStep(a._id, 'approved')
                        : setScheduling({ id: a._id, step: a.nextStep })
                    )}
                    disabled={busy === a._id}
                  >
                    {busy === a._id ? '…' : STEP_ACTION[a.nextStep]}
                  </CardAction>
                )}
                {a.canDecline && (
                  <CardAction
                    onClick={() => { setDeclining(a._id); setNote(''); }}
                    disabled={busy === a._id}
                    className={a.nextStep ? '' : 'flex-1'}
                  >
                    Decline
                  </CardAction>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <BottomSheet
        open={!!scheduling}
        onClose={() => setScheduling(null)}
        title={scheduling?.step === 'home_check_scheduled' ? 'Schedule home check' : 'Schedule meet & greet'}
        subtitle={schedulingRow ? `${schedulingRow.applicant} — ${schedulingRow.pet || 'a pet'}` : undefined}
        footer={(
          <PrimaryButton
            tone="teal"
            onClick={() => runStep(scheduling.id, scheduling.step, { scheduledAt: when, notes: note })}
            disabled={!when || busy === scheduling?.id}
            loading={busy === scheduling?.id}
          >
            Confirm
          </PrimaryButton>
        )}
      >
        <div className="space-y-4 pb-2">
          <KitInput
            label={scheduling?.step === 'home_check_scheduled' ? 'Home check date' : 'Meet & greet date'}
            type="date"
            value={when}
            onChange={setWhen}
          />
          <KitInput
            label="Note for the adopter (optional)"
            value={note}
            onChange={setNote}
            placeholder="Note for the adopter (optional)"
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!declining}
        onClose={() => setDeclining(null)}
        title="Decline application"
        subtitle={decliningRow ? `${decliningRow.applicant} — ${decliningRow.pet || 'a pet'}` : undefined}
        footer={(
          <PrimaryButton tone="danger" onClick={() => decline(declining)} disabled={busy === declining} loading={busy === declining}>
            Decline
          </PrimaryButton>
        )}
      >
        <div className="pb-2">
          <Textarea
            label="Why are you declining? The adopter is told."
            rows={3}
            value={note}
            onChange={setNote}
            placeholder="e.g. Home not suitable for a high-energy dog"
          />
        </div>
      </BottomSheet>
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
  const confirm = useConfirm();
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
    if (!(await confirm({ title: `Take ${row.name} off the app?`, confirmLabel: 'Withdraw', danger: true }))) return;
    setErr('');
    try {
      await withdrawAdoptionListing(row._id);
      load();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <SkeletonList rows={3} withMedia />;

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Pets you are rehoming"
        subtitle="A pet goes live the moment you add it. Approving an application reserves it automatically."
        action={(
          <button
            onClick={() => setForm(blankPet())}
            className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25"
          >
            <Plus size={16} /> Add a pet
          </button>
        )}
      />

      {!form && <InlineError>{err}</InlineError>}

      <BottomSheet
        open={!!form}
        onClose={() => setForm(null)}
        fullScreen
        title={`${form?._id ? 'Edit' : 'New'} pet`}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setForm(null)}>Cancel</PrimaryButton>
            <PrimaryButton
              onClick={save}
              disabled={busy || !form || !form.name.trim() || !form.breed.trim()}
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
            <KitInput label="Breed" value={form.breed} onChange={(v) => setForm({ ...form, breed: v })} />
            <KitSelect
              label="Species" value={form.type} onChange={(v) => setForm({ ...form, type: v })}
              options={['Dog', 'Cat', 'Rabbit', 'Bird']}
            />
            <FieldPair>
              <KitSelect
                label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })}
                options={['Baby', 'Young', 'Adult', 'Senior']}
              />
              <KitSelect
                label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
                options={['Male', 'Female']}
              />
            </FieldPair>
            <KitInput
              label="Adoption fee (₹) — 0 for free"
              type="number" inputMode="decimal" value={form.price} onChange={(v) => setForm({ ...form, price: v })}
            />
            <KitInput label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <KitInput
              label="Photo URL"
              value={form.images?.[0] || ''}
              onChange={(v) => setForm({ ...form, images: v ? [v] : [] })}
            />
            <Textarea label="About this pet" rows={3} value={form.about} onChange={(v) => setForm({ ...form, about: v })} />
            <div className="bg-bg-primary rounded-2xl border border-border-light px-3">
              {[['vaccinated', 'Vaccinated'], ['dewormed', 'Dewormed'], ['neutered', 'Neutered']].map(([key, label]) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={Boolean(form[key])}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                />
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      {!rows.length ? (
        <EmptyState icon={PawPrint} text="No pets listed yet — add one so adopters can find them." />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p._id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-bg-primary flex items-center justify-center shrink-0">
                    <PawPrint size={24} className="text-text-disabled" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[15px] font-bold text-text-primary">{p.name}</p>
                    <StatusBadge label={p.status} tone={LISTING_TONE[p.status] || 'neutral'} />
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {p.breed} · {p.age} · {p.gender}
                  </p>
                  <p className="text-xs font-bold text-text-primary mt-0.5">
                    {p.price > 0 ? `₹${p.price} adoption fee` : 'Free to a good home'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.vaccinated && <Tag>Vaccinated</Tag>}
                    {p.dewormed && <Tag>Dewormed</Tag>}
                    {p.neutered && <Tag>Neutered</Tag>}
                  </div>
                </div>
              </div>
              {p.status === 'Pending' && (
                <p className="mx-4 mb-3 text-[11px] font-semibold text-primary-dark flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Reserved for an approved applicant.
                </p>
              )}
              <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border-light">
                <CardAction icon={Pencil} className="flex-1" onClick={() => setForm({ ...p })}>Edit</CardAction>
                {p.status !== 'Withdrawn' && p.status !== 'Adopted' && (
                  <CardAction icon={Trash2} tone="danger" onClick={() => withdraw(p)}>Withdraw</CardAction>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Primitives ───────────────────────────────────────────── */

const Tag = ({ children }) => (
  <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-accent-teal/10 text-[#4C8684]">{children}</span>
);

export default AdoptionVendorPortal;
