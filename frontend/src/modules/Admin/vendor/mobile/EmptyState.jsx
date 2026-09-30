import { Inbox } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/** The "nothing here yet" card for partner lists. */
export function EmptyState({ icon: Icon = Inbox, title, text, action, className, compact = false }) {
  return (
    <div className={cn(
      'bg-white rounded-[20px] border border-border-light text-center flex flex-col items-center',
      compact ? 'py-8 px-5' : 'py-12 px-6',
      className
    )}>
      <span className="w-14 h-14 rounded-full bg-bg-primary flex items-center justify-center mb-3">
        <Icon size={26} className="text-text-disabled" />
      </span>
      {title && <p className="font-bold text-text-primary">{title}</p>}
      {text && <p className={cn('text-sm text-text-secondary max-w-[280px] leading-relaxed', title && 'mt-1')}>{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Inline error line (the red text screens show above a form). */
export function InlineError({ children, className }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn('text-sm font-semibold text-error bg-error/5 border border-error/15 rounded-xl px-3 py-2.5', className)}>
      {children}
    </p>
  );
}

export default EmptyState;
