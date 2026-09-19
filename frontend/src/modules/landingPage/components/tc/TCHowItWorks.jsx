import React from 'react';
import { SectionLabel, PhoneMockup, CurvedArrow, Paw } from './primitives';
import { AppScreen } from './AppScreens';
import { STEPS } from './content';

export function TCHowItWorks() {
  return (
    <section
      className="tc-section tc-how"
      id="how-it-works"
      aria-labelledby="tc-how-title"
    >
      <div className="tc-deco tc-deco--desk" style={{ top: '10%', right: '6%' }}>
        <Paw size={26} color="#FFC72C" opacity={0.3} rotate={20} />
      </div>

      <div className="tc-shell">
        <header className="tc-section-head tc-rv">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="tc-h2" id="tc-how-title">
            Get started in three simple steps.
          </h2>
        </header>

        <ol className="tc-how__grid" style={{ listStyle: 'none', margin: 0, padding: 0, counterReset: 'none' }}>
          {STEPS.map((step, i) => (
            <li key={step.num} className={`tc-step tc-rv tc-d${i + 1}`}>
              <div className="tc-step__head">
                <span className="tc-step__num" style={{ background: step.accent }}>
                  {step.num}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3 className="tc-step__title">{step.title}</h3>
                  <p className="tc-step__desc">{step.desc}</p>
                </div>
              </div>

              <div className="tc-step__phone">
                <div style={{ position: 'relative' }}>
                  <PhoneMockup>
                    <AppScreen name={step.screen} />
                  </PhoneMockup>

                  {/* handwritten annotation — desktop / tablet only */}
                  <span
                    className="tc-deco tc-deco--xl"
                    style={
                      i === 0
                        ? { top: '8%', left: '-78%', textAlign: 'right', width: '72%' }
                        : { top: '18%', right: '-74%', textAlign: 'left', width: '70%' }
                    }
                  >
                    <span className="tc-hand tc-hand--teal" style={{ display: 'block', whiteSpace: 'pre-line' }}>
                      {step.note}
                    </span>
                    <span style={{ display: 'inline-block', marginTop: 2 }}>
                      <CurvedArrow width={56} color="#0FA39A" flip={i === 0} />
                    </span>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default TCHowItWorks;
