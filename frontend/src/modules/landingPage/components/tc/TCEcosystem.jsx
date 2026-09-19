import React from 'react';
import { SectionLabel, Paw } from './primitives';
import { SERVICES } from './content';

export function TCEcosystem() {
  return (
    <section className="tc-section tc-eco" id="services" aria-labelledby="tc-eco-title">
      <div className="tc-deco tc-deco--desk" style={{ top: '12%', left: '4%' }}>
        <Paw size={30} color="#FFC72C" opacity={0.28} rotate={-22} />
      </div>
      <div className="tc-deco tc-deco--desk" style={{ top: '18%', right: '5%' }}>
        <Paw size={24} color="#0FA39A" opacity={0.2} rotate={18} />
      </div>

      <div className="tc-shell tc-shell--wide">
        <header className="tc-section-head tc-rv">
          <SectionLabel>Everything they need</SectionLabel>
          <h2 className="tc-h2" id="tc-eco-title">
            A complete world for your pet.
          </h2>
          <p className="tc-lead">
            From everyday care to new adventures, Tail Circle brings it all
            together.
          </p>
        </header>

        <ul
          className="tc-eco__grid"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.id} className={`tc-rv tc-d${Math.min(i + 1, 6)}`}>
                <a className="tc-card" href={`/services/${s.id}`}>
                  <span
                    className="tc-card__tag"
                    style={{ background: s.tagBg, color: s.color }}
                  >
                    <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
                    {s.title}
                  </span>
                  <span className="tc-card__media">
                    <img
                      src={s.image}
                      alt={`${s.title} for pets in Lake Norman`}
                      loading="lazy"
                      decoding="async"
                      width="300"
                      height="225"
                    />
                  </span>
                  <span className="tc-card__title">{s.title}</span>
                  <span className="tc-card__desc">{s.desc}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default TCEcosystem;
