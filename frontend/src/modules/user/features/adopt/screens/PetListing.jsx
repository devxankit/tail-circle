import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Heart, ArrowUpRight, MessageSquare, MapPin, PawPrint
} from 'lucide-react';
import { getPets, getBreedsList } from '../../../../../services/adoptApi';

// Fallback images in case breeds mock doesn't load a specific thumbnail
const breedThumbnails = {
  'Golden Retriever': 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80',
  'Labrador Retriever': 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=150&q=80',
  'German Shepherd': 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=150&q=80',
  'Siberian Husky': 'https://images.unsplash.com/photo-1531804055935-76f44d7c3621?auto=format&fit=crop&w=150&q=80',
  'Great Dane': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=150&q=80',
  'Saint Bernard': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=150&q=80',
  'Chihuahua': 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=150&q=80',
  'Border Collie': 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&w=150&q=80',
  'Cocker Spaniel': 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=150&q=80',
  'Boxer': 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=150&q=80',
  'Dalmatian': 'https://images.unsplash.com/photo-1502673530728-f79b4cbd315c?auto=format&fit=crop&w=150&q=80',
  'Indian Pariah': 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=150&q=80',
  'Belgian Malinois': 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=150&q=80',
  'Samoyed': 'https://images.unsplash.com/photo-1529429617329-84d1ec5d523d?auto=format&fit=crop&w=150&q=80'
};

