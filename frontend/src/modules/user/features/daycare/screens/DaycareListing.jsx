import React, { useState, useEffect } from 'react';
import { ChevronLeft, SlidersHorizontal, MapPin, Star, Heart, Search, Calendar, Headphones, ArrowRight, X, Check, Plus, Loader2, Mic } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDaycares, createBooking } from '../../../../../services/daycareApi';
import { fetchPublicBanners } from '../../../../../services/admin';
import { fetchMyPets, petAgeText } from '../../../../../services/pets';
import { api } from '../../../../../services/api';
import { DaycareFilters } from '../components/DaycareFilters';
import { useDaycareStore } from '../../../../../store/useDaycareStore';
import { useVoiceSearch } from '../../../../../hooks/useVoiceSearch';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${month}/${day}/${year}`;
};

export function DaycareListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showFiltersOnInit = searchParams.get('filters') === 'true';

  const setCenter = useDaycareStore(state => state.setCenter);
  const setLastConfirmedBooking = useDaycareStore(state => state.setLastConfirmedBooking);
  const resetBooking = useDaycareStore(state => state.resetBooking);

  // Fast Booking State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingCenter, setBookingCenter] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('plan_day');
  const [startDate, setStartDate] = useState(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 2);
    return tom.toISOString().split('T')[0];
  });
  const [customDates, setCustomDates] = useState(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return [tom.toISOString().split('T')[0]];
  });
  const [selectedPetId, setSelectedPetId] = useState('other');
  const [customPetName, setCustomPetName] = useState('');
  const [isPickupChecked, setIsPickupChecked] = useState(false);
  const [isMealsChecked, setIsMealsChecked] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [customBanner, setCustomBanner] = useState('');
  const [myPets, setMyPets] = useState([]);

  // Load the admin-managed daycare banner from the API.
  useEffect(() => {
    fetchPublicBanners()
      .then((rows) => setCustomBanner((rows || []).find((b) => b.key === 'daycare')?.image || ''))
      .catch(() => setCustomBanner(''));
  }, []);

  // Real pets for the "Choose Pet" picker — was hardcoded Bruno/Luna before.
  useEffect(() => {
    fetchMyPets()
      .then((pets) => {
        setMyPets(pets);
        if (pets.length > 0) setSelectedPetId(pets[0]._id);
      })
      .catch(() => setMyPets([]));
  }, []);

  const getCustomDays = () => {
    return customDates.length;
  };

  // Pricing calculations
  const getPlanPrice = (planId) => {
    if (!bookingCenter) return 0;
    const base = bookingCenter.pricePerDay || 499;
    if (planId === 'plan_day') return base;
    if (planId === 'plan_week') return Math.round(base * 5.2);
    if (planId === 'plan_month') return Math.round(base * 20);
    if (planId === 'custom') {
      return base * getCustomDays();
    }
    return base;
  };

  const getPlanDuration = (planId) => {
    if (planId === 'plan_day') return 1;
    if (planId === 'plan_week') return 6;
    if (planId === 'plan_month') return 30;
    if (planId === 'custom') return getCustomDays();
    return 1;
  };

  const planSubtotal = getPlanPrice(selectedPlanId);
  const durationDays = getPlanDuration(selectedPlanId);
  
  const addonCost = 
    (isPickupChecked ? 150 * durationDays : 0) + 
    (isMealsChecked ? 100 * durationDays : 0);

  const platformFee = 49;
  const totalPrice = planSubtotal + addonCost + platformFee;

  const calculateEndDate = (startStr, days) => {
    const d = new Date(startStr);
    d.setDate(d.getDate() + days - 1);
    return d.toISOString().split('T')[0];
  };

  const handleConfirmBooking = async () => {
    if (!bookingCenter) return;
    setIsBookingLoading(true);
    setBookingError('');

    let planName = 'Day Pass';
    let planUnit = 'day';
    let datesArr = [startDate];
    let dateTypeStr = 'Single Day';

    if (selectedPlanId === 'plan_day') {
      planName = 'Day Pass';
      planUnit = 'day';
      datesArr = [startDate];
      dateTypeStr = 'Single Day';
    } else if (selectedPlanId === 'plan_week') {
      planName = 'Weekly Care';
      planUnit = '6 days';
      datesArr = [startDate, calculateEndDate(startDate, 6)];
      dateTypeStr = 'Multiple Days';
    } else if (selectedPlanId === 'plan_month') {
      planName = 'Monthly Care';
      planUnit = '30 days';
      datesArr = [startDate, calculateEndDate(startDate, 30)];
      dateTypeStr = 'Monthly';
    } else if (selectedPlanId === 'custom') {
      const days = getCustomDays();
      planName = 'Custom Days';
      planUnit = `${days} days`;
      datesArr = customDates;
      dateTypeStr = 'Multiple Days';
    }

    const selectedPet = selectedPetId !== 'other' ? myPets.find((p) => p._id === selectedPetId) : null;
    const petName = selectedPet ? selectedPet.name : (customPetName || 'My Pet');
    const petBreed = selectedPet?.breed || 'Mixed Breed';

    const bookingPayload = {
      center: {
        id: bookingCenter.id,
        name: bookingCenter.name,
        image: bookingCenter.image,
        pricePerDay: bookingCenter.pricePerDay
      },
      plan: {
        id: selectedPlanId,
        name: planName,
        price: planSubtotal,
        unit: planUnit
      },
      dates: datesArr,
      dateType: dateTypeStr,
      dropoffTime: '8:00 AM',
      pickupTime: '6:00 PM',
      pet: {
        _id: selectedPet?._id,
        id: selectedPet?._id,
        name: petName,
        breed: petBreed
      },
      petAnswers: {
        breed: petBreed,
        age: selectedPet ? petAgeText(selectedPet) || '—' : '—',
        size: selectedPet?.size || 'Medium',
        gender: selectedPet?.gender || '—',
        vaccinated: selectedPet ? Boolean(selectedPet.health?.vaccinated) : false,
        aggressive: false,
        skinIssues: false,
        separationAnxiety: false,
        instructions: ''
      },
      addons: [
        ...(isPickupChecked ? [{ id: 'addon_1', name: 'Pickup & Drop', price: 150 }] : []),
        ...(isMealsChecked ? [{ id: 'addon_2', name: 'Meal', price: 100 }] : [])
      ],
      totalPrice: totalPrice,
      totalPaid: totalPrice,
      // Pay-later keeps this a single-tap flow (matches the existing UI, no
      // payment-method picker here) while still creating a real booking —
      // same mechanism grooming/PriceSummary.jsx's "COD" option uses.
      paymentMethod: 'Cash',
    };

    try {
      const confirmed = await createBooking(bookingPayload);
      setLastConfirmedBooking(confirmed);
      setIsBookingOpen(false);
      navigate('/app/services/daycare/book/success');
    } catch (err) {
      setBookingError(err?.response?.data?.message || 'Could not complete the booking. Please try again.');
    } finally {
      setIsBookingLoading(false);
    }
  };

  const [daycares, setDaycares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('Nearest'); // Nearest, Lowest Price, Highest Rated
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Heart state (saved) — real wishlist via /saved-items (targetType 'provider'),
  // shared with every other "save" heart in the app instead of a local-only list.
  const [savedDaycares, setSavedDaycares] = useState([]);

  useEffect(() => {
    api.get('/saved-items')
      .then(({ data }) => setSavedDaycares(
        data.filter((s) => s.targetType === 'provider').map((s) => String(s.targetId))
      ))
      .catch(() => setSavedDaycares([]));
  }, []);

  useEffect(() => {
    loadDaycares();
    if (showFiltersOnInit) {
      setTimeout(() => setShowFilters(true), 100);
    }
  }, [showFiltersOnInit]);

  const loadDaycares = async () => {
    setLoading(true);
    try {
      let data = await getDaycares();
      
      // Simple sorting logic
      if (sortBy === 'Lowest Price') {
        data = data.sort((a, b) => a.pricePerDay - b.pricePerDay);
      } else if (sortBy === 'Highest Rated') {
        data = data.sort((a, b) => b.rating - a.rating);
      } else {
        // Nearest (mock implementation: sort by parsed distance)
        data = data.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      }

      setDaycares(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadDaycares(); // reload to apply sort
    }
  }, [sortBy]);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    const alreadySaved = savedDaycares.includes(id);
    setSavedDaycares(alreadySaved ? savedDaycares.filter((x) => x !== id) : [...savedDaycares, id]);
    const call = alreadySaved
      ? api.delete('/saved-items', { body: { targetType: 'provider', targetId: id } })
      : api.post('/saved-items', { targetType: 'provider', targetId: id });
    call.catch(() => setSavedDaycares(savedDaycares)); // revert on failure
  };

  // Helper to map facilities to standard icons/emojis
  const getFacilityIcon = (facilityName) => {
    const name = facilityName.toLowerCase();
    if (name.includes('play')) return <span className="text-[12px]">🎾</span>;
    if (name.includes('supervision') || name.includes('cctv') || name.includes('secure') || name.includes('monitored')) {
      return <span className="text-[12px]">🛡️</span>;
    }
    if (name.includes('staff') || name.includes('caretaker')) return <span className="text-[12px]">👥</span>;
    if (name.includes('meals') || name.includes('food') || name.includes('nutritious')) return <span className="text-[12px]">🥣</span>;
    if (name.includes('photo') || name.includes('video') || name.includes('updates')) return <span className="text-[12px]">📸</span>;
    return <span className="text-[12px]">✨</span>;
  };

  const TOP_BADGES = [
    {
      title: 'Safe & Secure',
      desc: 'CCTV & 24x7 Supervision',
      icon: (
        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 11 2 2 4-4" />
          </svg>
        </div>
      )
    },
    {
      title: 'Trained Staff',
      desc: 'Pet Care Experts',
      icon: (
        <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      )
    },
    {
      title: 'Nutritious Meals',
      desc: 'Healthy & Fresh',
      icon: (
        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <span className="text-[14px] leading-none">🥣</span>
        </div>
      )
    },
    {
      title: 'Photo Updates',
      desc: 'Real-time Updates',
      icon: (
        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )
    }
  ];

  // Filtering list
  const filteredDaycares = daycares.filter(center => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      center.name.toLowerCase().includes(query) ||
      (center.location && center.location.toLowerCase().includes(query)) ||
      (center.distance && center.distance.toLowerCase().includes(query)) ||
      center.facilities.some(f => f.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-24">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-gray-100/40 px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <div>
            <h1 className="text-[19px] font-black text-gray-900 leading-tight flex items-center gap-1.5">
              Daycare Centers <span className="text-[17px]">🐾</span>
            </h1>
            <p className="text-[11.5px] font-medium text-gray-400">
              Safe, fun & loving daycare for your furry friend
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2">
        {/* Dynamic Daycare Banner */}
        <div className="px-4 mb-4">
          {customBanner ? (
            <div className="w-full rounded-[20px] overflow-hidden shadow-sm border border-gray-100/50 h-[170px]">
              <img 
                src={customBanner} 
                alt="Daycare Promo Banner" 
                className="w-full h-full object-cover block" 
              />
            </div>
          ) : (
            // Default fall-back daycare banner
            <div className="w-full rounded-[20px] overflow-hidden shadow-sm border border-gray-100/50 h-[170px]">
              <img 
                src="/assets/banners/banner_daycare.png" 
                alt="Daycare Promo Banner" 
                className="w-full h-full object-cover block" 
              />
            </div>
          )}
        </div>

        {/* Search Bar Input with Voice Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#599D9A]" />
            <input 
              type="text"
              placeholder="Search daycare center or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white h-11 rounded-[16px] pl-11 pr-20 outline-none border border-gray-200/80 focus:border-[#599D9A] transition-colors text-[13px] font-medium shadow-sm text-gray-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-11 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all cursor-pointer ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#599D9A] hover:bg-teal-50'
              }`}
              title={isListening ? "Listening..." : "Voice search"}
            >
              {isListening ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
            </button>

            {isListening && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#2C5753] text-white rounded-[16px] p-3 shadow-lg z-50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
                  <span className="truncate font-semibold">{transcript || 'Listening for daycare center...'}</span>
                </div>
                <button onClick={toggleListening} className="px-2 py-0.5 bg-white/20 rounded-full font-bold">Stop</button>
              </div>
            )}
          </div>
        </div>

        {/* Top Badges (Horizontal scroll) */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4 mb-4 pb-1">
          {TOP_BADGES.map((badge, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] shrink-0 min-w-[160px]"
            >
              {badge.icon}
              <div className="min-w-0">
                <h4 className="font-bold text-[12px] text-gray-800 leading-tight truncate">{badge.title}</h4>
                <p className="text-[9.5px] font-medium text-gray-400 mt-0.5 whitespace-nowrap">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>


        {/* Listing Container */}
        <div className="px-4 space-y-6">
          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-[28px] p-4 flex flex-col gap-4 border border-gray-100 shadow-sm animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-[125px] h-[125px] bg-gray-200 rounded-[20px] shrink-0"></div>
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-full w-full"></div>
                  <div className="h-10 bg-gray-200 rounded-2xl w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredDaycares.map(center => (
                <div 
                  key={center.id}
                  onClick={() => navigate(`/app/services/daycare/${center.id}`)}
                  className="bg-white rounded-[28px] p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-4 relative"
                >
                  {/* Upper Section: Image & Info */}
                  <div className="flex gap-4">
                    {/* Left Column: Image with Badge */}
                    <div className="w-[125px] h-[125px] shrink-0 relative rounded-[20px] overflow-hidden bg-gray-50">
                      <img 
                        src={center.image} 
                        alt={center.name} 
                        className="w-full h-full object-cover" 
                      />
                      {center.badge && (
                        <div className="absolute top-2.5 left-2.5 z-10">
                          {center.badge === 'Popular' && (
                            <span className="bg-[#FAF7F2] text-[#F87B68] px-2 py-0.5 rounded-full text-[9px] font-black border border-[#FCEAE7] flex items-center gap-0.5 shadow-sm">
                              ⭐ Popular
                            </span>
                          )}
                          {center.badge === 'Premium' && (
                            <span className="bg-[#FAF7F2] text-[#599D9A] px-2 py-0.5 rounded-full text-[9px] font-black border border-[#FAF7F2] flex items-center gap-0.5 shadow-sm">
                              ⭐ Premium
                            </span>
                          )}
                          {center.badge === 'Budget Friendly' && (
                            <span className="bg-[#FAF7F2] text-[#599D9A] px-2 py-0.5 rounded-full text-[9px] font-black border border-[#FAF7F2] flex items-center gap-0.5 shadow-sm">
                              ⭐ Budget
                            </span>
                          )}
                        </div>
                      )}
                      {/* Heart Button */}
                      <button
                        onClick={(e) => toggleSave(e, center._id)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-90 transition-all z-10 cursor-pointer"
                      >
                        <Heart
                          size={13}
                          className={`transition-colors ${
                            savedDaycares.includes(center._id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                    </div>

                    {/* Right Column: Name, Address, Rating, Timings, Pets */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      {/* Name and Rating */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15.5px] font-black text-gray-900 leading-tight flex items-center gap-1">
                            <span className="truncate">{center.name}</span>
                            {center.verified && (
                              <span className="inline-flex items-center justify-center bg-[#599D9A] text-white w-[14px] h-[14px] rounded-full shrink-0 shadow-sm">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" className="w-2.5 h-2.5">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </span>
                            )}
                          </h3>
                        </div>
                        {/* Rating Block */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-0.5 text-[12px] font-black text-gray-800 leading-none">
                            <Star size={11} className="fill-[#F6C0B6] text-[#F87B68]" />
                            <span>{center.rating}</span>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 mt-1 block">
                            ({center.reviews} Reviews)
                          </span>
                        </div>
                      </div>

                      {/* Address and Distance */}
                      <div>
                        <p className="text-[11.5px] font-bold text-gray-500 flex items-center gap-0.5 leading-tight truncate">
                          <MapPin size={11} className="text-[#66B4B1] shrink-0" />
                          <span>{center.location || 'Indore, Madhya Pradesh'}</span>
                        </p>
                        <span className="text-[10px] text-gray-400 font-bold ml-3.5 mt-0.5 block">
                          {center.distance} away
                        </span>
                      </div>

                      {/* Open Timings */}
                      <div className="flex items-center text-[11px] font-bold">
                        <span className="text-emerald-600">Open Now</span>
                        <span className="text-gray-500 font-medium ml-1.5">
                          {center.openTime || '7:00 AM'} – {center.closeTime || '7:00 PM'}
                        </span>
                      </div>

                      {/* Allowed Pets */}
                      <div className="flex gap-1.5 mt-0.5">
                        <span className="bg-[#FAF7F2] border border-[#FAF7F2] text-[#BA5C4E] px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-0.5 shadow-sm">
                          🐕 Dogs
                        </span>
                        <span className="bg-[#FAF7F2] border border-[#FAF7F2] text-[#40716F] px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-0.5 shadow-sm">
                          🐈 Cats
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Facilities Scroll */}
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 py-0.5">
                    {center.facilities.map((fac) => (
                      <div 
                        key={fac} 
                        className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full shrink-0 text-[10px] font-bold text-gray-600 shadow-sm"
                      >
                        {getFacilityIcon(fac)}
                        <span>{fac}</span>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-0.5"></div>

                  {/* Bottom Section: Price & Book Now */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">
                        Starting from
                      </span>
                      <div className="flex items-baseline mt-0.5">
                        <span className="text-[20px] font-black text-gray-900 leading-none">₹{center.pricePerDay}</span>
                        <span className="text-[12px] text-gray-400 font-bold ml-0.5">/ Day</span>
                      </div>
                      <span className="text-[9.5px] text-emerald-700 font-black block mt-0.5">
                        Includes meals, play & care
                      </span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookingCenter(center);
                        setCenter(center);
                        setIsBookingOpen(true);
                      }}
                      className="bg-[#66B4B1] hover:bg-[#599D9A] text-white px-4.5 py-3 rounded-2xl text-[12.5px] font-black flex items-center gap-1.5 shadow-md shadow-[#66B4B1]/10 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Calendar size={14} />
                      <span>Book Now</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* No Results Fallback */}
              {filteredDaycares.length === 0 && (
                <div className="text-center py-12 px-4 bg-white rounded-[28px] border border-gray-100 shadow-sm">
                  <span className="text-[36px] block mb-2">🔍</span>
                  <h3 className="text-[14px] font-black text-gray-900">No daycare centers found</h3>
                  <p className="text-[11.5px] text-gray-400 mt-1 font-bold max-w-[240px] mx-auto leading-relaxed">
                    Try searching for another center name or specific facilities.
                  </p>
                  <button 
                    onClick={() => { setSearchQuery(''); setIsSearching(false); }}
                    className="mt-4 text-[12px] font-black text-[#66B4B1] bg-[#66B4B1]/10 px-4 py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </>
          )}

          {/* Bottom Support Banner */}
          <div className="bg-[#FAF7F2] border border-[#FAF7F2] rounded-[24px] p-4 flex items-center justify-between gap-3 shadow-sm mt-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#66B4B1] text-white flex items-center justify-center shrink-0">
                <Headphones size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[13.5px] font-black text-gray-900 leading-tight">Can't find the right daycare?</h4>
                <p className="text-[10.5px] font-bold text-gray-400 mt-0.5 leading-tight">
                  Our pet experts will help you find the best match.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/app/profile/support')}
              className="border border-[#66B4B1] text-[#66B4B1] px-3.5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap hover:bg-[#66B4B1]/5 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Contact Us</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>

      <DaycareFilters 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        onApply={() => setShowFilters(false)} 
      />

      {/* Simplified Fast Booking Drawer */}
      {isBookingOpen && bookingCenter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsBookingOpen(false)}></div>
          
          <div className="relative w-full max-w-md bg-white rounded-t-[32px] p-5 pb-8 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom duration-300 text-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[17px] font-black text-gray-900">Quick Booking</h3>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{bookingCenter.name}</p>
              </div>
              <button 
                onClick={() => setIsBookingOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-90 transition-all cursor-pointer animate-in zoom-in-50 duration-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Select Plan */}
              <div>
                <label className="text-[12.5px] font-bold text-gray-800 block mb-2">Select Plan</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'plan_day', name: 'Day Pass', desc: '1 Day' },
                    { id: 'plan_week', name: '6 Days', desc: 'Weekly' },
                    { id: 'plan_month', name: '30 Days', desc: 'Monthly' },
                    { id: 'custom', name: 'Custom', desc: 'Pick Range' }
                  ].map(p => {
                    const isSel = selectedPlanId === p.id;
                    const price = getPlanPrice(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-[20px] border transition-all cursor-pointer w-full ${
                          isSel 
                            ? 'border-[#66B4B1] bg-white text-[#66B4B1] shadow-sm' 
                            : 'border-gray-100 bg-[#FAF7F2] hover:border-gray-200'
                        }`}
                      >
                        <span className={`text-[11px] font-extrabold whitespace-nowrap ${isSel ? 'text-[#66B4B1]' : 'text-gray-500'}`}>{p.name}</span>
                        <span className={`text-[14.5px] font-black mt-1 ${isSel ? 'text-[#66B4B1]' : 'text-gray-800'}`}>
                          {p.id === 'custom' ? `₹${bookingCenter.pricePerDay}` : `₹${price}`}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 mt-1 whitespace-nowrap">
                          {p.id === 'custom' ? '/ Day' : p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Dates */}
              {selectedPlanId === 'custom' ? (
                <div className="space-y-3">
                  <label className="text-[12.5px] font-bold text-gray-800 block">Select Booking Dates</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {customDates.map((dateStr, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <div className="w-full bg-gray-50/40 border border-gray-100 rounded-[18px] h-14 px-4 flex items-center justify-between text-gray-800 font-bold text-[14px]">
                            <span>{formatDateDisplay(dateStr)}</span>
                            <Calendar size={18} className="text-gray-900" />
                          </div>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={dateStr}
                            onChange={(e) => {
                              const newDates = [...customDates];
                              newDates[idx] = e.target.value;
                              setCustomDates(newDates);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                        </div>
                        {customDates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newDates = customDates.filter((_, i) => i !== idx);
                              setCustomDates(newDates);
                            }}
                            className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-500 rounded-[18px] flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-all cursor-pointer shrink-0 active:scale-90"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastDate = customDates[customDates.length - 1] || new Date().toISOString().split('T')[0];
                      const nextDate = new Date(lastDate);
                      nextDate.setDate(nextDate.getDate() + 1);
                      setCustomDates([...customDates, nextDate.toISOString().split('T')[0]]);
                    }}
                    className="w-full h-11 border border-dashed border-[#66B4B1] text-[#66B4B1] hover:bg-[#66B4B1]/5 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 mt-1 bg-transparent"
                  >
                    <Plus size={14} strokeWidth={3} /> Add Another Day
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-[12.5px] font-bold text-gray-800 block mb-2">Select Start Date</label>
                  <div className="relative w-full">
                    <div className="w-full bg-gray-50/40 border border-gray-100 rounded-[18px] h-14 px-4 flex items-center justify-between text-gray-800 font-bold text-[14px]">
                      <span>{formatDateDisplay(startDate)}</span>
                      <Calendar size={18} className="text-gray-900" />
                    </div>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                  </div>
                </div>
              )}

              {/* Choose Pet */}
              <div>
                <label className="text-[12.5px] font-bold text-gray-800 block mb-2">Choose Pet</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    ...myPets.map((p) => ({ id: p._id, name: p.name })),
                    { id: 'other', name: 'Other Pet' }
                  ].map(p => {
                    const isSel = selectedPetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPetId(p.id)}
                        className={`h-11 flex items-center justify-center px-5 rounded-[16px] border text-[13px] font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'border-[#66B4B1] bg-white text-[#66B4B1]'
                            : 'border-gray-100 bg-[#FAF7F2] text-gray-700 hover:border-gray-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
                {selectedPetId === 'other' && (
                  <input
                    type="text"
                    placeholder="Enter Pet Name"
                    value={customPetName}
                    onChange={(e) => setCustomPetName(e.target.value)}
                    className="mt-2.5 w-full bg-gray-50/60 border border-gray-100 rounded-xl h-11 px-4 text-[13px] font-medium text-gray-800 focus:border-[#66B4B1] focus:bg-white outline-none transition-all placeholder:text-gray-400"
                  />
                )}
              </div>

              {/* Optional Add-ons */}
              <div>
                <label className="text-[12.5px] font-bold text-gray-800 block mb-2">Add-ons (Optional)</label>
                <div className="space-y-2.5">
                  <button 
                    type="button"
                    onClick={() => setIsPickupChecked(!isPickupChecked)}
                    className={`w-full flex items-center justify-between p-4 rounded-[18px] border cursor-pointer transition-all duration-200 ${
                      isPickupChecked ? 'border-[#66B4B1] bg-white shadow-xs' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${
                        isPickupChecked ? 'border-[#66B4B1] bg-[#66B4B1]' : 'border-gray-300 bg-white'
                      }`}>
                        {isPickupChecked && <Check size={12} className="text-white" strokeWidth={3.5} />}
                      </div>
                      <span className={`text-[13px] font-bold ${isPickupChecked ? 'text-gray-900' : 'text-gray-700'}`}>
                        Pickup & Drop Service
                      </span>
                    </div>
                    <span className="text-[13.5px] font-extrabold text-gray-900">₹150<span className="text-[10px] text-gray-400 font-medium font-sans">/day</span></span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setIsMealsChecked(!isMealsChecked)}
                    className={`w-full flex items-center justify-between p-4 rounded-[18px] border cursor-pointer transition-all duration-200 ${
                      isMealsChecked ? 'border-[#66B4B1] bg-white shadow-xs' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${
                        isMealsChecked ? 'border-[#66B4B1] bg-[#66B4B1]' : 'border-gray-300 bg-white'
                      }`}>
                        {isMealsChecked && <Check size={12} className="text-white" strokeWidth={3.5} />}
                      </div>
                      <span className={`text-[13px] font-bold ${isMealsChecked ? 'text-gray-900' : 'text-gray-700'}`}>
                        Nutritious Meals
                      </span>
                    </div>
                    <span className="text-[13.5px] font-extrabold text-gray-900">₹100<span className="text-[10px] text-gray-400 font-medium font-sans">/day</span></span>
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50/40 rounded-[20px] p-5 space-y-3.5 mt-2 border border-gray-100/30">
                <div className="flex justify-between items-center text-[13px] font-medium text-gray-500">
                  <span>
                    Plan cost ({selectedPlanId === 'plan_day' ? '1 Day' : selectedPlanId === 'plan_week' ? '6 Days' : selectedPlanId === 'plan_month' ? '30 Days' : `${getPlanDuration('custom')} Days`})
                  </span>
                  <span className="font-extrabold text-gray-800">₹{planSubtotal}</span>
                </div>
                {addonCost > 0 && (
                  <div className="flex justify-between items-center text-[13px] font-medium text-gray-500">
                    <span>Add-ons total</span>
                    <span className="font-extrabold text-gray-800">₹{addonCost}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[13px] font-medium text-gray-500">
                  <span>Platform fee</span>
                  <span className="font-extrabold text-gray-800">₹{platformFee}</span>
                </div>
                <div className="h-px bg-gray-100/80 w-full my-1"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[14.5px] font-black text-gray-900">Total Amount</span>
                  <span className="text-[18px] font-black text-[#66B4B1]">₹{totalPrice}</span>
                </div>
              </div>

              {/* Action Button */}
              {bookingError && (
                <p className="text-[12px] font-bold text-rose-500 text-center -mb-1">{bookingError}</p>
              )}
              <button
                onClick={handleConfirmBooking}
                disabled={isBookingLoading || (selectedPetId === 'other' && !customPetName.trim())}
                className="w-full py-4 mt-2 rounded-[18px] font-black text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isBookingLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay & Book Now`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
