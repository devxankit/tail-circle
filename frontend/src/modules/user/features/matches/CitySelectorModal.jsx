import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Search, Check, Building2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { searchPlaces, getCoordsForPlace, reverseGeocodeCoords } from '../../../../services/googleMaps';

export const POPULAR_CITIES = [
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, state: 'Delhi' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  { name: 'Indore', lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  { name: 'Goa', lat: 15.2993, lng: 74.1240, state: 'Goa' },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, state: 'Punjab' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
];

export function CitySelectorModal({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Handle Google Places Autocomplete search input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setGoogleSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchQuery);
        setGoogleSuggestions(results || []);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const filteredPopularCities = POPULAR_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          try {
            const geocodedCity = await reverseGeocodeCoords(lat, lng);
            setIsLocating(false);
            onSelectCity(geocodedCity);
            onClose();
          } catch {
            setIsLocating(false);
            onSelectCity({ name: 'Current Location', lat, lng, isGps: true });
            onClose();
          }
        },
        () => {
          setIsLocating(false);
          alert('Could not retrieve current location. Please pick a city from the list.');
        },
        { timeout: 6000 }
      );
    } else {
      setIsLocating(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSelectGooglePlace = async (place) => {
    try {
      setIsSearching(true);
      const coords = await getCoordsForPlace(place.placeId, place.description);
      onSelectCity(coords);
      onClose();
    } catch (err) {
      alert(`Could not fetch coordinates for ${place.mainText}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (city) => {
    onSelectCity(city);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-lg p-6 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#e8f4f3] text-[#4C8684] flex items-center justify-center shrink-0 shadow-xs">
              <MapPin size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">Select Location</h2>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Discover nearby pet playdates in any city</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-90"
            type="button"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* GPS Current Location Action Button */}
        <div className="pt-4 shrink-0">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full py-3.5 px-4 bg-[#f0f8f7] hover:bg-[#e4f3f2] border border-[#c2e4e2] text-[#346260] rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.99] disabled:opacity-60"
          >
            <Navigation size={17} className={cn('text-[#4C8684]', isLocating && 'animate-spin')} strokeWidth={2.5} />
            <span>{isLocating ? 'Detecting GPS Coordinates...' : 'Use My Current GPS Location'}</span>
          </button>
        </div>

        {/* Google Places Search input */}
        <div className="pt-3 pb-3 shrink-0">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any city or location (e.g. Indore, Bhopal, Delhi)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4C8684] focus:ring-2 focus:ring-[#4C8684]/20 transition"
            />
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
            {isSearching && (
              <Loader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4C8684] animate-spin" />
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-1 hide-scrollbar">
          {/* Live Google Places Autocomplete Suggestions */}
          {googleSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles size={13} className="text-[#4C8684]" />
                <span className="text-[10px] font-black uppercase text-[#4C8684] tracking-wider">
                  Google Places Results
                </span>
              </div>
              <div className="space-y-1.5">
                {googleSuggestions.map((place) => (
                  <button
                    key={place.placeId}
                    type="button"
                    onClick={() => handleSelectGooglePlace(place)}
                    className="w-full text-left px-4 py-3 rounded-2xl text-xs font-bold bg-[#f4fbfb] border border-[#d2ecea] text-slate-900 hover:bg-[#eaf7f6] hover:border-[#4C8684] transition flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white text-[#4C8684] flex items-center justify-center shrink-0 border border-slate-100 shadow-2xs">
                        <MapPin size={16} strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 text-xs">{place.mainText}</span>
                        {place.secondaryText && (
                          <span className="block text-[10px] font-semibold text-slate-500 truncate max-w-[260px] mt-0.5">
                            {place.secondaryText}
                          </span>
                        )}
                      </div>
                    </div>
                    <Check size={16} className="text-[#4C8684] opacity-0 group-hover:opacity-100 transition" strokeWidth={3} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Preset Cities */}
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5 px-1">
              Popular Cities
            </div>
            {filteredPopularCities.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredPopularCities.map((city) => {
                  const isSelected = selectedCity?.name === city.name;
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCity(city)}
                      className={cn(
                        'text-left p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between border',
                        isSelected
                          ? 'bg-[#eef8f7] border-[#4C8684] text-[#346260] shadow-xs'
                          : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 size={16} className={cn('shrink-0', isSelected ? 'text-[#4C8684]' : 'text-slate-400')} />
                        <div className="min-w-0">
                          <span className="block font-black text-slate-900 truncate text-xs">{city.name}</span>
                          <span className="block text-[10px] font-semibold text-slate-400 truncate">{city.state}</span>
                        </div>
                      </div>
                      {isSelected && <Check size={16} strokeWidth={3} className="text-[#4C8684] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              !googleSuggestions.length && (
                <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No matching city found for "{searchQuery}"
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
