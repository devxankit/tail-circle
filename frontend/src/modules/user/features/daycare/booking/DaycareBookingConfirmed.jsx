import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

export function DaycareBookingConfirmed() {
  const navigate = useNavigate();
  const { lastConfirmedBooking, resetBooking } = useDaycareStore();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Delay content to show animation first
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleNavigate = (path) => {
    resetBooking();
    navigate(path);
  };

  if (!lastConfirmedBooking) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-4 font-medium">No recent booking found.</p>
        <button 
          onClick={() => navigate('/app/home')}
          className="px-6 py-3 bg-[#66B4B1] text-white rounded-full font-bold shadow-sm"
        >
          Go Home
        </button>
      </div>
    );
  }

  const { center, plan, dates, dateType, dropoffTime, pickupTime, pet, petAnswers, addons, id } = lastConfirmedBooking;
  const isMultipleDays = dates && dates.length > 1;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FAF7F2] fixed inset-0 z-50">
      
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
        
        {/* Top Graphic */}
        <div className="flex flex-col items-center justify-center w-full mb-10 relative mt-4">
          
          {/* Confetti Boom Animation */}
          <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center">
            {showContent && [...Array(40)].map((_, i) => {
              const size = Math.random() * 6 + 4;
              const color = ['#0F766E', '#F97360', '#F59E0B', '#3B82F6', '#10B981'][Math.floor(Math.random() * 5)];
              const angle = Math.random() * 360;
              const distance = Math.random() * 120 + 40;
              const tx = Math.cos(angle * Math.PI / 180) * distance;
              const ty = Math.sin(angle * Math.PI / 180) * distance;
              return (
                <div 
                  key={i}
                  className="absolute animate-confetti-boom rounded-sm"
                  style={{
                    width: `${size}px`, 
                    height: `${size}px`, 
                    backgroundColor: color,
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    '--rot': `${Math.random() * 360}deg`
                  }}
                />
              );
            })}
          </div>

          <div className="relative mt-4">
            <div className="absolute inset-0 bg-[#66B4B1]/20 rounded-full animate-ping-slow scale-[1.3]"></div>
            <div className="absolute inset-0 bg-[#66B4B1]/10 rounded-full animate-ping-slow scale-[1.6]" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-20 h-20 bg-[#66B4B1] rounded-full flex items-center justify-center shadow-xl shadow-[#66B4B1]/30 relative z-10 animate-in zoom-in duration-300">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-[26px] font-black text-gray-900 mt-6 mb-2 animate-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
            Booking Confirmed!
          </h1>
          <p className="text-[14px] text-gray-500 font-medium text-center leading-relaxed animate-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
            Your daycare booking is confirmed.
          </p>
        </div>

        {/* Details Card */}
        {showContent && (
          <div className="w-full bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-8 animate-in slide-in-from-bottom-8 duration-500 delay-300 fill-mode-both">
            
            <div className="flex gap-4 items-center mb-5">
              <img src={center?.image} alt={center?.name} className="w-14 h-14 rounded-[12px] object-cover" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-[15px] mb-1 leading-tight">{center?.name}</h3>
                <p className="text-[12px] text-gray-500 font-medium">Booking ID <span className="font-bold text-gray-700 ml-1">{id}</span></p>
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full mb-4"></div>

            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Date</span>
                <span className="text-[13px] font-bold text-gray-900 text-right">
                  {isMultipleDays ? `${formatDate(dates[0])} - ${formatDate(dates[dates.length-1])}` : formatDate(dates[0])}
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Drop-off</span>
                <span className="text-[13px] font-bold text-gray-900 text-right">{dropoffTime}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Pick-up</span>
                <span className="text-[13px] font-bold text-gray-900 text-right">{pickupTime}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Pet</span>
                <span className="text-[13px] font-bold text-gray-900 text-right">{pet?.name} ({petAnswers?.breed || pet?.breed})</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Plan</span>
                <span className="text-[13px] font-bold text-gray-900 text-right">{plan?.name}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[13px] font-bold text-gray-500 shrink-0">Add-ons</span>
                <span className="text-[13px] font-bold text-gray-900 text-right leading-tight">{addons?.length > 0 ? addons.map(a=>a.name).join(', ') : '-'}</span>
              </div>
            </div>

          </div>
        )}

        {/* Buttons */}
        {showContent && (
          <div className="w-full space-y-3 animate-in fade-in duration-500 delay-500 fill-mode-both">
            <button 
              onClick={() => handleNavigate(`/app/services/daycare/booking/${id}`)}
              className="w-full py-4 rounded-[16px] font-bold text-[15px] bg-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
            >
              View My Bookings
            </button>
            <button 
              onClick={() => handleNavigate('/app/home')}
              className="w-full py-4 rounded-[16px] font-bold text-[15px] bg-white text-[#66B4B1] border-2 border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 active:scale-95 transition-transform"
            >
              Go to Home
            </button>
          </div>
        )}

        </div>
      </div>
      
      {/* CSS for Boom Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes confetti-boom {
          0% { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1); opacity: 0; }
        }
        .animate-confetti-boom {
          animation: confetti-boom 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}} />
    </div>
  );
}
