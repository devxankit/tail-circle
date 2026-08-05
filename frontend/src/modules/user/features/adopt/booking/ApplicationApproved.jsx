import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ClipboardCheck } from 'lucide-react';

export function ApplicationApproved() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Adoption Approval</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-32 h-32 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-8 relative">
          <ClipboardCheck size={64} className="text-[#66B4B1]" />
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#66B4B1] rounded-full flex items-center justify-center border-4 border-[#FAF7F2]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>

        <h2 className="text-[24px] font-black text-gray-900 mb-2 text-center">Application Approved!</h2>
        <p className="text-[14px] text-gray-600 font-medium text-center mb-8 leading-relaxed">
          Congratulations! Your application has been approved.
          <br /><br />
          You can now proceed to finalize the adoption.
        </p>
      </div>

      <div className="px-5">
        <button 
          onClick={() => navigate(`/app/adopt/meet/${id}`)}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          Proceed to Adoption
        </button>
      </div>
    </div>
  );
}
