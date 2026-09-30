import { cn } from '../../../user/utils/cn';

/**
 * A scrolling row of single-choice filter chips — what a status `<select>`
 * becomes. `options`: strings or `{ value, label }`; `onChange` gets the value.
 */
export function FilterChips({ options, value, onChange, className }) {
  return (
    <div className={cn('flex overflow-x-auto hide-scrollbar gap-2 -mx-4 px-4 pb-1', className)}>
      {options.map((o) => {
        const opt = typeof o === 'object' ? o : { value: o, label: o };
        const on = value === opt.value;
        return (
          <button
            key={String(opt.value) || '__all'}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'shrink-0 min-h-[40px] px-4 rounded-full text-sm font-semibold whitespace-nowrap border',
              on ? 'bg-text-primary text-white border-text-primary' : 'bg-white text-text-secondary border-border-light'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default FilterChips;
