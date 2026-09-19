
/**
 * HeroCTA — Bottom Call to Action and Section Slider Indicator
 * "See what Tail Circle does →" pill in TailCircle coral
 * 4-dot carousel indicator with first dot in TailCircle teal
 * Safe-area bottom support for modern mobile devices (e.g. iPhone home bar)
 */
export function HeroCTA({ onCtaClick }) {
  return (
    <div className="tc-hero-cta-wrapper">
      <button
        type="button"
        className="tc-hero-cta-button"
        onClick={(e) => onCtaClick && onCtaClick('See what Tail Circle does', e)}
        aria-label="See what Tail Circle does"
      >
        <span>See what Tail Circle does</span>
        <svg
          className="tc-hero-cta-arrow"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>

      {/* 4 Carousel Dots with 1st dot active in TailCircle Teal */}
      <div className="tc-hero-dots-indicator" aria-hidden="true">
        <span className="tc-dot active" />
        <span className="tc-dot" />
        <span className="tc-dot" />
        <span className="tc-dot" />
      </div>
    </div>
  );
}

export default HeroCTA;
