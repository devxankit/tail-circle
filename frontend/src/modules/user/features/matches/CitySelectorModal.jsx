import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Search, Check, Loader2, Sparkles, Map } from 'lucide-react';
import { cn } from '../../utils/cn';
import { searchPlaces, getCoordsForPlace, reverseGeocodeCoords } from '../../../../services/googleMaps';

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

  // Reset search state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setGoogleSuggestions([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
          alert('Could not retrieve current location. Please search and select your city.');
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

        {/* Search input */}
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

        {/* Scrollable Container for Search Results */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-1 hide-scrollbar">
          {/* Live Google Places Autocomplete Suggestions */}
          {googleSuggestions.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles size={13} className="text-[#4C8684]" />
                <span className="text-[10px] font-black uppercase text-[#4C8684] tracking-wider">
                  Search Results
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
          ) : searchQuery.trim() && !isSearching ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No location results found for "{searchQuery}"
            </div>
          ) : (
            <div className="py-6 px-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-center space-y-2">
              <Map size={24} className="mx-auto text-[#4C8684]/60" />
              {selectedCity?.name && (
                <div className="inline-flex items-center gap-1.5 bg-[#e8f4f3] text-[#346260] px-3 py-1 rounded-full text-xs font-black">
                  <MapPin size={12} className="text-[#4C8684]" />
                  <span>Current: {selectedCity.name}</span>
                </div>
              )}
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Type any city or location above to search, or tap <strong>Use My Current GPS Location</strong> to auto-detect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
