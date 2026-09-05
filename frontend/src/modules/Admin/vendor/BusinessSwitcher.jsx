import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, LayoutGrid, Plus } from 'lucide-react';
import { cn } from '../../user/utils/cn';
import { VENDOR_TYPE_LABEL, vendorHome } from '../../../constants/vendorTypes';
import {
  getVendorLines,
  getActiveVendorType,
  setActiveVendorType,
} from '../../../services/vendor';

/**
 * Switches which business a multi-line vendor's panel is showing.
 *
 * One account can run several businesses — a grooming salon that also takes
 * daycare bookings — and each keeps its own panel. Rather than merge them into
 * one screen (where "Appointments" would mean two different things), only one
 * is open at a time and this picks it.
 *
 * Renders nothing for a vendor with a single business, so the panels of the
 * vendors who have always had one look exactly as they did.
 */
export function BusinessSwitcher({ className, align = 'left' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const lines = getVendorLines();
  const activeType = getActiveVendorType();
  const active = lines.find((p) => p.vendorType === activeType) || lines[0];

  // Close on an outside click. Without this the menu survives navigation and
  // hangs over whichever panel it just opened.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (lines.length <= 1) return null;

  const switchTo = (profile) => {
    setOpen(false);
    if (profile.vendorType === activeType) return;
    setActiveVendorType(profile.vendorType);
    // A full load, not a client-side push: each panel mounts its own context
    // provider and caches that business's data, so carrying a live tree across
    // the switch is what would let one business's bookings show under another.
    window.location.assign(vendorHome(profile.vendorType));
  };

  const STATUS = {
    approved: { text: 'Live', className: 'text-emerald-600 bg-emerald-50' },
    pending: { text: 'In review', className: 'text-amber-600 bg-amber-50' },
    rejected: { text: 'Rejected', className: 'text-red-600 bg-red-50' },
    suspended: { text: 'Suspended', className: 'text-red-600 bg-red-50' },
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      {/* Visible at every breakpoint. A phone is exactly where a vendor is most
          likely to be mid-shift and needing to jump between their businesses,
          so this collapses to a compact pill rather than hiding. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 sm:gap-2 max-w-[190px] sm:max-w-[240px] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="flex flex-col items-start min-w-0">
          <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">
            {VENDOR_TYPE_LABEL[active?.vendorType] || 'Business'}
          </span>
          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[130px] sm:max-w-[180px] leading-tight sm:mt-0.5">
            {active?.businessName || 'My Business'}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={cn('text-gray-400 shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 w-[280px] max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 max-h-[340px] overflow-y-auto overscroll-contain',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Your businesses
          </p>

          {lines.map((profile) => {
            const isActive = profile.vendorType === active?.vendorType;
            const status = STATUS[profile.approvalStatus] || STATUS.pending;
            return (
              <button
                key={profile.vendorType}
                type="button"
                onClick={() => switchTo(profile)}
                className={cn(
                  'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer',
                  isActive ? 'bg-[#40716F]/5' : 'hover:bg-gray-50'
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">
                    {profile.businessName}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-gray-500">
                      {VENDOR_TYPE_LABEL[profile.vendorType] || 'Partner'}
                    </span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', status.className)}>
                      {status.text}
                    </span>
                  </span>
                </span>
                {isActive && <Check size={15} className="text-[#40716F] shrink-0" />}
              </button>
            );
          })}

          <div className="border-t border-gray-100 mt-1.5 pt-1.5">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/vendor/hub'); }}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <LayoutGrid size={15} className="text-gray-400" />
              All businesses
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/vendor/hub?add=1'); }}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Plus size={15} className="text-gray-400" />
              Add a business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessSwitcher;
