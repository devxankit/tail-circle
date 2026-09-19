import { useState, useEffect } from 'react';
import '../styles/services-section.css';

/**
 * ServicesSection — TailCircle Premium Ecosystem Showcase
 *
 * Clean, modern, editorial pet-tech UI adhering strictly to:
 * - Controlled TailCircle palette (deep dark teal, soft mint, primary coral, warm off-white #FAFAF7)
 * - Centered compact badge and balanced headline
 * - Clean segmented 2x2 filter pills without text wrapping
 * - Simplified, premium Match & Meet feature card with clear hierarchy
 * - Compact 2-column secondary cards without oversized cards or visual noise
 * - Generous bottom padding clearing the sticky mobile CTA
 */

const CATEGORIES = [
  { id: 'all', label: 'All Services', count: 9 },
  { id: 'care', label: 'Care & Wellness', count: 3 },
  { id: 'social', label: 'Social & Stays', count: 3 },
  { id: 'lifestyle', label: 'Food, Shop & Adopt', count: 3 },
];

const SERVICES = [
  {
    id: 'match',
    category: 'social',
    title: 'Match & Meet',
    tagline: 'Furry Playdates',
    desc: 'Compatible pet friends based on personality, breed and play style.',
    longDesc: 'Find compatible pet playmates in your neighborhood. Filter by play style, energy level, breed size and vaccination status. Chat with pet parents, schedule park playdates, and build a lasting pack.',
    badge: 'POPULAR',
    stats: '300+ Active Pets Nearby',
    rating: '4.9 ★ (850+ Meetups)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
    perks: ['Verified pet parent profiles', 'Personality compatibility score', 'Safe public park recommendations'],
  },
  {
    id: 'grooming',
    category: 'care',
    title: 'Grooming',
    tagline: 'Spa & Styling',
    desc: 'Certified local salons, mobile vans and gentle home groomers.',
    longDesc: 'Pamper your pet with top-rated local groomers. From gentle baths and de-shedding to breed-specific styling and mobile van appointments right at your doorstep.',
    badge: 'SPA CARE',
    stats: '24 Verified Salons & Vans',
    rating: '4.8 ★ (1,420+ Bookings)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </svg>
    ),
    perks: ['Cage-free gentle handling', 'Organic coats & sensitive skin treatments', 'Real-time booking confirmations'],
  },
  {
    id: 'vets',
    category: 'care',
    title: 'Vets',
    tagline: 'Clinical & Urgent',
    desc: 'Routine wellness exams, licensed care and urgent triage.',
    longDesc: 'Connect with certified clinics and 24/7 emergency veterinary professionals. Book annual vaccines, schedule microchipping, or start an instant tele-triage video consult.',
    badge: 'VERIFIED',
    stats: '18 Clinics & Tele-vets',
    rating: '4.9 ★ (2,100+ Consults)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
    perks: ['Digital health records & vaccination vault', '24/7 triage chat line', 'Licensed clinic verified badges'],
  },
  {
    id: 'daycare',
    category: 'care',
    title: 'Daycare',
    tagline: 'Supervised Play',
    desc: 'Cage-free play, camera access and dedicated attention.',
    longDesc: 'Safe, engaging daycare centers where your dog can socialize and exercise under expert supervision. Check in anytime via live camera streaming and receive daily report cards.',
    badge: 'CAGE-FREE',
    stats: '12 Facilities & Host Yards',
    rating: '4.8 ★ (980+ Days)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    perks: ['Live HD camera access for parents', 'Temperament testing before entry', 'Daily photos and activity reports'],
  },
  {
    id: 'boarding',
    category: 'social',
    title: 'Boarding',
    tagline: 'Overnight Stays',
    desc: 'Cozy suites and loving host homes when you travel.',
    longDesc: 'Leave town with complete peace of mind. Book warm family host homes or luxury pet hotel suites. All hosts are background-checked and covered by the Tail Circle guarantee.',
    badge: 'VETTED HOSTS',
    stats: '45+ Background-Checked Hosts',
    rating: '4.9 ★ (1,650+ Nights)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 0 1 2 2v10" />
        <path d="M2 17h20" />
        <path d="M6 8v9" />
      </svg>
    ),
    perks: ['24/7 host emergency support', 'Free photo & video updates daily', 'Tail Circle safety & care guarantee'],
  },
  {
    id: 'meals',
    category: 'lifestyle',
    title: 'Fresh Meals',
    tagline: 'Chef Formulated',
    desc: 'Human-grade nutrition cooked locally in small batches.',
    longDesc: 'Nutritionally balanced, vet-approved meals cooked from fresh, whole ingredients. Tailored portion sizes delivered fresh to your door on a flexible weekly subscription.',
    badge: 'HUMAN-GRADE',
    stats: '100% Real Food Ingredients',
    rating: '4.9 ★ (3,400+ Meals Served)',
    accent: '#F45B4B',
    tileBg: '#FFF0ED',
    tileBorder: '#FCD5CE',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    perks: ['Zero fillers, preservatives or mystery meat', 'Custom calorie & allergy tailoring', 'Pause, skip or cancel anytime'],
  },
  {
    id: 'shop',
    category: 'lifestyle',
    title: 'Shop',
    tagline: 'Curated Essentials',
    desc: 'Tested durable toys, secure harnesses and organic treats.',
    longDesc: 'Skip the endless scrolling through cheap imports. Every collar, harness, chew toy and training treat in our store is safety-tested by real pet parents and veterinary nutritionists.',
    badge: 'CURATED',
    stats: '500+ Tested Products',
    rating: '4.8 ★ (5,200+ Reviews)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    perks: ['Ultra-fast local delivery available', 'Non-toxic, chew-tested durability', '30-day no-hassle return policy'],
  },
  {
    id: 'events',
    category: 'social',
    title: 'Events',
    tagline: 'Meetups & Agility',
    desc: 'Dog park meetups, puppy socials and breed festivals.',
    longDesc: 'Discover what is happening in your local pet community. Join weekend agility courses, puppy socialization circles, fundraising walks, and breed-specific tail-wagging festivals.',
    badge: 'COMMUNITY',
    stats: '8 Local Events This Month',
    rating: '4.9 ★ (740+ Attendees)',
    accent: '#085F5A',
    tileBg: '#EBF7F4',
    tileBorder: '#C4EAE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    perks: ['RSVP with your pet’s profile', 'Meet verified local owners', 'Pet-friendly venue confirmation'],
  },
  {
    id: 'adopt',
    category: 'lifestyle',
    title: 'Adopt',
    tagline: 'Forever Homes',
    desc: 'Direct ethical rescue matching with loving companions.',
    longDesc: 'Find your next family member. Browse verified profiles of rescue dogs and cats from certified ethical shelters and foster networks. Complete digital adoption applications seamlessly.',
    badge: 'RESCUE FIRST',
    stats: '60+ Animals Ready for Homes',
    rating: '5.0 ★ (420+ Happy Adoptions)',
    accent: '#F45B4B',
    tileBg: '#FFF0ED',
    tileBorder: '#FCD5CE',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    perks: ['100% verified non-profit shelters', 'Detailed temperament & medical history', 'Post-adoption guidance and support'],
  },
];

