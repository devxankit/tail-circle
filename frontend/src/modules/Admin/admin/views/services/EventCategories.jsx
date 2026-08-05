import React, { useState, useEffect } from 'react';
import { Plus, Edit, Settings, Check, Cake, HeartHandshake, Dumbbell, Trophy, Users, X, ShoppingBag, Camera, Paintbrush, Scissors, Gift, Shirt } from 'lucide-react';
import { fetchAdminConfig, updateAdminConfig, deleteAdminConfig } from '../../../../../services/admin';

const ICONS = { Cake, HeartHandshake, Dumbbell, Trophy, Users, ShoppingBag, Camera, Paintbrush, Scissors, Gift, Shirt };
const renderIcon = (name, props) => {
  const Ico = ICONS[name] || Cake;
  return <Ico {...props} />;
};

export function EventCategories() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [categories, setCategories] = useState([]);
  const [addons, setAddons] = useState([]);
  const [pending, setPending] = useState([]);

  const load = () => {
    fetchAdminConfig('event_category').then(setCategories).catch(() => {});
    fetchAdminConfig('event_addon').then(setAddons).catch(() => {});
    fetchAdminConfig('event_pending').then(setPending).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);

  const handleSaveCategory = (e) => {
    e.preventDefault();
    setIsCategoryModalOpen(false);
    showToast(editingCategory ? 'Category updated' : 'Category added');
    setEditingCategory(null);
  };

  const handleSaveAddon = (e) => {
    e.preventDefault();
    setIsAddonModalOpen(false);
    showToast(editingAddon ? 'Add-on updated' : 'Add-on added');
    setEditingAddon(null);
  };

  const toggleCategoryStatus = async (id) => {
    const item = categories.find(c => c.id === id);
    if (!item) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setCategories(categories.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  const toggleAddonStatus = async (id) => {
    const item = addons.find(a => a.id === id);
    if (!item) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setAddons(addons.map(a => a.id === id ? { ...a, status: newStatus } : a));
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  const handleApproval = async (id, action) => {
    setPending(pending.filter(p => p.id !== id));
    showToast(`Event ${action}d successfully`);
    try { await deleteAdminConfig(id); } catch { load(); }
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
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Event Categories</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage event types and add-ons</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingAddon(null); setIsAddonModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Add-on</span>
          </button>
          <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Category</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Total Event Categories</h3>
          <p className="text-2xl font-semibold text-gray-900">5</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Events This Month</h3>
          <p className="text-2xl font-semibold text-gray-900">38</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Total Bookings MTD</h3>
          <p className="text-2xl font-semibold text-gray-900">1,240</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Event Revenue MTD</h3>
          <p className="text-2xl font-semibold text-emerald-600">₹3,28,000</p>
        </div>
      </div>

      {/* Event Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
         {categories.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm flex flex-col">
               <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                     {renderIcon(c.iconName, { size: 24, className: c.iconColor })}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900">{c.name}</h3>
                  </div>
               </div>
               
               <p className="text-[12px] text-gray-500 leading-relaxed mb-6 flex-1">{c.desc}</p>
               
               <div className="space-y-3 mb-6">
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500 flex items-center gap-2">📅 Events this month</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.events}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500 flex items-center gap-2">🎫 Total bookings</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.bookings}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500 flex items-center gap-2">💰 Revenue MTD</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.revenue}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500 flex items-center gap-2">🏪 Active organizers</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.organizers}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                     <span className="text-[12px] font-medium text-gray-500">Status:</span>
                     <div className="flex items-center gap-1.5">
                       <span className={`w-2 h-2 rounded-full ${c.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-400'}`}></span>
                       <span className="text-[13px] font-semibold text-gray-900">{c.status}</span>
                     </div>
                     <div onClick={() => toggleCategoryStatus(c.id)} className={`w-8 h-4 rounded-full relative cursor-pointer ml-2 transition-colors ${c.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${c.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true); }} className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded text-[12px] font-semibold hover:bg-gray-50 transition">
                      Edit
                    </button>
                    <button onClick={() => showToast('Navigating to events...')} className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded text-[12px] font-semibold hover:bg-gray-100 transition">
                      View Events
                    </button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        
        {/* Add-on Services Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col h-fit">
           <div className="p-5 border-b border-[#FAF7F2] flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-gray-900">Event Add-on Services</h3>
              <button onClick={() => { setEditingAddon(null); setIsAddonModalOpen(true); }} className="text-[13px] font-semibold text-[#66B4B1] hover:underline flex items-center gap-1">
                 <Plus size={14} /> Add Add-on
              </button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                   <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Add-on</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase text-center">Icon</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Price Range</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Vendors Offering</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Used MTD</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Revenue MTD</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                   {addons.map((a) => (
                      <tr key={a.id} className="hover:bg-[#FAF7F2] transition group">
                         <td className="px-4 py-4 text-[13px] font-bold text-gray-900">{a.name}</td>
                         <td className="px-4 py-4">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 mx-auto">
                               {renderIcon(a.iconName, { size: 16 })}
                            </div>
                         </td>
                         <td className="px-4 py-4 text-[13px] font-medium text-gray-700">{a.price}</td>
                         <td className="px-4 py-4 text-[13px] font-medium text-gray-700">{a.vendors} vendors</td>
                         <td className="px-4 py-4 text-[13px] font-semibold text-gray-900">{a.used} used</td>
                         <td className="px-4 py-4 text-[13px] font-semibold text-gray-900">{a.revenue}</td>
                         <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                              {a.status}
                            </span>
                         </td>
                         <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => { setEditingAddon(a); setIsAddonModalOpen(true); }} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                 Edit
                               </button>
                               <div onClick={() => toggleAddonStatus(a.id)} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${a.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${a.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                               </div>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Pending Event Approvals */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 sm:p-5 shadow-sm h-fit">
           <h3 className="text-[14px] font-bold text-amber-900 mb-4">{pending.length} events waiting for admin approval</h3>
           
           <div className="space-y-3 max-h-[380px] sm:max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {pending.map(p => (
                 <div key={p.id} className="bg-white rounded-lg p-4 shadow-sm border border-amber-100 shrink-0">
                    <h4 className="text-[13px] font-bold text-gray-900 mb-1">{p.name}</h4>
                    <p className="text-[11px] text-gray-500 mb-3">By {p.organizer}</p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Date</p>
                         <p className="text-[12px] font-medium text-gray-800">{p.date}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Capacity</p>
                         <p className="text-[12px] font-medium text-gray-800">{p.capacity}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Fee</p>
                         <p className="text-[12px] font-medium text-gray-800">{p.fee}</p>
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                       <button onClick={() => handleApproval(p.id, 'Approve')} className="flex-1 py-1.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded text-[12px] font-semibold transition">
                         Approve
                       </button>
                       <button onClick={() => handleApproval(p.id, 'Reject')} className="flex-1 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[12px] font-semibold transition">
                         Reject
                       </button>
                    </div>
                 </div>
              ))}
              
              {pending.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-[13px]">
                   No pending events.
                </div>
              )}
           </div>
        </div>

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
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category Name</label>
                    <input required defaultValue={editingCategory?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Pet Birthday" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                    <textarea required defaultValue={editingCategory?.desc} rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition resize-none" placeholder="Short description about the event category..."></textarea>
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

      {/* Add-on Modal */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsAddonModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingAddon ? 'Edit Add-on' : 'Add Add-on'}</h3>
              <button onClick={() => setIsAddonModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveAddon} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Add-on Name</label>
                    <input required defaultValue={editingAddon?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Photography" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Price Range</label>
                    <input required defaultValue={editingAddon?.price} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. ₹1,500–₹5,000" />
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsAddonModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
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
