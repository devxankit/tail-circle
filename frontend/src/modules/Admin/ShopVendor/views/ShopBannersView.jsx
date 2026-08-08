import React, { useState, useEffect } from 'react';
import { Check, Save, Image as ImageIcon, Trash2, Info, Plus } from 'lucide-react';
import { fetchAdminBanners, updateBannerApi, createBannerApi, deleteBannerApi } from '../../../../services/admin';

export function ShopBannersView() {
  const [toastMessage, setToastMessage] = useState(null);
  
  // Hero Banner State
  const [heroImage, setHeroImage] = useState('');
  const [heroTitle, setHeroTitle] = useState('Shop for your pet');
  const [heroSubtitle, setHeroSubtitle] = useState('Browse by breed, essentials, or expert plans.');
  
  // Promotional Banner State
  const [promoImage, setPromoImage] = useState('');
  const [promoTitle, setPromoTitle] = useState('Find products by breed');
  const [promoSubtitle, setPromoSubtitle] = useState("Tailored nutrition, toys, care & more for your pet's breed.");
  const [promoBg, setPromoBg] = useState('#529E99');
  const [promoButtonText, setPromoButtonText] = useState('Browse Breeds');
  const [promoLink, setPromoLink] = useState('');

  const [bannerIds, setBannerIds] = useState({});
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchAdminBanners()
      .then((rows) => {
        const byKey = Object.fromEntries((rows || []).map((b) => [b.key, b]));
        setBannerIds({ 
          shop_hero: byKey.shop_hero?.id, 
          shop_promotional: byKey.shop_promotional?.id 
        });
        
        if (byKey.shop_hero) {
          setHeroImage(byKey.shop_hero.image || '');
          setHeroTitle(byKey.shop_hero.title || 'Shop for your pet');
          setHeroSubtitle(byKey.shop_hero.subtitle || 'Browse by breed, essentials, or expert plans.');
        }
        
        if (byKey.shop_promotional) {
          setPromoImage(byKey.shop_promotional.image || '');
          setPromoTitle(byKey.shop_promotional.title || 'Find products by breed');
          setPromoSubtitle(byKey.shop_promotional.subtitle || "Tailored nutrition, toys, care & more for your pet's breed.");
          setPromoBg(byKey.shop_promotional.bg || '#529E99');
          setPromoButtonText(byKey.shop_promotional.buttonText || 'Browse Breeds');
          setPromoLink(byKey.shop_promotional.link || '');
        }
      })
      .catch((err) => console.error('Failed to load shop banners', err));
  }, []);

  const persistBanner = async (key, payload) => {
    if (bannerIds[key]) {
      return updateBannerApi(bannerIds[key], payload);
    }
    const created = await createBannerApi({ key, slot: 'Shop', ...payload });
    setBannerIds((prev) => ({ ...prev, [key]: created.id }));
    return created;
  };

  // Handlers for Hero Banner
  const handleSaveHero = async () => {
    if (isSavingHero) return;
    setIsSavingHero(true);
    try {
      await persistBanner('shop_hero', { image: heroImage, title: heroTitle, subtitle: heroSubtitle, active: true });
      showToast('Hero Banner saved successfully!');
    } catch { showToast('Failed to save Hero Banner'); }
    finally { setIsSavingHero(false); }
  };

  const handleHeroUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => setHeroImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handlers for Promotional Banner
  const handleSavePromo = async () => {
    if (isSavingPromo) return;
    setIsSavingPromo(true);
    try {
      await persistBanner('shop_promotional', { 
        image: promoImage, 
        link: promoLink,
        active: true 
      });
      showToast('Promotional Banner saved successfully!');
    } catch { showToast('Failed to save Promotional Banner'); }
    finally { setIsSavingPromo(false); }
  };

  const handlePromoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => setPromoImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#1A1A1A]">Shop Banners Management</h1>
        <p className="text-[#5A5552]">Control the dynamic banners shown on the user shop page.</p>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in-up">
          <Check size={18} className="text-[#F87B68]" />
          <p className="font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="bg-white rounded-[24px] border border-[#E5E0DA] p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Hero Banner</h2>
            <p className="text-sm text-[#5A5552]">The top banner on the shop page.</p>
          </div>
          <button onClick={handleSaveHero} disabled={isSavingHero} className={`px-5 py-2.5 rounded-full font-bold flex items-center gap-2 transition-colors ${isSavingHero ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-[#1A1A1A] hover:bg-black text-white'}`}>
            <Save size={18} /> {isSavingHero ? 'Saving...' : 'Save Hero Banner'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Title</label>
              <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="w-full bg-[#FFFBF7] border border-[#E5E0DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F87B68]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Subtitle</label>
              <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="w-full bg-[#FFFBF7] border border-[#E5E0DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F87B68] min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Image (Transparent PNG recommended)</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-[#FFFBF7] border border-[#E5E0DA] hover:border-[#F87B68] rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors">
                  <ImageIcon size={18} /> Upload Image
                  <input type="file" accept="image/*" onChange={handleHeroUpload} className="hidden" />
                </label>
                {heroImage && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={14}/> Image selected</span>}
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-[#FFFBF7] rounded-[24px] border border-[#E5E0DA] p-4 flex items-center justify-center relative overflow-hidden h-[160px] max-w-[450px]">
              <div className="text-center z-10 w-[60%] ml-[-30%]">
                <h3 className="text-xl font-black mb-2 whitespace-pre-line leading-tight">{heroTitle || 'Preview Title'}</h3>
                <p className="text-[10px] opacity-80 whitespace-pre-line">{heroSubtitle || 'Preview Subtitle'}</p>
              </div>
              {heroImage && <img src={heroImage} alt="Preview" className="absolute right-0 bottom-0 h-[140px] w-[140px] object-contain object-bottom translate-x-4" />}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center italic">If your image is covering the whole space, you've uploaded a full banner instead of just a cutout.</p>
          </div>
        </div>
      </div>

      {/* Promotional Banner Section */}
      <div className="bg-white rounded-[24px] border border-[#E5E0DA] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Promotional Banner</h2>
            <p className="text-sm text-[#5A5552]">The "Find products by breed" banner.</p>
          </div>
          <button onClick={handleSavePromo} disabled={isSavingPromo} className={`px-5 py-2.5 rounded-full font-bold flex items-center gap-2 transition-colors ${isSavingPromo ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-[#1A1A1A] hover:bg-black text-white'}`}>
            <Save size={18} /> {isSavingPromo ? 'Saving...' : 'Save Promo Banner'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Redirect URL (Link)</label>
              <input type="text" value={promoLink} onChange={(e) => setPromoLink(e.target.value)} className="w-full bg-[#FFFBF7] border border-[#E5E0DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F87B68]" placeholder="/app/shop or https://..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Image <span className="text-gray-500 font-normal">(Upload your full banner image here)</span></label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-[#FFFBF7] border border-[#E5E0DA] hover:border-[#F87B68] rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors">
                  <ImageIcon size={18} /> Upload Image
                  <input type="file" accept="image/*" onChange={handlePromoUpload} className="hidden" />
                </label>
                {promoImage && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={14}/> Image selected</span>}
              </div>
            </div>
          </div>
          <div>
            <div className="rounded-[24px] border border-[#E5E0DA] bg-gray-50 flex items-center justify-center relative overflow-hidden h-[160px] max-w-[450px]">
              {promoImage ? (
                <img src={promoImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm font-bold">No Image Uploaded</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center italic">This image will be displayed exactly as-is on the shop page.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
