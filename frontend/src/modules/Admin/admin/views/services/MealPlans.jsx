import React, { useState, useEffect } from 'react';
import { Plus, Edit, Settings, Check, X, Search, Filter, MoreVertical, Eye, PauseCircle, Star, Utensils } from 'lucide-react';
import { fetchAdminMealPlans, createAdminMealPlan, updateAdminMealPlan, deleteAdminMealPlan } from '../../../../../services/admin';

export function MealPlans() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const initialSubs = [
    { id: 1, user: 'Rahul Sharma', pet: 'Buddy', plan: 'Popular', provider: 'PetBite Meals', startDate: '1 May 2025', remaining: '8 meals left', nextDelivery: '30 May 2025', status: 'Active' },
    { id: 2, user: 'Priya Nair', pet: 'Milo', plan: 'Best Value', provider: 'FurFeed Kitchen', startDate: '15 May 2025', remaining: '22 meals left', nextDelivery: '30 May 2025', status: 'Active' },
    { id: 3, user: 'Amit Das', pet: 'Luna', plan: 'Starter', provider: 'TailMeals Co', startDate: '20 May 2025', remaining: '6 meals left', nextDelivery: '31 May 2025', status: 'Active' },
    { id: 4, user: 'Sneha Roy', pet: 'Tiger', plan: 'Popular', provider: 'PetBite Meals', startDate: '1 May 2025', remaining: '0 meals left', nextDelivery: '—', status: 'Expired' },
    { id: 5, user: 'Vijay Kumar', pet: 'Bruno', plan: 'Custom', provider: 'PawPlate', startDate: '10 May 2025', remaining: '14 meals left', nextDelivery: '29 May 2025', status: 'Paused' },
  ];

  const [subscriptions, setSubscriptions] = useState(initialSubs);
  const [trialLimit, setTrialLimit] = useState(200);

  const [trialRules, setTrialRules] = useState({
    rule1: true,
    rule2: true,
    rule3: true,
    rule4: true,
    rule5: true,
    rule6: true
  });

  const getStatusPill = (status) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Paused': return 'bg-amber-100 text-amber-700';
      case 'Expired': return 'bg-gray-100 text-gray-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleRule = (ruleKey) => {
    setTrialRules(prev => ({ ...prev, [ruleKey]: !prev[ruleKey] }));
  };

  const handleAction = (id, action) => {
    if (action === 'pause') {
      setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, status: 'Paused' } : s));
      showToast('Subscription paused', 'info');
    } else if (action === 'cancel') {
      setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, status: 'Cancelled' } : s));
      showToast('Subscription cancelled', 'info');
    }
  };

  // Subscription plans management state
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
      borderColor: '#16796B',
      textColor: '#063b34',
      buttonBg: '#16796B'
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
      borderColor: '#8B5CF6',
      textColor: '#7C3AED',
      buttonBg: '#8B5CF6'
    }
  ];

  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchAdminMealPlans()
      .then((rows) => setPlans(rows.length ? rows : defaultPlans))
      .catch((err) => console.error('Failed to load meal plans', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Form states for Modal
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formMeals, setFormMeals] = useState(0);
  const [formBadge, setFormBadge] = useState('');
  const [formSaveText, setFormSaveText] = useState('');
  const [formFeatures, setFormFeatures] = useState('');
  const [formBgColor, setFormBgColor] = useState('#FFFFFF');
  const [formBorderColor, setFormBorderColor] = useState('#E8ECF0');
  const [formTextColor, setFormTextColor] = useState('#1F2937');

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormPrice(plan.pricePerMonth);
    setFormMeals(plan.mealsPerWeek * 4 || 10); // meals per month approx
    setFormBadge(plan.badge || '');
    setFormSaveText(plan.saveText || '');
    setFormFeatures(plan.features.join('\n'));
    setFormBgColor(plan.bgColor || '#FFFFFF');
    setFormBorderColor(plan.borderColor || '#E8ECF0');
    setFormTextColor(plan.textColor || '#1F2937');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormPrice(2000);
    setFormMeals(10);
    setFormBadge('');
    setFormSaveText('');
    setFormFeatures('Flexible scheduling\nSkip or pause anytime');
    setFormBgColor('#FFFFFF');
    setFormBorderColor('#E2E8F0');
    setFormTextColor('#1F2937');
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const updatedFeatures = formFeatures.split('\n').map(f => f.trim()).filter(Boolean);
    const calculatedPerMeal = Math.round(formPrice / (formMeals || 1));
    const payload = {
      name: formName,
      pricePerMonth: Number(formPrice),
      pricePerMeal: calculatedPerMeal,
      mealsCount: `${formMeals} meals / month`,
      mealsPerWeek: Math.round(formMeals / 4) || 2,
      badge: formBadge,
      saveText: formSaveText,
      features: updatedFeatures,
      bgColor: formBgColor,
      borderColor: formBorderColor,
      textColor: formTextColor,
      buttonBg: formBorderColor,
    };

    try {
      if (editingPlan) {
        const saved = await updateAdminMealPlan(editingPlan.id, payload);
        setPlans(plans.map(p => (p.id === editingPlan.id ? saved : p)));
        showToast('Plan updated successfully!');
      } else {
        const saved = await createAdminMealPlan(payload);
        setPlans([...plans, saved]);
        showToast('New plan added successfully!');
      }
      setIsModalOpen(false);
      setEditingPlan(null);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save plan', 'error');
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm("Are you sure you want to delete this subscription plan?")) {
      try {
        await deleteAdminMealPlan(id);
        setPlans(plans.filter(p => p.id !== id));
        showToast('Plan deleted successfully!', 'info');
      } catch (err) {
        showToast('Failed to delete plan', 'error');
      }
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to reset all plans to defaults? Your custom changes will be overwritten.")) {
      setPlans(defaultPlans);
      showToast('Plans reset to system defaults!');
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative font-sans">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Meal Plans Manager</h1>
          <p className="text-[13px] text-gray-500 mt-1">{plans.length} configured plans</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={handleResetDefaults} className="flex items-center gap-2 px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[13px] font-semibold rounded-lg transition shadow-sm">
            Reset to Defaults
          </button>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Plus size={16} /> Add Plan
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Total Active Subscriptions</h3>
          <p className="text-2xl font-semibold text-gray-900">842</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Revenue MTD</h3>
          <p className="text-2xl font-semibold text-emerald-600">₹14,82,000</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Trial Meals This Month</h3>
          <p className="text-2xl font-semibold text-gray-900">124 / 200</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Avg Plan Duration</h3>
          <p className="text-2xl font-semibold text-gray-900">23 days</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {plans.map(plan => (
          <div 
            key={plan.id} 
            style={{ backgroundColor: plan.bgColor || '#FFFFFF', borderColor: plan.borderColor || '#E8ECF0' }}
            className="rounded-[20px] border-2 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300 relative min-h-[360px]"
          >
            {plan.badge && (
              <div 
                style={{ borderColor: plan.borderColor, backgroundColor: '#FFFFFF', color: plan.textColor }}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full absolute -top-3.5 left-6 border"
              >
                {plan.badge}
              </div>
            )}
            
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: plan.textColor || '#1F2937' }}>
                    {plan.name}
                  </h3>
                  <span className="text-[11.5px] font-bold text-gray-400">{plan.mealsCount}</span>
                </div>
                {plan.saveText && (
                  <span 
                    style={{ backgroundColor: plan.borderColor + '20', color: plan.textColor }}
                    className="text-[9px] font-black px-2 py-0.5 rounded tracking-wide uppercase"
                  >
                    {plan.saveText}
                  </span>
                )}
              </div>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-black text-gray-950">₹{plan.pricePerMonth}</span>
                <span className="text-xs font-bold text-gray-400">/month</span>
                <span className="text-xs font-semibold text-gray-400 ml-2">(₹{plan.pricePerMeal}/meal)</span>
              </div>

              {/* Features List */}
              <div className="space-y-2.5 pt-4 border-t border-gray-150/40">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[12.5px] font-semibold text-gray-600 leading-tight">
                    <Check size={14} style={{ color: plan.textColor }} strokeWidth={4} className="mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-150/40 flex items-center gap-2">
              <button 
                onClick={() => openEditModal(plan)} 
                className="flex-1 py-2 border border-gray-200 text-gray-700 bg-white rounded-xl text-[12px] font-bold hover:bg-gray-50 transition active:scale-95 shadow-sm"
              >
                Edit Details
              </button>
              <button 
                onClick={() => handleDeletePlan(plan.id)} 
                className="px-3 py-2 border border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-95"
                title="Delete Plan"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden mb-8">
         <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
               <tr>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase">Feature Comparison</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-900">Starter</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-[#66B4B1]">Popular</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-900">Best Value</th>
                  <th className="px-6 py-4 text-[13px] font-bold text-gray-500">Custom</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Meals per plan</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">10</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">20</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">30</td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Custom</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Price</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">₹899</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">₹1,599</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">₹2,199</td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Custom</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Per meal cost</td>
                  <td className="px-6 py-3 text-[13px] font-semibold">₹89.9</td>
                  <td className="px-6 py-3 text-[13px] font-semibold text-emerald-600">₹79.95</td>
                  <td className="px-6 py-3 text-[13px] font-semibold text-emerald-600">₹73.3</td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">—</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Savings vs single</td>
                  <td className="px-6 py-3 text-[13px] font-semibold text-gray-400">—</td>
                  <td className="px-6 py-3 text-[13px] font-semibold text-emerald-600">11%</td>
                  <td className="px-6 py-3 text-[13px] font-semibold text-emerald-600">18%</td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">—</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Skip allowed</td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Toggle</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Priority delivery</td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Toggle</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Health report</td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Toggle</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Nutritionist</td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Toggle</td>
               </tr>
               <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-700">Free vet check</td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><X size={16} className="text-gray-300" /></td>
                  <td className="px-6 py-3"><Check size={16} className="text-[#66B4B1]" /></td>
                  <td className="px-6 py-3 text-[13px] font-medium text-gray-500">Toggle</td>
               </tr>
            </tbody>
         </table>
      </div>

      <div id="trial-settings" className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 mb-8">
        {/* Trial Settings */}
        <div className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm">
           <div className="flex items-center gap-2 mb-6">
              <Utensils size={20} className="text-amber-500" />
              <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">FREE TRIAL MEAL RULES</h3>
           </div>
           
           <div className="space-y-4 mb-6 border-b border-gray-100 pb-6">
             {[
               { key: 'rule1', text: '1 trial per user account' },
               { key: 'rule2', text: '1 trial per registered pet' },
               { key: 'rule3', text: '1 trial per verified mobile' },
               { key: 'rule4', text: 'Saturday delivery only' },
               { key: 'rule5', text: 'Fresh meal by vendor' },
               { key: 'rule6', text: 'Paid sub required post-trial' },
             ].map(rule => (
                <div key={rule.key} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Check size={16} className="text-[#66B4B1]" />
                      <span className="text-[13px] font-medium text-gray-700">{rule.text}</span>
                   </div>
                   <div onClick={() => toggleRule(rule.key)} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${trialRules[rule.key] ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${trialRules[rule.key] ? 'right-0.5' : 'left-0.5'}`}></div>
                   </div>
                </div>
             ))}
           </div>

           <div className="mb-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <span className="text-[13px] font-medium text-gray-700">Monthly trial limit:</span>
                <input 
                  type="number" 
                  value={trialLimit} 
                  onChange={(e) => setTrialLimit(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-[13px] text-right focus:outline-none focus:border-[#66B4B1]" 
                />
             </div>
             <p className="text-[13px] text-gray-500 mb-2">Used this month: 124 of {trialLimit}</p>
             <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex mb-1">
                <div className="bg-amber-500 h-full" style={{ width: `${(124/trialLimit)*100}%` }}></div>
             </div>
             <p className="text-[11px] font-bold text-gray-600 text-right">{Math.round((124/trialLimit)*100)}%</p>
           </div>

           <button onClick={() => showToast('Trial Settings Saved')} className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition shadow-sm">
             Save Trial Settings
           </button>
        </div>

        {/* Active Subscriptions Table */}
        <div className="bg-white rounded-xl border border-[#FAF7F2] shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-gray-900">Active Subscriptions</h3>
              <div className="flex items-center gap-2">
                 <div className="relative">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input type="text" placeholder="Search user or pet..." className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-[#66B4B1]" />
                 </div>
                 <button onClick={() => alert("Action triggered: Action")} className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"><Filter size={14}/></button>
              </div>
           </div>
           
           <div className="flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                   <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">User / Pet</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Provider</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Start Date</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Remaining</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Next Delivery</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                   {subscriptions.map(s => (
                      <tr key={s.id} className="hover:bg-[#FAF7F2] transition group">
                         <td className="px-4 py-3">
                           <p className="text-[13px] font-semibold text-gray-900">{s.user}</p>
                           <p className="text-[11px] text-gray-500">Pet: {s.pet}</p>
                         </td>
                         <td className="px-4 py-3 text-[13px] font-medium text-gray-700">{s.plan}</td>
                         <td className="px-4 py-3 text-[13px] text-gray-900">{s.provider}</td>
                         <td className="px-4 py-3 text-[12px] text-gray-500">{s.startDate}</td>
                         <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">{s.remaining}</td>
                         <td className="px-4 py-3 text-[12px] text-gray-500">{s.nextDelivery}</td>
                         <td className="px-4 py-3">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusPill(s.status)}`}>
                             {s.status}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <button onClick={() => alert("Action triggered: View")} className="p-1.5 text-gray-400 hover:text-[#66B4B1] hover:bg-[#FAF7F2] rounded transition" title="View">
                               <Eye size={16} />
                             </button>
                             {s.status === 'Active' && (
                               <button onClick={() => handleAction(s.id, 'pause')} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Pause">
                                 <PauseCircle size={16} />
                               </button>
                             )}
                             <button onClick={() => handleAction(s.id, 'cancel')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Cancel">
                               <X size={16} />
                             </button>
                           </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
           
           <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
             <p className="text-[12px] text-gray-500">Showing 5 of 842 subscriptions</p>
             <button onClick={() => alert("Action triggered: View All Subscriptions")} className="text-[12px] font-semibold text-[#66B4B1] hover:underline">View All Subscriptions</button>
           </div>
        </div>
      </div>

      {/* Add/Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => { setIsModalOpen(false); setEditingPlan(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md my-8 flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingPlan(null); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-5 space-y-4">
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Plan Name</label>
                 <input 
                   required 
                   value={formName} 
                   onChange={(e) => setFormName(e.target.value)}
                   className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" 
                   placeholder="e.g. Senior Dog Diet" 
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Monthly Price (₹)</label>
                    <input 
                      type="number" 
                      required 
                      value={formPrice} 
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" 
                      placeholder="0" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">No. of Meals/Month</label>
                    <input 
                      type="number" 
                      required 
                      value={formMeals} 
                      onChange={(e) => setFormMeals(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" 
                      placeholder="0" 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge/Tag Text</label>
                    <input 
                      value={formBadge} 
                      onChange={(e) => setFormBadge(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" 
                      placeholder="e.g. ★ MOST POPULAR" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Save Offer Text</label>
                    <input 
                      value={formSaveText} 
                      onChange={(e) => setFormSaveText(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" 
                      placeholder="e.g. SAVE 15%" 
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Features (One per line)</label>
                 <textarea 
                   rows={3}
                   value={formFeatures} 
                   onChange={(e) => setFormFeatures(e.target.value)}
                   className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition resize-none" 
                   placeholder="Flexible scheduling&#10;Skip or pause anytime"
                 />
              </div>

              {/* Custom Styling Colors */}
              <div className="bg-gray-50 p-4 rounded-[16px] border border-gray-100 space-y-3">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Card Visual Theme</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Bg Color</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={formBgColor} onChange={(e) => setFormBgColor(e.target.value)} className="w-6 h-6 border-0 cursor-pointer p-0 bg-transparent" />
                      <input type="text" value={formBgColor} onChange={(e) => setFormBgColor(e.target.value)} className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] uppercase font-semibold" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Border Color</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={formBorderColor} onChange={(e) => setFormBorderColor(e.target.value)} className="w-6 h-6 border-0 cursor-pointer p-0 bg-transparent" />
                      <input type="text" value={formBorderColor} onChange={(e) => setFormBorderColor(e.target.value)} className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] uppercase font-semibold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Theme/Text</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={formTextColor} onChange={(e) => setFormTextColor(e.target.value)} className="w-6 h-6 border-0 cursor-pointer p-0 bg-transparent" />
                      <input type="text" value={formTextColor} onChange={(e) => setFormTextColor(e.target.value)} className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] uppercase font-semibold" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white z-10 pb-2">
                 <button type="button" onClick={() => { setIsModalOpen(false); setEditingPlan(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95">Cancel</button>
                 <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm transition active:scale-95">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
