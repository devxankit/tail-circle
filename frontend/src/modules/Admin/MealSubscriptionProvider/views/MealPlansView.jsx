import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { uploadVendorFile } from '../../../../services/vendor';
import { Plus, MoreVertical, Utensils, Tag, Edit, Copy, Archive, Check, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { Modal } from '../../components/Modal';
import {
  SearchBar, ActionSheet, StatusBadge, CardAction, PrimaryButton, Select, EmptyState,
  FieldPair, fieldClass, labelClass, useConfirm, useVendorToast,
} from '../../vendor/mobile';

export function MealPlansView() {
  const { mealPlans, addMealPlan, updateMealPlan, deleteMealPlan } = useMealProvider();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const confirm = useConfirm();
  const { addToast } = useVendorToast();
  const [newPlan, setNewPlan] = useState({
    name: '', petType: 'Dog', mealType: 'Fresh Cooked', qty: '', calories: '', 
    protein: '', duration: 'Weekly', price: '', status: 'Active', image: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadVendorFile(file, 'meal-plans');
      setNewPlan(prev => ({ ...prev, image: url }));
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not upload image', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

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

  const handleArchive = async (id) => {
    if (await confirm({ title: 'Are you sure you want to archive this meal plan?', confirmLabel: 'Archive', danger: true })) {
      deleteMealPlan(id);
    }
  };

  const dropdownPlan = mealPlans.find((pl) => pl.id === activeDropdown);

  return (
    <div className="space-y-4">

      {/* Header & Controls */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Meal Plans Catalog</h2>
          <p className="text-xs text-text-secondary mt-1">Manage your active nutrition packages and pricing.</p>
        </div>
        <button
          onClick={openNewModal}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> New Plan
        </button>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search meal plans..." />
      <Select value={filterType} onChange={setFilterType}>
        <option value="All">All Pets</option>
        <option value="Dog">Dogs</option>
        <option value="Cat">Cats</option>
        <option value="Bird">Birds</option>
        <option value="Rabbit">Rabbits</option>
        <option value="Fish">Fish</option>
        <option value="Small Pet">Small Pets (Hamster, Guinea Pig)</option>
        <option value="Reptile">Reptiles</option>
        <option value="Other">Other</option>
      </Select>

      {/* Plans */}
      <div className="space-y-3">
        {filteredPlans.map(plan => (
          <div key={plan.id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
            <div className="h-32 relative overflow-hidden flex flex-col items-center justify-center">
              {plan.image ? (
                <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 to-bg-primary flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-primary-main">
                    <Utensils size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-text-secondary tracking-widest uppercase">No Image Added</span>
                </div>
              )}
              <div className="absolute top-3 left-3 px-2 py-1 bg-white/95 border border-border-light rounded-lg text-[10px] font-black uppercase tracking-wider text-text-primary flex items-center gap-1 z-10 shadow-sm">
                {plan.petType === 'Dog' ? '🐶' : '🐱'} {plan.petType}
              </div>
              <button
                onClick={() => setActiveDropdown(activeDropdown === plan.id ? null : plan.id)}
                aria-label="Plan actions"
                className="absolute top-2 right-2 z-20 w-10 h-10 bg-white/95 border border-border-light rounded-full text-text-secondary shadow-sm cursor-pointer flex items-center justify-center"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="p-4">
              <h3 className="text-[15px] font-black text-text-primary leading-tight flex items-center gap-2 flex-wrap">
                {plan.name}
                {plan.status === 'Paused' && <StatusBadge size="xs" label="Paused" tone="error" />}
              </h3>
              <div className="flex items-center gap-2 mt-2 mb-3">
                <span className="px-2 py-0.5 bg-primary-light/30 text-primary-dark rounded text-[10px] font-bold uppercase tracking-wider">{plan.mealType}</span>
                <span className="px-2 py-0.5 bg-accent-teal/10 text-[#4C8684] rounded text-[10px] font-bold uppercase tracking-wider">{plan.qty}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-bg-primary rounded-xl p-2 text-center"><p className="text-[10px] text-text-secondary font-bold">Calories</p><p className="text-xs font-black text-text-primary">{plan.calories}</p></div>
                <div className="bg-bg-primary rounded-xl p-2 text-center"><p className="text-[10px] text-text-secondary font-bold">Protein</p><p className="text-xs font-black text-text-primary">{plan.protein}</p></div>
                <div className="bg-bg-primary rounded-xl p-2 text-center"><p className="text-[10px] text-text-secondary font-bold">Billing</p><p className="text-xs font-black text-text-primary">{plan.duration}</p></div>
              </div>

              <div className="pt-3 border-t border-border-light flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Price</p>
                  <p className="text-lg font-black text-primary-main leading-tight">₹{plan.price}</p>
                </div>
                <div className="flex gap-2">
                  <CardAction icon={Edit} onClick={() => handleEdit(plan)} className="px-3">Edit</CardAction>
                  <CardAction icon={Copy} onClick={() => handleDuplicate(plan)} aria-label="Duplicate" className="px-3">Copy</CardAction>
                  <CardAction icon={Archive} tone="danger" onClick={() => handleArchive(plan.id)} aria-label="Archive" className="px-3">Archive</CardAction>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!filteredPlans.length && <EmptyState icon={Utensils} text="No meal plans match." />}

        <button
          onClick={openNewModal}
          className="w-full bg-bg-primary border-2 border-dashed border-border-light rounded-[20px] flex flex-col items-center justify-center text-text-secondary transition-all cursor-pointer min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 border border-border-light">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm">Create New Plan</span>
        </button>
      </div>

      {/* The per-plan menu, as an action sheet. */}
      <ActionSheet
        open={!!dropdownPlan}
        onClose={() => setActiveDropdown(null)}
        title={dropdownPlan?.name}
        actions={dropdownPlan ? [
          {
            key: 'toggle',
            label: dropdownPlan.status === 'Active' ? 'Pause Plan' : 'Activate Plan',
            onClick: () => {
              updateMealPlan(dropdownPlan.id, { status: dropdownPlan.status === 'Active' ? 'Paused' : 'Active' });
              setActiveDropdown(null);
            },
          },
        ] : []}
      />

      <Modal
        forceSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlanId ? "Edit Meal Plan" : "Create Meal Plan"}
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setIsModalOpen(false)}>Cancel</PrimaryButton>
            <PrimaryButton tone="dark" icon={Check} onClick={handleCreate}>{editingPlanId ? "Update Plan" : "Save Plan"}</PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Plan Name</label>
            <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className={fieldClass} placeholder="e.g. Grain Free Salmon Diet" />
          </div>
          <div>
            <label className={labelClass}>Pet Type</label>
            <select value={newPlan.petType} onChange={e => setNewPlan({...newPlan, petType: e.target.value})} className={fieldClass}>
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
            <label className={labelClass}>Meal Type</label>
            <select value={newPlan.mealType} onChange={e => setNewPlan({...newPlan, mealType: e.target.value})} className={fieldClass}>
              <option value="Fresh Cooked">Fresh Cooked</option>
              <option value="Wet Food">Wet Food</option>
              <option value="Kibble Blends">Kibble Blends</option>
            </select>
          </div>
          <FieldPair>
            <div>
              <label className={labelClass}>Portion Size</label>
              <input required type="text" value={newPlan.qty} onChange={e => setNewPlan({...newPlan, qty: e.target.value})} className={fieldClass} placeholder="e.g. 300g" />
            </div>
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input required type="number" inputMode="decimal" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} className={fieldClass} placeholder="e.g. 1250" />
            </div>
          </FieldPair>
          <FieldPair>
            <div>
              <label className={labelClass}>Calories (kcal)</label>
              <input required type="number" inputMode="numeric" value={newPlan.calories} onChange={e => setNewPlan({...newPlan, calories: e.target.value})} className={fieldClass} placeholder="e.g. 450" />
            </div>
            <div>
              <label className={labelClass}>Protein (%)</label>
              <input required type="number" inputMode="numeric" value={newPlan.protein} onChange={e => setNewPlan({...newPlan, protein: e.target.value})} className={fieldClass} placeholder="e.g. 12" />
            </div>
          </FieldPair>
          <div>
            <label className={labelClass}>Billing Cycle</label>
            <select value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} className={fieldClass}>
              <option value="Weekly">Weekly</option>
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Plan Image</label>
            <input type="file" id="mealImageUpload" className="hidden" accept="image/*" onChange={handleImageUpload} />
            <div
              onClick={() => document.getElementById('mealImageUpload').click()}
              className="border-2 border-dashed border-accent-teal/50 rounded-2xl p-4 min-h-[64px] flex flex-col items-center justify-center bg-bg-primary transition cursor-pointer"
            >
              {uploadingImage ? (
                <div className="flex items-center gap-2 py-2 text-xs font-bold text-text-secondary">
                  <Loader2 size={16} className="animate-spin" /> Uploading image...
                </div>
              ) : newPlan.image ? (
                <div className="flex items-center gap-3">
                  <img src={newPlan.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-border-light" />
                  <span className="text-xs font-bold text-text-primary">Tap to change image</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                  <ImageIcon size={16} /> Tap to upload plan image
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
