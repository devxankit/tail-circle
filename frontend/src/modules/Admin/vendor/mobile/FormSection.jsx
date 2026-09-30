import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * A white card holding one group of a long form. `collapsible` sections start
 * open unless `defaultOpen={false}`; collapsing only hides — the fields stay
 * mounted, so one Save still sends everything.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
  bodyClassName,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Head = collapsible ? 'button' : 'div';

  return (
    <section className={cn('bg-white rounded-[20px] border border-border-light shadow-sm', className)}>
      {(title || description) && (
        <Head
          type={collapsible ? 'button' : undefined}
          onClick={collapsible ? () => setOpen((o) => !o) : undefined}
          className={cn('w-full flex items-start gap-3 p-4 text-left', (!collapsible || open) && 'pb-0')}
        >
          {Icon && (
            <span className="w-9 h-9 rounded-xl bg-accent-teal/10 text-[#4C8684] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
          )}
          <span className="flex-1 min-w-0">
            {title && <span className="block text-[15px] font-bold text-text-primary">{title}</span>}
            {description && <span className="block text-xs text-text-secondary mt-0.5 leading-snug">{description}</span>}
          </span>
          {action && <span className="shrink-0" onClick={(e) => e.stopPropagation()}>{action}</span>}
          {collapsible && (
            <ChevronDown size={20} className={cn('text-text-secondary shrink-0 mt-1 transition-transform', open && 'rotate-180')} />
          )}
        </Head>
      )}
      <div className={cn('p-4 space-y-4', !open && 'hidden', bodyClassName)}>{children}</div>
    </section>
  );
}

/** "SECTION LABEL" above a group of cards. */
export function SectionLabel({ children, className, action }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 mb-2 px-1', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">{children}</h3>
      {action}
    </div>
  );
}

/** Screen-level heading row: title, blurb and an optional action button. */
export function ScreenHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {title && <h2 className="text-lg font-bold text-text-primary leading-tight">{title}</h2>}
        {subtitle && <p className="text-xs text-text-secondary mt-1 leading-snug">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default FormSection;
