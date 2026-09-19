import React, { useState, useEffect } from 'react';

export function Preloader({ onComplete }) {
  const [step, setStep] = useState(0); // 0: walking paws, 1: center logo reveal, 2: full lockup, 3: exit
  const [activePawCount, setActivePawCount] = useState(0);

  useEffect(() => {
    // Phase 1: Paw prints walk in a circle (one by one)
    const pawInterval = setInterval(() => {
      setActivePawCount((prev) => {
        if (prev >= 14) {
          clearInterval(pawInterval);
          setStep(1); // Trigger center logo assembly
          return 14;
        }
        return prev + 1;
      });
    }, 90);

    // Phase 2: Lockup complete
    const lockupTimer = setTimeout(() => {
      setStep(2);
    }, 1800);

    // Phase 3: Transition out into the landing page
    const exitTimer = setTimeout(() => {
      setStep(3);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 700);
    }, 2800);

    return () => {
      clearInterval(pawInterval);
      clearTimeout(lockupTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  // Exact 14 circular paw points forming the oval loop like the video
  const pawPoints = [
    // Left arc moving up
    { x: -140, y: 30, rot: -45 },
    { x: -160, y: -20, rot: -20 },
    { x: -150, y: -70, rot: 10 },
    { x: -110, y: -115, rot: 40 },
    { x: -50, y: -140, rot: 75 },
    { x: 10, y: -145, rot: 95 },
    { x: 70, y: -130, rot: 120 },
    // Right arc moving down & around
    { x: 130, y: -90, rot: 145 },
    { x: 160, y: -30, rot: 170 },
    { x: 155, y: 30, rot: -165 },
    { x: 120, y: 85, rot: -135 },
    { x: 60, y: 125, rot: -105 },
    { x: -10, y: 135, rot: -75 },
    { x: -80, y: 100, rot: -45 },
  ];

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${
        step === 3
          ? 'opacity-0 -translate-y-full rounded-b-[80px] pointer-events-none'
          : 'opacity-100 translate-y-0'
      }`}
      style={{
        backgroundColor: '#FED034',
        backgroundImage: 'radial-gradient(circle at center, #FFD84D 0%, #FED034 60%, #F5BE18 100%)',
      }}
    >
      {/* Container for the Circle Animation */}
      <div className="relative w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
        
        {/* =========================================================================
            STAGE 1: PAW PRINTS WALKING IN A CIRCLE (From Video Frame 0:00)
            ========================================================================= */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {pawPoints.map((pt, idx) => {
            const isVisible = idx < activePawCount;
            return (
              <div
                key={idx}
                className="absolute transition-all duration-300 ease-out"
                style={{
                  transform: `translate(${pt.x}px, ${pt.y}px) rotate(${pt.rot}deg) scale(${isVisible ? 1 : 0.2})`,
                  opacity: isVisible ? (step >= 2 ? 0.35 : 0.95) : 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#152737">
                  <ellipse cx="7" cy="4.5" rx="1.9" ry="2.6" />
                  <ellipse cx="17" cy="4.5" rx="1.9" ry="2.6" />
                  <ellipse cx="3.8" cy="9.5" rx="1.9" ry="2.6" />
                  <ellipse cx="20.2" cy="9.5" rx="1.9" ry="2.6" />
                  <path d="M12 9c-3.4 0-6.2 2.4-6.2 5.8 0 3 2.4 4.8 6.2 4.8s6.2-1.8 6.2-4.8C18.2 11.4 15.4 9 12 9z" />
                </svg>
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            STAGE 2 & 3: CENTER BRAND LOGO & CIRCULAR LOCKUP (From Video Frame 0:03 - 0:06)
            ========================================================================= */}
        <div
          className={`relative z-10 flex flex-col items-center justify-center transition-all duration-600 ease-out transform ${
            step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          {/* Top Curved Text / Arc */}
          <div
            className={`transition-all duration-500 delay-100 mb-2 transform ${
              step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
            }`}
          >
            <span className="font-['Outfit'] font-extrabold text-[0.7rem] sm:text-[0.76rem] tracking-[0.26em] uppercase text-[#152737]">
              • PREMIUM PET LIFESTYLE •
            </span>
          </div>

          {/* Center Dog Illustration Badge / Logo */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Pulsing White Circular Glow */}
            <div className="absolute w-28 h-28 rounded-full bg-white/40 blur-xl animate-pulse pointer-events-none" />

            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white shadow-[0_12px_36px_rgba(21,39,55,0.18)] flex items-center justify-center border-4 border-white transform hover:scale-105 transition-transform duration-300">
              <img
                src="/logo/Tail-removebg-preview.png"
                alt="Tail Circle Dog Logo"
                className="w-16 h-16 sm:w-18 sm:h-18 object-contain animate-bounce"
                style={{ animationDuration: '1.4s' }}
              />
            </div>
          </div>

          {/* Main Brand Title - Bold Character Typography */}
          <div
            className={`text-center my-1 transition-all duration-500 delay-200 transform ${
              step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <h1 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-[#152737] tracking-tight leading-none drop-shadow-sm">
              Tail Circle
            </h1>
          </div>

          {/* Bottom Curved Subtitle & Mini Paws */}
          <div
            className={`transition-all duration-500 delay-300 mt-2 flex flex-col items-center transform ${
              step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[#152737]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <ellipse cx="7" cy="4.5" rx="1.9" ry="2.6" />
                <ellipse cx="17" cy="4.5" rx="1.9" ry="2.6" />
                <ellipse cx="3.8" cy="9.5" rx="1.9" ry="2.6" />
                <ellipse cx="20.2" cy="9.5" rx="1.9" ry="2.6" />
                <path d="M12 9c-3.4 0-6.2 2.4-6.2 5.8 0 3 2.4 4.8 6.2 4.8s6.2-1.8 6.2-4.8C18.2 11.4 15.4 9 12 9z" />
              </svg>
              <span className="font-['Outfit'] font-bold text-[0.68rem] tracking-[0.22em] uppercase text-[#152737]">
                ALL IN ONE CIRCLE
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <ellipse cx="7" cy="4.5" rx="1.9" ry="2.6" />
                <ellipse cx="17" cy="4.5" rx="1.9" ry="2.6" />
                <ellipse cx="3.8" cy="9.5" rx="1.9" ry="2.6" />
                <ellipse cx="20.2" cy="9.5" rx="1.9" ry="2.6" />
                <path d="M12 9c-3.4 0-6.2 2.4-6.2 5.8 0 3 2.4 4.8 6.2 4.8s6.2-1.8 6.2-4.8C18.2 11.4 15.4 9 12 9z" />
              </svg>
            </div>
          </div>

        </div>

      </div>

      {/* Skip Button */}
      <button
        onClick={() => {
          setStep(3);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 350);
        }}
        className="absolute bottom-8 text-[0.72rem] font-bold tracking-widest uppercase text-[#152737]/60 hover:text-[#152737] transition-colors py-1.5 px-4 rounded-full bg-white/30 hover:bg-white/60 cursor-pointer border-0 shadow-sm"
      >
        Skip →
      </button>
    </div>
  );
}

export default Preloader;
