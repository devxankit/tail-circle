import React from 'react';
import { PawPrint } from './PawPrint';

export function FactsSection() {
  const features = [
    {
      id: 1,
      title: 'Care they can count on',
      description: 'Find trusted vets, grooming, and daycare services for the care they deserve.',
      badgeBg: '#EBF7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="15" rx="3" />
          <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 10v7" />
          <path d="M8.5 13.5h7" />
        </svg>
      ),
      hasMintBlob: false,
    },
    {
      id: 2,
      title: 'Shop for them',
      description: 'Discover products made for your pet, with shopping tailored to their breed and needs.',
      badgeBg: '#FFF4E8',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F57C00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      hasMintBlob: false,
    },
    {
      id: 3,
      title: 'Meals they’ll love',
      description: 'Explore meals and food options made to fit your pet’s everyday needs.',
      badgeBg: '#E8F4FD',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3CA5EC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11h18c0 4.5-3.5 8.5-9 8.5S3 15.5 3 11Z" />
          <ellipse cx="12" cy="10" rx="9" ry="3" />
          <path d="M12 4.5v2" />
          <path d="M8.5 5.5v1" />
          <path d="M15.5 5.5v1" />
        </svg>
      ),
      hasMintBlob: false,
    },
    {
      id: 4,
      title: 'Find their circle',
      description: 'Discover compatible furry friends and make new connections through Tail Circle.',
      badgeBg: '#FDEEF3',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ED4C78" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="15" r="4" />
          <circle cx="6" cy="10" r="2.2" />
          <circle cx="18" cy="10" r="2.2" />
          <circle cx="9" cy="5" r="2.2" />
          <circle cx="15" cy="5" r="2.2" />
        </svg>
      ),
      hasMintBlob: false,
    },
    {
      id: 5,
      title: 'More to explore',
      description: 'Find pet-friendly events, activities, and experiences worth sharing.',
      badgeBg: '#F3EDFF',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C4DFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          <circle cx="19" cy="5" r="1.5" />
          <circle cx="5" cy="19" r="1.5" />
        </svg>
      ),
      hasMintBlob: false,
    },
    {
      id: 6,
      title: 'A community that gets it',
      description: 'Connect with pet parents, share moments, discover ideas, and be part of a community that cares.',
      badgeBg: '#EAF8F1',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <circle cx="12" cy="11" r="1.5" fill="#2E7D32" />
        </svg>
      ),
      hasMintBlob: true, // Pale organic mint shape behind item #6
    },
  ];

  return (
    <section id="why-tail-circle" className="relative w-full bg-white py-12 lg:py-16 overflow-hidden">
      {/* Subtle Background Decorative Paw Prints */}
      <PawPrint size={40} color="#42BDB5" opacity={0.1} rotation={12} style={{ position: 'absolute', top: '10%', left: '4%' }} />
      <PawPrint size={50} color="#FED034" opacity={0.15} rotation={-25} style={{ position: 'absolute', bottom: '8%', right: '5%' }} />
      <PawPrint size={34} color="#3CA5EC" opacity={0.08} rotation={35} style={{ position: 'absolute', top: '40%', right: '3%' }} />

      <div className="lp-container relative z-10">
        {/* Centered Heading */}
        <div className="text-center max-w-[680px] mx-auto mb-10 lg:mb-12 lp-reveal">
          <span className="lp-eyebrow text-[#8E9EA9] text-[0.74rem] sm:text-[0.78rem] tracking-[0.18em] mb-2">
            WHY TAIL CIRCLE
          </span>
          <h2 className="font-['Outfit'] font-extrabold text-2xl sm:text-3xl lg:text-[2.4rem] text-[#152737] leading-[1.18] mb-3 tracking-tight">
            Your pet’s whole world,<br />
            in one place.
          </h2>
          <p className="font-['Plus_Jakarta_Sans'] text-[#586B7B] text-[0.92rem] sm:text-[0.98rem] max-w-[560px] mx-auto leading-relaxed">
            From everyday care to new adventures and connections, Tail Circle makes life with your pet simpler, happier, and more connected.
          </p>
        </div>

        {/* 3x2 Grid (Compact, well-spaced, perfectly fitting) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 lg:gap-y-10 lp-facts-grid">
          {features.map((item, idx) => (
            <div
              key={item.id}
              className={`relative flex flex-col items-center text-center p-4 sm:p-5 rounded-xl lp-fact-card group cursor-default lp-reveal lp-delay-${idx + 1} ${
                item.hasMintBlob ? 'z-10' : ''
              }`}
            >
              {/* Special Mint Blob for Card #6 */}
              {item.hasMintBlob && (
                <div className="lp-fact-mint-blob pointer-events-none" />
              )}

              {/* Icon in Styled Badge */}
              <div
                className="relative z-10 lp-fact-icon-badge mb-3.5"
                style={{ backgroundColor: item.badgeBg }}
              >
                {item.icon}
              </div>

              {/* Title */}
              <h3 className="relative z-10 font-['Outfit'] font-bold text-[1.05rem] sm:text-[1.12rem] text-[#152737] group-hover:text-[#36B4AB] transition-colors duration-300 mb-1.5 leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="relative z-10 font-['Plus_Jakarta_Sans'] text-[0.84rem] sm:text-[0.88rem] leading-relaxed text-[#586B7B] max-w-[290px]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FactsSection;
