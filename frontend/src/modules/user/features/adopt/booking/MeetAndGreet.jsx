import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function MeetAndGreet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedPet = useAdoptStore(state => state.selectedPet);

  // Fallback to home if no pet is selected
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
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Meet & Greet</h1>
      </div>

      <div className="px-5 pt-6 flex-1">
        {/* Banner */}
        <div className="w-full h-48 rounded-[24px] overflow-hidden mb-6 relative shadow-sm">
          <img src={selectedPet.images[0]} alt={selectedPet.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-[22px] font-black text-white mb-1">Meet {selectedPet.name}</h2>
            <p className="text-[13px] text-white/90 font-medium">Spend some time with {selectedPet.name} to build a bond.</p>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-[#66B4B1]" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Date</p>
              <p className="text-[14px] font-bold text-gray-900">Saturday, 25 May 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Clock size={20} className="text-[#66B4B1]" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Time</p>
              <p className="text-[14px] font-bold text-gray-900">11:00 AM - 2:00 PM</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-[#66B4B1]" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Location</p>
              <p className="text-[14px] font-bold text-gray-900">{selectedPet.shelter.name}, Bangalore</p>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-[#FAF7F2] rounded-[24px] p-5">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-[#F87B68]" /> Visiting Guidelines
          </h3>
          <ul className="list-disc list-inside text-[13px] text-gray-700 leading-relaxed space-y-2">
            <li>Please carry a valid ID proof.</li>
            <li>Arrive on time for your scheduled slot.</li>
            <li>If you have existing pets, consult the shelter before bringing them.</li>
            <li>Follow the shelter's instructions while interacting with {selectedPet.name}.</li>
          </ul>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* The shelter books the meet — this screen only confirms the adopter has
            read the visit guidance and moves them on to the agreement. */}
        <button
          onClick={() => navigate(`/app/adopt/agreement/${id}`)}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          Continue to agreement
        </button>
      </div>
    </div>
  );
}
