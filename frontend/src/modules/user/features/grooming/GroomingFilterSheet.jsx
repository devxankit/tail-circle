import React, { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

export function GroomingFilterSheet({ isOpen, onClose }) {
  const [petType, setPetType] = useState('Dog');
  const [visitType, setVisitType] = useState('Salon Visit');
  const [distance, setDistance] = useState(5);
  const [priceRange, setPriceRange] = useState('Under ₹499');
  const [rating, setRating] = useState('4.5+');
  const [serviceTypes, setServiceTypes] = useState(['Bath']);

  if (!isOpen) return null;

  const toggleService = (service) => {
    setServiceTypes(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto hide-scrollbar pb-6 shadow-2xl">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <X size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button onClick={() => {
            setPetType('Dog'); setVisitType('Salon Visit'); setDistance(5); setPriceRange('Under ₹499'); setRating('4.5+'); setServiceTypes(['Bath']);
          }} className="text-[#66B4B1] font-bold text-sm">
            Reset
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Pet Type */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 text-[15px]">Pet Type</h3>
            <div className="flex gap-3">
              {['Dog', 'Cat'].map(type => (
                <button 
                  key={type}
                  onClick={() => setPetType(type)}
                  className={`flex-1 py-3 rounded-[16px] font-bold text-sm border-2 transition-all ${petType === type ? 'border-[#66B4B1] bg-[#66B4B1] text-white shadow-md' : 'border-gray-200 text-gray-600 bg-white hover:border-[#66B4B1]/50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Service Type */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 text-[15px]">Service Type</h3>
            <div className="flex flex-wrap gap-2">
              {['Bath', 'Haircut', 'Nail Trim', 'Ear Cleaning', 'Full Grooming', 'Anti Tick', 'Spa'].map(service => (
                <button 
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`px-4 py-2 rounded-full font-bold text-[13px] border-2 transition-all ${serviceTypes.includes(service) ? 'border-[#66B4B1] bg-[#66B4B1]/10 text-[#66B4B1]' : 'border-gray-200 text-gray-600 bg-white hover:border-[#66B4B1]/50'}`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 text-[15px]">Visit Type</h3>
            <div className="flex gap-3">
              {['Home Visit', 'Salon Visit'].map(type => (
                <button 
                  key={type}
                  onClick={() => setVisitType(type)}
                  className={`flex-1 py-3 rounded-[16px] font-bold text-sm border-2 transition-all ${visitType === type ? 'border-[#66B4B1] bg-[#66B4B1] text-white shadow-md' : 'border-gray-200 text-gray-600 bg-white hover:border-[#66B4B1]/50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 text-[15px]">Distance</h3>
              <span className="text-[#66B4B1] font-bold text-sm">{distance} KM</span>
            </div>
            <input 
              type="range" 
              min="1" max="25" 
              value={distance} 
              onChange={(e) => setDistance(e.target.value)}
              className="w-full accent-[#66B4B1] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 font-medium mt-2">
              <span>1 KM</span>
              <span>10 KM</span>
              <span>25 KM</span>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 text-[15px]">Price Range</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Under ₹499', '₹500 - ₹999', '₹1000 - ₹1999', '₹2000+'].map(price => (
                <button 
                  key={price}
                  onClick={() => setPriceRange(price)}
                  className={`py-2.5 rounded-[12px] font-bold text-[13px] border-2 transition-all ${priceRange === price ? 'border-[#66B4B1] bg-[#66B4B1] text-white shadow-md' : 'border-gray-200 text-gray-600 bg-white hover:border-[#66B4B1]/50'}`}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 text-[15px]">Rating</h3>
            <div className="flex gap-2">
              {['4.5+', '4.0+', '3.5+', 'Any'].map(r => (
                <button 
                  key={r}
                  onClick={() => setRating(r)}
                  className={`flex-1 py-2.5 rounded-[12px] font-bold text-[13px] border-2 transition-all ${rating === r ? 'border-[#66B4B1] bg-[#66B4B1] text-white shadow-md' : 'border-gray-200 text-gray-600 bg-white hover:border-[#66B4B1]/50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-4 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-[16px] font-bold text-[15px] border-2 border-gray-200 text-gray-700 bg-white active:scale-95 transition-transform"
            >
              Clear All
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-[16px] font-bold text-[15px] bg-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/30 active:scale-95 transition-transform"
            >
              Apply Filters
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
