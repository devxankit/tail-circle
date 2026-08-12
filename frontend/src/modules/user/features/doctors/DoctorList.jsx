import React, { useState, useEffect } from 'react';
import { Search, Star, MapPin, Video, ArrowLeft, CheckCircle2, AlertCircle, Calendar, X, Zap, Mic, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getDoctorSlots, toYMD } from '../../../../services/doctorsApi';
import { useVoiceSearch } from '../../../../hooks/useVoiceSearch';

// Helper to generate dates
const generateDates = () => {
  return Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ymd: toYMD(d),
      id: `date_${i}`
    };
  });
};

export function DoctorList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState('All');

  const {
    isListening,
    transcript,
    error: voiceError,
    toggleListening,
    setError: setVoiceError
  } = useVoiceSearch({
    onResult: (text) => setSearchQuery(text)
  });
  
  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingType, setBookingType] = useState(null); // 'Video Call' or 'Book Appointment'
  const [videoSubMode, setVideoSubMode] = useState('instant'); // 'instant' | 'scheduled'
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  // Live slots for the open sheet — generated from the vet's own schedule.
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  useEffect(() => {
    const generatedDates = generateDates();
    setDates(generatedDates);
    setSelectedDate(generatedDates[0]); // Select Today by default
  }, []);

  // Refetch whenever the sheet opens, or its date / consult type changes.
  useEffect(() => {
    if (!selectedDoctor?._id || !selectedDate?.ymd) return undefined;
    let cancelled = false;
    const visitType = bookingType === 'Video Call' ? 'video' : 'clinic';

    setSlotsLoading(true);
    setSelectedSlot(null);
    setTimeSlots([]);
    setSlotsMessage('');

    getDoctorSlots(selectedDoctor._id, selectedDate.ymd, visitType)
      .then(({ slots, message }) => {
        if (cancelled) return;
        setTimeSlots(slots);
        if (!slots.length) setSlotsMessage(message || 'No slots available on this date.');
      })
      .catch((e) => !cancelled && setSlotsMessage(e.message || 'Could not load slots'))
      .finally(() => !cancelled && setSlotsLoading(false));

    return () => { cancelled = true; };
  }, [selectedDoctor?._id, selectedDate?.ymd, bookingType]);

  const specialties = ['All', 'Small Animals', 'Dermatology', 'Dental', 'Orthopedic'];

  // Doctors from the API (legacy display shape preserved)
  const [doctors, setDoctors] = useState([]);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    import('../../../../services/doctorsApi').then(({ getDoctors, enabledModes }) =>
      getDoctors().then((data) =>
        setDoctors(
          data.map((d) => ({
            id: d.legacyId ?? d._id,
            _id: d._id,
            name: d.name,
            spec: d.spec,
            clinic: d.clinic,
            exp: d.expText,
            rating: d.rating,
            reviews: d.reviews,
            location: d.location,
            price: d.price,
            nextAvailable: d.nextAvailable,
            availability: d.availability,
            img: d.img,
            // The vet decides which consult types they offer — the card and the
            // quick-book sheet render from this, never from an assumption.
            modes: d.modes,
            offeredModes: enabledModes(d),
          }))
        )
      )
    ).catch(() => setDoctors([]));
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.spec.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = false;
    if (activeCategory === 'All') matchesCategory = true;
    else if (activeCategory === 'Small Animals' && doc.spec.includes('Small Animals')) matchesCategory = true;
    else if (activeCategory === 'Dermatology' && doc.spec.includes('Dermatology')) matchesCategory = true;
    else if (activeCategory === 'Dental' && doc.spec.includes('Dental')) matchesCategory = true;
    else if (activeCategory === 'Orthopedic' && doc.spec.includes('Orthopedic')) matchesCategory = true;

    return matchesSearch && matchesCategory;
  });

  const openBookingModal = (doc, type) => {
    setSelectedDoctor(doc);
    setBookingType(type);
    setSelectedSlot(null);
    if (type === 'Video Call') {
      const offersInstant = Boolean(doc.modes?.instantVideo?.enabled || doc.modes?.video?.enabled);
      setVideoSubMode(offersInstant ? 'instant' : 'scheduled');
    }
  };

  const closeBookingModal = () => {
    setSelectedDoctor(null);
    setBookingType(null);
    setSelectedSlot(null);
  };

  const confirmBooking = async () => {
    setBookingError('');
    setIsBooking(true);
    const isVideo = bookingType === 'Video Call';
    try {
      const { api } = await import('../../../../services/api');
      const { data } = await api.post('/bookings', {
        type: 'doctor',
        doctorId: String(selectedDoctor._id || selectedDoctor.id),
        schedule: {
          startDate: selectedDate.ymd,
          time: selectedSlot.time,
        },
        visitType: isVideo ? 'video' : 'clinic',
        paymentMethod: isVideo ? 'razorpay' : 'pay_later',
      });

      if (data.razorpay) {
        try {
          const { payWithRazorpay } = await import('../../../../services/payments');
          await payWithRazorpay(data.razorpay, {
            description: `Video Consultation — ${selectedDoctor.name}`,
          });
        } catch (payErr) {
          console.warn('Payment checkout skipped/failed, proceeding with booking:', payErr);
        }
      }

      const bookingId = data.booking?._id || data.booking?.id || data.id;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeBookingModal();
        if (isVideo && bookingId) {
          navigate(`/app/consult/${bookingId}`);
        }
      }, 1000);
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const handleInstantCall = async (doc) => {
    setBookingError('');
    setIsBooking(true);
    try {
      const consultApi = await import('../../../../services/consultApi');
      const activeCall = await consultApi.getActiveConsult().catch(() => null);
      if (activeCall && activeCall.bookingId && ['ringing', 'active'].includes(activeCall.status)) {
        closeBookingModal();
        navigate(`/app/consult/${activeCall.bookingId}`);
        return;
      }

      const { api } = await import('../../../../services/api');
      const { data } = await api.post('/bookings', {
        type: 'doctor',
        doctorId: String(doc._id || doc.id),
        visitType: 'instant_video',
        paymentMethod: 'razorpay',
      });

      if (data.razorpay) {
        const { payWithRazorpay } = await import('../../../../services/payments');
        await payWithRazorpay(data.razorpay, {
          description: `Instant Video Call — ${doc.name}`,
        });
      }

      const bookingId = data.booking?._id || data.booking?.id || data.id;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeBookingModal();
        if (bookingId) {
          navigate(`/app/consult/${bookingId}`);
        }
      }, 500);
    } catch (err) {
      alert(err.message || 'Could not initiate instant call');
    } finally {
      setIsBooking(false);
    }
  };

  const isReadyToBook = selectedDate && selectedSlot;

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      
      {/* Success Notification overlay */}
      {showSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] bg-[#FAF7F2] text-[#66B4B1] border border-[#FAF7F2] px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-10 whitespace-nowrap">
          <CheckCircle2 size={18} />
          Appointment Confirmed!
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FAF7F2] pt-4 pb-2 sticky top-0 z-10 px-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/app/home')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 mx-auto -ml-2">Find Vets</h1>
          <div className="w-10"></div> {/* spacer for centering */}
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search vet name, clinic or specialty..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white h-12 rounded-[16px] pl-12 pr-11 outline-none border border-border-light focus:border-accent-teal transition-colors text-[14px] font-medium shadow-sm" 
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-12 top-3.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={16} />
            </button>
          ) : null}
          <button
            onClick={toggleListening}
            className={`absolute right-3 top-2.5 p-2 rounded-full transition-all cursor-pointer ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#66B4B1] hover:bg-teal-50'
            }`}
            title={isListening ? "Listening..." : "Voice search"}
          >
            {isListening ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
          </button>

          {isListening && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#2C5753] text-white rounded-[16px] p-3 shadow-lg z-50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
                <span className="truncate font-semibold">{transcript || 'Listening for doctor name or clinic...'}</span>
              </div>
              <button onClick={toggleListening} className="px-2 py-0.5 bg-white/20 rounded-full font-bold">Stop</button>
            </div>
          )}
        </div>

        <div className="flex overflow-x-auto hide-scrollbar gap-2.5 pb-2 -mx-4 px-4">
          {specialties.map((spec) => (
            <button 
              key={spec} 
              onClick={() => setActiveCategory(spec)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors border ${activeCategory === spec ? 'bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 hide-scrollbar">
        
        {/* Emergency Banner */}
        <div className="bg-[#FEF4F3] rounded-[16px] p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#F87B68] shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-[#D96B5B] font-bold text-[14px] leading-tight mb-0.5">Pet Emergency?</h3>
              <p className="text-[#F87B68] text-[12px] font-medium">Call our 24/7 emergency helpline</p>
            </div>
          </div>
          <button
            onClick={() => { window.location.href = 'tel:+919000000000'; }}
            className="bg-[#F87B68] text-white px-4 py-2 rounded-full text-[13px] font-bold shadow-sm active:scale-95 transition-transform"
          >
            Call Now
          </button>
        </div>

        {/* Doctor List */}
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map(doc => (
            <div key={doc.id} className="bg-white rounded-[24px] border border-border-light p-4 shadow-sm relative">
              
              {/* Top Row: Image & Details */}
              <div className="flex gap-4">
                <img src={doc.img || null} alt={doc.name} className="w-[72px] h-[72px] rounded-full object-cover shrink-0 border border-gray-100" />
                <div className="flex-1 pt-0.5">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-gray-900 text-[16px] leading-tight">{doc.name}</h3>
                    <div className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 ${doc.availability === 'Available' ? 'bg-[#FAF7F2] text-[#66B4B1]' : 'bg-[#FAF7F2] text-[#66B4B1]'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${doc.availability === 'Available' ? 'bg-[#66B4B1]' : 'bg-[#66B4B1]'}`}></div>
                      <span className="text-[11px] font-bold">{doc.availability}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#66B4B1]/30 text-[#66B4B1] px-1.5 py-0.5 rounded-md w-max mb-2">
                    <CheckCircle2 size={12} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                  </div>
                  
                  <p className="text-[#66B4B1] text-[14px] font-bold leading-tight mb-0.5">{doc.spec}</p>
                  <p className="text-gray-400 text-[12px] font-medium mb-3">{doc.clinic}</p>

                  {/* Mode chips reflect what this vet actually offers. */}
                  <div className="flex gap-2.5 mb-2 flex-wrap">
                    {doc.modes?.video?.enabled && (
                      <span className="flex items-center gap-1 text-[#66B4B1] border border-[#66B4B1] px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white">
                        <Video size={12} strokeWidth={2.5} /> Video
                      </span>
                    )}
                    {doc.modes?.inClinic?.enabled && (
                      <span className="flex items-center gap-1 text-[#F87B68] border border-[#F87B68] px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white">
                        <MapPin size={12} strokeWidth={2.5} /> In-Clinic
                      </span>
                    )}
                    {doc.modes?.homeVisit?.enabled && (
                      <span className="flex items-center gap-1 text-gray-600 border border-gray-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white">
                        <MapPin size={12} strokeWidth={2.5} /> Home Visit
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Separator line */}
              <div className="w-full h-[1px] bg-gray-100 my-3"></div>

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-[12px] text-gray-500 font-medium mb-3">
                <div className="flex items-center gap-1 text-gray-700">
                  <Star size={14} className="fill-[#F6C0B6] text-[#F87B68]" />
                  <span className="font-bold text-gray-800">{doc.rating}</span>
                  <span className="text-gray-400">({doc.reviews})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{doc.exp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  <span>{doc.location}</span>
                </div>
              </div>

              {/* Highlight row */}
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#66B4B1] mb-4">
                <AlertCircle size={14} className="shrink-0" />
                <span>Next: {doc.nextAvailable} • ₹{doc.price} consult</span>
              </div>

              {/* Action Buttons — only 2 buttons on card: Video Call & Clinic Visit */}
              <div className="flex gap-3">
                {(doc.modes?.instantVideo?.enabled || doc.modes?.video?.enabled) && (
                  <button
                    onClick={() => openBookingModal(doc, 'Video Call')}
                    className="flex-1 bg-white border border-[#66B4B1] text-[#66B4B1] font-bold py-2.5 rounded-[14px] text-[14px] flex justify-center items-center gap-2 hover:bg-[#FAF7F2] transition-colors active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Video size={18} /> Video Call
                  </button>
                )}
                <button
                  onClick={() => openBookingModal(doc, 'Clinic Visit')}
                  className="flex-1 bg-[#F87B68] text-white font-bold py-2.5 rounded-[14px] text-[14px] flex justify-center items-center gap-2 hover:bg-[#F87B68] transition-colors active:scale-95 shadow-sm cursor-pointer"
                >
                  <Calendar size={18} /> Book Appointment
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Search size={40} className="mb-4 opacity-20" />
            <p className="font-medium text-gray-500">No doctors found.</p>
          </div>
        )}
      </div>

      {/* BOTTOM SHEET OVERLAY */}
      {selectedDoctor && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={closeBookingModal}
          ></div>

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F2] rounded-t-[32px] z-[101] animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh]">
            
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="px-5 pt-2 pb-6 overflow-y-auto hide-scrollbar">
              
              {/* Doctor Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedDoctor.img || null} alt={selectedDoctor.name} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                  <div>
                    <h3 className="font-black text-gray-900 text-[18px] leading-tight mb-0.5">{selectedDoctor.name}</h3>
                    <p className="text-[#66B4B1] text-[13px] font-bold leading-tight">{selectedDoctor.spec}</p>
                    <p className="text-gray-400 text-[12px] font-medium">{selectedDoctor.clinic}</p>
                  </div>
                </div>
                <div className="bg-[#FAF7F2] px-3 py-2 rounded-[12px] flex flex-col items-center justify-center">
                  <span className="text-[#66B4B1] font-black text-[16px] leading-none mb-0.5">₹{selectedDoctor.price}</span>
                  <span className="text-gray-500 text-[10px] font-medium leading-none">consult</span>
                </div>
              </div>

              <div className="w-full h-px bg-border-light my-4"></div>

              {/* Video Call Sub-mode Switcher */}
              {bookingType === 'Video Call' && (
                <div className="flex bg-gray-100 p-1 rounded-2xl mb-5 gap-1">
                  <button
                    type="button"
                    onClick={() => setVideoSubMode('instant')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      videoSubMode === 'instant'
                        ? 'bg-amber-500 text-white shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Video size={15} /> Instant Call (Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSubMode('scheduled')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      videoSubMode === 'scheduled'
                        ? 'bg-[#66B4B1] text-white shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar size={15} /> Scheduled Slot
                  </button>
                </div>
              )}

              {/* Instant Call view inside sheet */}
              {bookingType === 'Video Call' && videoSubMode === 'instant' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 mb-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-gray-900 text-[15px] flex items-center gap-2">
                        <Video size={16} className="text-amber-600" /> Instant Video Consultation
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Call {selectedDoctor.name} immediately right now. No pre-scheduled slot required!
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                      Available Now
                    </span>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3.5 text-xs space-y-2 border border-amber-100">
                    <div className="flex justify-between text-gray-600">
                      <span>Video Consultation Fee</span>
                      <span className="font-bold text-gray-800">
                        ₹{selectedDoctor.modes?.instantVideo?.fee || selectedDoctor.modes?.video?.fee || selectedDoctor.videoPrice || selectedDoctor.price || 499}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Platform &amp; Convenience Fee</span>
                      <span className="font-bold text-gray-800">₹29</span>
                    </div>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <div className="flex justify-between font-bold text-gray-900 text-[14px]">
                      <span>Total Amount Payable</span>
                      <span className="text-amber-700 font-black">
                        ₹{(selectedDoctor.modes?.instantVideo?.fee || selectedDoctor.modes?.video?.fee || selectedDoctor.videoPrice || selectedDoctor.price || 499) + 29}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Select Date */}
                  <div className="mb-6">
                    <h2 className="text-[16px] font-black text-gray-900 mb-3">Select Date</h2>
                    <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-5 px-5">
                      {dates.map((date) => {
                        const isSelected = selectedDate?.id === date.id;
                        return (
                          <button
                            key={date.id}
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className={`min-w-[64px] flex flex-col items-center justify-center rounded-[16px] py-3 transition-all active:scale-95 border ${
                              isSelected
                                ? 'border-[#66B4B1] bg-[#66B4B1] text-white shadow-md'
                                : 'border-border-light bg-white text-gray-500'
                            }`}
                          >
                            <span className={`text-[12px] font-bold mb-1 ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                              {date.dayName}
                            </span>
                            <span className={`text-[22px] font-black leading-none mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                              {date.date}
                            </span>
                            <span className={`text-[11px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                              {date.month}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Time Slot — live from the vet's schedule */}
                  <div className="mb-4">
                    <h2 className="text-[16px] font-black text-gray-900 mb-3">Select Time Slot</h2>

                    {slotsLoading ? (
                      <div className="flex gap-3 pb-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="min-w-[110px] h-[64px] rounded-[16px] bg-white/70 animate-pulse border border-border-light" />
                        ))}
                      </div>
                    ) : timeSlots.length ? (
                      <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-5 px-5">
                        {timeSlots.map((slot) => {
                          const isSelected = selectedSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`min-w-[110px] flex flex-col items-center justify-center rounded-[16px] py-3 transition-all active:scale-95 border ${
                                isSelected
                                  ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                                  : 'border-border-light bg-white hover:bg-gray-50'
                              }`}
                            >
                              <span className={`text-[14px] font-black mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {slot.time}
                              </span>
                              <span className={`text-[11px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                {slot.period} • {slot.durationMinutes}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-[13px] text-gray-500 bg-white rounded-[16px] p-3 border border-border-light">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{slotsMessage}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Bottom Sticky Action */}
            <div className="p-4 bg-[#FAF7F2] border-t border-border-light">
              {bookingError && (
                <p className="text-center text-xs font-bold text-red-500 mb-2">{bookingError}</p>
              )}

              {bookingType === 'Video Call' && videoSubMode === 'instant' ? (
                <button
                  disabled={isBooking}
                  onClick={() => handleInstantCall(selectedDoctor)}
                  className="w-full h-[52px] rounded-full text-[16px] font-black bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.98] disabled:opacity-60"
                >
                  <Video size={18} />
                  {isBooking
                    ? 'Connecting Call…'
                    : `Pay ₹${(selectedDoctor.modes?.instantVideo?.fee || selectedDoctor.modes?.video?.fee || selectedDoctor.videoPrice || selectedDoctor.price || 499) + 29} & Call Now`}
                </button>
              ) : (
                <button
                  disabled={!isReadyToBook || isBooking}
                  onClick={confirmBooking}
                  className={`w-full h-[52px] rounded-full text-[16px] font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer
                    ${isReadyToBook && !isBooking
                      ? 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  <Calendar size={18} />
                  {!isReadyToBook
                    ? 'Select a time slot'
                    : isBooking
                      ? 'Processing…'
                      : bookingType === 'Video Call'
                        ? `Pay ₹${(selectedDoctor?.modes?.video?.fee ?? selectedDoctor?.price ?? 0) + 29} & Confirm`
                        : 'Confirm Booking'}
                </button>
              )}

              {bookingType === 'Video Call' && (
                <p className="text-center text-[11px] text-gray-500 mt-2">
                  Video consultations are paid in advance — the room opens immediately after payment.
                </p>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}
