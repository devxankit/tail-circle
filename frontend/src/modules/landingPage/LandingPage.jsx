import { useEffect } from 'react';

import './styles/landing-ref.css';
import './styles/video-hero.css';
import './styles/app-section.css';
import './styles/closing-section.css';
import './styles/landing-footer.css';

import { VideoHeroOrbit } from './components/VideoHeroOrbit';
import { AppSection } from './components/AppSection';
import { ClosingSection } from './components/ClosingSection';
import { LandingFooter } from './components/LandingFooter';
import { MobileFloatingCta } from './components/MobileFloatingCta';

export function LandingPage() {
  useEffect(() => {
    document.title = 'Tail Circle — Pet life. Sorted.';

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content =
      "Tail Circle brings your pet's everyday world together — matching, grooming, vets, meals, daycare, boarding, shopping, events and adoption.";

    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 400);
    }
  }, []);

  const trackCta = (label) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'tail_circle_landing_cta',
      label: label,
    });
  };

  const handleCtaClick = (label) => {
    trackCta(label);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleServiceClick = (serviceId) => {
    trackCta(`Service: ${serviceId}`);
    const srvEl = document.getElementById('app');
    if (srvEl) {
      srvEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tc-ref-root" style={{ margin: 0, padding: 0, background: '#FAFAF7' }}>
      <VideoHeroOrbit
        onServiceClick={handleServiceClick}
        onCtaClick={handleCtaClick}
      />
      <main className="page" style={{ padding: 0, width: '100%', maxWidth: '100%', margin: '0 auto', background: '#FAFAF7' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px 0' }}>
          <AppSection onCtaClick={handleCtaClick} />
          <ClosingSection onCtaClick={handleCtaClick} />
        </div>
        <LandingFooter />
      </main>

      <MobileFloatingCta onCtaClick={handleCtaClick} />
    </div>
  );
}

export default LandingPage;
