import { Bell, ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { VendorAvailabilityToggle } from '../VendorAvailabilityToggle';

/**
 * The partner app's top bar.
 *
 * Root (tab) screens: who you are on the left — logo, business name, partner
 * type, tapping it opens the business switcher when there is more than one —
 * and on the right the online/offline switch and the bell.
 *
 * Sub-screens: Back, a title, and an optional action.
 */
export function AppBar({
  variant = 'root',
  business,
  typeLabel,
  isMulti,
  onIdentityClick,
  actions,
  bell,
  onBellClick,
  title,
  onBack,
  action,
}) {
  return (
    <header
      className="sticky top-0 z-30 shrink-0 bg-white/90 backdrop-blur-md border-b border-border-light"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {variant === 'sub' ? (
        <div className="h-14 flex items-center gap-1 px-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary active:bg-bg-secondary shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 min-w-0 text-lg font-bold text-text-primary truncate">{title}</h1>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-10 px-3.5 mr-1 rounded-full bg-primary-light/30 text-primary-dark text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          )}
        </div>
      ) : (
        <div className="h-16 flex items-center gap-2 px-4">
          <button
            type="button"
            onClick={isMulti ? onIdentityClick : undefined}
            disabled={!isMulti}
            aria-label={isMulti ? 'Switch business' : undefined}
            className="flex-1 min-w-0 flex items-center gap-2.5 text-left disabled:cursor-default"
          >
            <span className="w-10 h-10 rounded-full bg-white border border-border-light shadow-sm overflow-hidden flex items-center justify-center shrink-0 text-[13px] font-black text-text-primary">
              {business?.logo
                ? <img src={business.logo} alt="" className="w-full h-full object-cover" />
                : (business?.name || 'TC').slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1">
                <span className="block text-[15px] font-bold text-text-primary truncate leading-tight">{business?.name || 'My Business'}</span>
                {isMulti && <ChevronDown size={16} className="text-text-secondary shrink-0" />}
              </span>
              <span className="block text-[11px] font-semibold text-text-secondary truncate mt-0.5">{typeLabel}</span>
            </span>
          </button>

          <VendorAvailabilityToggle compact />

          {actions}

          {bell && (bell.decorative ? (
            <div className="relative w-10 h-10 rounded-full bg-white border border-border-light shadow-sm flex items-center justify-center text-text-primary shrink-0">
              <Bell size={19} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary-main ring-2 ring-white" />
            </div>
          ) : (
            <button
              type="button"
              onClick={onBellClick}
              disabled={bell.disabled}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-white border border-border-light shadow-sm flex items-center justify-center text-text-primary shrink-0 disabled:opacity-50"
            >
              <Bell size={19} />
              {!bell.disabled && bell.showCount && bell.unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-main ring-2 ring-white text-white text-[10px] font-black flex items-center justify-center">
                  {bell.unreadCount}
                </span>
              ) : !bell.disabled && (bell.showDot ?? bell.unreadCount > 0) ? (
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary-main ring-2 ring-white" />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

/** A 40px round icon button for extra app-bar actions (Shop's search). */
export function AppBarIconButton({ icon: Icon, label, onClick, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn('w-10 h-10 rounded-full bg-white border border-border-light shadow-sm flex items-center justify-center text-text-primary shrink-0 disabled:opacity-50', className)}
    >
      <Icon size={19} />
    </button>
  );
}

export default AppBar;
