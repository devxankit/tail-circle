import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';

export function DaycarePriceSummary() {
  const navigate = useNavigate();
  const { 
    selectedCenter, selectedPlan, selectedAddons, 
    dateSelectionType, selectedDates, 
  } = useDaycareStore();

  // Bill Calculation
  const getNumDays = () => {
    if (selectedDates.length > 0) return selectedDates.length;
    if (dateSelectionType === 'Weekly Care') return 6;
    if (dateSelectionType === 'Monthly Care') return 24;
    return 1;
  };

  const daysCount = getNumDays();
  const planTotal = (selectedPlan?.price || 0) * (selectedPlan?.unit === 'day' ? daysCount : 1);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price * (a.unit === 'day' ? daysCount : 1)), 0);
  // The centre's own fee and discount. These were hard-coded here and applied
  // nowhere server-side, so the total shown was never the total billed.
  const platformFee = selectedCenter?.fees?.platformFee ?? 49;
  const subtotal = planTotal + addonsTotal + platformFee;
  const discount = Math.min(selectedCenter?.fees?.discount ?? 300, subtotal);
  const grandTotal = Math.max(0, subtotal - discount);

  if (!selectedCenter || !selectedPlan) {
    return <div className="p-4 text-center mt-20">No booking details found. Please start over.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-32">
      
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 ml-4 flex-1 text-center pr-8">Price Summary</h1>
      </div>

      <div className="px-5 pt-2">
        
        {/* Bill Breakdown Matching Screenshot 9 */}
        <div className="bg-white rounded-[24px] overflow-hidden mb-8 border border-gray-100 shadow-sm">
          
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900 mb-4">Plan Selected</h2>
            <div className="flex justify-between items-start">
              <span className="text-[14px] font-medium text-gray-600">{selectedPlan.name} ({selectedPlan.unit === 'day' ? `${daysCount} Days` : '6 Days'})</span>
              <span className="text-[14px] font-medium text-gray-900">₹{planTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900 mb-4">Add-ons</h2>
            <div className="space-y-3">
              {selectedAddons.map((addon, index) => (
                <div key={index} className="flex justify-between items-start">
                  <span className="text-[14px] font-medium text-gray-600">{addon.name} ({addon.unit === 'day' ? `${daysCount} Days` : '6 Days'})</span>
                  <span className="text-[14px] font-medium text-gray-900">₹{(addon.price * (addon.unit === 'day' ? daysCount : 1)).toLocaleString()}</span>
                </div>
              ))}
              {selectedAddons.length === 0 && (
                <span className="text-[14px] font-medium text-gray-400">No add-ons selected</span>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-bold text-gray-900">Subtotal</span>
              <span className="text-[15px] font-bold text-gray-900">₹{(planTotal + addonsTotal).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-[#66B4B1]">Discount</span>
                <span className="text-[11px] font-bold text-[#F87B68] uppercase mt-1">(FIRSTDAYCARE Applied)</span>
              </div>
              <span className="text-[15px] font-bold text-[#66B4B1]">- ₹{discount}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[14px] font-medium text-gray-600">Platform Fee</span>
              <span className="text-[14px] font-medium text-gray-900">₹{platformFee}</span>
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5 my-2 border-t-2 border-dashed"></div>

          <div className="p-5">
            <div className="flex justify-between items-center">
              <span className="text-[16px] font-black text-gray-900">Total Amount</span>
              <span className="text-[18px] font-black text-gray-900">₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={() => navigate('/app/services/daycare/book/pay')}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all"
        >
          Proceed to Payment
        </button>
      </div>

    </div>
  );
}
