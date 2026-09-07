import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * A pet-pair's compatibility, shown as points out of five.
 *
 * Deliberately quiet. An earlier version put a filled badge with star icons
 * beside the pet's name *and* repeated the same stars in the panel below it —
 * the score competed with the pet for attention and said the same thing twice
 * within an inch of itself. The number now lives in exactly one place, drawn
 * as a thin meter rather than a decorated pill.
 */

const TIERS = [
  { min: 0.85, label: 'Great match', bar: 'bg-[#4C8684]', text: 'text-[#4C8684]' },
  { min: 0.6, label: 'Good match', bar: 'bg-[#4C8684]/70', text: 'text-[#4C8684]' },
  { min: 0.4, label: 'Worth a look', bar: 'bg-amber-400', text: 'text-amber-600' },
  { min: 0, label: 'Different vibes', bar: 'bg-gray-300', text: 'text-gray-400' },
];

const tierFor = (ratio) => TIERS.find((t) => ratio >= t.min) || TIERS[TIERS.length - 1];

/** Bare "3.5/5" in muted text — for dense lists where a meter would be noise. */
export function MatchPointsInline({ points, maxPoints = 5, className }) {
  if (points == null) return null;
  return (
    <span className={cn('text-xs font-bold text-gray-400 tabular-nums', className)}>
      {points}/{maxPoints} match
    </span>
  );
}

/** A thin meter, no label — for the match modal and other tight spots. */
export function MatchPointsMeter({ points, maxPoints = 5, className }) {
  if (points == null) return null;
  const ratio = Math.max(0, Math.min(1, points / maxPoints));
  const tier = tierFor(ratio);
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex-1 h-1.5 rounded-full bg-gray-200/70 overflow-hidden min-w-[80px]">
        <span
          className={cn('block h-full rounded-full transition-all duration-500', tier.bar)}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className="text-sm font-black text-[#222] tabular-nums shrink-0">
        {points}/{maxPoints}
      </span>
    </div>
  );
}

const PCT = (v) => `${Math.round((v ?? 0) * 100)}%`;

/**
 * The card's one compatibility control: a meter, the score, and the reasons
 * behind it on tap.
 */
export function MatchPointsBreakdown({ points, maxPoints = 5, factors = [], confidence, className }) {
  const [open, setOpen] = useState(false);

  if (points == null) return null;

  const known = factors.filter((f) => f.known);
  const ratio = Math.max(0, Math.min(1, points / maxPoints));
  const tier = tierFor(ratio);

  // Strongest first — the reasons these two pets suit each other lead.
  const ranked = [...known].sort((a, b) => b.value - a.value);

  return (
    <div className={cn('rounded-2xl bg-white border border-gray-200/80', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!known.length}
        className={cn(
          'w-full px-4 py-3 text-left transition-colors rounded-2xl',
          known.length ? 'cursor-pointer hover:bg-gray-50/70' : 'cursor-default'
        )}
      >
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-black text-[#222] tabular-nums">
              {points}/{maxPoints}
            </span>
            <span className={cn('text-xs font-bold truncate', tier.text)}>{tier.label}</span>
            {/* A reading built on two answered questions should not look as
                solid as one built on nine. */}
            {confidence === 'low' && (
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">est.</span>
            )}
          </span>
          {known.length > 0 && (
            <ChevronDown
              size={15}
              className={cn('text-gray-300 shrink-0 transition-transform duration-200', open && 'rotate-180')}
            />
          )}
        </div>

        <span className="block h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <span
            className={cn('block h-full rounded-full transition-all duration-500', tier.bar)}
            style={{ width: `${ratio * 100}%` }}
          />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ul className="space-y-2.5 pt-3.5 border-t border-gray-100">
            {ranked.map((f) => (
              <li key={f.key} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-24 shrink-0">{f.label}</span>
                <span className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <span
                    className={cn('block h-full rounded-full', tierFor(f.value).bar)}
                    style={{ width: PCT(f.value) }}
                  />
                </span>
                {/* A concrete value where one exists ("1.2 km", "1 yr apart")
                    — it says more than a ratio, and a percentage on distance
                    reads ambiguously in either direction. */}
                <span className="text-[11px] font-bold text-gray-400 w-16 text-right shrink-0 tabular-nums">
                  {f.display || PCT(f.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MatchPointsBreakdown;
