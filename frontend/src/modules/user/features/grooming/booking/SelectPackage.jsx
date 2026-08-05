import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGroomingPackages, getGroomingMenu } from '../../../../../services/groomingApi';
import { useGroomingStore } from '../../../../../store/useGroomingStore';

export function SelectPackage() {
  const navigate = useNavigate();
  const shop = useGroomingStore(state => state.bookingData.shop);
  const selectedPkg = useGroomingStore(state => state.bookingData.pkg);
  const selectedAddons = useGroomingStore(state => state.bookingData.addons);
  
  const setPackage = useGroomingStore(state => state.setPackage);
  const toggleAddon = useGroomingStore(state => state.toggleAddon);

  const [packages, setPackages] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop) {
      navigate('/app/services/grooming');
      return;
    }
    loadData();
  }, [shop]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, shopMenu] = await Promise.all([
        getGroomingPackages(shop.id),
        getGroomingMenu(shop.id)
      ]);
      setPackages(pkgs);
      setMenu(shopMenu);
      // We don't auto-select package anymore to allow purely individual service booking
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedPkg || selectedAddons.length > 0) {
      navigate('/app/services/grooming/book/slot');
    }
  };

  const canContinue = selectedPkg || selectedAddons.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 p-4 space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
        <div className="h-32 bg-gray-200 rounded-[24px]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-4 pb-3 sticky top-0 z-10 px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 active:scale-95">
            <ArrowLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="text-[19px] font-black text-gray-900">Select Services</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 hide-scrollbar">
        {/* Helper Text */}
        <p className="text-[13px] font-medium text-gray-500 mb-5 px-1 leading-relaxed">
          Select a complete grooming package, or choose individual services from the menu below.
        </p>

        {/* Packages */}
        <div className="space-y-4 mb-8">
          <h2 className="text-[17px] font-black text-gray-900 mb-4 px-1">Value Packages</h2>
          {packages.map(pkg => {
            const isSelected = selectedPkg?.id === pkg.id;
            return (
              <div 
                key={pkg.id}
                onClick={() => setPackage(isSelected ? null : pkg)}
                className={`p-4 rounded-[24px] border-2 transition-all cursor-pointer bg-white ${
                  isSelected ? 'border-[#66B4B1] shadow-md scale-[1.01]' : 'border-gray-100 hover:border-[#66B4B1]/30 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`text-[16px] font-black ${isSelected ? 'text-[#66B4B1]' : 'text-gray-900'}`}>{pkg.name}</h3>
                    <div className="text-[18px] font-black text-gray-900 mt-0.5">₹{pkg.price}</div>
                  </div>
                  <div className="mt-1">
                    {isSelected ? (
                      <CheckCircle2 size={24} className="text-[#66B4B1] fill-[#66B4B1]/10" />
                    ) : (
                      <Circle size={24} className="text-gray-300" />
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed mt-2">
                  {pkg.includes.join(' + ')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Individual Services Menu */}
        <div className="mb-4 space-y-6">
          <h2 className="text-[17px] font-black text-gray-900 px-1">Individual Services Menu</h2>
          
          {menu.map((categoryGroup, index) => (
            <div key={index} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <h3 className="text-[14px] font-black text-gray-900">{categoryGroup.category}</h3>
              </div>
              
              {categoryGroup.items.map((item, itemIdx) => {
                const isSelected = selectedAddons.some(a => a.id === item.id);
                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleAddon(item)}
                    className={`p-4 cursor-pointer transition-colors ${
                      itemIdx !== categoryGroup.items.length - 1 ? 'border-b border-gray-50' : ''
                    } ${isSelected ? 'bg-[#66B4B1]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                          isSelected ? 'border-[#66B4B1] bg-[#66B4B1]' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`block text-[14px] font-bold ${isSelected ? 'text-[#66B4B1]' : 'text-gray-900'}`}>
                            {item.name}
                          </span>
                          <span className="block text-[12px] text-gray-500 font-medium mt-1 leading-snug">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <span className="text-[14px] font-black text-gray-900 ml-3">₹{item.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-4 rounded-[16px] font-bold text-[15px] shadow-lg transition-all flex items-center justify-center gap-2 ${
            canContinue 
              ? 'bg-[#66B4B1] text-white hover:bg-[#599D9A] shadow-[#66B4B1]/30 active:scale-95' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {canContinue ? 'Continue' : 'Select a service to proceed'}
        </button>
      </div>

    </div>
  );
}
