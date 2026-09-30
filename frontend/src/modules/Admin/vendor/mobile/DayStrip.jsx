import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fieldClass } from './Field';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A horizontal strip of days around the chosen one — the customer booking
 * screen's date picker. `value` / `onChange` use "YYYY-MM-DD" strings.
 *
 * `span` days are shown, centred on `value` (or starting at `start` when
 * given, for a strip that should not move as the selection changes).
 */
export function DayStrip({ value, onChange, span = 7, start, marks }) {
  const days = useMemo(() => {
    const anchor = new Date(`${start || value}T00:00:00`);
    const offset = start ? 0 : Math.floor(span / 2);
    return Array.from({ length: span }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i - offset);
      return d;
    });
  }, [value, span, start]);
  const today = ymd(new Date());

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
      {days.map((d) => {
        const key = ymd(d);
        const on = key === value;
        const count = marks?.[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative flex flex-col items-center justify-center w-[52px] h-[72px] rounded-[18px] shrink-0 border-2 transition-all ${
              on ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20' : 'bg-white border-border-light text-text-primary'
            }`}
          >
            <span className={`text-[10px] font-bold ${on ? 'text-white/90' : 'text-text-secondary'}`}>
              {d.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
            <span className="text-[18px] font-black leading-none my-0.5">{d.getDate()}</span>
            <span className={`text-[10px] font-bold ${on ? 'text-white/90' : key === today ? 'text-primary-main' : 'text-text-secondary'}`}>
              {key === today ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
            {count > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${on ? 'bg-white text-[#4C8684]' : 'bg-primary-main text-white'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Previous / date field / next / Today — the date navigation the partner
 * screens had, sized for a thumb. `shift(delta)` and `onChange(ymd)` are the
 * screen's own handlers.
 */
export function DateNav({ value, onChange, onShift, onToday }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onShift(-1)} aria-label="Previous day" className="w-11 h-11 rounded-xl bg-white border border-border-light flex items-center justify-center text-text-primary shrink-0">
        <ChevronLeft size={18} />
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} h-11 flex-1 min-w-0 text-center px-2`}
      />
      <button type="button" onClick={() => onShift(1)} aria-label="Next day" className="w-11 h-11 rounded-xl bg-white border border-border-light flex items-center justify-center text-text-primary shrink-0">
        <ChevronRight size={18} />
      </button>
      <button type="button" onClick={onToday} className="h-11 px-3 rounded-xl bg-bg-secondary text-text-primary text-xs font-bold shrink-0">
        Today
      </button>
    </div>
  );
}

export default DayStrip;
