import { PawPrint, ArrowRight } from 'lucide-react';

/**
 * HeroHeadline — Real HTML typography for hero title & description
 * Built for high-impact clarity, crystal-clear readability, and strong conversion.
 * Features:
 * - Refined Pill badge ("🐾 BUILT FOR PET PARENTS")
 * - High-contrast headline ("One place." + "Every tail.")
 * - Supporting description
 * - Dual action buttons ("See what Tail Circle does →" & "Get the app")
 */
export function HeroHeadline({ onCtaClick }) {
  const handleScrollToServices = (e) => {
    e.preventDefault();
    if (onCtaClick) {
      onCtaClick('See what Tail Circle does', e);
    }
    const target = document.getElementById('app');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToApp = (e) => {
    e.preventDefault();
    if (onCtaClick) {
      onCtaClick('Get the app', e);
    }
    const target = document.getElementById('app');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tc-hero-headline-container">
      {/* ── Refined Pill Badge ────────────────────────────────────────── */}
      <div className="tc-hero-pill-badge" role="note" aria-label="Built for pet parents">
        <PawPrint
          size={13}
          strokeWidth={2.4}
          className="tc-pill-paw-icon"
          aria-hidden="true"
        />
        <span>BUILT FOR PET PARENTS</span>
      </div>

      {/* ── Main Headline ─────────────────────────────────────────────── */}
      <h1 className="tc-hero-title">
        <span className="tc-title-teal">One place.</span>
        <span className="tc-title-coral">Every tail.</span>
      </h1>

      {/* ── Description ───────────────────────────────────────────────── */}
      <p className="tc-hero-desc">
        Everything your pet needs — from finding their perfect match to grooming, vets, meals, daycare, boarding, shopping, events and adoption.
      </p>

      {/* ── High-Impact Action Buttons ─────────────────────────────────── */}
      <div className="tc-hero-action-buttons">
        <a
          href="#app"
          className="tc-hero-btn tc-hero-btn-primary"
          onClick={handleScrollToServices}
          aria-label="See what Tail Circle does"
        >
          <span>See what Tail Circle does</span>
          <ArrowRight size={15} strokeWidth={2.5} className="tc-btn-arrow-icon" aria-hidden="true" />
        </a>

        <a
          href="#app"
          className="tc-hero-btn tc-hero-btn-secondary"
          onClick={handleScrollToApp}
          aria-label="Get the Tail Circle app"
        >
          <span>Get the app</span>
        </a>
      </div>

      {/* ── Social Proof Trust Row (Desktop / Laptop) ────────────────── */}
      <div className="tc-hero-trust-row" aria-label="Rating and pet parent trust">
        <div className="tc-hero-avatar-stack" aria-hidden="true">
          <div className="tc-avatar-mini tc-avatar-dog" />
          <div className="tc-avatar-mini tc-avatar-cat" />
          <div className="tc-avatar-mini tc-avatar-pup" />
        </div>
        <div className="tc-trust-stars-wrap" aria-hidden="true">
          <span className="tc-trust-star">★</span>
          <span className="tc-trust-star">★</span>
          <span className="tc-trust-star">★</span>
          <span className="tc-trust-star">★</span>
          <span className="tc-trust-star">★</span>
        </div>
        <span className="tc-trust-rating">4.9/5</span>
        <span className="tc-trust-divider" aria-hidden="true">•</span>
        <span className="tc-trust-text">Loved by <strong>10,000+</strong> pet parents</span>
      </div>

      {/* ── Quick Value Badges ─────────────────────────────────────────── */}
      <div className="tc-hero-quick-features" aria-label="Key app benefits">
        <div className="tc-quick-feat">
          <span className="tc-qf-icon">⚡</span>
          <span>Instant Booking</span>
        </div>
        <div className="tc-quick-feat">
          <span className="tc-qf-icon">🛡️</span>
          <span>Verified Care</span>
        </div>
        <div className="tc-quick-feat">
          <span className="tc-qf-icon">❤️</span>
          <span>Free Forever</span>
        </div>
      </div>
    </div>
  );
}

export default HeroHeadline;
