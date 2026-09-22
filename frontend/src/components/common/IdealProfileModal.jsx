import React from 'react';
import { X, Heart, MapPin, MoreHorizontal, Sparkles, User, Info, Camera } from 'lucide-react';
import { BehaviourCompatibility } from '../../modules/user/features/matches/BehaviourCompatibility';
import { cn } from '../../modules/user/utils/cn';

// Static, permanent ideal pet profile constant for Luna.
// Kept completely separate from database state so that even if DB records are modified or removed,
// this single standard reference profile remains permanent and intact.
export const IDEAL_PET_LUNA = {
  name: 'Luna',
  species: 'Dog',
  breed: 'Siberian Husky',
  age: '2',
  gender: 'Female',
  size: 'Medium',
  distance: '15.9',
  activityLevel: 'High Energy',
  vaccinationStatus: 'Up to date',
  neutered: 'Spayed',
  temperament: ['Friendly', 'Playful', 'Curious'],
  tags: ['Vaccinated', 'High Energy', 'Talkative'],
  // This modal is the reference for what a finished profile card looks like, so
  // it carries the same shape the deck gets from `behaviourCompatibility()`.
  behaviourMatch: {
    value: 0.95,
    level: 'High',
    shared: ['Friendly', 'Playful', 'Curious'],
  },
  prompts: [
    {
      question: 'A SHOWER THOUGHT I RECENTLY HAD',
      answer: 'If I fetch the stick, why does the human throw it again?'
    },
    {
      question: 'MY SIMPLE PLEASURES',
      answer: 'Belly rubs, squeaky toys, and chasing the mailman.'
    }
  ],
  photos: [
    '/assets/ideal_luna_1.png',
    '/assets/ideal_luna_2.png',
    '/assets/ideal_luna_3.png',
    '/assets/ideal_luna_4.png'
  ],
  ownerInfo: {
    name: 'Ankit Ahirwar',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    bio: 'Loving parent of Luna. Always excited for weekend playdates, snow runs & furry meetups!'
  }
};

