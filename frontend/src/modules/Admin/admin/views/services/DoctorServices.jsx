import React, { useState, useEffect } from 'react';
import { Plus, Edit, Settings, Check, X, Building2, Home, Video, AlertCircle, HeartPulse, Microscope, Scissors, Salad, Activity, Key } from 'lucide-react';
import { fetchAdminConfig, updateAdminConfig } from '../../../../../services/admin';

const ICONS = { Building2, Home, Video, AlertCircle, HeartPulse, Microscope, Scissors, Salad, Activity };
const renderIcon = (name, props) => {
  const Ico = ICONS[name] || Activity;
  return <Ico {...props} />;
};

export function DoctorServices() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [consultations, setConsultations] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  const load = () => {
    fetchAdminConfig('doctor_consultation').then(setConsultations).catch(() => {});
    fetchAdminConfig('doctor_specialization').then(setSpecializations).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const handleSaveSpec = (e) => {
    e.preventDefault();
    setIsSpecModalOpen(false);
    showToast(editingSpec ? 'Specialization updated' : 'Specialization added');
    setEditingSpec(null);
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    setIsServiceModalOpen(false);
    showToast(editingService ? 'Service type updated' : 'Service type added');
    setEditingService(null);
  };

  const toggleStatus = async (id, type) => {
    const list = type === 'consultation' ? consultations : specializations;
    const setList = type === 'consultation' ? setConsultations : setSpecializations;
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
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Doctor Services</h1>
          <p className="text-[13px] text-gray-500 mt-1">Consultation types & specializations</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button onClick={() => { setEditingSpec(null); setIsSpecModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Specialization</span>
          </button>
          <button onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }} className="flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[12px] sm:text-[13px] font-semibold rounded-lg transition shadow-sm leading-tight text-center">
            <Plus size={16} className="shrink-0" /> <span className="truncate">Add Service Type</span>
          </button>
        </div>
      </div>

      {/* Today's Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center relative shrink-0">
              <Video size={18} className="text-blue-500 sm:w-5 sm:h-5 w-[18px] h-[18px]" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
           </div>
           <div>
             <h3 className="text-[10px] sm:text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Active Calls</h3>
             <p className="text-lg sm:text-2xl font-black text-gray-900">14</p>
           </div>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-50 flex items-center justify-center relative shrink-0">
              <AlertCircle size={18} className="text-red-500 sm:w-5 sm:h-5 w-[18px] h-[18px]" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
           </div>
           <div>
             <h3 className="text-[10px] sm:text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Emergencies</h3>
             <p className="text-lg sm:text-2xl font-black text-gray-900">3</p>
           </div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-row items-center justify-center sm:justify-start text-left gap-3 sm:gap-4">
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-amber-500 sm:w-5 sm:h-5 w-[18px] h-[18px]" />
           </div>
           <div>
             <h3 className="text-[11px] sm:text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Avg Wait Time</h3>
             <p className="text-xl sm:text-2xl font-black text-gray-900">4.2 min</p>
           </div>
        </div>
      </div>

      {/* Consultation Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         {consultations.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm">
               <div className="mb-4 bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                  {renderIcon(c.iconName, { size: 32, className: c.iconColor })}
               </div>
               <h3 className="text-[16px] font-bold text-gray-900 mb-4">{c.type}</h3>
               
               <div className="space-y-3 mb-6">
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500">Sessions MTD</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.sessions}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500">Avg fee</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.avgFee}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500">Commission</span>
                   <span className="text-[13px] font-semibold text-gray-900">{c.commission}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[13px] text-gray-500">Surcharge</span>
                   <span className={`text-[13px] font-semibold ${c.surcharge === 'N/A' ? 'text-gray-400' : 'text-amber-600'}`}>{c.surcharge}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                     <span className="text-[12px] font-medium text-gray-500">Status:</span>
                     <div className="flex items-center gap-1.5">
                       <span className={`w-2 h-2 rounded-full ${c.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-400'}`}></span>
                       <span className="text-[13px] font-semibold text-gray-900">{c.status}</span>
                     </div>
                  </div>
                  <button onClick={() => { setEditingService(c); setIsServiceModalOpen(true); }} className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded text-[12px] font-semibold hover:bg-gray-50 transition">
                    Edit
                  </button>
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Specializations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
           <div className="p-5 border-b border-[#FAF7F2] flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-gray-900">Specializations</h3>
              <button onClick={() => { setEditingSpec(null); setIsSpecModalOpen(true); }} className="text-[13px] font-semibold text-[#66B4B1] hover:underline flex items-center gap-1">
                 <Plus size={14} /> Add
              </button>
           </div>
           <div className="flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                   <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase w-12 text-center">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Specialization</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Doctors</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Avg Fee</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Avg Rating</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Commission</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                   {specializations.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-[#FAF7F2] transition group">
                         <td className="px-4 py-4 text-center text-[12px] font-medium text-gray-400">{idx + 1}</td>
                         <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                                  {renderIcon(s.iconName, { size: 16 })}
                               </div>
                               <span className="text-[13px] font-bold text-gray-900">{s.name}</span>
                            </div>
                         </td>
                         <td className="px-4 py-4 text-[13px] font-medium text-gray-700">{s.doctors} doctors</td>
                         <td className="px-4 py-4 text-[13px] font-semibold text-gray-900">{s.avgFee}</td>
                         <td className="px-4 py-4">
                            <span className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                               ★ {s.rating}
                            </span>
                         </td>
                         <td className="px-4 py-4 text-[13px] font-semibold text-emerald-600">{s.commission}</td>
                         <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                              {s.status}
                            </span>
                         </td>
                         <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => { setEditingSpec(s); setIsSpecModalOpen(true); }} className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                                 Edit
                               </button>
                               <div onClick={() => toggleStatus(s.id, 'specialization')} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${s.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${s.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                               </div>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Fee Configuration Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2]">
           <div className="p-5 border-b border-[#FAF7F2] flex items-center gap-2">
              <Settings size={18} className="text-gray-500" />
              <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">PLATFORM CONFIGURATION</h3>
           </div>
           <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Emergency surcharge</p>
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">₹</span>
                    <input type="number" defaultValue={300} className="w-24 pl-6 pr-2 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Home visit surcharge</p>
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">₹</span>
                    <input type="number" defaultValue={150} className="w-24 pl-6 pr-2 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Platform commission</p>
                 </div>
                 <div className="relative">
                    <input type="number" defaultValue={12} className="w-24 px-3 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">%</span>
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Emergency commission</p>
                 </div>
                 <div className="relative">
                    <input type="number" defaultValue={15} className="w-24 px-3 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">%</span>
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Emergency SLA match</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <input type="number" defaultValue={60} className="w-20 px-3 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                    <span className="text-[12px] text-gray-500">sec</span>
                 </div>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                 <div>
                    <p className="text-[13px] font-medium text-gray-700">Doctor response SLA</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <input type="number" defaultValue={5} className="w-20 px-3 py-1.5 border border-gray-300 rounded text-[13px] focus:border-[#66B4B1] outline-none" />
                    <span className="text-[12px] text-gray-500">min</span>
                 </div>
              </div>
              <button onClick={() => showToast('Configuration saved')} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-[13px] font-semibold hover:bg-gray-800 transition">
                 Save Configuration
              </button>
           </div>
        </div>

      </div>

      {/* Specialization Modal */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsSpecModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingSpec ? 'Edit Specialization' : 'Add Specialization'}</h3>
              <button onClick={() => setIsSpecModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveSpec} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Specialization Name</label>
                    <input required defaultValue={editingSpec?.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Dentistry" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Avg Fee (₹)</label>
                       <input type="text" required defaultValue={editingSpec?.avgFee?.replace('₹', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Commission (%)</label>
                       <input type="text" required defaultValue={editingSpec?.commission?.replace('%', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="10" />
                    </div>
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsSpecModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] rounded-xl text-sm font-bold text-white shadow-sm shadow-[#66B4B1]/20 transition">Save Changes</button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Type Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setIsServiceModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100/50">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingService ? 'Edit Service Type' : 'Add Service Type'}</h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <form onSubmit={handleSaveService} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Service Type Name</label>
                    <input required defaultValue={editingService?.type} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. Chat Consultation" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Avg Fee (₹)</label>
                       <input type="text" required defaultValue={editingService?.avgFee?.replace('₹', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Commission (%)</label>
                       <input type="text" required defaultValue={editingService?.commission?.replace('%', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="10" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Surcharge</label>
                    <input type="text" defaultValue={editingService?.surcharge === 'N/A' ? '' : editingService?.surcharge?.replace('+ ₹', '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition" placeholder="e.g. 150 (Leave empty for N/A)" />
                 </div>
                 <div className="pt-6 pb-8 sm:pb-2 flex gap-3 shrink-0">
                    <button type="button" onClick={() => setIsServiceModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
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
