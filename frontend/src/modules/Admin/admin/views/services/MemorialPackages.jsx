import React, { useState, useEffect } from 'react';
import { Plus, Edit, Check, X, Box, Trees, Flower2, Heart, Image as ImageIcon, Laptop, Settings } from 'lucide-react';
import { fetchAdminConfig, updateAdminConfig } from '../../../../../services/admin';

const ICONS = { Box, Trees, Flower2, Heart, ImageIcon, Laptop };
const renderIcon = (name, props) => {
  const Ico = ICONS[name] || Box;
  return <Ico {...props} />;
};

export function MemorialPackages() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);

  const load = () => {
    fetchAdminConfig('memorial_service').then(setServices).catch(() => {});
    fetchAdminConfig('memorial_package').then(setPackages).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  const handleSaveService = (e) => {
    e.preventDefault();
    setIsServiceModalOpen(false);
    showToast(editingService ? 'Service updated' : 'Service added');
    setEditingService(null);
  };

  const handleSavePackage = (e) => {
    e.preventDefault();
    setIsPackageModalOpen(false);
    showToast(editingPackage ? 'Package updated' : 'Package added');
    setEditingPackage(null);
  };

  const toggleServiceStatus = async (id) => {
    const item = services.find(s => s.id === id);
    if (!item) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setServices(services.map(s => s.id === id ? { ...s, status: newStatus } : s));
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  const togglePackageStatus = async (id) => {
    const item = packages.find(p => p.id === id);
    if (!item) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setPackages(packages.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative font-sans">
      
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-[#5A5552] text-white flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-semibold text-slate-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-medium text-slate-800 tracking-tight">Memorial Packages</h1>
          <p className="text-[14px] text-slate-500 mt-1">Compassionate end-of-life services</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[12px] sm:text-[13px] font-medium rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Service</span>
          </button>
          <button onClick={() => { setEditingPackage(null); setIsPackageModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#5A5552] hover:bg-[#5A5552] text-white text-[12px] sm:text-[13px] font-medium rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Build Package</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-[13px] text-slate-500 mb-1 font-medium">Total Providers</h3>
          <p className="text-2xl font-semibold text-slate-800">12</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-[13px] text-slate-500 mb-1 font-medium">Requests This Month</h3>
          <p className="text-2xl font-semibold text-slate-800">34</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-[13px] text-slate-500 mb-1 font-medium">Completed</h3>
          <p className="text-2xl font-semibold text-slate-800">31</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-[13px] text-slate-500 mb-1 font-medium">Revenue MTD</h3>
          <p className="text-2xl font-semibold text-slate-800">₹68,000</p>
        </div>
      </div>

      {/* Service Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
         {services.map(s => (
            <div key={s.id} className="bg-[#FAF7F2] rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col hover:border-slate-300 transition">
               <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                     {renderIcon(s.iconName, { size: 24, className: s.iconColor })}
                  </div>
                  <h3 className="text-[16px] font-medium text-slate-800">{s.name}</h3>
               </div>
               
               <p className="text-[13px] text-slate-500 leading-relaxed mb-6 flex-1">{s.desc}</p>
               
               <div className="space-y-3 mb-6 bg-white p-4 rounded-lg border border-slate-100">
                 <div className="flex justify-between">
                   <span className="text-[13px] text-slate-500 font-medium">Requests MTD</span>
                   <span className="text-[13px] font-semibold text-slate-800">{s.requests}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-slate-500 font-medium">Avg Price</span>
                   <span className="text-[13px] font-semibold text-slate-800">{s.avgPrice}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-slate-500 font-medium">Commission</span>
                   <span className="text-[13px] font-semibold text-slate-800">{s.commission}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-slate-500 font-medium">Providers</span>
                   <span className="text-[13px] font-semibold text-slate-800">{s.providers}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                     <span className="text-[12px] font-medium text-slate-500">Status:</span>
                     <div className="flex items-center gap-1.5">
                       <span className={`w-2 h-2 rounded-full ${s.status === 'Active' ? 'bg-[#5A5552]' : 'bg-slate-300'}`}></span>
                       <span className="text-[13px] font-medium text-slate-700">{s.status}</span>
                     </div>
                     <div onClick={() => toggleServiceStatus(s.id)} className={`w-8 h-4 rounded-full relative cursor-pointer ml-2 transition-colors ${s.status === 'Active' ? 'bg-[#5A5552]' : 'bg-slate-300'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${s.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                     </div>
                  </div>
                  <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-[12px] font-medium hover:bg-slate-50 transition">
                    Edit Service
                  </button>
               </div>
            </div>
         ))}
      </div>

      {/* Package Builder and Pricing Rules */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        
        {/* Package Builder */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
           <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-slate-800">Memorial Packages</h3>
              <button onClick={() => { setEditingPackage(null); setIsPackageModalOpen(true); }} className="text-[13px] font-medium text-[#5A5552] hover:text-[#5A5552] flex items-center gap-1 transition">
                 <Plus size={16} /> Build Package
              </button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-slate-200">
                   <tr>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Package Name</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Services Included</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Individual Price</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Package Price</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Savings</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Bookings</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-4 text-[12px] font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {packages.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                         <td className="px-5 py-4 text-[14px] font-medium text-slate-800">{p.name}</td>
                         <td className="px-5 py-4 text-[13px] text-slate-600">{p.services}</td>
                         <td className="px-5 py-4 text-[13px] text-slate-500 line-through">{p.indPrice}</td>
                         <td className="px-5 py-4 text-[14px] font-semibold text-slate-800">{p.pkgPrice}</td>
                         <td className="px-5 py-4 text-[13px] font-medium text-[#66B4B1]">{p.savings}</td>
                         <td className="px-5 py-4 text-[13px] text-slate-700">{p.bookings} bookings</td>
                         <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${p.status === 'Active' ? 'bg-[#FAF7F2] text-[#5A5552]' : 'bg-slate-100 text-slate-500'}`}>
                              {p.status}
                            </span>
                         </td>
                         <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => { setEditingPackage(p); setIsPackageModalOpen(true); }} className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded text-[12px] font-medium transition">
                                 Edit
                               </button>
                               <div onClick={() => togglePackageStatus(p.id)} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${p.status === 'Active' ? 'bg-[#5A5552]' : 'bg-slate-300'}`}>
                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${p.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                               </div>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Pricing Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
           <div className="p-6 border-b border-slate-200 flex items-center gap-2">
              <Settings size={18} className="text-slate-500" />
              <h3 className="text-[14px] font-medium text-slate-800 tracking-wider uppercase">Pricing & Surcharge Rules</h3>
           </div>
           <div className="p-6 space-y-6 bg-[#FAF7F2] rounded-b-xl">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[14px] font-medium text-slate-700">Distance surcharge beyond 10km</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[14px] text-slate-500">₹</span>
                    <input type="number" defaultValue={50} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-[#5A5552] bg-white" />
                    <span className="text-[13px] text-slate-500">/km</span>
                 </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                 <div>
                    <p className="text-[14px] font-medium text-slate-700">Same-day urgency fee</p>
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">₹</span>
                    <input type="number" defaultValue={500} className="w-24 pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-[#5A5552] bg-white" />
                 </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                 <div>
                    <p className="text-[14px] font-medium text-slate-700">Platform commission (standard)</p>
                 </div>
                 <div className="relative">
                    <input type="number" defaultValue={8} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-[#5A5552] bg-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">%</span>
                 </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                 <div>
                    <p className="text-[14px] font-medium text-slate-700">Digital page commission</p>
                 </div>
                 <div className="relative">
                    <input type="number" defaultValue={5} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-[#5A5552] bg-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">%</span>
                 </div>
              </div>
              
              <div className="pt-4">
                 <button onClick={() => showToast('Pricing rules saved')} className="w-full py-3 bg-[#5A5552] text-white rounded-lg text-[14px] font-medium hover:bg-[#5A5552] transition shadow-sm">
                    Save Pricing Rules
                 </button>
              </div>
           </div>
        </div>

      </div>

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsServiceModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveService} className="space-y-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Service Name</label>
                    <input required defaultValue={editingService?.name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="e.g. Burial Service" />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                    <textarea required defaultValue={editingService?.desc} rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition resize-none" placeholder="Short description..."></textarea>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Avg Price (₹)</label>
                       <input type="text" required defaultValue={editingService?.avgPrice?.replace('₹', '')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="2800" />
                    </div>
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Commission (%)</label>
                       <input type="text" required defaultValue={editingService?.commission?.replace('%', '')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="8" />
                    </div>
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsServiceModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#5A5552] hover:bg-[#5A5552] rounded-xl text-sm font-semibold text-white shadow-sm shadow-[#5A5552]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsPackageModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">{editingPackage ? 'Edit Package' : 'Build Package'}</h3>
              <button onClick={() => setIsPackageModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSavePackage} className="space-y-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Package Name</label>
                    <input required defaultValue={editingPackage?.name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="e.g. Basic Farewell" />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Services Included</label>
                    <input required defaultValue={editingPackage?.services} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="e.g. Burial + Memory Kit" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Package Price (₹)</label>
                       <input type="text" required defaultValue={editingPackage?.pkgPrice?.replace('₹', '')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="3400" />
                    </div>
                    <div>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Savings</label>
                       <input type="text" required defaultValue={editingPackage?.savings?.replace('Save ₹', '')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#5A5552]/20 focus:border-[#5A5552] transition" placeholder="200" />
                    </div>
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsPackageModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#5A5552] hover:bg-[#5A5552] rounded-xl text-sm font-semibold text-white shadow-sm shadow-[#5A5552]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
