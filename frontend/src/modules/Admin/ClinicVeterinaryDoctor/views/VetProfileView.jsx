import React, { useEffect, useState } from 'react';
import {
  Save, Loader2, AlertCircle, CheckCircle2, ShieldCheck, ShieldAlert,
  Video, MapPin, Home, Siren, FileText, Trash2, Upload, IndianRupee,
} from 'lucide-react';
import {
  fetchVetProfile, updateVetProfile, addVetDocument, removeVetDocument, uploadVendorFile,
} from '../../../../services/vendor';
import { useVetSelection, VetSelector } from '../components/VetSelector';

/**
 * Vet profile, fees and consultation settings.
 *
 * This is where a vet decides whether they take video consults at all — the
 * booking API refuses any mode that is not enabled here, so switching `video`
 * off immediately removes the option from the user app.
 *
 * Verification status is read-only: an admin reviews the credentials, and the
 * vet is not listed publicly until they do.
 */

const MODES = [
  { key: 'inClinic', label: 'In-Clinic', icon: MapPin, note: 'Patients visit your clinic' },
  { key: 'video', label: 'Video Consult', icon: Video, note: 'Remote consultation over video' },
  { key: 'homeVisit', label: 'Home Visit', icon: Home, note: 'You travel to the pet' },
  { key: 'emergency', label: 'Emergency', icon: Siren, note: 'Urgent, after-hours cases' },
];

const DOC_KINDS = [
  { value: 'degree', label: 'Degree certificate' },
  { value: 'license', label: 'Licence / registration certificate' },
  { value: 'clinic_auth', label: 'Clinic authorization proof' },
  { value: 'id_proof', label: 'Government ID proof' },
  { value: 'other', label: 'Other' },
];

const FACILITIES = [
  ['medicines', 'Medicines'],
  ['diagnostics', 'Diagnostics'],
  ['surgery', 'Surgery'],
  ['grooming', 'Grooming'],
  ['vaccination', 'Vaccination'],
  ['labSampleCollection', 'Lab sample collection'],
  ['hospitalization', 'Hospitalization'],
];

