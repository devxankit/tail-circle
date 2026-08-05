import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, ShieldCheck, Check, Gift, Minus } from 'lucide-react';
import {
  fetchMealPlans,
  fetchMeals,
  fetchMealAccount,
  purchasePackage,
  claimFreeTrial,
} from '../../../../services/meals';

export function MealSubscribeFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlanId] = useState(location.state?.planId || 'starter');
  const [step, setStep] = useState('overview'); // 'overview' or 'checkout'
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState({ name: '', phone: '', address: '' });
  const [isPaying, setIsPaying] = useState(false);

  const [plans, setPlans] = useState([]);
  const [availableMeals, setAvailableMeals] = useState([]);
  const [freeTrialClaimed, setFreeTrialClaimed] = useState(true);

  useEffect(() => {
    fetchMealPlans().then(setPlans).catch(() => {});
    fetchMeals().then(setAvailableMeals).catch(() => {});
    fetchMealAccount()
      .then((account) => setFreeTrialClaimed(Boolean(account.freeTrialClaimed)))
      .catch(() => {});
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const handleClaimFreeTrial = async () => {
    if (!trialForm.name || !trialForm.phone || !trialForm.address) {
      alert("Please fill out all details.");
      return;
    }
    try {
      await claimFreeTrial(trialForm);
      setFreeTrialClaimed(true);
      setShowFreeTrialModal(false);
      alert("Free Trial Claimed! Your first chef-cooked meal is on the way.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || isPaying) return;
    setIsPaying(true);
    try {
      await purchasePackage(selectedPlan.id, selectedPlan.name);
      alert(`Payment Successful! ${selectedPlan.mealsPerWeek} meals added to your prepaid balance.`);
      navigate('/app/meals');
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (!selectedPlan) {
    return <div className="flex items-center justify-center h-full bg-[#FAF7F2] text-sm font-bold text-gray-500">Loading plan…</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] animate-in fade-in duration-300 overflow-hidden relative font-sans">
      
      {/* Header */}
      <div className="bg-[#FAF7F2] sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-250/20 shadow-sm">
        <button 
          onClick={() => {
            if (step === 'checkout') setStep('overview');
            else navigate('/app/meals');
          }} 
          className="p-1.5 -ml-1 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ChevronLeft size={22} className="text-gray-800" strokeWidth={2.5} />
        </button>
        <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
          {step === 'overview' ? 'Plan Details' : 'Checkout'}
        </h1>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4 space-y-5">
        
        {step === 'overview' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Plan Header */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
              <span className="inline-block text-[10px] font-black tracking-wider uppercase bg-[#FAF7F2] text-[#599D9A] px-3 py-1 rounded-md mb-3">
                {selectedPlan.badge || 'PREPAID PACKAGE'}
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">{selectedPlan.name}</h2>
              <p className="text-[13px] font-bold text-gray-500 mb-5">{selectedPlan.mealsCount}</p>
              
              <div className="w-full h-[180px] rounded-2xl overflow-hidden bg-gray-50 mb-5 border border-gray-100">
                <img 
                  src={
                    selectedPlan.id === 'starter' ? '/media/starter_plan_banner.png' :
                    selectedPlan.id === 'popular' ? '/media/popular_plan_banner.png' :
                    '/media/value_plan_banner.png'
                  } 
                  alt={selectedPlan.name} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3.5 mb-5">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">What's included</h4>
                {selectedPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#599D9A]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-[#599D9A]" strokeWidth={4} />
                    </div>
                    <span className="text-[13px] font-bold text-gray-700 leading-snug">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Menu Preview Section */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">How it works</h4>
                <p className="text-[13px] font-bold text-gray-700 leading-snug mb-4">
                  You get {selectedPlan.mealsPerWeek} prepaid meals in your wallet. Use them to order any of our fresh recipes daily from the menu!
                </p>
                
                {/* Horizontal scroll of meals */}
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
                  {availableMeals.slice(0, 4).map(meal => (
                    <div key={meal.id} className="w-[100px] shrink-0">
                      <div className="w-full h-[100px] rounded-[18px] overflow-hidden mb-2 bg-gray-50 border border-gray-100">
                        <img src={meal.img} alt={meal.name} className="w-full h-full object-cover" />
                      </div>
                      <h5 className="font-extrabold text-[11px] text-gray-900 leading-tight truncate">{meal.name}</h5>
                    </div>
                  ))}
                  <div className="w-[100px] shrink-0 flex flex-col items-center justify-center h-[100px] rounded-[18px] bg-gray-50 border border-gray-200">
                    <span className="text-[11px] font-black text-[#599D9A]">+ More</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Free Trial Prompt */}
            {!freeTrialClaimed && (
              <div className="mt-5 bg-gradient-to-br from-[#FCEAE5] to-white rounded-3xl p-5 border border-[#F87B68]/20 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#F87B68]">
                    <Gift size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-[15px] text-gray-900 leading-tight">First Meal Free!</h3>
                    <p className="text-[11px] font-bold text-[#F87B68]">Before you subscribe, try us out.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFreeTrialModal(true)}
                  className="w-full mt-3 bg-white text-[#F87B68] font-black py-3 rounded-xl shadow-sm border border-[#F87B68]/20 text-[13px] active:scale-95 transition-transform"
                >
                  Claim Free Meal Now
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'checkout' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Advance Payment</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Purchase a prepaid meal package</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mt-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[9px] font-black tracking-wider uppercase bg-[#FAF7F2] text-[#599D9A] px-2.5 py-1 rounded-md mb-2 shadow-sm">
                    PREPAID PACKAGE
                  </span>
                  <h3 className="font-extrabold text-gray-900 text-[16px] leading-tight">{selectedPlan?.name}</h3>
                  <p className="text-[12px] text-gray-500 font-bold mt-1.5">{selectedPlan?.mealsPerWeek} chef-cooked fresh meals</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#599D9A]" />
                  <span className="text-[11px] font-bold text-gray-600">Balance never expires</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#599D9A]" />
                  <span className="text-[11px] font-bold text-gray-600">Order any meal from the menu anytime</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] rounded-2xl p-5 border border-gray-200 shadow-sm mt-4">
              <div className="flex justify-between text-xs font-bold text-gray-600 mb-2">
                <span>Package Price</span>
                <span>₹{Number(selectedPlan?.pricePerMonth).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
                <span className="font-extrabold text-gray-900 text-sm">Total Payable</span>
                <span className="font-black text-xl text-[#F87B68]">₹{Number(selectedPlan?.pricePerMonth).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200/60 p-4 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-[600px] mx-auto">
          {step === 'overview' ? (
            <button 
              onClick={() => setStep('checkout')}
              className="w-full bg-[#599D9A] hover:bg-[#4C8684] text-white font-black py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider text-sm active:scale-95"
            >
              Proceed to Payment
            </button>
          ) : (
            <button 
              onClick={handleSubscribe}
              className="w-full bg-[#BA5E52] hover:bg-[#A85146] text-white font-black py-4 rounded-xl transition-all shadow-[0_4px_16px_rgba(186,94,82,0.3)] flex items-center justify-center gap-2 uppercase tracking-wider text-sm active:scale-95"
            >
              <CreditCard size={16} strokeWidth={2.5} />
              Pay ₹{Number(selectedPlan?.pricePerMonth).toLocaleString('en-IN')}
            </button>
          )}
        </div>
      </div>

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
