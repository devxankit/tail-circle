import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, HeartPulse, ShieldAlert, Home, Eye } from 'lucide-react';

export function AdoptionAgreement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const rules = [
    { icon: <Shield size={20} className="text-[#66B4B1]" />, text: "Provide proper food, water & shelter" },
    { icon: <HeartPulse size={20} className="text-[#66B4B1]" />, text: "Regular vet checkups & vaccinations" },
    { icon: <Home size={20} className="text-[#66B4B1]" />, text: "Keep the pet safe and healthy" },
    { icon: <ShieldAlert size={20} className="text-[#66B4B1]" />, text: "Do not abandon or rehome" },
    { icon: <Eye size={20} className="text-[#66B4B1]" />, text: "Allow follow-up visits" },
  ];

  const handleContinue = async () => {
    if (!agreed) return;
    try {
      const { advanceApplication } = await import('../../../../../services/adoptApi');
      await advanceApplication(id, 'agreement_signed');
      navigate(`/app/adopt/fee/${id}`);
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
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Adoption Agreement</h1>
      </div>

      <div className="px-5 pt-6 flex flex-col flex-1">
        <p className="text-[14px] text-gray-600 font-medium mb-8 leading-relaxed">
          Please read the adoption agreement carefully.
        </p>

        {/* Rules */}
        <div className="space-y-4 flex-1">
          {rules.map((rule, idx) => (
            <div key={idx} className="bg-white border border-gray-100 p-4 rounded-[16px] flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 bg-[#FAF7F2] rounded-[12px] flex items-center justify-center shrink-0">
                {rule.icon}
              </div>
              <p className="text-[14px] font-bold text-gray-900 flex-1">{rule.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 mb-6 flex items-center gap-3">
          <button 
            onClick={() => setAgreed(!agreed)}
            className={`w-6 h-6 rounded-[6px] border flex items-center justify-center transition-colors ${agreed ? 'bg-[#66B4B1] border-[#66B4B1]' : 'bg-white border-gray-300'}`}
          >
            {agreed && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          </button>
          <span className="text-[14px] text-gray-700 font-medium">I agree to the terms and conditions</span>
        </div>

        <button 
          onClick={handleContinue}
          disabled={!agreed}
          className={`w-full py-4 rounded-[16px] text-[16px] font-bold shadow-lg active:scale-95 transition-all ${agreed ? 'bg-[#66B4B1] text-white shadow-[#66B4B1]/20' : 'bg-gray-200 text-gray-400 shadow-none'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
