import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGroomingStore } from '../../../../../store/useGroomingStore';
import { fetchMyPets, toLegacyPet } from '../../../../../services/pets';

export function PetDetails() {
  const navigate = useNavigate();
  const shop = useGroomingStore(state => state.bookingData.shop);
  const selectedPet = useGroomingStore(state => state.bookingData.pet);
  const setPet = useGroomingStore(state => state.setPet);

  // User pets from the API
  const [pets, setPets] = useState([]);

  useEffect(() => {
    fetchMyPets()
      .then((apiPets) =>
        setPets(apiPets.map((p) => ({ ...toLegacyPet(p), type: p.type })))
      )
      .catch(() => setPets([]));
  }, []);

  if (!shop) {
    navigate('/app/services/grooming');
    return null;
  }

  const handleContinue = () => {
    if (selectedPet) {
      navigate('/app/services/grooming/book/address');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95">
            <ArrowLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="text-[19px] font-black text-gray-900">Select Pet</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 hide-scrollbar">
        <p className="text-[14px] text-gray-500 font-medium mb-6 px-1">Which pet is this booking for?</p>
        
        <div className="space-y-4">
          {pets.map(pet => {
            const isSelected = selectedPet?.id === pet.id;
            return (
              <div 
                key={pet.id}
                onClick={() => setPet(pet)}
                className={`flex items-center p-3 rounded-[24px] border-2 cursor-pointer transition-all bg-white ${
                  isSelected ? 'border-[#66B4B1] shadow-md scale-[1.01]' : 'border-gray-100 shadow-sm hover:border-[#66B4B1]/30'
                }`}
              >
                <img src={pet.image} alt={pet.name} className="w-16 h-16 rounded-[16px] object-cover mr-4" />
                <div className="flex-1">
                  <h3 className={`text-[16px] font-black mb-0.5 ${isSelected ? 'text-[#66B4B1]' : 'text-gray-900'}`}>{pet.name}</h3>
                  <p className="text-[13px] text-gray-500 font-medium">{pet.breed} • {pet.age}</p>
                </div>
                <div className="mr-2">
                  {isSelected && <CheckCircle2 size={24} className="text-[#66B4B1] fill-[#66B4B1]/10" />}
                </div>
              </div>
            );
          })}

          <button className="w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-[24px] border-2 border-dashed border-gray-300 text-gray-500 font-bold text-[15px] hover:border-[#66B4B1] hover:text-[#66B4B1] transition-colors bg-white">
            <Plus size={20} /> Add New Pet
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={handleContinue}
          disabled={!selectedPet}
          className={`w-full py-4 rounded-[16px] font-bold text-[15px] shadow-lg transition-all flex items-center justify-center gap-2 ${
            selectedPet 
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
