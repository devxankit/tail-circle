import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, Bell, Search, SlidersHorizontal, MapPin, 
  Calendar, Clock, Heart, Plus, Minus, QrCode, Share2, 
  CheckCircle2, Info, ChevronDown, Check, Home, ShoppingBag, User, Sparkles,
  Ticket, Mic, X, Loader2
} from 'lucide-react';
import { useVoiceSearch } from '../../../../hooks/useVoiceSearch';

const defaultEventCategories = [
  { id: 'all', name: 'All Events', emoji: '🎟️' },
  { id: 'birthday', name: 'Birthday Party', emoji: '🎂', img: '/assets/events/event_birthday.png' },
  { id: 'pool', name: 'Pool Party', emoji: '🏊', img: '/assets/events/event_pool.png' },
  { id: 'meetup', name: 'Pet Meetup', emoji: '🐾', img: '/assets/events/event_meetup.png' },
  { id: 'training', name: 'Training Camp', emoji: '🎓', img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=150&q=80' },
  { id: 'fashion', name: 'Pet Fashion Show', emoji: '👑', img: '/assets/events/event_fashion.png' },
  { id: 'sports', name: 'Pet Sports Day', emoji: '🏆', img: '/assets/events/event_sports.png' },
  { id: 'adoption', name: 'Adoption Drive', emoji: '❤️', img: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=150&q=80' },
  { id: 'spa', name: 'Spa Day', emoji: '✨', img: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=150&q=80' },
  { id: 'cat', name: 'Cat Events', emoji: '🐱', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80' },
  { id: 'dog', name: 'Dog Events', emoji: '🐶', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80' }
];

const defaultTicketEvents = [
  {
    id: 1,
    title: 'Dog Birthday Party',
    emoji: '🎂',
    img: '/assets/events/event_birthday.png',
    date: '25',
    month: 'MAY',
    time: '4:00 PM - 7:00 PM',
    location: 'Puppy Planet, Indore',
    price: 699,
    category: 'birthday',
    going: 28,
    desc: 'Celebrate your dog\'s special day with games, cake & fun!',
    avatars: [
      'https://randomuser.me/api/portraits/men/32.jpg',
      'https://randomuser.me/api/portraits/women/44.jpg',
      'https://randomuser.me/api/portraits/men/46.jpg'
    ]
  },
  {
    id: 2,
    title: 'Pool Pawty',
    emoji: '🏊',
    img: '/assets/events/event_pool.png',
    date: '02',
    month: 'JUN',
    time: '11:00 AM - 2:00 PM',
    location: 'Woof Water Park, Indore',
    price: 499,
    category: 'pool',
    going: 22,
    desc: 'Beat the heat with a splash! Pool party for dogs.',
    avatars: [
      'https://randomuser.me/api/portraits/women/65.jpg',
      'https://randomuser.me/api/portraits/men/55.jpg',
      'https://randomuser.me/api/portraits/women/33.jpg'
    ]
  },
  {
    id: 3,
    title: 'Pet Sports Day',
    emoji: '🏆',
    img: '/assets/events/event_sports.png',
    date: '08',
    month: 'JUN',
    time: '9:00 AM - 12:00 PM',
    location: 'Pet Playground, Indore',
    price: 399,
    category: 'sports',
    going: 35,
    desc: 'Fun sports & agility games for your furry champion!',
    avatars: [
      'https://randomuser.me/api/portraits/men/22.jpg',
      'https://randomuser.me/api/portraits/women/12.jpg',
      'https://randomuser.me/api/portraits/men/34.jpg'
    ]
  },
  {
    id: 4,
    title: 'Paw Fashion Show',
    emoji: '👑',
    img: '/assets/events/event_fashion.png',
    date: '15',
    month: 'JUN',
    time: '5:00 PM - 8:00 PM',
    location: 'Town Hall Mall, Indore',
    price: 799,
    category: 'fashion',
    going: 41,
    desc: 'Let your pet strut the runway in style!',
    avatars: [
      'https://randomuser.me/api/portraits/men/11.jpg',
      'https://randomuser.me/api/portraits/women/19.jpg',
      'https://randomuser.me/api/portraits/men/78.jpg'
    ]
  },
  {
    id: 5,
    title: 'Pet Meetup',
    emoji: '🐾',
    img: '/assets/events/event_meetup.png',
    date: '20',
    month: 'JUN',
    time: '10:00 AM - 1:00 PM',
    location: 'Central Park, Indore',
    price: 299,
    category: 'meetup',
    going: 50,
    desc: 'Meet, play, and make friends with other pets!',
    avatars: [
      'https://randomuser.me/api/portraits/men/5.jpg',
      'https://randomuser.me/api/portraits/women/8.jpg',
      'https://randomuser.me/api/portraits/men/15.jpg'
    ]
  }
];

const defaultPackageTemplates = [
  {
    id: 'pkg-birthday',
    title: 'Dog Birthday Package',
    emoji: '🎂',
    img: '/assets/events/package_birthday.png',
    price: '4,999+',
    type: 'Birthday',
    features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator']
  },
  {
    id: 'pkg-pool',
    title: 'Pool Party Package',
    emoji: '🏊',
    img: '/assets/events/event_pool.png',
    price: '7,999+',
    type: 'Pool Party',
    features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator']
  },
  {
    id: 'pkg-cat',
    title: 'Cat Birthday Package',
    emoji: '🐱',
    img: '/assets/events/package_cat.png',
    price: '4,999+',
    type: 'Birthday',
    features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator']
  },
  {
    id: 'pkg-meetup',
    title: 'Pet Meetup Package',
    emoji: '🐾',
    img: '/assets/events/event_meetup.png',
    price: '7,999+',
    type: 'Meetup',
    features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator']
  },
  {
    id: 'pkg-wedding',
    title: 'Pet Wedding Package',
    emoji: '💍',
    img: '/assets/events/package_wedding.png',
    price: '12,999+',
    type: 'Wedding',
    features: ['Decoration', 'Cake', 'Photography', 'Games', 'Coordinator']
  }
];

export function EventList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'packages'

  // Events + rails from the API (legacy shapes, static fallbacks while loading)
  const [ticketEvents, setTicketEvents] = useState(defaultTicketEvents);
  const [eventCategories, setEventCategories] = useState(defaultEventCategories);
  const [packageTemplates, setPackageTemplates] = useState(defaultPackageTemplates);

  useEffect(() => {
    import('../../../../services/api').then(({ api }) => {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      api.get('/events', { params }).then(({ data }) =>
        setTicketEvents(
          data.map((e) => ({
            id: e.legacyId ?? e._id,
            _id: e._id,
            title: e.title,
            emoji: e.emoji,
            img: e.img,
            date: e.dateDay,
            month: e.monthText,
            time: e.timeText,
            location: e.location,
            price: e.price,
            category: e.category,
            going: e.going,
            desc: e.desc,
            avatars: e.avatars || [],
          }))
        )
      ).catch(() => {});
      api.get('/events/meta').then(({ data }) => {
        if (data.categories?.length) setEventCategories(data.categories);
        if (data.packageTemplates?.length) setPackageTemplates(data.packageTemplates);
      }).catch(() => {});
    });
  }, [selectedCategory]);
  
  // Favorites mapping
  const [favoritedEvents, setFavoritedEvents] = useState({});

  // Dynamic profile pets (from the API)
  const [pets, setPets] = useState([]);

  useEffect(() => {
    import('../../../../services/pets')
      .then(({ fetchMyPets, toLegacyPet }) => fetchMyPets().then((apiPets) => apiPets.map(toLegacyPet)))
      .then((parsed) => {
        if (parsed && parsed.length > 0) {
          setPets(parsed);
          setSelectedPetId(parsed[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Bottom Sheet states
  const [isTicketSheetOpen, setIsTicketSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketQty, setTicketQty] = useState(1);
  const [selectedPetId, setSelectedPetId] = useState('max');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState('');

  const [isPackageSheetOpen, setIsPackageSheetOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageType, setPackageType] = useState('Birthday');
  const [packageDate, setPackageDate] = useState('');
  const [packageLocation, setPackageLocation] = useState('Indore');
  const [packageTier, setPackageTier] = useState('Premium'); // Basic, Premium, Luxury
  const [packageSuccess, setPackageSuccess] = useState(false);

  // Toggle favorite
  const toggleFavorite = (eventId, e) => {
    e.stopPropagation();
    setFavoritedEvents(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  // Open ticket sheet
  const openTicketBooking = (event) => {
    setSelectedEvent(event);
    setTicketQty(1);
    setTicketSuccess(false);
    if (pets.length > 0) {
      setSelectedPetId(pets[0].id);
    } else {
      setSelectedPetId('max');
    }
    setIsTicketSheetOpen(true);
  };

  // Confirm ticket — real booking + Razorpay payment
  const [ticketError, setTicketError] = useState('');
  const handleConfirmTicket = async () => {
    setTicketError('');
    try {
      const [{ api }, { payWithRazorpay }] = await Promise.all([
        import('../../../../services/api'),
        import('../../../../services/payments'),
      ]);
      const selectedPet = pets.find((p) => p.id === selectedPetId);
      const { data } = await api.post('/bookings', {
        type: 'event',
        eventId: String(selectedEvent.id),
        ticketQty,
        ...(selectedPet?._id ? { petId: selectedPet._id } : {}),
        paymentMethod: 'razorpay',
      });
      if (data.razorpay) {
        await payWithRazorpay(data.razorpay, { description: `Tickets — ${selectedEvent.title}` });
      }
      setGeneratedTicketId(data.booking.bookingNo);
      setTicketSuccess(true);
    } catch (err) {
      setTicketError(err.message || 'Payment failed');
    }
  };

  // Open package sheet
  const openPackageBooking = (pkg) => {
    setSelectedPackage(pkg);
    setPackageType(pkg.type);
    setPackageDate('');
    setPackageLocation('Indore');
    setPackageTier('Premium');
    setPackageSuccess(false);
    setIsPackageSheetOpen(true);
  };

  // Submit package request — real POST /events/requests, was a no-op before.
  const [packageError, setPackageError] = useState('');
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const handleConfirmPackage = async () => {
    setPackageError('');
    setIsSubmittingPackage(true);
    try {
      const { api } = await import('../../../../services/api');
      await api.post('/events/requests', {
        packageType,
        date: packageDate,
        budget: selectedPackage?.price ? `₹${selectedPackage.price}` : undefined,
        petName: pets[0]?.name,
        notes: `Location: ${packageLocation} • Tier: ${packageTier} • Package: ${selectedPackage?.title || ''}`,
      });
      setPackageSuccess(true);
    } catch (err) {
      setPackageError(err.message || 'Could not submit your request. Please try again.');
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  // Filter events
  const filteredEvents = ticketEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-[100px] animate-in fade-in duration-300 relative overflow-x-hidden">
      
      {/* ── TOP HEADER ── */}
      <div className="bg-white sticky top-0 z-30 px-4 py-3.5 border-b border-gray-100/60 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => navigate('/app/home')} 
              className="p-2 -ml-1 text-slate-800 hover:bg-slate-50 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[18px] font-black text-slate-900 leading-none tracking-tight truncate">
                Events & Celebrations
              </h1>
              <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                Create unforgettable moments for your pets
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/app/events/my-tickets')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#66B4B1]/10 hover:bg-[#66B4B1]/20 text-[#599D9A] font-extrabold text-[11.5px] rounded-full transition-colors cursor-pointer"
            >
              <Ticket size={13.5} strokeWidth={2.5} />
              <span>My Passes</span>
            </button>
            <div className="flex items-center gap-1 text-[#599D9A] font-bold text-[12.5px] cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap">
              <MapPin size={13.5} className="text-[#599D9A] shrink-0" strokeWidth={2.5} />
              <span>Indore</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex-1">
        {/* Search Bar Input with Voice Search */}
        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#599D9A]" />
            <input 
              type="text"
              placeholder="Search event title or description..."
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
                  <span className="truncate font-semibold">{transcript || 'Listening for event name...'}</span>
                </div>
                <button onClick={toggleListening} className="px-2 py-0.5 bg-white/20 rounded-full font-bold">Stop</button>
              </div>
            )}
          </div>
        </div>

        {/* ── SEGMENTED CONTROL TABS ── */}
        <div className="bg-gray-100/80 p-1 rounded-[24px] flex items-center mb-6 w-full border border-gray-200/40 shadow-sm">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 rounded-[20px] font-bold text-[13.5px] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 select-none ${
              activeTab === 'tickets' 
                ? 'bg-white text-[#599D9A] shadow-[0_3px_12px_rgba(0,0,0,0.06)]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Ticket size={16} strokeWidth={2.5} />
            <span>Book Tickets</span>
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex-1 py-2.5 rounded-[20px] font-bold text-[13.5px] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 select-none ${
              activeTab === 'packages' 
                ? 'bg-white text-[#599D9A] shadow-[0_3px_12px_rgba(0,0,0,0.06)]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Sparkles size={16} strokeWidth={2.5} />
            <span>Book Event Package</span>
          </button>
        </div>

        {/* ── CONTENT SECTIONS ── */}
        {activeTab === 'tickets' ? (
          <div>
            <div className="flex justify-between items-center mb-4 pl-0.5">
              <h3 className="text-[15px] font-black text-gray-900 tracking-tight leading-none">
                Upcoming Events ({filteredEvents.length})
              </h3>
              <span className="text-[11px] font-extrabold text-[#599D9A] cursor-pointer">View All &gt;</span>
            </div>
            
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div 
                  key={event.id}
                  className="bg-white rounded-[22px] border border-gray-100/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-3 flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer overflow-hidden group"
                >
                  {/* Top Image & Overlays */}
                  <div className="relative w-full h-[145px] rounded-[16px] overflow-hidden bg-gray-100 shrink-0">
                    <img src={event.img} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    
                    {/* Floating Date Widget */}
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md border border-white/60 px-2 py-1 rounded-[12px] flex flex-col items-center justify-center shadow-lg shadow-black/5 min-w-[46px]">
                      <span className="text-[18px] font-black text-[#F87B68] leading-none">{event.date}</span>
                      <span className="text-[8px] font-black text-orange-500 uppercase leading-none mt-1 tracking-wider">{event.month}</span>
                    </div>

                    {/* Favorite Button */}
                    <button 
                      onClick={(e) => toggleFavorite(event.id, e)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-white/60 cursor-pointer hover:scale-105 active:scale-95 transition-all z-10"
                    >
                      <Heart 
                        size={15} 
                        strokeWidth={2.5}
                        className={`transition-colors ${favoritedEvents[event.id] ? 'fill-[#F87B68] text-[#F87B68]' : 'text-gray-400'}`} 
                      />
                    </button>
                  </div>

                  {/* Content Details */}
                  <div className="flex flex-col px-0.5 pb-0.5">
                    {/* Title and Price Row */}
                    <div className="flex items-start justify-between mb-2.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[17px] font-black text-gray-900 leading-tight tracking-tight truncate">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold text-[11.5px] mt-1">
                          <span className="text-[13px] leading-none shrink-0">{event.emoji}</span>
                          <span className="truncate">{event.desc}</span>
                        </div>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="bg-[#FAF7F2] text-[#599D9A] px-3 py-1 rounded-full border border-[#599D9A]/20 shrink-0 shadow-sm mt-0.5">
                        <span className="text-[14px] font-black leading-none">₹{event.price}</span>
                      </div>
                    </div>

                    {/* Location and Time Badges */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                      <div className="flex items-center gap-2 bg-gray-50/80 p-2 rounded-[10px] border border-gray-100">
                        <div className="w-6 h-6 rounded-full bg-[#FCEAE7]/60 flex items-center justify-center shrink-0">
                          <span className="text-[#F87B68] text-[12px]">📍</span>
                        </div>
                        <p className="text-[11px] text-gray-700 font-bold truncate leading-tight flex-1">
                          {event.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50/80 p-2 rounded-[10px] border border-gray-100">
                        <div className="w-6 h-6 rounded-full bg-[#E5F1F0]/60 flex items-center justify-center shrink-0">
                          <span className="text-[#599D9A] text-[12px]">🕒</span>
                        </div>
                        <p className="text-[11px] text-gray-700 font-bold truncate leading-tight flex-1">
                          {event.time}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row (Avatars & Button) */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {event.avatars.map((avatar, idx) => (
                            <img key={idx} src={avatar} alt="avatar" className="w-[24px] h-[24px] rounded-full border-2 border-white object-cover shadow-sm relative z-10" style={{ zIndex: 10 - idx }} />
                          ))}
                        </div>
                        <div className="flex flex-col leading-tight ml-0.5">
                          <span className="text-[#F87B68] font-black text-[11px]">+{event.going}</span>
                          <span className="text-gray-400 font-bold text-[8.5px] uppercase tracking-wider">Attending</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); openTicketBooking(event); }}
                        className="bg-[#599D9A] hover:bg-[#4a8a87] text-white font-black text-[11px] tracking-wide px-5 py-2.5 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#599D9A]/20 cursor-pointer shrink-0"
                      >
                        BOOK TICKET
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DON'T MISS OUT BANNER (FROM MOCKUP) ── */}
            <div className="rounded-[24px] bg-[#FAF7F2] p-4.5 flex items-center justify-between min-h-[120px] border border-[#FCEAE7]/40 shadow-sm mt-6 mb-2 relative overflow-hidden">
              <div className="w-[60%] z-10">
                <span className="bg-[#FAF7F2] text-orange-500 text-[8.5px] font-black px-2 py-0.5 rounded-[6px] tracking-wider uppercase inline-block mb-1.5 border border-[#FCEAE7]/60">
                  Exclusive
                </span>
                <h3 className="text-[14px] font-black text-[#D96B5B] leading-snug">
                  Don't Miss Out!
                </h3>
                <p className="text-[10px] text-[#F87B68] font-bold mt-1 leading-snug">
                  Grab your tickets now and make memories with your furry bestie.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 top-0 w-[42%] pointer-events-none z-0">
                <img 
                  src="/assets/events/ticket_banner.png" 
                  className="w-full h-full object-contain object-right-bottom mix-blend-multiply" 
                  alt="admit one puppy"
                />
              </div>
            </div>

          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 pl-0.5">
              <div>
                <h3 className="text-[15px] font-black text-gray-900 tracking-tight leading-none">
                  Book Packages
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-1">
                  Organize events, we handle the rest!
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-[#599D9A] cursor-pointer">View All &gt;</span>
            </div>

            <div className="space-y-4">
              {packageTemplates.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-[22px] border border-gray-100/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-3 flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer overflow-hidden group"
                >
                  {/* Top Image & Overlays */}
                  <div className="relative w-full h-[145px] rounded-[16px] overflow-hidden bg-gray-100 shrink-0">
                    <img src={pkg.img} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    
                    {/* Floating Package Widget */}
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md border border-white/60 px-2 py-1 rounded-[12px] flex flex-col items-center justify-center shadow-lg shadow-black/5 min-w-[46px]">
                      <span className="text-[18px] font-black leading-none">{pkg.emoji}</span>
                      <span className="text-[8px] font-black text-[#599D9A] uppercase leading-none mt-1 tracking-wider">PKG</span>
                    </div>

                    {/* Favorite Button */}
                    <button className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-black/5 border border-white/60 cursor-pointer hover:scale-105 active:scale-95 transition-all z-10">
                      <Heart size={15} strokeWidth={2.5} className="text-gray-400" />
                    </button>
                  </div>

                  {/* Content Details */}
                  <div className="flex flex-col px-0.5 pb-0.5">
                    {/* Title and Price Row */}
                    <div className="flex items-start justify-between mb-2.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[17px] font-black text-gray-900 leading-tight tracking-tight truncate">
                          {pkg.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold text-[11.5px] mt-1">
                          <span className="text-[13px] leading-none shrink-0">{pkg.emoji}</span>
                          <span className="truncate">Complete custom arrangements & decor.</span>
                        </div>
                      </div>
                      
                      {/* Price Tag */}
                      <div className="bg-[#FAF7F2] text-[#599D9A] px-3 py-1 rounded-full border border-[#599D9A]/20 shrink-0 shadow-sm mt-0.5 flex items-center gap-1">
                        <span className="text-[8px] font-black uppercase opacity-70">From</span>
                        <span className="text-[14px] font-black leading-none">₹{pkg.price}</span>
                      </div>
                    </div>

                    {/* Features Badges */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                      {pkg.features.slice(0, 4).map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50/80 p-2 rounded-[10px] border border-gray-100">
                          <div className="w-5 h-5 rounded-full bg-[#E5F1F0]/60 flex items-center justify-center shrink-0">
                            <span className="text-[#599D9A] text-[10px] font-black leading-none">✓</span>
                          </div>
                          <p className="text-[11px] text-gray-700 font-bold truncate leading-tight flex-1">
                            {feat}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 pl-1">
                        <span className="w-6 h-6 rounded-full bg-[#FAF7F2] flex items-center justify-center border border-[#E5F1F0] shadow-sm">
                          <span className="text-[12px]">🤝</span>
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[#599D9A] font-black text-[11px]">Included</span>
                          <span className="text-gray-400 font-bold text-[8.5px] uppercase tracking-wider">Coordination</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); openPackageBooking(pkg); }}
                        className="bg-[#599D9A] hover:bg-[#4a8a87] text-white font-black text-[11px] tracking-wide px-5 py-2.5 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#599D9A]/20 cursor-pointer shrink-0"
                      >
                        BOOK PACKAGE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── TRUST BADGES ROW (FROM MOCKUP) ── */}
            <div className="grid grid-cols-3 gap-3 bg-white p-4.5 rounded-[24px] border border-gray-150/40 shadow-sm mt-6 mb-2">
              <div className="flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center mb-1.5 shadow-sm">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-gray-800 leading-tight">Verified Organizers</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center mb-1.5 shadow-sm">
                  <Sparkles size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-gray-800 leading-tight">Safe & Pet Friendly</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#599D9A] flex items-center justify-center mb-1.5 shadow-sm">
                  <User size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-gray-800 leading-tight">24/7 Planner Support</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── FIXED BOTTOM NAVIGATION ── */}
      <div className="fixed bottom-0 left-0 right-0 w-full h-[80px] bg-white/85 backdrop-blur-lg border-t border-gray-200/50 flex justify-around items-center px-2 pb-2 z-40 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => navigate('/app/home')} 
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <Home size={22} />
          <span className="text-[9px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => navigate('/app/shop')} 
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ShoppingBag size={22} />
          <span className="text-[9px] font-bold">Shop</span>
        </button>
        <button 
          onClick={() => navigate('/app/adopt')} 
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <Heart size={22} />
          <span className="text-[9px] font-bold">Adopt</span>
        </button>
        <button 
          onClick={() => navigate('/app/services/events')} 
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-[#599D9A] transition-colors cursor-pointer"
        >
          <div className="bg-[#FAF7F2] p-1.5 rounded-xl">
            <Calendar size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[9.5px] font-extrabold mt-0.5">Events</span>
        </button>
        <button 
          onClick={() => navigate('/app/profile')} 
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <User size={22} />
          <span className="text-[9px] font-bold">Profile</span>
        </button>
      </div>

      {/* ── BOTTOM SHEET 1: TICKET FLOW (Simulated Overlay) ── */}
      {isTicketSheetOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            onClick={() => setIsTicketSheetOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="bg-white rounded-t-[32px] p-6 relative z-10 animate-in slide-in-from-bottom-full duration-300 max-h-[92vh] flex flex-col">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

            {!ticketSuccess ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-[18px] font-black text-gray-950">Book Ticket</h2>
                  <button 
                    onClick={() => setIsTicketSheetOpen(false)}
                    className="text-gray-400 hover:text-gray-600 font-extrabold text-[13px] uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Event Summary */}
                <div className="flex gap-4.5 bg-gray-50 p-3 rounded-2xl border border-gray-150/40 mb-5">
                  <img src={selectedEvent.img} className="w-[75px] h-[75px] rounded-xl object-cover shrink-0" alt="" />
                  <div className="flex-1 min-w-0 justify-center flex flex-col">
                    <h3 className="text-[14px] font-black text-gray-900 leading-tight mb-1 truncate">{selectedEvent.title}</h3>
                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">{selectedEvent.date} {selectedEvent.month} 2026 • {selectedEvent.time}</p>
                    <p className="text-[10px] text-gray-400 font-semibold truncate">📍 {selectedEvent.location}</p>
                  </div>
                </div>

                {/* Ticket count selection */}
                <div className="flex justify-between items-center py-3.5 border-y border-gray-100 mb-5 shrink-0">
                  <div>
                    <span className="text-[13px] font-black text-gray-900 block">General Admission Ticket</span>
                    <span className="text-[11.5px] text-gray-500 font-semibold mt-0.5 block">₹{selectedEvent.price} per ticket</span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-gray-100 px-3 py-1.5 rounded-full shrink-0">
                    <button 
                      onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="text-[14px] font-black text-gray-900 w-4 text-center">{ticketQty}</span>
                    <button 
                      onClick={() => setTicketQty(ticketQty + 1)}
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#599D9A] hover:bg-gray-50 shadow-sm shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Pet Selection */}
                <div className="mb-5 shrink-0">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Attending Pet
                  </label>
                  <select 
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-[14px] px-3.5 py-3 text-[13px] font-bold text-gray-800 outline-none focus:border-[#599D9A] transition-colors cursor-pointer"
                  >
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>{pet.name} ({pet.breed})</option>
                    ))}
                  </select>
                </div>

                {/* Prices & Fee info */}
                <div className="space-y-2 mb-6 shrink-0 text-[12px] font-bold text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-150/40">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-900 font-extrabold">₹{selectedEvent.price * ticketQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Convenience Fee</span>
                    <span className="text-emerald-600 font-extrabold">Free</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-[13.5px] text-gray-900 font-black">
                    <span>Total Amount</span>
                    <span className="text-[#599D9A]">₹{selectedEvent.price * ticketQty}</span>
                  </div>
                </div>

                {/* Action CTA */}
                {ticketError && (
                  <p className="text-center text-xs font-bold text-red-500 mb-2">{ticketError}</p>
                )}
                <button
                  onClick={handleConfirmTicket}
                  className="w-full bg-[#599D9A] hover:bg-[#599D9A] text-white py-3.5 rounded-[16px] text-[14px] font-black shadow-lg shadow-[#599D9A]/15 active:scale-95 transition-all mt-auto cursor-pointer"
                >
                  CONFIRM TICKET
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center text-[#599D9A] mb-4 shadow-sm">
                  <CheckCircle2 size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-[19px] font-black text-gray-950 mb-1">🎉 Ticket Confirmed</h2>
                <p className="text-[12.5px] text-gray-500 font-bold max-w-[260px] leading-relaxed mb-6">
                  Your ticket has been confirmed. Please present this QR code at the entrance.
                </p>

                {/* QR Code Graphic Card */}
                <div className="bg-gray-50 border border-gray-150 p-5 rounded-[24px] flex flex-col items-center justify-center mb-6 w-full max-w-[240px] shadow-sm">
                  <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
                    <QrCode size={100} className="text-[#599D9A]" />
                  </div>
                  <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-none">
                    Ticket ID: {generatedTicketId}
                  </span>
                  <span className="text-[11.5px] text-gray-700 font-black mt-2">
                    Admit {ticketQty} ({pets.find(p => p.id === selectedPetId)?.name || 'Max'})
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 w-full shrink-0">
                  <button 
                    onClick={() => setIsTicketSheetOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-[14px] text-[13px] font-black active:scale-95 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      alert(`Ticket Details:\nID: ${generatedTicketId}\nEvent: ${selectedEvent.title}\nAdmit: ${ticketQty}`);
                    }}
                    className="flex-1 bg-[#599D9A] hover:bg-[#599D9A] text-white py-3.5 rounded-[14px] text-[13px] font-black active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    View Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET 2: PACKAGE FLOW (Simulated Overlay) ── */}
      {isPackageSheetOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            onClick={() => setIsPackageSheetOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="bg-white rounded-t-[32px] p-6 relative z-10 animate-in slide-in-from-bottom-full duration-300 max-h-[92vh] flex flex-col">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

            {!packageSuccess ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-start mb-4 shrink-0">
                  <h2 className="text-[18px] font-black text-gray-950">Book Event Package</h2>
                  <button 
                    onClick={() => setIsPackageSheetOpen(false)}
                    className="text-gray-400 hover:text-gray-600 font-extrabold text-[13px] uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Event Type Select */}
                <div className="mb-4 shrink-0">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Event Type
                  </label>
                  <select 
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-[14px] px-3.5 py-3 text-[13px] font-bold text-gray-800 outline-none focus:border-[#599D9A] transition-colors cursor-pointer"
                  >
                    <option value="Birthday">Dog Birthday Party 🎂</option>
                    <option value="Pool Party">Pool Pawty 🏊</option>
                    <option value="Meetup">Pet Meetup 🐾</option>
                    <option value="Wedding">Pet Wedding 💍</option>
                  </select>
                </div>

                {/* Date Select */}
                <div className="mb-4 shrink-0">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Event Date
                  </label>
                  <input 
                    type="date"
                    value={packageDate}
                    onChange={(e) => setPackageDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-[14px] px-3.5 py-3 text-[13px] font-bold text-gray-800 outline-none focus:border-[#599D9A] transition-colors cursor-pointer"
                  />
                </div>

                {/* Location Input */}
                <div className="mb-4 shrink-0">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Location / City
                  </label>
                  <input 
                    type="text"
                    value={packageLocation}
                    onChange={(e) => setPackageLocation(e.target.value)}
                    placeholder="Enter location (e.g. Indore)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-[14px] px-3.5 py-3 text-[13px] font-bold text-gray-800 outline-none focus:border-[#599D9A] transition-colors"
                  />
                </div>

                {/* Segmented Package Tier Selection */}
                <div className="mb-6 shrink-0">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Package Tier
                  </label>
                  <div className="bg-gray-100 p-1 rounded-xl flex border border-gray-100">
                    {['Basic', 'Premium', 'Luxury'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setPackageTier(tier)}
                        className={`flex-1 py-2 text-center text-[12px] font-black rounded-lg transition-colors cursor-pointer ${
                          packageTier === tier 
                            ? 'bg-white text-[#599D9A] shadow-sm' 
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action CTA */}
                {packageError && (
                  <p className="text-[12px] font-bold text-rose-500 text-center mb-2 shrink-0">{packageError}</p>
                )}
                <button
                  onClick={handleConfirmPackage}
                  disabled={!packageDate || isSubmittingPackage}
                  className={`w-full py-3.5 rounded-[16px] text-[14px] font-black shadow-lg transition-all mt-auto cursor-pointer ${
                    packageDate
                      ? 'bg-[#599D9A] text-white hover:bg-[#599D9A] shadow-[#599D9A]/15 active:scale-95 disabled:opacity-60'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmittingPackage ? 'SUBMITTING...' : 'REQUEST CALLBACK'}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center text-[#599D9A] mb-5 shadow-sm">
                  <CheckCircle2 size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-[19px] font-black text-gray-955 mb-2">🎉 Request Submitted</h2>
                <p className="text-[13px] text-gray-500 font-bold max-w-[280px] leading-relaxed mb-6">
                  Our event planner will contact you within 30 minutes at your registered mobile number to discuss decorations, photography, and custom requirements.
                </p>

                {/* Info Note */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/40 flex items-start gap-3 w-full mb-6 text-left">
                  <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                    No payment is required right now. The package tier ({packageTier}) and pricing details will be customized and confirmed during the callback consultation.
                  </p>
                </div>

                {/* Action Done */}
                <button 
                  onClick={() => setIsPackageSheetOpen(false)}
                  className="w-full bg-[#599D9A] hover:bg-[#599D9A] text-white py-3.5 rounded-[16px] text-[13px] font-black active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
