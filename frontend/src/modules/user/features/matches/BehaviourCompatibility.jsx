import React from 'react';
import { cn } from '../../utils/cn';

/**
 * The temperament read on a pair of pets — the whole of match compatibility.
 *
 * This used to sit underneath a nine-row score breakdown, adding a second
 * opinion in a second visual language: a pet could read "4/5 Good match" on
 * distance and size while this panel said their temperaments clashed. There is
 * one number now, and this is it.
 *
 * Deliberately wordless. It carried two lines of prose under the bar telling
 * owners how to introduce their pets — advice nobody asked this card for, on a
 * screen being swiped through at speed. The percentage and the traits behind it
 * say the same thing faster.
 *
 * Shape comes straight from `behaviourCompatibility()` on the server:
 * `{ value, level, shared }`.
 */

const TONE = {
  High: {
    bar: 'bg-[#4C8684]',
    panel: 'bg-[#EAF3F1] border-[#4C8684]/25',
    accent: 'text-[#4C8684]',
  },
  Good: {
    bar: 'bg-[#4C8684]/75',
    panel: 'bg-[#EAF3F1] border-[#4C8684]/20',
    accent: 'text-[#4C8684]',
  },
  Moderate: {
    bar: 'bg-amber-400',
    panel: 'bg-amber-50 border-amber-300/60',
    accent: 'text-amber-700',
  },
  Low: {
    bar: 'bg-gray-300',
    panel: 'bg-gray-50 border-gray-200',
    accent: 'text-gray-500',
  },
};

const pct = (value) => `${Math.round((value ?? 0) * 100)}%`;

export function BehaviourCompatibility({ behaviour, className }) {
  if (!behaviour?.level) return null;
  const tone = TONE[behaviour.level] || TONE.Moderate;

  return (
    <div className={cn('w-full rounded-2xl border p-4 text-left', tone.panel, className)}>
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-lg font-black text-[#222] tabular-nums leading-none">
          {pct(behaviour.value)}
        </span>
        <span className={cn('text-xs font-bold', tone.accent)}>{behaviour.level} match</span>
        <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-slate-400">
          Temperament
        </span>
      </div>

      <span className="block h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <span
          className={cn('block h-full rounded-full transition-all duration-500', tone.bar)}
          style={{ width: pct(behaviour.value) }}
        />
      </span>

      {/* The traits actually behind the number. A percentage says how well two
          pets match; these say on what. */}
      {behaviour.shared?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {behaviour.shared.map((trait) => (
            <span
              key={trait}
              className="px-2 py-0.5 rounded-full bg-white/80 border border-black/5 text-[10.5px] font-bold text-slate-600"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default BehaviourCompatibility;
