import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, Scissors, Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroomingShopById } from '../../../../services/groomingApi';

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
      id: `date_${i}`
    };
  });
};

const timeSlots = [
  { id: 't1', period: 'Morning', time: '9:00 AM \u2013 11:00 AM' },
  { id: 't2', period: 'Afternoon', time: '1:00 PM \u2013 3:00 PM' },
  { id: 't3', period: 'Evening', time: '5:00 PM \u2013 7:00 PM' },
];

export function GroomingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedAddons, setSelectedAddons] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadShop();
    const generatedDates = generateDates();
    setDates(generatedDates);
    setSelectedDate(generatedDates[0]); // Select Today by default
  }, [id]);

  const loadShop = async () => {
    setLoading(true);
    try {
      const data = await getGroomingShopById(id);
      setShop(data);
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

  const handleConfirmBooking = () => {
    setShowSuccessModal(true);
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

  const totalPrice = selectedAddons.reduce((sum, item) => sum + item.startsAt, 0);
  const isReadyToBook = selectedAddons.length > 0 && selectedDate && selectedSlot;

  return (
    <div className="h-full bg-[#FAF7F2] absolute inset-0 z-50 flex flex-col text-text-primary animate-in slide-in-from-right">
      
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        
        {/* Hero Section */}
        <div className="relative h-64 bg-gray-200 shrink-0">
          <div className="flex overflow-x-auto snap-x snap-mandatory h-full hide-scrollbar">
            {(shop.gallery && shop.gallery.length > 0 ? shop.gallery : [shop.image]).map((img, i) => (
              <img key={i} src={img} alt={`Slide ${i+1}`} className="w-full h-full object-cover shrink-0 snap-center" />
            ))}
          </div>
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          <button 
            onClick={() => navigate('/app/services/grooming')} 
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-sm active:scale-95 transition-transform"
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
        <div className="w-full h-px bg-border-light my-2 px-4"><div className="w-full h-full bg-border-light"></div></div>

        {/* Select Add-ons */}
        <div className="px-4 py-4">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-[17px] font-black text-gray-900">Select Add-ons</h2>
            <span className="text-[11px] text-gray-400 font-medium">Tap to add • prices per service</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {shop.servicesList?.map((svc, idx) => {
              const isSelected = selectedAddons.find(a => a.name === svc.name);
              return (
                <button
                  key={idx}
                  onClick={() => toggleAddon(svc)}
                  className={`flex flex-col items-center justify-center border rounded-2xl py-2 px-4 transition-all active:scale-95 ${
                    isSelected 
                      ? 'border-accent-teal bg-[#FAF7F2]' 
                      : 'border-border-light bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`text-[13px] font-bold mb-0.5 ${isSelected ? 'text-accent-teal' : 'text-gray-800'}`}>
                    {svc.name}
                  </span>
                  <span className={`text-[11px] ${isSelected ? 'text-accent-teal/80' : 'text-gray-400'}`}>
                    ₹{svc.startsAt}
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
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4">
            {timeSlots.map(slot => {
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`min-w-[140px] flex flex-col items-center justify-center rounded-[16px] py-3 transition-all active:scale-95 border ${
                    isSelected 
                      ? 'border-accent-teal bg-[#FAF7F2]' 
                      : 'border-border-light bg-white'
                  }`}
                >
                  <span className={`text-[14px] font-black mb-1 ${isSelected ? 'text-accent-teal' : 'text-gray-900'}`}>
                    {slot.period}
                  </span>
                  <span className={`text-[11px] ${isSelected ? 'text-accent-teal/80' : 'text-gray-400'}`}>
                    {slot.time}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F2] border-t border-border-light p-4 z-20">
        {selectedAddons.length === 0 && (
          <div className="bg-[#FAF7F2] border border-[#FAF7F2] rounded-[16px] p-3 mb-3 flex items-start gap-2">
            <Info size={16} className="text-accent-teal shrink-0 mt-0.5" />
            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
              Services start from <span className="font-bold text-accent-teal">₹{shop.startingPrice}</span>. Select add-ons above to see your exact total.
            </p>
          </div>
        )}
        
        <button 
          disabled={!isReadyToBook}
          onClick={handleConfirmBooking}
          className={`w-full h-[52px] rounded-full text-[15px] font-black transition-all flex items-center justify-center shadow-sm
            ${isReadyToBook 
              ? 'bg-[#F87B68] text-white hover:bg-[#F87B68] active:scale-[0.98]' 
              : 'bg-[#FAF7F2] text-white cursor-not-allowed'}`}
        >
          {isReadyToBook ? `Confirm Booking • ₹${totalPrice}` : 'Select a Slot to Continue'}
        </button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => navigate('/app/services/grooming', { replace: true })} />
          <div className="bg-[#FAF7F2] w-full max-w-sm rounded-[32px] p-6 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col items-center">
            
            <div className="w-20 h-20 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
              <Scissors size={32} className="text-accent-teal" />
            </div>
            
            <h2 className="text-[22px] font-black text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-center text-[13px] text-gray-500 mb-6 px-4">
              Your grooming session at {shop.name} is booked!
            </p>

            <div className="w-full bg-[#FAF7F2] rounded-[16px] border border-[#FAF7F2] overflow-hidden mb-6">
              <div className="flex justify-between py-3 px-4 border-b border-[#FAF7F2]">
                <span className="text-[12px] text-gray-400">Salon</span>
                <span className="text-[12px] font-bold text-gray-900 text-right">{shop.name}</span>
              </div>
              <div className="flex justify-between py-3 px-4 border-b border-[#FAF7F2]">
                <span className="text-[12px] text-gray-400">Date</span>
                <span className="text-[12px] font-bold text-gray-900 text-right">{selectedDate?.fullDate}</span>
              </div>
              <div className="flex justify-between py-3 px-4 border-b border-[#FAF7F2]">
                <span className="text-[12px] text-gray-400">Slot</span>
                <span className="text-[12px] font-bold text-gray-900 text-right">{selectedSlot?.time}</span>
              </div>
              <div className="flex justify-between py-3 px-4">
                <span className="text-[12px] text-gray-400 shrink-0 mr-4">Services</span>
                <span className="text-[12px] font-bold text-gray-900 text-right leading-tight">
                  {selectedAddons.map(a => a.name).join(', ')}
                </span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/app/services/grooming', { replace: true })} // Reset route on done
              className="w-full bg-accent-teal hover:bg-[#599D9A] text-white h-12 rounded-full text-[15px] font-bold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
