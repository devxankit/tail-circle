import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPet, updatePet, uploadPetPhotos } from '../../../../../services/pets';

export function AddPet() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [petName, setPetName] = useState('');
  const [breed, setBreed] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
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
      const pet = await createPet({
        name: petName.trim(),
        ...(breed.trim() ? { breed: breed.trim() } : {}),
      });
      if (imageFile) {
        const [url] = await uploadPetPhotos([imageFile]);
        if (url) await updatePet(pet._id, { photos: [url], avatarUrl: url });
      }
      setIsSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Add a Pet</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center mb-8 mt-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-[30px] bg-bg-secondary border-2 border-dashed border-text-disabled flex flex-col items-center justify-center cursor-pointer hover:bg-border-light/50 transition-colors overflow-hidden relative"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Pet Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="text-text-disabled mb-1" size={24} />
                <span className="text-[10px] font-bold text-text-disabled uppercase">Photo</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Pet's Name</label>
            <input 
              type="text" 
              placeholder="e.g. Luna"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className={`w-full bg-white border ${error ? 'border-error ring-1 ring-error' : 'border-border-light focus:border-primary-main focus:ring-1 focus:ring-primary-main'} rounded-2xl px-4 py-3 text-text-primary font-medium focus:outline-none transition-colors shadow-sm`}
            />
            {error && <span className="text-error text-xs mt-1 ml-2 font-medium">{error}</span>}
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Breed (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Golden Retriever"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full bg-white border border-border-light rounded-2xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors shadow-sm"
            />
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving || isSuccess}
            className={`w-full font-bold rounded-2xl py-4 mt-4 shadow-sm transition-all flex items-center justify-center gap-2
              ${isSuccess ? 'bg-success text-white' : 'bg-primary-main text-white hover:bg-primary-dark'}
              ${(isSaving || isSuccess) ? 'opacity-90' : 'active:scale-95'}`}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isSuccess ? (
              <><CheckCircle size={20} /> Saved!</>
            ) : (
              'Save Pet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
