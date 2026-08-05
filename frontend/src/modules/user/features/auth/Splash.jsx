import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../../../../services/auth';

export function Splash() {
  const navigate = useNavigate();

  // A live session skips the welcome screen entirely.
  useEffect(() => {
    if (isLoggedIn()) navigate('/app/home', { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-white relative overflow-hidden font-sans">
      
      {/* Subtle background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-[#66B4B1] rounded-full blur-[100px] opacity-15"></div>
      <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-[#F87B68] rounded-full blur-[120px] opacity-10"></div>

      {/* Top Image - Radially masked to completely hide any sharp image boundaries */}
      <div className="absolute top-0 left-0 w-full h-[55vh] md:h-[60vh] z-0 pointer-events-none flex items-center justify-center">
        <img 
          src="/assets/onboarding/welcome_dog.png" 
          alt="Dog" 
          className="w-[120%] max-w-none md:w-full h-full object-cover mix-blend-multiply scale-[1.15] translate-y-[5%]"
          style={{
            WebkitMaskImage: 'radial-gradient(circle at center 40%, black 35%, transparent 70%)',
            maskImage: 'radial-gradient(circle at center 40%, black 35%, transparent 70%)'
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-8 pb-12 pt-[45vh]">
        
        {/* Welcome Text */}
        <div className="mb-10 text-center shrink-0">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#80C1BF] rounded-full"></span>
            <h2 className="text-[1rem] font-bold text-[#5A5552] tracking-[0.2em] uppercase">Welcome</h2>
            <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#F6C0B6] rounded-full"></span>
          </div>
          <h1 className="text-[3.8rem] font-black tracking-tight leading-[1] mb-4">
            <span className="text-[#66B4B1]">Tail</span>
            <span className="text-[#F87B68]">Circle</span>
          </h1>
          <p className="text-[#5A5552] font-medium text-[1.1rem] leading-snug mx-auto flex items-center justify-center gap-1.5">
            <span className="text-[#66B4B1] text-lg">♥</span>
            Swipes, Sniffs, and Soulmates
            <span className="text-[#66B4B1] text-lg">♥</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 shrink-0 px-2">
          <button 
            onClick={() => navigate('/auth/login')}
            className="w-full py-[1.2rem] rounded-2xl font-bold text-white text-[16px] bg-[#66B4B1] shadow-[0_8px_25px_rgba(77,182,172,0.35)] active:scale-95 transition-all hover:bg-[#66B4B1] hover:shadow-[0_8px_25px_rgba(77,182,172,0.5)] hover:-translate-y-0.5"
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/auth/signup')}
            className="w-full py-[1.2rem] rounded-2xl font-bold text-[#F87B68] text-[16px] bg-white border-2 border-[#F87B68]/20 shadow-sm active:scale-95 transition-all hover:bg-[#FAF7F2] hover:border-[#F87B68]/50"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}
