import React, { useState } from 'react';
import { Play, ArrowRight, Heart, Star, Users } from 'lucide-react';
import { PawDecoration } from './PawDecoration';
import { VideoModal } from './VideoModal';

const css = `
/* ══════════════════════════════════════════════════════
   TailCircle Story Section  (VideoSection replacement)
   ══════════════════════════════════════════════════════ */

.tcs-section {
  position: relative;
  /* Fill full viewport so no dead space */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(80px, 9vw, 120px) 0 clamp(80px, 9vw, 120px);
  background: #F4FBF8;
  width: 100%;
  /* NO overflow:hidden — let floating card breathe */
}

/* ── Clip wrapper clips only the bg blobs, not the floating card ── */
.tcs-bg-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

/* ── Background blobs ─────────────────────────────────────────────── */
.tcs-blob-tl {
  position: absolute;
  top: -80px;
  left: -100px;
  width: clamp(300px, 32vw, 460px);
  height: clamp(300px, 32vw, 460px);
  background: radial-gradient(ellipse at 30% 38%,
    #B8ECD8 0%, #D9F2EA 40%, transparent 72%);
  border-radius: 62% 38% 54% 46% / 54% 62% 38% 46%;
}

.tcs-blob-br {
  position: absolute;
  bottom: -70px;
  right: -80px;
  width: clamp(260px, 28vw, 420px);
  height: clamp(260px, 28vw, 420px);
  background: radial-gradient(ellipse at 64% 62%,
    #FFE9A8 0%, #FFF5D6 46%, transparent 72%);
  border-radius: 44% 56% 38% 62% / 62% 38% 56% 44%;
}

.tcs-blob-bl {
  position: absolute;
  bottom: -50px;
  left: -55px;
  width: clamp(190px, 21vw, 320px);
  height: clamp(190px, 21vw, 320px);
  background: radial-gradient(ellipse at 40% 58%,
    #C0EDD8 0%, #DEEEE6 52%, transparent 74%);
  border-radius: 56% 44% 62% 38% / 44% 58% 42% 56%;
}

/* ── Handwritten labels (absolute on section, z above bg) ─────────── */
.tcs-hw {
  font-family: 'Caveat', cursive;
  pointer-events: none;
  user-select: none;
  line-height: 1.25;
  position: absolute;
  z-index: 3;
}

.tcs-hw-real-stories {
  top: clamp(10px, 2.5vw, 36px);
  left: 50%;
  transform: translateX(-38%);
  font-size: clamp(15px, 1.5vw, 18px);
  color: #276D58;
  text-align: center;
  white-space: nowrap;
}

.tcs-hw-pets-brighter {
  bottom: clamp(14px, 3.5vw, 42px);
  left: clamp(8px, 2vw, 36px);
  font-size: clamp(15px, 1.5vw, 19px);
  color: #276D58;
  transform: rotate(-5deg);
}

.tcs-arrow-decor {
  display: block;
  margin: 3px auto 0;
  width: 34px;
  height: 24px;
  opacity: 0.55;
}

/* ── Main grid ────────────────────────────────────────────────────── */
.tcs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(36px, 5vw, 56px);
  align-items: center;
  position: relative;
  z-index: 2;
  width: 100%;
}

@media (min-width: 900px) {
  .tcs-grid {
    grid-template-columns: 42% 58%;
    align-items: center;
  }
}

/* ── LEFT column ──────────────────────────────────────────────────── */
.tcs-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* Badge */
.tcs-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #D8F4EB;
  color: #0D9488;
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  padding: 6px 16px 6px 8px;
  border-radius: 9999px;
  margin-bottom: 20px;
}

.tcs-badge-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #0D9488;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Heading */
.tcs-heading {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(36px, 4.4vw, 58px);
  font-weight: 900;
  line-height: 1.06;
  color: #0E2336;
  letter-spacing: -0.023em;
  margin: 0 0 18px 0;
}

.tcs-heading-teal { color: #0D9488; }

/* Yellow dash accents after "Tail Circle." */
.tcs-dashes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  vertical-align: middle;
  position: relative;
  top: -4px;
}
.tcs-dashes span {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: #FFC928;
}

/* Description */
.tcs-desc {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(14px, 1.35vw, 16.5px);
  color: #4A5D6E;
  line-height: 1.75;
  margin: 0 0 26px 0;
  max-width: 370px;
}

/* CTA row */
.tcs-cta-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.tcs-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: #0E2336;
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 13px 24px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(14,35,54,0.24);
  transition: transform 0.28s cubic-bezier(.16,1,.3,1),
              box-shadow 0.28s cubic-bezier(.16,1,.3,1),
              background 0.2s;
  outline-offset: 3px;
  flex-shrink: 0;
}
.tcs-cta-btn:hover {
  background: #071520;
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(14,35,54,0.32);
}
.tcs-cta-btn:focus-visible { outline: 3px solid #0D9488; }
.tcs-cta-btn:hover .tcs-arrow-icon { transform: translateX(4px); }
.tcs-arrow-icon { transition: transform 0.24s ease; }

.tcs-cta-play {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,0.17);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* "Play, feel, be part of it ♡" handwritten aside */
.tcs-hw-play-feel {
  font-family: 'Caveat', cursive;
  font-size: clamp(15px, 1.4vw, 17px);
  color: #276D58;
  transform: rotate(-3deg);
  line-height: 1.3;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

/* Stats */
.tcs-stats {
  display: flex;
  align-items: flex-start;
  gap: clamp(18px, 2.8vw, 36px);
  flex-wrap: nowrap;
}

.tcs-stat {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.tcs-stat-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.tcs-stat-icon--mint   { background: #D8F4EB; color: #0D9488; }
.tcs-stat-icon--yellow { background: #FFF0C0; color: #C98A00; }
.tcs-stat-icon--coral  { background: #FFE6E8; color: #D85560; }

.tcs-stat-text strong {
  display: block;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(12.5px, 1.1vw, 15px);
  font-weight: 800;
  color: #0E2336;
  line-height: 1.2;
}
.tcs-stat-text small {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(10px, 0.85vw, 12px);
  color: #7E92A2;
  font-weight: 500;
  line-height: 1.35;
}

/* ── RIGHT column — video wrapper ────────────────────────────────── */
/* This wrapper must NOT clip — the float card hangs below it */
.tcs-right {
  position: relative;
  /* Reserve space below video for float card overlap */
  padding-bottom: clamp(32px, 4vw, 44px);
  padding-right: clamp(0px, 2vw, 20px);
}

/* "Happier Dogs Together ♡" — sits OVER the video, clipped by video card */
/* It is inside .tcs-video-wrap which uses isolation so it renders above img */
.tcs-hw-happier {
  position: absolute;
  top: clamp(14px, 2.2vw, 22px);
  right: clamp(14px, 3vw, 28px);
  font-family: 'Caveat', cursive;
  font-size: clamp(17px, 1.9vw, 22px);
  color: #fff;
  text-align: right;
  line-height: 1.2;
  transform: rotate(2deg);
  z-index: 8;           /* above overlay (z:2) and play btn (z:4) in video */
  pointer-events: none;
  text-shadow: 0 1px 8px rgba(0,0,0,0.45);
}
.tcs-hw-happier::after {
  content: '';
  display: block;
  width: 72%;
  height: 1.8px;
  background: rgba(255,255,255,0.5);
  border-radius: 1px;
  margin-top: 4px;
  margin-left: auto;
}

/* Video card — overflow:hidden to clip the image & overlay only */
.tcs-video-card {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: clamp(18px, 2.8vw, 30px);
  overflow: hidden;        /* clips image & overlay inside */
  border: 4px solid #fff;
  box-shadow:
    0 30px 72px -16px rgba(14,35,54,0.22),
    0 8px 24px -4px rgba(14,35,54,0.10);
  cursor: pointer;
  background: #0E2336;
  transition: transform 0.4s cubic-bezier(.16,1,.3,1);
  isolation: isolate;     /* creates stacking context so tcs-hw-happier works */
}
.tcs-video-card:hover { transform: scale(1.012); }
.tcs-video-card:hover .tcs-play-btn {
  transform: scale(1.1);
  box-shadow: 0 12px 36px rgba(0,0,0,0.3);
}
.tcs-video-card:hover .tcs-video-img { transform: scale(1.04); }

.tcs-video-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  transition: transform 0.7s cubic-bezier(.16,1,.3,1);
  z-index: 1;
}

.tcs-video-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(14,35,54,0.04) 0%,
    rgba(14,35,54,0.14) 40%,
    rgba(14,35,54,0.54) 100%
  );
  z-index: 2;
}

/* Play button */
.tcs-play-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}

.tcs-play-ring {
  position: absolute;
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  animation: tcs-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes tcs-pulse {
  0%,100% { transform: scale(1);    opacity: 0.65; }
  50%      { transform: scale(1.15); opacity: 1;   }
}

.tcs-play-btn {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 28px rgba(0,0,0,0.22);
  transition: transform 0.3s cubic-bezier(.16,1,.3,1),
              box-shadow 0.3s cubic-bezier(.16,1,.3,1);
  z-index: 5;
}

/* Bottom caption pill */
.tcs-caption-pill {
  position: absolute;
  bottom: clamp(12px, 1.8vw, 18px);
  left: clamp(12px, 1.8vw, 18px);
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(14,35,54,0.80);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 6px 14px;
  border-radius: 9999px;
  z-index: 6;
}
.tcs-caption-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #FFC928;
  flex-shrink: 0;
}
.tcs-caption-text {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(10px, 0.9vw, 12px);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
}

/* ── FLOATING COMMUNITY CARD ─────────────────────────────────────── */
/*
  Lives OUTSIDE .tcs-video-card so it's never clipped by its overflow:hidden.
  Positioned on .tcs-right which has padding-bottom to make room.
  Section has NO overflow:hidden so card is always fully visible.
*/
.tcs-float-card {
  position: absolute;
  bottom: 0;
  right: clamp(-4px, 0vw, 0px);
  background: #fff;
  border-radius: 18px;
  padding: 11px 16px;
  box-shadow:
    0 14px 40px rgba(14,35,54,0.14),
    0 2px 8px rgba(14,35,54,0.07);
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 215px;
  z-index: 20;
  transition: transform 0.3s cubic-bezier(.16,1,.3,1),
              box-shadow 0.3s cubic-bezier(.16,1,.3,1);
}
.tcs-float-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 20px 50px rgba(14,35,54,0.18),
    0 4px 12px rgba(14,35,54,0.09);
}

.tcs-float-paw {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #D8F4EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tcs-float-text strong {
  display: block;
  font-family: 'Outfit', sans-serif;
  font-size: 11.5px;
  font-weight: 800;
  color: #0E2336;
  line-height: 1.25;
}
.tcs-float-text small {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  color: #4A5D6E;
  line-height: 1.3;
}
.tcs-float-heart { flex-shrink: 0; margin-left: auto; }

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 899px) {
  /* hide desktop-only decorations */
  .tcs-hw-real-stories,
  .tcs-hw-pets-brighter,
  .tcs-hw-play-feel { display: none !important; }

  .tcs-right {
    padding-bottom: 0;
    padding-right: 0;
  }

  /* float card becomes inline block below video */
  .tcs-float-card {
    position: relative;
    bottom: auto;
    right: auto;
    margin-top: 16px;
    max-width: 100%;
    width: fit-content;
  }

  .tcs-hw-happier { right: 12px; }
}

@media (max-width: 560px) {
  .tcs-stats     { flex-wrap: wrap; gap: 14px; }
  .tcs-dashes    { display: none; }
}

/* ── Reduced-motion ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .tcs-play-ring { animation: none !important; }
  .tcs-video-card,
  .tcs-video-card:hover               { transform: none !important; }
  .tcs-play-btn,
  .tcs-video-card:hover .tcs-play-btn { transform: none !important; }
  .tcs-video-card:hover .tcs-video-img{ transform: none !important; }
  .tcs-cta-btn:hover                  { transform: none !important; }
  .tcs-float-card:hover               { transform: none !important; }
}
`;

