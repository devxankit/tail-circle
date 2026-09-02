import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, MapPin, Scissors, Info, ShowerHead, Flower2, Droplets, SprayCan, Wind, Brush, Sparkles, Check, Plus, Heart, Smile, Shield, Palette, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroomingShopById, getGroomingSlots } from '../../../../services/groomingApi';
import { useGroomingStore } from '../../../../store/useGroomingStore';

const ALL_SERVICES = [
  'Bath', 'Shampoo', 'Blow Dry', 'Brush', 'Nail Trim', 'Ear Clean', 
  'Sanitary Trim', 'Pad Trim', 'De-shedding', 'Coat Spa / Conditioner', 'Perfume'
];

const getPackageDef = (name) => {
  const n = name.toLowerCase();
  if (n.includes('basic')) {
    return {
      subtitle: 'Clean + Freshen Up',
      includes: [
        { name: 'Bath', desc: 'Gentle bath with lukewarm water.', icon: ShowerHead },
        { name: 'Shampoo', desc: 'Premium pet-safe shampoo wash.', icon: SprayCan },
        { name: 'Blow Dry', desc: 'Thorough blow dry for a soft coat.', icon: Wind },
        { name: 'Brush', desc: 'Brushing to remove tangles & dirt.', icon: Brush }
      ],
      Icon: ShowerHead,
      iconBg: 'bg-[#EAF3F1]',
      iconColor: 'text-[#66B4B1]'
    };
  } else if (n.includes('standard') || n.includes('full')) {
    return {
      subtitle: 'Complete Grooming',
      includes: [
        { name: 'Bath', desc: 'Gentle bath with lukewarm water.', icon: ShowerHead },
        { name: 'Shampoo', desc: 'Premium pet-safe shampoo wash.', icon: SprayCan },
        { name: 'Blow Dry', desc: 'Thorough blow dry for a soft coat.', icon: Wind },
        { name: 'Brush', desc: 'Brushing to remove tangles & dirt.', icon: Brush },
        { name: 'Nail Trim', desc: 'Safe nail clipping and filing.', icon: Scissors },
        { name: 'Ear Clean', desc: 'Gentle ear cleaning solution.', icon: Sparkles },
        { name: 'Sanitary Trim', desc: 'Trimming of sensitive areas.', icon: Scissors },
        { name: 'Pad Trim', desc: 'Hair removal from paw pads.', icon: Scissors }
      ],
      Icon: Scissors,
      iconBg: 'bg-[#FFF3E3]',
      iconColor: 'text-[#D9A05B]'
    };
  } else {
    return {
      subtitle: 'Deep Clean + Fur Care',
      includes: [
        { name: 'Bath', desc: 'Gentle bath with lukewarm water.', icon: ShowerHead },
        { name: 'Shampoo', desc: 'Premium pet-safe shampoo wash.', icon: SprayCan },
        { name: 'Blow Dry', desc: 'Thorough blow dry for a soft coat.', icon: Wind },
        { name: 'Brush', desc: 'Brushing to remove tangles & dirt.', icon: Brush },
        { name: 'Nail Trim', desc: 'Safe nail clipping and filing.', icon: Scissors },
        { name: 'Ear Clean', desc: 'Gentle ear cleaning solution.', icon: Sparkles },
        { name: 'Sanitary Trim', desc: 'Trimming of sensitive areas.', icon: Scissors },
        { name: 'Pad Trim', desc: 'Hair removal from paw pads.', icon: Scissors },
        { name: 'De-shedding', desc: 'Specialized de-shedding tool.', icon: Wind },
        { name: 'Coat Spa / Conditioner', desc: 'Deep conditioning treatment.', icon: Sparkles },
        { name: 'Perfume', desc: 'Pet-safe finishing fragrance.', icon: SprayCan }
      ],
      Icon: Flower2,
      iconBg: 'bg-[#F2E8FB]',
      iconColor: 'text-[#A874D4]'
    };
  }
};

