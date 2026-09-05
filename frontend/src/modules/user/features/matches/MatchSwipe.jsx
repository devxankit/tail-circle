import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MapPin, MoreHorizontal, Filter, MessageCircle, Sparkles, RefreshCw, RotateCcw, CheckCircle, ChevronDown, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { fetchMatchDeck, swipeProfile, fetchMatches, reportProfile, resetMatchesSwipe } from '../../../../services/social';
import { MatchesFilterModal } from './MatchesFilterModal';
import { ReportModal } from '../../../../components/common/ReportModal';
import { CitySelectorModal } from './CitySelectorModal';
import { MatchPointsBreakdown } from './MatchPoints';
import { MatchCelebrationModal } from './MatchCelebrationModal';
import { BehaviourCompatibilityChip } from './BehaviourCompatibility';
import { markCelebrated } from './matchCelebrations';

const DEFAULT_FILTERS = {
  type: 'Any',
  breedMode: 'All Breeds',
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

  // Location / City selector state
  const [selectedCity, setSelectedCity] = useState({ name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 });
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Filters state & modal toggle
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Candidate deck from Match Engine API with instant sessionStorage caching
  const [filteredProfiles, setFilteredProfiles] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tc_match_deck_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingDeck, setIsLoadingDeck] = useState(() => filteredProfiles.length === 0);

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
  
  const [userCoords, setUserCoords] = useState(null);
  const scrollRef = useRef(null);

  const loadDeck = (activeFilters = filters, showLoading = false) => {
    if (showLoading || filteredProfiles.length === 0) {
      setIsLoadingDeck(true);
    }
    const cityParams = selectedCity
      ? { city: selectedCity.name, cityName: selectedCity.name, lat: selectedCity.lat, lng: selectedCity.lng }
      : {};
    const queryFilters = { ...cityParams, ...(userCoords || {}), ...activeFilters };
    fetchMatchDeck(queryFilters)
      .then((data) => {
        setFilteredProfiles(data || []);
        if (data && data.length > 0) {
          try {
            sessionStorage.setItem('tc_match_deck_cache', JSON.stringify(data));
          } catch {}
        }
        setCurrentIndex(0);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDeck(false));
  };

  const handleResetSwipes = async () => {
    try {
      setIsLoadingDeck(true);
      await resetMatchesSwipe();
      setFilters(DEFAULT_FILTERS);
      loadDeck(userCoords ? { ...DEFAULT_FILTERS, ...userCoords } : DEFAULT_FILTERS, true);
    } catch {
      setIsLoadingDeck(false);
    }
  };

  useEffect(() => {
    try {
      const cachedCity = sessionStorage.getItem('tc_user_gps_city');
      if (cachedCity) {
        const parsed = JSON.parse(cachedCity);
        if (parsed?.name && parsed?.lat && parsed?.lng) {
          setSelectedCity(parsed);
          setUserCoords({ lat: parsed.lat, lng: parsed.lng });
          loadDeck({ ...filters, lat: parsed.lat, lng: parsed.lng });
          fetchMatches().then(setRealMatches).catch(() => setRealMatches([]));
          return;
        }
      }
    } catch {}

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          try {
            const { reverseGeocodeCoords } = await import('../../../../services/googleMaps');
            const cityObj = await reverseGeocodeCoords(lat, lng);
            setSelectedCity(cityObj);
            setUserCoords({ lat, lng });
            try {
              sessionStorage.setItem('tc_user_gps_city', JSON.stringify(cityObj));
            } catch {}
            loadDeck({ ...filters, lat, lng });
          } catch {
            const fallbackCity = { name: 'Current Location', lat, lng, isGps: true };
            setSelectedCity(fallbackCity);
            setUserCoords({ lat, lng });
            loadDeck({ ...filters, lat, lng });
          }
        },
        () => {
          loadDeck(filters);
        },
        { timeout: 6000 }
      );
    } else {
      loadDeck(filters);
    }
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
        // Claimed before rendering so the `match:new` socket event for the
        // same match does not open a second copy of this modal.
        markCelebrated(res.conversationId);
        setMatchedModalData({
          profileName: res.profileName || targetProfile.name,
          profileImage: res.profileImage || targetProfile.img || targetProfile.photos?.[0],
          conversationId: res.conversationId,
          // The swipe response already carries the pair's rating; the modal's
          // compatibility meter was rendering off a field nobody ever set.
          matchPoints: res.matchPoints,
          maxMatchPoints: res.maxMatchPoints,
          behaviourMatch: res.behaviourMatch,
          // Which of my pets this match is actually for. The client used to
          // fetch my pets and take the first, which for a two-pet owner is a
          // different answer from the one the engine scored against.
          myPetImage: res.myPet?.image || null,
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

  const handleReport = () => {
    if (!currentProfile) return;
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (reason) => {
    if (!currentProfile) return;
    await reportProfile(currentProfile.id, reason);
    setToastMessage(`Reported ${currentProfile.name}. Thank you for keeping TailCircle safe.`);
    setTimeout(() => setToastMessage(''), 3500);
    handleAction('pass');
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
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-700">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Profile Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={`Report ${currentProfile?.name || 'Profile'}`}
        subtitle="Tell us why you are reporting this pet profile"
        onSubmit={handleReportSubmit}
      />

      {/* City Location Selector Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          const cityCoords = { lat: city.lat, lng: city.lng, city: city.name, cityName: city.name };
          setUserCoords(cityCoords);
          loadDeck({ ...filters, ...cityCoords }, true);
        }}
      />

      {/* Filter Modal */}
      <MatchesFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setIsFilterOpen(false);
          loadDeck(userCoords ? { ...userCoords, ...newFilters } : newFilters, true);
        }}
      />

      {/* Celebratory "IT'S A MATCH!" Modal */}
      {matchedModalData && (
        <MatchCelebrationModal
          match={matchedModalData}
          myPetImage={matchedModalData.myPetImage}
          onClose={() => setMatchedModalData(null)}
          onMessage={() => {
            const convId = matchedModalData.conversationId;
            setMatchedModalData(null);
            if (convId) {
              navigate(`/app/chat/room/${convId}`);
            } else {
              setView('chat');
            }
          }}
        />
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

      {/* City Location Switcher Bar */}
      {activeTab === 'Discover' && (
        <div className="flex items-center justify-between px-5 py-2 bg-[#e8e4db]/70 border-y border-[#dcd7cc] text-xs font-bold text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Location:</span>
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#4C8684] px-3.5 py-1 rounded-full shadow-xs border border-slate-200/80 transition active:scale-95"
            >
              <MapPin size={13} className="text-rose-500 fill-rose-500/20" />
              <span className="font-black text-slate-900">{selectedCity?.name || 'Select City'}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200/50">
            Nearest Pets First
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'Discover' ? (
        isLoadingDeck && !currentProfile ? (
          <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#f4f1eb] px-5 pt-5 pb-24 animate-pulse">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="h-8 w-36 bg-slate-300 rounded-full mb-2"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </div>
              <div className="h-6 w-20 bg-slate-300 rounded-full"></div>
            </div>
            <div className="w-full aspect-[4/5] bg-slate-300 rounded-[24px] shadow-sm mb-6 relative overflow-hidden">
              <div className="absolute bottom-4 left-4 right-4 h-12 bg-slate-400/40 rounded-xl"></div>
            </div>
            <div className="bg-white rounded-[24px] p-5 shadow-sm space-y-3">
              <div className="h-4 w-28 bg-slate-300 rounded"></div>
              <div className="h-4 w-full bg-slate-200 rounded"></div>
              <div className="h-4 w-4/5 bg-slate-200 rounded"></div>
            </div>
          </div>
        ) : !currentProfile ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f1eb] p-6 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-[#F87B68]">
              <Heart size={40} />
            </div>
            <h2 className="text-2xl font-black text-[#4C8684] mb-2">You're all caught up!</h2>
            <p className="text-[#599D9A] font-bold mb-6">Come back later for more potential playdates, or reset your swipes to discover again.</p>
            <div className="flex flex-col gap-3 w-full max-w-[240px]">
              <button 
                onClick={handleResetSwipes}
                className="w-full bg-[#4C8684] text-white py-3 rounded-full font-bold text-sm shadow-lg hover:bg-[#3d6b6a] transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Reset Swipes & Discover
              </button>
              <button 
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  loadDeck(DEFAULT_FILTERS, true);
                }}
                className="w-full bg-white text-[#4C8684] border border-[#4C8684] py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#4C8684]/10 transition"
              >
                <RefreshCw size={14} /> Clear Filters
              </button>
              <button 
                onClick={() => navigate('/app/home')}
                className="w-full text-slate-500 py-2 font-bold text-xs hover:text-slate-800 transition"
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
                  {/* The pet's name stands alone. The compatibility reading
                      sits in its own strip below, so the score never competes
                      with the pet for the top line. */}
                  <h1 className="text-3xl font-black text-[#222] tracking-tight">{currentProfile.name}</h1>
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
                  className="absolute bottom-6 right-8 w-[52px] h-[52px] bg-white rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#F87B68] hover:scale-110 active:scale-95 transition-all z-10 border border-slate-100"
                  title="Like pet profile"
                >
                  <Heart size={26} strokeWidth={2.5} className="text-[#F87B68]" />
                </button>
              </div>

              {/* Sits directly under the first photo: the pet is seen first,
                  then how well they suit you — and the strip's own card echoes
                  the photo's rounded block, so the two read as one unit. */}
              {currentProfile.matchPoints != null && (
                <div className="px-4 mb-4 -mt-1">
                  <MatchPointsBreakdown
                    points={currentProfile.matchPoints}
                    maxPoints={currentProfile.maxMatchPoints || 5}
                    factors={currentProfile.matchFactors || []}
                    confidence={currentProfile.matchConfidence}
                  />
                  {/* Only the levels that ask something of the owner. A chip on
                      every card saying "High" would be wallpaper; a warning
                      before the swipe is worth more than one after it. */}
                  {['Moderate', 'Caution'].includes(currentProfile.behaviourMatch?.level) && (
                    <div className="mt-2">
                      <BehaviourCompatibilityChip behaviour={currentProfile.behaviourMatch} />
                    </div>
                  )}
                </div>
              )}

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
                    <Heart size={24} strokeWidth={2.5} className="text-[#F87B68]" />
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
                    <Heart size={26} strokeWidth={2.5} className="text-[#4C8684]" />
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
                    <Heart size={26} strokeWidth={2.5} className="text-[#F87B68]" />
                  </button>
                </div>
              )}

              {/* Pet Parent / Owner Info Card */}
              <div className="px-4 mt-6 mb-8">
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                  {/* Soft Accent Header Tag */}
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
                    {/* Parent Photo */}
                    <div className="relative shrink-0">
                      <img 
                        src={currentProfile.ownerInfo?.avatar || currentProfile.ownerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                        alt={currentProfile.ownerInfo?.name || 'Pet Parent'} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#4C8684]/20 shadow-sm bg-gray-100" 
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#4C8684] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                        ✓
                      </div>
                    </div>

                    {/* Parent Name & Short Bio */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-black text-[#222] truncate">
                        {currentProfile.ownerInfo?.name?.split(' ')[0] || currentProfile.ownerName || 'Pet Parent'}
                      </h4>
                      <p className="text-xs font-medium text-gray-600 mt-1 leading-relaxed">
                        {currentProfile.ownerInfo?.bio || currentProfile.ownerBio || `Loving parent of ${currentProfile.name}. Always excited for weekend dog park playdates, social walks & happy furry meetups!`}
                      </p>
                    </div>
                  </div>
                </div>
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
