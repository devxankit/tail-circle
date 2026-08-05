import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { cn } from '../../utils/cn';
import { updatePet } from '../../../../services/pets';

export function Step3Health() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [neutered, setNeutered] = useState(false);
  const [vaccinated, setVaccinated] = useState(true);
  const [weight, setWeight] = useState('');
  const [diet, setDiet] = useState('');
  const [error, setError] = useState('');

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    try {
      const petId = localStorage.getItem('tc_onboarding_pet_id');
      if (petId) {
        await updatePet(petId, {
          ...(weight ? { weightKg: Number(weight) } : {}),
          ...(diet.trim() ? { diet: diet.trim() } : {}),
          health: { vaccinated, neutered },
        });
        localStorage.removeItem('tc_onboarding_pet_id');
      }
      navigate('/app/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 pb-10">
      {/* Progress Bar */}
      <div className="w-full bg-border-light h-2 rounded-full mb-8">
        <div className="bg-[#66B4B1] w-full h-2 rounded-full transition-all duration-500"></div>
      </div>

      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Health & Care</h1>
        <p className="text-text-secondary text-sm">Help us provide better recommendations.</p>
      </div>

      <form className="flex flex-col space-y-6 flex-1">
        <InputField 
          label="Weight (kg)" 
          type="number" 
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 15" 
          className="focus-visible:ring-[#80C1BF]/20 focus-visible:border-[#66B4B1]"
        />
        
        <InputField 
          label="Dietary Restrictions / Allergies" 
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
          placeholder="e.g. Grain-free, Chicken" 
          className="focus-visible:ring-[#80C1BF]/20 focus-visible:border-[#66B4B1]"
        />

        <div className="flex items-center justify-between p-4 border border-border-light rounded-2xl bg-white shadow-sm">
          <div>
            <h3 className="font-bold text-[15px] text-text-primary">Neutered / Spayed</h3>
            <p className="text-xs text-text-secondary">Important for playdate matching</p>
          </div>
          <button 
            type="button"
            onClick={() => setNeutered(!neutered)}
            className={cn(
              "w-12 h-7 rounded-full transition-colors relative flex items-center px-1 shadow-sm",
              neutered ? "bg-[#66B4B1]" : "bg-border-light"
            )}
          >
            <div className={cn(
              "w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
              neutered ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-border-light rounded-2xl bg-white shadow-sm">
          <div>
            <h3 className="font-bold text-[15px] text-text-primary">Vaccinated</h3>
            <p className="text-xs text-text-secondary">Up to date with core vaccines</p>
          </div>
          <button 
            type="button"
            onClick={() => setVaccinated(!vaccinated)}
            className={cn(
              "w-12 h-7 rounded-full transition-colors relative flex items-center px-1 shadow-sm",
              vaccinated ? "bg-[#66B4B1]" : "bg-border-light"
            )}
          >
            <div className={cn(
              "w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
              vaccinated ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>

        <div className="mt-auto pt-8">
          {error && (
            <p className="text-center text-xs font-bold text-red-500 mb-3 animate-in fade-in duration-200">{error}</p>
          )}
          <Button type="button" onClick={handleComplete} isLoading={isLoading} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 bg-[#F87B68] hover:bg-[#F87B68]/90 border-0">
            Complete Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
