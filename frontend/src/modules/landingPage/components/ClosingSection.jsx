import { PawPrint } from 'lucide-react';
import '../styles/closing-section.css';

/**
 * ClosingSection — "A Simpler, Happier Tomorrow"
 *
 * Final landing page conversion section matching the reference design:
 * - Badge: "🐾 A SIMPLER, HAPPIER TOMORROW"
 * - Headline: "Less searching. More tail wagging."
 * - Supporting description
 * - 4 Benefit Circular Icon modules (Discover Nearby, Book Services, Join a Community, Give a Better Life)
 * - Primary Teal CTA: "Explore Tail Circle →"
 * - Bottom Social Proof bar: "Join thousands of pet parents already on Tail Circle" + avatars + "+10K"
 */

const BENEFITS = [
  {
    id: 'discover',
    label: 'Discover Nearby',
    theme: 'mint',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'book',
    label: 'Book Services',
    theme: 'peach',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'community',
    label: 'Join a Community',
    theme: 'mint',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'life',
    label: 'Give a Better Life',
    theme: 'peach',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

export function ClosingSection({ onCtaClick }) {
  const handleExploreClick = (e) => {
    e.preventDefault();
    if (onCtaClick) {
      onCtaClick('Explore Tail Circle Closing CTA', e);
    }
    const target = document.getElementById('app');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="tc-closing-section-root" aria-labelledby="closing-title">
      <div className="tc-closing-grid">
        {/* ── Left Column: Copy, Benefits & CTA ─────────────────────────── */}
        <div className="tc-closing-copy-col">
          {/* Small Mint Badge */}
          <div className="tc-closing-badge">
            <span className="tc-closing-badge-icon" aria-hidden="true">🐾</span>
            <span>A SIMPLER, HAPPIER TOMORROW</span>
          </div>

          {/* Main Headline */}
          <h2 id="closing-title" className="tc-closing-title">
            <span className="tc-closing-title-teal">Less searching.</span>
            <span className="tc-closing-title-coral">More tail wagging.</span>
          </h2>

          {/* Description */}
          <p className="tc-closing-desc">
            Tail Circle brings your pet's everyday world together in one simple experience.
          </p>

          {/* 4 Benefit Modules */}
          <div className="tc-closing-benefits-grid">
            {BENEFITS.map((item) => (
              <div key={item.id} className="tc-benefit-item">
                <div className={`tc-benefit-circle tc-benefit-${item.theme}`}>
                  {item.icon}
                </div>
                <span className="tc-benefit-label">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Primary Teal CTA */}
          <a
            href="#app"
            className="tc-closing-cta-btn"
            onClick={handleExploreClick}
          >
            <span>Explore Tail Circle</span>
            <span className="tc-closing-btn-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* ── Bottom Social Proof Strip ─────────────────────────────────── */}
      <div className="tc-closing-bottom-strip" role="complementary" aria-label="Social Proof">
        <div className="tc-strip-left">
          <PawPrint size={18} className="tc-strip-paw-icon" strokeWidth={2.2} aria-hidden="true" />
          <span className="tc-strip-text">
            Join thousands of pet parents already on Tail Circle
          </span>
        </div>

        <div className="tc-strip-right">
          <div className="tc-strip-avatars-group" aria-hidden="true">
            <div className="tc-strip-avatar tc-avatar-1" title="Golden Retriever" />
            <div className="tc-strip-avatar tc-avatar-2" title="Cat" />
            <div className="tc-strip-avatar tc-avatar-3" title="Puppy" />
          </div>
          <span className="tc-strip-badge">+10K</span>
        </div>
      </div>
    </section>
  );
}

export default ClosingSection;
