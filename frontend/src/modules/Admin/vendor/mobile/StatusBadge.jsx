import { cn } from '../../../user/utils/cn';
import { statusTone } from './statusTone';

/**
 * The status pill every partner module uses, built on the semantic tokens.
 * Pass a raw `status` (tone looked up in statusTone.js) or an explicit
 * `tone` + `label`.
 */
const TONES = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/25',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-accent-teal/10 text-[#4C8684] border-accent-teal/25',
  primary: 'bg-primary-main/10 text-primary-dark border-primary-main/20',
  neutral: 'bg-bg-secondary text-text-secondary border-border-light',
};

export function StatusBadge({ status, label, tone, className, size = 'sm' }) {
  if (!status && !label) return null;
  const t = tone || statusTone(status);
  const text = label ?? String(status).replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border rounded-full font-bold uppercase tracking-wide whitespace-nowrap',
        size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        TONES[t] || TONES.neutral,
        className
      )}
    >
      {text}
    </span>
  );
}

export default StatusBadge;