export function IdealProfileModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const profile = IDEAL_PET_LUNA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#f4f1eb] rounded-[32px] w-full max-w-md h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden relative border border-white/20 animate-in zoom-in-95 duration-200">
        
        {/* Sticky Modal Top Header */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200/80 shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#4C8684] flex items-center justify-center font-black">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 leading-tight">Ideal Profile Preview</h2>
                <span className="text-[10px] font-black uppercase bg-[#4C8684] text-white px-2 py-0.5 rounded-full">Standard</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">How Luna looks on the Match Deck</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
            type="button"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-[#e8f4f3] px-4 py-2.5 border-b border-[#4C8684]/20 flex items-center gap-2.5 text-xs text-[#3d6b6a] font-semibold shrink-0">
          <Info size={16} className="text-[#4C8684] shrink-0" />
          <span>Upload 3–4 high quality photos & fill details like this for maximum playdate matches!</span>
        </div>

        {/* Scrollable Full Match Profile Top-to-Bottom */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
          
          {/* Top Info Header (Name & Species/Age) */}
          <div className="bg-white rounded-[24px] px-5 py-4 shadow-xs border border-gray-100 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-[#222] tracking-tight">{profile.name}</h1>
              <p className="text-sm font-bold text-gray-500 mt-0.5">
                {profile.breed} • {profile.age} yrs
              </p>
            </div>
            <button className="text-gray-400 p-1 cursor-default">
              <MoreHorizontal size={24} />
            </button>
          </div>

          {/* Photo 1 (Main Card Image - Luna exact photo) */}
          <div className="relative group">
            <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm relative bg-gray-200">
              <img src={profile.photos[0]} alt="Luna Main" className="w-full h-full object-cover" />
              
              {/* Overlay Info on first image */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-12">
                <div className="flex items-center text-white/90 text-sm font-bold gap-1 mb-1">
                  <MapPin size={14} className="text-rose-400 fill-rose-400/20" />
                  <span>{profile.distance} km away</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.tags.map((tag) => (
                    <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Like Button */}
            <div className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] z-10 border border-slate-100">
              <Heart size={26} strokeWidth={2.5} className="text-[#F87B68]" />
            </div>
          </div>

          {/* Temperament compatibility — the card's one compatibility control */}
          <div>
            <BehaviourCompatibility behaviour={profile.behaviourMatch} />
          </div>

          {/* Prompt 1 */}
          <div className="relative">
            <div className="bg-white rounded-[24px] p-6 shadow-xs border border-gray-100 min-h-[130px] flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">{profile.prompts[0].question}</p>
              <h3 className="text-[20px] font-serif text-[#222] leading-[1.3]">{profile.prompts[0].answer}</h3>
            </div>
            
            <div className="absolute -bottom-4 left-8 w-[44px] h-[44px] bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 border border-gray-100">
              <X size={22} strokeWidth={3} />
            </div>
            
            <div className="absolute -bottom-4 right-8 w-[44px] h-[44px] bg-white rounded-full shadow-md flex items-center justify-center text-[#4C8684] border border-gray-100">
              <Heart size={22} strokeWidth={3} />
            </div>
          </div>

          {/* Photo 2 */}
          <div className="pt-4 relative">
            <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
              <img src={profile.photos[1]} alt="Luna Photo 2" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#4C8684] z-10">
              <Heart size={26} strokeWidth={3} />
            </div>
          </div>

          {/* About Section */}
          <div className="pt-2">
            <div className="bg-white rounded-[24px] p-5 shadow-xs border border-gray-100">
              <h4 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-wider">About {profile.name}</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600 font-bold text-sm">Gender</span>
                  <span className="text-[#222] font-black text-sm">{profile.gender}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600 font-bold text-sm">Size</span>
                  <span className="text-[#222] font-black text-sm">{profile.size}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600 font-bold text-sm">Vaccinated</span>
                  <span className="text-[#222] font-black text-sm">{profile.vaccinationStatus}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600 font-bold text-sm">Energy Level</span>
                  <span className="text-[#222] font-black text-sm">{profile.activityLevel}</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-gray-600 font-bold text-sm">Spayed / Neutered</span>
                  <span className="text-[#222] font-black text-sm">{profile.neutered}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt 2 */}
          <div className="relative pt-2">
            <div className="bg-white rounded-[24px] p-6 shadow-xs border border-gray-100 min-h-[130px] flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">{profile.prompts[1].question}</p>
              <h3 className="text-[20px] font-serif text-[#222] leading-[1.3]">{profile.prompts[1].answer}</h3>
            </div>
            
            <div className="absolute -bottom-4 left-8 w-[44px] h-[44px] bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 border border-gray-100">
              <X size={22} strokeWidth={3} />
            </div>
            
            <div className="absolute -bottom-4 right-8 w-[44px] h-[44px] bg-white rounded-full shadow-md flex items-center justify-center text-[#F87B68] border border-gray-100">
              <Heart size={22} strokeWidth={2.5} className="text-[#F87B68]" />
            </div>
          </div>

          {/* Photo 3 */}
          <div className="pt-4 relative">
            <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
              <img src={profile.photos[2]} alt="Luna Photo 3" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#4C8684] z-10">
              <Heart size={26} strokeWidth={2.5} className="text-[#4C8684]" />
            </div>
          </div>

          {/* Photo 4 */}
          <div className="pt-2 relative">
            <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
              <img src={profile.photos[3]} alt="Luna Photo 4" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] z-10">
              <Heart size={26} strokeWidth={2.5} className="text-[#F87B68]" />
            </div>
          </div>

          {/* Pet Parent / Owner Info Card */}
          <div className="pt-2 pb-6">
            <div className="bg-white rounded-[24px] p-5 shadow-xs border border-gray-100 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] font-black tracking-wider uppercase bg-[#e8f4f3] text-[#4C8684] px-3 py-1 rounded-full flex items-center gap-1.5">
                  <User size={12} className="text-[#4C8684]" />
                  Pet Parent
                </span>
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" />
                  Verified Owner
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <img 
                    src={profile.ownerInfo.avatar} 
                    alt={profile.ownerInfo.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#4C8684]/20 shadow-xs bg-gray-100" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#4C8684] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ✓
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-black text-[#222] truncate">
                    {profile.ownerInfo.name}
                  </h4>
                  <p className="text-xs font-medium text-gray-600 mt-1 leading-relaxed">
                    {profile.ownerInfo.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Action Button */}
        <div className="p-4 bg-white border-t border-slate-200/80 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#4C8684] hover:bg-[#3d6b6a] text-white font-black py-3.5 rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <Camera size={18} /> Got It! Upload My Pet's Photos
          </button>
        </div>

      </div>
    </div>
  );
}

export default IdealProfileModal;