export function PetListing() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract breed from navigation state (defaulting to Golden Retriever)
  const initialBreed = location.state?.breed || 'Golden Retriever';

  const [pets, setPets] = useState([]);
  const [filteredPets, setFilteredPets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Header favorite state
  const [isBreedFavorited, setIsBreedFavorited] = useState(false);

  // Favorite status per pet card
  const [favoritePets, setFavoritePets] = useState({});

  // Direct enquire chat navigation (no sheet state)

  // Fetch pets data
  useEffect(() => {
    getPets().then(data => {
      const dogListings = data.filter(p => p.type === 'Dog');
      setPets(dogListings);
      setLoading(false);
    });
  }, []);

  // Filter pets by selected breed
  useEffect(() => {
    if (pets.length > 0) {
      const result = pets.filter(p => p.breed.toLowerCase() === initialBreed.toLowerCase());
      setFilteredPets(result);
    }
  }, [pets, initialBreed]);

  // Handle Enquiry click to go directly to chat
  const handleEnquireClick = (pet, e) => {
    e.stopPropagation();
    const msg = `Hi, I am interested in ${pet.name}. Is he still available for adoption?`;
    navigate(`/app/adopt/chat/${pet.id}`, { state: { prefilledMessage: msg } });
  };

  // Toggle favorite on individual card
  const togglePetFavorite = (petId, e) => {
    e.stopPropagation();
    setFavoritePets(prev => ({ ...prev, [petId]: !prev[petId] }));
  };

  // Fetch meta info for active breed dynamically (API, async)
  const [breedsList, setBreedsList] = useState([]);
  useEffect(() => {
    getBreedsList().then(setBreedsList).catch(() => setBreedsList([]));
  }, []);
  const activeBreedMeta = breedsList.find(b => b.name.toLowerCase() === initialBreed.toLowerCase()) || {
    name: initialBreed,
    traits: 'Friendly • Gentle',
    size: 'Large',
    image: breedThumbnails[initialBreed] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80'
  };
  
  const traitsText = activeBreedMeta.traits.replace(' • ', ', ');
  const breedThumbnail = activeBreedMeta.image || breedThumbnails[initialBreed] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80';

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-12 animate-in fade-in duration-300 relative">
      
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between px-5 py-4 bg-white sticky top-0 z-20 border-b border-gray-100/50">
        <button 
          onClick={() => navigate('/app/adopt')} 
          className="p-1.5 -ml-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        
        <h1 className="text-[17px] font-extrabold text-gray-900 tracking-tight leading-none">
          Browse Breed
        </h1>

        <button 
          onClick={() => setIsBreedFavorited(!isBreedFavorited)}
          className="p-1.5 -mr-1 hover:bg-gray-50 rounded-full transition-colors cursor-pointer relative"
        >
          <Heart 
            size={22} 
            strokeWidth={2.5} 
            className={`transition-all duration-300 ${isBreedFavorited ? 'fill-[#F87B68] text-[#F87B68] scale-110' : 'text-gray-900'}`} 
          />
        </button>
      </div>

      <div className="px-5 pt-4 flex-1 pb-16">
        
        {/* ── BREED SUMMARY CARD BANNER ── */}
        <div className="bg-[#FAF7F2] p-5 rounded-[28px] mb-5 flex items-center gap-4.5 border border-[#FAF7F2]/50 shadow-[0_2px_12px_rgba(255,122,89,0.03)] relative overflow-hidden">
          {/* Subtle Background Paw Print */}
          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 text-[#F87B68]/10 rotate-[-15deg] pointer-events-none z-0">
            <PawPrint size={130} strokeWidth={1} />
          </div>

          <img src={breedThumbnail} className="relative z-10 w-[85px] h-[85px] rounded-[22px] object-cover border-2 border-white shrink-0 shadow-sm" alt={initialBreed} />
          <div className="flex-1 relative z-10">
            <h2 className="text-[20px] font-black text-gray-900 leading-tight mb-1">{initialBreed}</h2>
            <p className="text-[13.5px] text-gray-500 font-bold leading-tight mb-2.5">
              {traitsText}
            </p>
            <span className="bg-white text-[#F87B68] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full block w-max leading-none shadow-sm">
              {activeBreedMeta.size} Breed
            </span>
          </div>
        </div>

        {/* ── AVAILABILITY TITLE ── */}
        <h3 className="text-[15px] font-black text-gray-955 mb-4 px-0.5 tracking-tight leading-none">
          {filteredPets.length} {initialBreed}s available in Bangalore
        </h3>

        {/* ── DOG LISTING ROWS ── */}
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white p-3.5 rounded-[24px] flex gap-4 border border-gray-100 min-h-[145px] animate-pulse">
                <div className="w-[38%] bg-gray-100 rounded-[18px] shrink-0"></div>
                <div className="flex-1 space-y-3 py-1">
                  <div className="w-1/3 h-4 bg-gray-100 rounded"></div>
                  <div className="w-2/3 h-5 bg-gray-100 rounded"></div>
                  <div className="w-1/2 h-4 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))
          ) : filteredPets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-[24px] border border-gray-100/90 shadow-sm">
              <span className="text-[40px] mb-2 block">🐕</span>
              <h3 className="text-[16px] font-black text-gray-800 mb-1">No dogs available</h3>
              <p className="text-[13px] text-gray-500 font-bold font-sans">There are no available listings for this breed.</p>
            </div>
          ) : (
            filteredPets.map(pet => (
              <div 
                key={pet.id} 
                onClick={() => navigate(`/app/adopt/${pet.id}`)} 
                className="flex bg-white rounded-[20px] overflow-hidden border border-gray-100/90 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-[125px] relative"
              >
                {/* Left Side Image */}
                <div className="w-[115px] h-[125px] relative shrink-0">
                  <img src={pet.images[0]} alt={pet.name} className="w-full h-full object-cover" />
                  <button 
                    onClick={(e) => togglePetFavorite(pet.id, e)}
                    className="absolute top-2 left-2 w-6.5 h-6.5 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                  >
                    <Heart 
                      size={11} 
                      className={`transition-colors duration-255 ${favoritePets[pet.id] ? 'fill-[#F87B68] text-[#F87B68]' : 'text-gray-400'}`} 
                    />
                  </button>
                </div>

                {/* Right Side Details */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  {/* Top Gender & Age */}
                  <div>
                    <div className="flex items-center">
                      {pet.gender === 'Male' ? (
                        <span className="bg-[#FAF7F2] text-[#599D9A] text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full leading-none">
                          Male
                        </span>
                      ) : (
                        <span className="bg-[#FAF7F2] text-[#D96B5B] text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full leading-none">
                          Female
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 font-bold ml-2 leading-none">
                        {pet.age.toLowerCase()}
                      </span>
                    </div>

                    {/* Dog Name */}
                    <h4 className="text-[14.5px] font-extrabold text-gray-900 leading-none mt-2 mb-1.5 truncate">
                      {pet.name}
                    </h4>

                    {/* Details Row: Kennel & Location */}
                    <div className="space-y-1">
                      <p className="text-[10.5px] text-gray-500 font-bold flex items-center gap-1.5 truncate leading-none">
                        <span className="text-gray-400 shrink-0">👤</span> {pet.shelter.name}
                      </p>
                      <p className="text-[10.5px] text-gray-400 font-bold flex items-center gap-1 leading-none truncate">
                        <span className="shrink-0">📍</span> {pet.location}
                      </p>
                    </div>
                  </div>

                  {/* Price & Enquire CTA */}
                  <div className="flex items-center justify-between border-t border-gray-50 pt-2 shrink-0">
                    <span className={`text-[13.5px] font-black leading-none ${pet.price === 0 ? 'text-[#66B4B1]' : 'text-gray-950'}`}>
                      {pet.price === 0 ? 'Free' : `₹${pet.price.toLocaleString()}`}
                    </span>

                    <button 
                      onClick={(e) => handleEnquireClick(pet, e)}
                      className="bg-[#66B4B1] hover:bg-[#599D9A] active:scale-95 text-white px-3 py-1.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all shadow-[0_1.5px_4px_rgba(15,139,125,0.1)] cursor-pointer leading-none"
                    >
                      <span>Enquire</span>
                      <MessageSquare size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Enquiry bottom sheet removed */}

    </div>
  );
}
