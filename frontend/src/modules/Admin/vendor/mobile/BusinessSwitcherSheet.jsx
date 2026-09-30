import { useNavigate } from 'react-router-dom';
import { Check, LayoutGrid, Plus } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { VENDOR_TYPE_LABEL } from '../../../../constants/vendorTypes';
import { useBusinessLines, BUSINESS_STATUS } from '../businessLines';
import { BottomSheet } from './BottomSheet';
import { StatusBadge } from './StatusBadge';

const STATUS_TONE = { approved: 'success', pending: 'warning', rejected: 'error', suspended: 'error' };

/**
 * The header BusinessSwitcher, as a sheet: the same list of businesses and the
 * same switch (a full page load into the other panel), plus the same "All
 * businesses" and "Add a business" links.
 */
export function BusinessSwitcherSheet({ open, onClose }) {
  const navigate = useNavigate();
  const { lines, active, switchTo } = useBusinessLines();

  return (
    <BottomSheet open={open} onClose={onClose} title="Your businesses">
      <div className="bg-white rounded-[20px] border border-border-light overflow-hidden">
        {lines.map((profile, i) => {
          const isActive = profile.vendorType === active?.vendorType;
          const status = BUSINESS_STATUS[profile.approvalStatus] || BUSINESS_STATUS.pending;
          return (
            <button
              key={profile.vendorType}
              type="button"
              onClick={() => { onClose?.(); switchTo(profile); }}
              className={cn(
                'w-full text-left px-4 py-3 min-h-[60px] flex items-center gap-3',
                i > 0 && 'border-t border-border-light',
                isActive ? 'bg-accent-teal/5' : 'active:bg-bg-primary'
              )}
            >
              <span className="w-10 h-10 rounded-full bg-bg-primary border border-border-light overflow-hidden flex items-center justify-center shrink-0 text-sm font-black text-text-primary">
                {profile.logo
                  ? <img src={profile.logo} alt="" className="w-full h-full object-cover" />
                  : (profile.businessName || 'B').slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold text-text-primary truncate">{profile.businessName}</span>
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-text-secondary">{VENDOR_TYPE_LABEL[profile.vendorType] || 'Partner'}</span>
                  <StatusBadge size="xs" label={status.text} tone={STATUS_TONE[profile.approvalStatus] || 'warning'} />
                </span>
              </span>
              {isActive && <Check size={20} className="text-accent-teal shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 bg-white rounded-[20px] border border-border-light overflow-hidden">
        <button
          type="button"
          onClick={() => { onClose?.(); navigate('/vendor/hub'); }}
          className="w-full min-h-[52px] px-4 flex items-center gap-3 text-sm font-semibold text-text-primary active:bg-bg-primary"
        >
          <LayoutGrid size={20} className="text-text-secondary" /> All businesses
        </button>
        <button
          type="button"
          onClick={() => { onClose?.(); navigate('/vendor/hub?add=1'); }}
          className="w-full min-h-[52px] px-4 flex items-center gap-3 text-sm font-semibold text-text-primary border-t border-border-light active:bg-bg-primary"
        >
          <Plus size={20} className="text-text-secondary" /> Add a business
        </button>
      </div>
    </BottomSheet>
  );
}

export default BusinessSwitcherSheet;
