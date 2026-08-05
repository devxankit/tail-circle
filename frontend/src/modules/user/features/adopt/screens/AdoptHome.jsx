import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, SlidersHorizontal, ChevronRight, Gift, Tag, ArrowRight, Heart, ChevronLeft } from 'lucide-react';
import { getBreedsList } from '../../../../../services/adoptApi';
import { fetchPublicBanners } from '../../../../../services/admin';

export function AdoptHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [customBanner, setCustomBanner] = useState('');

  // Breeds list from the API (with live availability counts)
  const [breeds, setBreeds] = useState([]);
  useEffect(() => {
    getBreedsList().then(setBreeds).catch(() => setBreeds([]));
  }, []);

  // Filter breeds based on search query
  const filteredBreeds = breeds.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load the admin-managed adoption banner from the API.
  useEffect(() => {
    fetchPublicBanners()
      .then((rows) => setCustomBanner((rows || []).find((b) => b.key === 'adoption')?.image || ''))
      .catch(() => setCustomBanner(''));
  }, []);


  const handleChipClick = (chipId) => {
    navigate('/app/adopt/list', { state: { presetFilter: chipId, species: 'Dog' } });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-24 animate-in fade-in duration-300">
      
      {/* Top Header App Bar */}
      <div className="bg-white sticky top-0 z-30 px-5 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/app/home')} className="p-1.5 -ml-1 hover:bg-gray-50 rounded-full transition-colors cursor-pointer text-gray-800">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
          Adopt a Dog <span className="text-[#66B4B1] text-sm">🐾</span>
        </h1>
        <div className="relative">
          <button className="p-1.5 hover:bg-gray-50 rounded-full transition-colors relative cursor-pointer text-gray-800">
            <Bell size={22} strokeWidth={2.5} />
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#F87B68] rounded-full flex items-center justify-center text-[9.5px] text-white font-black shadow-sm border border-white">
              3
            </span>
          </button>
        </div>
      </div>

      <div className="px-5 pt-5">
        
        {/* Dynamic Adoption Banner - Admin Configurable Banner (Now at the very top of content) */}
        <div className="mb-4">
          {customBanner ? (
            <div className="w-full rounded-[26px] overflow-hidden shadow-sm border border-gray-100/50">
              <img 
                src={customBanner} 
                alt="Adoption Promo Banner" 
                className="w-full h-auto max-h-[180px] object-cover block" 
              />
            </div>
          ) : (
            // Default fall-back banner if Admin has not configured any banner yet
            <div 
              onClick={() => handleChipClick('free')}
              className="w-full rounded-[26px] overflow-hidden shadow-sm border border-gray-100/50 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <img 
                src="/assets/banners/banner_adopt.png" 
                alt="Adoption Promo Banner" 
                className="w-full h-auto block" 
              />
            </div>
          )}
        </div>

        {/* User Adoption Pet Listing CTA Card */}
        <div className="mb-5 p-4 bg-[#66B4B1] text-white rounded-[24px] shadow-sm flex items-center justify-between">
          <div className="pr-2">
            <h3 className="text-[14px] font-black tracking-tight">Have a Pet to Rehome?</h3>
            <p className="text-[11.5px] text-white/80 font-bold mt-0.5">List your pet for adoption & find loving parents.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate('/app/adopt/my-listings')}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-[14px] font-black text-[11px] border border-white/30 transition-all cursor-pointer"
            >
              My Pets
            </button>
            <button
              onClick={() => navigate('/app/adopt/list-pet')}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 text-[#599D9A] rounded-[14px] font-black text-[11px] shadow-sm transition-all cursor-pointer active:scale-95"
            >
              + List Pet
            </button>
          </div>
        </div>

        {/* Search Input (Positioned cleanly below the banner) */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search dog breeds..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200/80 rounded-[20px] py-3.5 pl-11 pr-12 text-[14px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1] shadow-sm transition-all"
          />
          <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#66B4B1] transition-colors">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Horizontal Category Chips Row */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2.5 pb-3.5 mb-5 mt-1 snap-x snap-mandatory">
          {/* Free Adoption */}
          <button 
            onClick={() => handleChipClick('free')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <Gift size={15} strokeWidth={2.5} className="text-emerald-500" />
            <span>Free Adoption</span>
          </button>

          {/* For Sale */}
          <button 
            onClick={() => handleChipClick('sale')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <Tag size={15} strokeWidth={2.5} className="text-orange-500" />
            <span>For Sale</span>
          </button>

          {/* Male */}
          <button 
            onClick={() => handleChipClick('male')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="10" cy="14" r="5" />
              <path d="M13 11 L19 5 M14 5 H19 V10" />
            </svg>
            <span>Male</span>
          </button>

          {/* Female */}
          <button 
            onClick={() => handleChipClick('female')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="9" r="5" />
              <path d="M12 14 V20 M9 17 H15" />
            </svg>
            <span>Female</span>
          </button>

          {/* Puppy */}
          <button 
            onClick={() => handleChipClick('puppy')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M4 10c0-3.3 2.7-6 6-6s6 2.7 6 6v3c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3v-3z" />
              <circle cx="8.5" cy="10.5" r="0.8" fill="#F59E0B" />
              <circle cx="15.5" cy="10.5" r="0.8" fill="#F59E0B" />
              <path d="M10 14.2c.5.5 1.5.5 2 0" />
            </svg>
            <span>Puppy</span>
          </button>

          {/* Adult */}
          <button 
            onClick={() => handleChipClick('adult')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-750 border border-gray-200/60 rounded-full font-bold text-[12.5px] transition-all active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer shrink-0 snap-start"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M5 16V9c0-3.9 3.1-7 7-7s7 3.1 7 7v7a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
              <circle cx="9" cy="11" r="0.8" fill="#A855F7" />
              <circle cx="15" cy="11" r="0.8" fill="#A855F7" />
              <path d="M10 15h4" />
            </svg>
            <span>Adult</span>
          </button>
        </div>

        {/* Popular Breeds Section */}
        <div className="flex justify-between items-center mb-4 pl-0.5">
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Popular Breeds</h2>
          <button 
            onClick={() => navigate('/app/adopt/list', { state: { species: 'Dog' } })}
            className="text-[13px] font-black text-[#66B4B1] hover:text-[#4C8684] flex items-center gap-0.5"
          >
            See All <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>

        {/* Grid of Breed Cards - 2 Columns */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {filteredBreeds.map((breed, idx) => (
            <div
              key={idx}
              onClick={() => navigate('/app/adopt/list', { state: { breed: breed.name, species: 'Dog' } })}
              className="bg-white p-3 rounded-[26px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Breed Image */}
                <div className="w-full h-[140px] rounded-[18px] overflow-hidden mb-3 bg-gray-50 border border-gray-100">
                  <img src={breed.image} alt={breed.name} className="w-full h-full object-cover" />
                </div>
                {/* Breed Details */}
                <div className="px-1">
                  <h3 className="text-[14px] font-black text-gray-900 leading-tight mb-1 truncate">
                    {breed.name}
                  </h3>
                  <p className="text-[11.5px] text-gray-500 font-bold mb-2.5 line-clamp-1">
                    {breed.traits}
                  </p>
                </div>
              </div>

              {/* Badges Footer */}
              <div className="px-1 pb-1 flex items-center justify-between mt-2.5">
                <span className="text-[12.5px] font-bold text-gray-600 flex items-center gap-1">
                  🐾 {breed.count} Available
                </span>
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  {breed.size}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Assistance Banner */}
        <div className="rounded-[26px] bg-[#FAF7F2] p-5 flex items-center justify-between min-h-[135px] border border-[#FCEAE7]/30 shadow-sm mb-6 relative overflow-hidden">
          <div className="w-[60%] z-10">
            <h3 className="text-[16px] font-black text-[#D96B5B] leading-snug mb-1">
              Can't find what you're looking for?
            </h3>
            <p className="text-[12px] text-[#F87B68] font-bold mb-4 leading-snug">
              We can help you find your perfect match.
            </p>
            <button className="bg-[#66B4B1] hover:bg-[#4C8684] active:scale-95 text-white px-4 py-2.5 rounded-[12px] text-[12px] font-black w-max flex items-center gap-1 shadow-sm transition-all">
              Request Assistance
            </button>
          </div>
          <div className="absolute right-0 bottom-0 w-[42%] h-[90%] pointer-events-none z-0">
            <div className="relative w-full h-full flex items-end justify-end">
              <img 
                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=250&q=80" 
                className="w-full h-[95%] object-contain object-bottom mix-blend-multiply" 
                alt="assistance dog"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
