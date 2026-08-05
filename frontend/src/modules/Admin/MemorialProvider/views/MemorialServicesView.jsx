import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { Leaf, Plus, MoreVertical, Check, X, Clock, MapPin, Users } from 'lucide-react';

export function MemorialServicesView() {
  const { services, addService, updateService, removeService } = useMemorialProvider();
  const [showAddService, setShowAddService] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showEditService, setShowEditService] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Burial',
    price: '',
    description: '',
    duration: '',
    distance: '',
    staff: 1
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Memorial Services</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Configure the core services you offer to grieving pet parents.</p>
        </div>
        <button 
          onClick={() => setShowAddService(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg cursor-pointer"
        >
          <Plus size={18} /> Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {services.map(service => (
          <div key={service.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition group relative ${activeDropdown === service.id ? 'z-50' : 'z-10'}`}>
            <div className="p-6 border-b border-slate-50 relative">
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === service.id ? null : service.id)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>

                {activeDropdown === service.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => {
                        setEditFormData({...service, price: service.price.replace('₹', '')}); // Strip formatting for edit
                        setShowEditService(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Edit Service
                    </button>
                    <button 
                      onClick={() => {
                        updateService(service.id, { status: service.status === 'Active' ? 'Inactive' : 'Active' });
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Mark as {service.status === 'Active' ? 'Inactive' : 'Active'}
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button 
                      onClick={() => {
                        removeService(service.id);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      Delete Service
                    </button>
                  </div>
                )}
              </div>
              <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded mb-3">
                {service.category}
              </span>
              <h3 className="text-lg font-black text-slate-900 mb-2 pr-10">{service.name}</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed min-h-[40px]">{service.description}</p>
            </div>
            
            <div className="p-6 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-emerald-600">{service.price}</p>
                <div className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${service.status === 'Active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                  {service.status === 'Active' ? <Check size={12}/> : <X size={12}/>}
                  {service.status}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                  <Clock size={14} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">{service.duration}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                  <MapPin size={14} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">{service.distance}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                  <Users size={14} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">{service.staff} Staff</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-900">Add Memorial Service</h3>
              <button onClick={() => setShowAddService(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Premium Burial Service" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                    <option>Burial</option>
                    <option>Grave Preparation</option>
                    <option>Cremation Support</option>
                    <option>Tree Plantation</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Base Price (₹)</label>
                  <input type="text" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} placeholder="4500" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" placeholder="Describe the service details respectfully..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                  <input type="text" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 2 Hours" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Distance Limit</label>
                  <input type="text" value={formData.distance} onChange={(e) => setFormData({...formData, distance: e.target.value})} placeholder="e.g. 15 km" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Staff Required</label>
                  <input type="number" value={formData.staff} onChange={(e) => setFormData({...formData, staff: Number(e.target.value)})} placeholder="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 sticky bottom-0 z-10">
              <button onClick={() => setShowAddService(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (formData.name) {
                    addService({ ...formData, price: `₹${formData.price}` });
                    setShowAddService(false);
                    setFormData({ name: '', category: 'Burial', price: '', description: '', duration: '', distance: '', staff: 1 });
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditService && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-900">Edit Memorial Service</h3>
              <button onClick={() => setShowEditService(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Name</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                  <select value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                    <option>Burial</option>
                    <option>Grave Preparation</option>
                    <option>Cremation Support</option>
                    <option>Tree Plantation</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Base Price (₹)</label>
                  <input type="text" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea value={editFormData.description} onChange={(e) => setEditFormData({...editFormData, description: e.target.value})} rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                  <input type="text" value={editFormData.duration} onChange={(e) => setEditFormData({...editFormData, duration: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Distance Limit</label>
                  <input type="text" value={editFormData.distance} onChange={(e) => setEditFormData({...editFormData, distance: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Staff Required</label>
                  <input type="number" value={editFormData.staff} onChange={(e) => setEditFormData({...editFormData, staff: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 sticky bottom-0 z-10">
              <button onClick={() => setShowEditService(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editFormData.name) {
                    updateService(editFormData.id, { ...editFormData, price: `₹${editFormData.price}` });
                    setShowEditService(false);
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