export function VideoSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <>
      <style>{css}</style>

      <section className="tcs-section" aria-labelledby="tcs-heading">

        {/* ── Clipped background blobs (own overflow:hidden wrapper) ── */}
        <div className="tcs-bg-clip" aria-hidden="true">
          <div className="tcs-blob-tl" />
          <div className="tcs-blob-br" />
          <div className="tcs-blob-bl" />
        </div>

        {/* ── Paw prints ── */}
        <PawDecoration
          className="absolute top-8 right-8 hidden md:block"
          size={34} opacity={0.09} color="#0D9488"
          style={{ transform: 'rotate(18deg)', zIndex: 3 }}
        />
        <PawDecoration
          className="absolute top-14 left-8 hidden lg:block"
          size={26} opacity={0.08} color="#0E2336"
          style={{ transform: 'rotate(-12deg)', zIndex: 3 }}
        />
        <PawDecoration
          className="absolute bottom-20 right-24 hidden lg:block"
          size={28} opacity={0.09} color="#FFC928"
          style={{ transform: 'rotate(10deg)', zIndex: 3 }}
        />

        {/* ── "Real stories, Brighter days ♡" ── */}
        <div className="tcs-hw tcs-hw-real-stories" aria-hidden="true">
          Real stories, Brighter days ♡
          <svg className="tcs-arrow-decor" viewBox="0 0 40 28" fill="none"
            stroke="#276D58" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20 3 C28 7, 34 17, 26 24" />
            <polyline points="22,20 26,25 31,21" />
          </svg>
        </div>

        {/* ── "Pets make life brighter ♡" ── */}
        <div className="tcs-hw tcs-hw-pets-brighter" aria-hidden="true">
          Pets make<br />life brighter ♡
        </div>

        {/* ══ MAIN CONTAINER ══ */}
        <div className="lp-container">
          <div className="tcs-grid">

            {/* ════ LEFT ════ */}
            <div className="tcs-left lp-reveal-left">

              {/* Badge */}
              <div className="tcs-badge" role="text">
                <span className="tcs-badge-icon" aria-hidden="true">
                  <Play size={10} color="#fff" fill="#fff" />
                </span>
                TAIL CIRCLE STORY
              </div>

              {/* Heading */}
              <h2 className="tcs-heading" id="tcs-heading">
                A day in the life<br />
                with <span className="tcs-heading-teal">Tail Circle.</span>
                <span className="tcs-dashes" aria-hidden="true">
                  <span style={{ width: 22 }} />
                  <span style={{ width: 14 }} />
                  <span style={{ width: 8 }} />
                </span>
              </h2>

              {/* Description */}
              <p className="tcs-desc">
                See how Tail Circle brings care, joy, and community
                together for pets and their people across Lake Norman.
              </p>

              {/* CTA */}
              <div className="tcs-cta-row">
                <button
                  className="tcs-cta-btn"
                  onClick={() => setIsVideoOpen(true)}
                  aria-label="Watch the Tail Circle story video"
                >
                  <span className="tcs-cta-play" aria-hidden="true">
                    <Play size={10} color="#fff" fill="#fff" />
                  </span>
                  WATCH THE VIDEO
                  <ArrowRight size={15} className="tcs-arrow-icon" aria-hidden="true" />
                </button>

                <div className="tcs-hw-play-feel" aria-hidden="true">
                  Play, feel,<br />be part of it ♡
                </div>
              </div>

              {/* Stats */}
              <div className="tcs-stats" role="list">
                <div className="tcs-stat" role="listitem">
                  <div className="tcs-stat-icon tcs-stat-icon--mint" aria-hidden="true">
                    <Heart size={15} fill="currentColor" />
                  </div>
                  <div className="tcs-stat-text">
                    <strong>10K+</strong>
                    <small>Happy Pet Families</small>
                  </div>
                </div>
                <div className="tcs-stat" role="listitem">
                  <div className="tcs-stat-icon tcs-stat-icon--yellow" aria-hidden="true">
                    <Users size={15} />
                  </div>
                  <div className="tcs-stat-text">
                    <strong>Stronger</strong>
                    <small>Local Community</small>
                  </div>
                </div>
                <div className="tcs-stat" role="listitem">
                  <div className="tcs-stat-icon tcs-stat-icon--coral" aria-hidden="true">
                    <Star size={15} fill="currentColor" />
                  </div>
                  <div className="tcs-stat-text">
                    <strong>Real Stories</strong>
                    <small>Real Impact</small>
                  </div>
                </div>
              </div>
            </div>{/* .tcs-left */}

            {/* ════ RIGHT ════ */}
            <div className="tcs-right lp-reveal-right">

              {/* Video card — has overflow:hidden for image clip */}
              <div
                className="tcs-video-card"
                onClick={() => setIsVideoOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Play the Tail Circle story video"
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsVideoOpen(true)}
              >
                {/* "Happier Dogs Together ♡" — inside video, above overlay */}
                <div className="tcs-hw-happier" aria-hidden="true">
                  Happier Dogs<br />Together ♡
                </div>

                <img
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80"
                  alt="A golden retriever holding a yellow tulip — A day in the life with Tail Circle"
                  className="tcs-video-img"
                />
                <div className="tcs-video-overlay" aria-hidden="true" />

                {/* Play btn */}
                <div className="tcs-play-center" aria-hidden="true">
                  <div className="tcs-play-ring" />
                  <div className="tcs-play-btn">
                    <Play size={24} fill="#0E2336" color="#0E2336" style={{ marginLeft: 2 }} />
                  </div>
                </div>

                {/* Caption */}
                <div className="tcs-caption-pill" aria-hidden="true">
                  <span className="tcs-caption-dot" />
                  <span className="tcs-caption-text">2:15 • Lake Norman Life Story</span>
                </div>
              </div>{/* .tcs-video-card */}

              {/* ── Floating card — OUTSIDE video card, on .tcs-right ── */}
              <div
                className="tcs-float-card"
                role="complementary"
                aria-label="Community highlight card"
              >
                <div className="tcs-float-paw" aria-hidden="true">
                  <PawDecoration size={20} color="#0D9488" opacity={0.88} />
                </div>
                <div className="tcs-float-text">
                  <strong>More than pets,</strong>
                  <small>A stronger community.</small>
                </div>
                <Heart
                  size={15}
                  className="tcs-float-heart"
                  fill="#D85560"
                  color="#D85560"
                  aria-hidden="true"
                />
              </div>

            </div>{/* .tcs-right */}
          </div>{/* .tcs-grid */}
        </div>{/* .lp-container */}
      </section>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoTitle="A Day in the Life with Tail Circle"
      />
    </>
  );
}
