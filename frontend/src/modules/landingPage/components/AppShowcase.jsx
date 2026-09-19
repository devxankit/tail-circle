import React, { useState } from 'react';
import { Stethoscope, Scissors, ShoppingBag, Utensils, Calendar, HeartHandshake, Home, Star, MapPin, Bell, User, Search, ShieldCheck } from 'lucide-react';
import { PawDecoration } from './PawDecoration';

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <section className="relative py-20 sm:py-28 lg:py-36 bg-[#DDF4EC]/70 overflow-hidden">
      {/* Decorative Paws */}
      <PawDecoration className="top-12 left-12 hidden lg:block rotate-12" size={44} opacity={0.12} />
      <PawDecoration className="bottom-16 right-16 hidden md:block -rotate-24" size={40} opacity={0.12} />

      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Realistic Dual Phone Mockups */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            


            <div className="relative flex items-center justify-center w-full max-w-[480px]">
              
              {/* Phone Mockup 1 (Primary - App Dashboard) */}
              <div className="w-[230px] sm:w-[260px] h-[460px] sm:h-[510px] bg-[#12263A] rounded-[42px] p-3 shadow-2xl border-4 border-white z-20 relative transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                {/* Phone Screen */}
                <div className="w-full h-full bg-[#FAF9F6] rounded-[32px] overflow-hidden flex flex-col justify-between text-left select-none relative">
                  
                  {/* Top Status & Brand Header */}
                  <div className="bg-[#FFC928] p-3.5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#12263A] uppercase tracking-wider">
                        Tail Circle
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#12263A] text-[#FFC928] flex items-center justify-center text-[9px] font-bold">
                        TC
                      </div>
                    </div>
                    {/* Active Pet Header */}
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs p-1.5 rounded-xl">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-[#12263A]/20">
                        <img
                          src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=100&q=80"
                          alt="Buddy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="leading-tight">
                        <span className="text-[11px] font-bold text-[#12263A] block">Buddy's Circle</span>
                        <span className="text-[9px] text-[#4A5D6E]">Lake Norman, NC</span>
                      </div>
                    </div>
                  </div>

                  {/* App Screen Services Grid */}
                  <div className="p-3 overflow-y-auto space-y-2.5">
                    <span className="text-[10px] font-black text-[#7E92A2] uppercase tracking-wider block">
                      Quick Services
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { name: 'Vet', bg: '#DDEEFF', color: '#1B64DA', Icon: Stethoscope },
                        { name: 'Groom', bg: '#FFEADB', color: '#EA580C', Icon: Scissors },
                        { name: 'Shop', bg: '#DDF4EC', color: '#0D9488', Icon: ShoppingBag },
                        { name: 'Meals', bg: '#FCE5EC', color: '#E11D48', Icon: Utensils },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="flex flex-col items-center p-1.5 rounded-xl text-center"
                          style={{ backgroundColor: item.bg }}
                        >
                          <item.Icon size={14} style={{ color: item.color }} />
                          <span className="text-[9px] font-bold text-[#12263A] mt-1">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Upcoming Booking Card */}
                    <div className="bg-white p-2.5 rounded-xl shadow-xs border border-black/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#12263A]">Upcoming Vet Care</span>
                        <span className="text-[9px] font-bold text-[#1B64DA] bg-[#DDEEFF] px-1.5 py-0.5 rounded-md">Tomorrow</span>
                      </div>
                      <p className="text-[10px] text-[#4A5D6E]">Lake Norman Animal Clinic • 10:30 AM</p>
                    </div>

                    {/* Local Pet Playdate Banner */}
                    <div className="bg-[#FFF8EA] p-2.5 rounded-xl border border-[#FFC928]/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#12263A] block">Lake Dog Park Meetup</span>
                        <span className="text-[9px] text-[#7E92A2]">Saturday • 12 Dogs Joining</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#FFC928] flex items-center justify-center text-[#12263A]">
                        <HeartHandshake size={12} />
                      </div>
                    </div>
                  </div>

                  {/* App Bottom Navigation Bar */}
                  <div className="bg-white border-t border-black/5 px-4 py-2 flex items-center justify-between">
                    <div className="text-[#FFC928]"><Home size={14} /></div>
                    <div className="text-[#7E92A2]"><Search size={14} /></div>
                    <div className="text-[#7E92A2]"><HeartHandshake size={14} /></div>
                    <div className="text-[#7E92A2]"><User size={14} /></div>
                  </div>

                </div>
              </div>

              {/* Phone Mockup 2 (Secondary - Pet Match & Discovery) */}
              <div className="w-[210px] sm:w-[240px] h-[430px] sm:h-[480px] bg-[#12263A] rounded-[38px] p-2.5 shadow-2xl border-4 border-white z-10 -ml-12 sm:-ml-16 transform rotate-6 hover:rotate-0 transition-transform duration-500 hidden sm:block">
                {/* Secondary Phone Screen */}
                <div className="w-full h-full bg-[#FFFFFF] rounded-[28px] overflow-hidden flex flex-col justify-between text-left select-none">
                  
                  <div className="bg-[#12263A] text-white p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#BFEFF0] block">
                      Local Pet Match
                    </span>
                    <span className="text-xs font-black">Nearby Furry Friends</span>
                  </div>

                  {/* Match Profile Preview */}
                  <div className="p-3 space-y-2">
                    <div className="w-full h-32 rounded-xl overflow-hidden relative shadow-xs">
                      <img
                        src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80"
                        alt="Milo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                        Milo • 0.8 mi away
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#12263A]">Milo (Frenchie)</span>
                        <span className="text-[9px] text-[#0D9488] font-bold">98% Match</span>
                      </div>
                      <p className="text-[9px] text-[#4A5D6E] leading-tight">
                        Loves lake walks, tennis balls, and gentle playdates.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 bg-[#DDF4EC] text-[#0D9488] text-center py-1.5 rounded-lg text-[10px] font-bold">
                        Connect
                      </div>
                      <div className="flex-1 bg-[#FFEADB] text-[#EA580C] text-center py-1.5 rounded-lg text-[10px] font-bold">
                        Playdate
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#FAF9F6] border-t border-black/5 text-center text-[9px] font-bold text-[#12263A]">
                    Verified Lake Norman Pet Parents ✓
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Editorial Copy & App Badges */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <span className="text-xs font-black uppercase tracking-widest text-[#7E92A2] mb-3 lp-font-heading">
              TAIL CIRCLE APP
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#12263A] tracking-tight leading-[1.12] mb-6 lp-font-heading">
              Everything your pet needs. <br />
              <span className="text-[#12263A]">Right at your fingertips.</span>
            </h2>

            <p className="text-base sm:text-lg text-[#4A5D6E] font-medium leading-relaxed mb-8 max-w-xl">
              Book services, shop products, discover events, meet new friends and more — anytime, anywhere across Lake Norman.
            </p>

            {/* App Store & Google Play Download Buttons */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-6">
              
              {/* App Store Button */}
              <a
                href="#download"
                className="flex items-center gap-3 bg-[#12263A] hover:bg-[#0A1927] text-white px-5 py-3 rounded-2xl transition-all hover:-translate-y-1 shadow-lg text-decoration-none"
              >
                {/* Apple Logo SVG */}
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.92.04-2.02.62-2.66 1.37-.56.65-.99 1.7-0.85 2.74 1.02.08 2.06-.52 2.59-1.24z" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold leading-tight">
                    Download on the
                  </span>
                  <span className="text-sm font-bold tracking-tight text-white leading-tight">
                    App Store
                  </span>
                </div>
              </a>

              {/* Google Play Button */}
              <a
                href="#download"
                className="flex items-center gap-3 bg-[#12263A] hover:bg-[#0A1927] text-white px-5 py-3 rounded-2xl transition-all hover:-translate-y-1 shadow-lg text-decoration-none"
              >
                {/* Google Play SVG */}
                <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.428V3.242c0-.554.225-1.055.609-1.428zm11.233 11.234l2.585-2.586-12.82-7.398 10.235 9.984zm0 .904l-10.235 9.984 12.82-7.398-2.585-2.586zm1.758-1.758l3.435 1.983c.957.553.957 1.455 0 2.008l-3.435 1.983-2.124-2.124 2.124-1.85z" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold leading-tight">
                    GET IT ON
                  </span>
                  <span className="text-sm font-bold tracking-tight text-white leading-tight">
                    Google Play
                  </span>
                </div>
              </a>

            </div>

            <span className="text-xs text-[#4A5D6E] font-medium">
              ★ 4.9 Rating • 10,000+ Lake Norman Pet Families
            </span>

          </div>

        </div>
      </div>
    </section>
  );
}
