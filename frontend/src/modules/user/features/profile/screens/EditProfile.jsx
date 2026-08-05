import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../../services/api';
import { getStoredUser, fetchMe, storeUser } from '../../../../../services/auth';

export function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = getStoredUser();
    if (cached) {
      setName(cached.name || '');
      setBio(cached.bio || '');
      if (cached.avatarUrl) setImage(cached.avatarUrl);
    }
    fetchMe()
      .then((user) => {
        setName(user.name || '');
        setBio(user.bio || '');
        if (user.avatarUrl) setImage(user.avatarUrl);
      })
      .catch(() => {});
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const updates = { name: name.trim(), bio: bio.trim() };

      if (imageFile) {
        const form = new FormData();
        form.append('file', imageFile);
        form.append('folder', 'avatars');
        const { data: asset } = await api.post('/uploads/image', form);
        updates.avatarUrl = asset.url || asset.secure_url;
      }

      const { data: user } = await api.patch('/users/me', updates);
      storeUser(user);
      navigate(-1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Edit Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="text-primary-main font-bold text-sm bg-primary-light/20 px-4 py-1.5 rounded-full hover:bg-primary-light/40 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {error && (
          <p className="text-center text-xs font-bold text-red-500 mb-4 animate-in fade-in duration-200">
            {error}
          </p>
        )}
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
            className="w-24 h-24 rounded-full bg-primary-light overflow-hidden border-4 border-white shadow-sm relative group flex items-center justify-center cursor-pointer"
          >
            {image ? (
              <img src={image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-primary-main to-teal-400 text-white font-black text-2xl flex items-center justify-center uppercase">
                {name ? name[0] : 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-primary-main text-xs font-bold mt-3">Change Photo</button>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-border-light rounded-2xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors shadow-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="3"
              className="w-full bg-white border border-border-light rounded-2xl px-4 py-3 text-text-primary font-medium focus:outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors shadow-sm resize-none"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}
