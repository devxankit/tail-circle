import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function AdoptionFee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedPet = useAdoptStore(state => state.selectedPet);

  useEffect(() => {
    if (!selectedPet) navigate('/app/adopt');
  }, [selectedPet, navigate]);

  if (!selectedPet) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Adoption Fee</h1>
      </div>

      <div className="px-5 pt-6 flex flex-col flex-1">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
            <span className="text-[40px]">🐶</span>
          </div>
          <h2 className="text-[20px] font-black text-gray-900 mb-1">Thank you!</h2>
          <p className="text-[13px] text-gray-500 font-medium text-center">
            Your adoption fee helps us rescue more pets.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm flex-1">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[15px] font-bold text-gray-900">Adoption Fee</span>
            <span className="text-[16px] font-black text-gray-900">₹{selectedPet.adoptionFee}</span>
          </div>

          <p className="text-[12px] text-gray-500 font-bold mb-4">Includes</p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[14px] text-gray-700 font-medium">Vaccination</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[14px] text-gray-700 font-medium">Deworming</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[14px] text-gray-700 font-medium">Medical Checkup</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#66B4B1]" />
              <span className="text-[14px] text-gray-700 font-medium">Spay/Neuter (if applicable)</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-5 flex justify-between items-center">
            <span className="text-[16px] font-bold text-gray-900">Total Amount</span>
            <span className="text-[22px] font-black text-gray-900">₹{selectedPet.adoptionFee}</span>
          </div>
        </div>
      </div>

      <div className="px-5">
        <button
          onClick={async () => {
            try {
              const { payAdoptionFee } = await import('../../../../../services/adoptApi');
              await payAdoptionFee(id, selectedPet.name);
              navigate(`/app/adopt/success/${id}`);
            } catch (err) {
              alert(err.message || 'Payment failed');
            }
          }}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          {selectedPet.adoptionFee > 0 ? 'Pay Now' : 'Complete Adoption'}
        </button>
      </div>
    </div>
  );
}
