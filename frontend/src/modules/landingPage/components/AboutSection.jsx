import React, { useState } from 'react';
import { ArrowRight, Play, Star, ShieldCheck, Heart, Sparkles, Stethoscope, Users, MapPin } from 'lucide-react';
import { VideoModal } from './VideoModal';
import '../styles/about-section.css';

/* ────────────────────────────────────────────────────────
   ABOUT TAIL CIRCLE — Premium Editorial Section
   Exact visual recreation per reference screenshot
   ──────────────────────────────────────────────────────── */

// ─── Reusable Sub-Components ───

function PlayBadge({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="about-play-badge"
      aria-label="Play video: See how Tail Circle works"
      type="button"
    >
      {/* Play icon circle */}
      <div className="about-play-icon-wrap">
        <div className="about-play-icon-ping" />
        <Play size={14} className="about-play-triangle" />
      </div>
      <span className="about-play-label">
        Play the movie<br />
        <span className="about-play-sub">and see how we work!</span>
      </span>
    </button>
  );
}

function PetsCommunityBadge() {
  return (
    <div className="about-pets-badge">
      <span className="lp-font-handwriting about-pets-badge-text">
        Pets<br />People<br />Community<br />
        <span className="about-pets-heart">♡</span>
      </span>
    </div>
  );
}

function ReviewBadge() {
  return (
    <div className="about-review-badge">
      <div className="about-review-avatars">
        <img
          className="about-review-avatar"
          src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=100&q=80"
          alt="Happy golden retriever"
        />
        <img
          className="about-review-avatar"
          src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=100&q=80"
          alt="Cute puppy"
        />
        <img
          className="about-review-avatar"
          src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=100&q=80"
          alt="Tabby cat"
        />
      </div>
      <div className="about-review-info">
        <div className="about-review-stars-row">
          <div className="about-review-stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={11} fill="#FFC928" stroke="#FFC928" />
            ))}
          </div>
          <span className="about-review-score">4.9/5</span>
        </div>
        <span className="about-review-count">2,400+ Lake Norman Pets</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, iconBg, iconColor, title, description, delay }) {
  return (
    <div className={`about-feature-card lp-reveal lp-delay-${delay}`}>
      <div className="about-feature-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
        <Icon size={18} />
      </div>
      <h4 className="about-feature-title">{title}</h4>
      <p className="about-feature-desc">{description}</p>
    </div>
  );
}

function StatItem({ icon: Icon, value, label }) {
  return (
    <div className="about-stat-item">
      <div className="about-stat-icon-wrap">
        <Icon size={16} />
      </div>
      <div className="about-stat-text">
        <span className="about-stat-value">{value}</span>
        <span className="about-stat-label">{label}</span>
      </div>
    </div>
  );
}

// ─── Decorative SVG Paw Print ───
function PawPrintDeco({ className = '', size = 40, color = '#0D9488', opacity = 0.12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill={color}
      style={{ opacity }}
      className={`pointer-events-none select-none absolute ${className}`}
      aria-hidden="true"
    >
      <path d="M24 20C17.5 20 13 24.5 14 31C14.8 36.2 19 40 24 40C29 40 33.2 36.2 34 31C35 24.5 30.5 20 24 20Z" />
      <ellipse cx="11.5" cy="18.5" rx="4.5" ry="6" transform="rotate(-25 11.5 18.5)" />
      <ellipse cx="19.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(-8 19.5 11.5)" />
      <ellipse cx="28.5" cy="11.5" rx="4.5" ry="6.5" transform="rotate(8 28.5 11.5)" />
      <ellipse cx="36.5" cy="18.5" rx="4.5" ry="6" transform="rotate(25 36.5 18.5)" />
    </svg>
  );
}

// ─── Main Component ───

