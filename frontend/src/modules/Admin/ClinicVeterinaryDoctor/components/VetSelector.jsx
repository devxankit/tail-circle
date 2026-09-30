import React, { useEffect, useState } from 'react';
import { Stethoscope, Plus, Loader2 } from 'lucide-react';
import { fetchVets, addVet } from '../../../../services/vendor';
import { BottomSheet, fieldClass } from '../../vendor/mobile';

/**
 * Which vet the schedule / profile screens are acting on.
 *
 * A solo practitioner (and a staff vet, who is scoped to themselves) resolves
 * automatically and sees no picker. A clinic owner with several vets MUST
 * choose — the API refuses an ambiguous request rather than silently editing
 * the wrong vet's fees or schedule.
 */
export function useVetSelection() {
  const [vets, setVets] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [doctorId, setDoctorId] = useState(null);
  const [ready, setReady] = useState(false);

  const load = () => {
    fetchVets()
      .then((res) => {
        const list = res?.vets || [];
        setVets(list);
        setIsOwner(Boolean(res?.isOwner));
        // One vet → act as them implicitly. Several → default to the first so
        // the screen has something to show, with the picker to change it.
        setDoctorId(list.length ? list[0].id : null);
      })
      .catch(() => setVets([]))
      .finally(() => setReady(true));
  };

  useEffect(() => { load(); }, []);

  return { vets, isOwner, doctorId, setDoctorId, ready, multiple: vets.length > 1, refreshVets: load };
}

export function VetSelector({ vets, isOwner, doctorId, onChange, onVetAdded }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isOwner) return null;

  return (
    <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-accent-teal/10 text-[#4C8684] flex items-center justify-center shrink-0">
          <Stethoscope size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">Managing</p>
          <p className="text-sm text-text-secondary leading-snug">
            {vets.length > 1 ? `This clinic has ${vets.length} vets — changes apply to the one selected.` : 'You are the only vet at this clinic.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="min-h-[40px] flex items-center gap-1.5 px-3 bg-[#66B4B1] text-white rounded-xl text-sm font-bold transition shrink-0"
        >
          <Plus size={16} /> Add Vet
        </button>
      </div>
      {vets.length > 1 && (
        <select
          value={doctorId || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} font-bold`}
          aria-label="Vet"
        >
          {vets.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}

      <AddVetModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={() => { setIsModalOpen(false); onVetAdded?.(); }}
      />
    </div>
  );
}

function AddVetModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState({ fullName: '', title: 'Dr.', email: '', phone: '', password: '', consultFee: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addVet({ ...form, consultFee: Number(form.consultFee) || 0 });
      onAdded();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not add this vet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add a Vet to This Clinic"
      footer={(
        <button type="submit" form="add-vet-form" disabled={saving} className="w-full h-12 bg-[#66B4B1] disabled:opacity-60 text-white rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />} Add Vet
        </button>
      )}
    >
      <form id="add-vet-form" onSubmit={handleSubmit} className="space-y-3 pb-2">
        {error && <p className="text-[13px] text-error bg-error/5 border border-error/15 rounded-xl p-2.5">{error}</p>}
        <div className="grid grid-cols-3 gap-2">
          <select value={form.title} onChange={set('title')} className={`${fieldClass} col-span-1 px-3`} aria-label="Title">
            <option>Dr.</option>
            <option>Prof.</option>
          </select>
          <input required placeholder="Full name" value={form.fullName} onChange={set('fullName')} className={`${fieldClass} col-span-2`} />
        </div>
        <input required type="email" placeholder="Login email" value={form.email} onChange={set('email')} className={fieldClass} />
        <input type="tel" inputMode="tel" placeholder="Phone (optional, defaults to clinic phone)" value={form.phone} onChange={set('phone')} className={fieldClass} />
        <input required type="password" minLength={6} placeholder="Temporary password (min 6 chars)" value={form.password} onChange={set('password')} className={fieldClass} />
        <input type="number" inputMode="decimal" min="0" placeholder="In-clinic consult fee (₹)" value={form.consultFee} onChange={set('consultFee')} className={fieldClass} />
        <p className="text-[11px] text-text-secondary leading-relaxed">They'll log in with this email/password from the vendor login screen, then complete their own profile, availability and documents. Credentials stay unverified until an admin reviews them.</p>
      </form>
    </BottomSheet>
  );
}

export default VetSelector;
