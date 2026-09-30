import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Plus, Check, Clock, XCircle, Ban, Loader2, LogOut,
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
import { BottomSheet } from './mobile/BottomSheet';
import { PrimaryButton } from './mobile/StickyActionBar';
import { fieldClass } from './mobile/Field';

const STATUS = {
  approved: { label: 'Live', icon: Check, className: 'text-success bg-success/10 border-success/25' },
  pending: { label: 'In review', icon: Clock, className: 'text-warning bg-warning/10 border-warning/25' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'text-error bg-error/10 border-error/25' },
  suspended: { label: 'Suspended', icon: Ban, className: 'text-error bg-error/10 border-error/25' },
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
    <div className="flex-1 bg-bg-primary font-sans">
      <header
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border-light"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between">
          <h1 className="text-xl font-black text-text-primary tracking-tight">TailCircle</h1>
          <button
            type="button"
            onClick={() => { vendorLogout(); navigate('/vendor/login'); }}
            className="h-10 px-3 -mr-2 rounded-full flex items-center gap-2 text-sm font-semibold text-text-secondary active:bg-bg-secondary"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 pb-10">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-text-primary leading-tight mb-1.5">
            Welcome back{stored?.user?.name ? `, ${stored.user.name}` : ''}.
          </h2>
          <p className="text-text-secondary text-sm font-medium">
            {lines.length > 1
              ? `You run ${lines.length} businesses on this account. Pick one to open its panel.`
              : 'Open your panel, or add another business to this account.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-sm font-semibold text-error">
            {error}
          </div>
        )}

        {loading && !lines.length ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm py-12 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Loading your businesses…
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((profile) => {
              const status = STATUS[profile.approvalStatus] || STATUS.pending;
              const StatusIcon = status.icon;
              const isLive = profile.approvalStatus === 'approved';
              return (
                <div
                  key={profile.vendorType}
                  className="bg-white rounded-[20px] border border-border-light p-4 flex flex-col shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-1">
                        {VENDOR_TYPE_LABEL[profile.vendorType] || 'Partner'}
                      </p>
                      <h3 className="text-[17px] font-bold text-text-primary truncate">
                        {profile.businessName}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border shrink-0',
                        status.className
                      )}
                    >
                      <StatusIcon size={11} />
                      {status.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4 text-xs">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Registration</dt>
                      <dd className="font-semibold text-text-primary mt-0.5 break-all">{profile.registrationNo}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Commission</dt>
                      <dd className="font-semibold text-text-primary mt-0.5">
                        {Math.round((profile.commissionRate ?? 0) * 100)}%
                      </dd>
                    </div>
                    {profile.city && (
                      <div className="col-span-2">
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">City</dt>
                        <dd className="font-semibold text-text-primary mt-0.5 truncate">{profile.city}</dd>
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
                      className="mt-auto w-full h-12 bg-accent-teal text-white rounded-2xl text-[15px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      Open panel
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <p className="mt-auto text-xs text-text-secondary text-center py-2.5">
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
                className="w-full bg-white/60 rounded-[20px] border-2 border-dashed border-accent-teal/40 p-5 flex flex-col items-center justify-center gap-2 min-h-[150px] active:bg-white transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-accent-teal/10 flex items-center justify-center">
                  <Plus size={20} className="text-[#4C8684]" />
                </div>
                <span className="text-[15px] font-bold text-text-primary">Add a business</span>
                <span className="text-xs text-text-secondary text-center max-w-[220px]">
                  Serve another category from this same account
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {adding && (
        <AddBusinessModal
          open={adding}
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
function AddBusinessModal({ open, available, defaultName, onClose, onAdded }) {
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

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add a business"
      subtitle="Reviewed separately, like a new registration."
      footer={(
        <div className="flex gap-2">
          <PrimaryButton tone="soft" onClick={onClose}>Cancel</PrimaryButton>
          <PrimaryButton
            tone="teal"
            onClick={submit}
            disabled={saving || !role}
            loading={saving}
          >
            {saving ? 'Submitting…' : 'Add business'}
          </PrimaryButton>
        </div>
      )}
    >
      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-error/5 border border-error/20 text-xs font-semibold text-error">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 pb-2">
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-2">Category</label>
          <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
            {available.map(({ slug, label }, i) => (
              <label
                key={slug}
                className={cn(
                  'flex items-center gap-3 cursor-pointer px-4 min-h-[52px] transition-colors',
                  i > 0 && 'border-t border-border-light',
                  role === slug ? 'bg-accent-teal/5' : 'bg-white'
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
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    role === slug ? 'border-accent-teal bg-accent-teal' : 'border-text-disabled'
                  )}
                >
                  {role === slug && <span className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm font-semibold text-text-primary">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5">Business name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Same as your other business"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5">City (optional)</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Leave blank to reuse your existing city"
            className={fieldClass}
          />
        </div>

        <p className="text-[11px] text-text-secondary leading-relaxed bg-accent-teal/5 p-3 rounded-xl border border-accent-teal/15">
          Bank and GST details carry over from your existing business. KYC documents for this
          category are uploaded from its own settings once it appears here.
        </p>
      </form>
    </BottomSheet>
  );
}

export default VendorHub;
