import { cn } from '../../../user/utils/cn';

/**
 * Dashboard numbers. `StatGrid` is the 2-column grid; `StatScroller` is the
 * horizontally scrolling row for when there are more than four.
 *
 *   tiles: [{ label, value, icon, hint, onClick, tone }]
 *
 * A tile with `onClick` stays tappable, as the desktop cards were.
 */
const TONE_ICON = {
  neutral: 'bg-bg-secondary text-text-secondary',
  primary: 'bg-primary-light/40 text-primary-main',
  teal: 'bg-accent-teal/15 text-[#4C8684]',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
};

export function StatTile({ label, value, icon: Icon, hint, onClick, tone = 'neutral', className }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'bg-white rounded-[20px] border border-border-light shadow-sm p-4 text-left min-w-0',
        onClick && 'active:scale-[0.98] transition-transform',
        className
      )}
    >
      {Icon && (
        <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', TONE_ICON[tone] || TONE_ICON.neutral)}>
          <Icon size={18} />
        </span>
      )}
      <p className="text-[22px] font-black text-text-primary leading-none truncate">{value ?? 0}</p>
      <p className="text-xs font-semibold text-text-secondary mt-1.5 leading-snug">{label}</p>
      {hint && <p className="text-[11px] text-text-secondary/80 mt-1 leading-snug">{hint}</p>}
    </Tag>
  );
}

export function StatGrid({ tiles = [], className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {tiles.filter(Boolean).map((t) => <StatTile key={t.key || t.label} {...t} />)}
    </div>
  );
}

export function StatScroller({ tiles = [], className }) {
  return (
    <div className={cn('flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1', className)}>
      {tiles.filter(Boolean).map((t) => (
        <StatTile key={t.key || t.label} {...t} className={cn('w-[42%] min-w-[140px] shrink-0', t.className)} />
      ))}
    </div>
  );
}

export default StatTile;
