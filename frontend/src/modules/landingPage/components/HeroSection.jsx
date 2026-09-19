import React from 'react';

export function HeroSection({ onCtaClick }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="pill">◧ &nbsp; BUILT FOR PET PARENTS</div>
      <h1 id="hero-title">
        Pet life.<br />
        <span className="coral">Sorted.</span>
      </h1>
      <p className="lead">
        Everything your pet needs — from finding their perfect match to grooming, vets, meals, daycare, boarding, shopping, events and adoption.
      </p>

      <div className="buttons">
        <a
          className="btn primary"
          href="#services"
          onClick={(e) => onCtaClick && onCtaClick('See what Tail Circle does', e)}
        >
          See what Tail Circle does&nbsp; →
        </a>
        <a
          className="btn coral"
          href="#app"
          onClick={(e) => onCtaClick && onCtaClick('Get the app', e)}
        >
          Get the app
        </a>
      </div>

      <div className="feature-strip" aria-label="Tail Circle highlights">
        <div className="feature-col">
          <div className="feature">✦ &nbsp; Find a match</div>
          <div className="feature">♧ &nbsp; Vet when needed</div>
        </div>
        <div className="feature-center" aria-hidden="true">
          <span className="phone">▯</span>
        </div>
        <div className="feature-col right">
          <div className="feature">♡ &nbsp; Book grooming</div>
          <div className="feature">▢ &nbsp; Shop essentials</div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
