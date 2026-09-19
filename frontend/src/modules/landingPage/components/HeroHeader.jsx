import { Heart, ArrowRight } from 'lucide-react';

/**
 * HeroHeader — Premium Brand Navigation Header
 * Left: Tail Circle logo mark + brand title + heart tagline
 * Right: Coral "Get the App →" pill button
 * Refined vertical centering, balanced proportions, and clean breathing room.
 */
export function HeroHeader({ onCtaClick }) {
  return (
    <header className="tc-hero-header" role="banner">
      {/* Brand Identity */}
      <a href="#" className="tc-hero-brand" aria-label="Tail Circle Home">
        <div className="tc-hero-brand-mark" aria-hidden="true">
          <img
            src="/tc-brand-mark.png"
            alt="Tail Circle Logo"
            className="tc-hero-brand-img"
            loading="eager"
          />
        </div>
        <div className="tc-hero-brand-text">
          <span className="tc-hero-brand-title">
            <span className="tc-teal">Tail</span>{' '}
            <span className="tc-coral">Circle</span>
          </span>
          <span className="tc-hero-brand-sub">
            <Heart size={9} className="tc-tagline-heart" fill="#F45B4B" strokeWidth={0} aria-hidden="true" />
            <span>Swipes, Sniffs, and Soulmates</span>
            <Heart size={9} className="tc-tagline-heart" fill="#F45B4B" strokeWidth={0} aria-hidden="true" />
          </span>
        </div>
      </a>

      {/* Desktop-only secondary links (hidden on mobile) */}
      <nav className="tc-hero-nav-links" aria-label="Desktop Navigation">
        <a
          href="#app"
          className="tc-nav-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Shop
        </a>
        <a
          href="#app"
          className="tc-nav-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Services
        </a>
        <a
          href="#app"
          className="tc-nav-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Community
        </a>
        <a
          href="#app"
          className="tc-nav-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Events
        </a>
      </nav>

      {/* Primary Top CTA */}
      <a
        href="#app"
        className="tc-hero-get-app-btn"
        onClick={(e) => {
          if (onCtaClick) {
            e.preventDefault();
            onCtaClick('Get the App', e);
          }
        }}
        aria-label="Get the Tail Circle mobile app"
      >
        <span>Get the App</span>
        <ArrowRight size={15} strokeWidth={2.6} className="tc-cta-arrow" aria-hidden="true" />
      </a>
    </header>
  );
}

export default HeroHeader;
