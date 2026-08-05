import React, { useRef, useState, useEffect } from 'react';
import { MapPin, Calendar, ArrowRight, ChevronDown, ChevronUp, Bookmark, Percent, Plus, Heart, MessageCircle, ShoppingCart, Star, Search, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { Card } from '../../components/ui/Card';
import { fetchPublicBanners } from '../../../../services/admin';

// Cosmetic style presets, cycled by index over real API content — kept out
// of the component so effects that use them don't need them as a dep.
const OFFER_STYLES = [
  { bg: 'from-[#FEF4F3] to-[#FEF4F3]', textColor: 'text-[#F87B68]', badgeColor: 'bg-[#F87B68]' },
  { bg: 'from-[#EFF7F7] to-[#EFF7F7]', textColor: 'text-[#66B4B1]', badgeColor: 'bg-[#66B4B1]' },
];
const BESTSELLER_STYLES = [
  { badgeBg: 'bg-[#66B4B1]', circleBg: 'bg-[#FAF7F2]' },
  { badgeBg: 'bg-[#F87B68]', circleBg: 'bg-[#FAF7F2]' },
  { badgeBg: 'bg-[#66B4B1]', circleBg: 'bg-[#FAF7F2]' },
];

export function Home() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const specialOffersRef = useRef(null);
  const topMatchesRef = useRef(null);
  const heroCarouselRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [likedProducts, setLikedProducts] = useState({});
  const [matchSlideIndex, setMatchSlideIndex] = useState(0);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const searchPlaceholders = [
    "food...",
    "vets...",
    "grooming...",
    "playdates...",
    "toys...",
    "daycare...",
    "adopt..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const matchCarouselSlides = [
    {
      id: 1,
      image: "/assets/banners/meet_match_dogs_banner_v2.png",
      bg: "bg-gradient-to-r from-[#FAF3EE] via-[#FCEAE5]/70 to-[#FCEAE5]",
      textColor: "bg-gradient-to-r from-[#F87B68] to-[#BA5C4E] bg-clip-text text-transparent",
      subtextColor: "text-[#5A5552]",
      iconColor: "text-[#F87B68]"
    }
  ];

  useEffect(() => {
    if (matchCarouselSlides.length <= 1) return;
    const timer = setInterval(() => {
      setMatchSlideIndex((prev) => (prev + 1) % matchCarouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [matchCarouselSlides.length]);

  const toggleLikeProduct = (id) => {
    setLikedProducts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Home carousel banners — fetched from the admin-managed CMS (GET /banners),
  // falling back to the built-in set if the API is unavailable.
  const FALLBACK_BANNERS = [
    { id: 1, title: "Pet Health Insurance", btnText: "Get Quote", image: "/assets/banners/banner_health.png", bg: "from-[#F9D5CE] to-[#F9D5CE]", path: "/app/services" },
    { id: 2, title: "Grooming at Home", btnText: "Book Now", image: "/assets/banners/banner_grooming_home.png", bg: "from-[#80C1BF] to-[#66B4B1]", path: "/app/services/grooming" },
    { id: 3, title: "Pet Travel Agent Services", btnText: "Explore", image: "/assets/banners/banner_travel.png", bg: "from-[#9FD1CF] to-[#BFE0DF]", path: "/app/services" }
  ];
  const [banners, setBanners] = useState(FALLBACK_BANNERS);

  useEffect(() => {
    fetchPublicBanners()
      .then((rows) => {
        const homeBanners = (rows || []).filter((b) => b.slot === 'Home Hero');
        if (homeBanners.length) {
          setBanners(homeBanners.map((b) => ({ id: b.id, title: b.title, btnText: b.btnText || 'Explore', image: b.image, bg: b.bg || 'from-[#9FD1CF] to-[#BFE0DF]', path: b.link || '/app/services' })));
        }
      })
      .catch(() => {});
  }, []);

  // Repeat banners multiple times to create a seamless infinite scroll illusion
  const displayBanners = [...banners, ...banners, ...banners, ...banners, ...banners];

  // Infinite Auto-scroll logic for banners (1.8s interval)
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      [carouselRef.current, specialOffersRef.current].forEach(container => {
        if (!container) return;

        const firstChild = container.firstElementChild;
        if (!firstChild) return;

        const slideWidth = firstChild.getBoundingClientRect().width;
        const nextChild = firstChild.nextElementSibling;
        const step = nextChild
          ? (nextChild.getBoundingClientRect().left - firstChild.getBoundingClientRect().left)
          : (slideWidth + 16);

        const setWidth = container.scrollWidth / 5;
        if (container.scrollLeft >= setWidth * 3) {
          container.scrollTo({ left: container.scrollLeft - (setWidth * 2), behavior: 'auto' });
          setTimeout(() => {
            if (container) container.scrollBy({ left: step, behavior: 'smooth' });
          }, 50);
        } else {
          container.scrollBy({ left: step, behavior: 'smooth' });
        }
      });
    }, 1800);
    return () => clearInterval(intervalId);
  }, [isPaused]);

    // Auto-scroll logic for other carousels can go here if needed.
    
    // Auto crossfade logic for Hero Banner
    useEffect(() => {
      if (isPaused) return;
      const interval = setInterval(() => {
        setHeroSlideIndex(prev => (prev + 1) % 2);
      }, 3500); // changes every 3.5 seconds
      return () => clearInterval(interval);
    }, [isPaused]);

  const services = [
    { name: 'Grooming', image: '/assets/quick_links/grooming.png', path: '/app/services/grooming' },
    { name: 'Day Care', image: '/assets/quick_links/daycare.png', path: '/app/services/daycare' },
    { name: 'Shop', image: '/assets/quick_links/shop.png', path: '/app/shop' },
    { name: 'Vet', image: '/assets/quick_links/vet.png', path: '/app/services/doctors' },
    { name: 'Events', image: '/assets/quick_links/events.png', path: '/app/services/events' },
    { name: 'Meals', image: '/assets/quick_links/meals.png', path: '/app/meals' },
    { name: 'Community', image: '/assets/quick_links/community.png', path: '/app/community' },
    { name: 'Adopt', image: '/assets/quick_links/adopt.png', path: '/app/adopt' },
  ];

  // Upcoming events — real GET /events (same data EventList.jsx books against).
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  useEffect(() => {
    import('../../../../services/api').then(({ api }) =>
      api.get('/events').then(({ data }) =>
        setUpcomingEvents(
          data.slice(0, 3).map((e) => ({
            id: e.legacyId ?? e._id,
            title: e.title,
            location: e.location,
            date: e.dateDay,
            month: e.monthText,
            going: e.going,
            image: e.img,
            avatars: e.avatars || [],
          }))
        )
      ).catch(() => {})
    );
  }, []);

  // Special offers — real Banner rows (slot 'Home Offers'); only content
  // (title/desc/badge/image/link) is data, the two-tone styling is cosmetic
  // and cycles from OFFER_STYLES same as it always did.
  const [specialOffers, setSpecialOffers] = useState([]);
  useEffect(() => {
    fetchPublicBanners()
      .then((rows) => {
        const offers = (rows || []).filter((b) => b.slot === 'Home Offers');
        setSpecialOffers(
          offers.map((b, i) => ({
            id: b.id,
            discount: b.badge || '',
            title: b.title,
            desc: b.subtitle,
            btnText: b.btnText || 'View',
            image: b.image,
            path: b.link || '/app/shop',
            ...OFFER_STYLES[i % OFFER_STYLES.length],
          }))
        );
      })
      .catch(() => setSpecialOffers([]));
  }, []);
  // Repeat special offers for seamless infinite scroll illusion
  const displaySpecialOffers = specialOffers.length
    ? [...specialOffers, ...specialOffers, ...specialOffers, ...specialOffers, ...specialOffers]
    : [];

  // Best sellers — real GET /shop/products?bestsellers=true (isBestseller flag).
  const formatReviewCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0));
  const [bestSellers, setBestSellers] = useState([]);
  useEffect(() => {
    import('../../../../services/shop').then(({ fetchProducts }) =>
      fetchProducts({ bestsellers: true, limit: 3 })
        .then((products) =>
          setBestSellers(
            products.map((p, i) => ({
              id: p.id,
              badgeText: `#${i + 1} BEST SELLER`,
              brand: p.brand || p.name,
              desc: p.subCategory || p.category,
              rating: p.rating?.toFixed(1) || '—',
              reviews: formatReviewCount(p.reviewsData?.total),
              price: `₹${p.price}`,
              originalPrice: p.mrp > p.price ? `₹${p.mrp}` : null,
              discount: p.discountRange ? `${p.discountRange}% OFF` : null,
              image: p.img,
              tags: [p.petType, p.lifeStage].filter(Boolean).map((t) => ({ text: t, bg: 'bg-[#FAF7F2] text-[#66B4B1]', icon: t === 'Dog' ? 'dog' : 'paw' })),
              _product: p,
              ...BESTSELLER_STYLES[i % BESTSELLER_STYLES.length],
            }))
          )
        )
        .catch(() => setBestSellers([]))
    );
  }, []);

  // Community highlights — real GET /community/posts (top 3 latest).
  const [communityHighlights, setCommunityHighlights] = useState([]);
  useEffect(() => {
    import('../../../../services/social').then(({ fetchPosts }) =>
      fetchPosts()
        .then((posts) =>
          setCommunityHighlights(
            posts.slice(0, 3).map((p) => ({
              id: p.id,
              author: p.author,
              time: p.time,
              avatar: p.authorAvatar,
              image: p.image,
              likes: p.likes,
              comments: p.comments,
            }))
          )
        )
        .catch(() => setCommunityHighlights([]))
    );
  }, []);

  const categoryCards = [
    { name: 'Grooming', tag: 'SPA', desc: 'Spa & salon', image: '/assets/quick_links/grooming_spa.png', bg: 'bg-[#599D9A]', path: '/app/services/grooming' },
    { name: 'Daycare', tag: 'STAY', desc: 'Safe & fun boarding', image: '/assets/quick_links/daycare_stay.png', bg: 'bg-[#F87B68]', path: '/app/services/daycare' },
    { name: 'Shop', tag: 'SHOP', desc: 'Toys & Treats', image: '/assets/quick_links/shop_box.png', bg: 'bg-[#F87B68]', path: '/app/shop' },
    { name: 'Find Vets', tag: 'VETS', desc: 'Book 60 sec', image: '/assets/quick_links/vet_checkup.png', bg: 'bg-[#599D9A]', path: '/app/services/doctors' },
    { name: 'Events', tag: 'EVENTS', desc: 'Parties & shows', image: '/assets/quick_links/events_party.png', bg: 'bg-[#599D9A]', path: '/app/services/events' },
    { name: 'Meals', tag: 'DIET', desc: 'Fresh & healthy diet', image: '/assets/quick_links/meals_fresh.png', bg: 'bg-[#F87B68]', path: '/app/meals' },
    { name: 'Community', tag: 'SOCIAL', desc: 'Connect & share', image: '/assets/quick_links/community_social.png', bg: 'bg-[#F87B68]', path: '/app/community' },
    { name: 'Adopt', tag: 'ADOPT', desc: 'Find a companion', image: '/assets/quick_links/adopt_pet.png', bg: 'bg-[#599D9A]', path: '/app/adopt' }
  ];

  const searchKeywords = {
    'Grooming': ['gr', 'grooming', 'spa', 'salon', 'haircut', 'bath', 'wash'],
    'Daycare': ['da', 'dc', 'daycare', 'stay', 'boarding', 'play', 'sit'],
    'Shop': ['sh', 'shop', 'toys', 'treats', 'buy', 'store', 'food'],
    'Find Vets': ['ve', 'vets', 'doctor', 'clinic', 'health', 'sick', 'medical', 'dr'],
    'Events': ['ev', 'events', 'party', 'shows', 'meetup', 'gathering'],
    'Meals': ['me', 'meals', 'food', 'diet', 'fresh', 'nutrition'],
    'Community': ['co', 'com', 'community', 'social', 'connect', 'share', 'friends', 'playdate'],
    'Adopt': ['ad', 'adopt', 'pet', 'companion', 'rescue', 'dog', 'puppy']
  };

  const searchResults = React.useMemo(() => {
    if (!searchValue.trim()) return [];
    const query = searchValue.toLowerCase().trim();
    return categoryCards.filter(cat => {
      if (cat.name.toLowerCase().includes(query) || cat.desc.toLowerCase().includes(query) || cat.tag.toLowerCase().includes(query)) return true;
      const keywords = searchKeywords[cat.name] || [];
      return keywords.some(kw => kw.includes(query) || query.includes(kw));
    });
  }, [searchValue]);

  return (
    <div className="flex flex-col min-h-full pb-6 animate-in fade-in duration-500 bg-[#FAF7F2]">
      <DashboardHeader />

      {/* Main Hero Banner: Everything Your Pet Needs */}
      <div className="px-4 mb-6 relative z-50">
        <div className="relative w-full h-[320px] min-[380px]:h-[310px] bg-gradient-to-r from-[#DDECE6] via-[#E4EFE5] to-[#F3E2C6] rounded-[32px] flex flex-col justify-between p-5 shadow-sm border border-white/60">
          
          {/* Background Layer with overflow-hidden to prevent dog image clipping issues while allowing search dropdown to overflow */}
          <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none z-0">
            {/* Background Image (Dog) */}
            <div className="absolute right-[-10%] bottom-[-5%] w-[80%] h-[125%] pointer-events-none">
              <img 
                src="/assets/banners/hero_dog_v2.png?v=6" 
                alt="Golden Retriever" 
                className="w-full h-full object-cover object-[75%_20%] opacity-[0.98] mix-blend-multiply" 
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 25%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%)'
                }}
              />
            </div>
          </div>
          {/* Text Content */}
          <div className="relative w-[75%] pt-1 z-10">
            <h1 
              className="text-[28px] min-[380px]:text-[32px] leading-[1.0] font-black text-[#427C76]"
              style={{ letterSpacing: "-0.04em", fontFamily: "'Outfit', sans-serif" }}
            >
              Everything<br/>Your Pet<br/>Needs,<br/>
              In <span className="text-[#F57A64]">One Place</span>
            </h1>
            <p 
              className="text-[#5B9D98] text-[12px] font-black mt-2 leading-snug"
              style={{ letterSpacing: "-0.01em", fontFamily: "'Outfit', sans-serif" }}
            >
              Trusted care, services, products<br/>and companions.
            </p>
          </div>
          {/* Search Bar */}
          <div className="relative mt-2 mb-0 pointer-events-auto z-10 w-[95%]">
            <div className="bg-white/80 backdrop-blur-2xl border-[1.5px] border-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-full p-1.5 pl-5 flex items-center gap-3 w-full relative overflow-hidden">
              <Search className="text-[#427C76] opacity-60 w-4 h-4 shrink-0" strokeWidth={2.5} />
              
              {/* Animated Placeholder Overlay */}
              {!isSearchFocused && !searchValue && (
                <div className="absolute left-[44px] right-[44px] h-[18px] pointer-events-none flex items-center overflow-hidden text-[13px] font-black text-[#427C76]/50" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <span className="whitespace-pre">Search for </span>
                  <div className="flex flex-col h-[18px] overflow-hidden">
                    <div 
                      className="flex flex-col transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateY(-${placeholderIndex * 18}px)` }}
                    >
                      {searchPlaceholders.map((text, idx) => (
                        <span key={idx} className="h-[18px] flex items-center">
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <input 
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="bg-transparent border-none outline-none text-[13px] font-black text-[#2C5753] flex-1 w-full relative z-10"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              />
              <button className="bg-[#5EA49E] hover:bg-[#4C8684] active:scale-95 transition-all text-white p-2.5 rounded-full shrink-0 shadow-[0_4px_12px_rgba(94,164,158,0.4)]">
                <Mic className="w-[14px] h-[14px]" strokeWidth={2.5} />
              </button>
            </div>

            {/* Search Dropdown Results */}
            {searchValue.trim() && isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white/60 overflow-hidden z-50">
                {searchResults.map((result, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(result.path);
                      setSearchValue('');
                    }}
                    className="flex items-center gap-3.5 p-3.5 hover:bg-slate-50/80 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/50">
                       <img src={result.image} alt={result.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 ml-0.5">
                      <h4 className="text-[14px] font-black text-[#2C5753] leading-none mb-1">{result.name}</h4>
                      <p className="text-[11.5px] font-bold text-[#5B9D98] leading-none">{result.desc}</p>
                    </div>
                    <ArrowRight className="text-[#5B9D98] opacity-50 w-4 h-4" />
                  </div>
                ))}
              </div>
            )}
            
            {searchValue.trim() && isSearchFocused && searchResults.length === 0 && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white/60 overflow-hidden z-50 p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                     <Search className="text-[#5B9D98] opacity-50 w-5 h-5" />
                  </div>
                  <h4 className="text-[14px] font-black text-[#2C5753] mb-1">No results found</h4>
                  <p className="text-[12px] font-bold text-[#5B9D98]">Try searching for 'grooming', 'vet', or 'shop'</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Meet & Match Category Banner */}
      <div className="px-4 mb-6 relative z-10">
        <div className="w-full bg-white rounded-[24px] overflow-hidden shadow-sm border border-slate-100 flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" onClick={() => navigate('/app/matches')}>
          {/* Top Image Area */}
          <div className="w-full h-[180px] bg-[#FFFBF9] relative flex items-end justify-center overflow-hidden">
            <img 
              src="/assets/banners/pet_matches_love.png" 
              alt="Meet & Match" 
              className="w-full h-full object-cover object-[50%_25%]" 
            />
          </div>
          {/* Bottom Solid Banner Area */}
          <div className="w-full bg-[#F87B68] p-4 min-[380px]:p-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <svg className="w-[18px] h-[18px] text-white/90 fill-current" viewBox="0 0 24 24">
                  <path d="M12 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                  <circle cx="9" cy="8.5" r="1.5"/><circle cx="15" cy="8.5" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>
                </svg>
                <h3 className="text-[20px] font-black text-white leading-none tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Meet & Match</h3>
              </div>
              <p className="text-[12.5px] text-white/90 font-bold leading-snug">
                Find playdates, friends & mates near you
              </p>
            </div>
            <button 
              className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-full text-[13px] font-black flex items-center gap-1 transition-colors ml-2 shadow-sm"
            >
              Explore 
              <svg className="w-4 h-4 translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          {categoryCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-[24px] overflow-hidden flex flex-col cursor-pointer border border-slate-100/60 shadow-[0_6px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-95 transition-all duration-300"
            >
              {/* Card Image Area */}
              <div className="w-full aspect-[16/11] relative overflow-hidden bg-slate-50 flex items-center justify-center">
                <img 
                  src={card.image} 
                  alt={card.name} 
                  className={`w-full h-full object-cover ${card.imgClass || ''}`} 
                />
                {/* Floating Tag Badge */}
                <div className={`absolute top-2.5 left-2.5 ${card.bg} text-white text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase`}>
                  {card.tag}
                </div>
              </div>
              
              {/* Card Footer Block */}
              <div className={`${card.bg} p-3.5 flex flex-col justify-between flex-1`}>
                <div>
                  <h4 className="text-base min-[360px]:text-[17px] font-black text-white leading-tight tracking-tight">
                    {card.name}
                  </h4>
                  <p className="text-[10px] min-[360px]:text-[11px] font-black text-white/80 leading-tight mt-0.5">
                    {card.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Carousel */}
      <div className="px-4 mb-8">
        <div 
          ref={carouselRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 gap-4 pb-2"
        >
          {displayBanners.map((banner, index) => (
            <div 
              key={`${banner.id}-${index}`} 
              onClick={() => navigate(banner.path)} 
              className={`group w-[85vw] max-w-[340px] aspect-[21/10] rounded-[28px] bg-gradient-to-r ${banner.bg} p-5 relative overflow-hidden snap-center flex flex-col justify-between cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all duration-400 shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.1)] shrink-0`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between w-[65%]">
                <h3 className="text-[20px] min-[380px]:text-[22px] font-black leading-[1.15] tracking-tight text-[#4A4542] group-hover:-translate-y-1 transition-transform duration-300 ease-out">{banner.title}</h3>
                
                <button className="bg-white/95 backdrop-blur-md group-hover:bg-white group-hover:scale-105 active:scale-95 transition-all duration-300 px-4 py-2.5 rounded-2xl text-[13px] font-black w-max mt-3 text-[#4A4542] shadow-[0_4px_12px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)] flex items-center gap-1.5">
                  {banner.btnText}
                  <svg className="w-4 h-4 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 ease-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 w-full h-full -translate-x-[150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-[200%] transition-transform duration-[1500ms] ease-in-out z-10 pointer-events-none" />

              <div className="absolute right-0 top-0 w-[60%] h-full z-0 opacity-95 pointer-events-none group-hover:scale-110 group-hover:-translate-x-2 transition-all duration-500 ease-out origin-right">
                <img 
                  src={banner.image} 
                  alt={banner.title} 
                  className="w-full h-full object-cover object-right mix-blend-multiply drop-shadow-xl"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)',
                    maskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events Horizontal Carousel */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Upcoming Events</h2>
          <button onClick={() => navigate('/app/services/events')} className="text-sm font-bold text-accent-teal hover:opacity-80">See All</button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 gap-4 pb-2">
          {upcomingEvents.map((event) => (
            <Card key={event.id} onClick={() => navigate(`/app/services/events`)} className="min-w-[180px] max-w-[180px] p-0 overflow-hidden snap-center cursor-pointer hover:shadow-md transition-all border border-border-light bg-white rounded-[20px]">
              
              {/* Image & Date Badge */}
              <div className="relative h-[130px] w-full">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 flex flex-col items-center justify-center shadow-sm min-w-[36px]">
                  <span className="text-sm font-black leading-none text-text-primary">{event.date}</span>
                  <span className="text-[9px] font-bold text-text-secondary mt-0.5">{event.month}</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-3 flex flex-col gap-1">
                <h4 className="text-sm font-bold text-text-primary truncate">{event.title}</h4>
                <p className="text-[11px] font-medium text-text-secondary truncate">{event.location}</p>
                
                {/* Footer: Going & Bookmark */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-text-primary">{event.going} Going</span>
                    <div className="flex -space-x-1.5">
                      {event.avatars.map((avatar, idx) => (
                        <img key={idx} src={avatar} alt="avatar" className="w-[18px] h-[18px] rounded-full border-[1.5px] border-white object-cover" />
                      ))}
                    </div>
                  </div>
                  <button className="text-text-disabled hover:text-text-primary transition-colors">
                    <Bookmark size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </Card>
          ))}
        </div>
      </div>
      
      {/* Special Offers Horizontal Carousel */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Special Offers</h2>
        </div>
        <div 
          ref={specialOffersRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 gap-4 pb-2"
        >
          {displaySpecialOffers.map((offer, index) => (
            <div
              key={`${offer.id}-${index}`}
              onClick={() => navigate(offer.path)}
              className={`w-[85vw] max-w-[340px] aspect-[21/10] rounded-3xl bg-gradient-to-r ${offer.bg} p-5 relative overflow-hidden snap-center flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shrink-0`}
            >
              
              {/* Star Badge */}
              <div className={`absolute top-4 right-4 w-[34px] h-[34px] ${offer.badgeColor} flex items-center justify-center text-white shadow-md z-10`} style={{ clipPath: 'polygon(50% 0%, 61% 10%, 75% 7%, 83% 18%, 97% 20%, 95% 35%, 100% 48%, 95% 61%, 97% 76%, 83% 79%, 75% 91%, 61% 88%, 50% 100%, 39% 88%, 25% 91%, 11% 79%, 3% 76%, 5% 61%, 0% 48%, 5% 35%, 3% 20%, 11% 18%, 25% 7%, 39% 10%)' }}>
                <Percent size={16} strokeWidth={3} />
              </div>

              {/* Text Content */}
              <div className="relative z-10 w-[60%] flex flex-col h-full justify-between pointer-events-none">
                <div>
                  <h3 className={`text-[20px] font-black ${offer.textColor} leading-[1.15] tracking-tight`}>{offer.discount}</h3>
                  <h4 className="text-[15px] font-bold text-gray-900 leading-tight mt-0.5">{offer.title}</h4>
                  <p className="text-[10px] text-gray-600 font-medium leading-snug mt-1.5 opacity-90">{offer.desc}</p>
                </div>
                <button className="bg-white hover:scale-105 transition-all px-4 py-2.5 rounded-xl text-[13px] font-black w-max relative z-10 mt-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)]" style={{ color: offer.textColor.replace('text-[', '').replace(']', '') }}>
                  {offer.btnText}
                </button>
              </div>

              {/* Image with multiply blend */}
              <div className="absolute right-0 top-0 w-[55%] h-full z-0 opacity-90 pointer-events-none">
                <img 
                  src={offer.image} 
                  alt={offer.title} 
                  className="w-full h-full object-cover object-right mix-blend-multiply"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)',
                    maskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Sellers Section */}
      <div className="px-4 mb-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Best Sellers</h2>
          <button onClick={() => navigate('/app/shop')} className="text-sm font-bold text-accent-teal hover:opacity-80">See All</button>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 gap-3.5 pb-4">
          {bestSellers.map((item) => (
            <div 
              key={item.id} 
              className="min-w-[170px] max-w-[170px] bg-white rounded-3xl p-3 flex flex-col snap-center border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow relative cursor-pointer"
              onClick={() => navigate(`/app/shop/product/${item.id}`)}
            >
              {/* Top Row: Badge & Heart Button */}
              <div className="flex justify-between items-center mb-2">
                <span className={`${item.badgeBg} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                  {item.badgeText}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeProduct(item.id);
                  }}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 active:scale-90 transition-transform cursor-pointer"
                >
                  <Heart 
                    size={11} 
                    className={`transition-colors ${likedProducts[item.id] ? 'fill-red-500 text-red-500' : 'text-[#4C8684]'}`} 
                  />
                </button>
              </div>

              {/* Product Image Container with Circle Background */}
              <div className="w-full h-[110px] relative flex items-center justify-center mb-2 rounded-2xl bg-white">
                <div className={`absolute w-[92px] h-[92px] rounded-full ${item.circleBg} z-0 opacity-80`} />
                <img 
                  src={item.image} 
                  alt={item.brand} 
                  className="h-[98px] object-contain relative z-10 transition-all duration-300"
                  style={{
                    transform: item.id !== 1 ? 'scale(1.24, 1.10)' : 'scale(1.05, 1.02)'
                  }}
                />
              </div>
              
              {/* Product Info */}
              <div className="flex flex-col flex-1">
                <h4 className="text-[13px] font-black text-gray-900 leading-tight truncate">{item.brand}</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5 leading-tight truncate">{item.desc}</p>
                
                {/* Rating */}
                <div className="flex items-center gap-0.5 mt-1">
                  <span className="text-[10px] text-[#F87B68] -translate-y-[0.5px]">★</span>
                  <span className="text-[10px] font-black text-gray-800">{item.rating}</span>
                  <span className="text-[8.5px] font-bold text-gray-400">({item.reviews})</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className={`px-1.5 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1 ${tag.bg}`}>
                      {tag.icon === 'paw' && (
                        <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="8.5" r="1.5"/><circle cx="15" cy="8.5" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><path d="M12 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                        </svg>
                      )}
                      {tag.icon === 'dog' && (
                        <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 14c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
                          <path d="M6 10s-1 1-1 2 1 2 1 2M18 10s1 1 1 2-1 2-1 2"/>
                        </svg>
                      )}
                      {tag.text}
                    </span>
                  ))}
                </div>

                {/* Price Row */}
                <div className="flex items-center mt-2.5">
                  <span className="text-[14px] font-black text-gray-900">{item.price}</span>
                  {item.originalPrice && (
                    <span className="text-[10px] text-gray-400 font-bold line-through ml-1">{item.originalPrice}</span>
                  )}
                  {item.discount && (
                    <span className="text-[8.5px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded ml-1">
                      {item.discount}
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    import('../../../../services/shop').then(({ addToCart }) => addToCart(item._product).catch(() => {}));
                  }}
                  className="w-full mt-2.5 py-2.5 bg-[#66B4B1] hover:bg-[#599D9A] text-white rounded-xl font-bold text-[10.5px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-[#66B4B1]/10"
                >
                  <ShoppingCart size={11} strokeWidth={2.5} />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Community Highlights */}
      <div className="px-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Community Highlights</h2>
          <button onClick={() => navigate('/app/community')} className="text-sm font-bold text-accent-teal hover:opacity-80">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-4 snap-x snap-mandatory">
          {communityHighlights.map(post => (
            <div key={post.id} className="min-w-[180px] bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 snap-center">
              <div className="flex items-center gap-2 mb-3">
                <img src={post.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                <div>
                  <h4 className="text-[12px] font-black text-gray-900 leading-tight">{post.author}</h4>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{post.time}</p>
                </div>
              </div>
              <div className="w-full h-[160px] rounded-[16px] overflow-hidden mb-3">
                <img src={post.image} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Heart size={16} className="text-[#F87B68]" />
                  <span className="text-[12px] font-bold">{post.likes}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <MessageCircle size={16} />
                  <span className="text-[12px] font-bold">{post.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Last Drive (Memorial Card) */}
      <div className="px-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">The Last Drive</h2>
        </div>
        <div 
          onClick={() => navigate('/app/services/memorial')}
          className="w-full bg-[#EFF7F7] rounded-[24px] p-5 relative overflow-hidden shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer"
        >
          <div className="relative z-10 w-[58%] min-[360px]:w-[52%]">
            <h3 className="text-[17px] min-[360px]:text-[20px] font-black text-gray-900 leading-tight mb-2">The Last Drive</h3>
            <p className="text-[10.5px] min-[360px]:text-[11px] text-gray-600 font-medium leading-snug mb-4">
              Compassionate pet farewell services handled with love, dignity, and care.
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/services/memorial');
              }}
              className="bg-[#8580E1] hover:bg-[#7972E6] text-white px-4 py-2.5 rounded-[12px] text-[12px] font-bold w-max flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              Talk to Us <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-0 bottom-0 w-[60%] h-full pointer-events-none">
            <img 
              src="/images/the_last_drive.png" 
              className="w-full h-full object-cover object-center mix-blend-multiply" 
              style={{ 
                maskImage: 'linear-gradient(to right, transparent 0%, black 30%)', 
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)' 
              }} 
            />
          </div>
        </div>
      </div>


    </div>
  );
}
