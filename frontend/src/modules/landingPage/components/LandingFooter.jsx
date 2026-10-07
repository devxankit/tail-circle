import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing-footer.css';

/**
 * LandingFooter — Clean Reference Footer with Legal & Contact Navigation
 * Top Row: Home • Privacy Policy • Terms & Conditions • Contact Us • Support Desk
 * Bottom Row: "© 2026 Tail Circle" --- [Logo] --- "Pet life. Sorted."
 */
export function LandingFooter() {
  return (
    <footer className="tc-landing-footer" role="contentinfo" aria-label="Tail Circle Footer">
      {/* Navigation Links Row */}
      <div className="tc-footer-nav-row">
        <Link to="/" className="tc-footer-nav-link">Home</Link>
        <span className="tc-footer-nav-dot" aria-hidden="true">•</span>
        <Link to="/privacy" className="tc-footer-nav-link">Privacy Policy</Link>
        <span className="tc-footer-nav-dot" aria-hidden="true">•</span>
        <Link to="/terms" className="tc-footer-nav-link">Terms &amp; Conditions</Link>
        <span className="tc-footer-nav-dot" aria-hidden="true">•</span>
        <Link to="/contact" className="tc-footer-nav-link">Contact Us</Link>
        <span className="tc-footer-nav-dot" aria-hidden="true">•</span>
        <Link to="/app/profile/support" className="tc-footer-nav-link">Support Desk</Link>
      </div>

      {/* Main Footer Row */}
      <div className="tc-footer-row">
        <span className="tc-footer-copy">© 2026 Tail Circle</span>

        <div className="tc-footer-logo-wrap">
          <Link to="/" aria-label="Tail Circle Home">
            <img
              className="tc-footer-logo-img"
              src="/tc-footer-logo.png"
              alt="Tail Circle — Swipes, Sniffs, and Soulmates"
              loading="lazy"
            />
          </Link>
        </div>

        <span className="tc-footer-tagline">Pet life. Sorted.</span>
      </div>
    </footer>
  );
}

export default LandingFooter;
