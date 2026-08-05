import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById } from '../../../../../services/groomingApi';

export function MyBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const savedBookings = JSON.parse(localStorage.getItem('groomingBookings') || '[]');
      let b = savedBookings.find(x => x.id === id) || savedBookings[0];
      setBooking(b);
      
      if (b) {
        setSelectedDate(b.date);
        setSelectedTime(b.timeSlot || '10:00 AM');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      const savedBookings = JSON.parse(localStorage.getItem('groomingBookings') || '[]');
      const idx = savedBookings.findIndex(x => x.id === (booking.id || id));
      if (idx !== -1) {
        savedBookings[idx].status = 'Cancelled';
        localStorage.setItem('groomingBookings', JSON.stringify(savedBookings));
      }
      await new Promise(r => setTimeout(r, 800)); // Simulate API call
      setShowCancelModal(false);
      loadBooking();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReschedule = async () => {
    setIsProcessing(true);
    try {
      const savedBookings = JSON.parse(localStorage.getItem('groomingBookings') || '[]');
      const idx = savedBookings.findIndex(x => x.id === (booking.id || id));
      if (idx !== -1) {
        savedBookings[idx].date = selectedDate;
        savedBookings[idx].timeSlot = selectedTime;
        localStorage.setItem('groomingBookings', JSON.stringify(savedBookings));
      }
      await new Promise(r => setTimeout(r, 800)); // Simulate API call
      setShowRescheduleModal(false);
      loadBooking();
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
              <p className="text-[12px] text-gray-500 font-medium capitalize">{pet?.type} • {pet?.breed || 'Mixed'}</p>
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
                  className="w-full border border-gray-200 rounded-[12px] p-3 text-[14px] font-medium outline-none focus:border-[#66B4B1]"
                >
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-3.5 rounded-[12px] font-bold text-[14px] bg-gray-100 text-gray-700 active:scale-95 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleReschedule}
                disabled={isProcessing}
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
