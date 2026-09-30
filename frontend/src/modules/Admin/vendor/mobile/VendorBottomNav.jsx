import { Link } from 'react-router-dom';
import { cn } from '../../../user/utils/cn';

/**
 * The customer app's bottom nav, driven by the partner nav config.
 *
 * Same bar, same active pill, same "label only on the active tab". Adds
 * count badges (Shop's unread orders, Adoption's applications) and a disabled
 * state (Shop blocks its panel until the store is verified).
 */
export function VendorBottomNav({ tabs, activeKey, badges = {}, disabledKeys = [] }) {
  return (
    <nav
      className="absolute bottom-0 inset-x-0 bg-white/70 backdrop-blur-lg border-t border-white/50 flex justify-around items-center px-2 z-40 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      style={{
        height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Main"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeKey;
        const disabled = disabledKeys.includes(tab.key);
        const badge = tab.badgeKey ? badges[tab.badgeKey] : null;
        const inner = (
          <>
            <div className={cn(
              'relative p-2 rounded-2xl transition-all duration-300 flex items-center justify-center',
              active ? 'bg-primary-light/20' : 'bg-transparent'
            )}>
              <Icon size={24} strokeWidth={active ? 2.5 : 2} className={cn('transition-transform duration-300', active && 'scale-110')} />
              {badge > 0 && (
                <span className="absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-main text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            {active && <span className="text-[10px] font-semibold">{tab.label}</span>}
          </>
        );
        const cls = cn(
          'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors min-w-0',
          active ? 'text-primary-main' : 'text-text-disabled',
          disabled && 'opacity-50'
        );
        return disabled ? (
          <span key={tab.key} className={cls} aria-disabled="true" aria-label={tab.label}>{inner}</span>
        ) : (
          <Link key={tab.key} to={tab.to} className={cls} aria-label={tab.label} aria-current={active ? 'page' : undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

export default VendorBottomNav;
