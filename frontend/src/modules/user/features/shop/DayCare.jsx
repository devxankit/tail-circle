import React, { useState } from 'react';
import { ChevronLeft, MapPin, CheckCircle, Video, ShieldCheck, Calendar, Clock, Star, Play, X, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { cn } from '../../utils/cn';

const dayCareCenters = [
  { 
    id: 'dc1', 
    name: 'Happy Paws Sanctuary', 
    rating: 4.9, 
    distance: '1.8 km away', 
    price: 800, 
    amenities: ['AC Rooms', '24/7 CCTV Feed', 'Vet on Call', 'Outdoor Play Area', 'Daily Walks'], 
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300&q=80',
    videoFeed: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z2bzF0cnR4bmRxbW0za21iMmlwZ3p6aXZxNGJ0bm12OHY5dThlNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o751XT36L1nscA4sM/giphy.gif'
  },
  { 
    id: 'dc2', 
    name: 'Canine Elite Resort', 
    rating: 4.8, 
    distance: '3.5 km away', 
    price: 1200, 
    amenities: ['24/7 CCTV Feed', 'Food Included', 'Night Care', 'Pet Trainer Support', 'AC Rooms'], 
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=300&q=80',
    videoFeed: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z2bzF0cnR4bmRxbW0za21iMmlwZ3p6aXZxNGJ0bm12OHY5dThlNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/k39wR35OP1M2c/giphy.gif'
  }
];

export function DayCare() {
  const navigate = useNavigate();
  const [selectedCenter, setSelectedCenter] = useState(null);
  
  // Booking Form States
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('Morning (8 AM - 12 PM)');
  const [bookingDays, setBookingDays] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // CCTV Live Feed simulator
  const [activeCctvFeed, setActiveCctvFeed] = useState(null);

  // Live Care Progress Simulator
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const careSteps = [
    { title: 'Checked In', desc: 'Your pet entered the day care lobby safely.', time: '09:00 AM', status: 'done', note: 'Max is very excited to make new friends!' },
    { title: 'Feeding Done', desc: 'Fresh nutrition meal served.', time: '11:30 AM', status: 'done', note: 'Licked the bowl clean in under 3 minutes.' },
    { title: 'Walk Completed', desc: 'Fun interactive garden exercise session.', time: '02:00 PM', status: 'active', note: 'Chasing tennis balls, loves the outdoor area!' },
    { title: 'Resting', desc: 'Napping in private temperature controlled AC suite.', time: 'Pending', status: 'pending', note: 'Zzz... Sleeping soundly.' },
    { title: 'Pick-up Ready', desc: 'Groomed, packed up and ready to head home.', time: 'Pending', status: 'pending', note: 'Awaiting your arrival.' }
  ];

  const handleBooking = () => {
    if (!bookingDate) return;

    setBookingSuccess(true);
    const totalPrice = selectedCenter.price * bookingDays;

    try {
      const savedBookings = localStorage.getItem('tailcircle_bookings');
      const currentBookings = savedBookings ? JSON.parse(savedBookings) : [];
      const newBooking = {
        id: `DC-${Date.now()}`,
        service: 'Day Care Stay',
        name: selectedCenter.name,
        detail: `${bookingDays} Day Stay (${bookingSlot})`,
        date: bookingDate,
        price: '₹' + totalPrice,
        status: 'Confirmed Stay'
      };
      localStorage.setItem('tailcircle_bookings', JSON.stringify([newBooking, ...currentBookings]));
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedCenter(null);
      navigate('/app/profile/bookings');
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-bottom-4 duration-300 relative">
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Day Care Bookings</h1>
      </div>

      {/* Main Center Discovery List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6">
        
        {/* Banner Alert */}
        <div className="bg-gradient-to-r from-[#80C1BF] to-[#66B4B1] rounded-[24px] p-5 text-white shadow-md mb-6 flex items-center justify-between">
          <div className="max-w-[70%]">
            <h3 className="font-extrabold text-lg leading-tight mb-1">Premium Host Stays</h3>
            <p className="text-xs text-white/95">Book hourly or 24/7 day care stays with verified pet hosts nearby.</p>
          </div>
          <span className="text-4xl animate-bounce">🏡</span>
        </div>

        <h3 className="text-sm font-black text-text-secondary uppercase mb-3 pl-1">Available Facilities Nearby</h3>
        
        <div className="flex flex-col gap-5">
          {dayCareCenters.map((center) => (
            <Card key={center.id} className="overflow-hidden bg-white border border-border-light shadow-sm flex flex-col">
              {/* Photo Box */}
              <div className="w-full h-44 relative bg-bg-secondary overflow-hidden shrink-0">
                <img src={center.img} alt={center.name} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setActiveCctvFeed(center)}
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md active:scale-95 transition-all z-10"
                >
                  <Video size={12} className="animate-pulse" /> LIVE CCTV FEED
                </button>
                <span className="absolute bottom-3 left-3 bg-[#FAF7F2] text-[#66B4B1] text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  ★ {center.rating} • Verified Daycare
                </span>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-text-primary">{center.name}</h3>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-[#66B4B1]">₹{center.price}</span>
                    <span className="text-[10px] text-text-disabled uppercase">per hour</span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary flex items-center gap-1 mb-4"><MapPin size={12} /> {center.distance}</p>
                
                {/* Amenities Grid */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {center.amenities.map((item) => (
                    <span key={item} className="text-[10px] font-bold text-text-primary bg-bg-secondary px-2.5 py-1 rounded-full border border-border-light/40">
                      {item}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedCenter(center)}
                  className="w-full bg-[#F87B68] hover:bg-[#F87B68]/90 text-white font-bold h-11 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  Book Stay Appointment
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Live Simulation Section */}
        <div className="bg-white rounded-[24px] border border-border-light p-5 shadow-sm mt-8">
          <h3 className="font-extrabold text-text-primary text-base mb-2 flex items-center gap-2">
            <UserCheck size={18} className="text-[#66B4B1]" /> Active Care Status (Simulator)
          </h3>
          <p className="text-xs text-text-secondary mb-4">Click below to simulate real-time updates caretaker checks.</p>

          <div className="flex gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentProgressIndex(i)}
                className={cn(
                  "flex-1 py-1 rounded-full text-[10px] font-black transition-colors uppercase border",
                  currentProgressIndex === i ? "bg-[#66B4B1] text-white border-[#66B4B1]" : "bg-bg-secondary border-border-light text-text-disabled"
                )}
              >
                Step {i+1}
              </button>
            ))}
          </div>

          {/* Steps Timeline */}
          <div className="flex flex-col gap-6 pl-6 relative border-l-2 border-dashed border-[#66B4B1]/30 ml-4">
            {careSteps.map((step, idx) => {
              const isActive = idx === currentProgressIndex;
              const isPassed = idx < currentProgressIndex;
              return (
                <div key={idx} className="relative">
                  {/* Circle Indicator */}
                  <div className={cn(
                    "absolute -left-[31px] top-1.5 w-[14px] h-[14px] rounded-full border-2 bg-white flex items-center justify-center z-10",
                    isActive ? "border-[#66B4B1] bg-[#FAF7F2]" : 
                    isPassed ? "border-[#66B4B1] bg-[#66B4B1]" : "border-border-light"
                  )} />

                  <div className="flex justify-between items-start">
                    <h4 className={cn("text-xs font-bold", isActive ? "text-[#66B4B1] text-sm" : isPassed ? "text-text-primary" : "text-text-disabled")}>
                      {step.title}
                    </h4>
                    <span className="text-[10px] text-text-disabled font-medium">{isActive ? 'Active Now' : step.time}</span>
                  </div>
                  
                  {isActive && (
                    <div className="mt-2 p-3 bg-[#FAF7F2]/40 border border-[#66B4B1]/20 rounded-xl animate-in slide-in-from-top-1 duration-200">
                      <p className="text-[11px] text-text-secondary leading-relaxed mb-1">{step.desc}</p>
                      <div className="text-[10px] text-[#66B4B1] font-bold italic">
                        Caretaker: "{step.note}"
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CCTV LIVE FEED WINDOW MODAL */}
      {activeCctvFeed && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-[32px] overflow-hidden bg-bg-card relative shadow-2xl animate-in zoom-in-95">
            
            <button 
              onClick={() => setActiveCctvFeed(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center font-bold text-white hover:bg-black/60 z-20"
            >
              ✕
            </button>

            {/* Video View */}
            <div className="w-full aspect-[4/3] bg-black relative flex items-center justify-center overflow-hidden">
              <img src={activeCctvFeed.videoFeed} alt="CCTV Feed" className="w-full h-full object-cover" />
              
              {/* Scanline / Live indicator overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none animate-pulse"></div>
              
              <div className="absolute top-4 left-4 bg-red-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> REC LIVE
              </div>

              <div className="absolute bottom-4 left-4 text-white text-[9px] font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded">
                CH-03 • DOME CAMERA • {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="p-5 bg-white">
              <h3 className="font-bold text-text-primary text-base mb-1">{activeCctvFeed.name} Live Feed</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Stay stress-free by watching real-time playdates and puppy matches directly inside the app.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* STAY BOOKING FORM MODAL */}
      {selectedCenter && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full bg-white rounded-t-[32px] p-6 max-h-[90%] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-300 relative">
            
            <button 
              onClick={() => setSelectedCenter(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-bg-secondary flex items-center justify-center font-bold text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>

            <h2 className="text-xl font-black text-text-primary mb-1">Book Daycare Stay</h2>
            <p className="text-xs text-text-secondary mb-6">{selectedCenter.name}</p>

            <form onSubmit={(e) => { e.preventDefault(); handleBooking(); }} className="flex flex-col gap-4">
              
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Drop-off Date *</label>
                <div className="relative">
                  <input 
                    required 
                    type="date" 
                    value={bookingDate} 
                    onChange={(e) => setBookingDate(e.target.value)} 
                    className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Drop-off Time Slot</label>
                <select value={bookingSlot} onChange={(e) => setBookingSlot(e.target.value)} className="w-full bg-white border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#66B4B1]">
                  <option>Morning (8 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 4 PM)</option>
                  <option>Evening (4 PM - 8 PM)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase mb-1 block pl-1">Stay Duration (Days)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBookingDays(num)}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-bold text-xs border transition-all",
                        bookingDays === num ? "bg-[#66B4B1] text-white border-[#66B4B1]" : "bg-white text-text-secondary border-border-light hover:border-[#66B4B1]/50"
                      )}
                    >
                      {num} {num === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-4 bg-bg-secondary/40 border border-border-light rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-text-disabled uppercase">Total Amount</span>
                  <div className="text-xl font-black text-[#66B4B1]">₹{selectedCenter.price * bookingDays}</div>
                </div>
                <div className="text-right text-[10px] text-text-secondary">
                  No hidden taxes • Free Vet Check Included
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#F87B68] hover:bg-[#F87B68]/90 text-white font-bold h-13 rounded-xl mt-4 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={18} /> Confirm Stay Booking
              </button>

            </form>

          </div>
        </div>
      )}

      {/* BOOKING SUCCESS PORTAL */}
      {bookingSuccess && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-[#66B4B1]" />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-1">Stay Booked!</h2>
          <p className="text-sm text-text-secondary mb-4 max-w-[280px]">
            Stay appointment verified and paired with Host. Added to Booking History list.
          </p>
          <div className="w-5 h-5 border-2 border-primary-main/30 border-t-primary-main rounded-full animate-spin"></div>
        </div>
      )}

    </div>
  );
}
