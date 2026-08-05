import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../../../../services/api';

const labelTitle = { home: 'Home', work: 'Work', other: 'Other' };

export function AddressBook() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSelecting } = location.state || {};

  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data);
      const savedDelivery = localStorage.getItem('deliveryAddress');
      if (savedDelivery) {
        const parsed = JSON.parse(savedDelivery);
        if (data.some((a) => a._id === parsed._id)) setSelectedId(parsed._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSelect = (address) => {
    if (isSelecting) {
      localStorage.setItem('deliveryAddress', JSON.stringify(address));
      navigate(-1);
    }
  };

  const handleDelete = async (e, address) => {
    e.stopPropagation();
    try {
      await api.delete(`/addresses/${address._id}`);
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (e, address) => {
    e.stopPropagation();
    navigate('/app/profile/address/add', { state: { isSelecting, address } });
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">{isSelecting ? 'Select Address' : 'Address Book'}</h1>
        <button onClick={() => navigate('/app/profile/address/add', { state: { isSelecting } })} className="text-primary-main"><Plus size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {error && (
          <p className="text-center text-xs font-bold text-red-500 mb-4">{error}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
        <div className="flex flex-col gap-4">
          {addresses.length === 0 && (
            <p className="text-center text-sm text-text-secondary py-8">
              No saved addresses yet — add your first one below.
            </p>
          )}
          {addresses.map(address => (
            <div
              key={address._id}
              onClick={() => handleSelect(address)}
              className={`bg-white p-4 rounded-[20px] shadow-sm border-2 transition-all cursor-pointer ${
                (isSelecting && selectedId === address._id) || (!isSelecting && address.isDefault)
                  ? 'border-primary-main'
                  : 'border-transparent hover:border-border-light'
              } relative`}
            >
              {address.isDefault && !isSelecting && (
                <div className="absolute top-4 right-4 bg-primary-main/10 text-primary-dark text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Default</div>
              )}
              {isSelecting && selectedId === address._id && (
                <div className="absolute top-4 right-4 text-primary-main"><CheckCircle2 size={20} /></div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="text-primary-main shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-text-primary mb-1">{labelTitle[address.label] || 'Home'} · {address.fullName}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                    {address.city}, {address.state} {address.pincode}
                  </p>
                  <p className="text-xs font-medium text-text-primary mt-2">{address.phone}</p>
                  {!isSelecting && (
                    <div className="flex gap-4 mt-3">
                      <button onClick={(e) => handleEdit(e, address)} className="text-xs font-bold text-primary-main">Edit</button>
                      <button onClick={(e) => handleDelete(e, address)} className="text-xs font-bold text-text-disabled hover:text-error">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Address Button */}
          <button
            onClick={() => navigate('/app/profile/address/add', { state: { isSelecting } })}
            className="flex items-center justify-center gap-2 bg-primary-light/10 text-primary-main border-2 border-dashed border-primary-main/30 p-4 rounded-[20px] font-bold hover:bg-primary-light/20 transition-colors mt-2 active:scale-[0.98]"
          >
            <Plus size={20} /> Add New Address
          </button>

        </div>
        )}
      </div>
    </div>
  );
}
