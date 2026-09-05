import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Plus, Check, Clock, XCircle, Ban, Loader2, LogOut, Store,
} from 'lucide-react';
import { cn } from '../../user/utils/cn';
import {
  VENDOR_CATEGORIES,
  VENDOR_TYPE_LABEL,
  vendorHome,
} from '../../../constants/vendorTypes';
import {
  getStoredVendor,
  getVendorLines,
  fetchVendorLines,
  addVendorLine,
  setActiveVendorType,
  vendorLogout,
} from '../../../services/vendor';

const STATUS = {
  approved: { label: 'Live', icon: Check, className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pending: { label: 'In review', icon: Clock, className: 'text-amber-700 bg-amber-50 border-amber-200' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'text-red-700 bg-red-50 border-red-200' },
  suspended: { label: 'Suspended', icon: Ban, className: 'text-red-700 bg-red-50 border-red-200' },
};

/**
 * The landing screen for a vendor who runs more than one business.
 *
 * Each business keeps its own panel — merging them would put two
 * "Appointments" and two "Finance" pages in one sidebar — so this is where a
 * vendor sees them side by side and chooses which to open. A vendor with a
 * single business never lands here; login sends them straight to their panel.
 */
export function VendorHub() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [lines, setLines] = useState(getVendorLines);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(params.get('add') === '1');

  const stored = getStoredVendor();

  useEffect(() => {
    // The stored copy is whatever login left behind; a line approved since then
    // would still show "In review" without this.
    fetchVendorLines()
      .then(setLines)
      .catch((e) => setError(e?.message || 'Could not load your businesses'))
      .finally(() => setLoading(false));
  }, []);

  const open = (profile) => {
    setActiveVendorType(profile.vendorType);
    navigate(vendorHome(profile.vendorType));
  };

  const ownedTypes = lines.map((l) => l.vendorType);
  const available = VENDOR_CATEGORIES.filter((c) => !ownedTypes.includes(c.vendorType));

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif text-gray-900 tracking-tight">TailCircle</h1>
          <button
            type="button"
            onClick={() => { vendorLogout(); navigate('/vendor/login'); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-serif text-gray-900 leading-tight mb-1.5">
            Welcome back{stored?.user?.name ? `, ${stored.user.name}` : ''}.
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            {lines.length > 1
              ? `You run ${lines.length} businesses on this account. Pick one to open its panel.`
              : 'Open your panel, or add another business to this account.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !lines.length ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-12">
            <Loader2 size={16} className="animate-spin" />
            Loading your businesses…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {lines.map((profile) => {
              const status = STATUS[profile.approvalStatus] || STATUS.pending;
              const StatusIcon = status.icon;
              const isLive = profile.approvalStatus === 'approved';
              return (
                <div
                  key={profile.vendorType}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                        {VENDOR_TYPE_LABEL[profile.vendorType] || 'Partner'}
                      </p>
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {profile.businessName}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border shrink-0',
                        status.className
                      )}
                    >
                      <StatusIcon size={11} />
                      {status.label}
                    </span>
                  </div>

                  <dl className="text-xs text-gray-500 space-y-1 mb-5">
                    <div className="flex justify-between">
                      <dt>Registration</dt>
                      <dd className="font-medium text-gray-700">{profile.registrationNo}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Commission</dt>
                      <dd className="font-medium text-gray-700">
                        {Math.round((profile.commissionRate ?? 0) * 100)}%
                      </dd>
                    </div>
                    {profile.city && (
                      <div className="flex justify-between">
                        <dt>City</dt>
                        <dd className="font-medium text-gray-700 truncate max-w-[60%]">{profile.city}</dd>
                      </div>
                    )}
                  </dl>

                  {/* A rejected or suspended line has no panel to open — the API
                      refuses its endpoints, so a button here could only lead to
                      a screen that errors. */}
                  {isLive || profile.approvalStatus === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => open(profile)}
                      className="mt-auto w-full py-2.5 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      Open panel
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <p className="mt-auto text-xs text-gray-400 text-center py-2.5">
                      {profile.rejectionReason || 'Contact support about this business.'}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Add-a-business card */}
            {available.length > 0 && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="bg-white/60 rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 min-h-[200px] hover:border-[#40716F]/40 hover:bg-white transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#40716F]/10 flex items-center justify-center">
                  <Plus size={18} className="text-[#40716F]" />
                </div>
                <span className="text-sm font-medium text-gray-700">Add a business</span>
                <span className="text-xs text-gray-400 text-center max-w-[200px]">
                  Serve another category from this same account
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {adding && (
        <AddBusinessModal
          available={available}
          defaultName={lines[0]?.businessName || ''}
          onClose={() => { setAdding(false); params.delete('add'); setParams(params, { replace: true }); }}
          onAdded={(profiles) => {
            setLines(profiles);
            setAdding(false);
            params.delete('add');
            setParams(params, { replace: true });
          }}
        />
      )}
    </div>
  );
}

/**
 * Adds a second (or third) business line to the signed-in account.
 *
 * Only the details that genuinely differ are asked for — the rest, including
 * bank and GST, are inherited from the account's first business by the API.
 */
function AddBusinessModal({ available, defaultName, onClose, onAdded }) {
  const [role, setRole] = useState(available[0]?.slug || '');
  const [businessName, setBusinessName] = useState(defaultName);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    setError('');
    try {
      await addVendorLine({
        role,
        businessName: businessName.trim() || undefined,
        city: city.trim() || undefined,
      });
      onAdded(await fetchVendorLines());
    } catch (err) {
      setError(err?.message || 'Could not add this business');
      setSaving(false);
    }
  };

  const inputClass =
    'w-full py-3 px-4 bg-white border border-gray-200 rounded-lg focus:border-[#40716F] focus:ring-4 focus:ring-[#40716F]/10 focus:outline-none transition-all text-[16px] sm:text-sm text-gray-900 placeholder-gray-400 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-[#FAF7F2] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#40716F]/10 flex items-center justify-center shrink-0">
            <Store size={18} className="text-[#40716F]" />
          </div>
          <div>
            <h3 className="text-lg font-serif text-gray-900 leading-tight">Add a business</h3>
            <p className="text-xs text-gray-500">Reviewed separately, like a new registration.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-2">Category</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {available.map(({ slug, label }) => (
                <label
                  key={slug}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors bg-white',
                    role === slug ? 'border-[#40716F] bg-[#40716F]/5' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="newRole"
                    checked={role === slug}
                    onChange={() => setRole(slug)}
                    className="hidden"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                      role === slug ? 'border-[#40716F] bg-[#40716F]' : 'border-gray-300'
                    )}
                  >
                    {role === slug && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Same as your other business"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">City (optional)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Leave blank to reuse your existing city"
              className={inputClass}
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed bg-[#40716F]/5 p-3 rounded-lg border border-[#40716F]/10">
            Bank and GST details carry over from your existing business. KYC documents for this
            category are uploaded from its own settings once it appears here.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !role}
              className="flex-1 py-3 bg-[#40716F] text-white rounded-lg text-sm font-medium hover:bg-[#335A58] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Submitting…' : 'Add business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VendorHub;
