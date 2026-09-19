import React from 'react';
import {
  ArrowRight, Sparkles, UserPlus, Compass, Heart,
  CheckCircle2, Search, SlidersHorizontal, MapPin, Camera, ChevronRight, Star, Check
} from 'lucide-react';
import '../styles/how-it-works.css';

/* ────────────────────────────────────────────────────────
   HOW IT WORKS — 3-Step Journey Section
   Exact visual recreation per reference screenshot
   ──────────────────────────────────────────────────────── */

// ─── Paw Decoration ───
function HiwPaw({ className = '', size = 40, color = '#BFEFF0', opacity = 0.10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill={color}
      style={{ opacity }} className={`hiw-paw ${className}`} aria-hidden="true">
      <path d="M24 20C17.5 20 13 24.5 14 31C14.8 36.2 19 40 24 40C29 40 33.2 36.2 34 31C35 24.5 30.5 20 24 20Z" />
      <ellipse cx="11.5" cy="18.5" rx="4.5" ry="6" transform="rotate(-25 11.5 18.5)" />
      <ellipse cx="19.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(-8 19.5 11.5)" />
      <ellipse cx="28.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(8 28.5 11.5)" />
      <ellipse cx="36.5" cy="18.5" rx="4.5" ry="6" transform="rotate(25 36.5 18.5)" />
    </svg>
  );
}

// ─── Step 01: Pet Profile Mockup ───
function PetProfileMockup() {
  return (
    <div className="hiw-mockup hiw-mockup-profile">
      <div className="hiw-profile-card">
        {/* Pet Avatar + Info */}
        <div className="hiw-profile-top">
          <div className="hiw-profile-avatar">
            <img
              src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=200&q=80"
              alt="Golden Retriever Buddy pet profile"
              loading="lazy"
            />
            <div className="hiw-profile-cam">
              <Camera size={10} />
            </div>
          </div>
          <div className="hiw-profile-info">
            <h4>Buddy</h4>
            <span>Golden Retriever · 2y</span>
          </div>
          <button className="hiw-profile-edit" type="button" aria-label="Edit pet profile">Edit</button>
        </div>
        {/* Check Items */}
        <div className="hiw-profile-checks">
          <div className="hiw-profile-check">
            <div className="hiw-profile-check-left">
              <CheckCircle2 size={16} color="#0D9488" />
              <span>Vaccinated & Active</span>
            </div>
            <ChevronRight size={14} color="#C0CDD8" />
          </div>
          <div className="hiw-profile-check">
            <div className="hiw-profile-check-left">
              <CheckCircle2 size={16} color="#0D9488" />
              <span>Lake Norman Local</span>
            </div>
            <ChevronRight size={14} color="#C0CDD8" />
          </div>
        </div>
      </div>
      {/* Bottom Strip */}
      <div className="hiw-profile-bottom">
        <span>Circle Profile Ready</span>
        <Check size={15} />
      </div>
    </div>
  );
}

