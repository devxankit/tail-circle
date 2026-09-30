import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Info, FileText } from 'lucide-react';
import { BottomSheet } from '../../vendor/mobile/BottomSheet';
import { PrimaryButton } from '../../vendor/mobile/StickyActionBar';
import { Checkbox, FieldPair, fieldClass, textareaClass, labelClass } from '../../vendor/mobile/Field';
import { useVendorToast } from '../../vendor/mobile/toastContext';

/**
 * Manually log a customer request — a full-screen sheet in the partner app,
 * opened from the Requests tab.
 */
export function CreateRequestModal({ isOpen, onClose, onSave, services, addons }) {
  const { addToast } = useVendorToast();
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
      addToast({ message: 'Please fill out all required fields.', type: 'warning' });
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

  const iconField = `${fieldClass} pl-11`;

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      fullScreen
      title="New Service Request"
      subtitle="Manually log a new customer request."
      footer={(
        <div className="flex gap-2">
          <PrimaryButton tone="soft" className="flex-none px-5" onClick={onClose}>Cancel</PrimaryButton>
          <PrimaryButton tone="dark" onClick={handleSave}>Create Request</PrimaryButton>
        </div>
      )}
    >
      <div className="space-y-6 pb-4">

        {/* Customer & Pet Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-text-primary flex items-center gap-2 border-b border-border-light pb-2"><User size={16}/> Customer Details</h4>
          <div>
            <label className={labelClass}>Customer Name *</label>
            <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="e.g. John Doe" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Pet Name & Breed *</label>
            <input required type="text" name="petName" value={formData.petName} onChange={handleChange} placeholder="e.g. Max (Golden Retriever)" className={fieldClass} />
          </div>
        </div>

        {/* Service Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-text-primary flex items-center gap-2 border-b border-border-light pb-2"><Info size={16}/> Service Details</h4>

          <div>
            <label className={labelClass}>Service Type *</label>
            <select name="serviceType" value={formData.serviceType} onChange={handleChange} className={fieldClass}>
              {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Urgency</label>
            <select name="urgency" value={formData.urgency} onChange={handleChange} className={fieldClass}>
              <option value="Normal">Normal</option>
              <option value="Priority">Priority</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Service Location *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input required type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Koramangala Phase 1" className={iconField} />
            </div>
          </div>

          <FieldPair>
            <div>
              <label className={labelClass}>Preferred Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input required type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} className={`${fieldClass} pl-9 pr-2`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Preferred Time</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input type="time" name="preferredTime" value={formData.preferredTime} onChange={handleChange} className={`${fieldClass} pl-9 pr-2`} />
              </div>
            </div>
          </FieldPair>
        </div>

        {/* Add-ons */}
        {addons.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-black text-text-primary flex items-center gap-2 border-b border-border-light pb-2">Optional Memory Add-ons</h4>
            <div className="bg-bg-primary rounded-2xl border border-border-light px-3">
              {addons.filter(a => a.status === 'Active').map(addon => (
                <Checkbox
                  key={addon.id}
                  label={addon.name}
                  hint={addon.price}
                  checked={formData.selectedAddons.includes(addon.name)}
                  onChange={() => handleAddonToggle(addon.name)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-text-primary flex items-center gap-2 border-b border-border-light pb-2"><FileText size={16}/> Customer Notes</h4>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Any specific requirements or respectful considerations..." className={textareaClass}></textarea>
        </div>

      </div>
    </BottomSheet>
  );
}
