import { useState, useEffect } from 'react';

/**
 * MobileFloatingCta — Sticky Mobile Bottom Action Bar
 *
 * Sits cleanly above the viewport bottom with safe-area-inset-bottom support,
 * warm off-white translucent backdrop blur, and smooth interactive feedback.
 */
export function MobileFloatingCta({ onCtaClick }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hide sticky mobile CTA if user has reached or scrolled past the #app download section
      const appEl = document.getElementById('app');
      if (appEl) {
        const rect = appEl.getBoundingClientRect();
        if (rect.top <= window.innerHeight - 80) {
          setVisible(false);
          return;
        }
      }

      // Show sticky mobile CTA after scrolling past the hero area (>480px)
      if (window.scrollY > 480) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="tc-sticky-cta-bar" aria-label="Mobile quick action">
      <div className="tc-sticky-cta-inner">
        <a
          href="#app"
          className="tc-sticky-cta-btn"
          onClick={(e) => onCtaClick && onCtaClick('Mobile Floating CTA', e)}
        >
          <span>Get Tail Circle on the app</span>
          <span className="tc-cta-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

export default MobileFloatingCta;
