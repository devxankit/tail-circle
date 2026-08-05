import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchMealPlans, fetchMealAccount } from '../../../../../services/meals';

export function ChangePlan() {
  const navigate = useNavigate();
  const [currentPlanId, setCurrentPlanId] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchMealPlans().then(setPlans).catch(() => setPlans([]));
    fetchMealAccount()
      .then((account) => setCurrentPlanId(account.activePlanLegacyId || ''))
      .catch(() => {});
  }, []);

  const handlePlanClick = (plan) => {
    navigate(`/app/meals/plan/${plan.id}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-gray-150 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black text-text-primary ml-2 flex-1 tracking-tight">Change Plan</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs text-gray-500 font-bold mb-6 text-center">Choose the perfect meal plan for your pet.</p>
        
        <div className="flex flex-col gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div 
                key={plan.id}
                onClick={() => handlePlanClick(plan)}
                className={`p-5 rounded-[24px] border-2 cursor-pointer transition-all active:scale-[0.98] bg-white shadow-sm hover:shadow-md
                  ${isCurrent ? 'border-[#F87B68] bg-[#F87B68]/5' : 'border-gray-200 hover:border-[#F87B68]/40'}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-text-primary text-base">{plan.name}</h3>
                    {isCurrent && (
                      <span className="bg-[#F87B68] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-text-disabled" />
                </div>
                <p className="text-xs text-gray-500 font-bold mb-4">{plan.mealsCount} • {plan.features[0]}</p>
                <p className="font-black text-[#F87B68] text-base">₹{plan.pricePerMonth} <span className="text-xs text-gray-400 font-bold">/ month</span></p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
