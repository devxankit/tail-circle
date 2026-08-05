import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

export function SelectDateDuration() {
  const navigate = useNavigate();
  const { 
    dateSelectionType, setDateSelectionType, 
    selectedDates, toggleDate, 
    dropoffTime, pickupTime, setTimes,
    selectedCenter 
  } = useDaycareStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 5, 1)); // June 2025 for mockup matching

  const handleContinue = () => {
    if (selectedDates.length > 0 && dropoffTime && pickupTime) {
      navigate('/app/services/daycare/book/pet');
    }
  };

  const isDateSelected = (dateStr) => selectedDates.includes(dateStr);

  // Mock Calendar Generator
  const generateDays = () => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const dStr = `2025-06-${i.toString().padStart(2, '0')}`;
      days.push({
        day: i,
        dateStr: dStr,
        isSelected: isDateSelected(dStr)
      });
    }
    return days;
  };

  const days = generateDays();

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[18px] font-black text-gray-900">Select Date & Duration</h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        
        {/* Type Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
          {['Single Day', 'Multiple Days', 'Custom Week', 'Monthly'].map(type => (
            <button
              key={type}
              onClick={() => setDateSelectionType(type)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                dateSelectionType === type 
                  ? 'bg-[#66B4B1] border-[#66B4B1] text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <button className="p-1 rounded-full hover:bg-gray-100"><ChevronLeft size={20} className="text-gray-400" /></button>
            <h2 className="text-[15px] font-black text-gray-900">June 2025</h2>
            <button className="p-1 rounded-full hover:bg-gray-100"><ChevronRight size={20} className="text-gray-900" /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-y-4 gap-x-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-[12px] font-bold text-gray-400">{day}</div>
            ))}
            
            {/* Empty slots for June start */}
            <div></div><div></div><div></div><div></div><div></div><div></div>

            {days.map((d) => (
              <button
                key={d.day}
                onClick={() => toggleDate(d.dateStr)}
                className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[14px] font-bold transition-colors ${
                  d.isSelected 
                    ? 'bg-[#66B4B1] text-white' 
                    : 'text-gray-700 hover:bg-[#66B4B1]/10'
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">Drop-off Time</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
              {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'].map(time => (
                <button
                  key={time}
                  onClick={() => setTimes(time, pickupTime)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                    dropoffTime === time 
                      ? 'bg-[#66B4B1]/10 border-[#66B4B1] text-[#66B4B1]' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">Pick-up Time</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
              {['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'].map(time => (
                <button
                  key={time}
                  onClick={() => setTimes(dropoffTime, time)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-[13px] font-bold border transition-all ${
                    pickupTime === time 
                      ? 'bg-[#66B4B1]/10 border-[#66B4B1] text-[#66B4B1]' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#F87B68]/5 border border-[#F87B68]/20 rounded-[16px] p-4 flex gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full border border-[#F87B68] shrink-0"></div>
          <p className="text-[12px] font-medium text-[#F87B68] leading-relaxed">
            Center operating hours: <span className="font-bold">7:00 AM - {selectedCenter?.closeTime || '8:00 PM'}</span>
          </p>
        </div>

      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={handleContinue}
          disabled={selectedDates.length === 0 || !dropoffTime || !pickupTime}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
