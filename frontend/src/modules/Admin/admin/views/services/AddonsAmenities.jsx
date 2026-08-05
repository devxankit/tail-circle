import React, { useState, useEffect } from 'react';
import { Plus, Edit, Check, X, Settings, Truck, Utensils, Camera, BedDouble, Activity, Ship, Snowflake, Stethoscope, Video, Move, Goal, Building2 } from 'lucide-react';
import { fetchAdminConfig, updateAdminConfig } from '../../../../../services/admin';

const ICONS = { Truck, Utensils, Camera, BedDouble, Activity, Ship, Snowflake, Stethoscope, Video, Move, Goal };
const renderIcon = (name, props) => {
  const Ico = ICONS[name] || Settings;
  return <Ico {...props} />;
};

export function AddonsAmenities() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('addons');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [addons, setAddons] = useState([]);
  const [amenities, setAmenities] = useState([]);

  const load = () => {
    fetchAdminConfig('service_addon').then(setAddons).catch(() => {});
    fetchAdminConfig('facility_amenity').then(setAmenities).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);

  const handleSaveCategory = (e) => {
    e.preventDefault();
    setIsCategoryModalOpen(false);
    showToast(editingCategory ? 'Add-on Category updated' : 'Add-on Category added');
    setEditingCategory(null);
  };

  const handleSaveAmenity = (e) => {
    e.preventDefault();
    setIsAmenityModalOpen(false);
    showToast(editingAmenity ? 'Amenity updated' : 'Amenity added');
    setEditingAmenity(null);
  };

  const toggleStatus = async (id, type) => {
    const list = type === 'addons' ? addons : amenities;
    const setList = type === 'addons' ? setAddons : setAmenities;
    const item = list.find(x => x.id === id);
    if (!item) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setList(list.map(x => x.id === id ? { ...x, status: newStatus } : x));
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Add-ons & Amenities</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage extra services and facility features</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Category</span>
          </button>
          <button onClick={() => { setEditingAmenity(null); setIsAmenityModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Amenity</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden mb-8">
         <div className="border-b border-gray-200 flex items-center px-4">
            <button 
               onClick={() => setActiveTab('addons')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'addons' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Settings size={18} /> Service Add-ons
            </button>
            <button 
               onClick={() => setActiveTab('amenities')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'amenities' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Building2 size={18} /> Facility Amenities
            </button>
         </div>

         {activeTab === 'addons' && (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Add-on Name</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Applicable Services</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Base Price</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Providers Offering</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Used MTD</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {addons.map((a) => (
                        <tr key={a.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                                    {renderIcon(a.iconName, { size: 16 })}
                                 </div>
                                 <span className="text-[13px] font-bold text-gray-900">{a.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex gap-1.5 flex-wrap">
                                 {a.services.map((srv, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] font-medium">
                                       {srv}
                                    </span>
                                 ))}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{a.price}</td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{a.providers} providers</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{a.used} times</td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {a.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => alert("Action triggered: Edit")} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                   Edit
                                 </button>
                                 <div onClick={() => toggleStatus(a.id, 'addons')} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${a.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${a.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {activeTab === 'amenities' && (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Amenity Name</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facilities with Amenity</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {amenities.map((a) => (
                        <tr key={a.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                                    {renderIcon(a.iconName, { size: 16 })}
                                 </div>
                                 <span className="text-[13px] font-bold text-gray-900">{a.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{a.category}</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{a.facilities} facilities</td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {a.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => alert("Action triggered: Edit")} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                   Edit
                                 </button>
                                 <div onClick={() => toggleStatus(a.id, 'amenities')} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${a.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${a.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveCategory} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Add-on Name</label>
                    <input required defaultValue={editingCategory?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Pick & Drop" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Applicable Services</label>
                    <input required defaultValue={editingCategory?.services?.join(', ')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Day Care, Grooming" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Base Price (₹)</label>
                    <input type="text" required defaultValue={editingCategory?.price} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. 200 - 500" />
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Amenity Modal */}
      {isAmenityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsAmenityModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingAmenity ? 'Edit Amenity' : 'Add Amenity'}</h3>
              <button onClick={() => setIsAmenityModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveAmenity} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Amenity Name</label>
                    <input required defaultValue={editingAmenity?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Swimming Pool" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                    <input required defaultValue={editingAmenity?.category} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Recreation" />
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsAmenityModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
