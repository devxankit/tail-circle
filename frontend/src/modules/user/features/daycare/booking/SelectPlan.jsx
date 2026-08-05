import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { getPlans, getAddons } from '../../../../../services/daycareApi';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

export function SelectPlan() {
  const navigate = useNavigate();
  const { setPlan, selectedPlan, toggleAddon, selectedAddons, selectedCenter } = useDaycareStore();
  
  const [plans, setPlans] = useState([]);
  const [addons, setAddonsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const providerId = selectedCenter?._id || selectedCenter?.id;
      const [plansData, addonsData] = await Promise.all([getPlans(providerId), getAddons(providerId)]);
      setPlans(plansData);
      setAddonsList(addonsData);
      
      // Auto-select first plan if none selected
      if (!selectedPlan && plansData.length > 0) {
        setPlan(plansData[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isAddonSelected = (addonId) => {
    return selectedAddons.some(a => a.id === addonId);
  };

  const handleContinue = () => {
    if (selectedPlan) {
      navigate('/app/services/daycare/book/date');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAF7F2] p-4 animate-pulse">Loading plans...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[18px] font-black text-gray-900">Select Plan</h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        <p className="text-[13px] font-medium text-gray-500 mb-6 leading-relaxed">
          All plans include supervised playtime & rest.
        </p>

        {/* Plans */}
        <div className="space-y-4 mb-8">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <div 
                key={plan.id}
                onClick={() => setPlan(plan)}
                className={`relative bg-white rounded-[20px] p-5 border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-[#66B4B1] shadow-sm' : 'border-gray-100'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-5 px-3 py-1 bg-[#F87B68]/10 text-[#F87B68] border border-[#F87B68]/20 rounded-full text-[10px] font-black uppercase tracking-wide">
                    {plan.badge}
                  </span>
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[16px] font-black text-gray-900">{plan.name}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-[#66B4B1] bg-[#66B4B1]' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-[18px] font-black text-gray-900 leading-none">₹{plan.price}</span>
                  <span className="text-[13px] text-gray-500 font-medium leading-tight">/ {plan.unit}</span>
                </div>

                <p className="text-[13px] text-gray-600 font-medium leading-relaxed">
                  {plan.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Addons */}
        <div>
          <h2 className="text-[16px] font-black text-gray-900 mb-4">Add-ons (Optional)</h2>
          <div className="space-y-3">
            {addons.map((addon) => {
              const selected = isAddonSelected(addon.id);
              return (
                <div 
                  key={addon.id}
                  onClick={() => toggleAddon(addon)}
                  className="flex items-center justify-between p-4 bg-white rounded-[16px] border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-colors ${
                      selected ? 'border-[#66B4B1] bg-[#66B4B1]' : 'border-gray-300'
                    }`}>
                      {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] font-bold text-gray-700">{addon.name}</span>
                  </div>
                  <span className="text-[14px] font-bold text-gray-900">₹{addon.price} <span className="text-[12px] text-gray-400 font-medium">/ {addon.unit}</span></span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={handleContinue}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
