import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Check, ShieldCheck, Tag, Gift, MapPin, Plus, X } from 'lucide-react';
import { createAdoptionListing } from '../../../../../services/adoptApi';

const DEFAULT_TRAITS = ['Friendly', 'Playful', 'Loyal', 'Good with Kids', 'House Trained', 'Intelligent', 'Energetic', 'Gentle'];

export function ListPetForAdoption() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [weight, setWeight] = useState('Medium');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [location, setLocation] = useState('Indore');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Health Status
  const [vaccinated, setVaccinated] = useState(true);
  const [dewormed, setDewormed] = useState(true);
  const [neutered, setNeutered] = useState(false);

  // Traits & Description
  const [selectedTraits, setSelectedTraits] = useState(['Friendly', 'Playful']);
  const [about, setAbout] = useState('');

  // Photos
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=80'
  ]);

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    setImages(prev => [...prev, imageUrl.trim()]);
    setImageUrl('');
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTrait = (trait) => {
    setSelectedTraits(prev => 
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !breed.trim()) {
      setError('Please provide Pet Name and Breed.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await createAdoptionListing({
        name: name.trim(),
        type,
        breed: breed.trim(),
        age: age.trim() || 'Young',
        gender,
        price: isFree ? 0 : Number(price) || 0,
        weight,
        location: location.trim() || 'Indore',
        vaccinated,
        dewormed,
        neutered,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80'],
        about: about.trim() || `${name} is looking for a loving home!`,
        traits: selectedTraits,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
      });

      navigate('/app/adopt/my-listings');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create adoption listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-12 animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-white sticky top-0 z-30 border-b border-gray-100/50 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 -ml-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900 tracking-tight flex items-center gap-1.5">
          List a Pet for Adoption 🐾
        </h1>
        <div className="w-8" />
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-6 space-y-6 max-w-xl mx-auto w-full">
        
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200/60 rounded-[16px] text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Section 1: Basic Details */}
        <div className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">1. Basic Information</h2>
          
          {/* Pet Name */}
          <div>
            <label className="block text-[12px] font-bold text-gray-700 mb-1">Pet Name *</label>
            <input 
              type="text"
              placeholder="e.g. Max, Bella"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-4 py-3 text-[13.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
              required
            />
          </div>

          {/* Species & Breed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">Pet Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-3.5 py-3 text-[13.5px] font-bold text-gray-900 outline-none focus:border-[#66B4B1]"
              >
                <option value="Dog">Dog 🐕</option>
                <option value="Cat">Cat 🐈</option>
                <option value="Other">Other 🐾</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">Breed *</label>
              <input 
                type="text"
                placeholder="e.g. Golden Retriever"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-4 py-3 text-[13.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
                required
              />
            </div>
          </div>

          {/* Age, Gender & Weight */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11.5px] font-bold text-gray-700 mb-1">Age</label>
              <input 
                type="text"
                placeholder="e.g. 6 Months"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[14px] px-3 py-2.5 text-[12.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-gray-700 mb-1">Gender</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[14px] px-2 py-2.5 text-[12.5px] font-bold text-gray-900 outline-none focus:border-[#66B4B1]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-gray-700 mb-1">Size/Weight</label>
              <select 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[14px] px-2 py-2.5 text-[12.5px] font-bold text-gray-900 outline-none focus:border-[#66B4B1]"
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Giant">Giant</option>
              </select>
            </div>
          </div>

        </div>

        {/* Section 2: Adoption Type & Price */}
        <div className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">2. Adoption Fee & Terms</h2>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setIsFree(true); setPrice('0'); }}
              className={`flex-1 py-3 px-4 rounded-[16px] font-bold text-[13px] border flex items-center justify-center gap-2 transition-all ${
                isFree 
                  ? 'bg-[#FAF7F2] border-[#66B4B1] text-[#599D9A] shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <Gift size={16} /> Free Adoption
            </button>
            <button
              type="button"
              onClick={() => setIsFree(false)}
              className={`flex-1 py-3 px-4 rounded-[16px] font-bold text-[13px] border flex items-center justify-center gap-2 transition-all ${
                !isFree 
                  ? 'bg-[#FAF7F2] border-orange-400 text-orange-600 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <Tag size={16} /> Paid / Fee
            </button>
          </div>

          {!isFree && (
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">Adoption Fee (₹)</label>
              <input 
                type="number"
                placeholder="e.g. 1500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-4 py-3 text-[13.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
              />
            </div>
          )}

          {/* Location & Contact */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">City / Location</label>
              <input 
                type="text"
                placeholder="e.g. Indore, Vijay Nagar"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-4 py-3 text-[13.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">Contact Phone</label>
              <input 
                type="text"
                placeholder="+91 9876543210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] px-4 py-3 text-[13.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Medical / Health Status */}
        <div className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight mb-2">3. Health Record</h2>
          
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setVaccinated(!vaccinated)}
              className={`px-4 py-2.5 rounded-[14px] font-bold text-[12.5px] flex items-center gap-2 border transition-all ${
                vaccinated ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <ShieldCheck size={16} /> Vaccinated {vaccinated && <Check size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setDewormed(!dewormed)}
              className={`px-4 py-2.5 rounded-[14px] font-bold text-[12.5px] flex items-center gap-2 border transition-all ${
                dewormed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <ShieldCheck size={16} /> Dewormed {dewormed && <Check size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setNeutered(!neutered)}
              className={`px-4 py-2.5 rounded-[14px] font-bold text-[12.5px] flex items-center gap-2 border transition-all ${
                neutered ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <ShieldCheck size={16} /> Neutered/Spayed {neutered && <Check size={14} />}
            </button>
          </div>
        </div>

        {/* Section 4: Photos */}
        <div className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">4. Pet Photos</h2>
          
          <div className="flex gap-2">
            <input 
              type="url"
              placeholder="Paste Image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 bg-[#FAF7F2] border border-gray-200/80 rounded-[14px] px-3.5 py-2.5 text-[12.5px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="px-4 bg-[#66B4B1] text-white font-bold text-xs rounded-[14px] hover:bg-[#599D9A] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 rounded-[14px] overflow-hidden border border-gray-200 group">
                <img src={img} alt="Pet Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Description & Personality Traits */}
        <div className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">5. Personality Traits & Story</h2>
          
          <div>
            <label className="block text-[12px] font-bold text-gray-700 mb-2">Select Traits</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TRAITS.map(trait => {
                const active = selectedTraits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                      active ? 'bg-[#66B4B1] text-white border-[#66B4B1]' : 'bg-[#FAF7F2] text-gray-600 border-gray-200'
                    }`}
                  >
                    {trait} {active && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-gray-700 mb-1">About Pet</label>
            <textarea 
              rows={3}
              placeholder="Tell adopters about your pet's personality, habits, and story..."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-gray-200/80 rounded-[16px] p-3.5 text-[13px] font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#66B4B1]"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#66B4B1] hover:bg-[#599D9A] text-white rounded-[20px] font-black text-[15px] shadow-md shadow-[#66B4B1]/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Publishing Listing...' : 'Publish Adoption Listing 🐾'}
        </button>

      </form>
    </div>
  );
}