export function AboutSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <section id="about" className="about-section">
      
      {/* ─── Background Elements ─── */}
      <div className="about-bg-mint-glow" />
      <div className="about-bg-cream-glow" />
      
      {/* Subtle paw prints */}
      <PawPrintDeco className="about-paw-1" size={52} color="#0D9488" opacity={0.08} />
      <PawPrintDeco className="about-paw-2" size={44} color="#0D9488" opacity={0.06} />
      <PawPrintDeco className="about-paw-3" size={38} color="#FFC928" opacity={0.10} />

      {/* ─── Main Grid Container ─── */}
      <div className="about-container">
        <div className="about-grid">

          {/* ════════ LEFT COLUMN: Image Composition ════════ */}
          <div className="about-visual-col lp-reveal-left">



            {/* ─── Main Image Circle ─── */}
            <div className="about-image-wrap">
              
              {/* Outer Mint Ring */}
              <div className="about-image-outer-ring">
                {/* White Inner Ring */}
                <div className="about-image-inner-ring">
                  {/* Dog Photo */}
                  <img
                    src="/assets/images/about-border-collie.jpg"
                    alt="Joyful black and white Border Collie with a happy expression, facing the camera on an aqua background"
                    className="about-image-photo"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>
              </div>

              {/* Play Badge — top-left overlapping */}
              <PlayBadge onClick={() => setIsVideoOpen(true)} />

              {/* "Pets People Community" Badge — right side */}
              <PetsCommunityBadge />

              {/* Review Badge — bottom-left */}
              <ReviewBadge />
            </div>


          </div>

          {/* ════════ RIGHT COLUMN: Content ════════ */}
          <div className="about-content-col lp-reveal-right">

            {/* Eyebrow Badge */}
            <div className="about-eyebrow">
              <Sparkles size={13} />
              <span>ABOUT TAIL CIRCLE</span>
            </div>

            {/* Main Heading */}
            <h2 className="about-heading lp-font-heading">
              More than a pet app.<br />
              <span className="about-heading-teal">It's their whole world.</span>
            </h2>

            {/* Body Paragraphs */}
            <p className="about-body-p1">
              Tail Circle brings everything your pet needs into one place — from
              everyday care and shopping to meals, new furry friends, adoption,
              and a community that cares.
            </p>
            <p className="about-body-p2">
              Because being a pet parent is more than taking care of them.
              It's sharing a life with them.
            </p>

            {/* 3 Feature Cards */}
            <div className="about-features-grid">
              <FeatureCard
                icon={Stethoscope}
                iconBg="#E6F8F3"
                iconColor="#0D9488"
                title="All-In-One Hub"
                description="Vets, boutique grooming & meals in one spot."
                delay={1}
              />
              <FeatureCard
                icon={ShieldCheck}
                iconBg="#FFF5E0"
                iconColor="#D97706"
                title="100% Local Focus"
                description="Trusted Lake Norman pet professionals."
                delay={2}
              />
              <FeatureCard
                icon={Heart}
                iconBg="#EBF0FF"
                iconColor="#4F46E5"
                title="Furry Community"
                description="Local playdates, meetups & loving rescue adoptions."
                delay={3}
              />
            </div>

            {/* CTA Buttons */}
            <div className="about-cta-row">
              <a href="#services" className="about-btn-primary">
                <span>DISCOVER TAIL CIRCLE</span>
                <ArrowRight size={15} className="about-btn-arrow" />
              </a>
              <a href="#how-it-works" className="about-btn-secondary">
                <span>HOW IT WORKS</span>
                <ArrowRight size={15} className="about-btn-arrow" />
              </a>
            </div>

            {/* Stats Row */}
            <div className="about-stats-row">
              <StatItem icon={Users} value="2,400+" label="Local Pet Parents" />
              <StatItem icon={Heart} value="150+" label="Trusted Providers" />
              <StatItem icon={MapPin} value="Lake Norman" label="Our Home" />
            </div>

          </div>
        </div>
      </div>

      {/* ─── Bottom Organic Cream Wave ─── */}
      <div className="about-bottom-wave">
        <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" className="about-wave-svg">
          <path
            d="M0,120 L0,90 C180,40 360,20 540,45 C720,70 900,100 1080,80 C1200,66 1320,50 1440,60 L1440,120 Z"
            fill="#FFF3D0"
            opacity="0.45"
          />
          <path
            d="M0,120 L0,100 C200,60 400,50 600,70 C800,90 1000,95 1200,80 C1340,70 1400,65 1440,68 L1440,120 Z"
            fill="#FFEAA7"
            opacity="0.25"
          />
        </svg>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoTitle="See How Tail Circle Works"
      />
    </section>
  );
}

export default AboutSection;
