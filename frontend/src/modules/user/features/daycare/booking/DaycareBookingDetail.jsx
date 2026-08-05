import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';

export function DaycareBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const toLegacy = (b) => ({
    id: b.bookingNo,
    _id: b._id,
    status: b.status === 'confirmed' ? 'Confirmed' : b.status.charAt(0).toUpperCase() + b.status.slice(1),
    center: b.providerId
      ? { id: b.providerId.legacyId, name: b.providerId.name, image: b.providerId.image }
      : null,
    plan: b.items?.find((i) => i.kind === 'plan') || null,
    addons: b.items?.filter((i) => i.kind === 'addon') || [],
    dates: b.meta?.dates || [b.schedule?.startDate].filter(Boolean),
    dateType: b.meta?.dateType,
    dropoffTime: b.meta?.dropoffTime,
    pickupTime: b.meta?.pickupTime,
    visitOption: b.meta?.visitOption,
    pet: b.petSnapshot
      ? { name: b.petSnapshot.name, breed: b.petSnapshot.breed, image: b.petSnapshot.image }
      : { name: b.meta?.petName },
    petAnswers: b.meta?.petAnswers || {},
    totalPaid: Math.round((b.amounts?.total || 0) / 100),
    paymentMethod: b.paymentMethod === 'pay_later' ? 'Cash' : 'Online',
    createdAt: b.createdAt,
  });

  const loadBooking = async () => {
    setLoading(true);
    try {
      const { api } = await import('../../../../../services/api');
      const { data } = await api.get('/bookings', { params: { type: 'daycare' } });
      const found = data.find((x) => x.bookingNo === id || x._id === id) || data[0];
      setBooking(found ? toLegacy(found) : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      const { api } = await import('../../../../../services/api');
      await api.post(`/bookings/${booking._id}/cancel`);
      setShowCancelModal(false);
      loadBooking();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAF7F2] animate-pulse p-4">Loading...</div>;
  }

  if (!booking) {
    return <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center font-bold text-gray-500">Booking not found</div>;
  }

  const { center, plan, addons, dates, dateType, dropoffTime, pickupTime, pet, petAnswers, totalPaid, status } = booking;
  const isCancelled = status === 'Cancelled';
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isMultipleDays = dates && dates.length > 1;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-gray-900">
      
      {/* Header */}
      <div className="bg-white pt-4 pb-3 sticky top-0 z-10 px-4 border-b border-gray-100">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate('/app/home')} className="p-2 -ml-2 rounded-full absolute left-0 hover:bg-gray-50 active:scale-95 transition-all">
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[16px] font-bold text-gray-900">My Daycare Booking</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 hide-scrollbar">
        
        {/* Status Pill */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${
            isCancelled ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#66B4B1]/10 text-[#66B4B1] border border-[#66B4B1]/20'
          }`}>
            {status || 'Confirmed'}
          </span>
        </div>

        {/* Center Info */}
        <div className="bg-white rounded-[20px] p-4 mb-6 border border-gray-100 shadow-sm">
          <div className="flex gap-4 items-center">
            <img src={center?.image} alt={center?.name} className="w-14 h-14 rounded-[12px] object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-[15px] mb-1">{center?.name}</h3>
              <p className="text-[12px] text-gray-500 font-medium">Booking ID <span className="font-bold text-gray-700 ml-2">{booking.id || id}</span></p>
            </div>
          </div>
        </div>

        {/* Booking Details Match Screen 12 Exactly */}
        <h2 className="text-[15px] font-bold text-gray-900 mb-4">Booking Details</h2>
        <div className="space-y-4 mb-8 pl-1">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Date</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">
              {isMultipleDays ? `${formatDate(dates[0])} - ${formatDate(dates[dates.length-1])}` : formatDate(dates[0])}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Drop-off</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">{dropoffTime}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Pick-up</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">{pickupTime}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Pet</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">{pet?.name} ({petAnswers?.breed || pet?.breed})</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Plan</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">{plan?.name}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-gray-500 w-1/3">Add-ons</span>
            <span className="text-[13px] font-bold text-gray-900 text-right flex-1">{addons?.length > 0 ? addons.map(a=>a.name).join(', ') : '-'}</span>
          </div>
          <div className="flex justify-between items-start mt-2">
            <span className="text-[14px] font-bold text-gray-900 w-1/3">Amount Paid</span>
            <span className="text-[15px] font-black text-gray-900 text-right flex-1">₹{totalPaid}</span>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            disabled={isCancelled}
            className={`py-3.5 rounded-[16px] font-bold text-[13px] border-2 transition-all ${isCancelled ? 'opacity-50 bg-gray-50 border-gray-200 text-gray-400' : 'bg-white text-[#66B4B1] border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 active:scale-95'}`}
          >
            Reschedule
          </button>
          <button 
            disabled={isCancelled}
            onClick={() => setShowCancelModal(true)}
            className={`py-3.5 rounded-[16px] font-bold text-[13px] border-2 transition-all ${isCancelled ? 'opacity-50 bg-gray-50 border-gray-200 text-gray-400' : 'bg-white text-[#F87B68] border-[#F87B68]/20 hover:bg-[#F87B68]/5 active:scale-95'}`}
          >
            Cancel
          </button>
          
          <button 
            onClick={() => navigate('/app/chat/room')}
            className="col-span-1 py-3.5 rounded-[16px] font-bold text-[13px] bg-white text-[#66B4B1] border-2 border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} /> Chat
          </button>
          <button 
            onClick={() => window.location.href = 'tel:+919876543210'}
            className="col-span-1 py-3.5 rounded-[16px] font-bold text-[13px] bg-white text-[#66B4B1] border-2 border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Phone size={16} /> Call Center
          </button>
        </div>

      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[32px] p-6 pb-10 animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-[20px] font-black text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-[14px] text-gray-500 font-medium mb-8 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone. Refund will be processed according to cancellation policy.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-[1] py-4 rounded-[16px] font-bold text-[14px] bg-gray-100 text-gray-700 active:scale-95 transition-all"
              >
                No, Keep it
              </button>
              <button 
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-[1] py-4 rounded-[16px] font-bold text-[14px] bg-[#F87B68] text-white shadow-lg shadow-[#F3AB9D]/20 active:scale-95 transition-all disabled:opacity-70"
              >
                {isProcessing ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
