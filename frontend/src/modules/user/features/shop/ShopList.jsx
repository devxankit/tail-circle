import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Package, Grid2X2, PawPrint, Truck, ShieldCheck, X, Heart, Search, ArrowLeft, Star, Check, Plus, ShoppingBag, Eye, ShieldAlert, Sparkles, Filter, ChevronLeft, FileText, Award, ShieldPlus, ClipboardList } from 'lucide-react';
import {
  fetchProducts,
  fetchCategories,
  fetchBreedsWithShopData,
  addToCart as addToCartApi,
} from '../../../../services/shop';
import { fetchPublicBanners } from '../../../../services/admin';
import { ExpertNutrition } from './ExpertNutrition';
import dogImgClean from '../../../../assets/dogImg-clean.png';

const getBreedSize = (breed) => {
  if (!breed) return 'Medium';
  if (breed.size) return breed.size;
  const name = breed.name.toLowerCase();
  if (name.includes('golden') || name.includes('labrador') || name.includes('german') || name.includes('husky') || name.includes('doberman') || name.includes('rottweiler') || name.includes('coon')) {
    return 'Large';
  }
  if (name.includes('beagle') || name.includes('british') || (name.includes('indie') && breed.species === 'Dog')) {
    return 'Medium';
  }
  return 'Small';
};

const banners = [
  { 
    id: 'b1', 
    img: '/logo/offerImg/banner1.png', 
    brand: 'Bulk Savings',
    brandColor: '#F87B68',
    bgColor: '#FFF5F3',
    title: 'More Love. More Care. More Savings.', 
    subtitle: 'Everything your pet needs, delivered monthly & for less!' 
  },
  { 
    id: 'b2', 
    img: '/logo/offerImg/banner2.png', 
    brand: 'The D-Mart for Pets',
    brandColor: '#66B4B1',
    bgColor: '#F0F9FF',
    title: 'One Month. More Savings. Happy Pets.', 
    subtitle: 'Monthly pet essentials in bulk so you save more every month.' 
  },
  { 
    id: 'b3', 
    img: '/logo/offerImg/banner3.png', 
    brand: 'Monthly Refills',
    brandColor: '#E6B325',
    bgColor: '#FFFBEB',
    title: 'Stock Once. Relax All Month.', 
    subtitle: 'Monthly pet essentials in bulk, so you spend less time shopping & more time bonding.' 
  },
];

const monthlyPacks = [
  {
    id: 'pack_1',
    badge: 'Most Popular',
    themeColor: '#F87B68', // Brand Coral
    themeBg: '#FFFBEB',
    title: 'Monthly Dog Care Pack',
    desc: 'Your complete monthly refill, done in one tap',
    items: ['20kg Dog Food (Ruff Food)', 'Martha Stewart Shampoo Set', 'Training Treats 2x 300g'],
    hiddenItems: ['Dog Collar & Leash Set', 'Poop Bags (2 rolls)'],
    price: '5,499',
    originalPrice: '7,299',
    savings: '1,800',
    delivery: '24-hr delivery • Free shipping',
    img: '/assets/shop_banners/dog_care_pack_1782048549852.png'
  },
  {
    id: 'pack_2',
    badge: 'Best Combo',
    themeColor: '#66B4B1', // Brand Teal
    themeBg: '#F0F9FF',
    title: 'Food + Grooming Combo',
    desc: 'Feed fresh & groom right, every single month',
    items: ['5kg Premium Dog Food', 'DOGX All-Terrain Shampoo 1L', 'Grooming Glove'],
    hiddenItems: ['Tick & Flea Powder', 'Pet Wipes 80pcs'],
    price: '3,999',
    originalPrice: '5,199',
    savings: '1,200',
    delivery: '24-hr delivery',
    img: '/assets/shop_banners/food_combo_pack_1782048560666.png'
  },
  {
    id: 'pack_3',
    badge: 'Max Savings',
    themeColor: '#7C3AED', // Purple
    themeBg: '#F5F3FF',
    title: 'Heavy Saver Pack',
    desc: 'Maximum value for multi-pet households',
    items: ['20kg Dog Food', 'Premium Shampoo Set (4 variants)', 'Duck Toy + Bear Toy'],
    hiddenItems: ['Tick Collar', 'Ceramic Bowl', 'Dental Chews'],
    price: '8,999',
    originalPrice: '11,999',
    savings: '3,000',
    delivery: '24-hr delivery • Priority',
    img: '/assets/shop_banners/heavy_saver_pack_1782048572181.png'
  },
  {
    id: 'pack_4',
    badge: 'For Cat Parents',
    themeColor: '#E11D48', // Rose/Pink
    themeBg: '#FFF1F2',
    title: 'Cat Monthly Essentials',
    desc: 'The full monthly care kit for your cat',
    items: ['Cat Dry Food 2kg', 'Mooncat Waterless Shampoo', 'Cat Bath Shampoo 500ml'],
    hiddenItems: ['Litter Box Deodorizer', 'Cat Nip Toy'],
    price: '3,499',
    originalPrice: '4,399',
    savings: '900',
    delivery: '24-hr delivery',
    img: '/assets/shop_banners/cat_essentials_1782048585973.png'
  }
];

