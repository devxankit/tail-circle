import { vendorHome } from '../../../constants/vendorTypes';
import { getVendorLines, getActiveVendorType, setActiveVendorType } from '../../../services/vendor';

/** Approval status → the pill each business shows in the switcher list. */
export const BUSINESS_STATUS = {
  approved: { text: 'Live', className: 'text-success bg-success/10' },
  pending: { text: 'In review', className: 'text-warning bg-warning/10' },
  rejected: { text: 'Rejected', className: 'text-error bg-error/10' },
  suspended: { text: 'Suspended', className: 'text-error bg-error/10' },
};

/**
 * The business switcher's data and its one action, used by the partner app's
 * business sheet (it replaced the desktop header dropdown).
 */
export function useBusinessLines() {
  const lines = getVendorLines();
  const activeType = getActiveVendorType();
  const active = lines.find((p) => p.vendorType === activeType) || lines[0];

  const switchTo = (profile) => {
    if (profile.vendorType === activeType) return;
    setActiveVendorType(profile.vendorType);
    // A full load, not a client-side push: each panel mounts its own context
    // provider and caches that business's data, so carrying a live tree across
    // the switch is what would let one business's bookings show under another.
    window.location.assign(vendorHome(profile.vendorType));
  };

  return { lines, active, activeType, switchTo, isMulti: lines.length > 1 };
}
