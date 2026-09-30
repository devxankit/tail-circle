import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * The screen's search box plus a filter button. The button opens the screen's
 * own filters in a `FilterSheet`; `filterCount` shows how many are active.
 *
 * `onChange` receives the value.
 */
export function SearchBar({ value, onChange, placeholder = 'Search', onFilter, filterCount = 0, className, sticky = false, disabled }) {
  return (
    <div className={cn('flex gap-2', sticky && 'sticky top-0 z-20 bg-bg-primary/95 backdrop-blur-sm py-2 -my-2', className)}>
      <div className="relative flex-1 min-w-0">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="search"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 rounded-2xl border border-border-light bg-white pl-11 pr-10 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 [&::-webkit-search-cancel-button]:hidden disabled:opacity-60"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange?.('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      {onFilter && (
        <button
          type="button"
          onClick={onFilter}
          aria-label="Filters"
          className="relative h-12 px-3.5 rounded-2xl border border-border-light bg-white flex items-center gap-1.5 text-text-primary shrink-0"
        >
          <SlidersHorizontal size={18} />
          <span className="text-[13px] font-bold">Filter</span>
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary-main text-white text-[10px] font-black flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default SearchBar;
