import React, { useEffect, useState } from 'react';
import { ChevronLeft, Share, Calendar, ShoppingBag, CheckCircle2, PawPrint as Dog } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchMealPlans, fetchMeals } from '../../../../../services/meals';

const planStyles = {
  starter: { 
    bg: 'from-[#66B4B1] to-[#66B4B1]', 
    label: 'BEST TO START',
    btn: 'bg-[#599D9A] hover:bg-[#4C8684]',
    meals: 10,
    kg: '1.2 kg',
    dogSize: 'small to medium'
  },
  popular: { 
    bg: 'from-[#F87B68] to-[#F3AB9D]', 
    label: 'MOST POPULAR',
    btn: 'bg-[#F87B68] hover:bg-[#F87B68]',
    meals: 20,
    kg: '2.5 kg',
    dogSize: 'medium to large'
  },
  best_value: { 
    bg: 'from-[#66B4B1] to-[#599D9A]', 
    label: 'BEST VALUE',
    btn: 'bg-[#599D9A] hover:bg-[#4C8684]',
    meals: 30,
    kg: '4.0 kg',
    dogSize: 'all sizes'
  }
};

export function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [plans, setPlans] = useState([]);
  const [availableMeals, setAvailableMeals] = useState([]);

  useEffect(() => {
    fetchMealPlans().then(setPlans).catch(() => setPlans([]));
    fetchMeals().then(setAvailableMeals).catch(() => setAvailableMeals([]));
    window.scrollTo(0, 0);
  }, []);

  const plan = plans.find(p => p.id === id) || plans[0];
  const style = planStyles[plan?.id] || planStyles.starter;

  if (!plan) {
    return <div className="flex items-center justify-center h-full bg-white text-sm font-bold text-gray-500">Loading plan…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white relative animate-in slide-in-from-right duration-300">
      
      {/* Top Hero Section */}
      <div className="relative w-full h-[320px] shrink-0">
        <img 
          src="/media/hero_frenchie.png" 
          alt="Happy Dog" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay for text readability based on plan color */}
        <div className={`absolute inset-0 bg-gradient-to-r ${style.bg} opacity-90 mix-blend-multiply`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Header Actions */}
        <div className="absolute top-0 left-0 w-full px-4 pt-4 pb-2 flex items-center justify-between z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/90 hover:text-white transition-colors">
            <ChevronLeft size={28} />
          </button>
          <button className="p-2 -mr-2 text-white/90 hover:text-white transition-colors">
            <Share size={22} />
          </button>
        </div>

        {/* Hero Content */}
        <div className="absolute top-[80px] left-6 z-10 max-w-[65%]">
          <span className="inline-block bg-white text-[#66B4B1] text-[10px] font-black px-2.5 py-1 rounded w-fit mb-3 uppercase tracking-wide shadow-sm">
            {style.label}
          </span>
          <h1 className="text-[32px] font-black text-white leading-tight mb-2 tracking-tight">
            {plan.name}
          </h1>
          <p className="text-white/90 text-[13px] font-medium leading-relaxed mb-4 pr-4">
            {plan.description}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">₹{plan.pricePerMonth}</span>
            <span className="text-sm font-medium text-white/80">/ month</span>
          </div>
        </div>
      </div>

      {/* Main Content Body (Overlapping) */}
      <div className="flex-1 overflow-y-auto pb-[100px] bg-white -mt-6 rounded-t-[24px] z-20 relative px-4 pt-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        
        {/* Three Stats Row */}
        <div className="flex items-center justify-between bg-white border border-border-light rounded-[20px] p-4 mb-8 shadow-sm">
          <div className="flex flex-col items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal mb-2">
              <Calendar size={20} />
            </div>
            <span className="text-[11px] font-bold text-[#5A5552] text-center leading-tight">
              {style.meals} Meals<br/><span className="text-text-secondary font-medium">per month</span>
            </span>
          </div>
          <div className="w-px h-10 bg-border-light"></div>
          <div className="flex flex-col items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal mb-2">
              <ShoppingBag size={20} />
            </div>
            <span className="text-[11px] font-bold text-[#5A5552] text-center leading-tight">
              {style.kg}<br/><span className="text-text-secondary font-medium">per month</span>
            </span>
          </div>
          <div className="w-px h-10 bg-border-light"></div>
          <div className="flex flex-col items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal mb-2">
              <Dog size={20} />
            </div>
            <span className="text-[11px] font-bold text-[#5A5552] text-center leading-tight">
              Great for<br/><span className="text-text-secondary font-medium">{style.dogSize} dogs</span>
            </span>
          </div>
        </div>

        {/* What's Included */}
        <div className="mb-8">
          <h2 className="text-[17px] font-black text-[#5A5552] mb-4">What's Included</h2>
          <ul className="space-y-3">
            {[
              'Fresh & human-grade ingredients',
              'Vet formulated for balanced nutrition',
              'No fillers, no preservatives',
              'Perfect for all life stages'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-accent-teal mt-0.5 shrink-0" strokeWidth={2.5} />
                <span className="text-[13px] text-text-secondary font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full h-px bg-border-light mb-6"></div>

        {/* Sample Meals */}
        <div className="mb-8 -mx-4">
          <div className="px-4 flex justify-between items-end mb-4">
            <h2 className="text-[17px] font-black text-[#5A5552]">Sample Meals</h2>
            <button className="text-[13px] font-bold text-accent-teal">View All</button>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar px-4 gap-4 pb-2">
            {availableMeals.slice(0, 3).map((meal, index) => (
              <div key={index} className="min-w-[140px] bg-[#FAF7F2] rounded-[20px] p-3 shadow-sm border border-border-light">
                <div className="w-full aspect-square bg-white rounded-full p-2 mb-3 shadow-sm">
                  <img src={meal.img} alt={meal.name} className="w-full h-full object-contain scale-110 drop-shadow-sm" />
                </div>
                <h3 className="text-[13px] font-bold text-[#5A5552] leading-tight mb-1">{meal.name}</h3>
                <span className="text-[11px] font-medium text-text-secondary">200g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Easy & Flexible Banner */}
        <div className="bg-[#FAF7F2] rounded-[16px] p-4 flex items-center gap-3 border border-[#FAF7F2] mb-4">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-accent-teal shrink-0 shadow-sm border border-[#FAF7F2]">
            <Calendar size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-[13px] font-black text-[#5A5552]">Easy & Flexible</h4>
            <p className="text-[11px] text-[#66B4B1] font-medium">Pause, skip or cancel your plan anytime.</p>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-border-light p-4 z-50">
        <button 
          onClick={() => navigate('/app/meals/subscribe', { state: { planId: plan.id } })}
          className={`w-full ${style.btn} text-white rounded-2xl py-3.5 transition-colors shadow-sm active:scale-[0.98] flex flex-col items-center justify-center`}
        >
          <span className="font-bold text-[16px]">Get Started</span>
          <span className="text-[11px] font-medium opacity-90">₹{plan.pricePerMonth} / month</span>
        </button>
      </div>

    </div>
  );
}
