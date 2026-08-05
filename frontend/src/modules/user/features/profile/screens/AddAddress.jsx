import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../../../services/api';

const inputCls =
  'w-full bg-white border border-border-light rounded-2xl px-4 py-3 text-text-primary font-medium focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors shadow-sm outline-none';

export function AddAddress() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSelecting, address: editing } = location.state || {};

  const [formData, setFormData] = useState({
    label: editing?.label || 'home',
    fullName: editing?.fullName || '',
    phone: editing?.phone || '',
    line1: editing?.line1 || '',
    line2: editing?.line2 || '',
    landmark: editing?.landmark || '',
    city: editing?.city || '',
    state: editing?.state || '',
    pincode: editing?.pincode || '',
    isDefault: editing?.isDefault || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const isComplete =
    formData.fullName && formData.phone && formData.line1 &&
    formData.city && formData.state && formData.pincode;

  const handleSave = async () => {
    if (!isComplete) return;
    setIsSaving(true);
    setError('');
    try {
      // Editing a default address: the backend rejects isDefault:false on
      // the current default, so only send the flag when turning it on.
      const payload = { ...formData };
      if (editing?.isDefault && !payload.isDefault) delete payload.isDefault;

      const { data: saved } = editing
        ? await api.patch(`/addresses/${editing._id}`, payload)
        : await api.post('/addresses', payload);

      if (isSelecting) {
        localStorage.setItem('deliveryAddress', JSON.stringify(saved));
        navigate(-2);
      } else {
        navigate(-1);
      }
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-[80] animate-in slide-in-from-right duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">{editing ? 'Edit Address' : 'Add New Address'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Address Type</label>
            <div className="flex gap-2">
              {['home', 'work', 'other'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, label }))}
                  className={`flex-1 py-2.5 rounded-2xl font-bold text-sm capitalize border transition-colors ${
                    formData.label === label
                      ? 'bg-primary-main text-white border-primary-main'
                      : 'bg-white text-text-secondary border-border-light hover:border-primary-main/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Full Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Alex Johnson" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Street / Building</label>
            <input type="text" name="line1" value={formData.line1} onChange={handleChange} placeholder="456 Tech Park, Building C" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Area / Locality (optional)</label>
            <input type="text" name="line2" value={formData.line2} onChange={handleChange} placeholder="Koramangala 4th Block" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Landmark (optional)</label>
            <input type="text" name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Near the city park" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Bengaluru" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Karnataka" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase pl-2 mb-1 block">Pincode</label>
            <input type="tel" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="560034" maxLength={6} className={inputCls} />
          </div>

          <div className="flex items-center gap-3 mt-2 bg-white p-4 rounded-2xl border border-border-light shadow-sm">
            <input
              type="checkbox" id="isDefault" name="isDefault" checked={formData.isDefault} onChange={handleChange}
              className="w-5 h-5 rounded text-primary-main focus:ring-primary-main border-border-light"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-text-primary flex-1">Set as default address</label>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs font-bold text-red-500 mt-4">{error}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || !isComplete}
          className="w-full mt-8 font-bold h-14 rounded-full shadow-lg"
        >
          {isSaving ? 'Saving Address...' : 'Save Address'}
        </Button>
      </div>
    </div>
  );
}
