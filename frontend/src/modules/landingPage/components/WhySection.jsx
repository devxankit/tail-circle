import '../styles/why-section.css';

/**
 * WhySection — TailCircle Ecosystem Showcase
 *
 * Premium light editorial pet-tech section matching the reference design:
 * - Badge: "♥ WHY TAIL CIRCLE"
 * - Headline: "Your pet has a life. Not a shopping list."
 * - Hero pet lifestyle visual with handwritten "Happier Pets, Happier People"
 * - 3 Light Journey Cards (01 Discover, 02 Book, 03 Belong) with organic lifestyle
 *   photography, floating contextual icon badges, and compact bottom tags
 * - Emotional statement banner: "More happy pets. A kinder world."
 * - High-converting coral CTA button + social proof subtitle
 */

const JOURNEY_STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Meet people, pets, services and experiences around you.',
    theme: 'mint',
    bg: '#E8F7F4',
    borderColor: '#CDEAE3',
    numBg: '#CDEAE3',
    numColor: '#075B59',
    image: '/assets/images/why-discover.jpg',
    imageAlt: 'Young woman happily hugging her golden retriever in a sunlit park',
    floatingIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#087C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    tags: [
      {
        label: 'Pet Parents',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#087C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Nearby Pets',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#087C78" aria-hidden="true">
            <path d="M12 11c-1.5 0-2.8 1.2-2.8 2.8 0 1 .5 1.8 1.3 2.3.3.2.7.3 1 .4.2.1.5.1.8.1s.5 0 .8-.1c.4-.1.7-.2 1-.4.8-.5 1.3-1.3 1.3-2.3 0-1.6-1.3-2.8-2.6-2.8z" />
            <circle cx="8.5" cy="8" r="1.5" />
            <circle cx="15.5" cy="8" r="1.5" />
            <circle cx="5.5" cy="11.5" r="1.3" />
            <circle cx="18.5" cy="11.5" r="1.3" />
          </svg>
        ),
      },
      {
        label: 'Local Services',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#087C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ),
      },
    ],
  },
  {
    num: '02',
    title: 'Book',
    desc: 'Get pet care without endless calls, chats and searching.',
    theme: 'peach',
    bg: '#FFF0EC',
    borderColor: '#FCD8CF',
    numBg: '#FCD8CF',
    numColor: '#D94334',
    image: '/assets/images/why-book.jpg',
    imageAlt: 'Smiling happy corgi enjoying being groomed and brushed',
    floatingIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    tags: [
      {
        label: 'Grooming',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" />
            <path d="M8.12 8.12 12 12" />
            <path d="M20 4 8.12 15.88" />
            <circle cx="6" cy="18" r="3" />
            <path d="M14.8 14.8 20 20" />
          </svg>
        ),
      },
      {
        label: 'Vets',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        ),
      },
      {
        label: 'Daycare',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
    ],
  },
  {
    num: '03',
    title: 'Belong',
    desc: 'Become part of a community built around pets.',
    theme: 'mint-blue',
    bg: '#EDF8F6',
    borderColor: '#CCEBE5',
    numBg: '#CCEBE5',
    numColor: '#075B59',
    image: '/assets/images/why-belong.jpg',
    imageAlt: 'Pet owner sitting peacefully beside golden retriever at golden sunset',
    floatingIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF5B4D" stroke="#FF5B4D" strokeWidth="1.5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
    tags: [
      {
        label: 'Events',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#087C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Adoption',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#087C78" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ),
      },
      {
        label: 'Communities',
        icon: (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#087C78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },
];

export function WhySection({ onCtaClick }) {
  return (
    <section className="tc-why-root" id="why" aria-labelledby="why-title">
      {/* Background Decorative Ambient Blobs */}
      <div className="tc-why-blob-mint" aria-hidden="true" />
      <div className="tc-why-blob-coral" aria-hidden="true" />

      <div className="tc-why-container">
        {/* ── Section Intro Grid ───────────────────────────────────────── */}
        <div className="tc-why-intro-grid">
          {/* Small Mint Badge */}
          <div className="tc-why-badge-col">
            <div className="tc-why-badge">
              <svg className="tc-why-badge-heart" width="13" height="13" viewBox="0 0 24 24" fill="#087C78" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>WHY TAIL CIRCLE</span>
            </div>
          </div>

          {/* Handwritten Note (Top Right on Mobile & Desktop) */}
          <div className="tc-why-script-col" aria-hidden="true">
            <div className="tc-why-script-wrap">
              <div className="tc-why-script-note">
                <span className="tc-why-sparkle-dot tc-why-sdot-1">·</span>
                <span className="tc-why-note-line">Happier</span>
                <div className="tc-why-note-mid-row">
                  <span className="tc-why-dash-l">’</span>
                  <span className="tc-why-note-line tc-why-note-pets">Pets</span>
                  <span className="tc-why-dash-r">’</span>
                </div>
                <span className="tc-why-sparkle-dot tc-why-sdot-2">·</span>
                <span className="tc-why-note-line">Happier</span>
                <span className="tc-why-note-line">People</span>
              </div>

              {/* Coral Outline Heart */}
              <svg className="tc-why-coral-heart" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5B4D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>

          {/* Main Headline */}
          <h2 id="why-title" className="tc-why-title">
            <span className="tc-why-title-teal">Your pet has a life.</span>
            <span className="tc-why-title-coral">Not a shopping list.</span>
          </h2>

          {/* Supporting Copy */}
          <p className="tc-why-desc">
            Tail Circle connects everything your pet needs — people, services and experiences — so you can spend less time managing, and more time making memories together.
          </p>

          {/* Pet Visual */}
          <div className="tc-why-hero-photo-wrap" aria-hidden="true">
            <img
              src="/assets/images/why-hero-pets.jpg"
              alt="Happy golden retriever and cute cat together"
              className="tc-why-hero-photo"
              loading="eager"
            />

            {/* Motion Marks Bottom Left */}
            <svg className="tc-why-motion-left" width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="#0A3C3B" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 22c6-1 14-5 18-9" />
              <path d="M2 28c7-1 15-6 20-11" />
              <path d="M7 32c5-2 11-7 15-12" />
            </svg>

            {/* Motion Marks Top Right */}
            <svg className="tc-why-motion-right" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A3C3B" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 18c3-5 9-10 16-12" />
              <path d="M12 23c3-4 8-9 14-10" />
            </svg>
          </div>
        </div>

        {/* ── Three Journey Cards ──────────────────────────────────────── */}
        <div className="tc-why-cards-stack">
          {JOURNEY_STEPS.map((step) => (
            <article
              key={step.num}
              className={`tc-why-card tc-why-card-${step.theme}`}
              style={{
                backgroundColor: step.bg,
                borderColor: step.borderColor,
              }}
            >
              {/* Top Row: Info (Left) + Organic Image with Badge (Right) */}
              <div className="tc-why-card-main">
                <div className="tc-why-card-info">
                  <div className="tc-why-card-header">
                    <span
                      className="tc-why-step-num"
                      style={{ backgroundColor: step.numBg, color: step.numColor }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <h3 className="tc-why-card-title">{step.title}</h3>
                  <p className="tc-why-card-desc">{step.desc}</p>
                </div>

                <div className="tc-why-card-media">
                  <div className="tc-why-media-inner">
                    <img
                      src={step.image}
                      alt={step.imageAlt}
                      className="tc-why-card-img"
                      loading="lazy"
                    />

                    {/* Floating Contextual Icon Badge */}
                    <div className="tc-why-floating-badge" aria-hidden="true">
                      {step.floatingIcon}
                    </div>

                    {/* Decorative Doodles matching reference */}
                    {step.num === '01' && <span className="tc-why-doodle-heart">♡</span>}
                    {step.num === '02' && <span className="tc-why-doodle-sparkle">彡</span>}
                    {step.num === '03' && (
                      <>
                        <span className="tc-why-doodle-heart">♡</span>
                        <span className="tc-why-doodle-sparkle">彡</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Feature Tags */}
              <div className="tc-why-card-tags">
                {step.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="tc-why-tag">
                    <span className="tc-why-tag-icon">{tag.icon}</span>
                    <span>{tag.label}</span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* ── Emotional Quote Banner ───────────────────────────────────── */}
        <div className="tc-why-quote-banner" role="complementary">
          <div className="tc-why-quote-left">
            <div className="tc-why-paw-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF5B4D" aria-hidden="true">
                <path d="M12 10.5c-1.93 0-3.5 1.57-3.5 3.5 0 1.25.68 2.34 1.7 2.94.38.22.84.44 1.3.56.32.08.66.12 1 .12s.68-.04 1-.12c.46-.12.92-.34 1.3-.56 1.02-.6 1.7-1.69 1.7-2.94 0-1.93-1.57-3.5-3.5-3.5z" />
                <ellipse cx="8.5" cy="8" rx="1.6" ry="2.2" />
                <ellipse cx="15.5" cy="8" rx="1.6" ry="2.2" />
                <ellipse cx="5.5" cy="11.5" rx="1.4" ry="1.9" transform="rotate(-20 5.5 11.5)" />
                <ellipse cx="18.5" cy="11.5" rx="1.4" ry="1.9" transform="rotate(20 18.5 11.5)" />
              </svg>
            </div>
            <div className="tc-why-quote-divider" />
            <blockquote className="tc-why-quote-text">
              “More happy pets. A kinder world.”
            </blockquote>
          </div>

          <div className="tc-why-quote-watermark" aria-hidden="true">
            <span className="tc-why-wm-paw">🐾</span>
            <span className="tc-why-wm-sparkle">✦</span>
          </div>
        </div>

        {/* ── Conversion CTA ───────────────────────────────────────────── */}
        <div className="tc-why-cta-wrap">
          <a
            href="#app"
            className="tc-why-cta-btn"
            onClick={(e) => onCtaClick && onCtaClick('Why Section CTA', e)}
          >
            <span>Get Tail Circle on the app</span>
            <span className="tc-why-btn-arrow" aria-hidden="true">→</span>
          </a>
          <p className="tc-why-cta-sub">
            Join thousands of pet parents already on Tail Circle
          </p>
        </div>

        {/* ── Seamless Bottom Transition Curve & Paw ───────────────────── */}
        <div className="tc-why-bottom-wave" aria-hidden="true">
          <span className="tc-why-bottom-paw">🐾</span>
        </div>
      </div>
    </section>
  );
}

export default WhySection;

