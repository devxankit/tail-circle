import '../styles/landing-footer.css';

/**
 * LandingFooter — Clean Single-Row Reference Footer
 * Left: "© 2026 Tail Circle"
 * Center: Official Tail Circle Logo (tc-footer-logo.png)
 * Right: "Pet life. Sorted."
 * Fits cleanly on one row across all desktop, tablet, and mobile screens.
 */
export function LandingFooter() {
  return (
    <footer className="tc-landing-footer" role="contentinfo" aria-label="Tail Circle Footer">
      <div className="tc-footer-row">
        <span className="tc-footer-copy">© 2026 Tail Circle</span>

        <div className="tc-footer-logo-wrap">
          <img
            className="tc-footer-logo-img"
            src="/tc-footer-logo.png"
            alt="Tail Circle — Swipes, Sniffs, and Soulmates"
            loading="lazy"
          />
        </div>

        <span className="tc-footer-tagline">Pet life. Sorted.</span>
      </div>
    </footer>
  );
}

export default LandingFooter;
