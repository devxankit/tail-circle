import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../user/utils/cn';

/**
 * 4+ in-tab choices as a horizontally scrolling chip row (Community's tabs).
 * Same contract as SegmentedTabs: `to` navigates, `onSelect` switches state.
 * The active chip scrolls itself into view.
 */
export function ChipTabs({ items, activeKey, onSelect, className, replace = false }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeKey]);

  return (
    <div className={cn('flex overflow-x-auto hide-scrollbar gap-2 -mx-4 px-4 pb-1', className)} role="tablist">
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;
        const cls = cn(
          'shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5',
          active ? 'bg-text-primary text-white border-text-primary' : 'bg-white text-text-secondary border-border-light'
        );
        const content = (
          <>
            {Icon && <Icon size={15} className="shrink-0" />}
            {item.label}
            {item.badge ? (
              <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center', active ? 'bg-white text-text-primary' : 'bg-primary-main text-white')}>{item.badge}</span>
            ) : null}
          </>
        );
        return item.to ? (
          <Link key={item.key} ref={active ? activeRef : undefined} to={item.to} replace={replace} role="tab" aria-selected={active} className={cls}>
            {content}
          </Link>
        ) : (
          <button key={item.key} ref={active ? activeRef : undefined} type="button" role="tab" aria-selected={active} onClick={() => onSelect?.(item.key)} className={cls}>
            {content}
          </button>
        );
      })}
    </div>
  );
}

export default ChipTabs;
