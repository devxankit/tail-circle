import React, { useEffect, useState } from 'react';
import { Stethoscope, Plus, X, Loader2 } from 'lucide-react';
import { fetchVets, addVet } from '../../../../services/vendor';

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
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
      <Stethoscope size={18} className="text-gray-400 shrink-0" />
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Managing</p>
        <p className="text-sm text-gray-500">
          {vets.length > 1 ? `This clinic has ${vets.length} vets — changes apply to the one selected.` : 'You are the only vet at this clinic.'}
        </p>
      </div>
      {vets.length > 1 && (
        <select
          value={doctorId || ''}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold min-w-[200px]"
        >
          {vets.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}
      <button
        onClick={() => setIsModalOpen(true)}
        className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-[#66B4B1] hover:bg-[#559f9c] text-white rounded-lg text-sm font-bold transition"
      >
        <Plus size={16} /> Add Vet
      </button>

      {isModalOpen && (
        <AddVetModal
          onClose={() => setIsModalOpen(false)}
          onAdded={() => { setIsModalOpen(false); onVetAdded?.(); }}
        />
      )}
    </div>
  );
}

function AddVetModal({ onClose, onAdded }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Add a Vet to This Clinic</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            <select value={form.title} onChange={set('title')} className="col-span-1 border border-gray-200 rounded-lg px-2 py-2 text-sm">
              <option>Dr.</option>
              <option>Prof.</option>
            </select>
            <input required placeholder="Full name" value={form.fullName} onChange={set('fullName')} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input required type="email" placeholder="Login email" value={form.email} onChange={set('email')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone (optional, defaults to clinic phone)" value={form.phone} onChange={set('phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="password" minLength={6} placeholder="Temporary password (min 6 chars)" value={form.password} onChange={set('password')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="In-clinic consult fee (₹)" value={form.consultFee} onChange={set('consultFee')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <p className="text-[11px] text-gray-400">They'll log in with this email/password from the vendor login screen, then complete their own profile, availability and documents. Credentials stay unverified until an admin reviews them.</p>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#66B4B1] hover:bg-[#559f9c] disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Add Vet
          </button>
        </form>
      </div>
    </div>
  );
}

export default VetSelector;