export function ShopList() {
  const navigate = useNavigate();
  const [currentBanner, setCurrentBanner] = useState(0);

  // Catalog from the API (legacy shapes preserved by the shop service)
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All', 'Food', 'Treats', 'Toys', 'Grooming', 'Health', 'Accessories']);
  const [shopBanners, setShopBanners] = useState({});
  const [isBannersLoading, setIsBannersLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
    fetchCategories().then(setCategories).catch(() => {});
    fetchPublicBanners().then((rows) => {
      const byKey = Object.fromEntries((rows || []).map((b) => [b.key, b]));
      setShopBanners(byKey);
    }).catch(() => {}).finally(() => setIsBannersLoading(false));
  }, []);

  // Bottom Sheet State
  const [selectedPack, setSelectedPack] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [showSuccess, setShowSuccess] = useState(false);

  // --- BREED FIRST SHOPPING EXPERIENCE STATE ---
  const [breeds, setBreeds] = useState([]);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'breed' or 'all'
  const [breedStep, setBreedStep] = useState('breed-select'); // default to breed-select to open instantly
  const [selectedPetType, setSelectedPetType] = useState('Dog');
  const [selectedBreed, setSelectedBreed] = useState(null);
  const [breedCategoryFilter, setBreedCategoryFilter] = useState('All');
  const [showBreedDetails, setShowBreedDetails] = useState(false);
  const [showNutritionPlan, setShowNutritionPlan] = useState(false);
  
  // Filters
  const [ageFilter, setAgeFilter] = useState('Adult'); // 'Puppy', 'Adult', 'Senior'
  const [weightFilter, setWeightFilter] = useState('Medium'); // 'Small', 'Medium', 'Large'
  const [healthFilters, setHealthFilters] = useState([]); // Array of health options
  const [guidanceFilter, setGuidanceFilter] = useState('All'); // 'All', 'Must Have', 'Good To Have', 'Optional'
  const [searchQuery, setSearchQuery] = useState('');
  const [allProductsCategory, setAllProductsCategory] = useState('All');

  // Breeds catalog (incl. shop recommendation data) from the API
  useEffect(() => {
    fetchBreedsWithShopData().then(setBreeds).catch(() => setBreeds([]));
  }, []);

  // Update selectedBreed object if breeds changes
  useEffect(() => {
    if (selectedBreed) {
      const updated = breeds.find(b => b.id === selectedBreed.id);
      if (updated) setSelectedBreed(updated);
    }
  }, [breeds, selectedBreed]);

  // Cart actions (server cart via the shop service)
  const handleAddToCart = (product, sizeStr = '') => {
    const packSizeIndex = Math.max(
      0,
      sizeStr ? (product.packSizes || []).findIndex((ps) => ps.size === sizeStr) : 0
    );
    addToCartApi(product, { packSizeIndex, qty: 1 }).catch(() => {});
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // A "bundle" adds each of its component products (real catalog prices).
  const handleAddBundleToCart = (bundleName, productIds) => {
    const bundleProducts = (productIds || [])
      .map((legacyId) => products.find((p) => p.id === legacyId))
      .filter(Boolean);
    Promise.all(bundleProducts.map((p) => addToCartApi(p, { qty: 1 }))).catch(() => {});
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const toggleHealthFilter = (filter) => {
    setHealthFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  // Auto-scroll banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const openCheckout = (pack) => {
    setSelectedPack(pack);
    setCheckoutStep(1);
  };

  const closeCheckout = () => {
    setSelectedPack(null);
    setTimeout(() => {
      setCheckoutStep(1);
      setSelectedPayment('upi');
    }, 300);
  };

  const handleNextStep = () => {
    if (checkoutStep === 1) {
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeCheckout();
      }, 2500);
    }
  };

  return (
    <div className="flex flex-col relative w-full overflow-x-hidden">
      
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-[#FAF7F2] text-[#66B4B1] border border-[#FAF7F2] px-6 py-3 rounded-full shadow-lg font-bold text-[14px] flex items-center gap-2 animate-in fade-in slide-in-from-top-10 whitespace-nowrap">
          <CheckCircle2 size={18} />
          Order Confirmed Successfully!
        </div>
      )}

      {/* Breadcrumbs Removed */}

      {activeTab === 'home' && (
        <div className="flex flex-col flex-1 pb-16 bg-[#FFFBF7]">
          
          {/* 1. Hero Section */}
          {shopBanners.shop_hero?.active !== false && (
          <div className="relative mx-4 mt-4 mb-6 flex flex-row items-center justify-between min-h-[160px]">
            
            {/* Left Content (Text) */}
            <div className="flex-1 z-30 py-4 pr-2 max-w-[60%] relative">
              {/* Floating Faint Paw Prints near text */}
              <div className="absolute left-[-10px] bottom-[-10px] z-0 opacity-40">
                <PawPrint size={18} className="text-[#FDEADD] fill-[#FDEADD] -rotate-12" />
              </div>
              <div className="absolute right-[10%] top-[-10px] z-0 opacity-40">
                <PawPrint size={24} className="text-[#FDEADD] fill-[#FDEADD] rotate-12" />
              </div>
              
              <h1 className="text-[#1A1A1A] text-[30px] sm:text-[34px] font-black leading-[1.05] tracking-[-0.04em] mb-2.5 relative z-30">
                {shopBanners.shop_hero?.title || 'Shop for your pet'}
              </h1>
              <p className="text-[#7A7470] text-[14px] font-medium leading-[1.5] relative z-30 whitespace-pre-line">
                {shopBanners.shop_hero?.subtitle || 'Browse by breed, essentials, \nor expert plans.'}
              </p>
            </div>

            {/* Right Content (Image & Background Shapes) */}
            <div className="relative w-[45%] max-w-[260px] min-w-[160px] h-[160px] flex items-end justify-end shrink-0">
              {/* Peach Circle Shape */}
              <div className="absolute right-[-15%] bottom-[-5%] w-[130%] max-w-[300px] aspect-square rounded-full z-0" style={{ backgroundColor: shopBanners.shop_hero?.bg || '#FDEADD' }}></div>
              
              {/* Floating Icons */}
              <div className="absolute right-[85%] top-4 z-0 opacity-50">
                <PawPrint size={20} className="text-[#F87B68] rotate-12" />
              </div>
              <div className="absolute right-0 top-12 z-0 opacity-50">
                <PawPrint size={14} className="text-[#FDEADD] fill-[#FDEADD] -rotate-12" />
              </div>

              {/* Dog Image */}
              <img 
                src={shopBanners.shop_hero?.image || dogImgClean} 
                alt="Dogs" 
                className="relative z-10 w-[175%] max-w-[175%] h-auto object-contain object-bottom drop-shadow-md translate-y-8 translate-x-[10%]" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300&h=300";
                  e.target.className = "relative z-10 w-[100%] h-auto object-contain object-bottom opacity-50";
                }}
              />
            </div>
          </div>
          )}

          {/* 2. Admin Dynamic Banner: Promotional Banner */}
          {shopBanners.shop_promotional?.active !== false && shopBanners.shop_promotional?.image && (
          <div className="px-4 mb-4 mt-2">
            <div 
              onClick={() => { 
                const link = shopBanners.shop_promotional?.link;
                if (link) {
                  if (link.startsWith('http')) window.open(link, '_blank');
                  else navigate(link);
                }
              }}
              className="w-full rounded-[24px] overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center bg-gray-50 min-h-[120px]"
            >
               <img src={shopBanners.shop_promotional.image} alt="Promotional Banner" className="w-full h-auto object-cover" fetchPriority="high" loading="eager" />
            </div>
          </div>
          )}

          {/* 3. Two Column Cards */}
          <div className="px-4 flex gap-3 mb-6">
            {/* Left Card: Browse Everything */}
            <div 
              onClick={() => setActiveTab('all')}
              className="flex-1 bg-[#F0F7F6] rounded-[20px] p-3 sm:p-4 flex flex-col relative shadow-sm border border-[#E5F0EF] min-h-[150px] cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="w-[36px] h-[36px] bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                <Package size={20} className="text-[#529E99]" strokeWidth={2.5} />
              </div>
              <h3 className="text-[#1A1A1A] font-black text-[15px] leading-tight mb-1">Browse Everything</h3>
              <p className="text-[#5A5552]/80 text-[12px] font-medium leading-snug w-[85%] mb-4">All your pet needs in one place.</p>
              
              {/* Faded Bag Icon */}
              <div className="absolute top-2 right-2 opacity-30 rotate-12">
                <ShoppingBag size={55} className="text-[#529E99]" strokeWidth={1} />
                <PawPrint size={22} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#529E99] opacity-50" fill="currentColor" />
              </div>

              {/* Categories Grid */}
              <div className="flex items-center justify-between mt-auto mb-3 relative z-10">
                <div className="flex flex-col items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#529E99]" width="18" height="18"><path d="M12 8a3 3 0 0 0 3-3V4H9v1a3 3 0 0 0 3 3z"/><path d="M4 14l1.5-6h13L20 14c0 2-2 4-8 4s-8-2-8-4z"/></svg>
                  <span className="text-[9px] sm:text-[10px] font-medium text-[#1A1A1A]">Food</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#529E99]" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M6 5.5a8 8 0 0 1 0 13"/><path d="M18 5.5a8 8 0 0 0 0 13"/></svg>
                  <span className="text-[9px] sm:text-[10px] font-medium text-[#1A1A1A]">Toys</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#529E99]" width="18" height="18"><rect x="8" y="10" width="8" height="12" rx="2"/><path d="M10 4h4v6h-4z"/><path d="M11 2h2v2h-2z"/></svg>
                  <span className="text-[9px] sm:text-[10px] font-medium text-[#1A1A1A]">Groom</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldPlus className="text-[#529E99]" size={18} strokeWidth={2} />
                  <span className="text-[9px] sm:text-[10px] font-medium text-[#1A1A1A]">Health</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Grid2X2 size={18} className="text-[#529E99]" strokeWidth={2} />
                  <span className="text-[9px] sm:text-[10px] font-medium text-[#1A1A1A]">More</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#529E99] font-black text-[12px] relative z-10">
                Explore All Products <ChevronRight size={14} strokeWidth={3} />
              </div>
            </div>

            {/* Right Card: Expert Nutrition */}
            <div 
              onClick={() => setShowNutritionPlan(true)}
              className="flex-1 bg-[#FFF5F2] rounded-[20px] p-3 sm:p-4 flex flex-col relative shadow-sm border border-[#FFEBE5] min-h-[150px] cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="w-[36px] h-[36px] bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                <Award size={20} className="text-[#F87B68]" strokeWidth={2.5} />
              </div>
              <h3 className="text-[#1A1A1A] font-black text-[15px] leading-tight mb-1 relative z-10">Expert Nutrition</h3>
              <p className="text-[#5A5552]/80 text-[12px] font-medium leading-snug mb-3 relative z-10">Personalised diet plans from certified pet nutritionists.</p>
              
              {/* Faded Clipboard */}
              <div className="absolute top-2 right-1 opacity-20 rotate-12">
                <ClipboardList size={65} className="text-[#F87B68]" strokeWidth={1.5} />
              </div>

              {/* Nutritionists & Rating inside white box */}
              <div className="bg-white rounded-2xl p-1.5 px-2 flex items-center mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative z-10 mt-auto">
                <div className="flex -space-x-1.5 shrink-0">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-[22px] h-[22px] rounded-full border border-white relative z-30" />
                  <img src="https://randomuser.me/api/portraits/men/32.jpg" className="w-[22px] h-[22px] rounded-full border border-white relative z-20" />
                  <img src="https://randomuser.me/api/portraits/women/68.jpg" className="w-[22px] h-[22px] rounded-full border border-white relative z-10" />
                </div>
                <div className="flex flex-col items-start pl-1.5 overflow-hidden">
                  <span className="text-[8px] sm:text-[9px] text-[#5A5552] font-semibold leading-tight whitespace-nowrap truncate w-full">Trusted by<br/>pet parents</span>
                  <div className="flex items-center gap-[1px] mt-[1px]">
                    <Star size={8} className="fill-[#F59E0B] text-[#F59E0B]" strokeWidth={1} />
                    <Star size={8} className="fill-[#F59E0B] text-[#F59E0B]" strokeWidth={1} />
                    <Star size={8} className="fill-[#F59E0B] text-[#F59E0B]" strokeWidth={1} />
                    <Star size={8} className="fill-[#F59E0B] text-[#F59E0B]" strokeWidth={1} />
                    <Star size={8} className="fill-[#F59E0B] text-[#F59E0B]" strokeWidth={1} />
                    <span className="text-[#F87B68] text-[9px] font-black ml-0.5">4.9</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between relative z-10 gap-1">
                <button className="bg-[#F87B68] text-white px-3 py-1.5 rounded-full font-bold text-[9px] sm:text-[10px] shadow-sm tracking-wide whitespace-nowrap shrink-0">
                  Book Plan
                </button>
                <span className="text-[#F87B68] text-[9px] sm:text-[10px] font-medium whitespace-nowrap overflow-hidden text-right">Starts at <span className="font-bold">₹299</span></span>
              </div>
            </div>
          </div>

          {/* 4. Trust Badges Row */}
          <div className="px-4 mb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 px-4 py-3 overflow-x-auto hide-scrollbar">
              <div className="flex items-center justify-between gap-5 min-w-max">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={22} className="text-[#649C65]" strokeWidth={2} />
                  <span className="text-[#1A1A1A] text-[11px] font-semibold leading-tight">Vet & Expert<br/>Approved</span>
                </div>
                <div className="w-[1px] h-7 bg-gray-100"></div>
                <div className="flex items-center gap-2.5">
                  <Award size={22} className="text-[#F6A030]" strokeWidth={2} />
                  <span className="text-[#1A1A1A] text-[11px] font-semibold leading-tight">Quality<br/>Assured</span>
                </div>
                <div className="w-[1px] h-7 bg-gray-100"></div>
                <div className="flex items-center gap-2.5">
                  <Truck size={22} className="text-[#529E99]" strokeWidth={2} />
                  <span className="text-[#1A1A1A] text-[11px] font-semibold leading-tight">Fast & Safe<br/>Delivery</span>
                </div>
                <div className="w-[1px] h-7 bg-gray-100"></div>
                <div className="flex items-center gap-2.5">
                  <Heart size={22} className="text-[#F87B68]" strokeWidth={2} />
                  <span className="text-[#1A1A1A] text-[11px] font-semibold leading-tight">Loved by<br/>Pet Parents</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Helper Component for Rating Stars */}
          <div className="hidden">
            {/* To avoid defining a new component outside, I'll just use a small SVG inline above, or standard lucide star */}
          </div>
        </div>
      )}

      {/* Main Content Area for Breed or All Products */}
      {activeTab !== 'home' && (
        <div className="bg-[#FAF7F2] flex-1 z-20 relative pt-1 pb-16">
          {/* Header & Back Button */}
          <div className="px-4 py-3 sticky top-0 bg-[#FAF7F2] z-40 flex items-center justify-between mb-2">
            <button 
              onClick={() => {
                if (activeTab === 'breed' && breedStep === 'breed-profile') {
                  setBreedStep('breed-select');
                } else {
                  setActiveTab('home');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#5A5552] hover:bg-[#5A5552]/5 active:scale-95 transition-all"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <span className="font-extrabold text-[16px] text-[#5A5552] tracking-tight">
              {activeTab === 'breed' ? 'Shop by Breed' : 'All Products'}
            </span>
            <div className="w-10"></div> {/* Spacer to center the title */}
          </div>



        {activeTab === 'breed' ? (
          <>
            {/* Screen 2: Breed Selection Directory (Pet-Select is bypassed) */}
            {(breedStep === 'breed-select' || breedStep === 'pet-select') && (
              <div className="px-4">
                {/* Heading */}
                <h3 className="font-extrabold text-[#5A5552] text-[18px] mb-1">
                  Which {selectedPetType.toLowerCase() === 'dog' ? 'dog' : 'cat'} is shopping today?
                </h3>
                <p className="text-[#5A5552]/70 text-[13px] font-medium mb-5">
                  Pick your breed — we'll show only what's right for them
                </p>

                {/* Pet Selection Tabs (Dogs / Cats) */}
                <div className="flex bg-[#5A5552]/5 p-1 rounded-xl mb-5">
                  <button 
                    onClick={() => setSelectedPetType('Dog')}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedPetType === 'Dog' 
                        ? 'bg-white text-[#5A5552] shadow-sm border border-white/50' 
                        : 'text-[#5A5552]/60 hover:text-[#5A5552]'
                    }`}
                  >
                    🐶 Dogs
                  </button>
                  <button 
                    onClick={() => setSelectedPetType('Cat')}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedPetType === 'Cat' 
                        ? 'bg-white text-[#5A5552] shadow-sm border border-white/50' 
                        : 'text-[#5A5552]/60 hover:text-[#5A5552]'
                    }`}
                  >
                    🐱 Cats
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66B4B1]" />
                  <input 
                    type="text"
                    placeholder={`Search ${selectedPetType.toLowerCase()} breed (e.g. Pug, Indie)...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white shadow-sm border-none rounded-2xl text-[14px] font-medium text-[#5A5552] placeholder:text-[#5A5552]/40 focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/40"
                  />
                </div>

                {/* Breed Grid */}
                <div className="grid grid-cols-2 gap-3 pb-6">
                  {breeds
                    .filter(b => b.species === selectedPetType && b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(b => {
                      const sizeVal = getBreedSize(b);
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedBreed(b);
                            setBreedStep('breed-profile');
                            setSearchQuery('');
                          }}
                          className="bg-white rounded-2xl border border-transparent overflow-hidden shadow-sm flex flex-col h-full text-left active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <div className="h-[120px] w-full bg-slate-50 relative border-b border-gray-100 flex items-center justify-center overflow-hidden">
                            <img 
                              src={b.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=150'} 
                              alt={b.name} 
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.parentNode.querySelector('.img-placeholder');
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="img-placeholder hidden absolute inset-0 flex flex-col items-center justify-center bg-[#FAF7F2] text-[#F87B68]">
                              <PawPrint size={18} />
                              <span className="text-[9px] font-black uppercase mt-1 tracking-wider">{sizeVal}</span>
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-extrabold text-[#5A5552] text-[13px] leading-tight mb-1 line-clamp-1">{b.name}</h4>
                              <p className="text-[11px] text-[#5A5552]/70 font-medium leading-snug line-clamp-2 min-h-[28px] mb-2">{b.personality}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                              <span className="text-[#F87B68] font-bold text-[9px] px-1.5 py-0.5 bg-[#F87B68]/10 rounded-md flex items-center uppercase tracking-wider">
                                {sizeVal}
                              </span>
                              <ChevronRight size={14} className="text-[#F87B68]" strokeWidth={2.5} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  {breeds.filter(b => b.species === selectedPetType && b.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs font-semibold col-span-2">
                      No breeds matching "{searchQuery}" found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Screen 3: Breed Profile & Recommendations */}
            {breedStep === 'breed-profile' && selectedBreed && (
              <div className="flex flex-col relative w-full">
                
                {/* Hero Section */}
                <div className="relative w-full px-4 mb-4">
                  <div className="relative w-full h-[240px] rounded-[24px] overflow-hidden shadow-md bg-slate-800 flex items-center justify-center">
                    <img 
                      src={selectedBreed.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600'} 
                      alt={selectedBreed.name} 
                      className="w-full h-full object-cover object-top filter brightness-[0.75]"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentNode.querySelector('.hero-placeholder');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <div className="hero-placeholder hidden absolute inset-0 bg-gradient-to-br from-[#80C1BF] to-[#66B4B1] opacity-90"></div>
                    
                    {/* Gradient Overlay & Breed Info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5 z-10">
                      <span className="bg-white/10 backdrop-blur-md text-[#F87B68] font-black text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 w-fit mb-2 uppercase tracking-widest border border-white/20">
                        {getBreedSize(selectedBreed)} Breed
                      </span>
                      <h2 className="text-white text-[26px] font-black leading-tight tracking-tight drop-shadow-lg mb-1">
                        {selectedBreed.name}
                      </h2>
                      <p className="text-gray-200 text-[13px] font-medium max-w-[95%] leading-snug drop-shadow-md">
                        {selectedBreed.personality}
                      </p>
                      
                      {/* Trust badges pills at bottom left */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                          <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">✓</span>
                          Curated for your {selectedBreed.species.toLowerCase()}
                        </span>
                        <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                          <Truck size={12} />
                          24-hr delivery
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories Pill Slider directly under Hero */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-0.5 px-4 border-b border-gray-100/60 mb-3">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBreedCategoryFilter(cat)}
                      className={`px-3.5 py-1 rounded-full text-[11px] font-black tracking-tight transition-all shrink-0 cursor-pointer border ${
                        breedCategoryFilter === cat
                          ? 'bg-[#66B4B1] text-white border-[#66B4B1] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Smart Filters Header row */}
                <div className="px-4 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-[13px] text-gray-900">Recommended Products</h4>
                    <span className="text-[9px] text-slate-400 font-bold">({ageFilter} Stage)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Guidance filters selector */}
                    <div className="flex bg-white rounded-md border border-gray-200 p-0.5">
                      {['All', 'Must Have', 'Optional'].map(gl => (
                        <button
                          key={gl}
                          onClick={() => setGuidanceFilter(gl)}
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold transition-all cursor-pointer ${
                            guidanceFilter === gl
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          {gl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Categorized Recommended Products Rows */}
                <div className="space-y-4 pb-4">
                  {[
                    { title: 'Food Picks', sub: 'Recommended food only for this breed', key: 'food', icon: '🍲' },
                    { title: 'Treats & Rewards', sub: 'Breed suitable healthy treats', key: 'treats', icon: '🦴' },
                    { title: 'Toys & Play', sub: 'Based on energy level', key: 'toys', icon: '🥎' },
                    { title: 'Health & Care', sub: 'Breed-specific supplements', key: 'health', icon: '💊' },
                    { title: 'Walk Gear', sub: 'Collars, harnesses and leashes', key: 'accessories', icon: '🐕' },
                    { title: 'Grooming Essentials', sub: 'Shampoo, brushes and coat care', key: 'grooming', icon: '💇' },
                    { title: 'Comfort & Bedding', sub: 'Orthopedic beds and warm mats', key: 'comfort', icon: '🛏️' },
                    { title: 'Travel Essentials', sub: 'Car seats and travel accessories', key: 'travel', icon: '🚗' }
                  ].map(sec => {
                    // Check if section matches active category pill
                    const matchesFilter = breedCategoryFilter === 'All' || 
                      (breedCategoryFilter === 'Food' && sec.key === 'food') ||
                      (breedCategoryFilter === 'Treats' && sec.key === 'treats') ||
                      (breedCategoryFilter === 'Toys' && sec.key === 'toys') ||
                      (breedCategoryFilter === 'Health' && sec.key === 'health') ||
                      (breedCategoryFilter === 'Grooming' && sec.key === 'grooming') ||
                      (breedCategoryFilter === 'Accessories' && (sec.key === 'accessories' || sec.key === 'comfort' || sec.key === 'travel'));
                    
                    if (!matchesFilter) return null;

                    const mappedIds = selectedBreed.recommendations[sec.key] || [];
                    let filteredProducts = products.filter(p => mappedIds.includes(p.id));
                    
                    filteredProducts = filteredProducts.filter(p => {
                      if (p.lifeStage) {
                        return p.lifeStage.toLowerCase() === 'all life stages' || p.lifeStage.toLowerCase() === ageFilter.toLowerCase();
                      }
                      return true;
                    });

                    if (healthFilters.length > 0) {
                      filteredProducts = filteredProducts.filter(p => {
                        if (p.specialDiet) {
                          return healthFilters.some(hf => p.specialDiet.toLowerCase().includes(hf.toLowerCase()));
                        }
                        return p.category !== 'Food' && p.category !== 'Health' && p.category !== 'Treats';
                      });
                    }

                    if (guidanceFilter !== 'All') {
                      filteredProducts = filteredProducts.filter(p => {
                        const level = selectedBreed.guidance?.[p.id] || 'Optional';
                        return level.toLowerCase() === guidanceFilter.toLowerCase();
                      });
                    }

                    if (filteredProducts.length === 0) return null;

                    return (
                      <div key={sec.key} className="px-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-lg">{sec.icon}</span>
                          <div>
                            <h3 className="font-black text-gray-900 text-[13px] leading-tight">{sec.title}</h3>
                            <p className="text-gray-450 text-[9.5px] font-semibold">{sec.sub}</p>
                          </div>
                        </div>

                        {/* Horizontal Scroll Product List */}
                        <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 gap-3 pb-3 pt-0.5">
                          {filteredProducts.map(prod => {
                            const guidanceLevel = selectedBreed.guidance?.[prod.id] || 'Optional';
                            return (
                              <div 
                                key={prod.id} 
                                className="w-[165px] min-w-[165px] bg-white rounded-[16px] border border-transparent overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between relative shrink-0 p-2.5"
                              >
                                {/* Discount badge top-left */}
                                {prod.discountRange > 0 && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <span className="bg-[#FAF7F2] text-[#F87B68] font-extrabold text-[9px] px-1.5 py-0.5 rounded-[4px]">
                                      {prod.discountRange}% OFF
                                    </span>
                                  </div>
                                )}

                                {/* Guidance label top-right */}
                                <div className="absolute top-2 right-2 z-10">
                                  <span className={`px-1.5 py-0.5 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider text-white ${
                                    guidanceLevel === 'Must Have' ? 'bg-red-500' : guidanceLevel === 'Good To Have' ? 'bg-amber-500' : 'bg-slate-500'
                                  }`}>
                                    {guidanceLevel}
                                  </span>
                                </div>

                                {/* Image Container */}
                                <div className="h-[110px] bg-slate-50 relative border-b border-gray-100 flex items-center justify-center overflow-hidden rounded-[10px]">
                                  <img 
                                    src={prod.img || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=150'} 
                                    alt={prod.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentNode.querySelector('.img-placeholder');
                                      if (fallback) fallback.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="img-placeholder hidden absolute inset-0 flex flex-col items-center justify-center bg-[#FAF7F2] text-[#66B4B1]">
                                    <PawPrint size={22} />
                                    <span className="text-[9px] font-black uppercase mt-1.5 tracking-wider text-center px-1 line-clamp-1">{prod.brand || 'Tail'}</span>
                                  </div>
                                </div>

                                {/* Product details */}
                                <div className="flex-1 flex flex-col justify-between pt-2.5">
                                  <div>
                                    <p className="text-[9px] text-gray-400 font-extrabold uppercase leading-none mb-1">{prod.brand}</p>
                                    <h4 className="font-bold text-gray-900 text-[12.5px] leading-tight mt-0.5 line-clamp-2 min-h-[34px]">{prod.name}</h4>
                                    
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <Star size={10} className="fill-amber-400 text-amber-400" />
                                      <span className="text-[10.5px] font-black text-gray-700">{prod.rating}</span>
                                      <span className="text-[9.5px] text-gray-450 font-bold">({prod.reviewsData?.total || 10})</span>
                                    </div>
                                  </div>

                                  <div className="flex items-baseline gap-1.5 mt-2">
                                    <span className="font-black text-[15px] text-gray-900">₹{prod.price}</span>
                                    {prod.mrp && prod.mrp > prod.price && (
                                      <span className="text-[11px] text-gray-400 line-through">₹{prod.mrp}</span>
                                    )}
                                  </div>

                                  <button 
                                    onClick={() => handleAddToCart(prod)}
                                    className="w-full bg-[#F87B68] hover:bg-[#F87B68] text-white py-1.5 rounded-[10px] text-[11px] font-bold transition-all mt-2.5 flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                                  >
                                    + Add to Cart
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly Bundle Section */}
                {(breedCategoryFilter === 'All') && selectedBreed.monthlyBundle && selectedBreed.monthlyBundle.productIds && selectedBreed.monthlyBundle.productIds.length > 0 && (
                  <div className="px-4 mt-3 mb-5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-lg">💰</span>
                      <div>
                        <h3 className="font-black text-gray-900 text-[13px] leading-tight">Monthly Essentials Bundle</h3>
                        <p className="text-gray-450 text-[9.5px] font-semibold">Everything they need for the month, bundled at a discount</p>
                      </div>
                    </div>
                    
                    {/* Bundle Card */}
                    <div className="bg-gradient-to-br from-[#80C1BF]/5 to-[#80C1BF]/20 border border-[#66B4B1]/25 rounded-[16px] p-3.5 shadow-sm">
                      <span className="bg-[#66B4B1] text-white px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-wider">
                        SMART MONTHLY BUNDLE
                      </span>
                      <h3 className="font-black text-gray-900 text-[14px] mt-2 leading-tight">
                        {selectedBreed.monthlyBundle.name || `${selectedBreed.name} Monthly Box`}
                      </h3>
                      <p className="text-gray-500 text-[10px] font-semibold mt-0.5">
                        Essential monthly supplies tailored for {selectedBreed.name}s.
                      </p>

                      <div className="mt-3 space-y-1.5 pb-3 border-b border-dashed border-[#66B4B1]/35">
                        {products
                          .filter(p => selectedBreed.monthlyBundle.productIds.includes(p.id))
                          .map(p => (
                            <div key={p.id} className="flex items-center justify-between text-[11px] text-gray-700">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-[#66B4B1] shrink-0" strokeWidth={2.5} />
                                <span className="font-semibold line-clamp-1">{p.name}</span>
                              </div>
                              <span className="font-bold text-gray-505">₹{p.price}</span>
                            </div>
                          ))}
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <div className="flex flex-col">
                          <span className="text-[9.5px] text-gray-400 font-semibold line-through">
                            Buy Separately: ₹{selectedBreed.monthlyBundle.originalPrice || selectedBreed.monthlyBundle.productIds.reduce((sum, pid) => sum + (products.find(pr => pr.id === pid)?.price || 0), 0)}
                          </span>
                          <span className="text-[15.5px] font-black text-gray-900 tracking-tight mt-0.5">
                            ₹{selectedBreed.monthlyBundle.bundlePrice}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleAddBundleToCart(selectedBreed.monthlyBundle.name || `${selectedBreed.name} Box`, selectedBreed.monthlyBundle.productIds, selectedBreed.monthlyBundle.bundlePrice)}
                          className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white font-black text-[10.5px] px-3 py-1.5 rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          Add Bundle
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Info Drawer Accordion */}
                <div className="px-4 mb-6 border-t border-gray-100/60 pt-4 mt-3">
                  <button 
                    onClick={() => setShowBreedDetails(!showBreedDetails)}
                    className="w-full bg-white border border-transparent rounded-xl p-3 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={18} className="text-[#66B4B1]" />
                      <div className="text-left">
                        <h4 className="font-extrabold text-gray-900 text-[12.5px]">Breed Details & Smart Box</h4>
                        <p className="text-gray-400 text-[9.5px] font-semibold">About, lifespan & custom bundle</p>
                      </div>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`text-gray-400 transition-transform duration-300 ${showBreedDetails ? 'rotate-90' : ''}`} 
                    />
                  </button>

                  {showBreedDetails && (
                    <div className="mt-3 space-y-3.5 animate-in fade-in slide-in-from-top-4 duration-300">
                      {/* About info */}
                      <div className="bg-white p-3 rounded-xl border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                        <h4 className="font-extrabold text-[12px] text-gray-900 mb-1">About this breed</h4>
                        <p className="text-gray-500 text-[10.5px] font-medium leading-relaxed">{selectedBreed.description}</p>
                      </div>

                      {/* Needs summary */}
                      <div className="bg-white p-3 rounded-xl border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                        <h4 className="font-extrabold text-[12px] text-gray-900 mb-2">Breed Summary & Needs</h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[8px] text-gray-450 font-extrabold uppercase">Weight Range</p>
                            <p className="text-[10.5px] font-bold text-gray-750 mt-0.5">{selectedBreed.summary.weightRange}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[8px] text-gray-455 font-extrabold uppercase">Energy Level</p>
                            <p className="text-[10.5px] font-bold text-gray-750 mt-0.5">{selectedBreed.summary.energyLevel}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[8px] text-gray-455 font-extrabold uppercase">Life Span</p>
                            <p className="text-[10.5px] font-bold text-gray-750 mt-0.5">{selectedBreed.summary.lifeSpan}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[8px] text-gray-460 font-extrabold uppercase">Est. Monthly Cost</p>
                            <p className="text-[10.5px] font-black text-[#66B4B1] mt-0.5">₹{selectedBreed.summary.monthlyCost.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                            <p className="text-[8px] text-gray-460 font-extrabold uppercase">Food Requirement</p>
                            <p className="text-[10px] font-medium text-gray-600 mt-0.5 leading-snug">{selectedBreed.summary.foodRequirement}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                            <p className="text-[8px] text-gray-460 font-extrabold uppercase">Grooming & Exercise</p>
                            <p className="text-[10px] font-medium text-gray-600 mt-0.5 leading-snug">💇 {selectedBreed.summary.groomingRequirement}</p>
                            <p className="text-[10px] font-medium text-gray-600 mt-1 leading-snug">🏃 {selectedBreed.summary.exerciseRequirement}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bundle Section */}
                      {selectedBreed.monthlyBundle && selectedBreed.monthlyBundle.productIds && selectedBreed.monthlyBundle.productIds.length > 0 && (
                        <div className="bg-gradient-to-br from-[#80C1BF]/5 to-[#80C1BF]/20 border border-[#66B4B1]/25 rounded-[16px] p-3.5 shadow-sm">
                          <span className="bg-[#66B4B1] text-white px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-wider">
                            SMART MONTHLY BUNDLE
                          </span>
                          <h3 className="font-black text-gray-900 text-[14px] mt-2 leading-tight">
                            {selectedBreed.monthlyBundle.name || `${selectedBreed.name} Monthly Box`}
                          </h3>
                          <p className="text-gray-500 text-[10px] font-semibold mt-0.5">
                            Essential monthly supplies tailored for {selectedBreed.name}s.
                          </p>

                          <div className="mt-3 space-y-1.5 pb-3 border-b border-dashed border-[#66B4B1]/35">
                            {products
                              .filter(p => selectedBreed.monthlyBundle.productIds.includes(p.id))
                              .map(p => (
                                <div key={p.id} className="flex items-center justify-between text-[11px] text-gray-700">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-[#66B4B1] shrink-0" strokeWidth={2.5} />
                                    <span className="font-semibold line-clamp-1">{p.name}</span>
                                  </div>
                                  <span className="font-bold text-gray-505">₹{p.price}</span>
                                </div>
                              ))}
                          </div>

                          <div className="flex justify-between items-center mt-3">
                            <div className="flex flex-col">
                              <span className="text-[9.5px] text-gray-400 font-semibold line-through">
                                Buy Separately: ₹{selectedBreed.monthlyBundle.originalPrice || selectedBreed.monthlyBundle.productIds.reduce((sum, pid) => sum + (products.find(pr => pr.id === pid)?.price || 0), 0)}
                              </span>
                              <span className="text-[15.5px] font-black text-gray-900 tracking-tight mt-0.5">
                                ₹{selectedBreed.monthlyBundle.bundlePrice}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleAddBundleToCart(selectedBreed.monthlyBundle.name || `${selectedBreed.name} Box`, selectedBreed.monthlyBundle.productIds, selectedBreed.monthlyBundle.bundlePrice)}
                              className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white font-black text-[10.5px] px-3 py-1.5 rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                              Add Bundle
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        ) : (
          /* All Products Catalog */
          <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300 pt-2">
            <h3 className="font-extrabold text-[#5A5552] text-[18px] mb-1">All Products</h3>
            <p className="text-[#5A5552]/70 text-[13px] font-medium mb-5">Browse our complete catalog of essentials</p>

            <div className="relative mb-6">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66B4B1]" />
              <input 
                type="text"
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white shadow-sm border-none rounded-2xl text-[14px] font-medium text-[#5A5552] placeholder:text-[#5A5552]/40 focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/40"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-3.5 -mx-1 px-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setAllProductsCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all shrink-0 cursor-pointer ${
                    allProductsCategory === cat
                      ? 'bg-[#66B4B1] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pb-10 pt-1">
              {products
                .filter(p => {
                  const matchesCategory = allProductsCategory === 'All' || p.category.toLowerCase() === allProductsCategory.toLowerCase();
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .map(prod => (
                  <div 
                    key={prod.id} 
                    className="bg-white rounded-2xl border border-transparent overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col h-full relative"
                  >
                    {prod.discountRange > 0 && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-[#FAF7F2] text-[#F87B68] font-extrabold text-[10px] px-2 py-1 rounded-[6px]">
                          {prod.discountRange}% OFF
                        </span>
                      </div>
                    )}

                    <div className="h-[130px] bg-slate-50 relative border-b border-gray-100 flex items-center justify-center overflow-hidden">
                      <img 
                        src={prod.img || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=150'} 
                        alt={prod.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentNode.querySelector('.img-placeholder');
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="img-placeholder hidden absolute inset-0 flex flex-col items-center justify-center bg-[#FAF7F2] text-[#66B4B1]">
                        <PawPrint size={24} />
                        <span className="text-[10px] font-black uppercase mt-1.5 tracking-wider text-center px-1 line-clamp-1">{prod.brand || 'Tail'}</span>
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none mb-1.5">{prod.brand}</p>
                        <h4 className="font-bold text-gray-900 text-[13px] leading-tight mt-0.5 line-clamp-2 min-h-[34px]">{prod.name}</h4>
                        
                        <div className="flex items-center gap-1 mt-2">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-[11px] font-black text-gray-700">{prod.rating}</span>
                          <span className="text-[10px] text-gray-400 font-bold">({prod.reviewsData?.total || 10})</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between">
                        <span className="font-black text-[15.5px] text-gray-900">₹{prod.price}</span>
                        <button 
                          onClick={() => handleAddToCart(prod)}
                          className="bg-[#66B4B1] hover:bg-[#66B4B1] text-white p-2 rounded-lg active:scale-90 transition-transform cursor-pointer shadow-sm"
                        >
                          <Plus size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
      )}

      {/* 1-Step Checkout Bottom Sheet */}
      {selectedPack && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[100] animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={closeCheckout}
          ></div>

          <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F2] rounded-t-[32px] z-[101] animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col">
            
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="px-5 pt-2 pb-6 overflow-y-auto hide-scrollbar max-h-[85vh]">
              
              <div className="flex justify-between items-start mb-5">
                <h2 className="text-2xl font-black text-gray-900">
                  {checkoutStep === 1 ? 'Pack Details' : 'Confirm Order'}
                </h2>
                <button onClick={closeCheckout} className="p-2 bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              {checkoutStep === 1 ? (
                <>
                  <div className="bg-white border border-gray-100 rounded-[20px] p-4 mb-4 shadow-sm flex items-center gap-4">
                    <img src={selectedPack.img} alt={selectedPack.title} className="w-20 h-20 object-cover rounded-[12px]" />
                    <div className="flex-1">
                      <span className="bg-[#66B4B1] text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-block">
                        {selectedPack.badge}
                      </span>
                      <h3 className="font-black text-gray-900 text-[16px] leading-tight mb-1">{selectedPack.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-gray-900">₹{selectedPack.price}</span>
                        <span className="text-[12px] text-gray-400 line-through">₹{selectedPack.originalPrice}</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-900 text-[16px] mb-3 mt-6">What's inside?</h4>
                  <div className="space-y-3 mb-6 bg-white border border-gray-100 p-4 rounded-[20px] shadow-sm">
                    {[...selectedPack.items, ...(selectedPack.hiddenItems || [])].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={12} className="text-green-600" strokeWidth={3} />
                        </div>
                        <span className="text-[14px] font-medium text-gray-800 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white border border-gray-100 rounded-[20px] p-4 mb-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                      <Package size={24} className="text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-[14px] leading-tight mb-1">{selectedPack.title}</h3>
                      <span className="text-[16px] font-black text-gray-900">₹{selectedPack.price}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[20px] p-4 mb-5 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-900 text-[14px]">Delivery Address</h4>
                      <button className="text-[#F87B68] text-[12px] font-bold">Change</button>
                    </div>
                    <div className="flex items-start gap-3 text-gray-600 text-[13px] font-medium leading-relaxed">
                      <Truck size={18} className="text-[#66B4B1] mt-0.5 shrink-0" />
                      <p>A-402, Sunset Heights, Lokhandwala Complex, Andheri West, Mumbai 400053</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-900 text-[16px] mb-3">Payment Method</h4>
                  <div className="space-y-3 mb-5">
                    <label className={`flex items-center gap-3 p-4 rounded-[16px] border ${selectedPayment === 'upi' ? 'border-[#66B4B1] bg-[#FAF7F2]' : 'border-gray-100 bg-white'} transition-colors cursor-pointer`}>
                      <input type="radio" name="payment" checked={selectedPayment === 'upi'} onChange={() => setSelectedPayment('upi')} className="w-5 h-5 accent-[#80C1BF]" />
                      <div className="flex-1 font-bold text-gray-900 text-[14px]">UPI (GPay, PhonePe, Paytm)</div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-[16px] border ${selectedPayment === 'card' ? 'border-[#66B4B1] bg-[#FAF7F2]' : 'border-gray-100 bg-white'} transition-colors cursor-pointer`}>
                      <input type="radio" name="payment" checked={selectedPayment === 'card'} onChange={() => setSelectedPayment('card')} className="w-5 h-5 accent-[#80C1BF]" />
                      <div className="flex-1 font-bold text-gray-900 text-[14px]">Credit / Debit Card</div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-[16px] border ${selectedPayment === 'cod' ? 'border-[#66B4B1] bg-[#FAF7F2]' : 'border-gray-100 bg-white'} transition-colors cursor-pointer`}>
                      <input type="radio" name="payment" checked={selectedPayment === 'cod'} onChange={() => setSelectedPayment('cod')} className="w-5 h-5 accent-[#80C1BF]" />
                      <div className="flex-1 font-bold text-gray-900 text-[14px]">Cash on Delivery</div>
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 text-[#66B4B1] text-[12px] font-bold justify-center mb-4 mt-2">
                <ShieldCheck size={16} /> 100% Secure Payment • Satisfaction Guarantee
              </div>

            </div>

            {/* Sticky Action Button */}
            <div className="p-4 bg-white border-t border-gray-100 pb-8">
              <button 
                onClick={handleNextStep}
                className="w-full h-[56px] bg-[#66B4B1] text-white rounded-full font-black text-[16px] shadow-[0_4px_14px_rgba(27,170,96,0.3)] flex items-center justify-center gap-2 hover:bg-[#599D9A] active:scale-95 transition-all"
              >
                {checkoutStep === 1 ? 'Confirm Order' : 'Pay & Book'} • ₹{selectedPack.price}
              </button>
            </div>

          </div>
        </>
      )}

      {showNutritionPlan && (
        <ExpertNutrition onClose={() => setShowNutritionPlan(false)} />
      )}

    </div>
  );
}
