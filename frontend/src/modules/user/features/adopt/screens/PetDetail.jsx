import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Heart, MapPin, ShieldCheck, CheckCircle2, MessageCircle, ArrowUpRight } from 'lucide-react';
import { getPetById } from '../../../../../services/adoptApi';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function PetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const setSelectedPet = useAdoptStore(state => state.setSelectedPet);

  useEffect(() => {
    getPetById(id).then(data => setPet(data));
  }, [id]);

  if (!pet) return <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">Loading...</div>;

  const handleEnquire = () => {
    const message = `Hi, I am interested in ${pet.name}. Is he still available for adoption?`;
    navigate(`/app/adopt/chat/${pet.id}`, { state: { prefilledMessage: message } });
  };

  const handleAdoptIntake = () => {
    setSelectedPet(pet);
    navigate(`/app/adopt/apply/${pet.id}`);
  };

  const isFree = pet.price === 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-28 animate-in fade-in duration-300">
      {/* Header & Gallery */}
      <div className="relative h-[380px] w-full">
        <img src={pet.images[activeImage]} alt={pet.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/25"></div>
        
        <div className="absolute top-12 left-5 right-5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex gap-3">
            <button className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors">
              <Share2 size={20} />
            </button>
            <button className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors">
              <Heart size={20} className="hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Thumbnail selector */}
        {pet.images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-1.5 bg-black/20 backdrop-blur-md rounded-[18px]">
            {pet.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveImage(idx)}
                className={`w-12 h-12 rounded-[12px] border-2 transition-all ${activeImage === idx ? 'border-white scale-105 shadow-sm' : 'border-transparent opacity-60'}`}
              >
                <img src={img} className="w-full h-full object-cover rounded-[10px]" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pt-6 bg-white -mt-6 rounded-t-[32px] relative z-10 flex-1 border-t border-gray-100/50">
        {/* Basic Info */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-[28px] font-black text-gray-900 leading-tight mb-1">{pet.name}</h1>
            <p className="text-[14px] text-gray-500 font-black flex items-center gap-1">
              {pet.breed} • {pet.age}
            </p>
          </div>
          {/* Price Badge */}
          <div className={`px-4 py-2 rounded-[14px] text-[13.5px] font-black shadow-sm ${
            isFree 
              ? 'bg-[#FAF7F2] text-[#599D9A] border border-[#BFE0DF]/40' 
              : 'bg-[#FAF7F2] text-gray-900 border border-[#FCEAE7]/40'
          }`}>
            {isFree ? '🎁 Free Adoption' : `₹${pet.price.toLocaleString()}`}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-[13.5px] text-gray-600 font-bold pl-0.5 mt-2">
          <span>{pet.gender}</span>
          <span className="text-gray-300">•</span>
          <span>{pet.weight}</span>
          <span className="text-gray-300">•</span>
          <span>{pet.distance}</span>
        </div>

        {/* Health Status */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
          {pet.vaccinated && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] text-[#66B4B1] rounded-[10px] text-[12px] font-black whitespace-nowrap">
              <ShieldCheck size={16} /> Vaccinated
            </div>
          )}
          {pet.dewormed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] text-[#66B4B1] rounded-[10px] text-[12px] font-black whitespace-nowrap">
              <CheckCircle2 size={16} /> Dewormed
            </div>
          )}
          {pet.neutered && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] text-[#66B4B1] rounded-[10px] text-[12px] font-black whitespace-nowrap">
              <CheckCircle2 size={16} /> Neutered
            </div>
          )}
        </div>

        {/* Personality Traits */}
        <h3 className="text-[17px] font-black text-gray-900 mb-3 pl-0.5">Personality</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {pet.traits.map((trait, i) => (
            <span key={i} className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-700 rounded-[12px] text-[13px] font-bold">
              {trait}
            </span>
          ))}
        </div>

        {/* About */}
        <h3 className="text-[17px] font-black text-gray-900 mb-2.5 pl-0.5">About {pet.name}</h3>
        <p className="text-[14px] text-gray-600 leading-relaxed font-semibold mb-6">
          {pet.about}
        </p>

        {/* Location & Shelter */}
        <h3 className="text-[17px] font-black text-gray-900 mb-3 pl-0.5">Location & Shelter</h3>
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-[22px] mb-8 border border-gray-100 shadow-sm">
          <img src={pet.shelter.image} className="w-13 h-13 rounded-full object-cover border border-gray-100" />
          <div className="flex-1">
            <h4 className="text-[14.5px] font-black text-gray-900 flex items-center gap-1">
              {pet.shelter.name} {pet.shelter.verified && <CheckCircle2 size={14} className="text-[#66B4B1]" />}
            </h4>
            <p className="text-[12px] text-gray-500 font-bold flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-gray-400" /> {pet.location} ({pet.distance})
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100/80 z-30 flex gap-3 shadow-md">
        <button 
          onClick={() => navigate(`/app/adopt/chat/${pet.id}`)}
          className="w-14 h-14 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-[16px] flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-sm border border-gray-200/50"
        >
          <MessageCircle size={22} />
        </button>
        
        {/* Enquire Button linking to WhatsApp */}
        <button 
          onClick={handleEnquire}
          className="flex-1 bg-[#66B4B1] hover:bg-[#4C8684] text-white rounded-[16px] text-[15px] font-black shadow-lg shadow-[#66B4B1]/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          Enquire <ArrowUpRight size={16} strokeWidth={2.5} />
        </button>

        {isFree && (
          <button 
            onClick={handleAdoptIntake}
            className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[16px] text-[14px] font-black shadow-lg shadow-emerald-600/15 active:scale-95 transition-all"
          >
            Apply Now
          </button>
        )}
      </div>

    </div>
  );
}
