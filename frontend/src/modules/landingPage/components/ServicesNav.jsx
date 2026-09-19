import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PawPrint } from './PawPrint';

export function ServicesNav() {
  const categories = [
    {
      id: 'vet-care',
      title: 'Vet Care',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="15" rx="3" />
          <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 10v7" />
          <path d="M8.5 13.5h7" />
        </svg>
      ),
    },
    {
      id: 'grooming',
      title: 'Grooming',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: 'shop',
      title: 'Shop',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'meals',
      title: 'Meals',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11h18c0 4.5-3.5 8.5-9 8.5S3 15.5 3 11Z" />
          <ellipse cx="12" cy="10" rx="9" ry="3" />
          <path d="M12 4.5v2" />
          <path d="M8.5 5.5v1" />
          <path d="M15.5 5.5v1" />
        </svg>
      ),
    },
    {
      id: 'match',
      title: 'Match',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          <circle cx="9" cy="10" r="1" fill="#36B4AB" />
          <circle cx="15" cy="10" r="1" fill="#36B4AB" />
          <path d="M10.5 13.5a2.5 2.5 0 0 0 3 0" />
        </svg>
      ),
    },
    {
      id: 'adopt',
      title: 'Adopt',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B4AB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M12 11.5c-1.5-1.5-3.5-0.5-3.5 1.5 0 2 3.5 4.5 3.5 4.5s3.5-2.5 3.5-4.5c0-2-2-3-3.5-1.5z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="services" className="relative w-full bg-white py-8 border-b border-[#F4F7F9]">
      {/* Background Decorative Paw Prints */}
      <PawPrint size={38} color="#36B4AB" opacity={0.12} rotation={20} style={{ position: 'absolute', top: '-10px', left: '12%' }} />
      <PawPrint size={46} color="#FED034" opacity={0.18} rotation={-35} style={{ position: 'absolute', bottom: '8px', right: '8%' }} />

      <div className="lp-container lp-reveal">
        {/* Header Row: Social Icons (Left), Centered Header & Subtitle, Search Icon (Right) */}
        <div className="relative flex items-center justify-between mb-6 pb-2">
          {/* Social Icons (Left) */}
          <div className="flex items-center gap-2">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-7 h-7 rounded-full bg-[#EBF7F6] hover:bg-[#D5EFEA] text-[#36B4AB] flex items-center justify-center transition-all duration-200 no-underline hover:scale-105"
              aria-label="Facebook"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-7 h-7 rounded-full bg-[#EBF7F6] hover:bg-[#D5EFEA] text-[#36B4AB] flex items-center justify-center transition-all duration-200 no-underline hover:scale-105"
              aria-label="Instagram"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>

          {/* Centered Heading */}
          <div className="flex flex-col items-center text-center px-2">
            <span className="font-['Outfit'] font-bold text-[0.7rem] sm:text-[0.74rem] tracking-[0.16em] uppercase text-[#8E9EA9]">
              EXPLORE TAIL CIRCLE
            </span>
            <span className="text-[0.8rem] sm:text-[0.85rem] font-medium text-[#586B7B] mt-0.5 tracking-tight">
              Everything your pet needs, just a tap away.
            </span>
          </div>

          {/* Search Button (Right) */}
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Search Tail Circle"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E9EA9] hover:text-[#36B4AB] hover:bg-[#EBF7F6] transition-all duration-200 cursor-pointer border-0 bg-transparent p-0 hover:scale-105"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Categories Nav Strip */}
        <div className="flex items-center justify-between gap-3 lg:gap-6 overflow-x-auto lp-services-nav-scroll py-2 no-scrollbar">
          {categories.map((cat, idx) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className={`flex items-center gap-2.5 py-2 px-2.5 sm:px-3 rounded-lg group hover:bg-[#F7FAFA] transition-all duration-200 no-underline shrink-0 lp-reveal lp-delay-${idx + 1}`}
            >
              <div className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 shrink-0">
                {cat.icon}
              </div>
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-[0.92rem] lg:text-[0.98rem] text-[#152737] group-hover:text-[#36B4AB] transition-colors whitespace-nowrap">
                {cat.title}
              </span>
              <ChevronRight size={14} className="text-[#8E9EA9] group-hover:text-[#36B4AB] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicesNav;
