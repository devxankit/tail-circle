import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, updateBookingStatus, rescheduleBooking, getGroomingSlots } from '../../../../../services/groomingApi';

export function MyBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  // Reschedule times come from the salon's live slot template. The dropdown was
  // a fixed list of five times that most salons never offer, so confirming it
  // moved the appointment to a slot nobody works.
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  useEffect(() => {
    if (!showRescheduleModal || !booking?.shopId || !selectedDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    getGroomingSlots(booking.shopId, selectedDate)
      .then((data) => {
        if (cancelled) return;
        const open = (Array.isArray(data) ? data : []).filter((s) => s.available);
        setRescheduleSlots(open);
        if (!open.some((s) => s.time === selectedTime)) setSelectedTime(open[0]?.time || '');
      })
      .catch(() => { if (!cancelled) setRescheduleSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [showRescheduleModal, booking?.shopId, selectedDate]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const b = await getBookingById(id);
      setBooking(b);

      if (b) {
        setSelectedDate(b.date);
        setSelectedTime(b.timeSlot || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    setActionError('');
    try {
      await updateBookingStatus(booking.id || id, 'Cancelled');
      setShowCancelModal(false);
      await loadBooking();
    } catch (err) {
      setActionError(err?.message || 'Could not cancel this booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReschedule = async () => {
    setIsProcessing(true);
    setActionError('');
    try {
      await rescheduleBooking(booking.id || id, selectedDate, selectedTime);
      setShowRescheduleModal(false);
      await loadBooking();
    } catch (err) {
      setActionError(err?.message || 'Could not reschedule this booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-white animate-pulse p-4">Loading...</div>;
  }

  if (!booking) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Booking not found</div>;
  }

  const { shopName, shopImage, packageData, addonsData, pet, date, timeSlot, visitType, totalPaid, status } = booking;
  const packagePrice = packageData ? packageData.price : 0;
  const isCancelled = status === 'Cancelled';
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }).replace(',', '');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate('/app/home')} className="p-2 -ml-2 rounded-full absolute left-0 hover:bg-gray-50 active:scale-95 transition-all">
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">My Booking Detail</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 hide-scrollbar">
        
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-[6px] text-[12px] font-bold ${
            isCancelled ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#66B4B1]/10 text-[#66B4B1]'
          }`}>
            {status || 'Confirmed'}
          </span>
        </div>

        {/* Shop Info Card */}
        <div className="border border-gray-100 rounded-[16px] p-4 mb-4 shadow-sm">
          <div className="flex gap-4">
            <img src={shopImage || "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80"} alt={shopName} className="w-16 h-16 rounded-[12px] object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-[15px] mb-1">{shopName}</h3>
              <p className={`text-[12px] font-bold mb-0.5 ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {formatDate(date)} • {timeSlot}
              </p>
              <p className="text-[12px] text-gray-500 font-medium">{visitType}</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[12px] text-gray-500 font-medium">Booking ID</span>
            <span className="text-[12px] font-bold text-gray-900">{booking.id || id}</span>
          </div>
        </div>

        {/* Pet Info */}
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-gray-900 mb-3">Pet</h2>
          <div className="flex items-center gap-3">
            <img src={pet?.image || "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80"} alt={pet?.name} className="w-10 h-10 rounded-full object-cover" />
            <div>
              <p className="text-[14px] font-bold text-gray-900">{pet?.name}</p>
              <p className="text-[12px] text-gray-500 font-medium capitalize">{pet?.breed || 'Mixed'}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 my-6"></div>

        {/* Price Breakdown */}
        <div className="space-y-4 mb-8">
          {packageData && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-bold text-gray-700">Package<br/><span className="font-medium text-gray-500 text-[12px]">{packageData.name}</span></span>
              <span className="text-[14px] font-bold text-gray-900">₹{packagePrice}</span>
            </div>
          )}

          {addonsData && addonsData.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-bold text-gray-700">Add-ons<br/><span className="font-medium text-gray-500 text-[12px]">{addonsData.map(a => a.name).join(', ')}</span></span>
              <span className="text-[14px] font-bold text-gray-900">₹{addonsData.reduce((s, a) => s + a.price, 0)}</span>
            </div>
          )}

          {(booking.fees || []).map((fee) => (
            <div key={fee.name} className="flex justify-between items-center">
              <span className="text-[14px] font-medium text-gray-600">{fee.name}</span>
              <span className="text-[14px] font-bold text-gray-900">₹{fee.price}</span>
            </div>
          ))}

          {booking.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-medium text-gray-600">Discount</span>
              <span className="text-[14px] font-bold text-[#66B4B1]">- ₹{booking.discount}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-[16px] font-black text-gray-900">Total Paid</span>
            <span className="text-[16px] font-black text-gray-900">₹{totalPaid}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isCancelled && (
          <div className="flex gap-3 mb-3">
            <button 
              onClick={() => setShowRescheduleModal(true)}
              className="flex-1 py-3.5 rounded-[14px] font-bold text-[14px] bg-white text-[#66B4B1] border-2 border-[#66B4B1]/20 hover:bg-[#66B4B1]/5 hover:border-[#66B4B1] active:scale-95 transition-all"
            >
              Reschedule
            </button>
            <button 
              onClick={() => setShowCancelModal(true)}
              className="flex-1 py-3.5 rounded-[14px] font-bold text-[14px] bg-white text-[#F87B68] border-2 border-[#F87B68]/20 hover:bg-[#F87B68]/5 hover:border-[#F87B68] active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/app/chat/room')}
            className="flex-1 py-3.5 rounded-[14px] font-bold text-[14px] bg-[#66B4B1]/10 text-[#66B4B1] active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#66B4B1]/20"
          >
            <MessageCircle size={18} /> Chat
          </button>
          <button 
            onClick={() => window.location.href = 'tel:+919876543210'}
            className="flex-1 py-3.5 rounded-[14px] font-bold text-[14px] bg-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#599D9A]"
          >
            <Phone size={18} className="fill-white" /> Call
          </button>
        </div>

      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-[400px] rounded-t-[24px] sm:rounded-[24px] p-6 animate-in slide-in-from-bottom-8">
            <h3 className="text-[20px] font-black text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-[14px] text-gray-500 font-medium mb-6 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone. Refund will be processed in 3-5 business days.
            </p>
            {actionError && <p className="text-[13px] font-bold text-red-500 mb-4">{actionError}</p>}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3.5 rounded-[12px] font-bold text-[14px] bg-gray-100 text-gray-700 active:scale-95 transition-all"
              >
                No, Keep it
              </button>
              <button 
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 py-3.5 rounded-[12px] font-bold text-[14px] bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-70"
              >
                {isProcessing ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-[400px] rounded-t-[24px] sm:rounded-[24px] p-6 animate-in slide-in-from-bottom-8">
            <h3 className="text-[20px] font-black text-gray-900 mb-4">Reschedule Booking</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[13px] font-bold text-gray-700 block mb-2">Select Date</label>
                <input 
                  type="date" 
                  value={selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-[12px] p-3 text-[14px] font-medium outline-none focus:border-[#66B4B1]"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 block mb-2">Select Time</label>
                <select 
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  disabled={slotsLoading || rescheduleSlots.length === 0}
                  className="w-full border border-gray-200 rounded-[12px] p-3 text-[14px] font-medium outline-none focus:border-[#66B4B1] disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {slotsLoading && <option value="">Loading slots…</option>}
                  {!slotsLoading && rescheduleSlots.length === 0 && (
                    <option value="">No slots free on this date</option>
                  )}
                  {rescheduleSlots.map((s) => (
                    <option key={s.time} value={s.time}>
                      {s.time}{s.period ? ` · ${s.period}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {actionError && <p className="text-[13px] font-bold text-red-500 mb-4">{actionError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-3.5 rounded-[12px] font-bold text-[14px] bg-gray-100 text-gray-700 active:scale-95 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleReschedule}
                disabled={isProcessing || !selectedTime}
                className="flex-1 py-3.5 rounded-[12px] font-bold text-[14px] bg-[#66B4B1] text-white shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-all disabled:opacity-70"
              >
                {isProcessing ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
