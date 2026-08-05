import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MapPin, MoreHorizontal, Filter, MessageCircle, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { fetchMatchDeck, swipeProfile, fetchMatches, reportProfile } from '../../../../services/social';
import { MatchesFilterModal } from './MatchesFilterModal';

const DEFAULT_FILTERS = {
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
  availability: 'Any',
};

export function MatchSwipe({ setView }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Discover');

  // Filters state & modal toggle
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Candidate deck from Match Engine API
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);

  // Real Matches state for 'Liked You' tab
  const [realMatches, setRealMatches] = useState([]);

  // Swiping card index & animations
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [animationDir, setAnimationDir] = useState('');

  // Celebratory "IT'S A MATCH!" modal state
  const [matchedModalData, setMatchedModalData] = useState(null);

  // Touch state for swipe gestures
  const [touchStart, setTouchStart] = useState({ x: null, y: null, time: null });
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
  
  const scrollRef = useRef(null);

  const loadDeck = (activeFilters = filters) => {
    setIsLoadingDeck(true);
    fetchMatchDeck(activeFilters)
      .then((data) => {
        setFilteredProfiles(data);
        setCurrentIndex(0);
      })
      .catch(() => setFilteredProfiles([]))
      .finally(() => setIsLoadingDeck(false));
  };

  useEffect(() => {
    loadDeck(filters);
    fetchMatches().then(setRealMatches).catch(() => setRealMatches([]));
  }, []);

  const currentProfile = filteredProfiles[currentIndex];

  const handleAction = async (dir) => {
    if (animatingOut || !currentProfile) return;

    setAnimationDir(dir);
    setAnimatingOut(true);

    const actionType = dir === 'pass' ? 'pass' : dir;
    const targetProfile = currentProfile;

    try {
      const res = await swipeProfile(targetProfile.id, actionType);
      if (res?.matched) {
        setMatchedModalData({
          profileName: targetProfile.name,
          profileImage: targetProfile.img || targetProfile.photos?.[0],
          conversationId: res.conversationId,
        });
      }
    } catch {
      /* ignore */
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setAnimatingOut(false);
      setAnimationDir('');
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, 400);
  };

  // Real report — was a decorative link/icon with no handler before.
  const handleReport = () => {
    if (!currentProfile) return;
    const reason = window.prompt(`Why are you reporting ${currentProfile.name}? (optional)`);
    if (reason === null) return; // cancelled
    reportProfile(currentProfile.id, reason)
      .then(() => handleAction('pass'))
      .catch(() => alert('Could not submit the report — please try again.'));
  };

  const onTouchStart = (e) => {
    setTouchEnd({ x: null, y: null });
    setTouchStart({ 
      x: e.targetTouches[0].clientX, 
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ 
      x: e.targetTouches[0].clientX, 
      y: e.targetTouches[0].clientY 
    });
  };

  const onTouchEndEvent = () => {
    if (!touchStart.x || !touchEnd.x) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const timeTaken = Date.now() - touchStart.time;

    const isLeftSwipe = distanceX > 80;
    const isRightSwipe = distanceX < -80;
    const isUpSwipe = distanceY > 100 && timeTaken < 300;

    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 80) {
      if (isLeftSwipe) {
        handleAction('pass');
      } else if (isRightSwipe) {
        handleAction('like');
      }
    } else if (isUpSwipe && Math.abs(distanceY) > Math.abs(distanceX) && scrollRef.current?.scrollTop <= 10) {
      handleAction('superlike');
    }
  };

  const photos = currentProfile?.photos || [currentProfile?.img];
  const prompts = currentProfile?.prompts || [];

  return (
    <div className="flex flex-col h-full bg-[#f4f1eb] overflow-hidden relative">
      {/* Filter Modal */}
      <MatchesFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setIsFilterOpen(false);
          loadDeck(newFilters);
        }}
      />

      {/* Celebratory "IT'S A MATCH!" Modal */}
      {matchedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative border border-white/20">
            <button
              onClick={() => setMatchedModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-gradient-to-tr from-[#F87B68] to-rose-400 rounded-full flex items-center justify-center text-white mb-3 shadow-lg shadow-rose-200">
              <Sparkles size={32} />
            </div>

            <h2 className="text-2xl font-black text-[#4C8684] tracking-tight mb-1">IT'S A MATCH!</h2>
            <p className="text-xs font-bold text-slate-500 mb-6">
              You and <span className="text-slate-800">{matchedModalData.profileName}</span> liked each other!
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100">
                <img src={matchedModalData.profileImage} alt="Match" className="w-full h-full object-cover" />
              </div>
            </div>

            <button
              onClick={() => {
                const convId = matchedModalData.conversationId;
                setMatchedModalData(null);
                if (convId) {
                  navigate(`/app/chat/room/${convId}`);
                } else {
                  setView('chat');
                }
              }}
              className="w-full bg-[#4C8684] text-white py-3 rounded-full font-bold shadow-lg hover:bg-[#3d6b6a] transition mb-2"
            >
              Send Message
            </button>
            <button
              onClick={() => setMatchedModalData(null)}
              className="w-full text-slate-500 py-2 font-bold text-xs hover:text-slate-800"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      )}

      {/* Premium Header Tabs with Actions */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-[#f4f1eb] z-10 shrink-0">
        {/* Left Action - Filter Button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4C8684] shadow-sm hover:shadow-md transition-all active:scale-95 border border-white relative"
          title="Filter matches"
        >
          <Filter size={20} strokeWidth={2.5} />
        </button>

        {/* Center Pill Segmented Control */}
        <div className="flex bg-white/50 p-1 rounded-full border border-white shadow-sm backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('Discover')}
            className={cn(
              "px-5 py-1.5 rounded-full text-sm font-bold transition-all duration-300",
              activeTab === 'Discover' ? "bg-[#4C8684] text-white shadow-md scale-100" : "text-gray-500 hover:text-gray-700 scale-95 opacity-80"
            )}
          >
            Discover
          </button>
          <button 
            onClick={() => setActiveTab('Liked You')}
            className={cn(
              "px-5 py-1.5 rounded-full text-sm font-bold transition-all duration-300",
              activeTab === 'Liked You' ? "bg-[#4C8684] text-white shadow-md scale-100" : "text-gray-500 hover:text-gray-700 scale-95 opacity-80"
            )}
          >
            Liked You
          </button>
        </div>
        
        {/* Right Action - Messages */}
        <div className="relative">
          <button onClick={() => setView('chat')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F87B68] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all active:scale-95 border border-white">
            <MessageCircle size={20} strokeWidth={2.5} />
          </button>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#f4f1eb] animate-pulse"></span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'Discover' ? (
        !currentProfile ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f1eb] p-6 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-[#F87B68]">
              <Heart size={40} />
            </div>
            <h2 className="text-2xl font-black text-[#4C8684] mb-2">You're all caught up!</h2>
            <p className="text-[#599D9A] font-bold mb-6">Come back later for more potential playdates.</p>
            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <button 
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  loadDeck(DEFAULT_FILTERS);
                }}
                className="w-full bg-white text-[#4C8684] border border-[#4C8684] py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#4C8684]/10 transition"
              >
                <RefreshCw size={14} /> Reset Filters
              </button>
              <button 
                onClick={() => navigate('/app/home')}
                className="w-full bg-[#4C8684] text-white py-3 rounded-full font-bold text-sm shadow-lg hover:bg-[#3d6b6a] transition"
              >
                Go back Home
              </button>
            </div>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndEvent}
            className={cn(
              "flex-1 overflow-y-auto hide-scrollbar relative transition-transform duration-500 ease-in-out",
              animatingOut && animationDir === 'like' ? "translate-x-[120%] opacity-0 rotate-12" : "",
              animatingOut && animationDir === 'pass' ? "-translate-x-[120%] opacity-0 -rotate-12" : "",
              animatingOut && animationDir === 'superlike' ? "-translate-y-full opacity-0 scale-105" : ""
            )}
          >
            <div className="pb-24">
              {/* Top Info Header (Name & Compatibility score) */}
              <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black text-[#222] tracking-tight">{currentProfile.name}</h1>
                    <span className="text-xs bg-[#4C8684] text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                      {currentProfile.compatibilityScore || 90}% Match
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-500 mt-0.5">
                    {currentProfile.breed} • {currentProfile.age} yrs
                  </p>
                </div>
                <button onClick={handleReport} className="text-gray-400 hover:text-gray-600 p-1">
                  <MoreHorizontal size={24} />
                </button>
              </div>

              {/* Photo 1 */}
              <div className="px-4 mb-4 relative group">
                <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm relative bg-gray-200">
                  <img src={photos[0]} alt="Profile 1" className="w-full h-full object-cover" />
                  
                  {/* Overlay Info on first image */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-5 pt-12">
                    <div className="flex items-center text-white/90 text-sm font-bold gap-1 mb-1">
                      <MapPin size={14} />
                      <span>{currentProfile.distance} km away</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentProfile.tags && currentProfile.tags.map(tag => (
                        <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Like Button */}
                <button 
                  onClick={() => handleAction('like')}
                  className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] hover:scale-105 active:scale-95 transition-all z-10"
                >
                  <Heart size={26} strokeWidth={3} fill="#F87B68" />
                </button>
              </div>

              {/* Prompt 1 */}
              {prompts[0] && (
                <div className="px-4 mb-4 relative">
                  <div className="bg-white rounded-[24px] p-6 shadow-sm min-h-[140px] flex flex-col justify-center border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">{prompts[0].question}</p>
                    <h3 className="text-[22px] font-serif text-[#222] leading-[1.3]">{prompts[0].answer}</h3>
                  </div>
                  
                  <button 
                    onClick={() => handleAction('pass')}
                    className="absolute -bottom-5 left-8 w-[48px] h-[48px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex items-center justify-center text-gray-500 hover:scale-105 active:scale-95 transition-all z-10 border border-gray-100"
                  >
                    <X size={24} strokeWidth={3} />
                  </button>
                  
                  <button 
                    onClick={() => handleAction('like')}
                    className="absolute -bottom-5 right-8 w-[48px] h-[48px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#4C8684] hover:scale-105 active:scale-95 transition-all z-10 border border-gray-100"
                  >
                    <Heart size={24} strokeWidth={3} />
                  </button>
                </div>
              )}

              {/* Photo 2 */}
              {photos[1] && (
                <div className="px-4 mt-10 mb-4 relative">
                  <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
                    <img src={photos[1]} alt="Profile 2" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    onClick={() => handleAction('like')}
                    className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#4C8684] hover:scale-105 active:scale-95 transition-all z-10"
                  >
                    <Heart size={26} strokeWidth={3} />
                  </button>
                </div>
              )}

              {/* About Section */}
              <div className="px-4 mb-4 mt-6">
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
                  <h4 className="text-sm font-black text-gray-400 mb-4 uppercase tracking-wider">About {currentProfile.name}</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600 font-bold text-sm">Gender</span>
                      <span className="text-[#222] font-black text-sm">{currentProfile.gender}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600 font-bold text-sm">Size</span>
                      <span className="text-[#222] font-black text-sm">{currentProfile.size}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600 font-bold text-sm">Vaccinated</span>
                      <span className="text-[#222] font-black text-sm">{currentProfile.vaccinationStatus}</span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-gray-600 font-bold text-sm">Energy Level</span>
                      <span className="text-[#222] font-black text-sm">{currentProfile.activityLevel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt 2 */}
              {prompts[1] && (
                <div className="px-4 mb-4 relative mt-6">
                  <div className="bg-white rounded-[24px] p-6 shadow-sm min-h-[140px] flex flex-col justify-center border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">{prompts[1].question}</p>
                    <h3 className="text-[22px] font-serif text-[#222] leading-[1.3]">{prompts[1].answer}</h3>
                  </div>
                  
                  <button 
                    onClick={() => handleAction('pass')}
                    className="absolute -bottom-5 left-8 w-[48px] h-[48px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex items-center justify-center text-gray-500 hover:scale-105 active:scale-95 transition-all z-10 border border-gray-100"
                  >
                    <X size={24} strokeWidth={3} />
                  </button>
                  
                  <button 
                    onClick={() => handleAction('like')}
                    className="absolute -bottom-5 right-8 w-[48px] h-[48px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#F87B68] hover:scale-105 active:scale-95 transition-all z-10 border border-gray-100"
                  >
                    <Heart size={24} strokeWidth={3} fill="#F87B68" />
                  </button>
                </div>
              )}

              {/* Photo 3 */}
              {photos[2] && (
                <div className="px-4 mt-10 mb-4 relative">
                  <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
                    <img src={photos[2]} alt="Profile 3" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    onClick={() => handleAction('like')}
                    className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#4C8684] hover:scale-105 active:scale-95 transition-all z-10"
                  >
                    <Heart size={26} strokeWidth={3} />
                  </button>
                </div>
              )}

              {/* Photo 4 */}
              {photos[3] && (
                <div className="px-4 mt-6 mb-4 relative">
                  <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm bg-gray-200">
                    <img src={photos[3]} alt="Profile 4" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    onClick={() => handleAction('like')}
                    className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] hover:scale-105 active:scale-95 transition-all z-10"
                  >
                    <Heart size={26} strokeWidth={3} fill="#F87B68" />
                  </button>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="px-4 mt-10 mb-6 flex justify-center">
                <button onClick={handleReport} className="text-gray-400 text-sm font-bold hover:text-gray-600 transition underline decoration-gray-300 underline-offset-4">
                  Report {currentProfile.name}
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* 'Liked You' / Matches Tab */
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#f4f1eb] p-4 animate-in fade-in duration-300">
          <h2 className="text-xl font-black text-[#222] mb-4">Matches ({realMatches.length})</h2>
          {realMatches.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 pb-24">
              {realMatches.map((m) => {
                const profile = m.profileId || {};
                const img = profile.img || profile.photos?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';
                return (
                  <div key={m._id} className="relative rounded-[20px] overflow-hidden shadow-sm aspect-[3/4] cursor-pointer group bg-gray-200">
                    <img src={img} alt={profile.name || 'Match'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                      <h3 className="font-bold text-lg leading-tight">{profile.name || 'Playdate Match'}</h3>
                      <p className="text-xs text-white/80 font-medium">{profile.breed || 'Pet'}</p>
                      <button 
                        onClick={() => {
                          if (m.conversationId) {
                            navigate(`/app/chat/room/${m.conversationId}`);
                          } else {
                            setView('chat');
                          }
                        }} 
                        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition"
                      >
                        <MessageCircle size={18} className="text-[#F87B68]" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60%] text-center opacity-60">
              <Heart size={48} className="mb-4 text-gray-400" />
              <p className="font-bold text-gray-500">No matches yet!</p>
              <p className="text-sm text-gray-400 mt-1">Like profiles in Discover to see them here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
