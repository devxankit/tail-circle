import React, { useState } from 'react';
import { ArrowRight, Star, MapPin, Navigation, Sparkles } from 'lucide-react';
import { PawDecoration } from './PawDecoration';
import { localBusinesses } from '../data/landingData';

export function LocalDiscovery() {
  const [activeBusiness, setActiveBusiness] = useState(localBusinesses[0]);

  return (
    <section className="relative py-20 sm:py-28 lg:py-36 bg-white overflow-hidden">
      {/* Decorative Paws */}
      <PawDecoration className="top-12 right-12 hidden md:block rotate-12" size={40} opacity={0.1} />
      <PawDecoration className="bottom-14 left-10 hidden lg:block -rotate-30" size={44} opacity={0.1} />

      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Editorial Copy */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <span className="text-xs font-black uppercase tracking-widest text-[#7E92A2] mb-3 lp-font-heading">
              DISCOVER LOCAL BUSINESSES
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#12263A] tracking-tight leading-[1.12] mb-6 lp-font-heading">
              The best pet services, <br />
              <span className="text-[#12263A]">closer to home.</span>
            </h2>

            <p className="text-base sm:text-lg text-[#4A5D6E] font-medium leading-relaxed mb-8">
              Find trusted vets, groomers, pet shops, daycare, boarding, restaurants and more — all in and around Lake Norman.
            </p>

            <a href="#services" className="lp-btn-navy text-decoration-none">
              <span>EXPLORE NEARBY</span>
              <ArrowRight size={16} className="lp-btn-arrow" />
            </a>

            {/* Selected Business Preview Card for Mobile/Detail */}
            {activeBusiness && (
              <div className="mt-8 p-4 rounded-2xl bg-[#FFF8EA] border border-[#FFC928]/30 w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs border border-white">
                    <img
                      src={activeBusiness.avatar}
                      alt={activeBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#12263A]">{activeBusiness.name}</h4>
                    <span className="text-xs text-[#4A5D6E] flex items-center gap-1">
                      <Star size={12} className="text-[#FFC928] fill-[#FFC928]" />
                      <span className="font-bold text-[#12263A]">{activeBusiness.rating}</span>
                      <span>({activeBusiness.reviews}) • {activeBusiness.category}</span>
                    </span>
                    <span className="text-[11px] text-[#7E92A2] block">{activeBusiness.distance}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Stylized Lake Norman Interactive Map Container */}
          <div className="lg:col-span-7 relative">
            
            {/* Organic Stylized Map Card */}
            <div className="relative aspect-16/11 w-full rounded-[44px] bg-[#E8F8F3] overflow-hidden shadow-2xl border-6 border-white p-6">
              
              {/* Lake Water SVG Contours (Lake Norman Stylized Shape) */}
              <svg
                viewBox="0 0 600 400"
                className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                fill="none"
              >
                <path
                  d="M180,20 C220,90 280,110 320,160 C380,230 460,210 520,290 C560,340 500,380 440,390 C360,400 310,340 270,310 C210,260 170,300 120,270 C80,240 100,160 140,120 C180,80 150,40 180,20 Z"
                  fill="#BFEFF0"
                />
                <path
                  d="M340,60 C370,100 410,120 440,150 C480,190 460,240 430,260 C390,280 360,250 340,220 C320,180 310,130 340,60 Z"
                  fill="#DDEEFF"
                  opacity="0.8"
                />
              </svg>

              {/* Waterway Label */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0D9488]/40 font-black text-xl tracking-widest uppercase select-none pointer-events-none lp-font-heading">
                Lake Norman
              </div>

              {/* Interactive Pins on Map */}
              {localBusinesses.map((biz) => {
                const isSelected = activeBusiness?.id === biz.id;
                return (
                  <div
                    key={biz.id}
                    onClick={() => setActiveBusiness(biz)}
                    className="absolute cursor-pointer transition-transform duration-300 hover:scale-110 z-20 group"
                    style={{ top: biz.lat, left: biz.lng }}
                  >
                    {/* Radar Pulse Effect */}
                    <div className="absolute -inset-2 rounded-full bg-[#12263A]/20 lp-pin-radar pointer-events-none" />

                    {/* Pin Avatar Button */}
                    <div
                      className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full border-3 shadow-xl overflow-hidden bg-white flex items-center justify-center transition-all ${
                        isSelected ? 'border-[#FFC928] scale-110 ring-4 ring-[#FFC928]/40' : 'border-white'
                      }`}
                    >
                      <img
                        src={biz.avatar}
                        alt={biz.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Hover Pin Label */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#12263A] text-white px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                      {biz.name} ({biz.rating} ★)
                    </div>
                  </div>
                );
              })}

              {/* Floating Featured Business Card Over Map */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-xl max-w-xs border border-black/5 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs shrink-0">
                    <img
                      src={activeBusiness.avatar}
                      alt={activeBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider block">
                      {activeBusiness.category}
                    </span>
                    <h4 className="font-extrabold text-sm text-[#12263A] leading-tight">
                      {activeBusiness.name}
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={12} className="text-[#FFC928] fill-[#FFC928]" />
                      <span className="text-xs font-bold text-[#12263A]">{activeBusiness.rating}</span>
                      <span className="text-[10px] text-[#7E92A2]">{activeBusiness.distance}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
