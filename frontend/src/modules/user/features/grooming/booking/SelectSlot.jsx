import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGroomingSlots } from '../../../../../services/groomingApi';
import { useGroomingStore } from '../../../../../store/useGroomingStore';

export function SelectSlot() {
  const navigate = useNavigate();
  const shop = useGroomingStore(state => state.bookingData.shop);
  const selectedDate = useGroomingStore(state => state.bookingData.date);
  const selectedTime = useGroomingStore(state => state.bookingData.timeSlot);
  
  const setDateTime = useGroomingStore(state => state.setDateTime);

  const [dates, setDates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    if (!shop) {
      navigate('/app/services/grooming');
      return;
    }

    // Generate next 14 days
    const nextDates = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        fullDate: d.toISOString(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' })
      };
    });
    setDates(nextDates);
    
    const initialDate = selectedDate || nextDates[0].fullDate;
    setActiveDate(initialDate);
  }, [shop]);

  useEffect(() => {
    if (activeDate && shop) {
      loadSlots(activeDate);
    }
  }, [activeDate, shop]);

  const loadSlots = async (date) => {
    setLoading(true);
    try {
      const data = await getGroomingSlots(shop.id, date);
      setSlots(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (activeDate && selectedTime) {
      setDateTime(activeDate, selectedTime);
      navigate('/app/services/grooming/book/pet');
    }
  };

  const morningSlots = slots.filter(s => s.period === 'Morning');
  const afternoonSlots = slots.filter(s => s.period === 'Afternoon');
  const eveningSlots = slots.filter(s => s.period === 'Evening');

  const renderSlotGrid = (periodSlots, title) => {
    if (periodSlots.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-[14px] font-bold text-gray-900 mb-3">{title}</h3>
        <div className="grid grid-cols-3 gap-3">
          {periodSlots.map(slot => {
            const isSelected = selectedTime === slot.time;
            return (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => setDateTime(activeDate, slot.time)}
                className={`py-3 rounded-[12px] font-bold text-[13px] transition-all border ${
                  !slot.available 
                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
                }`}
              >
                {slot.time}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95">
            <ArrowLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="text-[19px] font-black text-gray-900">Select Date & Time</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        
        {/* Date Selector */}
        <div className="bg-white p-4 pt-6 shadow-sm mb-2">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
            {dates.map((d, idx) => {
              const isSelected = activeDate === d.fullDate;
              return (
                <button 
                  key={idx}
                  onClick={() => { setActiveDate(d.fullDate); setDateTime(d.fullDate, null); }}
                  className={`flex flex-col items-center justify-center w-16 h-[85px] rounded-[18px] shrink-0 transition-all border-2 ${
                    isSelected 
                      ? "bg-[#66B4B1] border-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20" 
                      : "bg-white border-gray-100 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <span className={`text-[11px] font-bold mb-1 ${isSelected ? "text-white/90" : "text-gray-400"}`}>{d.month}</span>
                  <span className="text-[20px] font-black leading-none mb-1">{d.dateNum}</span>
                  <span className={`text-[11px] font-bold ${isSelected ? "text-white/90" : "text-gray-400"}`}>{d.dayName}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white p-5 shadow-sm min-h-[50vh]">
          <h2 className="text-[16px] font-black text-gray-900 mb-5">Available Slots</h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#66B4B1] rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold text-gray-500">Loading slots...</p>
            </div>
          ) : (
            <>
              {renderSlotGrid(morningSlots, "Morning")}
              {renderSlotGrid(afternoonSlots, "Afternoon")}
              {renderSlotGrid(eveningSlots, "Evening")}
            </>
          )}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={handleContinue}
          disabled={!activeDate || !selectedTime}
          className={`w-full py-4 rounded-[16px] font-bold text-[15px] shadow-lg transition-all flex items-center justify-center gap-2 ${
            (activeDate && selectedTime)
              ? 'bg-[#66B4B1] text-white hover:bg-[#599D9A] shadow-[#66B4B1]/30 active:scale-95' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          Continue
        </button>
      </div>

    </div>
  );
}
