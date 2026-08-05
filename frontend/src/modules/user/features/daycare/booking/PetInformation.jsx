import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Check, ChevronDown } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';
import { fetchMyPets, toLegacyPet } from '../../../../../services/pets';

export function PetInformation() {
  const navigate = useNavigate();
  const { selectedPet, setPet, petAnswers, setPetAnswers } = useDaycareStore();

  // User pets from the API
  const [pets, setPets] = useState([]);

  useEffect(() => {
    fetchMyPets()
      .then((apiPets) => setPets(apiPets.map(toLegacyPet)))
      .catch(() => setPets([]));
  }, []);

  const handleContinue = () => {
    if (selectedPet) {
      navigate('/app/services/daycare/book/pickup');
    }
  };

  const handleAnswer = (key, value) => {
    setPetAnswers({ ...petAnswers, [key]: value });
  };

  const isComplete = selectedPet && 
                     petAnswers.breed && 
                     petAnswers.age && 
                     petAnswers.size && 
                     petAnswers.gender && 
                     petAnswers.aggressive !== null && 
                     petAnswers.separationAnxiety !== null && 
                     petAnswers.skinIssues !== null;

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">
      
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 ml-4 flex-1 text-center pr-8">Pet Information</h1>
      </div>

      <div className="px-5 pt-2">
        
        {/* Select Pet */}
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">Select Pet</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 mb-6 -mx-5 px-5">
          {pets.map(pet => {
            const isSelected = selectedPet?.id === pet.id;
            return (
              <div 
                key={pet.id}
                onClick={() => setPet(pet)}
                className={`relative shrink-0 flex items-center gap-3 bg-white rounded-[16px] p-2 pr-4 border transition-all cursor-pointer ${
                  isSelected ? 'border-[#66B4B1] shadow-sm' : 'border-gray-200 hover:border-[#66B4B1]/50'
                }`}
              >
                <img src={pet.image} alt={pet.name} className="w-12 h-12 rounded-[12px] object-cover" />
                <div>
                  <h3 className={`text-[14px] font-bold ${isSelected ? 'text-[#66B4B1]' : 'text-gray-900'}`}>{pet.name}</h3>
                  <p className="text-[11px] text-gray-500 font-medium">{pet.breed}</p>
                </div>
              </div>
            );
          })}
          
          <button className="shrink-0 flex flex-col items-center justify-center gap-1 w-20 bg-white rounded-[16px] p-2 border border-dashed border-gray-300 hover:border-[#66B4B1]/50 transition-all">
            <Plus size={20} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500">Add New</span>
          </button>
        </div>

        {/* Form Fields */}
        {selectedPet && (
          <div className="animate-in fade-in duration-300 space-y-4 mb-6">
            
            <div>
              <label className="text-[13px] font-bold text-gray-900 block mb-2">Breed</label>
              <div className="relative">
                <select 
                  value={petAnswers.breed}
                  onChange={(e) => handleAnswer('breed', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                >
                  <option value="">Select Breed</option>
                  <option value="Golden Retriever">Golden Retriever</option>
                  <option value="Labrador">Labrador</option>
                  <option value="German Shepherd">German Shepherd</option>
                  <option value="Pug">Pug</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[13px] font-bold text-gray-900 block mb-2">Age</label>
                <div className="relative">
                  <select 
                    value={petAnswers.age}
                    onChange={(e) => handleAnswer('age', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                  >
                    <option value="">Select</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="4+ Years">4+ Years</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[13px] font-bold text-gray-900 block mb-2">Size</label>
                <div className="relative">
                  <select 
                    value={petAnswers.size}
                    onChange={(e) => handleAnswer('size', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                  >
                    <option value="">Select</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-gray-900 block mb-2">Gender</label>
              <div className="relative">
                <select 
                  value={petAnswers.gender}
                  onChange={(e) => handleAnswer('gender', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Questions */}
            <div className="pt-2 space-y-4">
              {[
                { key: 'aggressive', label: 'Is your pet aggressive?' },
                { key: 'separationAnxiety', label: 'Separation anxiety?' },
                { key: 'skinIssues', label: 'Any skin issues or allergies?' },
              ].map(q => (
                <div key={q.key} className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-gray-900">{q.label}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAnswer(q.key, false)}
                      className={`w-16 h-8 rounded-full text-[13px] font-bold transition-all border ${
                        petAnswers[q.key] === false
                          ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/30'
                      }`}
                    >
                      No
                    </button>
                    <button 
                      onClick={() => handleAnswer(q.key, true)}
                      className={`w-16 h-8 rounded-full text-[13px] font-bold transition-all border ${
                        petAnswers[q.key] === true
                          ? 'bg-white border-[#66B4B1] text-[#66B4B1] shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#66B4B1]/30'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <div className="pt-4">
              <label className="text-[13px] font-bold text-gray-900 block mb-2">Special Instructions (Optional)</label>
              <textarea 
                rows="3"
                value={petAnswers.instructions}
                onChange={(e) => handleAnswer('instructions', e.target.value)}
                placeholder="E.g. Don't feed table food, allergic to chicken"
                className="w-full bg-white border border-gray-200 rounded-[16px] p-4 text-[13px] font-medium outline-none focus:border-[#66B4B1] transition-all resize-none placeholder:text-gray-400"
              ></textarea>
            </div>

          </div>
        )}

      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={handleContinue}
          disabled={!isComplete}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
