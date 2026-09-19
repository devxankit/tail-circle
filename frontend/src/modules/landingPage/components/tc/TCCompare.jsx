import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { Paw } from './primitives';
import { FRAGMENTS, SERVICES, UNIFIED_ORBIT, IMG } from './content';

const byId = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

export function TCCompare() {
  return (
    <section className="tc-section tc-compare" id="why" aria-labelledby="tc-compare-title">
      <h2 className="sr-only" id="tc-compare-title">
        Why one circle beats a dozen apps
      </h2>

      <div className="tc-shell tc-compare__grid">
        {/* ────────────────── The old way ────────────────── */}
        <article className="tc-panel tc-panel--old tc-rv tc-rv--left">
          <span className="tc-chip tc-chip--coral tc-chip--upper">The Old Way</span>
          <h3 className="tc-h3">Too many places.</h3>

          <div className="tc-mess">
            {/* messy dotted routes behind the chips */}
            <svg
              className="tc-mess__lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <g
                fill="none"
                stroke="#E8A79E"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              >
                <path d="M22 16C40 30 18 38 32 50c14 12 34-6 42-17" />
                <path d="M60 10C48 26 70 28 74 42c4 14-22 10-30 22" />
                <path d="M20 52C34 60 20 74 30 84c10 10 30 4 44 2" />
                <path d="M74 60C58 66 50 78 56 88" />
                <path d="M32 30C50 34 62 22 78 34" />
              </g>
            </svg>

            {FRAGMENTS.map((f) => {
              const Icon = f.icon;
              return (
                <span
                  key={f.id}
                  className="tc-mess__item"
                  style={{ left: `${f.x}%`, top: `${f.y}%` }}
                >
                  <Icon size={14} color={f.color} strokeWidth={2.3} aria-hidden="true" />
                  {f.label}
                </span>
              );
            })}
          </div>

          <p className="tc-hand tc-hand--coral tc-note">
            So many apps.
            <br />
            So much searching.
            <br />
            It&apos;s overwhelming!
          </p>
        </article>

        {/* ────────────────── Divider arrow ────────────────── */}
        <div className="tc-arrow-between" aria-hidden="true">
          <ArrowRight size={30} strokeWidth={2.4} className="tc-only-lg" />
          <ArrowDown size={28} strokeWidth={2.4} className="tc-only-sm" />
        </div>

        {/* ────────────────── The Tail Circle way ────────────────── */}
        <article className="tc-panel tc-panel--new tc-rv tc-rv--right">
          <span className="tc-chip tc-chip--upper">The Tail Circle Way</span>
          <h3 className="tc-h3">One circle.</h3>

          <div className="tc-unify">
            <div className="tc-unify__ring" aria-hidden="true" />
            <div className="tc-unify__pet">
              <img
                src={IMG.collie}
                alt="A beagle at the centre of the Tail Circle ecosystem"
                loading="lazy"
                decoding="async"
                width="340"
                height="340"
              />
            </div>
            {UNIFIED_ORBIT.map((o) => {
              const s = byId[o.id];
              const Icon = s.icon;
              return (
                <span
                  key={o.id}
                  className="tc-mini"
                  style={{ left: `${o.x}%`, top: `${o.y}%` }}
                >
                  <Icon size={15} color={s.color} strokeWidth={2.3} aria-hidden="true" />
                  <span className="tc-mini__label">{s.label}</span>
                </span>
              );
            })}
          </div>

          <p className="tc-hand tc-hand--teal tc-note" style={{ textAlign: 'right' }}>
            One profile.
            <br />
            One place.
            <br />
            A happier life.
          </p>

          <span className="tc-deco tc-deco--desk" style={{ top: 18, right: 20 }}>
            <Paw size={22} color="#0FA39A" opacity={0.2} rotate={16} />
          </span>
        </article>
      </div>
    </section>
  );
}

export default TCCompare;
