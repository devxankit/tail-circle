import React, { useEffect, useRef } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { PawDecoration } from './PawDecoration';

/* ─────────────────────────────────────────────
   Inline SVG helpers – self-contained, no deps
───────────────────────────────────────────── */

function CommunityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="7" r="3" fill="#66B4B1" />
      <circle cx="16" cy="7" r="2.2" fill="#66B4B1" opacity="0.7" />
      <path d="M3 19c0-3.3 2.7-6 6-6h1c3.3 0 6 2.7 6 6" stroke="#66B4B1" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M16 13c2.2.4 4 2.3 4 4.6" stroke="#66B4B1" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function PawStatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 10.5c-2.4 0-4.2 1.8-4.2 3.8 0 1.8 1.5 3.7 4.2 3.7s4.2-1.9 4.2-3.7c0-2-1.8-3.8-4.2-3.8z" />
      <ellipse cx="6.8" cy="8.5" rx="1.8" ry="2.4" transform="rotate(-18 6.8 8.5)" />
      <ellipse cx="10.2" cy="5.8" rx="1.8" ry="2.6" transform="rotate(-6 10.2 5.8)" />
      <ellipse cx="13.8" cy="5.8" rx="1.8" ry="2.6" transform="rotate(6 13.8 5.8)" />
      <ellipse cx="17.2" cy="8.5" rx="1.8" ry="2.4" transform="rotate(18 17.2 8.5)" />
    </svg>
  );
}

function HeartStatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function CurvedArrow({ color = '#66B4B1', width = 60, height = 40, flip = false }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 40"
      fill="none"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : {}}
    >
      <path d="M5 35 C10 20, 30 5, 52 10" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="3 2" opacity="0.8" />
      <path d="M46 5 L52 10 L47 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
    </svg>
  );
}

