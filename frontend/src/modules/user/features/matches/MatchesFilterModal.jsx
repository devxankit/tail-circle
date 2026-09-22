import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { fetchBreeds } from '../../../../services/pets';

/*
 * Dog and cat breeds come from `GET /breeds`, the same catalog Add Pet and
 * onboarding use. These lists are the offline fallback only — a hand-kept copy
 * is how this filter drifted out of sync with the catalog in the first place,
 * offering 11 dog breeds against a catalog of 62 and silently filtering the
 * deck by names no pet could be stored under.
 *
 * The species below have no catalog entries, so their lists stay static.
 */
const fallbackBreedsByPetType = {
  Dog: ['Any', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Pug', 'Siberian Husky', 'Shih Tzu', 'Rottweiler', 'Doberman Pinscher', 'Indie / Indian Pariah'],
  Cat: ['Any', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Bengal', 'Indian Domestic / Indie Cat'],
  Bird: ['Any', 'Cockatiel', 'Parrot', 'Finch', 'Other'],
  Rabbit: ['Any', 'Angora', 'Lop', 'Other'],
  Fish: ['Any', 'Goldfish', 'Betta', 'Other'],
  Hamster: ['Any', 'Syrian', 'Dwarf', 'Other'],
  Other: ['Any']
};

const filterOptions = {
  type: ['Any', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Hamster', 'Other'],
  breedMode: ['All Breeds', 'Same Breed'],
  gender: ['Any', 'Male', 'Female'],
  age: ['Any', '0-1 Year', '1-3 Years', '3-5 Years', '5-8 Years', '8+ Years'],
  distance: ['Anywhere', 'Within 1 KM', 'Within 5 KM', 'Within 10 KM', 'Within 25 KM', 'Within 50 KM'],
  size: ['Any', 'Small', 'Medium', 'Large'], // Dog only
  vaccinationStatus: ['Any', 'Vaccinated', 'Partially Vaccinated', 'Not Vaccinated'],
  neutered: ['Any', 'Yes', 'No'],
  activityLevel: ['Any', 'Low', 'Medium', 'High'],
  // Temperament is the only thing compatibility is scored on now, so these
  // have to be the engine's own values — a chip it does not recognise filters
  // the deck down to pets that can never match.
  temperament: [
    'Friendly', 'Calm', 'Gentle', 'Playful', 'Energetic', 'Curious',
    'Confident', 'Shy', 'Easy-going', 'Affectionate', 'Independent',
    'Sensitive', 'Cautious', 'Adaptable', 'Excitable', 'Reserved',
    'Aggressive',
  ],
  compatibility: ['Good With Dogs', 'Good With Cats', 'Good With Kids', 'Good With Families'],
  purpose: ['Any', 'Friendship', 'Playdate', 'Breeding', 'Adoption', 'Training Partner', 'Walking Partner'],
  availability: ['Any', 'Available Today', 'Available This Week', 'Available Anytime']
};

export function MatchesFilterModal({ isOpen, onClose, currentFilters, onApply }) {
  const [localFilters, setLocalFilters] = useState(currentFilters);
  const [breedsByPetType, setBreedsByPetType] = useState(fallbackBreedsByPetType);

  // Reload the draft from the applied filters each time the sheet opens, so a
  // cancelled edit is discarded. The open/closed state is owned by the parent,
  // which makes this a sync from outside rather than derivable state.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Live breed catalog, fetched once the modal is first opened. Failure leaves
  // the fallback lists in place rather than emptying the dropdown.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    Promise.all([fetchBreeds('dog'), fetchBreeds('cat')])
      .then(([dogs, cats]) => {
        if (cancelled || !dogs?.length || !cats?.length) return;
        setBreedsByPetType((prev) => ({
          ...prev,
          Dog: ['Any', ...dogs.map((b) => b.name)],
          Cat: ['Any', ...cats.map((b) => b.name)],
        }));
      })
      .catch(() => { /* keep the fallback lists */ });

    return () => { cancelled = true; };
  }, [isOpen]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const defaultFilters = {
      type: 'Any',
      breedMode: 'All Breeds',
      gender: 'Any',
      age: 'Any',
      distance: 'Anywhere',
      breed: 'Any',
      size: 'Any',
      vaccinationStatus: 'Any',
      neutered: 'Any',
      activityLevel: 'Any',
      temperament: [],
      compatibility: [],
      purpose: 'Any',
      availability: 'Any'
    };
    setLocalFilters(defaultFilters);
  };

  const setFilter = (key, value) => {
    if (key === 'type' && localFilters.type !== value) {
      // Reset breed and size if type changes
      setLocalFilters({ ...localFilters, [key]: value, breed: 'Any', size: 'Any' });
    } else {
      setLocalFilters({ ...localFilters, [key]: value });
    }
  };

  const toggleArrayFilter = (key, value) => {
    const currentArray = localFilters[key];
    if (currentArray.includes(value)) {
      setLocalFilters({ ...localFilters, [key]: currentArray.filter(item => item !== value) });
    } else {
      setLocalFilters({ ...localFilters, [key]: [...currentArray, value] });
    }
  };

  if (!isOpen) return null;

  const Pill = ({ active, label, onClick }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-xs",
        active 
          ? "bg-[#F87B68] text-white border-[#F87B68] shadow-md shadow-rose-200" 
          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#4C8684] hover:text-[#4C8684]"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 sm:p-4">
      <div 
        className="relative w-full sm:w-[480px] max-w-full bg-white h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white rounded-t-3xl shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4C8684]/10 flex items-center justify-center text-[#4C8684]">
              <SlidersHorizontal size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Filters</h2>
              <p className="text-xs font-bold text-slate-400">Customize discovery preferences</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-white custom-scrollbar">
          
          {/* Basic Info */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-text-disabled uppercase tracking-wider">Basic Preferences</h3>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">I'm looking for a...</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.type.map(opt => (
                  <Pill key={opt} label={opt} active={localFilters.type === opt} onClick={() => setFilter('type', opt)} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Breed Recommendation</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.breedMode.map(opt => (
                  <Pill 
                    key={opt} 
                    label={opt} 
                    active={(localFilters.breedMode || 'All Breeds') === opt} 
                    onClick={() => setFilter('breedMode', opt)} 
                  />
                ))}
              </div>
              {localFilters.breedMode === 'Same Breed' && (
                <p className="text-xs text-[#4C8684] font-medium mt-1">
                  Only pets of the same breed will be recommended.
                </p>
              )}
            </div>

            {localFilters.type !== 'Any' && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Breed</label>
                <div className="relative">
                  <select 
                    value={localFilters.breed}
                    onChange={(e) => setFilter('breed', e.target.value)}
                    className="w-full appearance-none bg-white border border-border-light rounded-xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main"
                  >
                    {(() => {
                      const opts = breedsByPetType[localFilters.type] || ['Any'];
                      // A breed saved under an older catalog must stay
                      // selectable, or the select renders blank and the next
                      // Apply silently rewrites the filter.
                      const chosen = localFilters.breed;
                      const all = chosen && !opts.includes(chosen) ? [...opts, chosen] : opts;
                      return all.map(breed => (
                        <option key={breed} value={breed}>{breed}</option>
                      ));
                    })()}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" size={18} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Distance</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.distance.map(opt => (
                  <Pill key={opt} label={opt} active={localFilters.distance === opt} onClick={() => setFilter('distance', opt)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Gender</label>
                <div className="flex flex-col gap-2">
                  {filterOptions.gender.map(opt => (
                    <Pill key={opt} label={opt} active={localFilters.gender === opt} onClick={() => setFilter('gender', opt)} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Age</label>
                <div className="relative">
                  <select 
                    value={localFilters.age}
                    onChange={(e) => setFilter('age', e.target.value)}
                    className="w-full appearance-none bg-white border border-border-light rounded-xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main"
                  >
                    {filterOptions.age.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" size={18} />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-light" />

          {/* Physical Traits */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-text-disabled uppercase tracking-wider">Health & Traits</h3>
            
            {localFilters.type === 'Dog' && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Size</label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.size.map(opt => (
                    <Pill key={opt} label={opt} active={localFilters.size === opt} onClick={() => setFilter('size', opt)} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Vaccination</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.vaccinationStatus.map(opt => (
                  <Pill key={opt} label={opt} active={localFilters.vaccinationStatus === opt} onClick={() => setFilter('vaccinationStatus', opt)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Neutered / Spayed</label>
                <div className="flex gap-2">
                  {filterOptions.neutered.map(opt => (
                    <Pill key={opt} label={opt} active={localFilters.neutered === opt} onClick={() => setFilter('neutered', opt)} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Activity Level</label>
                <div className="relative">
                  <select 
                    value={localFilters.activityLevel}
                    onChange={(e) => setFilter('activityLevel', e.target.value)}
                    className="w-full appearance-none bg-white border border-border-light rounded-xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main"
                  >
                    {filterOptions.activityLevel.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" size={18} />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-light" />

          {/* Personality & Purpose */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-text-disabled uppercase tracking-wider">Personality & Intent</h3>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary flex items-center justify-between">
                Temperament <span className="text-xs font-normal text-text-disabled">Select multiple</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.temperament.map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleArrayFilter('temperament', opt)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border",
                      localFilters.temperament.includes(opt)
                        ? "bg-primary-light border-primary-main text-primary-main"
                        : "bg-white border-border-light text-text-secondary hover:border-primary-main/50"
                    )}
                  >
                    {localFilters.temperament.includes(opt) && <Check size={14} strokeWidth={3} />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary flex items-center justify-between">
                Compatibility <span className="text-xs font-normal text-text-disabled">Select multiple</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.compatibility.map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleArrayFilter('compatibility', opt)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border",
                      localFilters.compatibility.includes(opt)
                        ? "bg-primary-light border-primary-main text-primary-main"
                        : "bg-white border-border-light text-text-secondary hover:border-primary-main/50"
                    )}
                  >
                    {localFilters.compatibility.includes(opt) && <Check size={14} strokeWidth={3} />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Purpose</label>
              <div className="relative">
                <select 
                  value={localFilters.purpose}
                  onChange={(e) => setFilter('purpose', e.target.value)}
                  className="w-full appearance-none bg-white border border-border-light rounded-xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main"
                >
                  {filterOptions.purpose.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" size={18} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Availability</label>
              <div className="flex flex-col sm:flex-row gap-2">
                {filterOptions.availability.map(opt => (
                  <Pill key={opt} label={opt} active={localFilters.availability === opt} onClick={() => setFilter('availability', opt)} />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="w-full p-5 bg-white border-t border-slate-100 flex gap-3 shrink-0 mt-auto rounded-b-3xl sm:rounded-b-3xl z-10 shadow-lg">
          <button 
            onClick={handleReset}
            className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
          >
            Clear All
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-[#4C8684] hover:bg-[#3d6b6a] transition-colors shadow-lg shadow-[#4C8684]/20 flex items-center justify-center gap-2 text-sm"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
