import React, { useState, useEffect } from 'react';
import { Plus, Edit, Check, X, Scissors, Home, Star, MapPin, Eye, Filter, Search } from 'lucide-react';
import { fetchAdminConfig, updateAdminConfig } from '../../../../../services/admin';

export function GroomingDayCare() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('grooming');

  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);

  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState(null);

  const handleSaveFacility = (e) => {
    e.preventDefault();
    setIsFacilityModalOpen(false);
    showToast(editingFacility ? 'Facility updated' : 'Facility added');
    setEditingFacility(null);
  };

  const handleSaveServiceType = (e) => {
    e.preventDefault();
    setIsServiceTypeModalOpen(false);
    showToast(editingServiceType ? 'Service Type updated' : 'Service Type added');
    setEditingServiceType(null);
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [gServices, setGServices] = useState([]);
  const [dPackages, setDPackages] = useState([]);
  const [facilities, setFacilities] = useState([]);

  const load = () => {
    fetchAdminConfig('grooming_service').then(setGServices).catch(() => {});
    fetchAdminConfig('daycare_package').then(setDPackages).catch(() => {});
    fetchAdminConfig('grooming_facility').then(setFacilities).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleStatus = async (id, type) => {
    const list = type === 'grooming' ? gServices : dPackages;
    const setList = type === 'grooming' ? setGServices : setDPackages;
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
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Grooming & Day Care</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage pet grooming and boarding services</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingFacility(null); setIsFacilityModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Facility</span>
          </button>
          <button onClick={() => { setEditingServiceType(null); setIsServiceTypeModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Service Type</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Active Facilities</h3>
          <p className="text-2xl font-semibold text-gray-900">42</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Grooming Bookings MTD</h3>
          <p className="text-2xl font-semibold text-gray-900">892</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Day Care Days MTD</h3>
          <p className="text-2xl font-semibold text-gray-900">1,240</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Avg Rating</h3>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-gray-900">4.6</p>
            <Star size={20} className="text-amber-400 fill-amber-400" />
          </div>
        </div>
      </div>

      {/* Service Types Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden mb-8">
         <div className="border-b border-gray-200 flex items-center px-4">
            <button 
               onClick={() => setActiveTab('grooming')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'grooming' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Scissors size={18} /> Grooming Services
            </button>
            <button 
               onClick={() => setActiveTab('daycare')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'daycare' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Home size={18} /> Day Care / Boarding
            </button>
         </div>

         {activeTab === 'grooming' && (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Service</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Duration</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Base Price</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Commission</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facilities Offering</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {gServices.map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-6 py-4 text-[13px] font-bold text-gray-900">{s.name}</td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{s.duration}</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{s.price}</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-emerald-600">{s.commission}</td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{s.facilities} facilities</td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {s.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => alert("Action triggered: Edit")} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                   Edit
                                 </button>
                                 <div onClick={() => toggleStatus(s.id, 'grooming')} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${s.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${s.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {activeTab === 'daycare' && (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                  <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                     <tr>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Package</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Duration</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Base Price</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Commission</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facilities Offering</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                     {dPackages.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF7F2] transition group">
                           <td className="px-6 py-4 text-[13px] font-bold text-gray-900">{p.name}</td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{p.duration}</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{p.price}</td>
                           <td className="px-6 py-4 text-[13px] font-semibold text-emerald-600">{p.commission}</td>
                           <td className="px-6 py-4 text-[13px] font-medium text-gray-700">{p.facilities} facilities</td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {p.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => alert("Action triggered: Edit")} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                   Edit
                                 </button>
                                 <div onClick={() => toggleStatus(p.id, 'daycare')} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${p.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${p.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
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

      {/* Facilities Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         <div className="p-4 sm:p-5 border-b border-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <h3 className="text-[16px] font-semibold text-gray-900">Partner Facilities</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <div className="relative flex-1 sm:flex-initial">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="Search facilities..." className="w-full pl-9 pr-3 py-2 sm:py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-[#66B4B1]" />
               </div>
               <button onClick={() => showToast("Filters opened")} className="p-2 sm:p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shrink-0"><Filter size={16} className="sm:w-3.5 sm:h-3.5" /></button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Facility Name</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">City</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Rating</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Services</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Active Bookings</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {facilities.map((f) => (
                     <tr key={f.id} className="hover:bg-[#FAF7F2] transition group">
                        <td className="px-6 py-4 text-[13px] font-bold text-gray-900">{f.name}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              <span className="text-[13px] font-medium">{f.city}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-gray-900">
                              <Star size={14} className="text-amber-400 fill-amber-400" />
                              <span className="text-[13px] font-semibold">{f.rating}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex gap-1.5">
                              {f.services.map((srv, i) => (
                                 <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] font-medium">
                                    {srv}
                                 </span>
                              ))}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{f.bookings}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${f.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                             {f.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <button onClick={() => showToast("Navigating to facility details...")} className="p-1.5 text-gray-400 hover:text-[#66B4B1] hover:bg-[#FAF7F2] rounded transition" title="View">
                               <Eye size={16} />
                             </button>
                             <button onClick={() => { setEditingFacility(f); setIsFacilityModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition" title="Edit">
                               <Edit size={16} />
                             </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Facility Modal */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsFacilityModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingFacility ? 'Edit Facility' : 'Add Facility'}</h3>
              <button onClick={() => setIsFacilityModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveFacility} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Facility Name</label>
                    <input required defaultValue={editingFacility?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Happy Paws Grooming" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City / Location</label>
                    <input required defaultValue={editingFacility?.city} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Mumbai" />
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsFacilityModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Type Modal */}
      {isServiceTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsServiceTypeModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingServiceType ? 'Edit Service Type' : 'Add Service Type'}</h3>
              <button onClick={() => setIsServiceTypeModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveServiceType} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Service/Package Name</label>
                    <input required defaultValue={editingServiceType?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Basic Bath" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Duration</label>
                       <input type="text" required defaultValue={editingServiceType?.duration} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="45 mins" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Base Price (₹)</label>
                       <input type="text" required defaultValue={editingServiceType?.price?.replace('₹', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="400" />
                    </div>
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsServiceTypeModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
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