/** Best-guess icon for a service name, shared by package chips and the add-on grid. */
const iconForService = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('bath') || n.includes('wash')) return ShowerHead;
  if (n.includes('shampoo') || n.includes('perfume') || n.includes('cologne') || n.includes('spray')) return SprayCan;
  if (n.includes('dry') || n.includes('shed') || n.includes('blow')) return Wind;
  if (n.includes('brush') && !n.includes('teeth')) return Brush;
  if (n.includes('teeth') || n.includes('dental')) return Smile;
  if (n.includes('trim') || n.includes('cut') || n.includes('nail') || n.includes('clip')) return Scissors;
  if (n.includes('paw') || n.includes('massage')) return Heart;
  if (n.includes('tick') || n.includes('flea')) return Shield;
  if (n.includes('color') || n.includes('dye')) return Palette;
  if (n.includes('facial') || n.includes('blueberry') || n.includes('spa') || n.includes('aroma')) return Flower2;
  if (n.includes('gland')) return Droplets;
  return Sparkles;
};

/**
 * The services listed under a package.
 *
 * Prefers the salon's own `includes` list — that is what the vendor typed into
 * their dashboard, and it is the whole point of the field. `getPackageDef`
 * remains as the fallback for seeded packages that never set one, so the
 * existing shops still render their familiar chips.
 */
const resolveIncludes = (pkg) => {
  if (pkg?.includes?.length) {
    return pkg.includes.map((name) => ({ name, desc: '', icon: iconForService(name) }));
  }
  return getPackageDef(pkg?.name || '').includes;
};

/**
 * The salon's photo strip.
 *
 * Swipe/scroll driven with CSS snap — no carousel library — but with the
 * affordances the bare scroll strip was missing: a dot per photo, a counter,
 * and tappable dots. Without them a multi-photo salon looked identical to a
 * single-photo one, so nobody knew to swipe.
 */
