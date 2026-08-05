import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PawPrint } from 'lucide-react';
import { cn } from '../../utils/cn';
import { createPet, fetchBreeds } from '../../../../services/pets';

const speciesList = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const fallbackBreeds = [
  'Golden Retriever', 'Labrador', 'Beagle',
  'Pomeranian', 'German Shepherd', 'Indie',
  'Husky', 'Poodle',
];
const behavioursList = [
  'Friendly', 'Introvert', 'Likes water',
  'Avoids water', 'Alpha', 'Playful', 'Lazy'
];


export function Step1Details() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Golden Retriever');
  const [gender, setGender] = useState('Male');
  const [vaccinated, setVaccinated] = useState(true);
  const [age, setAge] = useState('');
  const [petName, setPetName] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [bio, setBio] = useState('');
  const [behaviours, setBehaviours] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [breedList, setBreedList] = useState([...fallbackBreeds, 'Other']);

  // Breed chips come from the server catalog per species (fallback if offline).
  useEffect(() => {
    fetchBreeds(species.toLowerCase())
      .then((breeds) => {
        if (breeds.length) setBreedList([...breeds.map((b) => b.name), 'Other']);
        else setBreedList(['Other']);
      })
      .catch(() => setBreedList([...fallbackBreeds, 'Other']));
  }, [species]);

  useEffect(() => {
    if (!breedList.includes(breed)) setBreed(breedList[0]);
  }, [breedList]);

  const handleSave = async () => {
    if (!petName.trim()) {
      setError("Pet's name is required");
      return;
    }
    setError('');
    setIsSaving(true);

    const knownTypes = { Dog: 'dog', Cat: 'cat', Bird: 'bird', Rabbit: 'rabbit' };
    const finalBreed = breed === 'Other' ? (customBreed.trim() || 'Mixed Breed') : breed;

    try {
      const pet = await createPet({
        name: petName.trim(),
        type: knownTypes[species] || 'other',
        ...(species === 'Other' && customSpecies.trim() ? { typeText: customSpecies.trim() } : {}),
        breed: finalBreed,
        gender: gender.toLowerCase(),
        ...(age ? { ageText: `${age} Years` } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        temperament: behaviours,
        health: { vaccinated },
      });
      localStorage.setItem('tc_onboarding_pet_id', pet._id);
      navigate('/onboarding/step2');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 pb-10 overflow-y-auto hide-scrollbar pt-2">
      
      {/* Header Icon & Title */}
      <div className="flex flex-col items-center justify-center space-y-4 mb-8 mt-2">
        <div className="w-16 h-16 bg-[#FAF7F2] rounded-3xl flex items-center justify-center">
          <PawPrint size={32} className="text-[#66B4B1]" />
        </div>
        <div className="text-center">
          <h1 className="text-[28px] font-black text-text-primary">Meet Your Pet!</h1>
          <p className="text-text-secondary text-[15px] mt-1 max-w-[260px] mx-auto leading-tight">
            Tell us about your furry family member to get started
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-6 flex-1 px-1">
        {/* Pet Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[15px] font-bold text-text-primary ml-1">Pet Name *</label>
          <input 
            type="text" 
            value={petName}
            onChange={(e) => {
              setPetName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Bruno, Coco, Whiskers" 
            className={cn(
              "flex h-[52px] w-full rounded-[16px] border bg-white px-4 py-2 text-base shadow-sm outline-none focus:ring-2 transition-all placeholder:text-text-disabled",
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-border-light focus:border-[#66B4B1] focus:ring-[#80C1BF]/20"
            )}
          />
          {error && <span className="text-red-500 text-xs pl-1 font-medium">{error}</span>}
        </div>
        
        {/* Species */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[15px] font-bold text-text-primary ml-1">Species</label>
          <div className="flex flex-wrap gap-2.5">
            {speciesList.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSpecies(s);
                  if (s !== 'Other') setCustomSpecies('');
                }}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border",
                  species === s 
                    ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm" 
                    : "bg-white text-text-primary border-border-light hover:border-[#66B4B1]/50 shadow-sm"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {species === 'Other' && (
            <input 
              type="text" 
              value={customSpecies}
              onChange={(e) => setCustomSpecies(e.target.value)}
              placeholder="e.g. Parrot, Hamster, Turtle" 
              className="flex h-[52px] w-full rounded-[16px] border border-border-light bg-white px-4 py-2 text-base shadow-sm outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#80C1BF]/20 transition-all placeholder:text-text-disabled mt-1 animate-in slide-in-from-top-1 duration-200"
            />
          )}
        </div>

        {/* Breed */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[15px] font-bold text-text-primary ml-1">Breed *</label>
          <div className="flex flex-wrap gap-2.5">
            {breedList.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBreed(b);
                  if (b !== 'Other') setCustomBreed('');
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
                  breed === b 
                    ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm" 
                    : "bg-white text-text-primary border-border-light hover:border-[#66B4B1]/50 shadow-sm"
                )}
              >
                {b}
              </button>
            ))}
          </div>
          {breed === 'Other' && (
            <input 
              type="text" 
              value={customBreed}
              onChange={(e) => setCustomBreed(e.target.value)}
              placeholder="e.g. Persian, Indie Cat, French Bulldog" 
              className="flex h-[52px] w-full rounded-[16px] border border-border-light bg-white px-4 py-2 text-base shadow-sm outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#80C1BF]/20 transition-all placeholder:text-text-disabled mt-1 animate-in slide-in-from-top-1 duration-200"
            />
          )}
        </div>

        {/* Age & Gender Row */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[15px] font-bold text-text-primary ml-1">Age</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 2" 
              className="flex h-[52px] w-full rounded-[16px] border border-border-light bg-white px-4 py-2 text-base shadow-sm outline-none focus:border-primary-main focus:ring-2 focus:ring-primary-main/20 transition-all placeholder:text-text-disabled"
            />
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[15px] font-bold text-text-primary ml-1">Gender</label>
            <div className="flex gap-2 h-[52px]">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={cn(
                  "flex-1 rounded-[16px] border font-bold text-[15px] transition-colors flex items-center justify-center gap-1.5 shadow-sm",
                  gender === 'Male' ? "bg-[#66B4B1] text-white border-[#66B4B1]" : "border-border-light text-text-primary bg-white"
                )}
              >
                <span className={gender === 'Male' ? "text-white/80 font-normal text-base" : "text-text-disabled font-normal text-base"}>♂</span> Male
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={cn(
                  "flex-1 rounded-[16px] border font-bold text-[15px] transition-colors flex items-center justify-center gap-1.5 shadow-sm",
                  gender === 'Female' ? "bg-[#66B4B1] text-white border-[#66B4B1]" : "border-border-light text-text-primary bg-white"
                )}
              >
                <span className={gender === 'Female' ? "text-white/80 font-normal text-base" : "text-text-disabled font-normal text-base"}>♀</span> Female
              </button>
            </div>
          </div>
        </div>

        {/* Vaccinated Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-[15px] font-bold text-text-primary">Vaccinated?</h3>
            <p className="text-sm text-text-secondary mt-0.5">All vaccines up to date</p>
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

        {/* Behaviour / Personality */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[15px] font-bold text-text-primary ml-1">Tell us about his behaviour</label>
          <div className="flex flex-wrap gap-2.5">
            {behavioursList.map((bh) => {
              const isSelected = behaviours.includes(bh);
              return (
                <button
                  key={bh}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setBehaviours(behaviours.filter(b => b !== bh));
                    } else {
                      setBehaviours([...behaviours, bh]);
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
                    isSelected
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm"
                      : "bg-white text-text-primary border-border-light hover:border-[#66B4B1]/50 shadow-sm"
                  )}
                >
                  {bh}
                </button>
              );
            })}
          </div>
        </div>

        {/* Short Bio */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-[15px] font-bold text-text-primary ml-1">Short Bio</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell other pet parents about your pet's personality..." 
            className="flex min-h-[100px] w-full rounded-[16px] border border-border-light bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#80C1BF]/20 transition-all placeholder:text-text-disabled resize-none"
          />
        </div>

        <div className="pt-6 pb-4">
          <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 bg-[#F87B68] hover:bg-[#F87B68]/90 border-0">
            {isSaving ? 'Saving…' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
