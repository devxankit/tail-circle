import React, { useState } from 'react';
import { X } from 'lucide-react';

export function DaycareFilters({ isOpen, onClose, onApply }) {
  const [petType, setPetType] = useState('Dog');
  const [distance, setDistance] = useState('3 km');
  const [priceRange, setPriceRange] = useState('₹400-₹700');
  const [rating, setRating] = useState('4.5+');
  const [facilities, setFacilities] = useState([]);
  const [openToday, setOpenToday] = useState(false);
  const [vaccinationRequired, setVaccinationRequired] = useState(true);

  if (!isOpen) return null;

  const toggleFacility = (facility) => {
    if (facilities.includes(facility)) {
      setFacilities(facilities.filter(f => f !== facility));
    } else {
      setFacilities([...facilities, facility]);
    }
  };

  const clearAll = () => {
    setPetType('Dog');
    setDistance('Any');
    setPriceRange('Any');
    setRating('Any');
    setFacilities([]);
    setOpenToday(false);
    setVaccinationRequired(false);
  };

  const handleApply = () => {
    // In a real app, we would pass these filters to the parent/API
    onApply();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[85vh] rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <X size={24} className="text-gray-900" />
          </button>
          <h2 className="text-[18px] font-black text-gray-900">Filters</h2>
          <button onClick={clearAll} className="text-[14px] font-bold text-[#66B4B1] active:opacity-70">
            Reset
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 hide-scrollbar">
          
          {/* Pet Type */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Pet Type</h3>
            <div className="flex bg-gray-50 p-1 rounded-full border border-gray-200">
              {['Dog', 'Cat'].map((type) => (
                <button
                  key={type}
                  onClick={() => setPetType(type)}
                  className={`flex-1 py-2.5 rounded-full text-[14px] font-bold transition-all ${
                    petType === type 
                      ? 'bg-[#66B4B1] text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Distance</h3>
            <div className="flex flex-wrap gap-2">
              {['1 km', '3 km', '5 km', '10+ km'].map((dist) => (
                <button
                  key={dist}
                  onClick={() => setDistance(dist)}
                  className={`px-4 py-2 rounded-[12px] text-[13px] font-bold border transition-all ${
                    distance === dist
                      ? 'bg-[#66B4B1] border-[#66B4B1] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {dist}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Price Range (per day)</h3>
            <div className="flex flex-wrap gap-2">
              {['Under ₹400', '₹400 - ₹700', '₹700 - ₹1000', '₹1000+'].map((price) => (
                <button
                  key={price}
                  onClick={() => setPriceRange(price)}
                  className={`px-4 py-2 rounded-[12px] text-[13px] font-bold border transition-all ${
                    priceRange === price
                      ? 'bg-[#66B4B1] border-[#66B4B1] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Rating</h3>
            <div className="flex flex-wrap gap-2">
              {['4.5+', '4.0+', '3.5+', 'Any'].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setRating(rate)}
                  className={`px-4 py-2 rounded-[12px] text-[13px] font-bold border transition-all ${
                    rating === rate
                      ? 'bg-[#66B4B1] border-[#66B4B1] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Facilities</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { id: 'ac', icon: '❄️', label: 'AC Facility' },
                { id: 'cctv', icon: '📹', label: 'CCTV' },
                { id: 'pickup', icon: '🚗', label: 'Pickup & Drop' },
                { id: 'vet', icon: '🩺', label: 'Vet on Call' },
                { id: 'play', icon: '🎾', label: 'Play Area' },
                { id: 'food', icon: '🍖', label: 'Food Included' },
                { id: 'overnight', icon: '🌙', label: 'Overnight Stay' },
              ].map((fac) => {
                const isSelected = facilities.includes(fac.label);
                return (
                  <button
                    key={fac.id}
                    onClick={() => toggleFacility(fac.label)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-[16px] border transition-all ${
                      isSelected
                        ? 'bg-[#66B4B1]/5 border-[#66B4B1]'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-[20px]">{fac.icon}</span>
                    <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? 'text-[#66B4B1]' : 'text-gray-600'}`}>
                      {fac.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* More Filters */}
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-4">More Filters</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-gray-700">Open Today</span>
                <button 
                  onClick={() => setOpenToday(!openToday)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${openToday ? 'bg-[#66B4B1]' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${openToday ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-gray-700">Vaccination Required</span>
                <button 
                  onClick={() => setVaccinationRequired(!vaccinationRequired)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${vaccinationRequired ? 'bg-[#66B4B1]' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${vaccinationRequired ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
          <button 
            onClick={clearAll}
            className="flex-1 py-4 rounded-[16px] font-bold text-[15px] text-[#66B4B1] border-2 border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 active:scale-95 transition-all"
          >
            Clear All
          </button>
          <button 
            onClick={handleApply}
            className="flex-[2] py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
