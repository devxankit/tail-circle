import React, { useState } from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PauseSubscription() {
  const navigate = useNavigate();
  const [selectedWeeks, setSelectedWeeks] = useState(1);

  const handlePause = async () => {
    try {
      const { pauseMealPlan } = await import('../../../../../services/meals');
      const till = new Date(Date.now() + selectedWeeks * 7 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      await pauseMealPlan({ till, reason: `Paused for ${selectedWeeks} week${selectedWeeks > 1 ? 's' : ''}` });
      alert(`Subscription paused for ${selectedWeeks} week${selectedWeeks > 1 ? 's' : ''}!`);
    } catch (err) {
      alert(err.message || 'No active subscription to pause.');
    }
    navigate('/app/meals');
  };

  const handleCancel = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel your meal subscription?");
    if (confirmCancel) {
      try {
        const { pauseMealPlan } = await import('../../../../../services/meals');
        await pauseMealPlan({ reason: 'Cancelled by user' });
        alert("Subscription cancelled successfully.");
      } catch (err) {
        alert(err.message);
      }
      navigate('/app/meals');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-gray-150 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black text-text-primary ml-2 flex-1 tracking-tight">Pause Subscription</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="w-full h-40 bg-[#FAF7F2] rounded-[24px] mb-8 flex flex-col items-center justify-center border border-[#FAF7F2] shadow-sm">
          <Calendar size={40} className="text-[#599D9A] mb-3" />
          <h2 className="text-lg font-black text-[#5A5552]">Going on a trip?</h2>
          <p className="text-[11px] text-[#66B4B1] font-bold mt-1">Pause deliveries temporarily</p>
        </div>

        <h3 className="font-black text-text-primary mb-2 text-center text-sm">How long do you want to pause?</h3>
        <p className="text-xs text-gray-500 font-bold mb-6 text-center">We will automatically resume your deliveries after the selected period.</p>
        
        <div className="flex flex-col gap-3 mb-8 max-w-[400px] mx-auto">
          {[1, 2, 3, 4].map(weeks => (
            <button 
              key={weeks}
              onClick={() => setSelectedWeeks(weeks)}
              className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all active:scale-98 ${selectedWeeks === weeks ? 'border-[#F87B68] bg-[#F87B68]/5 text-[#F87B68]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
            >
              {weeks} {weeks === 1 ? 'Week' : 'Weeks'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 max-w-[400px] mx-auto">
          <button 
            onClick={handlePause} 
            className="w-full bg-[#F87B68] hover:bg-[#F87B68] text-white font-black rounded-2xl py-4 shadow-sm transition-all uppercase tracking-wider text-xs active:scale-95"
          >
            Pause Deliveries
          </button>
          <button 
            onClick={handleCancel} 
            className="w-full bg-white text-error font-black border border-error/20 hover:bg-rose-50 rounded-2xl py-4 shadow-sm transition-all uppercase tracking-wider text-xs active:scale-95"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
}
