import React from 'react';
import { partnerLogos } from '../data/landingData';

export function TrustSection() {
  return (
    <section className="relative py-14 sm:py-18 bg-white border-y border-black/5">
      <div className="lp-container text-center">
        
        <span className="text-xs font-black uppercase tracking-widest text-[#7E92A2] mb-2 block lp-font-heading">
          TRUSTED BY
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-[#12263A] tracking-tight mb-8 lp-font-heading">
          Local businesses. Real impact.
        </h3>

        {/* Partners Logo Bar */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16 opacity-70 hover:opacity-100 transition-opacity">
          {partnerLogos.map((partner) => (
            <div
              key={partner.name}
              className="flex flex-col items-center justify-center grayscale hover:grayscale-0 transition-all transform hover:scale-105 duration-300"
            >
              <span className="text-base sm:text-lg font-black tracking-tight text-[#12263A] lp-font-heading">
                {partner.text}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#7E92A2] font-bold">
                {partner.subtext}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
