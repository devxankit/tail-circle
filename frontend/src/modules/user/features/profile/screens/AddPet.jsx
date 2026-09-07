import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, CheckCircle, Info, X, Trash2, ImageIcon, Sparkles, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchMyPets, createPet, updatePet, deletePet, uploadPetPhotos, fetchBreeds, fetchBehaviourOptions, toLegacyPet } from '../../../../../services/pets';
import { cn } from '../../../utils/cn';
import { IdealProfileModal } from '../../../../../components/common/IdealProfileModal';

const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const FALLBACK_BREEDS_BY_TYPE = {
  Dog: ['Beagle', 'Doberman', 'German Shepherd', 'Golden Retriever', 'Indie (Indian Pariah)', 'Labrador Retriever', 'Pug', 'Rottweiler', 'Shih Tzu', 'Siberian Husky'],
  Cat: ['Persian', 'Siamese', 'Maine Coon', 'Indie / Domestic Shorthair', 'Bengal', 'Ragdoll', 'British Shorthair'],
  Bird: ['Cockatiel', 'Parakeet / Budgie', 'Lovebird', 'Macaw', 'African Grey', 'Canary'],
  Rabbit: ['Netherland Dwarf', 'Holland Lop', 'Mini Rex', 'Lionhead', 'Flemish Giant'],
  Other: ['Mixed Breed', 'Indie'],
};
const SIZES = ['Small', 'Medium', 'Large'];
const ACTIVITY_LEVELS = ['Low', 'Medium', 'High'];
const MOODS = ['Happy 😊', 'Playful 🥎', 'Sleepy 💤', 'Energetic ⚡', 'Calm 🧘', 'Cuddly 🧸', 'Curious 🔍'];
const PURPOSES = ['Playdate', 'Friendship', 'Walking Partner', 'Training Partner', 'Breeding', 'Adoption'];
const DEFAULT_BEHAVIOURS = ['Friendly', 'Playful', 'Calm', 'Active', 'Protective', 'Social', 'Shy'];
const MAX_PHOTOS = 6;

