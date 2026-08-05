import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Camera, X, Play, Image as ImageIcon } from 'lucide-react';
import { updatePet, uploadPetPhotos } from '../../../../services/pets';

const MAX_PHOTOS = 6;

export function Step2Media() {
  const navigate = useNavigate();
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount to avoid memory leaks
      media.forEach(m => {
        if(m.url && m.url.startsWith('blob:')) {
          URL.revokeObjectURL(m.url);
        }
      });
    };
  }, []);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image'));
    if (files.length > 0) {
      const newMedia = files.map(file => ({
         file,
         url: URL.createObjectURL(file),
         type: file.type
      }));
      setMedia(prev => [...prev, ...newMedia].slice(0, MAX_PHOTOS));
    }
  };

  const removeMedia = (idxToRemove) => {
    setMedia(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const completeStep = async (forceSkip = false) => {
    setIsLoading(true);
    setError('');
    try {
      const petId = localStorage.getItem('tc_onboarding_pet_id');
      if (petId && !forceSkip && media.length > 0) {
        const urls = await uploadPetPhotos(media.map((m) => m.file).filter(Boolean));
        if (urls.length) {
          await updatePet(petId, { photos: urls, avatarUrl: urls[0] });
        }
      }
      navigate('/onboarding/step3');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    completeStep(false);
  };

  const handleSkip = () => {
    completeStep(true);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 pb-10">
      {/* Progress Bar */}
      <div className="w-full bg-border-light h-2 rounded-full mb-8">
        <div className="bg-[#66B4B1] w-full h-2 rounded-full transition-all duration-500"></div>
      </div>

      <div className="flex flex-col space-y-2 mb-8 text-center items-center px-4">
        <h1 className="text-2xl font-bold text-text-primary">Upload Photos</h1>
        <p className="text-text-secondary text-sm">
          Let community see your lovely pet. Ideally upload 3 or more photos.
        </p>
        <span className="text-[#66B4B1] font-bold text-[12px] bg-[#66B4B1]/10 px-3 py-1 rounded-full mt-1">
          Up to {MAX_PHOTOS} photos
        </span>
      </div>

      <div className="flex-1 w-full px-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {media.map((file, idx) => (
            <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden border border-slate-200 shadow-sm">
               {file.type.startsWith('video') ? (
                 <video src={file.url} className="w-full h-full object-cover" muted playsInline />
               ) : (
                 <img src={file.url} className="w-full h-full object-cover" />
               )}
               
               {/* Media Type Badge */}
               {file.type.startsWith('video') ? (
                 <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                   <Play size={10} className="fill-current" /> Video
                 </div>
               ) : (
                 <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                   <ImageIcon size={10} /> Photo
                 </div>
               )}

               <button 
                 onClick={() => removeMedia(idx)} 
                 className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-white active:scale-95 transition-all shadow-sm"
               >
                 <X size={14} strokeWidth={3} />
               </button>
            </div>
          ))}

          <label className="aspect-square rounded-[24px] border-2 border-dashed border-[#66B4B1] bg-[#FAF7F2]/40 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FAF7F2]/60 hover:border-[#599D9A] transition-all">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleMediaChange}
            />
            <Camera size={32} className="text-[#66B4B1] mb-2" />
            <span className="text-[#66B4B1] font-bold text-sm text-center px-2 leading-tight">
              Add Photo
            </span>
          </label>
        </div>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-4 px-4">
        {error && (
          <p className="text-center text-xs font-bold text-red-500 animate-in fade-in duration-200">{error}</p>
        )}
        <Button onClick={handleContinue} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 bg-[#F87B68] hover:bg-[#F87B68]/90 border-0 flex items-center justify-center">
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            media.length > 0 ? "Save & Continue" : "Continue without Photos"
          )}
        </Button>
        <button onClick={handleSkip} disabled={isLoading} className="text-text-secondary font-medium hover:text-text-primary">
          Skip for now
        </button>
      </div>
    </div>
  );
}
