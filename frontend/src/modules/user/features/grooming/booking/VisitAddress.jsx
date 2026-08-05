import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGroomingStore } from '../../../../../store/useGroomingStore';

export function VisitAddress() {
  const navigate = useNavigate();
  const shop = useGroomingStore(state => state.bookingData.shop);
  const selectedVisitType = useGroomingStore(state => state.bookingData.visitType);
  const setAddress = useGroomingStore(state => state.setAddress);

  const [visitType, setLocalVisitType] = useState('Home Visit');
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Real address book
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    import('../../../../../services/api').then(({ api }) =>
      api.get('/addresses').then(({ data }) => {
        const mapped = data.map((a) => ({
          id: a._id,
          type: (a.label || 'home').charAt(0).toUpperCase() + (a.label || 'home').slice(1),
          address: `${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city} - ${a.pincode}`,
        }));
        setSavedAddresses(mapped);
        const def = data.find((a) => a.isDefault) || data[0];
        if (def) setSelectedAddressId(def._id);
      })
    ).catch(() => setSavedAddresses([]));
  }, []);

  useEffect(() => {
    if (!shop) {
      navigate('/app/services/grooming');
      return;
    }
    if (selectedVisitType) {
      setLocalVisitType(selectedVisitType);
    }
  }, [shop, selectedVisitType]);

  const handleContinue = () => {
    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
    if (visitType === 'Home Visit' && !selectedAddress) return;
    setAddress(
      visitType,
      visitType === 'Home Visit'
        ? { _id: selectedAddress.id, address: selectedAddress.address }
        : null
    );
    navigate('/app/services/grooming/book/payment');
  };

  if (!shop) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full absolute left-0">
            <ArrowLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">Choose Address</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 hide-scrollbar">
        
        {/* Visit Type Toggle */}
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">Visit Type</h2>
        <div className="flex gap-3 mb-8">
          <button 
            disabled={!shop.visitTypes.includes('Home Visit')}
            onClick={() => setLocalVisitType('Home Visit')}
            className={`flex-1 py-3 px-4 rounded-[12px] font-bold text-[14px] transition-all border ${
              !shop.visitTypes.includes('Home Visit')
                ? 'opacity-50 bg-gray-50 border-gray-100 cursor-not-allowed text-gray-400'
                : visitType === 'Home Visit'
                  ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
            }`}
          >
            Home Visit
          </button>
          <button 
            disabled={!shop.visitTypes.includes('Salon Visit')}
            onClick={() => setLocalVisitType('Salon Visit')}
            className={`flex-1 py-3 px-4 rounded-[12px] font-bold text-[14px] transition-all border ${
              !shop.visitTypes.includes('Salon Visit')
                ? 'opacity-50 bg-gray-50 border-gray-100 cursor-not-allowed text-gray-400'
                : visitType === 'Salon Visit'
                  ? 'bg-[#66B4B1] border-[#66B4B1] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#66B4B1]/50'
            }`}
          >
            Salon Visit
          </button>
        </div>

        {visitType === 'Home Visit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-[14px] font-bold text-gray-900 mb-3">Saved Addresses</h2>
            
            <div className="space-y-3 mb-6">
              {savedAddresses.map(addr => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <div 
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-[12px] border ${
                      isSelected ? 'border-[#66B4B1] shadow-sm' : 'border-gray-200 hover:border-[#66B4B1]/50'
                    } flex items-start gap-3 cursor-pointer transition-all`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckCircle2 size={20} className="text-[#66B4B1] fill-[#66B4B1]/10" />
                      ) : (
                        <Circle size={20} className="text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-[15px] mb-1">{addr.type}</h3>
                      <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                        {addr.address}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-[#66B4B1] flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="flex items-center gap-2 text-[#66B4B1] font-bold text-[14px]">
              <Plus size={18} /> Add New Address
            </button>
          </div>
        )}

        {visitType === 'Salon Visit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-[14px] font-bold text-gray-900 mb-3">Shop Address</h2>
            <div className="p-4 rounded-[12px] border border-[#66B4B1] shadow-sm bg-[#66B4B1]/5">
              <h3 className="font-bold text-gray-900 text-[15px] mb-1">{shop.name}</h3>
              <p className="text-[13px] text-gray-600 font-medium leading-relaxed mb-3">
                123, Pet Street, near Central Park, Koramangala 5th Block, Bangalore 560034
              </p>
              <span className="inline-block bg-[#66B4B1]/10 text-[#66B4B1] px-3 py-1.5 rounded-lg text-[12px] font-bold">
                Get Directions
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={handleContinue}
          className="w-full py-3.5 rounded-[12px] font-bold text-[15px] shadow-lg transition-all flex items-center justify-center gap-2 bg-[#66B4B1] text-white hover:bg-[#599D9A] shadow-[#66B4B1]/30 active:scale-95"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
