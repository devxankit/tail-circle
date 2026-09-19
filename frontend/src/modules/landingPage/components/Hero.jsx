import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PawPrint } from './PawPrint';

// 8 floating pet avatars matching the reference design layout
const heroAvatars = [
  {
    id: 'avatar-1',
    name: 'Labrador Puppy',
    img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80',
    pos: 'top-[-3%] left-[45%] -translate-x-1/2',
    size: 'w-12 h-12 sm:w-14 sm:h-14',
    borderClass: 'border-2 border-red-500 ring-2 ring-white',
    animClass: 'lp-float-1',
  },
  {
    id: 'avatar-2',
    name: 'Chihuahua',
    img: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=200&q=80',
    pos: 'top-[12%] -left-[10%] sm:-left-[12%]',
    size: 'w-12 h-12 sm:w-14 sm:h-14',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-2',
  },
  {
    id: 'avatar-3',
    name: 'White Puppy',
    img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=200&q=80',
    pos: 'bottom-[22%] -left-[10%] sm:-left-[12%]',
    size: 'w-11 h-11 sm:w-13 sm:h-13',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-3',
  },
  {
    id: 'avatar-4',
    name: 'Dog Bone Treats',
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=200&q=80',
    pos: '-bottom-[3%] left-[22%]',
    size: 'w-12 h-12 sm:w-15 sm:h-15',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-4',
  },
  {
    id: 'avatar-5',
    name: 'Beagle',
    img: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=200&q=80',
    pos: 'bottom-[2%] right-[10%]',
    size: 'w-12 h-12 sm:w-14 sm:h-14',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-5',
  },
  {
    id: 'avatar-6',
    name: 'Kitten in Bowl',
    img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80',
    pos: 'bottom-[22%] -right-[6%] sm:-right-[8%]',
    size: 'w-12 h-12 sm:w-14 sm:h-14',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-6',
  },
  {
    id: 'avatar-7',
    name: 'Blue Jacket Pup',
    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=200&q=80',
    pos: 'top-[44%] -right-[6%] sm:-right-[8%]',
    size: 'w-11 h-11 sm:w-13 sm:h-13',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-1',
  },
  {
    id: 'avatar-8',
    name: 'Golden Retriever',
    img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=200&q=80',
    pos: 'top-[14%] right-[0%] sm:right-[2%]',
    size: 'w-12 h-12 sm:w-14 sm:h-14',
    borderClass: 'border-2 sm:border-3 border-white shadow-md',
    animClass: 'lp-float-2',
  },
];

export function Hero() {
  return (
    <section className="relative w-full min-h-screen min-h-[100dvh] bg-white overflow-hidden pt-24 sm:pt-28 lg:pt-20 pb-10 sm:pb-14 lg:pb-10 flex items-center justify-center">
      
      {/* ─── Sweeping Golden Yellow Curved Shape (Layer: z-0) ─── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M 210,0 C 170,160 210,330 330,480 C 440,620 540,750 480,900 L 1440,900 L 1440,0 Z"
            fill="#FFC425"
          />
        </svg>

        {/* Scattered Subtle Paw Prints in Background */}
        <div className="absolute top-[26%] left-[4%] hidden sm:block">
          <PawPrint size={40} color="#42BDB5" opacity={0.4} rotation={-18} />
        </div>
        <div className="absolute top-[32%] left-[33%] hidden lg:block">
          <PawPrint size={56} color="#E5A800" opacity={0.16} rotation={25} />
        </div>
        <div className="absolute top-[62%] left-[23%] hidden lg:block">
          <PawPrint size={50} color="#E5A800" opacity={0.16} rotation={-15} />
        </div>
        <div className="absolute top-[82%] left-[36%] hidden sm:block">
          <PawPrint size={60} color="#E5A800" opacity={0.16} rotation={30} />
        </div>
        <div className="absolute bottom-[4%] left-[14%] hidden sm:block">
          <PawPrint size={46} color="#E5A800" opacity={0.22} rotation={-10} />
        </div>

        {/* Subtle mobile overlay */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-transparent via-[#FFC425]/30 to-[#FFC425]/80 pointer-events-none" />
      </div>

      {/* ─── Main Hero Content Container (Layer: z-10) ─── */}
      <div className="lp-container relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* Left Column: Bold Clean Typography & Action Buttons */}
          <div className="lg:col-span-6 flex flex-col items-start text-left max-w-[560px]">
            
            {/* Clean Eyebrow */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#3B9E98] text-xs sm:text-[13px] font-extrabold tracking-[0.2em] uppercase lp-font-heading">
                WELCOME TO TAIL CIRCLE
              </span>
            </div>

            {/* 3-Line Punchy Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-black text-[#12263A] tracking-tight leading-[1.08] mb-5 lp-font-heading">
              Everything your pet<br />
              needs,<br />
              all in one circle.
            </h1>

            {/* Clean Supporting Paragraph */}
            <p className="text-sm sm:text-[15px] lg:text-base text-[#3A4D60] font-normal leading-relaxed max-w-[490px] mb-8">
              From finding trusted care and breed-friendly products to discovering meals, events, new furry friends, adoption, and a community that cares — Tail Circle brings your pet's world together in one place.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#12263A] text-white text-xs sm:text-sm font-extrabold tracking-wider uppercase hover:bg-[#1A3650] transition-all shadow-lg shadow-[#12263A]/20 text-decoration-none group"
              >
                <span>EXPLORE TAIL CIRCLE</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/95 text-[#12263A] border border-[#12263A]/15 text-xs sm:text-sm font-extrabold tracking-wider uppercase hover:bg-white transition-all shadow-sm group text-decoration-none"
              >
                <span>JOIN THE CIRCLE</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

          {/* Right Column: Dog Oval Portrait & 8 Orbiting Pet Avatars */}
          <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end">
            
            {/* Main Dog Oval Container */}
            <div className="relative w-[320px] h-[440px] sm:w-[400px] sm:h-[520px] lg:w-[460px] lg:h-[580px] xl:w-[500px] xl:h-[620px]">
              
              {/* Organic Curved Egg Mask for Dog Photo */}
              <div
                className="w-full h-full bg-[#E5B53A] shadow-2xl overflow-hidden transition-all duration-500 relative"
                style={{
                  borderRadius: '50% 50% 48% 52% / 54% 54% 46% 46%',
                  border: '6px solid #FFFFFF',
                  boxShadow: '0 25px 60px -15px rgba(18, 38, 58, 0.25)',
                }}
              >
                <img
                  src="/assets/images/hero-dog.jpg"
                  alt="Happy chocolate Labrador wearing a stylish bandana"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>

              {/* 8 Floating Pet Avatars */}
              {heroAvatars.map((pet) => (
                <div
                  key={pet.id}
                  className={`absolute ${pet.pos} ${pet.size} rounded-full ${pet.borderClass} overflow-hidden bg-white z-20 ${pet.animClass} hover:scale-115 transition-all duration-300 cursor-pointer`}
                  title={pet.name}
                >
                  <img
                    src={pet.img}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              ))}

            </div>

          </div>

        </div>
      </div>

    </section>
  );
}

export default Hero;
