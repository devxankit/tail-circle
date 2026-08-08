import React, { useState, useEffect } from 'react';
import { Check, Save, Image as ImageIcon, Trash2, Info } from 'lucide-react';
import { fetchAdminBanners, updateBannerApi, createBannerApi } from '../../../../../services/admin';
import { ShopBannersView } from '../../../ShopVendor/views/ShopBannersView';

export function BannersContent() {
  const [toastMessage, setToastMessage] = useState(null);

  const [freshFoodImage, setFreshFoodImage] = useState('');
  const [adoptionImage, setAdoptionImage] = useState('');
  const [daycareImage, setDaycareImage] = useState('');
  // Map of banner key → Banner document id (for updates).
  const [bannerIds, setBannerIds] = useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load the admin-managed section banners.
  useEffect(() => {
    fetchAdminBanners()
      .then((rows) => {
        const byKey = Object.fromEntries((rows || []).map((b) => [b.key, b]));
        setBannerIds({ fresh_food: byKey.fresh_food?.id, adoption: byKey.adoption?.id, daycare: byKey.daycare?.id });
        setFreshFoodImage(byKey.fresh_food?.image || '');
        setAdoptionImage(byKey.adoption?.image || '');
        setDaycareImage(byKey.daycare?.image || '');
      })
      .catch((err) => console.error('Failed to load banners', err));
  }, []);

  // Persist a section banner image by key (create if the doc doesn't exist yet).
  const persistBanner = async (key, image) => {
    if (bannerIds[key]) return updateBannerApi(bannerIds[key], { image });
    const created = await createBannerApi({ key, image, slot: 'Section' });
    setBannerIds((prev) => ({ ...prev, [key]: created.id }));
    return created;
  };

  // Fresh Food Operations
  const handleSaveFreshFoodBanner = async () => {
    try {
      await persistBanner('fresh_food', freshFoodImage);
      showToast('Meals banner updated successfully!');
    } catch { showToast('Failed to update banner'); }
  };

  const handleClearFreshFoodBanner = async () => {
    setFreshFoodImage('');
    try { await persistBanner('fresh_food', ''); } catch { /* ignore */ }
    showToast('Meals banner cleared successfully!');
  };

  const handleFreshFoodUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setFreshFoodImage(event.target.result);
        showToast('Meals image uploaded! Click Save to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Adoption Operations
  const handleSaveAdoptionBanner = async () => {
    try {
      await persistBanner('adoption', adoptionImage);
      showToast('Adoption banner updated successfully!');
    } catch { showToast('Failed to update banner'); }
  };

  const handleClearAdoptionBanner = async () => {
    setAdoptionImage('');
    try { await persistBanner('adoption', ''); } catch { /* ignore */ }
    showToast('Adoption banner cleared successfully!');
  };

  const handleAdoptionUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setAdoptionImage(event.target.result);
        showToast('Adoption image uploaded! Click Save to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Daycare Operations
  const handleSaveDaycareBanner = async () => {
    try {
      await persistBanner('daycare', daycareImage);
      showToast('Daycare banner updated successfully!');
    } catch { showToast('Failed to update banner'); }
  };

  const handleClearDaycareBanner = async () => {
    setDaycareImage('');
    try { await persistBanner('daycare', ''); } catch { /* ignore */ }
    showToast('Daycare banner cleared successfully!');
  };

  const handleDaycareUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setDaycareImage(event.target.result);
        showToast('Daycare image uploaded! Click Save to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1000px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-bold text-gray-800">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Platform Promo Banners Manager</h1>
        <p className="text-[13px] text-gray-500 mt-1">Upload and manage promotional banner graphics for different user dashboards</p>
      </div>

      <div className="space-y-8">
        {/* Card 1: Fresh Food Banner Manager */}
        <div className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>🍲 User Meals Dashboard Banner</span>
          </h2>
          <p className="text-[12px] text-gray-500 mb-4">
            Upload a custom promotional banner graphic for the User Meals/Food plan dashboard.
          </p>

          <div className="mb-6 bg-blue-50 border border-blue-150 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-bold text-blue-900 block">Recommended Banner Size</span>
              <p className="text-[11px] text-blue-700 mt-0.5 font-semibold">
                For perfect fitting, use an image with an aspect ratio of <strong>3:1</strong> (e.g. <strong>900 x 300 pixels</strong>).
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Banner Image Source</label>
                <div className="flex gap-2">
                  <label className="px-4 py-2.5 border border-gray-300 rounded-lg text-[13px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition bg-white shadow-sm shrink-0 flex items-center justify-center gap-1.5">
                    <ImageIcon size={15} />
                    <input type="file" accept="image/*" onChange={handleFreshFoodUpload} className="hidden" />
                    Upload File
                  </label>
                  <input 
                    type="text" 
                    value={(freshFoodImage || '').startsWith('data:image/') ? '[Uploaded Local Image]' : freshFoodImage}
                    onChange={(e) => setFreshFoodImage(e.target.value)}
                    placeholder="Paste image URL / public path (e.g., /assets/banners/banner_food.png)"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm min-w-0 font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 shrink-0">
                {freshFoodImage && (
                  <button 
                    onClick={handleClearFreshFoodBanner}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-[13px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 h-[42px] active:scale-95 bg-white cursor-pointer"
                  >
                    <Trash2 size={15} /> Clear
                  </button>
                )}

                <button 
                  onClick={handleSaveFreshFoodBanner}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 h-[42px] active:scale-95 cursor-pointer"
                >
                  <Save size={15} /> Save Meals Banner
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-[13px] font-bold text-gray-700 mb-3">Live Banner Preview (User Meals Dashboard):</h3>
              <div className="relative max-w-[650px] mx-auto sm:mx-0">
                {freshFoodImage ? (
                  <img src={freshFoodImage} alt="Meals Banner Preview" className="w-full h-auto block rounded-2xl shadow-sm max-h-[220px] object-cover" />
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-[28px] h-40 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50">
                    <ImageIcon size={32} className="stroke-[1.5]" />
                    <span className="text-xs font-semibold">No banner image uploaded or selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Adoption Banner Manager */}
        <div className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>🐕 User Adoption Dashboard Banner</span>
          </h2>
          <p className="text-[12px] text-gray-500 mb-4">
            Upload a custom promotional banner graphic for the User Adoption & Breeds dashboard.
          </p>

          <div className="mb-6 bg-blue-50 border border-blue-150 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-bold text-blue-900 block">Recommended Banner Size</span>
              <p className="text-[11px] text-blue-700 mt-0.5 font-semibold">
                For perfect fitting, use an image with an aspect ratio of <strong>3.2:1</strong> (e.g. <strong>960 x 300 pixels</strong>).
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Banner Image Source</label>
                <div className="flex gap-2">
                  <label className="px-4 py-2.5 border border-gray-300 rounded-lg text-[13px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition bg-white shadow-sm shrink-0 flex items-center justify-center gap-1.5">
                    <ImageIcon size={15} />
                    <input type="file" accept="image/*" onChange={handleAdoptionUpload} className="hidden" />
                    Upload File
                  </label>
                  <input 
                    type="text" 
                    value={(adoptionImage || '').startsWith('data:image/') ? '[Uploaded Local Image]' : adoptionImage}
                    onChange={(e) => setAdoptionImage(e.target.value)}
                    placeholder="Paste image URL / public path (e.g., /assets/banners/banner_food.png)"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm min-w-0 font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 shrink-0">
                {adoptionImage && (
                  <button 
                    onClick={handleClearAdoptionBanner}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-[13px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 h-[42px] active:scale-95 bg-white cursor-pointer"
                  >
                    <Trash2 size={15} /> Clear
                  </button>
                )}

                <button 
                  onClick={handleSaveAdoptionBanner}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 h-[42px] active:scale-95 cursor-pointer"
                >
                  <Save size={15} /> Save Adoption Banner
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-[13px] font-bold text-gray-700 mb-3">Live Banner Preview (User Adoption Dashboard):</h3>
              <div className="relative max-w-[650px] mx-auto sm:mx-0">
                {adoptionImage ? (
                  <img src={adoptionImage} alt="Adoption Banner Preview" className="w-full h-auto block rounded-2xl shadow-sm max-h-[220px] object-cover" />
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-[28px] h-40 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50">
                    <ImageIcon size={32} className="stroke-[1.5]" />
                    <span className="text-xs font-semibold">No banner image uploaded or selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Daycare Banner Manager */}
        <div className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>🐾 User Daycare Dashboard Banner</span>
          </h2>
          <p className="text-[12px] text-gray-500 mb-4">
            Upload a custom promotional banner graphic for the User Daycare dashboard.
          </p>

          <div className="mb-6 bg-blue-50 border border-blue-150 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-bold text-blue-900 block">Recommended Banner Size</span>
              <p className="text-[11px] text-blue-700 mt-0.5 font-semibold">
                For perfect fitting, use an image with an aspect ratio of <strong>3.2:1</strong> (e.g. <strong>960 x 300 pixels</strong>).
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Banner Image Source</label>
                <div className="flex gap-2">
                  <label className="px-4 py-2.5 border border-gray-300 rounded-lg text-[13px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition bg-white shadow-sm shrink-0 flex items-center justify-center gap-1.5">
                    <ImageIcon size={15} />
                    <input type="file" accept="image/*" onChange={handleDaycareUpload} className="hidden" />
                    Upload File
                  </label>
                  <input 
                    type="text" 
                    value={(daycareImage || '').startsWith('data:image/') ? '[Uploaded Local Image]' : daycareImage}
                    onChange={(e) => setDaycareImage(e.target.value)}
                    placeholder="Paste image URL / public path (e.g., /assets/banners/banner_grooming.png)"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm min-w-0 font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 shrink-0">
                {daycareImage && (
                  <button 
                    onClick={handleClearDaycareBanner}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-[13px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 h-[42px] active:scale-95 bg-white cursor-pointer"
                  >
                    <Trash2 size={15} /> Clear
                  </button>
                )}

                <button 
                  onClick={handleSaveDaycareBanner}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 h-[42px] active:scale-95 cursor-pointer"
                >
                  <Save size={15} /> Save Daycare Banner
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-[13px] font-bold text-gray-700 mb-3">Live Banner Preview (User Daycare Dashboard):</h3>
              <div className="relative max-w-[650px] mx-auto sm:mx-0">
                {daycareImage ? (
                  <img src={daycareImage} alt="Daycare Banner Preview" className="w-full h-auto block rounded-2xl shadow-sm max-h-[220px] object-cover" />
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-[28px] h-40 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50">
                    <ImageIcon size={32} className="stroke-[1.5]" />
                    <span className="text-xs font-semibold">No banner image uploaded or selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Shop Banners View */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <ShopBannersView />
      </div>
    </div>
  );
}
