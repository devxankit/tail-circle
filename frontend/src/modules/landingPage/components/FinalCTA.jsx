import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PawDecoration } from './PawDecoration';

export function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-28 lg:py-36 bg-[#FFC928] overflow-hidden">
      {/* Decorative Paws */}
      <PawDecoration className="top-12 left-10 hidden md:block rotate-12" size={44} opacity={0.14} />
      <PawDecoration className="bottom-14 left-1/4 hidden lg:block -rotate-24" size={40} opacity={0.12} />
      <PawDecoration className="top-16 right-16 hidden md:block rotate-45" size={46} opacity={0.14} />

      <div className="lp-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Heading, Subheading & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#12263A] tracking-tight leading-[1.08] mb-6 lp-font-heading">
              Their world <br />
              is waiting.
            </h2>

            <p className="text-base sm:text-lg text-[#12263A]/85 font-medium leading-relaxed mb-8 max-w-lg">
              Join a community built around the pets we love. Everything you and your pet need, together in Lake Norman.
            </p>

            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <a href="/auth/signup" className="lp-btn-navy w-full sm:w-auto text-decoration-none text-center">
                <span>JOIN THE CIRCLE</span>
                <ArrowRight size={16} className="lp-btn-arrow" />
              </a>
              <a href="#services" className="lp-btn-white w-full sm:w-auto text-decoration-none text-center">
                <span>EXPLORE TAIL CIRCLE</span>
                <ArrowRight size={16} className="lp-btn-arrow" />
              </a>
            </div>
          </div>

          {/* Right Column: Emotional Pet Parent Hugging Dog Photo */}
          <div className="lg:col-span-6 relative flex justify-center">
            


            {/* Organic Arch / Oval Container */}
            <div
              className="relative w-[280px] h-[320px] sm:w-[380px] sm:h-[420px] rounded-[60px] sm:rounded-[80px] overflow-hidden shadow-2xl border-6 border-white bg-white group"
              style={{
                boxShadow: '0 25px 60px -15px rgba(18, 38, 58, 0.25)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80"
                alt="Happy pet parent lovingly hugging a golden retriever"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
