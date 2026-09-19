import React from 'react';
import { Check } from 'lucide-react';
import { PhoneMockup, Paw } from './primitives';
import { AppScreen } from './AppScreens';
import { APP_FEATURES } from './content';

/* Store marks drawn inline — lucide has no brand glyphs. */
function AppleMark() {
  return (
    <svg width="22" height="26" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true">
      <path d="M13.9 12.7c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.7 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-3.8ZM11.6 4.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg width="21" height="23" viewBox="0 0 20 22" aria-hidden="true">
      <path d="M1.3.6C1 .9.8 1.4.8 2v18c0 .6.2 1.1.5 1.4l.1.1L11.5 11v-.2L1.4.6h-.1Z" fill="#34C7F4" />
      <path d="m14.9 14.4-3.4-3.4v-.2l3.4-3.4.1.1 4 2.3c1.2.7 1.2 1.8 0 2.4l-4 2.2Z" fill="#FFC72C" />
      <path d="m14.8 14.3-3.3-3.4L1.3 21.4c.4.4 1 .5 1.8.1l11.7-6.7" fill="#FF766B" />
      <path d="M14.8 7.5 3.1.8C2.3.4 1.7.5 1.3.9L11.5 11l3.3-3.5Z" fill="#0FA39A" />
    </svg>
  );
}

export function TCAppShowcase() {
  return (
    <section className="tc-section tc-app" id="app" aria-labelledby="tc-app-title">
      <div className="tc-deco tc-deco--desk" style={{ top: '12%', left: '4%' }}>
        <Paw size={26} color="#0FA39A" opacity={0.18} rotate={-16} />
      </div>
      <div className="tc-deco tc-deco--desk" style={{ bottom: '12%', right: '5%' }}>
        <Paw size={30} color="#FFC72C" opacity={0.3} rotate={18} />
      </div>

      <div className="tc-shell tc-shell--wide tc-app__grid">
        {/* ── Copy ── */}
        <div className="tc-rv tc-rv--left" style={{ minWidth: 0 }}>
          <span className="tc-chip" style={{ marginBottom: 16 }}>
            <Paw size={13} color="#0FA39A" opacity={1} />
            Tail Circle App
          </span>
          <h2 className="tc-h2" id="tc-app-title">
            Your pet&apos;s world.
            <br />
            Right at your fingertips.
          </h2>
          <p className="tc-lead">
            Download the app and take the circle with you.
          </p>

          <div className="tc-stores">
            <a className="tc-store" href="#app" aria-label="Download Tail Circle on the App Store">
              <AppleMark />
              <span>
                <span className="tc-store__sm">Download on the</span>
                <span className="tc-store__lg">App Store</span>
              </span>
            </a>
            <a className="tc-store" href="#app" aria-label="Get Tail Circle on Google Play">
              <PlayMark />
              <span>
                <span className="tc-store__sm">GET IT ON</span>
                <span className="tc-store__lg">Google Play</span>
              </span>
            </a>
          </div>
        </div>

        {/* ── Phones ── */}
        <div className="tc-app__phones tc-rv tc-rv--scale tc-d2">
          <PhoneMockup small>
            <AppScreen name="explore" />
          </PhoneMockup>
          <PhoneMockup small>
            <AppScreen name="community" />
          </PhoneMockup>
        </div>

        {/* ── Features ── */}
        <ul className="tc-features tc-rv tc-rv--right tc-d3" style={{ listStyle: 'none', margin: 0 }}>
          {APP_FEATURES.map((f) => (
            <li key={f} className="tc-feature">
              <span className="tc-feature__icon" aria-hidden="true">
                <Check size={16} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default TCAppShowcase;
