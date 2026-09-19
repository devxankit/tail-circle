import { useRef, useState, useEffect } from 'react';
import { HeroHeader } from './HeroHeader';
import { HeroHeadline } from './HeroHeadline';
import { HeroFeatureOrbit } from './HeroFeatureOrbit';

/**
 * VideoHeroOrbit — Tail Circle Hero Section
 *
 * Designed with a clean, high-impact aesthetic:
 * 1. Warm cream brand background (no full-screen cover video)
 * 2. High-contrast typography ("One place. Every tail.") & action buttons
 * 3. Dedicated Video Showcase Box ("badiya box ke andar") enclosing:
 *    - Running Saint Bernard video (/video/hero-walk.mp4)
 *    - 10 interactive orbiting feature card hotspots
 *    - Center play/pause toggle
 * 4. Carousel dots indicator below the box
 */
export function VideoHeroOrbit({ onServiceClick, onCtaClick }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Autoplay video on load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="tc-hero-section" aria-label="Tail Circle Hero Section">
      {/* ── Ambient Background Lighting Glows ─────────────────────────── */}
      <div className="tc-hero-ambient-blob-mint" aria-hidden="true" />
      <div className="tc-hero-ambient-blob-coral" aria-hidden="true" />

      {/* ── Top Navigation Header ──────────────────────────────────────── */}
      <HeroHeader onCtaClick={onCtaClick} />

      {/* ── Main Hero Content ──────────────────────────────────────────── */}
      <div className="tc-hero-content-wrapper">
        {/* Real HTML High-Impact Typography & Action Buttons */}
        <HeroHeadline onCtaClick={onCtaClick} />

        {/* ── Dedicated Video Showcase Box ("Ek badiya box ke andar") ───── */}
        <div className="tc-hero-showcase-wrapper">
          {/* Floating Live Indicator Badge */}
          <div className="tc-floating-badge tc-floating-badge-top" aria-hidden="true">
            <span className="tc-fb-pulse-dot" />
            <span className="tc-fb-text">10 Services Connected</span>
          </div>

          <div className="tc-hero-video-box">
            {/* The Video Element Inside the Card Frame */}
            <video
              ref={videoRef}
              src="/video/hero-walk.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="tc-hero-video-player"
              aria-label="Happy Saint Bernard walking outdoors wearing Tail Circle bandana"
            />

            {/* Subtle inner depth overlay */}
            <div className="tc-video-inner-shadow" aria-hidden="true" />

            {/* Interactive Feature Orbit Hotspots & Center Play Button */}
            <HeroFeatureOrbit
              onServiceClick={onServiceClick}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />
          </div>

          {/* Floating Social Proof Badge */}
          <div className="tc-floating-badge tc-floating-badge-bottom" aria-hidden="true">
            <span className="tc-fb-emoji">🐾</span>
            <div className="tc-fb-content">
              <span className="tc-fb-strong">Match Found!</span>
              <span className="tc-fb-sub">98% Compatibility</span>
            </div>
          </div>

          {/* 4 Carousel Dots Below Video Box */}
          <div className="tc-hero-dots-indicator" aria-hidden="true">
            <span className="tc-dot active" />
            <span className="tc-dot" />
            <span className="tc-dot" />
            <span className="tc-dot" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default VideoHeroOrbit;
