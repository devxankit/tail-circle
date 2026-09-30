import { ChevronRight } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StatusBadge } from './StatusBadge';

/**
 * A table row, rebuilt as a card: the key column as the title, status as a
 * badge, a few key columns as a 2-column meta grid, and actions in a footer.
 *
 *   <ListCard
 *     title="Bruno · Asha"  subtitle="GR-1042 · 12 Jun 10:30"
 *     status="confirmed"    amount="₹1,200"
 *     meta={[{ label: 'Visit', value: 'Home' }]}
 *     footer={<button…/>}   onClick={() => open(row)}
 *   />
 *
 * `onClick` makes the body tappable (row → detail, as tables did); the footer
 * never triggers it, so its buttons keep their own handlers.
 */
export function ListCard({
  title,
  subtitle,
  status,
  statusLabel,
  badge,
  amount,
  amountHint,
  leading,
  meta,
  children,
  footer,
  onClick,
  chevron,
  className,
  highlight,
}) {
  const Body = onClick ? 'button' : 'div';
  const hasMeta = Array.isArray(meta) && meta.filter(Boolean).length > 0;

  return (
    <div
      className={cn(
        'bg-white rounded-[20px] border shadow-sm overflow-hidden',
        highlight ? 'border-primary-main/40' : 'border-border-light',
        className
      )}
    >
      <Body
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn('w-full text-left p-4 block', onClick && 'active:bg-bg-primary transition-colors')}
      >
        <div className="flex items-start gap-3">
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {title && <p className="text-[15px] font-bold text-text-primary leading-snug break-words">{title}</p>}
                {subtitle && <p className="text-xs text-text-secondary mt-0.5 break-words">{subtitle}</p>}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {badge ?? (status ? <StatusBadge status={status} label={statusLabel} /> : null)}
                {amount != null && <span className="text-[15px] font-black text-text-primary">{amount}</span>}
                {amountHint && <span className="text-[10px] text-text-secondary">{amountHint}</span>}
              </div>
            </div>

            {hasMeta && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
                {meta.filter(Boolean).map((m) => (
                  <div key={m.label} className={cn('min-w-0', m.full && 'col-span-2')}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">{m.label}</p>
                    <div className="text-[13px] font-semibold text-text-primary mt-0.5 break-words">{m.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {children && <div className="mt-3">{children}</div>}
          </div>
          {(chevron ?? !!onClick) && !footer && (
            <ChevronRight size={18} className="text-text-disabled shrink-0 self-center" />
          )}
        </div>
      </Body>

      {footer && (
        <div className="px-4 pb-4 pt-3 border-t border-border-light flex flex-wrap gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}

/** A small secondary action button for card footers (≥44px tall). */
export function CardAction({ children, onClick, disabled, tone = 'neutral', icon: Icon, className, type = 'button', ...rest }) {
  const tones = {
    neutral: 'bg-bg-secondary text-text-primary',
    primary: 'bg-primary-main text-white',
    teal: 'bg-accent-teal text-white',
    danger: 'bg-error/10 text-error',
    outline: 'bg-white border border-border-light text-text-primary',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[44px] px-4 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition',
        tones[tone] || tones.neutral,
        className
      )}
      {...rest}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export default ListCard;
