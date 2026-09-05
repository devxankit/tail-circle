import React from 'react';
import { ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * The behavioural read on a pair of pets.
 *
 * "It's a match" alone is a misleading thing to tell someone whose shy cat has
 * just matched with a pet marked aggressive. The engine already knows how the
 * two temperaments sit together; this is where that gets said out loud, in
 * terms an owner can act on before the two pets are in the same room.
 *
 * Shape comes straight from `behaviourCompatibility()` on the server:
 * `{ level, headline, advice, shared, cautions }`.
 */

const TONE = {
  High: {
    icon: ShieldCheck,
    chip: 'bg-[#4C8684] text-white',
    panel: 'bg-[#EAF3F1] border-[#4C8684]/25',
    accent: 'text-[#4C8684]',
  },
  Good: {
    icon: ShieldCheck,
    chip: 'bg-[#4C8684]/85 text-white',
    panel: 'bg-[#EAF3F1] border-[#4C8684]/20',
    accent: 'text-[#4C8684]',
  },
  Moderate: {
    icon: Info,
    chip: 'bg-amber-500 text-white',
    panel: 'bg-amber-50 border-amber-300/60',
    accent: 'text-amber-700',
  },
  Caution: {
    icon: ShieldAlert,
    chip: 'bg-rose-500 text-white',
    panel: 'bg-rose-50 border-rose-300/60',
    accent: 'text-rose-700',
  },
};

export function BehaviourCompatibility({ behaviour, className }) {
  if (!behaviour?.level) return null;
  const tone = TONE[behaviour.level] || TONE.Moderate;
  const Icon = tone.icon;

  return (
    <div className={cn('w-full rounded-2xl border p-3.5 text-left', tone.panel, className)}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} className={tone.accent} strokeWidth={2.5} />
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Match compatibility
        </span>
        <span
          className={cn(
            'ml-auto px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide',
            tone.chip
          )}
        >
          {behaviour.level}
        </span>
      </div>

      <p className="text-[12.5px] font-bold text-slate-700 leading-snug">{behaviour.headline}</p>
      <p className="text-[12px] text-slate-500 leading-snug mt-1">{behaviour.advice}</p>

      {behaviour.shared?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
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

      {/* The specific reasons behind the verdict. A level on its own tells an
          owner how worried to be; these tell them what to actually do. */}
      {behaviour.cautions?.length > 0 && (
        <ul className="mt-2.5 pt-2.5 border-t border-black/5 space-y-1">
          {behaviour.cautions.map((c) => (
            <li key={c} className="text-[11.5px] text-slate-500 leading-snug flex gap-1.5">
              <span className={cn('shrink-0 font-black', tone.accent)}>•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One-line version for the swipe card, where the full panel would crowd. */
export function BehaviourCompatibilityChip({ behaviour, className }) {
  if (!behaviour?.level) return null;
  const tone = TONE[behaviour.level] || TONE.Moderate;
  const Icon = tone.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold',
        tone.panel,
        tone.accent,
        className
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {behaviour.level} behaviour match
    </span>
  );
}

export default BehaviourCompatibility;