function GalleryStrip({ images, name }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(images.length - 1, index)));
  };

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory h-full hide-scrollbar"
      >
        {images.map((img, i) => (
          <img
            key={`${img}-${i}`}
            src={img}
            alt={`${name} photo ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            className="w-full h-full object-cover shrink-0 snap-center"
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {images.map((img, i) => (
              <button
                key={`dot-${img}-${i}`}
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
          <div className="absolute top-4 right-4 bg-black/45 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10">
            {active + 1} / {images.length}
          </div>
        </>
      )}
    </>
  );
}

// Helper to generate dates
const generateDates = () => {
  return Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      // The real Date, which is what the slots API and the booking payload need.
      value: d,
      id: `date_${i}`
    };
  });
};

export function GroomingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Bookable times come from the salon's own slot template, so a shop that
  // opens at noon no longer advertises a 9 AM slot it cannot honour.
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [showCompareModal, setShowCompareModal] = useState(false);

  const setStoreShop = useGroomingStore((s) => s.setShop);
  const setStorePackage = useGroomingStore((s) => s.setPackage);
  const setStoreDateTime = useGroomingStore((s) => s.setDateTime);
  const resetBooking = useGroomingStore((s) => s.resetBooking);

  useEffect(() => {
    loadShop();
    const generatedDates = generateDates();
    setDates(generatedDates);
    setSelectedDate(generatedDates[0]); // Select Today by default
  }, [id]);

  useEffect(() => {
    if (!shop || !selectedDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    getGroomingSlots(shop.id, selectedDate.value)
      .then((data) => { if (!cancelled) setTimeSlots(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setTimeSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [shop, selectedDate]);

  const loadShop = async () => {
    setLoading(true);
    try {
      const data = await getGroomingShopById(id);

      // The old fallback synthesised packages from the display-only
      // `servicesList` blob when the API returned no offerings. Those synthetic
      // entries have no catalogue id, so anything picked from them was rejected
      // at checkout — better to show the salon's real (possibly empty) menu.
      setShop(data);
      if (data.packages?.length > 0) {
        setSelectedPackage(data.packages[0]); // Select first package by default
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) return prev.filter(a => a.name !== addon.name);
      return [...prev, addon];
    });
  };

  /**
   * Hand the selection to the real checkout.
   *
   * This button used to just pop a "Booking Confirmed!" modal — nothing was
   * ever sent to the server, so the salon never saw the appointment and the
   * customer had no booking to cancel or reschedule. The remaining steps
   * (pet → visit type & address → payment → confirmation) already existed but
   * nothing navigated into them; seeding the store here connects them.
   */
  const handleConfirmBooking = () => {
    resetBooking();
    setStoreShop(shop);
    setStorePackage(selectedPackage);
    useGroomingStore.setState((state) => ({
      bookingData: { ...state.bookingData, addons: selectedAddons },
    }));
    setStoreDateTime(selectedDate.value.toISOString(), selectedSlot.time);
    navigate('/app/services/grooming/book/pet');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in fade-in">
        <div className="h-72 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded-lg w-3/4" />
          <div className="h-4 bg-gray-200 animate-pulse rounded-lg w-1/2" />
          <div className="h-20 bg-gray-200 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return <div className="p-8 text-center text-gray-500">Shop not found</div>;
  }

  const packagePrice = selectedPackage?.price || 0;
  const addonsPrice = selectedAddons.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalPrice = packagePrice + addonsPrice;
  const isReadyToBook = selectedPackage && selectedDate && selectedSlot;

  // Cover photo plus whatever else the salon uploaded, already de-duplicated by
  // the API client. Falls back to a single placeholder so the hero is never a
  // blank grey box for a salon that has not uploaded anything yet.
  const heroImages = shop.gallery?.length ? shop.gallery : [shop.image].filter(Boolean);

  // Rows of the comparison table: every service any of this salon's packages
  // lists, in a stable order. Using the fixed ALL_SERVICES list meant a salon
  // whose packages included anything unusual had it silently omitted.
  const comparisonRows = (() => {
    const seen = new Set();
    for (const p of shop.packages || []) {
      for (const inc of resolveIncludes(p)) seen.add(inc.name);
    }
    const ordered = ALL_SERVICES.filter((s) => seen.has(s));
    const extras = [...seen].filter((s) => !ALL_SERVICES.includes(s)).sort();
    return [...ordered, ...extras];
  })();

  return (
    <div className="h-full bg-[#FAF7F2] absolute inset-0 z-50 flex flex-col text-text-primary animate-in slide-in-from-right">
      
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        
        {/* Hero Section */}
        <div className="relative h-64 bg-gray-200 shrink-0">
          <GalleryStrip images={heroImages} name={shop.name} />
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          <button
            onClick={() => navigate('/app/services/grooming')}
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-sm active:scale-95 transition-transform z-10"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Studio Info */}
        <div className="bg-[#FAF7F2] px-4 pt-6 pb-6 relative z-10 -mt-6 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-[24px] font-black text-gray-900 leading-tight mb-1">{shop.name}</h1>
              <div className="flex items-center gap-1 text-gray-500 text-[13px]">
                <MapPin size={14} />
                <span>{shop.distance}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 bg-[#FAF7F2] text-[#66B4B1] px-2 py-0.5 rounded-full mb-1">
                <Star size={12} className="fill-[#66B4B1]" />
                <span className="text-[12px] font-bold">{shop.rating}</span>
              </div>
              <span className="text-[11px] text-gray-400">{shop.reviews} reviews</span>
            </div>
          </div>
          <p className="text-[13px] text-gray-500 font-medium leading-relaxed mt-4">
            {shop.about}
          </p>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-gray-100 my-3"></div>

        {/* Select Package */}
        {shop.packages?.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-900">1. Choose a Package</h2>
                <p className="text-[13px] text-gray-500">All packages include premium shampoos & gentle care.</p>
              </div>
              <button 
                onClick={() => setShowCompareModal(true)}
                className="text-[11px] font-bold text-accent-teal bg-[#EAF3F1] px-2.5 py-1 rounded-full shrink-0 active:scale-95 transition-transform mt-0.5"
              >
                Know more
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {shop.packages.map((pkg, idx) => {
                const isSelected = selectedPackage?.name === pkg.name;
                
                const def = getPackageDef(pkg.name);
                const subtitle = def.subtitle;
                const includes = resolveIncludes(pkg);
                const Icon = def.Icon;
                const iconBg = def.iconBg;
                const iconColor = def.iconColor;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative flex flex-col text-left border rounded-[20px] p-4 transition-all active:scale-[0.98] ${
                      isSelected 
                        ? 'border-accent-teal bg-white ring-1 ring-accent-teal shadow-sm' 
                        : 'border-border-light bg-white hover:border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-accent-teal text-white rounded-full p-0.5 z-10 shadow-sm">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                    {pkg.isPopular && !isSelected && (
                      <div className="absolute -top-2 left-4 bg-[#F87B68] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
                        Most Popular
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                        <Icon size={28} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-[15px] font-black text-gray-900 leading-tight mb-0.5">{pkg.name}</h3>
                            <p className={`text-[12px] font-bold ${iconColor}`}>{subtitle}</p>
                          </div>
                          <span className="text-[15px] font-black text-gray-900">₹{pkg.price}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      {includes.map((inc, i) => {
                        const IncIcon = inc.icon;
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                            <IncIcon size={13} className="text-gray-400" />
                            <span>{inc.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 bg-[#EAF3F1] text-[#599D9A] p-3 rounded-[12px] flex gap-3 items-start">
              <Sparkles size={18} className="shrink-0 mt-0.5" />
              <p className="text-[12px] font-medium leading-relaxed">
                Every package is performed by trained professionals using safe & pet-friendly products.
              </p>
            </div>
          </div>
        )}

        {/* Select Add-ons */}
        <div className="px-4 py-4">
          <h2 className="text-[17px] font-black text-gray-900">2. Add Extra Services</h2>
          <div className="flex items-center gap-1 mb-4 text-[13px] text-gray-500">
            <span>Not included in your package</span>
            <Info size={14} className="text-gray-400" />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {(shop.addons || []).map((addon, idx) => {
              const isSelected = selectedAddons.find(a => a.name === addon.name);
              
              const AddonIcon = iconForService(addon.name);

              return (
                <button
                  key={idx}
                  onClick={() => toggleAddon(addon)}
                  className={`relative flex flex-col items-center justify-center border rounded-[20px] p-3 transition-all active:scale-[0.98] ${
                    isSelected 
                      ? 'border-accent-teal bg-[#FAF7F2] ring-1 ring-accent-teal' 
                      : 'border-border-light bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-accent-teal text-white' : 'bg-[#EAF3F1] text-[#66B4B1]'
                  }`}>
                    {isSelected ? <Check size={10} strokeWidth={3} /> : <Plus size={12} strokeWidth={2.5} />}
                  </div>
                  
                  <div className="h-10 flex items-center justify-center mb-1 text-gray-700">
                    <AddonIcon size={24} strokeWidth={1.5} />
                  </div>
                  <span className="text-[12px] font-bold text-center leading-tight mb-1 text-gray-900">
                    {addon.name}
                  </span>
                  <span className="text-[11px] font-bold text-[#66B4B1]">
                    ₹{addon.price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Date */}
        <div className="px-4 py-4">
          <h2 className="text-[17px] font-black text-gray-900 mb-4">Select Date</h2>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4">
            {dates.map(date => {
              const isSelected = selectedDate?.id === date.id;
              return (
                <button
                  key={date.id}
                  onClick={() => setSelectedDate(date)}
                  className={`min-w-[64px] flex flex-col items-center justify-center rounded-[16px] py-3 transition-all active:scale-95 border ${
                    isSelected 
                      ? 'border-accent-teal bg-accent-teal text-white shadow-md' 
                      : 'border-border-light bg-white text-gray-500'
                  }`}
                >
                  <span className={`text-[11px] font-medium mb-1 ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                    {date.dayName}
                  </span>
                  <span className={`text-[20px] font-black leading-none mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {date.date}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {date.month}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Time Slot */}
        <div className="px-4 py-4 mb-8">
          <h2 className="text-[17px] font-black text-gray-900 mb-4">Select Time Slot</h2>
          {slotsLoading ? (
            <div className="flex gap-3 pb-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="min-w-[140px] h-[74px] rounded-[16px] bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="bg-white border border-border-light rounded-[16px] p-4 flex items-start gap-2">
              <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
                No slots open on {selectedDate?.fullDate}. Try another date.
              </p>
            </div>
          ) : (
            <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4">
              {timeSlots.map(slot => {
                const isSelected = selectedSlot?.time === slot.time;
                return (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`min-w-[140px] flex flex-col items-center justify-center rounded-[16px] py-3 transition-all active:scale-95 border ${
                      !slot.available
                        ? 'border-border-light bg-gray-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-accent-teal bg-[#FAF7F2]'
                          : 'border-border-light bg-white'
                    }`}
                  >
                    <span className={`text-[14px] font-black mb-1 ${
                      !slot.available ? 'text-gray-400' : isSelected ? 'text-accent-teal' : 'text-gray-900'
                    }`}>
                      {slot.time}
                    </span>
                    <span className={`text-[11px] ${
                      !slot.available ? 'text-gray-400' : isSelected ? 'text-accent-teal/80' : 'text-gray-400'
                    }`}>
                      {slot.available ? slot.period : 'Fully booked'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F2] border-t border-border-light p-4 z-20">
        {!selectedPackage && selectedAddons.length === 0 && (
          <div className="bg-[#FAF7F2] border border-[#FAF7F2] rounded-[16px] p-3 mb-3 flex items-start gap-2">
            <Info size={16} className="text-accent-teal shrink-0 mt-0.5" />
            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
              Services start from <span className="font-bold text-accent-teal">₹{shop.startingPrice}</span>. Select a package above to continue.
            </p>
          </div>
        )}
        
        <button 
          disabled={!isReadyToBook}
          onClick={handleConfirmBooking}
          className={`w-full h-[52px] rounded-full text-[15px] font-black transition-all flex items-center justify-center shadow-sm
            ${isReadyToBook 
              ? 'bg-[#F87B68] text-white hover:bg-[#F87B68] active:scale-[0.98]' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          {isReadyToBook ? `Continue • ₹${totalPrice}` : 'Select a Slot to Continue'}
        </button>
      </div>

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCompareModal(false)} />
          <div className="bg-white w-full rounded-t-[32px] p-6 relative z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col max-h-[90vh]">
            
            <button onClick={() => setShowCompareModal(false)} className="absolute top-6 right-6 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
               <X size={16} className="text-gray-600" />
            </button>

            <div className="overflow-y-auto hide-scrollbar pb-6 flex-1 -mx-6 px-6">
               {/* What's included section */}
               <h3 className="text-[13px] font-bold text-gray-900 mb-0.5">What's included in</h3>
               <h3 className="text-[17px] font-black text-accent-teal mb-6 leading-tight">{selectedPackage?.name || 'this Package'}?</h3>
               
               <div className="flex flex-col gap-5 mb-8">
                  {selectedPackage && resolveIncludes(selectedPackage).map((inc, i) => {
                     const IncIcon = inc.icon;
                     return (
                       <div key={i} className="flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] text-[#66B4B1] flex items-center justify-center shrink-0">
                           <IncIcon size={20} strokeWidth={1.5} />
                         </div>
                         <div>
                           <h4 className="text-[13px] font-bold text-gray-900 mb-0.5">{inc.name}</h4>
                           {inc.desc && <p className="text-[11px] text-gray-500 leading-tight">{inc.desc}</p>}
                         </div>
                       </div>
                     );
                  })}
               </div>
               
               <h3 className="text-[15px] font-black text-gray-900 mb-4">Package Comparison</h3>
               <div className="border border-gray-100 rounded-2xl overflow-hidden text-[11px] mb-2">
                  <table className="w-full text-left">
                     <thead>
                       <tr className="bg-[#FAF7F2]">
                         <th className="py-3 px-3 font-bold text-gray-900 w-1/3">Services</th>
                         {shop.packages.map(p => (
                            <th key={p.name} className="py-3 px-1 text-center border-l border-gray-100">
                              <div className="font-bold text-gray-900 text-[10px] truncate max-w-[50px] mx-auto">{p.name.split(' ')[0]}</div>
                              <div className="text-gray-500 font-medium text-[9px]">₹{p.price}</div>
                            </th>
                         ))}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 bg-white">
                        {comparisonRows.map((service, i) => (
                           <tr key={i}>
                             <td className="py-2.5 px-3 text-gray-700 font-medium">{service}</td>
                             {shop.packages.map(p => {
                               const hasService = resolveIncludes(p).some(inc => inc.name === service);
                               return (
                                 <td key={p.name} className="py-2.5 px-1 text-center border-l border-gray-100">
                                   {hasService ? (
                                      <div className="w-4 h-4 rounded-full bg-accent-teal text-white flex items-center justify-center mx-auto">
                                        <Check size={10} strokeWidth={3} />
                                      </div>
                                   ) : (
                                      <span className="text-gray-300 font-bold">—</span>
                                   )}
                                 </td>
                               );
                             })}
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            <button 
              onClick={() => setShowCompareModal(false)}
              className="w-full mt-4 bg-[#80C1BF] hover:bg-[#66B4B1] text-white h-[48px] rounded-full text-[15px] font-bold transition-all shrink-0 shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
