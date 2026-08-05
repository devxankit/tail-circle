import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MonitorPlay, Camera, Home, CheckCircle2, Circle } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function HomeCheck() {
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedPet = useAdoptStore(state => state.selectedPet);

  const handleContinue = async () => {
    try {
      const { advanceApplication } = await import('../../../../../services/adoptApi');
      await advanceApplication(id, 'home_check_scheduled');
      await advanceApplication(id, 'approved'); // self-serve until Phase 11 admin moderation
      navigate(`/app/adopt/approved/${id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Home Check</h1>
      </div>

      <div className="px-5 pt-6 flex flex-col flex-1">
        <p className="text-[14px] text-gray-600 font-medium mb-8 leading-relaxed">
          A home check helps us ensure the pet is going to a safe and loving environment.
        </p>

        {/* Steps */}
        <div className="space-y-4 flex-1">
          {/* Step 1 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <MonitorPlay size={24} className="text-[#66B4B1]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Online Interview</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">We will ask you a few questions.</p>
            </div>
            <CheckCircle2 size={24} className="text-[#66B4B1]" />
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Camera size={24} className="text-[#66B4B1]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Home Photos</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">Share photos of your home.</p>
            </div>
            <CheckCircle2 size={24} className="text-[#66B4B1]" />
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Home size={24} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Home Visit</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">Our volunteer will visit your home.</p>
            </div>
            <Circle size={24} className="text-gray-300" />
          </div>
        </div>

        <div className="mt-8 mb-6">
          <p className="text-[12px] text-gray-500 font-medium text-center">
            This helps us ensure the best match for {selectedPet?.name || 'the pet'}.
          </p>
        </div>

        <button 
          onClick={handleContinue}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          Submit & Continue
        </button>
      </div>
    </div>
  );
}
