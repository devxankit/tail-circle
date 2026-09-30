import { Link } from 'react-router-dom';
import { cn } from '../../../user/utils/cn';

/**
 * 2–3 in-tab choices (the Events screen's segmented control).
 *
 * Items either navigate (`to` — a route or `?view=` URL, so the address bar
 * stays the one the old sidebar used) or switch local state (`onSelect`).
 *
 *   items: [{ key, label, icon, to }]
 */
export function SegmentedTabs({ items, activeKey, onSelect, className, replace = false }) {
  return (
    <div className={cn('bg-gray-100/80 p-1 rounded-[24px] flex items-center w-full border border-gray-200/40 shadow-sm', className)} role="tablist">
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;
        const cls = cn(
          'flex-1 min-w-0 min-h-[40px] py-2 px-2 rounded-[20px] font-bold text-[13px] transition-all duration-300 flex items-center justify-center gap-1.5 select-none',
          active ? 'bg-white text-[#599D9A] shadow-[0_3px_12px_rgba(0,0,0,0.06)]' : 'text-slate-500'
        );
        const content = (
          <>
            {Icon && <Icon size={15} strokeWidth={2.5} className="shrink-0" />}
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-main text-white text-[10px] font-black flex items-center justify-center">{item.badge}</span>
            ) : null}
          </>
        );
        return item.to ? (
          <Link key={item.key} to={item.to} replace={replace} role="tab" aria-selected={active} className={cls}>
            {content}
          </Link>
        ) : (
          <button key={item.key} type="button" role="tab" aria-selected={active} onClick={() => onSelect?.(item.key)} className={cls}>
            {content}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
