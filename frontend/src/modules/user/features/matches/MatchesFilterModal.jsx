import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

const breedsByPetType = {
  Dog: ['Any', 'Labrador', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Pug', 'Siberian Husky', 'Shih Tzu', 'Rottweiler', 'Doberman', 'Indie'],
  Cat: ['Any', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Bengal', 'Domestic'],
  Bird: ['Any', 'Cockatiel', 'Parrot', 'Finch', 'Other'],
  Rabbit: ['Any', 'Angora', 'Lop', 'Other'],
  Fish: ['Any', 'Goldfish', 'Betta', 'Other'],
  Hamster: ['Any', 'Syrian', 'Dwarf', 'Other'],
  Other: ['Any']
};

const filterOptions = {
  type: ['Any', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Hamster', 'Other'],
  gender: ['Any', 'Male', 'Female'],
  age: ['Any', '0-1 Year', '1-3 Years', '3-5 Years', '5-8 Years', '8+ Years'],
  distance: ['Anywhere', 'Within 1 KM', 'Within 5 KM', 'Within 10 KM', 'Within 25 KM', 'Within 50 KM'],
  size: ['Any', 'Small', 'Medium', 'Large'], // Dog only
  vaccinationStatus: ['Any', 'Vaccinated', 'Partially Vaccinated', 'Not Vaccinated'],
  neutered: ['Any', 'Yes', 'No'],
  activityLevel: ['Any', 'Low', 'Medium', 'High'],
  temperament: ['Friendly', 'Playful', 'Calm', 'Active', 'Protective', 'Social', 'Shy'],
  compatibility: ['Good With Dogs', 'Good With Cats', 'Good With Kids', 'Good With Families'],
  purpose: ['Any', 'Friendship', 'Playdate', 'Breeding', 'Adoption', 'Training Partner', 'Walking Partner'],
  availability: ['Any', 'Available Today', 'Available This Week', 'Available Anytime']
};

export function MatchesFilterModal({ isOpen, onClose, currentFilters, onApply }) {
  const [localFilters, setLocalFilters] = useState(currentFilters);

  // Sync local filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const defaultFilters = {
      type: 'Any',
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
        "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
        active 
          ? "bg-primary-main text-white shadow-md shadow-primary-main/20" 
          : "bg-white border border-border-light text-text-secondary hover:border-primary-main hover:text-primary-main"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative w-full sm:w-[450px] max-w-full bg-bg-main h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light bg-white rounded-t-3xl sm:rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary-main">
              <SlidersHorizontal size={16} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Filters</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary text-text-secondary transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          
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

            {localFilters.type !== 'Any' && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-text-primary">Breed</label>
                <div className="relative">
                  <select 
                    value={localFilters.breed}
                    onChange={(e) => setFilter('breed', e.target.value)}
                    className="w-full appearance-none bg-white border border-border-light rounded-xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main"
                  >
                    {breedsByPetType[localFilters.type]?.map(breed => (
                      <option key={breed} value={breed}>{breed}</option>
                    ))}
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
        <div className="w-full p-5 bg-white border-t border-border-light flex gap-4 shrink-0 mt-auto rounded-b-3xl sm:rounded-b-3xl z-10">
          <button 
            onClick={handleReset}
            className="flex-1 py-3.5 rounded-xl font-bold text-text-secondary bg-bg-main hover:bg-border-light transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary-main hover:bg-primary-dark transition-colors shadow-lg shadow-primary-main/30 flex items-center justify-center gap-2"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
