import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function AdoptionSuccess() {
  const navigate = useNavigate();
  const selectedPet = useAdoptStore(state => state.selectedPet);
  const clearStore = useAdoptStore(state => state.clearStore);

  useEffect(() => {
    if (!selectedPet) navigate('/app/adopt');
  }, [selectedPet, navigate]);

  if (!selectedPet) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] px-5 py-12">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-[#66B4B1] rounded-full flex items-center justify-center shadow-lg shadow-[#66B4B1]/30 relative z-10">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          {/* Confetti effect (simplified with CSS dots) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40">
            <span className="absolute top-0 left-4 w-2 h-2 bg-red-400 rounded-full"></span>
            <span className="absolute top-8 right-2 w-3 h-3 bg-yellow-400 rounded-full"></span>
            <span className="absolute bottom-4 left-2 w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
            <span className="absolute bottom-8 right-6 w-2 h-2 bg-green-400 rounded-full"></span>
          </div>
        </div>

        <h1 className="text-[24px] font-black text-gray-900 mb-2">Adoption Successful!</h1>
        <p className="text-[14px] text-gray-600 font-medium mb-10 text-center">
          {selectedPet.name} is now part of your family.
        </p>

        {/* Pet Card */}
        <div className="w-full bg-white rounded-[24px] p-4 shadow-sm border border-gray-100 mb-8 flex items-center gap-4">
          <img src={selectedPet.images[0]} className="w-20 h-20 rounded-[16px] object-cover" />
          <div className="flex-1">
            <h3 className="text-[16px] font-black text-gray-900 mb-0.5">{selectedPet.name}</h3>
            <p className="text-[12px] text-gray-500 font-medium mb-2">{selectedPet.age} • {selectedPet.gender} • {selectedPet.breed}</p>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FAF7F2] rounded-[6px] w-max">
              <span className="text-[10px] text-gray-500 font-medium">ID: ADP2024052101</span>
              <Copy size={12} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="w-full">
          <h3 className="text-[16px] font-black text-gray-900 mb-4">What's Next?</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[13px] text-gray-700 font-medium">We will follow up with you in next few days.</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[13px] text-gray-700 font-medium">You can always contact us for any help.</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[13px] text-gray-700 font-medium">Download your adoption certificate.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => {
            clearStore();
            navigate('/app/adopt/my-adoptions');
          }}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          View My Adoptions
        </button>
        <button 
          onClick={() => {
            clearStore();
            navigate('/app/adopt');
          }}
          className="w-full bg-white text-[#66B4B1] py-4 rounded-[16px] text-[16px] font-bold border border-gray-200 active:scale-95 transition-transform"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
