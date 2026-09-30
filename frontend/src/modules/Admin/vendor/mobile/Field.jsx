import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * Single-column form parts for the partner app.
 *
 * Each keeps the value/onChange contract of the per-file copies it replaces —
 * `onChange` receives the value, not the event — and passes every other prop
 * straight through to the native element (`placeholder`, `step`, `min`,
 * `inputMode`, `disabled`, …).
 *
 * Inputs are 48px tall with 16px text: large enough to hit, and 16px stops
 * iOS Safari from zooming the page on focus.
 */

/** Class strings for native controls a screen still renders itself. */
export const fieldClass =
  'w-full h-12 rounded-xl border border-border-light bg-white px-4 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 disabled:bg-bg-primary disabled:text-text-secondary';
export const textareaClass =
  'w-full rounded-xl border border-border-light bg-white px-4 py-3 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 resize-y';
export const labelClass = 'block text-xs font-bold text-text-secondary mb-1.5';

export function FieldLabel({ children, htmlFor, className }) {
  if (!children) return null;
  return <label htmlFor={htmlFor} className={cn(labelClass, className)}>{children}</label>;
}

export function Hint({ children, className }) {
  if (!children) return null;
  return <p className={cn('text-xs text-text-secondary mt-1.5 leading-snug', className)}>{children}</p>;
}

export function Input({ label, hint, error, value, onChange, className, inputClassName, type = 'text', ...rest }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(fieldClass, error && 'border-error', inputClassName)}
        {...rest}
      />
      {error ? <p className="text-xs text-error mt-1.5">{error}</p> : <Hint>{hint}</Hint>}
    </div>
  );
}

export function Textarea({ label, hint, value, onChange, className, rows = 3, ...rest }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className={textareaClass}
        {...rest}
      />
      <Hint>{hint}</Hint>
    </div>
  );
}

/**
 * `options`: strings, or `{ value, label }`. Children (raw <option>s) also work
 * for screens that build their own list.
 */
export function Select({ label, hint, value, onChange, options, children, className, selectClassName, ...rest }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(fieldClass, 'appearance-none pr-10', selectClassName)}
          {...rest}
        >
          {options
            ? options.map((o) => {
              const opt = typeof o === 'object' ? o : { value: o, label: o };
              return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })
            : children}
        </select>
        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}

/** A labelled on/off row. `onChange` receives the new boolean. */
export function Toggle({ label, hint, checked, onChange, disabled, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn('w-full min-h-[48px] flex items-center gap-3 text-left disabled:opacity-50', className)}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        {hint && <span className="block text-xs text-text-secondary mt-0.5">{hint}</span>}
      </span>
      <span className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0', checked ? 'bg-accent-teal' : 'bg-text-disabled')}>
        <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

/** A labelled checkbox row with a 44px target. `onChange` receives the boolean. */
export function Checkbox({ label, hint, checked, onChange, disabled, className }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn('w-full min-h-[44px] flex items-start gap-3 text-left py-2 disabled:opacity-50', className)}
    >
      <span className={cn(
        'mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors',
        checked ? 'bg-accent-teal border-accent-teal text-white' : 'bg-white border-border-light'
      )}>
        {checked && <Check size={15} strokeWidth={3} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        {hint && <span className="block text-xs text-text-secondary mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

/** Multi-select chips. `value` is an array; `onChange` receives the new array. */
export function ChipPicker({ label, hint, options, value, onChange, className }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      {hint && <p className="text-xs text-text-secondary -mt-0.5 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const opt = typeof o === 'object' ? o : { value: o, label: o };
          const on = (value || []).includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== opt.value) : [...(value || []), opt.value])}
              className={cn(
                'min-h-[40px] px-4 rounded-full text-sm font-bold border transition-colors',
                on ? 'bg-accent-teal border-accent-teal text-white' : 'bg-white border-border-light text-text-secondary'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Two small fields side by side (start/end, min/max) — the only pairing allowed. */
export function FieldPair({ children, className }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)}>{children}</div>;
}
