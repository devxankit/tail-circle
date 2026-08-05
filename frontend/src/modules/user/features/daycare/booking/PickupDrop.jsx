import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ChevronDown } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

const MOCK_ADDRESSES = [
  { id: 'addr1', type: 'Home', address: '12, 4th Cross, Koramangala, Bangalore - 560034' },
  { id: 'addr2', type: 'Office', address: '91, 3rd Main, HSR Layout, Bangalore - 560102' }
];

export function PickupDrop() {
  const navigate = useNavigate();
  const { visitOption, setVisitOption, selectedAddress, setAddress, pickupDropTimes, setPickupDropTimes, selectedAddons, toggleAddon } = useDaycareStore();

  useEffect(() => {
    if (selectedAddons.some(a => a.name === 'Pickup & Drop') && visitOption !== 'Pickup & Drop') {
      setVisitOption('Pickup & Drop');
    }
  }, [selectedAddons]);

  const handleVisitOptionChange = (option) => {
    setVisitOption(option);
    const isAddonSelected = selectedAddons.some(a => a.name === 'Pickup & Drop');
    if (option === 'Pickup & Drop' && !isAddonSelected) {
      toggleAddon({ id: 'addon_1', name: 'Pickup & Drop', price: 900, unit: 'week' }); // Using 900 as per screenshot
    } else if (option === 'Self Drop' && isAddonSelected) {
      toggleAddon({ id: 'addon_1', name: 'Pickup & Drop', price: 900, unit: 'week' });
    }
  };

  const handleContinue = () => {
    if (visitOption === 'Self Drop') {
      navigate('/app/services/daycare/book/payment');
    } else {
      if (selectedAddress && pickupDropTimes.pickup && pickupDropTimes.drop) {
        navigate('/app/services/daycare/book/payment');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-28">
      
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 ml-4 flex-1 text-center pr-8">Pickup & Drop</h1>
      </div>

      <div className="px-5 pt-2">
        
        {/* Visit Type */}
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">Visit Type</h2>
        <div className="flex rounded-[16px] overflow-hidden border border-[#66B4B1] mb-8 bg-white">
          <button 
            onClick={() => handleVisitOptionChange('Self Drop')}
            className={`flex-1 py-3 text-[14px] font-bold transition-all ${
              visitOption === 'Self Drop' 
                ? 'bg-[#66B4B1] text-white' 
                : 'text-[#66B4B1] bg-white hover:bg-[#66B4B1]/5'
            }`}
          >
            Self Drop
          </button>
          <button 
            onClick={() => handleVisitOptionChange('Pickup & Drop')}
            className={`flex-1 py-3 text-[14px] font-bold transition-all ${
              visitOption === 'Pickup & Drop' 
                ? 'bg-[#66B4B1] text-white' 
                : 'text-[#66B4B1] bg-white hover:bg-[#66B4B1]/5'
            }`}
          >
            Pickup & Drop
          </button>
        </div>

        {visitOption === 'Pickup & Drop' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Pickup Address */}
            <h2 className="text-[14px] font-bold text-gray-900 mb-4">Pickup Address</h2>
            <div className="space-y-4 mb-6">
              {MOCK_ADDRESSES.map(addr => (
                <div 
                  key={addr.id}
                  onClick={() => setAddress(addr)}
                  className="flex items-start gap-4 cursor-pointer group"
                >
                  <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedAddress?.id === addr.id ? 'border-[#66B4B1]' : 'border-gray-300 group-hover:border-[#66B4B1]/50'
                  }`}>
                    {selectedAddress?.id === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-[#66B4B1]"></div>}
                  </div>
                  <div>
                    <h3 className={`text-[14px] font-bold mb-1 ${selectedAddress?.id === addr.id ? 'text-gray-900' : 'text-gray-700'}`}>{addr.type}</h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed pr-6">{addr.address}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timings */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[13px] font-bold text-gray-900 block mb-2">Pickup Time</label>
                <div className="relative">
                  <select 
                    value={pickupDropTimes.pickup}
                    onChange={(e) => setPickupDropTimes(e.target.value, pickupDropTimes.drop)}
                    className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                  >
                    <option value="">Select Time</option>
                    <option value="7:00 AM">7:00 AM</option>
                    <option value="8:00 AM">8:00 AM</option>
                    <option value="9:00 AM">9:00 AM</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-900 block mb-2">Drop Time</label>
                <div className="relative">
                  <select 
                    value={pickupDropTimes.drop}
                    onChange={(e) => setPickupDropTimes(pickupDropTimes.pickup, e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-[12px] h-12 px-4 text-[14px] font-medium text-gray-900 appearance-none focus:border-[#66B4B1] outline-none"
                  >
                    <option value="">Select Time</option>
                    <option value="5:00 PM">5:00 PM</option>
                    <option value="6:00 PM">6:00 PM</option>
                    <option value="7:00 PM">7:00 PM</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-[#FAF7F2] rounded-[12px] p-4 flex gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97360" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-[13px] font-medium text-[#F87B68] leading-relaxed">
                A caregiver will contact you before pickup.
              </p>
            </div>
          </div>
        )}

        {visitOption === 'Self Drop' && (
          <div className="animate-in fade-in duration-300">
            {/* Info Card */}
            <div className="bg-[#FAF7F2] rounded-[12px] p-4 flex gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97360" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-[13px] font-medium text-[#F87B68] leading-relaxed">
                You have chosen to drop off and pick up your pet yourself. Please stick to the timings selected in the previous step.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={handleContinue}
          disabled={visitOption === 'Pickup & Drop' && (!selectedAddress || !pickupDropTimes.pickup || !pickupDropTimes.drop)}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