export function ServicesSection({ onServiceClick }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedService, setSelectedService] = useState(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedService(null);
    };
    if (selectedService) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedService]);

  const filteredServices = activeCategory === 'all'
    ? SERVICES
    : SERVICES.filter((s) => s.category === activeCategory);

  const featuredService = SERVICES.find((s) => s.id === 'match');
  const showFeaturedHero = (activeCategory === 'all' || activeCategory === 'social') && featuredService;
  const gridServices = showFeaturedHero
    ? filteredServices.filter((s) => s.id !== 'match')
    : filteredServices;

  const handleCardClick = (service) => {
    setSelectedService(service);
    if (onServiceClick) {
      onServiceClick(service.id);
    }
  };

  return (
    <section
      id="services"
      className="tc-services-root"
      aria-labelledby="services-title"
    >
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="tc-services-header">
        <div className="tc-services-eyebrow">
          <span className="tc-badge-pulse" aria-hidden="true">
            <span className="tc-badge-pulse-ring" />
            <span className="tc-badge-pulse-core" />
          </span>
          <span>ALL-IN-ONE PET ECOSYSTEM</span>
        </div>

        <h2 id="services-title" className="tc-services-title">
          <span className="tc-title-lead">One place.</span>
          <span className="tc-title-coral">Every tail.</span>
        </h2>

        <p className="tc-services-subtitle">
          Stop jumping between WhatsApp, Google, Instagram and five different apps. Tail Circle brings your pet's world into one simple place.
        </p>
      </div>

      {/* ── Interactive Category Filters (2x2 on mobile, clean segmented) ── */}
      <div className="tc-category-grid" role="tablist" aria-label="Service categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`tc-category-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="tc-pill-label">{cat.label}</span>
            <span className="tc-pill-count">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* ── Feature Card (Match & Meet) ─────────────────────────────────── */}
      {showFeaturedHero && (
        <div
          className="tc-feature-card"
          onClick={() => handleCardClick(featuredService)}
          role="button"
          tabIndex={0}
          aria-label={`Explore flagship ${featuredService.title}`}
        >
          <div className="tc-fc-header">
            <div className="tc-fc-icon" aria-hidden="true">
              {featuredService.icon}
            </div>
            <div className="tc-fc-text">
              <span className="tc-fc-pill">MOST POPULAR</span>
              <span className="tc-fc-subtitle">300+ Active Pets Nearby</span>
              <h3 className="tc-fc-title">{featuredService.title}</h3>
              <p className="tc-fc-desc">
                {featuredService.tagline} • {featuredService.desc}
              </p>
            </div>
          </div>

          <div className="tc-fc-bottom">
            <div className="tc-fc-avatars" aria-hidden="true">
              <span className="tc-fc-avatar" title="Buddy">🐕</span>
              <span className="tc-fc-avatar" title="Luna">🐩</span>
              <span className="tc-fc-avatar" title="Milo">🦮</span>
              <span className="tc-fc-count">+280</span>
            </div>

            <button
              type="button"
              className="tc-fc-button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(featuredService);
              }}
            >
              <span>Explore Playmates</span>
              <span className="tc-fc-btn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Secondary Service Cards Grid (2 cols mobile, 4 cols desktop) ─── */}
      <div className="tc-services-grid">
        {gridServices.map((srv) => (
          <article
            key={srv.id}
            className="tc-service-card"
            onClick={() => handleCardClick(srv)}
            style={{
              '--card-accent': srv.accent,
              '--card-tile-bg': srv.tileBg,
              '--card-tile-border': srv.tileBorder,
            }}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${srv.title}`}
          >
            {/* Top row: Icon tile & subtle badge */}
            <div className="tc-card-top">
              <div
                className="tc-service-icon-tile"
                style={{ backgroundColor: srv.tileBg, color: srv.accent }}
                aria-hidden="true"
              >
                {srv.icon}
              </div>
              <span className="tc-service-badge">
                {srv.badge}
              </span>
            </div>

            {/* Content */}
            <div className="tc-card-body">
              <h3 className="tc-service-name">{srv.title}</h3>
              <p className="tc-service-desc">{srv.desc}</p>
            </div>

            {/* Bottom row: Explore link */}
            <div className="tc-card-footer">
              <span className="tc-explore-link">
                <span>Explore</span>
                <span className="tc-card-arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* ── Bottom Conversion Banner ───────────────────────────────────── */}
      <div className="tc-services-banner">
        <div className="tc-banner-content">
          <div className="tc-banner-badge">ALL-IN-ONE CONVENIENCE</div>
          <h3 className="tc-banner-title">Ready to simplify your pet parent journey?</h3>
          <p className="tc-banner-desc">
            Explore Tail Circle in the app. Browse vetted sitters, track vaccinations, order fresh bowls and meet local playdates.
          </p>
        </div>
        <a
          href="#app"
          className="tc-banner-cta"
          onClick={(e) => onServiceClick && onServiceClick('app-banner', e)}
        >
          <span>Get the App</span>
          <span className="tc-banner-arrow" aria-hidden="true">→</span>
        </a>
      </div>

      {/* ── Interactive Service Details Modal / Sheet ─────────────────── */}
      {selectedService && (
        <div
          className="tc-service-modal-backdrop"
          onClick={() => setSelectedService(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-service-title"
        >
          <div
            className="tc-service-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tc-modal-header">
              <div className="tc-modal-header-left">
                <div
                  className="tc-modal-icon-tile"
                  style={{
                    backgroundColor: selectedService.tileBg,
                    color: selectedService.accent,
                  }}
                >
                  {selectedService.icon}
                </div>
                <div>
                  <span
                    className="tc-modal-badge"
                    style={{
                      backgroundColor: selectedService.tileBg,
                      color: selectedService.accent,
                    }}
                  >
                    {selectedService.badge}
                  </span>
                  <h3 id="modal-service-title" className="tc-modal-title">
                    {selectedService.title}
                  </h3>
                  <p className="tc-modal-subtitle">
                    {selectedService.tagline} • {selectedService.rating}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="tc-modal-close-btn"
                onClick={() => setSelectedService(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="tc-modal-body">
              <p className="tc-modal-desc">{selectedService.longDesc}</p>

              <div className="tc-modal-perks-title">What pet parents love:</div>
              <ul className="tc-modal-perks-list">
                {selectedService.perks.map((perk, idx) => (
                  <li key={idx} className="tc-modal-perk-item">
                    <span className="tc-perk-check">✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="tc-modal-stats-box">
                <span className="tc-stats-dot" />
                <span>{selectedService.stats}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="tc-modal-footer">
              <a
                href="#app"
                className="tc-modal-cta-primary"
                onClick={() => {
                  setSelectedService(null);
                  if (onServiceClick) onServiceClick(`modal-cta-${selectedService.id}`);
                }}
              >
                <span>Get on Tail Circle App</span>
                <span aria-hidden="true">→</span>
              </a>
              <button
                type="button"
                className="tc-modal-cta-secondary"
                onClick={() => setSelectedService(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ServicesSection;
