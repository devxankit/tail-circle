import React, { useState, useEffect } from 'react';
import { ArrowLeft, SlidersHorizontal, MapPin, Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { getGroomingShops } from '../../../../services/groomingApi';
import { GroomingFilterSheet } from './GroomingFilterSheet';

export function GroomingListing() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Nearest');

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    setLoading(true);
    try {
      const data = await getGroomingShops();
      // Simulate sorting logic on the frontend
      let sorted = [...data];
      if (sortBy === 'Lowest Price') {
        sorted.sort((a, b) => a.startingPrice - b.startingPrice);
      } else if (sortBy === 'Highest Rated') {
        sorted.sort((a, b) => b.rating - a.rating);
      }
      setShops(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shops.length > 0) {
      // Re-sort when sortBy changes without refetching for demo
      let sorted = [...shops];
      if (sortBy === 'Nearest') {
        // Just keeping original order as mock "nearest"
        sorted.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      } else if (sortBy === 'Lowest Price') {
        sorted.sort((a, b) => a.startingPrice - b.startingPrice);
      } else if (sortBy === 'Highest Rated') {
        sorted.sort((a, b) => b.rating - a.rating);
      }
      setShops(sorted);
    }
  }, [sortBy]);

  const sortOptions = ['Nearest', 'Lowest Price', 'Highest Rated'];

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95">
              <ArrowLeft size={24} className="text-gray-800" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Grooming Shops</h1>
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-50 active:scale-95"
          >
            <SlidersHorizontal size={20} className="text-gray-700" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-gray-500 mb-4 pl-1" onClick={() => navigate(-1)}>
          <MapPin size={14} className="text-[#66B4B1]" />
          <span className="text-xs font-bold">Near You</span>
        </div>

        {/* Sort Chips */}
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-1">
          <span className="text-xs font-bold text-gray-500 shrink-0">Sort By</span>
          {sortOptions.map(opt => (
            <button 
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${sortBy === opt ? 'bg-[#66B4B1]/10 border-[#66B4B1] text-[#66B4B1]' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12 hide-scrollbar">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[140px] bg-white rounded-[24px] animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SlidersHorizontal size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Shops Found</h3>
            <p className="text-sm text-gray-500 max-w-[250px]">Try adjusting your filters or searching in a different area.</p>
          </div>
        ) : (
          shops.map(shop => (
            <Card 
              key={shop.id} 
              onClick={() => navigate(`/app/services/grooming/${shop.id}`)}
              className="p-3 flex gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] rounded-[24px] border border-gray-100 bg-white"
            >
              <div className="w-[100px] h-[110px] rounded-[16px] overflow-hidden relative shrink-0">
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                <button className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Heart size={14} className="text-gray-400" />
                </button>
              </div>
              <div className="flex flex-col flex-1 py-1">
                <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1 pr-4">{shop.name}</h3>
                
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star size={12} className="fill-[#F6C0B6] text-[#F87B68]" /> 
                  <span className="text-[12px] font-bold text-gray-700">{shop.rating}</span>
                  <span className="text-[11px] text-gray-400">({shop.reviews})</span>
                  <span className="text-gray-300 mx-0.5">•</span>
                  <span className="text-[11px] font-medium text-gray-500">{shop.distance}</span>
                </div>

                <p className="text-[12px] text-gray-500 font-medium mb-auto">{shop.visitTypes.join(' • ')}</p>
                
                <div className="flex items-end justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-medium">Starts at</span>
                    <span className="text-[14px] font-black text-[#66B4B1]">₹{shop.startingPrice}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-[#FAF7F2] text-[#599D9A] rounded-lg text-[10px] font-bold">
                    {shop.availability}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <GroomingFilterSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </div>
  );
}
