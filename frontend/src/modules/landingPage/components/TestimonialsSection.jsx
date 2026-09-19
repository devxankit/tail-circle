import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { testimonialsData, floatingAvatars } from '../data/landingData';
import { PawDecoration } from './PawDecoration';

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Autoplay carousel every 6s
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonialsData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonialsData.length) % testimonialsData.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonialsData.length);
  };

  const current = testimonialsData[currentIndex];

  return (
    <section
      id="testimonials"
      className="relative py-20 sm:py-28 lg:py-36 bg-[#FFF8EA]/60 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative Paws */}
      <PawDecoration className="top-10 left-12 hidden md:block rotate-12" size={40} opacity={0.1} />
      <PawDecoration className="bottom-12 right-12 hidden lg:block -rotate-45" size={44} opacity={0.1} />

      <div className="lp-container relative">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-[#7E92A2] mb-3 block lp-font-heading">
            REAL STORIES
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#12263A] tracking-tight leading-tight mb-4 lp-font-heading">
            Loved by pets. <br className="hidden sm:inline" />
            <span className="text-[#12263A]">Trusted by their people.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#4A5D6E] font-medium leading-relaxed">
            Real experiences from pet parents who are making Tail Circle part of their pets' everyday lives.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-3xl mx-auto">
          


          {/* Floating Pet Portraits on Sides */}
          <div className="hidden md:block absolute -left-16 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg lp-float-1">
            <img src={floatingAvatars[0].img} alt="Pet" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block absolute -right-16 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg lp-float-2">
            <img src={floatingAvatars[1].img} alt="Pet" className="w-full h-full object-cover" />
          </div>

          {/* Active Testimonial Card */}
          <div className="relative rounded-[40px] bg-white p-8 sm:p-12 shadow-2xl border-4 border-white text-center flex flex-col items-center">
            
            {/* Star Rating */}
            <div className="flex items-center gap-1.5 mb-6">
              {[...Array(current.rating)].map((_, i) => (
                <Star key={i} size={20} className="text-[#FFC928] fill-[#FFC928]" />
              ))}
            </div>

            {/* Testimonial Quote */}
            <blockquote className="text-lg sm:text-2xl font-bold text-[#12263A] leading-relaxed mb-8 max-w-xl">
              "{current.quote}"
            </blockquote>

            {/* Pet Parent & Pet Details */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#FFC928]">
                  <img src={current.avatar} alt={current.author} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-xs">
                  <img src={current.petAvatar} alt="Pet" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="text-left">
                <span className="font-extrabold text-sm text-[#12263A] block">
                  {current.author}
                </span>
                <span className="text-xs text-[#7E92A2] font-semibold">
                  {current.petBreed} • {current.location}
                </span>
              </div>
            </div>

            {/* Carousel Navigation Buttons & Dots */}
            <div className="flex items-center justify-between w-full mt-10 pt-6 border-t border-black/5">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full bg-[#FAF9F6] hover:bg-[#FFC928] text-[#12263A] flex items-center justify-center transition-colors cursor-pointer border-0 shadow-xs"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonialsData.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2.5 rounded-full transition-all border-0 cursor-pointer ${
                      currentIndex === i ? 'w-8 bg-[#12263A]' : 'w-2.5 bg-[#12263A]/20'
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full bg-[#FAF9F6] hover:bg-[#FFC928] text-[#12263A] flex items-center justify-center transition-colors cursor-pointer border-0 shadow-xs"
                aria-label="Next testimonial"
              >
                <ChevronRight size={20} />
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
