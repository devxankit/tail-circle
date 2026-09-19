import React from 'react';
import { ArrowRight, HeartHandshake, Home, Sparkles } from 'lucide-react';
import { PawDecoration } from './PawDecoration';

export function MatchAdoption() {
  return (
    <section className="relative py-20 sm:py-28 bg-[#FAF9F6] overflow-hidden">
      {/* Decorative Paws */}
      <PawDecoration className="top-10 left-10 hidden md:block rotate-12" size={36} opacity={0.08} />
      <PawDecoration className="bottom-10 right-10 hidden md:block -rotate-24" size={40} opacity={0.08} />

      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          
          {/* Left Panel: Match Section */}
          <div className="relative rounded-[40px] bg-[#FFF8EA] p-8 sm:p-10 border-4 border-white shadow-xl flex flex-col justify-between overflow-hidden group hover:shadow-2xl transition-all duration-300">
            {/* Top Eyebrow & Content */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#D97706] mb-3 block lp-font-heading">
                MEET NEW FRIENDS
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#12263A] tracking-tight mb-3 lp-font-heading">
                Find their circle.
              </h3>
              <p className="text-sm sm:text-base text-[#4A5D6E] font-medium leading-relaxed mb-6 max-w-sm">
                Connect with compatible pets and make new furry friends for lakeside playdates and social pack walks.
              </p>
              <a href="/auth/signup" className="lp-btn-navy text-decoration-none inline-flex mb-8">
                <span>FIND A MATCH</span>
                <ArrowRight size={15} className="lp-btn-arrow" />
              </a>
            </div>

            {/* Bottom Image: Two Friendly Dogs Meeting Nose to Nose */}
            <div className="relative aspect-16/10 w-full rounded-3xl overflow-hidden shadow-md border-3 border-white bg-white">
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80"
                alt="Two friendly dogs meeting and greeting nose to nose"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-[#12263A] flex items-center gap-1.5 shadow-xs">
                <HeartHandshake size={14} className="text-[#FFC928]" />
                <span>Lake Norman Matches</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Adoption Section */}
          <div className="relative rounded-[40px] bg-[#DDF4EC] p-8 sm:p-10 border-4 border-white shadow-xl flex flex-col justify-between overflow-hidden group hover:shadow-2xl transition-all duration-300">
            
            {/* Whimsical Handwritten Script */}
            <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20 transform rotate-6 select-none pointer-events-none hidden sm:block">
              <span className="lp-font-handwriting text-2xl sm:text-3xl font-bold text-[#12263A] leading-tight block text-right drop-shadow-sm">
                Adopt Love,
                <br />
                Change a Life ♡
              </span>
            </div>

            {/* Top Eyebrow & Content */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#0D9488] mb-3 block lp-font-heading">
                ADOPTION
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#12263A] tracking-tight mb-3 lp-font-heading">
                Every pet deserves a home.
              </h3>
              <p className="text-sm sm:text-base text-[#4A5D6E] font-medium leading-relaxed mb-6 max-w-sm">
                Discover pets looking for their forever family and connect with verified local rescue shelters.
              </p>
              <a href="/app/adopt" className="lp-btn-navy text-decoration-none inline-flex mb-8">
                <span>EXPLORE ADOPTION</span>
                <ArrowRight size={15} className="lp-btn-arrow" />
              </a>
            </div>

            {/* Bottom Image: Adorable Rescue Pet */}
            <div className="relative aspect-16/10 w-full rounded-3xl overflow-hidden shadow-md border-3 border-white bg-white">
              <img
                src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80"
                alt="Sweet rescue pet looking for a forever home"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-[#0D9488] flex items-center gap-1.5 shadow-xs">
                <Home size={14} className="text-[#0D9488]" />
                <span>Ready for Adoption</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
