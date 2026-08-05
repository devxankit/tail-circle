import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle2, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGroomingShops } from '../../../../services/groomingApi';

export function GroomingList() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    setLoading(true);
    try {
      const data = await getGroomingShops();
      setShops(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary overflow-y-auto pb-24 hide-scrollbar">
      
      {/* Search Header */}
      <div className="bg-[#FAF7F2] pt-6 pb-4 px-4 sticky top-0 z-20 flex items-center gap-3">
        <button 
          onClick={() => navigate('/app/home')}
          className="w-12 h-12 rounded-[16px] bg-white border border-border-light flex items-center justify-center text-gray-700 shadow-sm shrink-0 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search salons or area..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white h-12 rounded-[16px] pl-12 pr-4 outline-none border border-border-light focus:border-accent-teal transition-colors text-sm font-medium shadow-sm" 
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {!loading && (
          <h2 className="text-[15px] font-bold text-gray-800 mb-4">
            {shops.length} grooming studios available
          </h2>
        )}

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[300px] bg-white rounded-[24px] animate-pulse border border-border-light"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {shops.map(shop => (
              <div 
                key={shop.id} 
                className="bg-white rounded-[24px] overflow-hidden border border-border-light shadow-sm cursor-pointer transition-all active:scale-[0.99] hover:shadow-md flex flex-col"
                onClick={() => navigate(`/app/services/grooming/${shop.id}`)}
              >
                {/* Hero Image */}
                <div className="w-full h-44 bg-gray-100 relative">
                  <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                </div>

                {/* Details Container */}
                <div className="p-3 pt-2 flex flex-col gap-2">
                  
                  {/* Title Row */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center flex-wrap gap-1.5 pr-2">
                      <h3 className="font-bold text-gray-900 text-[16px] leading-tight">
                        {shop.name}
                      </h3>
                      <CheckCircle2 size={14} className="text-[#66B4B1] mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1 text-gray-700 shrink-0 mt-0.5">
                      <Star size={12} className="fill-[#F6C0B6] text-[#F87B68]" />
                      <span className="text-[12px] font-bold">{shop.rating}</span>
                    </div>
                  </div>

                  {/* Location & Reviews */}
                  <div className="flex items-center gap-1 text-gray-500 -mt-1">
                    <MapPin size={12} />
                    <span className="text-[12px] font-medium">{shop.distance}</span>
                    <span className="text-[12px] font-medium ml-1">({shop.reviews})</span>
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-3">
                    {shop.availability.includes('Open') && (
                      <div className="flex items-center gap-1 text-[#66B4B1]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#66B4B1]"></div>
                        <span className="text-[11px] font-medium">Open Now</span>
                      </div>
                    )}
                    <div className="flex gap-3 ml-auto">
                      {shop.supportedPets?.includes('Dogs') && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="text-[10px]">🐕</span>
                          <span className="text-[11px] font-medium">Dogs</span>
                        </div>
                      )}
                      {shop.supportedPets?.includes('Cats') && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="text-[10px]">🐈</span>
                          <span className="text-[11px] font-medium">Cats</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Services Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {shop.servicesList?.map((svc, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[11px] font-medium">
                        {svc.name}
                      </span>
                    ))}
                  </div>

                  {/* Pricing & CTA */}
                  <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-medium leading-none mb-1">Starting from</span>
                      <span className="text-[16px] font-black text-gray-900 leading-none">₹{shop.startingPrice}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/services/grooming/${shop.id}`); }}
                      className="bg-[#66B4B1] hover:bg-[#599D9A] text-white px-5 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-95 shadow-sm"
                    >
                      Book Slot
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