function DottedPath({ color = '#FFC928', width = 100, height = 50 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 50" fill="none" aria-hidden="true">
      <path d="M10 40 C20 20, 40 10, 60 15 S85 35, 95 20" stroke={color} strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function AccentStrokes({ color = '#FFC928' }) {
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" fill="none" aria-hidden="true">
      <path d="M2 14 C6 8, 12 3, 20 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M18 22 C24 16, 32 12, 40 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="22" cy="4" r="2" fill={color} opacity="0.5" />
    </svg>
  );
}

export function CommunitySection() {
  const sectionRef = useRef(null);
  const imgColRef = useRef(null);
  const contentColRef = useRef(null);
  const stat1Ref = useRef(null);
  const stat2Ref = useRef(null);
  const stat3Ref = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const allRefs = [imgColRef, contentColRef, stat1Ref, stat2Ref, stat3Ref];

    if (prefersReduced) {
      allRefs.forEach((r) => {
        if (r.current) { r.current.style.opacity = '1'; r.current.style.transform = 'none'; }
      });
      return;
    }

    // Set initial state
    if (imgColRef.current) { imgColRef.current.style.opacity = '0'; imgColRef.current.style.transform = 'translateY(32px)'; }
    if (contentColRef.current) { contentColRef.current.style.opacity = '0'; contentColRef.current.style.transform = 'translateY(24px)'; }
    [[stat1Ref, 0.5], [stat2Ref, 0.62], [stat3Ref, 0.74]].forEach(([r, delay]) => {
      if (r.current) { r.current.style.opacity = '0'; r.current.style.transform = 'translateY(16px)'; r.current.style.transitionDelay = delay + 's'; }
    });

    const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (imgColRef.current) {
          imgColRef.current.style.transition = `opacity 0.65s ${ease}, transform 0.65s ${ease}`;
          imgColRef.current.style.opacity = '1'; imgColRef.current.style.transform = 'translateY(0)';
        }
        if (contentColRef.current) {
          contentColRef.current.style.transition = `opacity 0.65s 0.15s ${ease}, transform 0.65s 0.15s ${ease}`;
          contentColRef.current.style.opacity = '1'; contentColRef.current.style.transform = 'translateY(0)';
        }
        [[stat1Ref, 0.5], [stat2Ref, 0.62], [stat3Ref, 0.74]].forEach(([r, delay]) => {
          if (r.current) {
            r.current.style.transition = `opacity 0.5s ${delay}s ${ease}, transform 0.5s ${delay}s ${ease}`;
            r.current.style.opacity = '1'; r.current.style.transform = 'translateY(0)';
          }
        });
        observer.disconnect();
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="community"
      ref={sectionRef}
      aria-labelledby="cs-heading"
      style={{ position: 'relative', padding: 'clamp(64px, 8vw, 96px) 0', backgroundColor: '#FDFAF4', overflow: 'hidden' }}
    >
      {/* ── DECORATIVE BACKGROUND BLOBS ── */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '-60px', left: '-80px', width: '320px', height: '280px',
        background: 'radial-gradient(ellipse at 40% 40%, #DDF4EC 0%, #EAF8F3 50%, transparent 75%)',
        borderRadius: '60% 40% 50% 70% / 50% 60% 40% 50%', opacity: 0.6, pointerEvents: 'none', zIndex: 0
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: '-40px', right: '-60px', width: '260px', height: '220px',
        background: 'radial-gradient(ellipse at 60% 60%, #FFF3CC 0%, #FFF9E6 55%, transparent 78%)',
        borderRadius: '40% 60% 70% 30% / 60% 40% 50% 60%', opacity: 0.75, pointerEvents: 'none', zIndex: 0
      }} />

      {/* ── DECORATIVE PAWS ── */}
      <PawDecoration style={{ position: 'absolute', top: '40px', right: '8%', zIndex: 1 }} size={38} opacity={0.09} color="#12263A" />
      <PawDecoration style={{ position: 'absolute', bottom: '30px', left: '3%', zIndex: 1 }} size={30} opacity={0.08} color="#12263A" />
      <PawDecoration style={{ position: 'absolute', top: '50%', right: '2%', transform: 'translateY(-50%) rotate(25deg)', zIndex: 1 }} size={24} opacity={0.06} color="#12263A" />



      {/* ── MAIN CONTAINER ── */}
      <div className="lp-container" style={{ position: 'relative', zIndex: 3 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '57fr 43fr',
          gap: 'clamp(28px, 4vw, 56px)',
          alignItems: 'center'
        }} className="cs-main-grid">

          {/* ════ LEFT – IMAGE CARD ════ */}
          <div ref={imgColRef} style={{ position: 'relative', willChange: 'opacity, transform' }}>



            {/* Image Card */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: '32px',
                overflow: 'hidden',
                border: '5px solid #ffffff',
                boxShadow: '0 6px 24px -4px rgba(18,38,58,0.14), 0 24px 56px -12px rgba(18,38,58,0.10)',
                background: '#e0ece8',
              }}
              className="cs-img-card-hover"
            >
              <img
                src="/assets/images/community.jpg"
                alt="Diverse pet parents and happy dogs sitting together by the sunny Lake Norman shoreline"
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
                className="cs-img-hover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1200&q=80';
                }}
              />

              {/* Floating badge – LOCAL COMMUNITY / Stronger Together */}
              <div style={{
                position: 'absolute', top: '14px', right: '14px',
                display: 'flex', alignItems: 'center', gap: '9px',
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(18,38,58,0.06)',
                borderRadius: '14px', padding: '9px 14px',
                boxShadow: '0 4px 16px rgba(18,38,58,0.12)', zIndex: 3
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: '#DDF4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <CommunityIcon />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1.2 }}>
                  <span style={{ fontFamily: 'var(--lp-font-heading)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7E92A2', display: 'block' }}>
                    LOCAL COMMUNITY
                  </span>
                  <span style={{ fontFamily: 'var(--lp-font-heading)', fontSize: '12.5px', fontWeight: 800, color: '#12263A', display: 'block' }}>
                    Stronger Together
                  </span>
                </div>
              </div>

              {/* Location pill – bottom-left */}
              <div style={{
                position: 'absolute', bottom: '14px', left: '14px',
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(18,38,58,0.84)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                borderRadius: '9999px', padding: '7px 14px',
                color: '#ffffff', fontFamily: 'var(--lp-font-heading)',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.01em',
                boxShadow: '0 3px 12px rgba(0,0,0,0.25)', zIndex: 3
              }}>
                <MapPin size={12} aria-hidden="true" style={{ color: '#FFC928', flexShrink: 0 }} />
                <span>Lake Norman, North Carolina</span>
              </div>
            </div>
          </div>

          {/* ════ RIGHT – CONTENT ════ */}
          <div ref={contentColRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', willChange: 'opacity, transform' }}>

            {/* Eyebrow */}
            <p style={{
              fontFamily: 'var(--lp-font-heading)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7E92A2',
              margin: '0 0 14px 0'
            }}>
              OUR COMMUNITY
            </p>

            {/* Main Heading */}
            <h2 id="cs-heading" className="lp-font-heading" style={{
              fontSize: 'clamp(2rem, 3.8vw, 3.15rem)', fontWeight: 900, color: '#12263A',
              lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0 0 20px 0'
            }}>
              Built for pets.<br />
              <span style={{ color: '#0D9488', position: 'relative', display: 'inline-block' }}>
                Rooted in Lake Norman.
                {/* Hand-drawn yellow underline */}
                <svg
                  viewBox="0 0 320 12"
                  aria-hidden="true"
                  style={{ position: 'absolute', bottom: '-9px', left: 0, width: '100%', height: '10px', pointerEvents: 'none' }}
                  preserveAspectRatio="none"
                >
                  <path
                    d="M4 8 C35 2, 80 11, 130 7 S210 2, 260 8 S300 11, 316 6"
                    stroke="#FFC928" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85"
                  />
                </svg>
              </span>
            </h2>

            {/* Description */}
            <p style={{
              fontFamily: 'var(--lp-font-body)', fontSize: 'clamp(0.93rem, 1.4vw, 1.05rem)',
              fontWeight: 500, color: '#4A5D6E', lineHeight: 1.72,
              maxWidth: '480px', margin: '0 0 28px 0'
            }}>
              Discover local events, pet-friendly lakeside places,
              weekend pack walks, and a warm community of pet
              parents who share your passion.
            </p>

            {/* CTA Button */}
            <a
              href="#events"
              aria-label="Explore your community"
              className="cs-cta-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                backgroundColor: '#12263A', color: '#ffffff',
                fontFamily: 'var(--lp-font-heading)', fontSize: '0.78rem', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
                padding: '16px 30px', minHeight: '54px', borderRadius: '9999px',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(18,38,58,0.20)'
              }}
            >
              <span>EXPLORE YOUR COMMUNITY</span>
              <ArrowRight size={15} className="cs-cta-arrow" aria-hidden="true" />
            </a>

            {/* ── STATS ── */}
            <div style={{ marginTop: '28px', width: '100%' }}>
              {/* Divider */}
              <div style={{ width: '100%', height: '1px', background: 'rgba(18,38,58,0.09)', marginBottom: '20px' }} />

              {/* Stats Row */}
              <div style={{ display: 'flex', alignItems: 'center' }}>

                {/* Stat 1 – 48+ Monthly */}
                <div ref={stat1Ref} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, paddingRight: '12px', willChange: 'opacity, transform' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#DDF4EC', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CalendarIcon />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1.2 }}>
                    <span className="lp-font-heading" style={{ fontSize: 'clamp(1.3rem, 2vw, 1.5rem)', fontWeight: 900, color: '#12263A', letterSpacing: '-0.02em', display: 'block' }}>48+</span>
                    <span style={{ fontFamily: 'var(--lp-font-body)', fontSize: '11px', fontWeight: 600, color: '#7E92A2', display: 'block' }}>Monthly Lake Events</span>
                  </div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: '1px', height: '36px', background: 'rgba(18,38,58,0.10)', flexShrink: 0 }} />

                {/* Stat 2 – 100% Pet Friendly */}
                <div ref={stat2Ref} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, padding: '0 12px', willChange: 'opacity, transform' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF3CC', color: '#B07D00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <PawStatIcon />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1.2 }}>
                    <span className="lp-font-heading" style={{ fontSize: 'clamp(1.3rem, 2vw, 1.5rem)', fontWeight: 900, color: '#12263A', letterSpacing: '-0.02em', display: 'block' }}>100%</span>
                    <span style={{ fontFamily: 'var(--lp-font-body)', fontSize: '11px', fontWeight: 600, color: '#7E92A2', display: 'block' }}>Pet Friendly Spaces</span>
                  </div>
                </div>

                {/* Vertical divider */}
                <div style={{ width: '1px', height: '36px', background: 'rgba(18,38,58,0.10)', flexShrink: 0 }} />

                {/* Stat 3 – 10K+ Happy */}
                <div ref={stat3Ref} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, paddingLeft: '12px', willChange: 'opacity, transform' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FCE5EC', color: '#C0395A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HeartStatIcon />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1.2 }}>
                    <span className="lp-font-heading" style={{ fontSize: 'clamp(1.3rem, 2vw, 1.5rem)', fontWeight: 900, color: '#12263A', letterSpacing: '-0.02em', display: 'block' }}>10K+</span>
                    <span style={{ fontFamily: 'var(--lp-font-body)', fontSize: '11px', fontWeight: 600, color: '#7E92A2', display: 'block' }}>Happy Pet Parents</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── SCOPED STYLES ── */}
      <style>{`
        /* CTA hover/active/focus */
        .cs-cta-btn {
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1),
                      box-shadow 0.22s cubic-bezier(0.16,1,0.3,1),
                      background-color 0.22s ease;
          outline: none;
        }
        .cs-cta-btn:hover {
          background-color: #0A1927 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(18,38,58,0.30) !important;
        }
        .cs-cta-btn:active {
          transform: translateY(0);
          box-shadow: 0 3px 10px rgba(18,38,58,0.18) !important;
        }
        .cs-cta-btn:focus-visible {
          outline: 3px solid #66B4B1;
          outline-offset: 3px;
        }
        .cs-cta-arrow {
          transition: transform 0.22s ease;
          flex-shrink: 0;
        }
        .cs-cta-btn:hover .cs-cta-arrow {
          transform: translateX(4px);
        }

        /* Image hover scale */
        .cs-img-hover {
          transition: transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .cs-img-card-hover:hover .cs-img-hover {
          transform: scale(1.04);
        }
        .cs-img-card-hover {
          transition: box-shadow 0.35s ease;
        }
        .cs-img-card-hover:hover {
          box-shadow: 0 8px 28px -4px rgba(18,38,58,0.18), 0 28px 64px -12px rgba(18,38,58,0.14) !important;
        }

        /* Tablet: single column */
        @media (max-width: 1023px) {
          .cs-main-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .cs-deco-hide-sm {
            display: none !important;
          }
        }

        /* Mobile adjustments */
        @media (max-width: 767px) {
          .cs-cta-btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* Image aspect ratio on tablet */
        @media (min-width: 640px) and (max-width: 1023px) {
          .cs-img-card-hover {
            aspect-ratio: 16 / 9 !important;
            border-radius: 26px !important;
          }
        }

        /* Show decorative elements only on large screens */
        .cs-deco-hide-sm {
          display: flex;
        }
        @media (max-width: 1199px) {
          .cs-deco-hide-sm {
            display: none !important;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .cs-img-hover,
          .cs-cta-btn,
          .cs-img-card-hover {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
