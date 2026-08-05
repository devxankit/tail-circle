import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit, X, Check, Settings, AlertCircle, 
  Filter, Sparkles, Layers, Award, PawPrint, Heart, Info, DollarSign
} from 'lucide-react';
import { products } from '../../../../user/features/shop/shopData';
import { fetchAdminBreeds, createAdminBreed, updateAdminBreed, deleteAdminBreed } from '../../../../../services/admin';

export function BreedManagement() {
  const [breeds, setBreeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');
  
  // Drawer / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [personality, setPersonality] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [traits, setTraits] = useState(''); // Comma-separated
  
  // Summary fields
  const [weightRange, setWeightRange] = useState('');
  const [energyLevel, setEnergyLevel] = useState('Medium');
  const [lifeSpan, setLifeSpan] = useState('');
  const [foodRequirement, setFoodRequirement] = useState('');
  const [groomingRequirement, setGroomingRequirement] = useState('');
  const [exerciseRequirement, setExerciseRequirement] = useState('');
  const [monthlyCost, setMonthlyCost] = useState(0);

  // Recommendations state: Map of category -> Array of product IDs
  const [recFood, setRecFood] = useState([]);
  const [recTreats, setRecTreats] = useState([]);
  const [recToys, setRecToys] = useState([]);
  const [recHealth, setRecHealth] = useState([]);
  const [recAccessories, setRecAccessories] = useState([]);
  const [recGrooming, setRecGrooming] = useState([]);
  const [recComfort, setRecComfort] = useState([]);
  const [recTravel, setRecTravel] = useState([]);

  // Guidance level mapping: productID -> 'Must Have' | 'Good To Have' | 'Optional'
  const [guidanceMap, setGuidanceMap] = useState({});

  // Monthly Bundle builder
  const [bundleName, setBundleName] = useState('');
  const [bundleProductIds, setBundleProductIds] = useState([]);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState(0);

  // Toast / Status state
  const [toastMessage, setToastMessage] = useState(null);

  // Load breeds from the API on mount
  useEffect(() => {
    fetchAdminBreeds().then(setBreeds).catch((err) => console.error('Failed to load breeds', err));
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingBreed(null);
    setName('');
    setSpecies('Dog');
    setPersonality('');
    setDescription('');
    setImage('');
    setTraits('');
    setWeightRange('');
    setEnergyLevel('Medium');
    setLifeSpan('');
    setFoodRequirement('');
    setGroomingRequirement('');
    setExerciseRequirement('');
    setMonthlyCost(2500);
    setRecFood([]);
    setRecTreats([]);
    setRecToys([]);
    setRecHealth([]);
    setRecAccessories([]);
    setRecGrooming([]);
    setRecComfort([]);
    setRecTravel([]);
    setGuidanceMap({});
    setBundleName('');
    setBundleProductIds([]);
    setBundlePrice(0);
    setBundleOriginalPrice(0);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (breed) => {
    setEditingBreed(breed);
    setName(breed.name);
    setSpecies(breed.species);
    setPersonality(breed.personality);
    setDescription(breed.description || '');
    setImage(breed.image || '');
    setTraits(breed.traits ? breed.traits.join(', ') : '');
    setWeightRange(breed.summary?.weightRange || '');
    setEnergyLevel(breed.summary?.energyLevel || 'Medium');
    setLifeSpan(breed.summary?.lifeSpan || '');
    setFoodRequirement(breed.summary?.foodRequirement || '');
    setGroomingRequirement(breed.summary?.groomingRequirement || '');
    setExerciseRequirement(breed.summary?.exerciseRequirement || '');
    setMonthlyCost(breed.summary?.monthlyCost || 0);
    
    // Recommendations
    const recs = breed.recommendations || {};
    setRecFood(recs.food || []);
    setRecTreats(recs.treats || []);
    setRecToys(recs.toys || []);
    setRecHealth(recs.health || []);
    setRecAccessories(recs.accessories || []);
    setRecGrooming(recs.grooming || []);
    setRecComfort(recs.comfort || []);
    setRecTravel(recs.travel || []);

    // Guidance and bundle
    setGuidanceMap(breed.guidance || {});
    setBundleName(breed.monthlyBundle?.name || '');
    setBundleProductIds(breed.monthlyBundle?.productIds || []);
    setBundlePrice(breed.monthlyBundle?.bundlePrice || 0);
    setBundleOriginalPrice(breed.monthlyBundle?.originalPrice || 0);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this breed profile?')) {
      try {
        await deleteAdminBreed(id);
        setBreeds(prev => prev.filter(b => b.id !== id));
        showToast('Breed profile deleted successfully.', 'error');
      } catch (err) {
        showToast('Failed to delete breed.', 'error');
      }
    }
  };

  // Helper to toggle product recommendation
  const toggleRec = (productId, list, setList) => {
    if (list.includes(productId)) {
      setList(list.filter(id => id !== productId));
      // Remove from bundle if it was inside
      setBundleProductIds(prev => prev.filter(id => id !== productId));
    } else {
      setList([...list, productId]);
      // Set default guidance
      setGuidanceMap(prev => ({ ...prev, [productId]: 'Must Have' }));
    }
  };

  // Update guidance for a product
  const changeGuidance = (productId, level) => {
    setGuidanceMap(prev => ({ ...prev, [productId]: level }));
  };

  // Update original bundle price automatically when bundle items change
  useEffect(() => {
    const originalSum = bundleProductIds.reduce((sum, pid) => {
      const prod = products.find(p => p.id === pid);
      return sum + (prod ? prod.price : 0);
    }, 0);
    setBundleOriginalPrice(originalSum);
  }, [bundleProductIds]);

  const toggleBundleProduct = (productId) => {
    if (bundleProductIds.includes(productId)) {
      setBundleProductIds(bundleProductIds.filter(id => id !== productId));
    } else {
      setBundleProductIds([...bundleProductIds, productId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Convert traits comma string to array
    const traitsArray = traits.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const breedPayload = {
      species,
      name: name.trim(),
      personality: personality.trim() || 'Friendly and playful companion',
      description: description.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300',
      traits: traitsArray,
      summary: {
        weightRange,
        energyLevel,
        lifeSpan,
        foodRequirement,
        groomingRequirement,
        exerciseRequirement,
        monthlyCost: Number(monthlyCost)
      },
      recommendations: {
        food: recFood,
        treats: recTreats,
        toys: recToys,
        health: recHealth,
        accessories: recAccessories,
        grooming: recGrooming,
        comfort: recComfort,
        travel: recTravel
      },
      guidance: guidanceMap,
      monthlyBundle: {
        name: bundleName || `${name.trim()} Monthly Essentials Box`,
        productIds: bundleProductIds,
        originalPrice: Number(bundleOriginalPrice),
        bundlePrice: Number(bundlePrice)
      }
    };

    try {
      if (editingBreed) {
        const saved = await updateAdminBreed(editingBreed.id, breedPayload);
        setBreeds(prev => prev.map(b => b.id === editingBreed.id ? saved : b));
        showToast('Breed profile updated successfully.');
      } else {
        const saved = await createAdminBreed(breedPayload);
        setBreeds(prev => [...prev, saved]);
        showToast('New breed profile created successfully.');
      }
      setIsFormOpen(false);
    } catch (err) {
      showToast('Failed to save breed profile.', 'error');
    }
  };

  const filteredBreeds = breeds.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.personality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecies = filterSpecies === 'All' || b.species === filterSpecies;
    return matchesSearch && matchesSpecies;
  });

  // Calculate statistics
  const totalBreedsCount = breeds.length;
  const dogBreedsCount = breeds.filter(b => b.species === 'Dog').length;
  const catBreedsCount = breeds.filter(b => b.species === 'Cat').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right duration-250">
          <div className={`px-5 py-3.5 rounded-xl shadow-lg text-white font-bold text-xs tracking-wide flex items-center gap-2 border ${
            toastMessage.type === 'error' ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'
          }`}>
            <Check size={16} strokeWidth={3} />
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PawPrint className="text-teal-600" /> Breed-First Recommendation Builder
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Configure dynamic pet products recommendations, monthly bundle boxes, and breed traits.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus size={16} strokeWidth={3} /> Add New Breed
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Total Breeds Configured', value: totalBreedsCount, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Dog Breeds', value: dogBreedsCount, icon: PawPrint, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cat Breeds', value: catBreedsCount, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2 leading-none">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search breeds by name or traits..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          {['All', 'Dog', 'Cat'].map(sp => (
            <button 
              key={sp}
              onClick={() => setFilterSpecies(sp)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                filterSpecies === sp 
                  ? 'bg-teal-600 text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {sp}s
            </button>
          ))}
        </div>
      </div>

      {/* Breeds Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBreeds.map(breed => (
          <div key={breed.id} className="bg-white rounded-[24px] border border-slate-150 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition">
            
            <div>
              {/* Image & Header */}
              <div className="h-[140px] relative bg-slate-50 border-b border-slate-100">
                <img 
                  src={breed.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300'} 
                  alt={breed.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-white ${
                    breed.species === 'Dog' ? 'bg-emerald-600' : 'bg-rose-500'
                  }`}>
                    {breed.species}
                  </span>
                </div>
              </div>

              {/* Breed details */}
              <div className="p-5">
                <h3 className="text-[17px] font-black text-slate-900 leading-tight">{breed.name}</h3>
                <p className="text-xs font-medium text-slate-400 mt-1 leading-snug line-clamp-2">{breed.personality}</p>
                
                {/* Traits list */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {breed.traits && breed.traits.map((tr, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {tr}
                    </span>
                  ))}
                </div>

                <div className="h-px bg-slate-100 my-4"></div>

                {/* Recommendations Count Info */}
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-650">
                  <p>🍲 Food: <span className="font-extrabold text-slate-800">{(breed.recommendations?.food || []).length}</span></p>
                  <p>🦴 Treats: <span className="font-extrabold text-slate-800">{(breed.recommendations?.treats || []).length}</span></p>
                  <p>🥎 Toys: <span className="font-extrabold text-slate-800">{(breed.recommendations?.toys || []).length}</span></p>
                  <p>💆 Grooming: <span className="font-extrabold text-slate-800">{(breed.recommendations?.grooming || []).length}</span></p>
                  <p>💊 Health: <span className="font-extrabold text-slate-800">{(breed.recommendations?.health || []).length}</span></p>
                  <p>🐕 Walk Gear: <span className="font-extrabold text-slate-800">{(breed.recommendations?.accessories || []).length}</span></p>
                  <p>🛏️ Comfort: <span className="font-extrabold text-slate-800">{(breed.recommendations?.comfort || []).length}</span></p>
                  <p>🚗 Travel: <span className="font-extrabold text-slate-800">{(breed.recommendations?.travel || []).length}</span></p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-bold">
                Bundle Price: <span className="font-extrabold text-slate-800">₹{breed.monthlyBundle?.bundlePrice || 0}</span>
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenEdit(breed)}
                  className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-teal-500 hover:text-teal-600 transition active:scale-95 cursor-pointer"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(breed.id)}
                  className="p-2 bg-white border border-slate-200 text-rose-500 rounded-lg hover:bg-rose-50 hover:border-rose-300 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

          </div>
        ))}
        {filteredBreeds.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400 font-semibold text-sm">
            No breeds matches found. Click "Add New Breed" to create one.
          </div>
        )}
      </div>

      {/* Add/Edit Breed Drawer Modal */}
      {isFormOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity"
            onClick={() => setIsFormOpen(false)}
          ></div>

          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white h-full shadow-2xl z-[101] flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingBreed ? `Configure Breed: ${editingBreed.name}` : 'Register New Breed Recommender'}
                </h2>
                <p className="text-xs text-slate-400 font-semibold">Map traits, summary parameters, and dynamic shopping items</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="p-2 bg-white hover:bg-slate-100 rounded-full border border-slate-200 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section 1: Basic details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={14} /> 1. Breed Basic Coordinates
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Breed Name *</label>
                    <input 
                      type="text" 
                      required
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Golden Retriever"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pet Species *</label>
                    <select 
                      value={species}
                      onChange={e => setSpecies(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="Dog">Dog Species</option>
                      <option value="Cat">Cat Species</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Short Personality / Tagline *</label>
                  <input 
                    type="text" 
                    required
                    value={personality} 
                    onChange={e => setPersonality(e.target.value)} 
                    placeholder="e.g. Energetic, food-loving & gentle"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Detailed Description</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Provide details about breed behaviour, food habits, and home compatibility..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white min-h-[70px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Image URL</label>
                    <input 
                      type="text" 
                      value={image} 
                      onChange={e => setImage(e.target.value)} 
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Traits (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={traits} 
                      onChange={e => setTraits(e.target.value)} 
                      placeholder="e.g. Friendly, Active, Loyal"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Section 2: Summary Params */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={14} /> 2. Summary Parameters
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Weight Range</label>
                    <input 
                      type="text" 
                      value={weightRange} 
                      onChange={e => setWeightRange(e.target.value)} 
                      placeholder="e.g. 25 - 36 kg"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Energy Level</label>
                    <select 
                      value={energyLevel}
                      onChange={e => setEnergyLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="Low">Low Energy</option>
                      <option value="Medium">Medium Energy</option>
                      <option value="High">High Energy</option>
                      <option value="Very High">Very High Energy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Life Span</label>
                    <input 
                      type="text" 
                      value={lifeSpan} 
                      onChange={e => setLifeSpan(e.target.value)} 
                      placeholder="e.g. 10 - 12 Years"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Monthly Est. Cost (₹)</label>
                    <input 
                      type="number" 
                      value={monthlyCost} 
                      onChange={e => setMonthlyCost(Number(e.target.value))} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Food Requirement Note</label>
                  <input 
                    type="text" 
                    value={foodRequirement} 
                    onChange={e => setFoodRequirement(e.target.value)} 
                    placeholder="e.g. 3 cups of protein dry food daily"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grooming Need Note</label>
                    <input 
                      type="text" 
                      value={groomingRequirement} 
                      onChange={e => setGroomingRequirement(e.target.value)} 
                      placeholder="e.g. Brush 2 times weekly"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Exercise Need Note</label>
                    <input 
                      type="text" 
                      value={exerciseRequirement} 
                      onChange={e => setExerciseRequirement(e.target.value)} 
                      placeholder="e.g. 1.5 Hours daily play"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Section 3: Recommendations Builder */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} /> 3. Map Dynamic Recommended Products
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Select which items from our catalog apply to this breed. For each checked item, assign a confidence Guidance level (`Must Have`, `Good To Have`, `Optional`).
                </p>

                {[
                  { label: 'Food Picks', list: recFood, setList: setRecFood, category: 'Food' },
                  { label: 'Treats & Rewards', list: recTreats, setList: setRecTreats, category: 'Treats' },
                  { label: 'Toys & Play', list: recToys, setList: setRecToys, category: 'Toys' },
                  { label: 'Health & Care', list: recHealth, setList: setRecHealth, category: 'Health' },
                  { label: 'Walk Gear', list: recAccessories, setList: setRecAccessories, category: 'Accessories' },
                  { label: 'Grooming Essentials', list: recGrooming, setList: setRecGrooming, category: 'Grooming' },
                  { label: 'Comfort & Bedding', list: recComfort, setList: setRecComfort, category: 'Accessories' },
                  { label: 'Travel Essentials', list: recTravel, setList: setRecTravel, category: 'Accessories' }
                ].map((recCat, idx) => {
                  const availableProducts = products.filter(p => p.category.toLowerCase() === recCat.category.toLowerCase());
                  return (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-[13px] text-slate-800 mb-2 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span>{recCat.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{recCat.category}</span>
                      </h4>

                      {availableProducts.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No products available in this category catalog.</p>
                      ) : (
                        <div className="space-y-3">
                          {availableProducts.map(prod => {
                            const isChecked = recCat.list.includes(prod.id);
                            return (
                              <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-150">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 flex-1">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => toggleRec(prod.id, recCat.list, recCat.setList)}
                                    className="rounded accent-teal-600 w-4 h-4 cursor-pointer"
                                  />
                                  <span>{prod.brand} - {prod.name} (₹{prod.price})</span>
                                </label>

                                {isChecked && (
                                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 self-end sm:self-auto">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase px-1">Level:</span>
                                    {['Must Have', 'Good To Have', 'Optional'].map(lvl => (
                                      <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => changeGuidance(prod.id, lvl)}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                                          guidanceMap[prod.id] === lvl 
                                            ? 'bg-slate-800 text-white' 
                                            : 'text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        {lvl.replace(' Products', '')}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Section 4: Monthly Bundle Builder */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Award size={14} /> 4. Create Monthly Essentials Bundle
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Combine selected recommended products into a "Monthly Care Box" with bulk discount pricing.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bundle Box Name</label>
                  <input 
                    type="text" 
                    value={bundleName} 
                    onChange={e => setBundleName(e.target.value)} 
                    placeholder="e.g. Golden Retriever Monthly Box"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-[12px] text-slate-800 mb-2 border-b border-slate-200 pb-1.5">
                    Select Bundle Items (from Recommendations)
                  </h4>
                  
                  {/* List of checked recommended products */}
                  { [...recFood, ...recTreats, ...recToys, ...recHealth, ...recAccessories, ...recGrooming, ...recComfort, ...recTravel].length === 0 ? (
                    <p className="text-[11px] text-slate-400">Select recommended products in Step 3 first to bundle them.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {products
                        .filter(p => [...recFood, ...recTreats, ...recToys, ...recHealth, ...recAccessories, ...recGrooming, ...recComfort, ...recTravel].includes(p.id))
                        .map(p => {
                          const isBundled = bundleProductIds.includes(p.id);
                          return (
                            <label 
                              key={p.id} 
                              className={`flex items-center gap-2.5 p-2 bg-white rounded-xl border cursor-pointer text-[11px] font-semibold text-slate-700 transition ${
                                isBundled ? 'border-teal-500 bg-teal-50/20' : 'border-slate-200'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isBundled}
                                onChange={() => toggleBundleProduct(p.id)}
                                className="rounded accent-teal-600 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="line-clamp-1">{p.name} (₹{p.price})</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sum of items</label>
                    <div className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 flex items-center">
                      ₹{bundleOriginalPrice}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bundle Price *</label>
                    <input 
                      type="number" 
                      value={bundlePrice} 
                      onChange={e => setBundlePrice(Number(e.target.value))} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Savings</label>
                    <div className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-bold text-emerald-600 flex items-center">
                      ₹{bundleOriginalPrice - bundlePrice > 0 ? bundleOriginalPrice - bundlePrice : 0}
                    </div>
                  </div>
                </div>

              </div>

            </form>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
              >
                Save Configurations
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}

export default BreedManagement;
