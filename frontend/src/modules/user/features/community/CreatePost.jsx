import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, MapPin, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../../../../services/social';
import { api } from '../../../../services/api';

const PRESET_LOCATIONS = ['Indore, MP', 'Mumbai, MH', 'Central Park', 'Bangalore, KA', 'Delhi NCR', 'Pune, MH'];

export function CreatePost() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Advice');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const fileInputRef = useRef(null);
  const categories = ['Advice', 'Funny', 'Health', 'Lost & Found'];

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      let image = null;
      if (imageFile) {
        const form = new FormData();
        form.append('file', imageFile);
        form.append('folder', 'community');
        const { data: asset } = await api.post('/uploads/image', form);
        image = asset.url || asset.secure_url;
      }
      await createPost({
        content: content.trim(),
        category,
        location: location.trim() || null,
        image,
      });
      navigate(-1);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-50 animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <button onClick={() => navigate(-1)} className="text-text-primary font-medium hover:bg-bg-secondary px-3 py-1.5 rounded-lg">
          Cancel
        </button>
        <h2 className="font-bold text-text-primary">Create Post</h2>
        <button 
          onClick={handlePublish}
          disabled={!content.trim() || isPublishing}
          className="text-primary-main font-bold px-3 py-1.5 disabled:opacity-50 disabled:text-text-disabled hover:bg-primary-light/20 rounded-lg"
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-y-auto">
        {/* Category & Location Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4 relative">
          <span className="text-sm text-text-secondary">Posting in:</span>
          <button 
            onClick={() => setShowCategories(!showCategories)}
            className="flex items-center gap-1 text-sm font-bold text-text-primary bg-bg-secondary px-3 py-1.5 rounded-full border border-border-light relative z-20"
          >
            {category} <ChevronDown size={16} />
          </button>
          
          {location && (
            <span className="flex items-center gap-1 text-xs font-bold text-primary-dark bg-primary-main/10 px-3 py-1.5 rounded-full">
              <MapPin size={12} /> {location}
              <button onClick={() => setLocation('')} className="ml-1 text-text-secondary hover:text-error">
                <X size={12} />
              </button>
            </span>
          )}

          {/* Category Dropdown Menu */}
          {showCategories && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCategories(false)}></div>
              <div className="absolute top-10 left-[70px] bg-white border border-border-light shadow-xl rounded-xl py-2 z-20 w-40">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setCategory(cat); setShowCategories(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary flex items-center justify-between"
                  >
                    {cat}
                    {category === cat && <Check size={14} className="text-primary-main" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Location Picker Popup */}
        {showLocationInput && (
          <div className="mb-4 bg-bg-secondary p-3 rounded-2xl border border-border-light animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-text-secondary uppercase">Add Location</span>
              <button onClick={() => setShowLocationInput(false)} className="text-text-disabled hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Central Park, Mumbai or Indore, MP"
              className="w-full bg-white border border-border-light rounded-xl px-3 py-2 text-sm mb-2 outline-none focus:border-primary-main"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => { setLocation(loc); setShowLocationInput(false); }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${location === loc ? 'bg-primary-main text-white border-primary-main' : 'bg-white text-text-secondary border-border-light'}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Area */}
        <textarea
          autoFocus
          placeholder="What's on your mind?"
          className="w-full min-h-[150px] text-lg text-text-primary placeholder:text-text-disabled resize-none outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative mt-4 w-full h-64 rounded-2xl overflow-hidden border border-border-light">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => { setImagePreview(null); setImageFile(null); }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageChange} 
        className="hidden" 
      />

      {/* Toolbar */}
      <div className="p-3 border-t border-border-light flex gap-4 bg-white items-center">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-primary-main hover:bg-primary-light/20 rounded-full transition-colors"
          title="Add photo"
        >
          <ImageIcon size={24} />
        </button>
        <button 
          onClick={() => setShowLocationInput((v) => !v)}
          className={`p-2 rounded-full transition-colors ${location || showLocationInput ? 'bg-primary-main text-white' : 'text-primary-main hover:bg-primary-light/20'}`}
          title="Tag location"
        >
          <MapPin size={24} />
        </button>
      </div>
    </div>
  );
}
