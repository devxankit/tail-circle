import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Info, FileText } from 'lucide-react';

export function CreateRequestModal({ isOpen, onClose, onSave, services, addons }) {
  const [formData, setFormData] = useState({
    customerName: '',
    petName: '',
    serviceType: services[0]?.name || 'Burial Service',
    location: '',
    preferredDate: '',
    preferredTime: '',
    urgency: 'Normal',
    notes: '',
    selectedAddons: []
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddonToggle = (addonName) => {
    setFormData(prev => {
      const isSelected = prev.selectedAddons.includes(addonName);
      if (isSelected) {
        return { ...prev, selectedAddons: prev.selectedAddons.filter(a => a !== addonName) };
      } else {
        return { ...prev, selectedAddons: [...prev.selectedAddons, addonName] };
      }
    });
  };

  const handleSave = () => {
    if (!formData.customerName || !formData.petName || !formData.location || !formData.preferredDate) {
      alert('Please fill out all required fields.');
      return;
    }

    onSave({
      customerName: formData.customerName,
      petName: formData.petName,
      serviceType: formData.serviceType,
      location: formData.location,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime || 'TBD',
      urgency: formData.urgency,
      notes: formData.notes,
      addons: formData.selectedAddons
    });
    
    // Reset form
    setFormData({
      customerName: '',
      petName: '',
      serviceType: services[0]?.name || 'Burial Service',
      location: '',
      preferredDate: '',
      preferredTime: '',
      urgency: 'Normal',
      notes: '',
      selectedAddons: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900">New Service Request</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Manually log a new customer request.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* Customer & Pet Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2"><User size={16}/> Customer Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Name *</label>
                <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="e.g. John Doe" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pet Name & Breed *</label>
                <input required type="text" name="petName" value={formData.petName} onChange={handleChange} placeholder="e.g. Max (Golden Retriever)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2"><Info size={16}/> Service Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Type *</label>
                <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Urgency</label>
                <select name="urgency" value={formData.urgency} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  <option value="Normal">Normal</option>
                  <option value="Priority">Priority</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Location *</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Koramangala Phase 1" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preferred Date *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preferred Time</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="time" name="preferredTime" value={formData.preferredTime} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Add-ons */}
          {addons.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">Optional Memory Add-ons</h4>
              <div className="flex flex-col gap-2">
                {addons.filter(a => a.status === 'Active').map(addon => (
                  <label key={addon.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input 
                      type="checkbox" 
                      checked={formData.selectedAddons.includes(addon.name)}
                      onChange={() => handleAddonToggle(addon.name)}
                      className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 border-slate-300 cursor-pointer" 
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{addon.name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{addon.price}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2"><FileText size={16}/> Customer Notes</h4>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Any specific requirements or respectful considerations..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
          </div>

        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 bg-white sticky bottom-0 z-10">
          <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer">
            Create Request
          </button>
        </div>
      </div>
    </div>
  );
}