// ─── Step 02: Discovery Mockup ───
function DiscoveryMockup() {
  const items = [
    {
      icon: '🩺', iconBg: '#DDEEFF', iconColor: '#1B64DA',
      title: 'Happy Tails Clinic',
      meta: '4.9 ★ (320) · 1.2 mi',
    },
    {
      icon: '✂️', iconBg: '#FFEADB', iconColor: '#EA580C',
      title: 'Paws & Co Grooming',
      meta: '4.8 ★ (210) · Available Today',
    },
    {
      icon: '🍲', iconBg: '#FCE5EC', iconColor: '#E11D48',
      title: 'Fresh Meal Delivery',
      meta: '4.9 ★ (189) · Custom Nutrition',
    },
  ];

  return (
    <div className="hiw-mockup hiw-mockup-discovery">
      {/* Search Bar */}
      <div className="hiw-discovery-search">
        <Search size={15} color="#7E92A2" />
        <input
          className="hiw-discovery-search-input"
          type="text"
          placeholder="Search for vets, grooming, food..."
          readOnly
          tabIndex={-1}
          aria-label="Search bar placeholder"
        />
        <div className="hiw-discovery-filter">
          <SlidersHorizontal size={16} />
        </div>
      </div>
      {/* Result Items */}
      <div className="hiw-discovery-items">
        {items.map((item, i) => (
          <div key={i} className="hiw-discovery-item">
            <div className="hiw-discovery-item-icon" style={{ backgroundColor: item.iconBg, color: item.iconColor }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
            </div>
            <div className="hiw-discovery-item-info">
              <h5>{item.title}</h5>
              <span>{item.meta}</span>
            </div>
            <ChevronRight size={16} className="hiw-discovery-item-arrow" />
          </div>
        ))}
      </div>
      {/* Bottom Button */}
      <div className="hiw-discovery-bottom">
        <span>Instant Lake Discovery</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

// ─── Step 03: Together Mockup ───
function TogetherMockup() {
  return (
    <div className="hiw-mockup hiw-mockup-together">
      <div className="hiw-together-image-wrap">
        <img
          src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80"
          alt="Two happy dogs enjoying time together outdoors"
          className="hiw-together-image"
          loading="lazy"
        />
        <div className="hiw-together-badge">
          <MapPin size={12} />
          <span>Lake Norman</span>
        </div>
      </div>
      <div className="hiw-together-bottom">
        <Sparkles size={14} color="#FFC928" />
        <span>Thriving Together</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

// ─── Step Config ───
const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create your circle',
    description: 'Add your pet and tell us about them.',
    numColor: '#F7B91C',
    iconBg: '#FFF6E3',
    iconColor: '#F7B91C',
    Mockup: PetProfileMockup,
  },
  {
    number: '02',
    icon: Compass,
    title: 'Discover what they need',
    description: 'Find care, food, products, activities, friends and more.',
    numColor: '#0D9488',
    iconBg: '#E2F7EF',
    iconColor: '#0D9488',
    Mockup: DiscoveryMockup,
  },
  {
    number: '03',
    icon: Heart,
    title: 'Live life together',
    description: 'Book, shop, connect and be part of the community.',
    numColor: '#E11D48',
    iconBg: '#FDE8EC',
    iconColor: '#E11D48',
    Mockup: TogetherMockup,
  },
];

// ─── Main Section ───
export function HowItWorks() {
  return (
    <section id="how-it-works" className="hiw-section">

      {/* Paw Prints */}
      <HiwPaw className="hiw-paw-tl" size={50} color="#BFEFF0" opacity={0.10} />
      <HiwPaw className="hiw-paw-tr" size={38} color="#FDDEB5" opacity={0.12} />
      <HiwPaw className="hiw-paw-ml" size={44} color="#BFEFF0" opacity={0.07} />
      <HiwPaw className="hiw-paw-br" size={46} color="#FDDEB5" opacity={0.10} />

      {/* Organic BG Blobs */}
      <div className="hiw-blob hiw-blob-tl">
        <svg width="200" height="180" viewBox="0 0 200 180" fill="none" aria-hidden="true">
          <ellipse cx="60" cy="80" rx="120" ry="100" fill="#DDF5EF" opacity="0.25" />
        </svg>
      </div>
      <div className="hiw-blob hiw-blob-tr">
        <svg width="200" height="160" viewBox="0 0 200 160" fill="none" aria-hidden="true">
          <ellipse cx="140" cy="60" rx="100" ry="90" fill="#FFF6E3" opacity="0.3" />
        </svg>
      </div>
      <div className="hiw-blob hiw-blob-bl">
        <svg width="180" height="140" viewBox="0 0 180 140" fill="none" aria-hidden="true">
          <ellipse cx="50" cy="100" rx="110" ry="80" fill="#FFF6E3" opacity="0.2" />
        </svg>
      </div>
      <div className="hiw-blob hiw-blob-br">
        <svg width="200" height="160" viewBox="0 0 200 160" fill="none" aria-hidden="true">
          <ellipse cx="140" cy="100" rx="100" ry="80" fill="#DDF5EF" opacity="0.2" />
        </svg>
      </div>

      <div className="hiw-container">

        {/* ═══════ HEADER ═══════ */}
        <div className="hiw-header">

          {/* Yellow decorative strokes */}
          <svg className="hiw-heading-strokes" width="28" height="32" viewBox="0 0 28 32" fill="none" aria-hidden="true">
            <path d="M6 28L14 4" stroke="#FFC928" strokeWidth="3" strokeLinecap="round" />
            <path d="M14 28L22 4" stroke="#FFC928" strokeWidth="3" strokeLinecap="round" />
            <path d="M2 20L10 8" stroke="#FFC928" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          </svg>



          {/* Eyebrow */}
          <div className="hiw-eyebrow">
            <Sparkles size={13} />
            <span>HOW IT WORKS</span>
          </div>

          {/* Heading */}
          <h2 className="hiw-heading lp-font-heading">
            Your pet's world,{' '}
            <span className="hiw-heading-teal">simplified.</span>
          </h2>

          {/* Description */}
          <p className="hiw-description">
            Get started in just a few simple steps and unlock a happier, healthier life for your pet.
          </p>
        </div>

        {/* ═══════ 3 STEPS ═══════ */}
        <div className="hiw-steps-grid">
          {steps.map((step, i) => {
            const StepIcon = step.icon;
            const StepMockup = step.Mockup;
            return (
              <div key={step.number} className="hiw-step lp-reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                {/* Number + Icon */}
                <div className="hiw-step-num-row">
                  <span className="hiw-step-num" style={{ color: step.numColor }}>{step.number}</span>
                  <div className="hiw-step-icon" style={{ backgroundColor: step.iconBg, color: step.iconColor }}>
                    <StepIcon size={15} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="hiw-step-title">{step.title}</h3>

                {/* Description */}
                <p className="hiw-step-desc">{step.description}</p>

                {/* Visual Mockup Card */}
                <StepMockup />

                {/* Connector Arrow (not on last) */}
                {i < 2 && (
                  <div className={`hiw-arrow hiw-arrow-${i + 1}`}>
                    <ArrowRight size={28} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════ BOTTOM CTA ═══════ */}
        <div className="hiw-bottom-cta">
          <div className="hiw-bottom-eyebrow-wrap">
            <div className="hiw-bottom-line" />
            <span className="hiw-bottom-eyebrow">READY TO JOIN THEIR CIRCLE?</span>
            <div className="hiw-bottom-line" />
          </div>
          <a href="/auth/signup" className="hiw-join-btn">
            <span>JOIN THE CIRCLE</span>
            <ArrowRight size={15} className="hiw-join-btn-arrow" />
          </a>
        </div>

      </div>



    </section>
  );
}

export default HowItWorks;