export function VetProfileView() {
  const { vets, isOwner, doctorId, setDoctorId, ready, refreshVets } = useVetSelection();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [docKind, setDocKind] = useState('degree');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchVetProfile(doctorId)
      .then((p) => !cancelled && setProfile(p))
      .catch((e) => !cancelled && setError(e.message || 'Could not load your profile'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [ready, doctorId]);

  const set = (path, value) => {
    setProfile((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let node = next;
      for (const k of keys.slice(0, -1)) {
        node[k] ??= {};
        node = node[k];
      }
      node[keys.at(-1)] = value;
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fresh = await updateVetProfile({
        identity: profile.identity,
        credentials: {
          registrationNumber: profile.credentials.registrationNumber,
          council: profile.credentials.council,
          registrationYear: profile.credentials.registrationYear,
        },
        practice: profile.practice,
        experience: profile.experience,
        clinicInfo: {
          clinicName: profile.clinicInfo?.clinicName,
          address: profile.clinicInfo?.address,
          facilities: profile.clinicInfo?.facilities,
        },
        modes: profile.modes,
        about: profile.about,
        video: profile.video,
        policies: profile.policies,
      }, doctorId);
      setProfile(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadVendorFile(file, 'vet-documents');
      setProfile(await addVetDocument({ kind: docKind, url }, doctorId));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = async (index) => {
    try {
      setProfile(await removeVetDocument(index, doctorId));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
        <AlertCircle size={32} className="text-amber-500" />
        <p className="font-bold text-gray-800">Could not load your profile</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  const verification = profile.credentials?.verification || {};
  const approved = verification.status === 'approved';

  return (
    <div className="p-6 space-y-6">
      <VetSelector vets={vets} isOwner={isOwner} doctorId={doctorId} onChange={setDoctorId} onVetAdded={refreshVets} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Profile &amp; Fees</h1>
          <p className="text-sm text-gray-500 mt-1">
            What pet parents see, and what you charge for each consultation type.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-emerald-600 text-sm font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 h-11 rounded-xl bg-[#F87B68] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Verification banner */}
      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
        approved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}>
        {approved
          ? <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          : <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />}
        <div>
          <p className={`font-bold text-sm ${approved ? 'text-emerald-800' : 'text-amber-800'}`}>
            {approved ? 'Verified — your profile is live' : `Verification ${verification.status || 'pending'}`}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {approved
              ? 'Pet parents can find and book you.'
              : 'You will not appear in the app until an admin reviews your credentials.'}
          </p>
          {verification.rejectionReason && (
            <p className="text-xs text-red-600 mt-1 font-medium">{verification.rejectionReason}</p>
          )}
        </div>
      </div>

      {/* Identity */}
      <Card title="Public identity">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Title" value={profile.identity?.title} onChange={(v) => set('identity.title', v)} placeholder="Dr." />
          <Field label="Full name (as shown publicly)" value={profile.identity?.fullName} onChange={(v) => set('identity.fullName', v)} className="md:col-span-2" />
          <Field label="Profile photo URL" value={profile.identity?.profilePhoto} onChange={(v) => set('identity.profilePhoto', v)} className="md:col-span-3" />
        </div>
      </Card>

      {/* Credentials */}
      <Card
        title="Registration & credentials"
        subtitle="Changing your registration number or council re-opens verification."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Registration / licence number" value={profile.credentials?.registrationNumber} onChange={(v) => set('credentials.registrationNumber', v)} />
          <Field label="Issuing veterinary council" value={profile.credentials?.council} onChange={(v) => set('credentials.council', v)} className="md:col-span-2" />
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Verification documents</h3>
          {profile.credentials?.documents?.length ? (
            <div className="space-y-2 mb-3">
              {profile.credentials.documents.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <FileText size={15} className="text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-800">
                    {DOC_KINDS.find((k) => k.value === d.kind)?.label || d.kind}
                  </span>
                  {d.verified && <CheckCircle2 size={14} className="text-emerald-500" />}
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 truncate ml-auto max-w-[220px]">
                    {d.url}
                  </a>
                  <button onClick={() => handleRemoveDoc(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No documents uploaded yet.</p>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            <select value={docKind} onChange={(e) => setDocKind(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <input
              type="file"
              id="vetDocUpload"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              onClick={() => document.getElementById('vetDocUpload').click()}
              disabled={uploadingDoc}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
            >
              {uploadingDoc ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingDoc ? 'Uploading…' : 'Upload Document'}
            </button>
          </div>
        </div>
      </Card>

      {/* Consultation modes & fees */}
      <Card
        title="Consultation types & fees"
        subtitle="Turning a type off removes it from the booking screen immediately."
      >
        <div className="space-y-3">
          {MODES.map(({ key, label, icon: Icon, note }) => {
            const cfg = profile.modes?.[key] || {};
            return (
              <div key={key} className={`rounded-xl border p-4 transition ${cfg.enabled ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => set(`modes.${key}.enabled`, !cfg.enabled)}
                    className={`w-11 h-6 rounded-full transition relative shrink-0 ${cfg.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    aria-label={`Toggle ${label}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${cfg.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <Icon size={18} className={cfg.enabled ? 'text-gray-700' : 'text-gray-400'} />
                  <div>
                    <p className={`font-bold text-sm ${cfg.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                    <p className="text-[11px] text-gray-400">{note}</p>
                  </div>
                </div>

                {cfg.enabled && (
                  <div className="grid grid-cols-3 gap-3 md:pl-14">
                    <MoneyField label="Fee" value={cfg.fee} onChange={(v) => set(`modes.${key}.fee`, v)} />
                    <MoneyField
                      label="Follow-up fee" value={cfg.followUpFee ?? ''} placeholder="same"
                      onChange={(v) => set(`modes.${key}.followUpFee`, v === '' ? null : v)}
                    />
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Duration</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={5} max={180} value={cfg.durationMinutes ?? 15}
                          onChange={(e) => set(`modes.${key}.durationMinutes`, Number(e.target.value) || 15)}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Video overtime */}
      {profile.modes?.video?.enabled && (
        <Card
          title="Video consultation overtime"
          subtitle="Charged only if the pet parent agrees to continue past the booked duration."
        >
          <div className="grid md:grid-cols-4 gap-4">
            <MoneyField label="Per extra minute" value={profile.video?.overagePerMinute} onChange={(v) => set('video.overagePerMinute', v)} />
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Free grace</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} max={15} value={profile.video?.graceMinutes ?? 2}
                  onChange={(e) => set('video.graceMinutes', Number(e.target.value) || 0)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Max overtime</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} max={180} value={profile.video?.maxOverageMinutes ?? 30}
                  onChange={(e) => set('video.maxOverageMinutes', Number(e.target.value) || 0)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-5">
              <input type="checkbox" checked={profile.video?.digitalPrescription ?? true}
                onChange={(e) => set('video.digitalPrescription', e.target.checked)} className="rounded" />
              Digital prescriptions
            </label>
          </div>
          {(profile.video?.overagePerMinute ?? 0) === 0 && (
            <p className="text-xs text-gray-500 mt-3">
              Rate is ₹0 — overtime will never be charged.
            </p>
          )}
        </Card>
      )}

      {/* Practice */}
      <Card title="Practice">
        <div className="grid md:grid-cols-2 gap-4">
          <ListField label="Primary specialties" value={profile.practice?.primarySpecialties} onChange={(v) => set('practice.primarySpecialties', v)} />
          <ListField label="Secondary specialties" value={profile.practice?.secondarySpecialties} onChange={(v) => set('practice.secondarySpecialties', v)} />
          <ListField label="Species treated" value={profile.practice?.speciesTreated} onChange={(v) => set('practice.speciesTreated', v)} hint="dogs, cats, exotic_pets, livestock…" />
          <ListField label="Conditions handled" value={profile.practice?.conditionsHandled} onChange={(v) => set('practice.conditionsHandled', v)} hint="dermatology, dental, surgery consult…" />
          <ListField label="Languages spoken" value={profile.practice?.languages} onChange={(v) => set('practice.languages', v)} />
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Total years experience" value={profile.experience?.totalYears} onChange={(v) => set('experience.totalYears', v)} />
            <NumField label="Years at this clinic" value={profile.experience?.yearsInCurrentClinic} onChange={(v) => set('experience.yearsInCurrentClinic', v)} />
          </div>
        </div>
      </Card>

      {/* Clinic */}
      <Card title="Clinic">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Clinic / hospital name" value={profile.clinicInfo?.clinicName} onChange={(v) => set('clinicInfo.clinicName', v)} className="md:col-span-3" />
          <Field label="Address" value={profile.clinicInfo?.address?.line1} onChange={(v) => set('clinicInfo.address.line1', v)} className="md:col-span-2" />
          <Field label="Landmark" value={profile.clinicInfo?.address?.landmark} onChange={(v) => set('clinicInfo.address.landmark', v)} />
          <Field label="Locality" value={profile.clinicInfo?.address?.locality} onChange={(v) => set('clinicInfo.address.locality', v)} />
          <Field label="City" value={profile.clinicInfo?.address?.city} onChange={(v) => set('clinicInfo.address.city', v)} />
          <Field label="Pin code" value={profile.clinicInfo?.address?.pincode} onChange={(v) => set('clinicInfo.address.pincode', v)} />
          <Field label="Google Maps link" value={profile.clinicInfo?.address?.mapsUrl} onChange={(v) => set('clinicInfo.address.mapsUrl', v)} className="md:col-span-3" />
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-5 mb-2">Available at this clinic</h3>
        <div className="flex flex-wrap gap-2">
          {FACILITIES.map(([key, label]) => {
            const on = profile.clinicInfo?.facilities?.[key];
            return (
              <button
                key={key}
                onClick={() => set(`clinicInfo.facilities.${key}`, !on)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* About */}
      <Card title="About you">
        <TextArea label="Short bio" value={profile.about?.bio} onChange={(v) => set('about.bio', v)} />
        <TextArea label="Treatment approach" value={profile.about?.treatmentApproach} onChange={(v) => set('about.treatmentApproach', v)} />
      </Card>

      {/* Policies */}
      <Card title="Policies" subtitle="Shown to pet parents before they confirm a booking.">
        <div className="grid md:grid-cols-3 gap-4">
          <NumField label="Free cancellation window (hours)" value={profile.policies?.cancellationHours} onChange={(v) => set('policies.cancellationHours', v)} />
          <NumField label="Reschedule window (hours)" value={profile.policies?.rescheduleHours} onChange={(v) => set('policies.rescheduleHours', v)} />
          <NumField label="Follow-up window (days)" value={profile.policies?.followUpWindowDays} onChange={(v) => set('policies.followUpWindowDays', v)} hint="Return visits get the follow-up fee" />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <TextArea label="Cancellation policy" value={profile.policies?.cancellationNote} onChange={(v) => set('policies.cancellationNote', v)} rows={2} />
          <TextArea label="Refund policy" value={profile.policies?.refundNote} onChange={(v) => set('policies.refundNote', v)} rows={2} />
          <TextArea label="Reschedule policy" value={profile.policies?.rescheduleNote} onChange={(v) => set('policies.rescheduleNote', v)} rows={2} />
          <TextArea label="No-show policy" value={profile.policies?.noShowNote} onChange={(v) => set('policies.noShowNote', v)} rows={2} />
        </div>
      </Card>
    </div>
  );
}

/* ── Small form primitives ────────────────────────────────── */

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="font-bold text-gray-900">{title}</h2>
      {subtitle ? (
        <p className="text-sm text-gray-500 mt-0.5 mb-4">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text" value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function NumField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="number" min={0} value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function MoneyField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        <IndianRupee size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="number" min={0} value={value ?? ''} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}

/** Comma-separated list editor — simple and predictable for tag-like fields. */
function ListField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={(value || []).join(', ')}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        placeholder="Comma separated"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <textarea
        rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
      />
    </div>
  );
}

export default VetProfileView;
