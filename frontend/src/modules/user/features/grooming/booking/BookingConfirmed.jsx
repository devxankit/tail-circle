import React, { useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useGroomingStore } from '../../../../../store/useGroomingStore';

export function BookingConfirmed() {
  const navigate = useNavigate();
  const resetBooking = useGroomingStore(state => state.resetBooking);
  const lastBooking = useGroomingStore(state => state.lastConfirmedBooking);

  useEffect(() => {
    // In React 18 strict mode, cleanup runs immediately on mount. 
    // We should not clear the state here otherwise it gets lost.
  }, []);

  useEffect(() => {
    if (lastBooking) {
      // Trigger realistic explosion effect
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#facc15', '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#0F766E']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#facc15', '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#0F766E']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      // Delay slightly for the slide up animation to complete
      setTimeout(frame, 300);
    }
  }, [lastBooking]);

  if (!lastBooking) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center animate-in fade-in">
        <p className="text-gray-500">No recent booking found.</p>
        <button onClick={() => navigate('/app')} className="mt-4 text-[#66B4B1] font-bold">Go to Home</button>
      </div>
    );
  }

  const { shopName, shopImage, serviceName, date, timeSlot, visitType, id } = lastBooking;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }).replace(',', '');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white absolute inset-0 z-50 animate-in slide-in-from-bottom-full duration-300">
      
      {/* Header with Back Arrow */}
      <div className="bg-white pt-4 pb-2 px-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95 transition-transform">
          <ArrowLeft size={24} className="text-gray-900" />
        </button>
      </div>

      <div className="flex-1 px-5 pt-8 pb-8 flex flex-col items-center max-w-md mx-auto w-full">
        
        {/* Top Graphic */}
        <div className="flex flex-col items-center justify-center w-full mb-8 relative">
          
          <div className="relative mb-6 z-10 flex items-center justify-center w-28 h-28 animate-in zoom-in duration-500">
            {/* Outer faint ring */}
            <div className="absolute inset-0 bg-[#66B4B1]/10 rounded-full scale-110 animate-pulse duration-1000"></div>
            {/* Inner green circle */}
            <div className="w-20 h-20 bg-[#66B4B1] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(15,118,110,0.3)] z-10 animate-in zoom-in duration-300">
              <Check size={40} className="text-white animate-in slide-in-from-bottom-2 duration-300 delay-200" strokeWidth={3.5} />
            </div>
          </div>
          
          <h2 className="text-[20px] font-black text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-[13px] text-gray-500 font-medium text-center leading-relaxed">
            Your grooming appointment<br/>has been successfully booked.
          </p>
        </div>
        
        {/* Booking Card */}
        <div className="w-full bg-[#FAF7F2] rounded-[20px] p-4 mb-auto border border-gray-50 shadow-sm">
          <div className="flex gap-4">
            <img src={shopImage || "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80"} alt={shopName} className="w-[72px] h-[72px] rounded-[14px] object-cover" />
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="font-bold text-gray-900 text-[15px] mb-1.5 leading-tight">{shopName}</h3>
              <p className="text-[12px] text-gray-900 font-bold mb-1">{formatDate(date)} • {timeSlot}</p>
              <p className="text-[12px] text-gray-600 font-medium mb-1">{serviceName}</p>
              <p className="text-[12px] text-gray-600 font-medium">{visitType}</p>
            </div>
          </div>
          <div className="mt-5 pt-4 flex justify-between items-center">
            <span className="text-[12px] text-gray-500 font-medium ml-1">Booking ID</span>
            <span className="text-[13px] font-black text-gray-900">{id}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 mt-8">
          <button 
            onClick={() => {
              resetBooking();
              navigate(`/app/services/grooming/booking/${id}`);
            }}
            className="w-full py-3.5 rounded-[12px] font-bold text-[15px] bg-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
          >
            View My Bookings
          </button>
          <button 
            onClick={() => {
              resetBooking();
              navigate('/app/home');
            }}
            className="w-full py-3.5 rounded-[12px] font-bold text-[15px] bg-white text-[#66B4B1] border border-gray-200 hover:border-[#66B4B1] active:scale-95 transition-transform"
          >
            Go to Home
          </button>
        </div>

      </div>
    </div>
  );
}
