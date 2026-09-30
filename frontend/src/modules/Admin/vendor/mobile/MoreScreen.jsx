import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Repeat, LayoutGrid } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { useVendorShell } from './VendorShellContext';
import { getNavForType } from './vendorNavConfig';
import { StatusBadge } from './StatusBadge';

const APPROVAL_TONE = {
  approved: ['success', 'Approved'],
  'verified premium': ['success', 'Verified'],
  pending: ['warning', 'In review'],
  rejected: ['error', 'Rejected'],
  suspended: ['error', 'Suspended'],
};

function Row({ icon: Icon, label, onClick, disabled, first, danger, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center p-4 min-h-[56px] active:bg-bg-primary transition-colors disabled:opacity-40',
        !first && 'border-t border-border-light/60'
      )}
    >
      <Icon size={20} className={cn('mr-3 shrink-0', danger ? 'text-error' : 'text-text-secondary')} />
      <span className={cn('flex-1 text-left text-sm font-semibold', danger ? 'text-error' : 'text-text-primary')}>{label}</span>
      {trailing}
      {!danger && <ChevronRight size={20} className="text-text-disabled shrink-0" />}
    </button>
  );
}

/**
 * The More tab: who you are, every screen that is not a tab, and Log out —
 * laid out like the customer Profile screen.
 */
export function MoreScreen() {
  const shell = useVendorShell();
  const navigate = useNavigate();
  if (!shell) return null;

  const { type, business, typeLabel, isMulti, openSwitcher, onLogout, navDisabled } = shell;
  const nav = getNavForType(type);
  const [tone, statusText] = APPROVAL_TONE[String(business?.approvalStatus || '').toLowerCase()] || [null, business?.approvalStatus];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] border border-border-light shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-bg-primary border border-border-light overflow-hidden flex items-center justify-center shrink-0 text-lg font-black text-text-primary">
            {business?.logo
              ? <img src={business.logo} alt="" className="w-full h-full object-cover" />
              : (business?.name || 'TC').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-text-primary truncate">{business?.name || 'My Business'}</p>
            <p className="text-xs text-text-secondary mt-0.5">{typeLabel}</p>
            {business?.email && <p className="text-xs text-text-secondary truncate">{business.email}</p>}
            {statusText && <StatusBadge className="mt-1.5" label={statusText} tone={tone || undefined} status={tone ? undefined : statusText} />}
          </div>
        </div>
        {isMulti && (
          <Row icon={Repeat} label="Switch business" onClick={openSwitcher} />
        )}
        <Row icon={LayoutGrid} label="All businesses" onClick={() => navigate('/vendor/hub')} />
      </div>

      {nav.more.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 pl-2">{section.title}</h3>
          <div className="bg-white rounded-[24px] border border-border-light overflow-hidden shadow-sm">
            {section.items.map((item, i) => (
              <Row
                key={item.key}
                first={i === 0}
                icon={item.icon}
                label={item.label}
                disabled={navDisabled}
                onClick={() => navigate(item.to)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-[24px] border border-border-light overflow-hidden shadow-sm">
        <Row first icon={LogOut} label="Log out" danger onClick={onLogout} />
      </div>
    </div>
  );
}

export default MoreScreen;
