import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Heart, Star, MapPin, Calendar, Clock, Award, Users, ChevronRight, User, X, Check, Plus, Loader2 } from 'lucide-react';
import { getDaycareById } from '../../../../../services/daycareApi';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${month}/${day}/${year}`;
};

export function DaycareDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const setCenter = useDaycareStore(state => state.setCenter);
  const setLastConfirmedBooking = useDaycareStore(state => state.setLastConfirmedBooking);
  const resetBooking = useDaycareStore(state => state.resetBooking);
  
  const [center, setDaycareCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  // Heart state (saved)
  const [savedDaycares, setSavedDaycares] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedDaycares') || '[]');
    } catch {
      return [];
    }
  });

  // Fast Booking State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
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
  const [selectedPetId, setSelectedPetId] = useState('pet1');
  const [customPetName, setCustomPetName] = useState('');
  const [isPickupChecked, setIsPickupChecked] = useState(false);
  const [isMealsChecked, setIsMealsChecked] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  useEffect(() => {
    loadCenter();
  }, [id]);

  const loadCenter = async () => {
    try {
      const data = await getDaycareById(id);
      setDaycareCenter(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomDays = () => {
    return customDates.length;
  };

  // Pricing calculations
  const getPlanPrice = (planId) => {
    if (!center) return 0;
    const base = center.pricePerDay || 499;
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

  const handleSelectPlan = () => {
    setCenter(center);
    setIsBookingOpen(true);
  };

  const calculateEndDate = (startStr, days) => {
    const d = new Date(startStr);
    d.setDate(d.getDate() + days - 1);
    return d.toISOString().split('T')[0];
  };

  const handleConfirmBooking = async () => {
    setIsBookingLoading(true);
    
    // Simulate booking loading
    await new Promise(r => setTimeout(r, 1200));

    const bookingId = `TCG${Math.floor(10000000 + Math.random() * 90000000)}`;
    
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

    const petName = selectedPetId === 'other' ? (customPetName || 'Rocky') : (selectedPetId === 'pet1' ? 'Bruno' : 'Luna');
    const petBreed = selectedPetId === 'pet1' ? 'Golden Retriever' : (selectedPetId === 'pet2' ? 'Labrador' : 'Mixed Breed');

    const newBooking = {
      id: bookingId,
      center: {
        id: center.id,
        name: center.name,
        image: center.image,
        pricePerDay: center.pricePerDay
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
        id: selectedPetId === 'other' ? 'pet_custom' : selectedPetId,
        name: petName,
        breed: petBreed
      },
      petAnswers: {
        breed: petBreed,
        age: '2 Years',
        size: 'Medium',
        gender: 'Male',
        vaccinated: true,
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
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('daycareBookings') || '[]');
      localStorage.setItem('daycareBookings', JSON.stringify([newBooking, ...existing]));
      setLastConfirmedBooking(newBooking);
    } catch (e) {
      console.error(e);
    }

    setIsBookingLoading(false);
    setIsBookingOpen(false);
    navigate('/app/services/daycare/book/success');
  };

  const toggleSave = (e, daycareId) => {
    e.stopPropagation();
    let updated;
    if (savedDaycares.includes(daycareId)) {
      updated = savedDaycares.filter(x => x !== daycareId);
    } else {
      updated = [...savedDaycares, daycareId];
    }
    setSavedDaycares(updated);
    localStorage.setItem('savedDaycares', JSON.stringify(updated));
  };

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

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FAF7F2] animate-pulse">
        <div className="w-full h-[360px] bg-gray-200"></div>
        <div className="p-5 space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded-[20px] w-full mt-6"></div>
        </div>
      </div>
    );
  }

  if (!center) return <div className="p-4 text-center mt-20 font-bold text-gray-500">Daycare not found</div>;

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">
      
      {/* Header Actions */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-5 flex items-center justify-between z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={22} className="text-gray-900 -ml-0.5" strokeWidth={2.5} />
        </button>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer">
            <Share2 size={18} className="text-gray-900" />
          </button>
          <button 
            onClick={(e) => toggleSave(e, center.id)}
            className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Heart 
              size={18} 
              className={savedDaycares.includes(center.id) ? 'fill-red-500 text-red-500' : 'text-gray-900'} 
            />
          </button>
        </div>
      </div>

      {/* Hero Image Section */}
      <div className="w-full h-[380px] relative shrink-0">
        <img src={center.image} alt={center.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>
        
        {/* Popular Tag over Hero */}
        {center.badge && (
          <div className="absolute top-20 left-4 z-10">
            {center.badge === 'Popular' && (
              <span className="bg-[#FAF7F2] text-[#F87B68] px-3 py-1 rounded-full text-[10px] font-black border border-[#FCEAE7] flex items-center gap-1 shadow-md">
                ⭐ Popular
              </span>
            )}
            {center.badge === 'Premium' && (
              <span className="bg-[#FAF7F2] text-[#599D9A] px-3 py-1 rounded-full text-[10px] font-black border border-[#FAF7F2] flex items-center gap-1 shadow-md">
                ⭐ Premium
              </span>
            )}
            {center.badge === 'Budget Friendly' && (
              <span className="bg-[#FAF7F2] text-[#599D9A] px-3 py-1 rounded-full text-[10px] font-black border border-[#FAF7F2] flex items-center gap-1 shadow-md">
                ⭐ Budget Friendly
              </span>
            )}
          </div>
        )}

        {/* Gallery Thumbnails Floating */}
        <div className="absolute bottom-12 left-5 flex gap-2 z-10">
          {center.gallery && center.gallery.slice(0, 3).map((img, idx) => (
            <div key={idx} className="w-[50px] h-[50px] rounded-[14px] border-[2px] border-white/80 overflow-hidden shadow-lg">
              <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {center.gallery && center.gallery.length > 3 && (
            <div className="w-[50px] h-[50px] rounded-[14px] border-[2px] border-white/80 overflow-hidden shadow-lg relative bg-black">
              <img src={center.gallery[3]} className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-[12px]">+{center.gallery.length - 3}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-5 pt-6 bg-white rounded-t-[32px] -mt-10 relative z-10 shadow-xl pb-20">
        
        {/* Title, Verified Badge and Rating */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-4 min-w-0">
            <h1 className="text-[25px] font-black text-gray-900 leading-tight flex items-center gap-1.5 flex-wrap">
              <span>{center.name}</span>
              {center.verified && (
                <span className="inline-flex items-center justify-center bg-[#599D9A] text-white w-5 h-5 rounded-full shrink-0 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-[#FAF7F2] px-3 py-1.5 rounded-[12px] border border-amber-100 shrink-0 shadow-sm">
            <Star size={16} className="fill-[#F6C0B6] text-[#F87B68]" />
            <span className="text-[14px] font-black text-gray-900">{center.rating}</span>
            <span className="text-[11px] font-bold text-gray-400">({center.reviews})</span>
          </div>
        </div>

        {/* Location & Distance */}
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-gray-500">
          <MapPin size={15} className="text-[#66B4B1] shrink-0" />
          <span>{center.location || 'Indore, Madhya Pradesh'}</span>
          <span className="text-gray-400 font-semibold">({center.distance} away)</span>
        </div>

        {/* Timing and Allowed Pets Row */}
        <div className="flex items-center justify-between border-t border-gray-100/60 pt-4 mt-4 mb-6">
          <div className="flex items-center gap-1.5 text-[13px] font-black">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-600">Open Now</span>
            <span className="text-gray-400 font-semibold">•</span>
            <span className="text-gray-600 font-bold">{center.openTime || '7:00 AM'} – {center.closeTime || '7:00 PM'}</span>
          </div>
          
          <div className="flex items-center gap-1 text-[13px] font-bold text-gray-500">
            <span>🐕 Dogs</span>
            <span className="text-gray-300 font-normal">|</span>
            <span>🐈 Cats</span>
          </div>
        </div>

        {/* Horizontal Badges scroll */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-5 px-5 mb-8 pb-1">
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

        {/* What's Included Grid Checklist */}
        <div className="mb-8">
          <h2 className="text-[18px] font-black text-gray-900 mb-4">What's Included</h2>
          <div className="grid grid-cols-2 gap-3">
            {center.facilities.map((fac) => (
              <div 
                key={fac}
                className="bg-[#FAF7F2] border border-[#DFF0EF] text-[#4C8684] px-3.5 py-3 rounded-[18px] text-[12px] font-black flex items-center gap-2 shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-[#66B4B1] text-white flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="truncate">{fac}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity / Attributes Grid */}
        <div className="grid grid-cols-4 gap-2 border-t border-b border-gray-100 py-6 mt-8 mb-8">
          <div className="flex flex-col items-center justify-center text-center px-1">
            <Users size={18} className="text-gray-400 mb-1" />
            <span className="text-[9px] text-gray-400 font-black block uppercase tracking-wider">Capacity</span>
            <span className="text-[12px] font-black text-gray-900 mt-0.5">20 Dogs</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1 border-l border-gray-100">
            <Award size={18} className="text-gray-400 mb-1" />
            <span className="text-[9px] text-gray-400 font-black block uppercase tracking-wider">Best For</span>
            <span className="text-[12px] font-black text-gray-900 mt-0.5">All Breeds</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1 border-l border-gray-100">
            <Calendar size={18} className="text-gray-400 mb-1" />
            <span className="text-[9px] text-gray-400 font-black block uppercase tracking-wider">For Dogs</span>
            <span className="text-[12px] font-black text-gray-900 mt-0.5">3 Months+</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1 border-l border-gray-100">
            <Clock size={18} className="text-gray-400 mb-1" />
            <span className="text-[9px] text-gray-400 font-black block uppercase tracking-wider">Open Today</span>
            <span className="text-[11.5px] font-black text-[#66B4B1] mt-0.5 truncate w-full">7 AM – 7 PM</span>
          </div>
        </div>

        {/* About Us */}
        <div className="mb-8">
          <h2 className="text-[18px] font-black text-gray-900 mb-3">About Us</h2>
          <p className="text-[14px] text-gray-600 font-semibold leading-relaxed">
            {center.about}
          </p>
          <button className="text-[#66B4B1] font-black text-[13px] mt-3 active:opacity-75 flex items-center gap-1 cursor-pointer">
            Read full description <ChevronRight size={14} />
          </button>
        </div>

        {/* Host Profile */}
        {center.host && (
          <div className="mb-8">
            <h2 className="text-[18px] font-black text-gray-900 mb-4">Meet your Host</h2>
            <div className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm flex items-center gap-4">
              <img src={center.host.image} alt={center.host.name} className="w-16 h-16 rounded-full object-cover border border-gray-100 shadow-sm" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-black text-gray-900">{center.host.name}</h3>
                <p className="text-[13px] text-[#66B4B1] font-black mb-0.5">{center.host.role}</p>
                <p className="text-[12px] text-gray-500 font-semibold flex items-center gap-1">
                  <User size={12} className="text-gray-400" /> {center.host.experience}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Activities */}
        {center.activities && (
          <div className="mb-8">
            <h2 className="text-[18px] font-black text-gray-900 mb-4">Daily Schedule</h2>
            <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm">
              <div className="relative border-l-2 border-gray-100 ml-2 space-y-6">
                {center.activities.map((act, idx) => (
                  <div key={idx} className="relative flex items-center pl-6">
                    <div className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-[#66B4B1] bg-white"></div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[14px] font-bold text-gray-900">{act.name}</span>
                      <span className="text-[11.5px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-[6px]">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5 flex items-center justify-between pb-8 z-20">
        <div>
          <div className="flex items-end gap-0.5">
            <span className="text-[22px] font-black text-gray-900 leading-none">₹{center.pricePerDay}</span>
            <span className="text-[13px] text-gray-400 font-bold leading-tight mb-0.5">/ Day</span>
          </div>
          <p className="text-[11.5px] text-gray-400 font-bold mt-1">Pricing starts from</p>
        </div>
        <button 
          onClick={handleSelectPlan}
          className="w-[55%] py-4 rounded-[18px] font-black text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all cursor-pointer"
        >
          Book Now
        </button>
      </div>

      {/* Simplified Fast Booking Drawer */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsBookingOpen(false)}></div>
          
          <div className="relative w-full max-w-md bg-white rounded-t-[32px] p-5 pb-8 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom duration-300 text-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[17px] font-black text-gray-900">Quick Booking</h3>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{center.name}</p>
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
                          {p.id === 'custom' ? `₹${center.pricePerDay}` : `₹${price}`}
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
                <div className="flex gap-2">
                  {[
                    { id: 'pet1', name: 'Bruno' },
                    { id: 'pet2', name: 'Luna' },
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
