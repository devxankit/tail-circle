import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PawPrint, Info, Sparkles, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';
import { createPet, fetchBreeds, fetchBehaviourOptions } from '../../../../services/pets';
import { LocationField } from '../../../../components/common/LocationField';
import { getSavedLocation, saveMyLocation } from '../../../../services/location';
import { IdealProfileModal } from '../../../../components/common/IdealProfileModal';

const speciesList = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const fallbackBreeds = [
  'Indie (Indian Pariah)', 'Golden Retriever', 'Labrador', 'Beagle',
  'Pomeranian', 'German Shepherd', 'Husky', 'Poodle',
];
/*
 * Fallback only — the live list comes from `GET /pets/behaviours`, which is the
 * match engine's own taxonomy. Keeping a second hand-maintained copy here was
 * how the two drift: a chip the engine does not recognise scores as unknown
 * and quietly weakens every match it appears in.
 */
const fallbackBehaviours = [
  'Friendly', 'Calm', 'Gentle', 'Playful', 'Energetic', 'Curious',
  'Confident', 'Shy', 'Easy-going', 'Affectionate', 'Independent',
  'Sensitive', 'Cautious', 'Adaptable', 'Excitable', 'Reserved',
  'Aggressive',
];
/** Matches the API's own cap (`pet.validation.js`). */
const MAX_BEHAVIOURS = 10;


export function Step1Details() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Indie (Indian Pariah)');
  const [gender, setGender] = useState('Male');
  const [vaccinated, setVaccinated] = useState(true);
  const [age, setAge] = useState('');
  const [petName, setPetName] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [bio, setBio] = useState('');
  const [behaviours, setBehaviours] = useState([]);
  // Seeded from the account in case they already set one and came back.
  const [location, setLocation] = useState(() => getSavedLocation());
  const [behavioursList, setBehavioursList] = useState(fallbackBehaviours);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [breedList, setBreedList] = useState([...fallbackBreeds, 'Other']);
  const [showIdealModal, setShowIdealModal] = useState(false);

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

  // Behaviour chips likewise: the engine's taxonomy is the source of truth.
  useEffect(() => {
    fetchBehaviourOptions()
      .then((options) => {
        if (Array.isArray(options) && options.length) setBehavioursList(options);
      })
      .catch(() => {});
  }, []);

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
      /*
       * This used to read `tc_user_gps_city` out of sessionStorage — a key
       * written only by the match deck, a screen a new user reaches after
       * onboarding. It was therefore always empty here, and every pet created
       * during onboarding was saved with no location at all. The field above
       * asks the question instead.
       */
      const locationObj = location ? { lat: location.lat, lng: location.lng } : null;
      const userCity = location?.name || '';

      // Saved to the account too, so the next pet inherits it and the deck can
      // measure from it when the browser will not share live coordinates. A
      // failure here must not cost them the pet they just filled in.
      if (location) await saveMyLocation(location).catch(() => {});

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
        ...(locationObj ? { location: locationObj } : {}),
        ...(userCity ? { city: userCity } : {}),
        ...(location?.state ? { state: location.state } : {}),
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
      {/* Ideal Pet Profile Modal */}
      <IdealProfileModal
        isOpen={showIdealModal}
        onClose={() => setShowIdealModal(false)}
      />
      
      {/* Header Icon, Title & Actions */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FAF7F2] rounded-2xl flex items-center justify-center">
            <PawPrint size={26} className="text-[#66B4B1]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-primary">Meet Your Pet!</h1>
            <p className="text-text-secondary text-xs">Tell us about your furry family member</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-all shadow-2xs"
        >
          Skip for now
        </button>
      </div>

      {/* Ideal Profile Example Trigger Banner */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowIdealModal(true)}
          className="w-full bg-[#4C8684] hover:bg-[#3d6b6a] text-white py-2.5 px-4 rounded-2xl text-xs font-black shadow-md transition flex items-center justify-between active:scale-98 border border-teal-200/40"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-300 animate-pulse shrink-0" />
            <span>See Ideal Profile Example (Luna)</span>
          </div>
          <Eye size={15} />
        </button>
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
          {/* An owner has no way of knowing this answer is load-bearing unless
              we say so — and an inaccurate one produces bad matches for both
              pets, not just theirs. */}
          <p className="flex items-start gap-2 text-[12.5px] leading-snug text-text-secondary bg-[#FAF7F2] border border-[#66B4B1]/25 rounded-2xl px-3.5 py-2.5 ml-1 mr-1">
            <Info size={15} className="text-[#66B4B1] shrink-0 mt-[1px]" />
            <span>
              Choose your pet’s behaviour carefully. Tail Circle uses this information to understand behavioural compatibility and help you find better matches.
            </span>
          </p>
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
                    } else if (behaviours.length < MAX_BEHAVIOURS) {
                      // The API rejects more than this, and a longer list makes
                      // the compatibility read mushier, not sharper.
                      setBehaviours([...behaviours, bh]);
                    }
                  }}
                  disabled={!isSelected && behaviours.length >= MAX_BEHAVIOURS}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
                    isSelected
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm"
                      : "bg-white text-text-primary border-border-light hover:border-[#66B4B1]/50 shadow-sm",
                    !isSelected && behaviours.length >= MAX_BEHAVIOURS && "opacity-40"
                  )}
                >
                  {bh}
                </button>
              );
            })}
          </div>
        </div>

        {/* Where they are. Distance on the match deck is measured from this,
            so it is asked during onboarding rather than inferred later. */}
        <LocationField
          value={location}
          onChange={setLocation}
          label="Where do you live?"
          hint="We use this to show you pets nearby — and to show yours to them."
          autoDetect
          className="mt-2"
        />

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

        <div className="pt-6 pb-4 flex flex-col gap-3">
          <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 bg-[#F87B68] hover:bg-[#F87B68]/90 border-0">
            {isSaving ? 'Saving…' : 'Save & Continue'}
          </Button>
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            className="w-full text-center text-xs font-extrabold text-slate-400 hover:text-slate-600 py-1.5 transition-colors"
          >
            Skip for now (I will add my pet later from profile)
          </button>
        </div>
      </div>
    </div>
  );
}
