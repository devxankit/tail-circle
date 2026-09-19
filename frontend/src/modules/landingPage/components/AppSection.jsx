import { useNavigate } from 'react-router-dom';
import '../styles/app-section.css';

/**
 * AppSection — TailCircle App Download Card
 *
 * Premium mobile-first card matching the reference design:
 * - Badge: "GET THE APP" with phone icon
 * - Headline: "Ready to make pet life simpler?" ("simpler?" in TailCircle coral)
 * - Supporting text
 * - Official App Store and Google Play buttons
 * - Social proof: 3 pet avatars + "100K+ Pet parents already on the app!"
 * - Right visual: iPhone mockup with TailCircle UI + smiling Golden Retriever
 * - Handwritten note "Happier Pets Happier People ♡" + subtle doodles
 */

export function AppSection({ onCtaClick }) {
  const navigate = useNavigate();

  const handleStoreClick = (platform, e) => {
    e.preventDefault();
    if (onCtaClick) {
      onCtaClick(`Download on ${platform}`, e);
    }
    navigate('/app');
  };

  return (
    <section className="tc-app-section-root" id="app" aria-labelledby="app-title">
      <div className="tc-app-card">
        {/* Background Ambient Gradient Blobs */}
        <div className="tc-app-blob-mint" aria-hidden="true" />
        <div className="tc-app-blob-peach" aria-hidden="true" />

        <div className="tc-app-card-inner">
          {/* ── Left Column: Copy & Store Buttons ───────────────────────── */}
          <div className="tc-app-copy-col">
            {/* Small Mint Badge */}
            <div className="tc-app-badge">
              <svg className="tc-app-badge-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>GET THE APP</span>
            </div>

            {/* Main Headline */}
            <h2 id="app-title" className="tc-app-title">
              <span className="tc-app-title-teal">Ready to make</span>
              <span className="tc-app-title-split">
                <span className="tc-app-title-petlife">pet life </span>
                <span className="tc-app-title-coral">simpler?</span>
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="tc-app-desc">
              Explore Tail Circle in the app. Browse first, register when you actually need a feature.
            </p>

            {/* App Store & Google Play Buttons */}
            <div className="tc-app-store-btns">
              {/* Apple App Store */}
              <a
                href="/app"
                className="tc-store-btn"
                aria-label="Download on the App Store"
                onClick={(e) => handleStoreClick('App Store', e)}
              >
                <div className="tc-store-btn-left">
                  <div className="tc-store-icon" aria-hidden="true">
                    <svg width="22" height="26" viewBox="0 0 170 170" fill="currentColor">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12.01-14.42-5.45-8.39-9.84-18.41-13.16-30.06-3.32-11.66-4.98-22.9-4.98-33.72 0-14.8 3.58-26.68 10.74-35.65 7.16-8.97 16.32-13.57 27.48-13.8 4.79 0 10.42 1.25 16.9 3.75 6.47 2.5 10.37 3.81 11.69 3.93 1.9-.35 6.13-1.89 12.7-4.61 6.57-2.72 12.18-3.93 16.82-3.63 12.85.64 22.92 5.09 30.21 13.35-11.45 6.94-17.07 16.37-16.86 28.3.22 9.54 3.94 17.48 11.16 23.82 7.22 6.34 15.86 9.94 25.92 10.8-2.61 8.24-6.01 16.64-10.2 25.19zM119.22 32.64c0-7.39 2.66-14.41 7.98-21.06 5.32-6.65 11.95-10.73 19.89-12.24.43 1.3.65 2.61.65 3.91 0 7.39-2.77 14.34-8.3 20.84-5.54 6.5-12.43 10.49-20.68 11.97-.22-1.09-.34-2.23-.34-3.42z" />
                    </svg>
                  </div>
                  <div className="tc-store-text">
                    <span className="tc-store-sub">Download on the</span>
                    <strong className="tc-store-main">App Store</strong>
                  </div>
                </div>
                <span className="tc-store-arrow" aria-hidden="true">→</span>
              </a>

              {/* Google Play */}
              <a
                href="/app"
                className="tc-store-btn"
                aria-label="Get it on Google Play"
                onClick={(e) => handleStoreClick('Google Play', e)}
              >
                <div className="tc-store-btn-left">
                  <div className="tc-store-icon" aria-hidden="true">
                    <svg width="22" height="24" viewBox="0 0 512 512">
                      <path fill="#4285F4" d="M47.7 20.4C44.3 24 42.4 29.5 42.4 36.8v438.4c0 7.3 1.9 12.8 5.3 16.4l2.1 1.8 245.4-245.4v-5.6L49.8 18.6l-2.1 1.8z" />
                      <path fill="#FBBC04" d="M377.1 334.3l-81.9-81.9v-5.6l81.9-81.9 1.8 1.1 97 55.1c27.7 15.7 27.7 41.5 0 57.2l-97 55.1-1.8 1z" />
                      <path fill="#EA4335" d="M378.9 333.3L295.2 249.6 47.7 497.1c9.1 9.7 24.3 10.8 41.3 1.2l289.9-165z" />
                      <path fill="#34A853" d="M378.9 178.7L89 13.7C72 4.1 56.8 5.2 47.7 14.9L295.2 262.4l83.7-83.7z" />
                    </svg>
                  </div>
                  <div className="tc-store-text">
                    <span className="tc-store-sub">GET IT ON</span>
                    <strong className="tc-store-main">Google Play</strong>
                  </div>
                </div>
                <span className="tc-store-arrow" aria-hidden="true">→</span>
              </a>
            </div>

            {/* Social Proof */}
            <div className="tc-app-social-proof">
              <div className="tc-pet-avatars-group" aria-hidden="true">
                <div className="tc-pet-avatar tc-avatar-1" />
                <div className="tc-pet-avatar tc-avatar-2" />
                <div className="tc-pet-avatar tc-avatar-3" />
              </div>
              <div className="tc-social-text">
                <span className="tc-social-count">100K+</span>
                <span className="tc-social-sub">Pet parents already on the app!</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Phone Mockup with Golden Retriever ─────────── */}
          <div className="tc-app-visual-col" aria-hidden="true">
            <div className="tc-app-visual-wrap">
              {/* Paw Prints Watermark */}
              <div className="tc-app-decor-paws">🐾</div>

              {/* Main Phone + Dog Image Asset */}
              <img
                src="/assets/images/app-phone-golden.jpg"
                alt="TailCircle mobile app mockup with happy golden retriever"
                className="tc-app-phone-img"
                loading="lazy"
              />

              {/* Doodles: Motion Lines */}
              <svg className="tc-app-motion-left" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A3C3B" strokeWidth="2.8" strokeLinecap="round">
                <path d="M4 18c4-1 10-4 14-8" />
                <path d="M2 24c5-1 12-5 16-10" />
              </svg>

              <svg className="tc-app-motion-right" width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#0A3C3B" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 16c3-4 8-8 14-9" />
                <path d="M10 20c3-3 7-7 12-8" />
              </svg>

              {/* Doodles: Coral Heart */}
              <svg className="tc-app-coral-heart" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>

              {/* Handwritten Note (Happier Pets Happier People) */}
              <div className="tc-app-script-note">
                <span>Happier</span><br />
                <span>Pets</span><br />
                <span>Happier</span><br />
                <span>People</span>
                <span className="tc-app-script-heart">♥</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AppSection;
