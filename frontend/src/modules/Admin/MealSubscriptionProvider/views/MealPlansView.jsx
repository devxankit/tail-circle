import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Search, Plus, MoreVertical, Utensils, Tag, Edit, Copy, Archive, Check } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { Modal } from '../../components/Modal';

export function MealPlansView() {
  const { mealPlans, addMealPlan, updateMealPlan, deleteMealPlan } = useMealProvider();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: '', petType: 'Dog', mealType: 'Fresh Cooked', qty: '', calories: '', 
    protein: '', duration: 'Weekly', price: '', status: 'Active'
  });

  const filteredPlans = mealPlans.filter(p => {
    if (filterType !== 'All' && p.petType !== filterType) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    if (editingPlanId) {
      updateMealPlan(editingPlanId, newPlan);
    } else {
      addMealPlan(newPlan);
    }
    setIsModalOpen(false);
    setEditingPlanId(null);
    setNewPlan({ name: '', petType: 'Dog', mealType: 'Fresh Cooked', qty: '', calories: '', protein: '', duration: 'Weekly', price: '', status: 'Active' });
  };

  const openNewModal = () => {
    setEditingPlanId(null);
    setNewPlan({ name: '', petType: 'Dog', mealType: 'Fresh Cooked', qty: '', calories: '', protein: '', duration: 'Weekly', price: '', status: 'Active' });
    setIsModalOpen(true);
  };

  const handleEdit = (plan) => {
    setEditingPlanId(plan.id);
    setNewPlan(plan);
    setIsModalOpen(true);
  };

  const handleDuplicate = (plan) => {
    addMealPlan({ ...plan, name: `${plan.name} (Copy)` });
  };

  const handleArchive = (id) => {
    if (window.confirm("Are you sure you want to archive this meal plan?")) {
      deleteMealPlan(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Meal Plans Catalog</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Manage your active nutrition packages and pricing.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Search meal plans..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/50 focus:border-[#F87B68] transition"
            />
          </div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Pets</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
            <option value="Bird">Birds</option>
            <option value="Rabbit">Rabbits</option>
            <option value="Fish">Fish</option>
            <option value="Small Pet">Small Pets (Hamster, Guinea Pig)</option>
            <option value="Reptile">Reptiles</option>
            <option value="Other">Other</option>
          </select>
          <button 
            onClick={openNewModal}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-slate-900/20 cursor-pointer shrink-0"
          >
            <Plus size={16} /> New Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlans.map(plan => (
          <div key={plan.id} className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group">
            {/* Card Header image placeholder */}
            <div className="h-32 relative overflow-hidden flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-500">
              {plan.image ? (
                <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 flex flex-col items-center justify-center border-b border-orange-100/50">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-orange-300">
                    <Utensils size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-orange-400/70 tracking-widest uppercase">No Image Added</span>
                </div>
              )}
              <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1 z-10 shadow-sm">
                {plan.petType === 'Dog' ? '🐶' : '🐱'} {plan.petType}
              </div>
              <div className="absolute top-3 right-3 z-20">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === plan.id ? null : plan.id)}
                  className="p-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 shadow-sm cursor-pointer opacity-100 transition-opacity"
                >
                  <MoreVertical size={14} />
                </button>
                {activeDropdown === plan.id && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1">
                    <button 
                      onClick={() => {
                        updateMealPlan(plan.id, { status: plan.status === 'Active' ? 'Paused' : 'Active' });
                        setActiveDropdown(null);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-[#F87B68] transition"
                    >
                      {plan.status === 'Active' ? 'Pause Plan' : 'Activate Plan'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col relative" onClick={() => activeDropdown && setActiveDropdown(null)}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-black text-gray-900 leading-tight flex items-center gap-2">
                  {plan.name}
                  {plan.status === 'Paused' && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] uppercase tracking-wider rounded-md border border-red-100">Paused</span>}
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-[10px] font-bold uppercase tracking-wider">{plan.mealType}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold uppercase tracking-wider">{plan.qty}</span>
              </div>
              
              <div className="space-y-1.5 mb-6">
                <p className="text-xs text-gray-500 font-medium flex justify-between"><span>Calories:</span> <span className="font-bold text-gray-900">{plan.calories}</span></p>
                <p className="text-xs text-gray-500 font-medium flex justify-between"><span>Protein:</span> <span className="font-bold text-gray-900">{plan.protein}</span></p>
                <p className="text-xs text-gray-500 font-medium flex justify-between"><span>Billing Cycle:</span> <span className="font-bold text-gray-900">{plan.duration}</span></p>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
                  <p className="text-lg font-black text-[#F87B68]">₹{plan.price}</p>
                </div>
                <div className="flex gap-1 z-10 relative">
                  <button onClick={() => handleEdit(plan)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Edit"><Edit size={16} /></button>
                  <button onClick={() => handleDuplicate(plan)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer" title="Duplicate"><Copy size={16} /></button>
                  <button onClick={() => handleArchive(plan.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Archive"><Archive size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card Button (Visible on mobile or at end of list) */}
        <button 
          onClick={openNewModal}
          className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:text-[#F87B68] hover:border-[#F87B68]/50 hover:bg-orange-50/30 transition-all cursor-pointer min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-gray-100">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm">Create New Plan</span>
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlanId ? "Edit Meal Plan" : "Create Meal Plan"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Plan Name</label>
            <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="e.g. Grain Free Salmon Diet" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Pet Type</label>
              <select value={newPlan.petType} onChange={e => setNewPlan({...newPlan, petType: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Fish">Fish</option>
                <option value="Small Pet">Small Pet (Hamster, etc.)</option>
                <option value="Reptile">Reptile</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Meal Type</label>
              <select value={newPlan.mealType} onChange={e => setNewPlan({...newPlan, mealType: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F87B68]">
                <option value="Fresh Cooked">Fresh Cooked</option>
                <option value="Wet Food">Wet Food</option>
                <option value="Kibble Blends">Kibble Blends</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Portion Size</label>
              <input required type="text" value={newPlan.qty} onChange={e => setNewPlan({...newPlan, qty: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="e.g. 300g" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Price (₹)</label>
              <input required type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="e.g. 1250" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Calories (kcal)</label>
              <input required type="number" value={newPlan.calories} onChange={e => setNewPlan({...newPlan, calories: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="e.g. 450" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Protein (%)</label>
              <input required type="number" value={newPlan.protein} onChange={e => setNewPlan({...newPlan, protein: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="e.g. 12" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Billing Cycle</label>
              <select value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">Cancel</button>
            <button onClick={handleCreate} className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-slate-900/20">
              <Check size={16} /> {editingPlanId ? "Update Plan" : "Save Plan"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
