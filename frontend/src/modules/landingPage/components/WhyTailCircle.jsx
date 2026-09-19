import React from 'react';
import { Layers, MapPin, ShieldCheck, Sparkles, Users, Smile } from 'lucide-react';
import { whyTailCircleBenefits } from '../data/landingData';
import { PawDecoration } from './PawDecoration';

const iconMap = {
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Smile,
};

export function WhyTailCircle() {
  return (
    <section className="relative py-20 sm:py-28 lg:py-36 bg-white overflow-hidden">
      {/* Decorative Paws */}
      <PawDecoration className="top-12 left-8 hidden md:block rotate-12" size={38} opacity={0.08} />
      <PawDecoration className="bottom-14 right-10 hidden lg:block -rotate-30" size={42} opacity={0.08} />

      <div className="lp-container">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-black uppercase tracking-widest text-[#7E92A2] mb-3 block lp-font-heading">
            WHY TAIL CIRCLE
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#12263A] tracking-tight leading-tight mb-4 lp-font-heading">
            More reasons to love Tail Circle.
          </h2>
          <p className="text-base sm:text-lg text-[#4A5D6E] font-medium leading-relaxed">
            Designed from the ground up for pets and the dedicated humans who adore them.
          </p>
        </div>

        {/* 6 Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {whyTailCircleBenefits.map((benefit) => {
            const IconComponent = iconMap[benefit.iconName] || Sparkles;
            return (
              <div
                key={benefit.id}
                className="p-8 rounded-3xl bg-[#FAF9F6] border border-black/5 hover:border-black/10 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group"
              >
                {/* Soft Pastel Icon Badge */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-xs group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundColor: benefit.bgColor,
                    color: benefit.iconColor,
                  }}
                >
                  <IconComponent size={24} />
                </div>

                <h3 className="text-xl font-black text-[#12263A] mb-2 lp-font-heading">
                  {benefit.title}
                </h3>

                <p className="text-sm text-[#4A5D6E] font-medium leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
