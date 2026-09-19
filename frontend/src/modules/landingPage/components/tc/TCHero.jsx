import React from 'react';
import { PlayCircle, Star } from 'lucide-react';
import {
  Button,
  Underlined,
  FloatingServiceBubble,
  Paw,
  CurvedArrow,
} from './primitives';
import { SERVICES, IMG, PROOF_AVATARS } from './content';

export function TCHero() {
  return (
    <section className="tc-hero" id="home" aria-labelledby="tc-hero-title">
      {/* ── Decorative layer ── */}
      <div className="tc-blob" aria-hidden="true" style={{ width: 420, height: 420, top: -140, right: -120, background: 'radial-gradient(circle, #FFF3CF 0%, rgba(255,243,207,0) 68%)' }} />
      {/* kept fully inside the clipped section so its soft edge never reads
          as a hard horizontal line across the page */}
      <div className="tc-blob" aria-hidden="true" style={{ width: 360, height: 360, bottom: 48, left: -140, background: 'radial-gradient(circle, #DFF6F2 0%, rgba(223,246,242,0) 66%)' }} />
      <div className="tc-deco tc-deco--desk" style={{ top: '22%', left: '3%' }}>
        <Paw size={30} color="#FFC72C" opacity={0.35} rotate={-18} />
      </div>
      <div className="tc-deco tc-deco--desk" style={{ bottom: '14%', left: '8%' }}>
        <Paw size={22} color="#0FA39A" opacity={0.22} rotate={14} />
      </div>
      <div className="tc-deco tc-deco--desk" style={{ top: '16%', right: '4%' }}>
        <Paw size={26} color="#FF766B" opacity={0.25} rotate={22} />
      </div>

      <div className="tc-shell tc-hero__grid">
        {/* ── Copy column ── */}
        <div className="tc-hero__copy">
          <p className="tc-hero__badge tc-rv is-in" style={{ margin: '0 0 18px' }}>
            <span className="tc-chip">
              <Paw size={14} color="#0FA39A" opacity={1} />
              For Happier, Healthier Lives
            </span>
          </p>

          <h1 className="tc-h1 tc-rv tc-d1" id="tc-hero-title">
            Everything your pet needs,
            <br />
            all in{' '}
            <span className="tc-accent">
              <Underlined>one circle.</Underlined>
            </span>
          </h1>

          <p className="tc-lead tc-rv tc-d2">
            Care, shop, explore, connect and more — for a happier pet life across
            Lake Norman.
          </p>

          <div className="tc-btn-row tc-rv tc-d3">
            <Button href="/auth/signup" variant="primary">
              Join the Circle
            </Button>
            <Button
              href="#how-it-works"
              variant="ghost"
              icon={<PlayCircle size={19} aria-hidden="true" />}
              iconRight={false}
            >
              See How It Works
            </Button>
          </div>

          {/* ── Social proof ── */}
          <div className="tc-trust tc-rv tc-d4">
            <div className="tc-trust__group">
              <div className="tc-avatars" aria-hidden="true">
                {PROOF_AVATARS.map((src, i) => (
                  <img key={src} src={src} alt="" loading="lazy" decoding="async" width="34" height="34" style={{ zIndex: 4 - i }} />
                ))}
              </div>
              <div>
                <div className="tc-trust__value">10,000+</div>
                <div className="tc-trust__label">Happy Pet Parents</div>
              </div>
            </div>

            <span className="tc-trust__divider" aria-hidden="true" />

            <div className="tc-trust__group">
              <div>
                <div className="tc-stars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <div className="tc-trust__value" style={{ marginTop: 2 }}>
                  4.9/5
                  <span className="sr-only"> average rating</span>
                </div>
                <div className="tc-trust__label">From our community</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visual column ── */}
        <div className="tc-rv tc-rv--scale tc-d2" style={{ minWidth: 0, position: 'relative' }}>
          {/* Handwritten note — only once there is genuinely room beside the
              orbit, otherwise it would crowd the service bubbles. */}
          <div className="tc-deco tc-deco--xl" style={{ top: '-4%', right: '-3%', textAlign: 'right' }}>
            <p className="tc-hand tc-hand--teal" style={{ marginBottom: 2 }}>
              Happier Pets
              <br />
              Brighter
              <br />
              Tomorrows
            </p>
            <span style={{ display: 'inline-block' }}>
              <CurvedArrow width={60} color="#0FA39A" flip />
            </span>
          </div>

          <div className="tc-orbit">
            <div className="tc-orbit__ring" aria-hidden="true" />
            <div className="tc-orbit__pet">
              <img
                src={IMG.heroDog}
                alt="A happy golden retriever surrounded by the services Tail Circle offers"
                width="520"
                height="520"
                fetchPriority="high"
                decoding="async"
              />
            </div>
            {SERVICES.map((s, i) => (
              <FloatingServiceBubble
                key={s.id}
                icon={s.icon}
                label={s.label}
                color={s.color}
                x={s.x}
                y={s.y}
                delay={i * 0.42}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TCHero;
