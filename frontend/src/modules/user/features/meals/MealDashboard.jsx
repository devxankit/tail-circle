import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Check, 
  Plus, 
  Minus, 
  Star, 
  Zap,
  Gem,
  ArrowRight,
  ChefHat,
  Shield,
  Leaf,
  Calendar,
  Clock,
  Truck,
  Thermometer,
  Heart,
  Award,
  ShoppingCart,
  ShoppingBag,
  CheckCircle2,
  Bookmark,
  Share2,
  Gift
} from 'lucide-react';
import {
  fetchMeals,
  fetchMealPlans,
  fetchMealAccount,
  fetchMealOrders,
  orderPrepaid,
  orderALaCarte,
  claimFreeTrial,
} from '../../../../services/meals';
import { fetchPublicBanners } from '../../../../services/admin';

const ClocheIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
    <path d="M5 14a7 7 0 0 1 14 0H5z" />
    <path d="M3 17h18" />
  </svg>
);

export function MealDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Menu'); // 'Menu' or 'My Orders'
  const [foodCategory, setFoodCategory] = useState('Dog'); // 'Dog' or 'Cat'
  const [cart, setCart] = useState({}); // { mealId: quantity }
  const [subscription, setSubscription] = useState(null);
  const [localOrders, setLocalOrders] = useState([]);
  const [selectedMealForModal, setSelectedMealForModal] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [selectedCustomisation, setSelectedCustomisation] = useState('c1');

  // Catalog + prepaid account from the API
  const [availableMeals, setAvailableMeals] = useState([]);
  const [mealBalance, setMealBalance] = useState(0);
  const [freeTrialClaimed, setFreeTrialClaimed] = useState(true); // hide banner until account loads
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState({ name: '', phone: '', address: '' });

  const refreshAccount = () => {
    fetchMealAccount()
      .then((account) => {
        setMealBalance(account.balance || 0);
        setFreeTrialClaimed(Boolean(account.freeTrialClaimed));
      })
      .catch(() => {});
  };

  const refreshOrders = () => {
    fetchMealOrders().then(setLocalOrders).catch(() => {});
  };

  useEffect(() => {
    fetchMeals().then(setAvailableMeals).catch(() => setAvailableMeals([]));
    refreshAccount();
    refreshOrders();
  }, []);

  const handleClaimFreeTrial = async () => {
    if (!trialForm.name || !trialForm.phone || !trialForm.address) {
      alert("Please fill out all details.");
      return;
    }
    try {
      await claimFreeTrial(trialForm);
      setFreeTrialClaimed(true);
      setShowFreeTrialModal(false);
      refreshOrders();
      alert("Free Trial Claimed! Your first chef-cooked meal is on the way.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOrderWithPrepaid = async (mealId, qty) => {
    if (mealBalance < qty) {
      alert("Not enough prepaid meals. Please purchase a new plan.");
      return;
    }
    try {
      await orderPrepaid([{ mealId, qty }]);
      refreshAccount();
      refreshOrders();
      setSelectedMealForModal(null);
      setCart({});
      alert("Ordered using Prepaid Balance!");
      setActiveTab('My Orders');
    } catch (err) {
      alert(err.message);
    }
  };
  const dummyCustomisations = [
    { id: 'c1', name: 'Standard Portion', price: 0 },
    { id: 'c2', name: 'Extra Meat (+₹120)', price: 120 },
    { id: 'c3', name: 'Extra Veggies (+₹60)', price: 60 },
    { id: 'c4', name: 'Premium Broth (+₹90)', price: 90 },
  ];
  const defaultPlans = [
    {
      id: 'starter',
      name: 'Starter Plan',
      mealsCount: '10 meals / month',
      pricePerMonth: 2490,
      pricePerMeal: 249,
      mealsPerWeek: 10,
      features: ['Flexible scheduling', 'Skip or pause anytime', 'Chef-cooked daily', 'Human grade ingredients'],
      badge: 'TRIAL FRIENDLY',
      saveText: 'SAVE 10%',
      bgColor: '#FFFFFF',
      borderColor: '#66B4B1',
      textColor: '#063b34',
      buttonBg: '#66B4B1'
    },
    {
      id: 'popular',
      name: 'Popular Plan',
      mealsCount: '20 meals / month',
      pricePerMonth: 4580,
      pricePerMeal: 229,
      mealsPerWeek: 20,
      features: ['Everything in Starter', 'Priority delivery', 'Free health report (monthly)', 'Dietitian support'],
      badge: '★ MOST POPULAR',
      saveText: 'SAVE 15%',
      bgColor: '#FFF5F1',
      borderColor: '#FF8A65',
      textColor: '#FF6D41',
      buttonBg: '#FF8A65'
    },
    {
      id: 'best_value',
      name: 'Best Value Plan',
      mealsCount: '30 meals / month',
      pricePerMonth: 6270,
      pricePerMeal: 209,
      mealsPerWeek: 30,
      features: ['Everything in Popular', 'Dedicated nutritionist', 'Free vet check-ups (2x / year)', 'Exclusive offers & rewards'],
      badge: 'BEST VALUE',
      saveText: 'SAVE 20%',
      bgColor: '#FFFFFF',
      borderColor: '#F87B68',
      textColor: '#F87B68',
      buttonBg: '#F87B68'
    }
  ];

  const [plans, setPlans] = useState(defaultPlans);

  const [bannerConfig, setBannerConfig] = useState({ image: '' });

  useEffect(() => {
    // Plans + orders come from the API (falls back to defaults while loading)
    fetchMealPlans()
      .then((apiPlans) => {
        if (apiPlans.length) setPlans(apiPlans);
      })
      .catch(() => setPlans(defaultPlans));
    refreshOrders();
  }, [activeTab]);

  // Load the admin-managed fresh-food banner from the API.
  useEffect(() => {
    fetchPublicBanners()
      .then((rows) => setBannerConfig({ image: (rows || []).find((b) => b.key === 'fresh_food')?.image || '' }))
      .catch(() => setBannerConfig({ image: '' }));
  }, []);

  const handleSubscribe = (planId) => {
    navigate('/app/meals/subscribe', { state: { planId, category: foodCategory } });
  };

  const updateCartQty = (mealId, delta) => {
    setCart(prev => {
      const current = prev[mealId] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const next = { ...prev };
        delete next[mealId];
        return next;
      }
      return { ...prev, [mealId]: newQty };
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.keys(cart).reduce((sum, mealId) => {
    const meal = availableMeals.find(m => m.id === mealId);
    return sum + (meal ? meal.price * cart[mealId] : 0);
  }, 0);

  const handleCheckoutALaCarte = async () => {
    try {
      const items = Object.keys(cart).map((mealId) => ({ mealId, qty: cart[mealId] }));
      await orderALaCarte(items);
      refreshOrders();
      setCart({});
      alert("À la carte order placed successfully!");
      setActiveTab('My Orders');
    } catch (err) {
      alert(err.message || 'Payment failed');
    }
  };

  // Compile list of active plans & past à la carte orders
  const allOrdersList = [];
  if (subscription) {
    allOrdersList.push({
      id: 'sub_active',
      type: 'Subscription',
      title: `${subscription.plan.name} Pack`,
      status: subscription.status === 'Paused' ? 'Paused' : 'Active',
      details: `${subscription.plan.mealsPerWeek} meals/week • ${subscription.nextDelivery || 'Next delivery tomorrow'}`,
      subtext: Object.keys(subscription.meals).map(mid => {
        const m = availableMeals.find(meal => meal.id === mid);
        return m ? `${subscription.meals[mid]}x ${m.name}` : '';
      }).filter(Boolean).join(', ')
    });
  }
  localOrders.forEach(o => {
    allOrdersList.push({
      id: o.id,
      type: 'À La Carte',
      title: `Fresh Order #${o.id.replace('ord_', '').toUpperCase()}`,
      status: o.status,
      details: `Total: ₹${o.total} • Placed on ${o.date}`,
      subtext: o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
    });
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#FAF7F2] via-[#FAF7F2] to-[#FAF7F2] font-sans relative overflow-hidden select-none">
      
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-200/40 shadow-sm shrink-0">
        <button onClick={() => navigate('/app/home')} className="p-1.5 -ml-1 hover:bg-gray-50 rounded-full transition-colors">
          <ChevronLeft size={22} className="text-gray-800" strokeWidth={2.5} />
        </button>
        <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Fresh Food</h1>
        <div className="relative">
          <button 
            onClick={() => {
              const element = document.getElementById('a-la-carte-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }} 
            className="p-1.5 hover:bg-gray-50 rounded-full transition-colors relative"
          >
            <ShoppingCart size={22} className="text-gray-800" />
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#599D9A] rounded-full flex items-center justify-center text-[9px] text-white font-extrabold shadow-sm">
              {cartItemsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-full p-1.5 flex gap-1 border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('Menu')}
            className={`flex-1 py-3 rounded-full text-xs font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'Menu' 
                ? 'bg-[#599D9A] text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 bg-transparent'
            }`}
          >
            <ClocheIcon className="w-4 h-4" />
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('My Orders')}
            className={`flex-1 py-3 rounded-full text-xs font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'My Orders' 
                ? 'bg-[#599D9A] text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 bg-transparent'
            }`}
          >
            <ShoppingBag size={14} className={activeTab === 'My Orders' ? 'text-white' : 'text-gray-400'} />
            My Orders ({allOrdersList.length})
          </button>
        </div>
      </div>

      {activeTab === 'Menu' ? (
        <>
          {/* Chef-cooked Banner */}
          {bannerConfig.image && (
            <div className="mx-4 mt-5 relative">
              <img 
                src={bannerConfig.image} 
                alt="Fresh Food Banner" 
                className="w-full h-auto block" 
              />
            </div>
          )}

          {/* Subscription Plans Section */}
          <div className="px-4 mt-6">
            <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">Meal Subscription Plans</h2>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Subscribe & save • Delivered fresh every day</p>

            {/* Educational Banner - Slim Premium UI (Hidden if claimed) */}
            {!freeTrialClaimed && (
              <div 
                onClick={() => setShowFreeTrialModal(true)}
                className="mt-3 bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 relative flex items-center p-3 cursor-pointer active:scale-[0.98] transition-transform group"
              >
                {/* Left Icon Area */}
                <div className="w-11 h-11 bg-[#FCEAE5] rounded-[14px] flex items-center justify-center shrink-0 mr-3.5">
                  <Gift size={22} className="text-[#F87B68]" />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[16px] font-black text-gray-900 leading-none tracking-tight">First Meal is on Us!</h3>
                    <span className="bg-[#FCEAE5] text-[#F87B68] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md leading-none">Free Trial</span>
                  </div>
                  <p className="text-[12px] text-gray-500 font-extrabold leading-tight w-[95%]">
                    Get your first chef-cooked meal absolutely free.
                  </p>
                </div>

                {/* Action Arrow */}
                <div className="shrink-0 ml-2 w-8 h-8 bg-[#FAF7F2] rounded-full flex items-center justify-center text-[#F87B68] group-hover:bg-[#F87B68] group-hover:text-white transition-colors">
                  <ChevronRight size={18} strokeWidth={2.5} />
                </div>
              </div>
            )}
          </div>

          {/* Plans Horizontal Scroll Container */}
          <div className="mt-4 flex overflow-x-auto hide-scrollbar gap-6 px-4 pb-6 snap-x snap-mandatory scroll-smooth">
            {plans.map(plan => {
              const isPopular = plan.badge && plan.badge.toLowerCase().includes('popular');
              const isBest = plan.badge && plan.badge.toLowerCase().includes('best');
              return (
                <div 
                  key={plan.id}
                  style={{ backgroundColor: plan.bgColor || '#FFFFFF', borderColor: plan.borderColor || '#E8ECF0' }}
                  className="rounded-[32px] border-2 p-5 sm:p-6 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 w-[82vw] min-[370px]:w-[320px] shrink-0 snap-center min-h-[440px] overflow-hidden mt-1"
                >
                  {/* Floating Badge */}
                  {plan.badge && (
                    <div 
                      style={{ 
                        backgroundColor: (plan.borderColor || '#66B4B1') + '12', 
                        color: plan.textColor || '#66B4B1' 
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider self-start mb-4 border border-transparent shadow-sm"
                    >
                      {plan.id === 'starter' && <Leaf size={11} strokeWidth={2.5} />}
                      {isPopular && <Star size={11} className="fill-current" />}
                      {isBest && <Gem size={11} strokeWidth={2.5} />}
                      <span>{plan.badge}</span>
                    </div>
                  )}

                  {/* Top info Split Section */}
                  <div className="flex justify-between items-start relative min-h-[135px]">
                    <div className="flex-1 pr-[132px] z-10">
                      <h3 
                        style={{ color: plan.textColor || '#063b34' }}
                        className="text-[19px] font-extrabold tracking-tight leading-tight"
                      >
                        {plan.name}
                      </h3>
                      <span className="text-[11px] font-bold text-gray-400 block mt-1">{plan.mealsCount}</span>
                      
                      {plan.saveText && (
                        <span 
                          style={{ backgroundColor: (plan.borderColor || '#66B4B1') + '15', color: plan.textColor || '#66B4B1' }}
                          className="inline-block text-[9.5px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md mt-2.5 shadow-sm"
                        >
                          {plan.saveText}
                        </span>
                      )}

                      <div className="flex items-baseline gap-1 mt-4">
                        <span className="text-2.5xl font-black text-gray-950">₹{Number(plan.pricePerMonth).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-bold text-gray-500">/month</span>
                      </div>
                      <span className="text-[9.5px] font-extrabold text-gray-400 mt-1 block">₹{plan.pricePerMeal} per meal</span>
                    </div>
                    {/* Right Side Food Image Container */}
                    <div className="absolute right-0 top-0 bottom-0 w-[135px] select-none pointer-events-none z-0 rounded-[24px] overflow-hidden">
                      <img 
                        src={
                          plan.id === 'starter' ? '/media/starter_plan_banner.png' :
                          plan.id === 'popular' ? '/media/popular_plan_banner.png' :
                          '/media/value_plan_banner.png'
                        } 
                        alt={plan.name} 
                        className="w-full h-full object-cover object-center relative z-10"
                      />
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="mt-5 space-y-3 pt-5 border-t border-gray-100 flex-1">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-[12px] font-bold leading-tight text-gray-700">
                        <div 
                          style={{ backgroundColor: (plan.borderColor || '#66B4B1') + '18' }}
                          className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0"
                        >
                          <Check size={11} strokeWidth={4.5} style={{ color: plan.textColor || '#66B4B1' }} />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe Button */}
                  <button 
                    onClick={() => handleSubscribe(plan.id)}
                    style={{ backgroundColor: plan.borderColor || '#66B4B1' }}
                    className="w-full mt-6 py-3.5 rounded-2xl text-xs font-black text-white tracking-widest uppercase transition-all duration-300 active:scale-95 hover:brightness-95 flex items-center justify-center gap-2"
                  >
                    <span>Subscribe Now</span>
                    <ArrowRight size={13} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Menu / À La Carte Section */}
          <div id="a-la-carte-section" className="px-4 mt-2 scroll-mt-20">
            {/* Prepaid Balance Status Banner */}
            {mealBalance > 0 && (
              <div className="bg-gradient-to-r from-[#599D9A] to-[#4C8684] rounded-2xl p-4 shadow-lg mb-6 text-white flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-md mb-1.5 inline-block">Prepaid Package</span>
                  <h4 className="text-[15px] font-extrabold leading-tight">You have {mealBalance} meals remaining</h4>
                  <p className="text-[11px] font-medium text-white/80 mt-0.5">Order from the menu below freely.</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 relative z-10 shadow-inner">
                  <span className="text-xl font-black">{mealBalance}</span>
                </div>
                {/* Decorative background shape */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              </div>
            )}

            <div className="text-center mb-3">
              <span className="inline-block text-[9.5px] font-black tracking-widest uppercase text-[#599D9A] bg-[#FAF7F2] px-3.5 py-1.5 rounded-full mb-2">
                Fresh Menu
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Order Daily Meals</h2>
              <p className="text-xs text-gray-500 font-bold max-w-[85%] mx-auto mt-1 leading-relaxed">
                Order fresh, chef-cooked meals individually. Deducts from your prepaid balance.
              </p>
            </div>

            {/* Food Categories Selector Cards */}
            <div className="grid grid-cols-2 gap-4 mt-3">
              {/* Dog Food Card */}
              <div 
                onClick={() => setFoodCategory('Dog')}
                className={`group rounded-[28px] p-4 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-all duration-300 border-2 h-[145px] shadow-sm bg-[#FAF7F2]
                  ${foodCategory === 'Dog' 
                    ? 'border-[#599D9A] shadow-md scale-[1.02]' 
                    : 'border-transparent hover:border-[#599D9A]/50 hover:shadow-md'}
                `}
              >
                {/* Right side Image with left-fading linear mask */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-[60%] h-full pointer-events-none select-none overflow-hidden rounded-r-[26px]"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 50%)',
                    maskImage: 'linear-gradient(to right, transparent 0%, black 50%)'
                  }}
                >
                  <img 
                    src="/assets/onboarding/dog_banner.png" 
                    alt="Dog Food Category" 
                    className="w-full h-full object-cover object-left transition-transform duration-500 group-hover:scale-105" 
                  />
                </div>

                <div className="z-10 flex-1 flex flex-col w-full items-start max-w-[55%] pb-1">
                  <div className="flex-1">
                    <span className="text-[9px] font-black tracking-widest uppercase text-[#599D9A] bg-[#599D9A]/10 px-2 py-0.5 rounded-md">
                      Canine
                    </span>
                    <h3 className="font-extrabold text-[#4C8684] text-[15px] mt-1 flex items-center gap-1">Dog Food</h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5 leading-snug">
                      100% fresh recipes
                    </p>
                  </div>
                  <div className={`mt-auto w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300 ${foodCategory === 'Dog' ? 'bg-[#599D9A] scale-110' : 'bg-gray-300 group-hover:bg-[#599D9A]'}`}>
                    <ChevronLeft size={12} className="rotate-180" strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Cat Food Card */}
              <div 
                onClick={() => setFoodCategory('Cat')}
                className={`group rounded-[28px] p-4 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-all duration-300 border-2 h-[145px] shadow-sm bg-[#FAF7F2]
                  ${foodCategory === 'Cat' 
                    ? 'border-purple-600 shadow-md scale-[1.02]' 
                    : 'border-transparent hover:border-purple-600/50 hover:shadow-md'}
                `}
              >
                {/* Right side Image with left-fading linear mask */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-[60%] h-full pointer-events-none select-none overflow-hidden rounded-r-[26px]"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 50%)',
                    maskImage: 'linear-gradient(to right, transparent 0%, black 50%)'
                  }}
                >
                  <img 
                    src="/assets/onboarding/cat_banner.png" 
                    alt="Cat Food Category" 
                    className="w-full h-full object-cover object-left transition-transform duration-500 group-hover:scale-105" 
                  />
                </div>

                <div className="z-10 flex-1 flex flex-col w-full items-start max-w-[55%] pb-1">
                  <div className="flex-1">
                    <span className="text-[9px] font-black tracking-widest uppercase text-[#F87B68] bg-[#F87B68]/10 px-2 py-0.5 rounded-md">
                      Feline
                    </span>
                    <h3 className="font-extrabold text-purple-950 text-[15px] mt-1 flex items-center gap-1">Cat Food</h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5 leading-snug">
                      Hydration cuts
                    </p>
                  </div>
                  <div className={`mt-auto w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300 ${foodCategory === 'Cat' ? 'bg-[#F87B68] scale-110' : 'bg-gray-300 group-hover:bg-[#F87B68]'}`}>
                    <ChevronLeft size={12} className="rotate-180" strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>

            {/* Zomato Style Fresh Selection Section without dark box */}
            <div className="mt-8 mb-20">
              {/* Header */}
              <div className="flex justify-between items-center py-5 border-b border-gray-100">
                <div>
                  <p className="text-[#5A5552]/70 text-xs font-semibold mb-1">Most ordered together</p>
                  <h3 className="text-lg font-bold text-[#5A5552] tracking-tight flex items-center gap-2">
                    Recommended for you
                  </h3>
                </div>
                <ChevronLeft size={20} className="rotate-90 text-[#5A5552]" />
              </div>

              {/* Food Cards Grid */}
              <div className="flex flex-col gap-4">
                {availableMeals.filter(m => m.category === foodCategory).map((meal, index) => {
                  const cartQty = cart[meal.id] || 0;
                  return (
                    <div 
                      key={meal.id} 
                      onClick={() => { setSelectedMealForModal(meal); setModalQty(cart[meal.id] || 1); setSelectedCustomisation('c1'); }}
                      className="bg-white rounded-3xl p-5 flex justify-between gap-4 relative border border-[#FAF7F2] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      
                      {/* Left side: Meal Info */}
                      <div className="flex-1 flex flex-col pt-1 min-w-0 pr-2">
                        {/* Veg/Non-veg symbol */}
                        <div 
                          className="w-4 h-4 border-2 rounded-sm flex items-center justify-center mb-1.5 shrink-0"
                          style={{ borderColor: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                          ></div>
                        </div>
                        
                        <h4 className="font-bold text-[16px] text-[#5A5552] leading-snug mb-1">{meal.name}</h4>
                        
                        {/* Tags / Best Seller mapping */}
                        {meal.tag && (
                          <div className="flex items-center gap-1.5 mb-2">
                             <div 
                               className="w-10 h-1 rounded-sm"
                               style={{ backgroundColor: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                             ></div>
                             <span className="text-[11px] text-[#5A5552]/70 font-medium">Highly reordered</span>
                          </div>
                        )}
                        
                        <span className="font-semibold text-[15px] text-[#5A5552] mb-1.5">₹{meal.price}</span>
                        
                        <p className="text-[12px] text-[#5A5552]/70 line-clamp-2 leading-relaxed">
                          {meal.description}... <span className="text-[#5A5552] font-medium cursor-pointer hover:underline">more</span>
                        </p>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-3 mt-4">
                          <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full border border-gray-200 bg-transparent flex items-center justify-center text-[#5A5552] hover:bg-gray-50 transition-colors">
                            <Bookmark size={14} />
                          </button>
                          <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full border border-gray-200 bg-transparent flex items-center justify-center text-[#5A5552] hover:bg-gray-50 transition-colors">
                            <Share2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Right side: Meal Image with Floating Add Button */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        <div className="w-[130px] h-[130px] rounded-2xl overflow-hidden relative shadow-sm">
                          <img 
                            src={meal.img} 
                            alt={meal.name} 
                            className="w-full h-full object-cover relative z-10 transition-transform duration-300 hover:scale-105" 
                          />
                        </div>
                        
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 w-[100px]">
                            {cartQty > 0 ? (
                              <div 
                                className="flex justify-between items-center px-2 py-2 rounded-xl shadow-lg border w-full"
                                style={{ 
                                  backgroundColor: meal.category === 'Dog' ? '#66B4B120' : '#F87B6820',
                                  borderColor: meal.category === 'Dog' ? '#66B4B140' : '#F87B6840',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button 
                                  onClick={() => updateCartQty(meal.id, -1)}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                                  style={{ color: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                                >
                                  <Minus size={14} strokeWidth={2.5} />
                                </button>
                                <span className="font-bold text-sm" style={{ color: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}>{cartQty}</span>
                                <button 
                                  onClick={() => updateCartQty(meal.id, 1)}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                                  style={{ color: meal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                                >
                                  <Plus size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartQty(meal.id, 1);
                                }}
                                className="w-full text-[15px] font-black py-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 uppercase tracking-wider border"
                                style={{ 
                                  backgroundColor: meal.category === 'Dog' ? '#66B4B120' : '#F87B6820',
                                  color: meal.category === 'Dog' ? '#66B4B1' : '#F87B68',
                                  borderColor: meal.category === 'Dog' ? '#66B4B140' : '#F87B6840'
                                }}
                              >
                                ADD <Plus size={12} strokeWidth={3} className="opacity-80" />
                              </button>
                            )}
                        </div>
                        <span className="text-[10px] text-[#5A5552]/70 mt-5 font-medium tracking-wide">customisable</span>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Features Banner */}
          <div className="mx-4 mt-8 bg-white border border-gray-100 rounded-[28px] p-4.5 grid grid-cols-2 gap-y-4 gap-x-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#599D9A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                <Clock size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-black text-gray-900 leading-tight">Made Fresh Daily</h4>
                <p className="text-[9.5px] text-gray-500 font-bold leading-tight mt-0.5">No preservatives</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#599D9A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                <Leaf size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-black text-gray-900 leading-tight">Real Ingredients</h4>
                <p className="text-[9.5px] text-gray-500 font-bold leading-tight mt-0.5">Human grade only</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#599D9A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                <Thermometer size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-black text-gray-900 leading-tight">Delivered Hot</h4>
                <p className="text-[9.5px] text-gray-500 font-bold leading-tight mt-0.5">Never frozen</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#599D9A] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                <CheckCircle2 size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11.5px] font-black text-gray-900 leading-tight">Complete Nutrition</h4>
                <p className="text-[9.5px] text-gray-500 font-bold leading-tight mt-0.5">Balanced & wholesome</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* My Orders View */
        <div className="p-4 space-y-4">
          <h2 className="text-[17px] font-black text-gray-900 tracking-tight">Active Subscriptions & Orders</h2>
          
          {allOrdersList.length > 0 ? (
            <div className="space-y-4">
              {allOrdersList.map((order, idx) => (
                <div key={order.id || idx} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${order.type === 'Subscription' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                        {order.type}
                      </span>
                      <h4 className="font-black text-base text-gray-900 mt-1">{order.title}</h4>
                    </div>
                    <span className={`text-xs font-black ${order.status === 'Paused' ? 'text-amber-600' : 'text-[#599D9A]'}`}>{order.status}</span>
                  </div>
                  
                  <p className="text-xs text-gray-600 font-bold mt-2">{order.details}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-1 leading-relaxed">{order.subtext}</p>
                  
                  {order.type === 'Subscription' && (
                    <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                      <button 
                        onClick={() => navigate('/app/meals/track')}
                        className="flex-1 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 font-black text-[11px] rounded-lg transition-colors"
                      >
                        Track
                      </button>
                      <button 
                        onClick={() => navigate('/app/meals/allergies')}
                        className="flex-1 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 font-black text-[11px] rounded-lg transition-colors"
                      >
                        Allergies
                      </button>
                      <button 
                        onClick={() => navigate('/app/meals/pause')}
                        className="flex-1 py-2 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-black text-[11px] rounded-lg transition-colors"
                      >
                        {order.status === 'Paused' ? 'Resume' : 'Pause'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <span className="text-4xl">🍲</span>
              <h3 className="font-black text-gray-900 text-sm mt-3">No Active Subscriptions Yet</h3>
              <p className="text-xs text-gray-500 font-bold mt-1 max-w-[80%] mx-auto leading-relaxed">
                Choose one of our premium chef-cooked subscription plans to get fresh food delivered to your door daily!
              </p>
              <button 
                onClick={() => setActiveTab('Menu')}
                className="mt-5 bg-[#F87B68] text-white text-[11px] font-black px-6 py-2.5 rounded-xl shadow-sm uppercase tracking-wide"
              >
                Browse Menu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item Detail Modal (Zomato Style Bottom Sheet) */}
      {selectedMealForModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedMealForModal(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-[#FAF7F2] w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            {/* Image Header */}
            <div className="relative w-full h-[240px] shrink-0">
              <img 
                src={selectedMealForModal.img} 
                alt={selectedMealForModal.name} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setSelectedMealForModal(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/60 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-[#5A5552] hover:bg-white transition-colors z-10 shadow-sm"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-24">
              {/* Meal Info */}
              <div className="p-5 border-b border-gray-200">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    {/* Veg/Non-veg symbol */}
                    <div 
                      className="w-4 h-4 border-2 rounded-sm flex items-center justify-center mb-2"
                      style={{ borderColor: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                      ></div>
                    </div>
                    
                    <h2 className="text-xl font-bold text-[#5A5552] mb-2">{selectedMealForModal.name}</h2>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-10 h-1 rounded-sm"
                        style={{ backgroundColor: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                      ></div>
                      <span className="text-xs text-[#5A5552]/70 font-medium">Highly reordered</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#5A5552] hover:bg-gray-50 transition-colors shadow-sm">
                      <Bookmark size={16} />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#5A5552] hover:bg-gray-50 transition-colors shadow-sm">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[#5A5552]/80 leading-relaxed mt-2">{selectedMealForModal.description}</p>
              </div>

              {/* Customisation Options */}
              <div className="p-5">
                <h3 className="text-base font-bold text-[#5A5552] mb-1">Customisation</h3>
                <p className="text-xs text-[#5A5552]/70 mb-4">Required • Select any 1 option</p>
                
                <div className="space-y-4">
                  {dummyCustomisations.map((custom) => (
                    <div 
                      key={custom.id} 
                      onClick={() => setSelectedCustomisation(custom.id)}
                      className="flex justify-between items-center cursor-pointer group"
                    >
                      <span className="text-sm font-semibold text-[#5A5552]/90 group-hover:text-[#5A5552] transition-colors">{custom.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#5A5552]">
                          {custom.price > 0 ? `₹${(selectedMealForModal.price + custom.price).toFixed(0)}` : `₹${selectedMealForModal.price}`}
                        </span>
                        <div 
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white"
                          style={{ 
                            borderColor: selectedCustomisation === custom.id ? (selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68') : '#D1D5DB'
                          }}
                        >
                          {selectedCustomisation === custom.id && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                            ></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Bar Fixed */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex items-center gap-4 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
              <div className="flex items-center bg-gray-50 rounded-xl px-2 py-2.5 border border-gray-200 w-[100px] justify-between">
                <button 
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-gray-200/50 rounded-lg transition-colors"
                  style={{ color: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="font-bold text-base text-[#5A5552]">{modalQty}</span>
                <button 
                  onClick={() => setModalQty(modalQty + 1)}
                  className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-gray-200/50 rounded-lg transition-colors"
                  style={{ color: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              
              {mealBalance > 0 ? (
                <button 
                  onClick={() => handleOrderWithPrepaid(selectedMealForModal.id, modalQty)}
                  className="flex-1 py-3.5 rounded-xl font-black text-[14px] text-white shadow-[0_4px_12px_rgba(89,157,154,0.3)] active:scale-[0.98] transition-all bg-[#599D9A] hover:bg-[#4C8684] uppercase tracking-wide"
                >
                  Order (Deduct {modalQty} Meal{modalQty > 1 ? 's' : ''})
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const currentCart = { ...cart };
                    currentCart[selectedMealForModal.id] = modalQty;
                    setCart(currentCart);
                    setSelectedMealForModal(null);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-base text-white shadow-md active:scale-[0.98] transition-all hover:opacity-90"
                  style={{ backgroundColor: selectedMealForModal.category === 'Dog' ? '#66B4B1' : '#F87B68' }}
                >
                  Add item - ₹{((selectedMealForModal.price + (dummyCustomisations.find(c => c.id === selectedCustomisation)?.price || 0)) * modalQty).toFixed(0)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Floating Checkout bar for A-La-Carte */}
      {cartItemsCount > 0 && activeTab === 'Menu' && (
        <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200/60 p-4 z-40 animate-in slide-in-from-bottom duration-300 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center max-w-[600px] mx-auto">
            <div>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">À la carte cart</p>
              <h4 className="text-sm font-black text-gray-900 mt-0.5">{cartItemsCount} item{cartItemsCount > 1 ? 's' : ''} • ₹{cartTotal}</h4>
            </div>
            <button 
              onClick={handleCheckoutALaCarte}
              className="bg-[#599D9A] hover:bg-[#4C8684] text-white font-black text-xs py-3 px-6 rounded-2xl shadow-md active:scale-95 transition-transform flex items-center gap-1.5 uppercase tracking-wide"
            >
              Order Now <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Free Trial Modal */}
      {showFreeTrialModal && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FCEAE5] rounded-full flex items-center justify-center text-[#F87B68]">
                  <Gift size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-gray-900 leading-none">Claim Free Meal</h3>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">Delivery details for your free trial</p>
                </div>
              </div>
              <button onClick={() => setShowFreeTrialModal(false)} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                <Minus size={16} className="rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Your Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={trialForm.name}
                  onChange={e => setTrialForm({...trialForm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold focus:border-[#F87B68] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="9876543210" 
                  value={trialForm.phone}
                  onChange={e => setTrialForm({...trialForm, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold focus:border-[#F87B68] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Delivery Address</label>
                <textarea 
                  placeholder="Full home address..." 
                  rows="2"
                  value={trialForm.address}
                  onChange={e => setTrialForm({...trialForm, address: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold focus:border-[#F87B68] outline-none resize-none"
                ></textarea>
              </div>
            </div>

            <button 
              onClick={handleClaimFreeTrial}
              className="w-full bg-[#BA5E52] text-white font-black text-[15px] py-3.5 rounded-2xl shadow-[0_4px_16px_rgba(186,94,82,0.3)] active:scale-95 transition-all"
            >
              Confirm & Claim Free Meal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