export function AddPet() {
  const navigate = useNavigate();
  const { petId } = useParams();
  const isEdit = Boolean(petId);

  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [petName, setPetName] = useState('');
  const [type, setType] = useState('Dog');
  const [breed, setBreed] = useState('Golden Retriever');
  const [customBreed, setCustomBreed] = useState('');
  const [breedList, setBreedList] = useState([...FALLBACK_BREEDS_BY_TYPE['Dog'], 'Other']);
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [size, setSize] = useState('Medium');
  const [activityLevel, setActivityLevel] = useState('Medium');
  const [vaccinated, setVaccinated] = useState(true);
  const [neutered, setNeutered] = useState(false);
  const [diet, setDiet] = useState('');
  const [bio, setBio] = useState('');
  const [mood, setMood] = useState('Happy 😊');
  const [purpose, setPurpose] = useState('Playdate');
  const [temperament, setTemperament] = useState([]);
  const [behaviourOptions, setBehaviourOptions] = useState(DEFAULT_BEHAVIOURS);

  // Avatar & Gallery media
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showIdealModal, setShowIdealModal] = useState(false);

  useEffect(() => {
    fetchBreeds(type.toLowerCase())
      .then((breeds) => {
        if (breeds.length) {
          setBreedList([...breeds.map((b) => b.name), 'Other']);
        } else {
          setBreedList([...(FALLBACK_BREEDS_BY_TYPE[type] || FALLBACK_BREEDS_BY_TYPE['Dog']), 'Other']);
        }
      })
      .catch(() => {
        setBreedList([...(FALLBACK_BREEDS_BY_TYPE[type] || FALLBACK_BREEDS_BY_TYPE['Dog']), 'Other']);
      });
  }, [type]);

  useEffect(() => {
    fetchBehaviourOptions()
      .then((opts) => {
        if (Array.isArray(opts) && opts.length) setBehaviourOptions(opts);
      })
      .catch(() => {});

    if (isEdit) {
      fetchMyPets()
        .then((pets) => {
          const found = pets.find((p) => String(p._id) === String(petId));
          if (found) {
            const legacy = toLegacyPet(found);
            setPetName(legacy.name || '');
            const petTypeFormatted = legacy.species ? legacy.species.charAt(0).toUpperCase() + legacy.species.slice(1) : 'Dog';
            setType(petTypeFormatted);
            
            const rawBreed = legacy.breed || '';
            const fallbackList = FALLBACK_BREEDS_BY_TYPE[petTypeFormatted] || FALLBACK_BREEDS_BY_TYPE['Dog'];
            if (fallbackList.includes(rawBreed)) {
              setBreed(rawBreed);
              setCustomBreed('');
            } else if (rawBreed) {
              setBreed('Other');
              setCustomBreed(rawBreed);
            }

            setGender(legacy.gender ? legacy.gender.charAt(0).toUpperCase() + legacy.gender.slice(1) : 'Male');
            setAge(legacy.age && legacy.age !== '—' ? String(legacy.age).replace(/[^0-9.]/g, '') : '');
            setWeightKg(found.weightKg != null ? String(found.weightKg) : '');
            setSize(legacy.size ? legacy.size.charAt(0).toUpperCase() + legacy.size.slice(1) : 'Medium');
            setActivityLevel(legacy.activityLevel ? legacy.activityLevel.charAt(0).toUpperCase() + legacy.activityLevel.slice(1) : 'Medium');
            setVaccinated(Boolean(legacy.isVaccinated));
            setNeutered(Boolean(legacy.isNeutered));
            setDiet(legacy.diet || '');
            setBio(legacy.bio || '');
            setMood(legacy.mood || 'Happy 😊');
            setPurpose(legacy.purpose || 'Playdate');
            setTemperament(legacy.behaviours || []);
            setAvatarPreview(legacy.image || null);
            setExistingPhotos(legacy.mediaGallery || []);
          }
        })
        .catch(() => {});
    }
  }, [petId, isEdit]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image'));
    if (files.length > 0) {
      const remainingSlots = MAX_PHOTOS - (existingPhotos.length + newGalleryFiles.length);
      const toAdd = files.slice(0, remainingSlots).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setNewGalleryFiles((prev) => [...prev, ...toAdd]);
    }
  };

  const removeExistingPhoto = (urlToRemove) => {
    setExistingPhotos((prev) => prev.filter((u) => u !== urlToRemove));
  };

  const removeNewGalleryPhoto = (idxToRemove) => {
    setNewGalleryFiles((prev) => {
      const item = prev[idxToRemove];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idxToRemove);
    });
  };

  const toggleTemperament = (tag) => {
    if (temperament.includes(tag)) {
      setTemperament(temperament.filter((t) => t !== tag));
    } else if (temperament.length < 6) {
      setTemperament([...temperament, tag]);
    }
  };

  const handleSave = async () => {
    if (!petName.trim()) {
      setError("Pet's name is required");
      return;
    }
    setError('');
    setIsSaving(true);

    try {
      const typeKeyMap = { Dog: 'dog', Cat: 'cat', Bird: 'bird', Rabbit: 'rabbit', Other: 'other' };
      const finalBreed = breed === 'Other' ? (customBreed.trim() || 'Mixed Breed') : breed;
      const petData = {
        name: petName.trim(),
        type: typeKeyMap[type] || 'dog',
        breed: finalBreed,
        gender: gender.toLowerCase(),
        ...(age.trim() ? { ageText: `${age.trim()} Years` } : {}),
        weightKg: weightKg ? Number(weightKg) : null,
        size: size.toLowerCase(),
        activityLevel: activityLevel.toLowerCase(),
        health: { vaccinated, neutered },
        diet: diet.trim(),
        bio: bio.trim(),
        mood,
        purpose,
        temperament,
        isMatchProfile: true,
      };

      let savedPetId = petId;
      if (isEdit) {
        await updatePet(petId, petData);
      } else {
        const created = await createPet(petData);
        savedPetId = created._id;
      }

      // Handle photo uploads
      let uploadedAvatarUrl = null;
      if (avatarFile) {
        const [url] = await uploadPetPhotos([avatarFile]);
        if (url) uploadedAvatarUrl = url;
      }

      let uploadedGalleryUrls = [];
      if (newGalleryFiles.length > 0) {
        uploadedGalleryUrls = await uploadPetPhotos(newGalleryFiles.map((f) => f.file));
      }

      const finalGallery = [...existingPhotos, ...uploadedGalleryUrls];
      if (uploadedAvatarUrl && !finalGallery.includes(uploadedAvatarUrl)) {
        finalGallery.unshift(uploadedAvatarUrl);
      }

      const mediaUpdate = {};
      if (uploadedAvatarUrl) mediaUpdate.avatarUrl = uploadedAvatarUrl;
      if (finalGallery.length > 0) mediaUpdate.photos = finalGallery;

      if (Object.keys(mediaUpdate).length > 0) {
        await updatePet(savedPetId, mediaUpdate);
      }

      setIsSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err.message || 'Failed to save pet profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePet = async () => {
    setIsDeleting(true);
    try {
      await deletePet(petId);
      navigate('/app/profile');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPhotoCount = existingPhotos.length + newGalleryFiles.length;

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-bottom-4 duration-300">
      {/* Top Sticky Header */}
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-xs border-b border-border-light z-10 sticky top-0 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-text-primary">
            {isEdit ? `Edit ${petName || 'Pet'} Profile` : 'Add a Pet Profile'}
          </h1>
        </div>
        {isEdit && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete Pet"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Ideal Pet Profile Modal */}
      <IdealProfileModal
        isOpen={showIdealModal}
        onClose={() => setShowIdealModal(false)}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-28 hide-scrollbar">
        {/* Profile Avatar + Photo Gallery Section */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pet Photos & Media</h2>
            <button
              type="button"
              onClick={() => setShowIdealModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#4C8684] hover:bg-[#3d6b6a] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-xs transition active:scale-95"
            >
              <Sparkles size={12} className="text-amber-300 animate-pulse" />
              <span>See Ideal Profile</span>
              <Eye size={12} />
            </button>
          </div>
          
          {/* Main Avatar Upload */}
          <div className="flex flex-col items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-[30px] bg-slate-50 border-2 border-dashed border-[#66B4B1] flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50/50 transition-colors overflow-hidden relative shadow-sm"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Pet Avatar" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-[#66B4B1] mb-1" size={28} />
                  <span className="text-[10px] font-bold text-[#66B4B1] uppercase">Main Photo</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold mt-2">Main Profile Photo</span>
          </div>

          {/* Multi-Photo Gallery */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Gallery Photos (Matches Deck)</label>
              <span className="text-[11px] font-extrabold text-[#66B4B1] bg-[#66B4B1]/10 px-2.5 py-0.5 rounded-full">
                {totalPhotoCount}/{MAX_PHOTOS} Photos
              </span>
            </div>

            <input 
              type="file" 
              ref={galleryInputRef} 
              onChange={handleGalleryChange} 
              accept="image/*" 
              multiple 
              className="hidden" 
            />

            <div className="grid grid-cols-3 gap-2.5">
              {/* Existing Uploaded Gallery Photos */}
              {existingPhotos.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group">
                  <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeExistingPhoto(url)} 
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}

              {/* Newly Selected Photo Previews */}
              {newGalleryFiles.map((item, idx) => (
                <div key={`new-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                  <img src={item.preview} alt={`New Gallery ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeNewGalleryPhoto(idx)} 
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              {totalPhotoCount < MAX_PHOTOS && (
                <div 
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#66B4B1] bg-teal-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50/60 transition-colors"
                >
                  <Camera className="text-[#66B4B1] mb-1" size={22} />
                  <span className="text-[10px] font-bold text-[#66B4B1] uppercase">+ Add</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Pet Details Form */}
        <div className="space-y-5 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
          {/* Pet Name */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Pet's Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Luna, Bruno, Charlie"
              value={petName}
              onChange={(e) => {
                setPetName(e.target.value);
                if (error) setError('');
              }}
              className={cn(
                "w-full bg-slate-50 border rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:bg-white transition-colors text-sm shadow-2xs",
                error ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 focus:border-[#66B4B1]"
              )}
            />
            {error && <span className="text-red-500 text-xs mt-1 ml-2 font-medium">{error}</span>}
          </div>

          {/* Species / Type */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Species / Type</label>
            <div className="flex flex-wrap gap-2">
              {PET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                    type === t
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#66B4B1]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Breed Chips Selection */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Breed *</label>
            <div className="flex flex-wrap gap-2">
              {breedList.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBreed(b);
                    if (b !== 'Other') setCustomBreed('');
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-2xs",
                    breed === b
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#66B4B1]"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>

            {breed === 'Other' && (
              <input 
                type="text" 
                placeholder="e.g. French Bulldog, Indie Cat, Mixed"
                value={customBreed}
                onChange={(e) => setCustomBreed(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#66B4B1] focus:bg-white rounded-2xl px-4 py-2.5 text-slate-900 font-medium focus:outline-none transition-colors text-xs shadow-2xs mt-2.5 animate-in slide-in-from-top-1 duration-200"
              />
            )}
          </div>

          {/* Gender Selector */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Gender *</label>
            <div className="grid grid-cols-2 gap-3">
              {['Male', 'Female'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    "py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 shadow-2xs",
                    gender === g
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#66B4B1]"
                  )}
                >
                  <span className="text-sm">{g === 'Male' ? '♂' : '♀'}</span>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Age & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Age (Years)</label>
              <input 
                type="text" 
                placeholder="e.g. 2"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#66B4B1] focus:bg-white rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none transition-colors text-xs shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Weight (Kg)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="e.g. 12.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#66B4B1] focus:bg-white rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none transition-colors text-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Pet Size</label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all text-center",
                    size === s
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Energy / Activity Level</label>
            <div className="flex gap-2">
              {ACTIVITY_LEVELS.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setActivityLevel(act)}
                  className={cn(
                    "flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all text-center",
                    activityLevel === act
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  {act} Energy
                </button>
              ))}
            </div>
          </div>

          {/* Health & Medical Switches */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase block">Vaccinated?</label>
                <span className="text-[10px] text-slate-400 font-medium">Up to date</span>
              </div>
              <button
                type="button"
                onClick={() => setVaccinated(!vaccinated)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shadow-xs",
                  vaccinated ? "bg-[#66B4B1]" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow-md transition-transform",
                  vaccinated ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between border-l border-slate-200 pl-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase block">Neutered?</label>
                <span className="text-[10px] text-slate-400 font-medium">Spayed/Neutered</span>
              </div>
              <button
                type="button"
                onClick={() => setNeutered(!neutered)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shadow-xs",
                  neutered ? "bg-[#66B4B1]" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full shadow-md transition-transform",
                  neutered ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          {/* Diet & Bio */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Diet Plan / Food</label>
              <input 
                type="text" 
                placeholder="e.g. Dry kibble, fresh chicken & veggies"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#66B4B1] focus:bg-white rounded-2xl px-4 py-2.5 text-slate-900 font-medium focus:outline-none transition-colors text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Pet Bio / Story</label>
              <textarea 
                rows="3"
                placeholder="Tell other pet parents about your pet's personality and favorite activities..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#66B4B1] focus:bg-white rounded-2xl px-4 py-2.5 text-slate-900 font-medium focus:outline-none transition-colors text-xs resize-none"
              />
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Pet Mood / Vibe</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                    mood === m
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#66B4B1]"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Temperament / Behaviour */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Behaviour & Temperament</label>
            <p className="flex items-start gap-2 text-[12px] leading-snug text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 mb-3">
              <Info size={16} className="text-[#4C8684] shrink-0 mt-0.5" />
              <span>
                Choose your pet’s behaviour carefully. Tail Circle uses this information to understand behavioural compatibility and help you find better matches.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {behaviourOptions.map((tag) => {
                const isSelected = temperament.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTemperament(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                      isSelected
                        ? "bg-[#4C8684] text-white border-[#4C8684] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#4C8684]"
                    )}
                  >
                    {isSelected ? '✓ ' : ''}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purpose / Looking For */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Looking For / Purpose</label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                    purpose === p
                      ? "bg-[#66B4B1] text-white border-[#66B4B1] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-[#66B4B1]"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Action */}
        <button 
          onClick={handleSave} 
          disabled={isSaving || isSuccess}
          className={cn(
            "w-full font-bold rounded-2xl py-4 shadow-lg transition-all flex items-center justify-center gap-2 text-sm text-white bg-[#4C8684] hover:bg-[#3d6b6a]",
            isSuccess && "bg-emerald-600 hover:bg-emerald-600",
            (isSaving || isSuccess) ? "opacity-90" : "active:scale-95"
          )}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : isSuccess ? (
            <><CheckCircle size={20} /> Saved to Pet Passport!</>
          ) : (
            isEdit ? 'Update Pet Profile' : 'Save Pet Profile'
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Delete {petName || 'Pet'}'s Profile?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{petName || 'this pet'}</strong>? This will permanently remove their profile and matchmaking recommendations.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePet}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Pet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
