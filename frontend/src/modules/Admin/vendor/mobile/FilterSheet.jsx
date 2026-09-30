import { BottomSheet } from './BottomSheet';

/**
 * A screen's existing filters, moved into a sheet. The filter controls are the
 * screen's own (same state, same handlers) passed as children; this only adds
 * the sheet, a Done button and an optional Reset.
 */
export function FilterSheet({ open, onClose, title = 'Filters', onReset, children }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <div className="flex gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex-1 h-12 rounded-2xl bg-bg-secondary text-text-primary text-[15px] font-bold"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-primary-main text-white text-[15px] font-bold"
          >
            Done
          </button>
        </div>
      )}
    >
      <div className="space-y-4 pb-2">{children}</div>
    </BottomSheet>
  );
}

/** Pill options for a filter inside a FilterSheet (single choice). */
export function FilterOptions({ label, options, value, onChange }) {
  return (
    <div>
      {label && <p className="text-xs font-bold text-text-secondary mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const opt = typeof o === 'object' ? o : { value: o, label: o };
          const on = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`min-h-[40px] px-4 rounded-full text-sm font-bold border transition-colors ${
                on ? 'bg-accent-teal border-accent-teal text-white' : 'bg-white border-border-light text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FilterSheet;
