import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useDaycareStore } from '../../../../../store/useDaycareStore';
import { createBooking } from '../../../../../services/daycareApi';

export function DaycarePayment() {
  const navigate = useNavigate();
  const { 
    selectedCenter, selectedPlan, selectedAddons, 
    dateSelectionType, selectedDates, 
    visitOption, dropoffTime, pickupTime, 
    selectedPet, petAnswers, selectedAddress, pickupDropTimes,
    setLastConfirmedBooking
  } = useDaycareStore();

  const [paymentMethod, setPaymentMethod] = useState(''); 
  const [isProcessing, setIsProcessing] = useState(false);

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
  const discount = 300; 
  const subtotal = planTotal + addonsTotal;
  const platformFee = 49; 
  const grandTotal = subtotal - discount + platformFee;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        center: selectedCenter,
        plan: selectedPlan,
        addons: selectedAddons,
        dates: selectedDates,
        dateType: dateSelectionType,
        dropoffTime,
        pickupTime,
        pet: selectedPet,
        petAnswers,
        visitOption,
        address: selectedAddress,
        driverTimings: pickupDropTimes,
        paymentMethod,
        totalPaid: grandTotal
      };
      const response = await createBooking(payload);
      setLastConfirmedBooking(response);
      navigate('/app/services/daycare/book/success');
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const paymentOptions = [
    {
      id: 'UPI',
      title: 'UPI',
      subtitle: '',
      logos: ['G Pay', 'PhonePe', 'Paytm', 'Other UPI']
    },
    {
      id: 'Card',
      title: 'Cards',
      subtitle: 'Visa, Mastercard, Rupay',
      logos: []
    },
    {
      id: 'NetBanking',
      title: 'Net Banking',
      subtitle: 'All major banks',
      logos: []
    },
    {
      id: 'Wallet',
      title: 'Wallet',
      subtitle: 'Pay using wallet balance',
      logos: []
    },
    {
      id: 'Cash',
      title: 'Cash on Drop-off',
      subtitle: 'Pay when you drop your pet',
      logos: []
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] overflow-y-auto hide-scrollbar animate-in slide-in-from-right duration-300 relative pb-32">
      
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 ml-4 flex-1 text-center pr-8">Payment</h1>
      </div>

      <div className="px-5 pt-2">
        
        {/* Total Amount Header */}
        <div className="flex justify-between items-center mb-8 px-2">
          <span className="text-[14px] font-bold text-gray-900">Total Amount</span>
          <span className="text-[20px] font-black text-gray-900">₹{grandTotal.toLocaleString()}</span>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          {paymentOptions.map((option) => (
            <div key={option.id}>
              {option.id === 'Cash' && <div className="h-px bg-gray-200 my-4 mx-2"></div>}
              <div 
                onClick={() => setPaymentMethod(option.id)}
                className="flex items-start justify-between cursor-pointer p-2 group"
              >
                <div className="flex-1">
                  <h3 className={`text-[15px] font-bold mb-1 ${paymentMethod === option.id ? 'text-[#66B4B1]' : 'text-gray-900 group-hover:text-[#66B4B1]'}`}>
                    {option.title}
                  </h3>
                  
                  {option.logos.length > 0 ? (
                    <div className="flex items-center gap-3 mt-3">
                      {option.logos.map((logo, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {logo === 'G Pay' && <span className="text-[14px] font-black text-gray-800"><span className="text-blue-500">G</span> Pay</span>}
                          {logo === 'PhonePe' && <span className="text-[14px] font-black text-purple-700 italic">PhonePe</span>}
                          {logo === 'Paytm' && <span className="text-[14px] font-black text-sky-500 italic">Paytm</span>}
                          {logo === 'Other UPI' && <span className="text-[13px] font-medium text-gray-500 border border-gray-200 px-2 py-0.5 rounded-[4px]">{logo}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-500">{option.subtitle}</p>
                  )}
                </div>
                
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-colors ${
                  paymentMethod === option.id ? 'border-[#66B4B1]' : 'border-gray-300'
                }`}>
                  {paymentMethod === option.id && <div className="w-2.5 h-2.5 rounded-full bg-[#66B4B1]"></div>}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-5">
        <button 
          onClick={handlePayment}
          disabled={!paymentMethod || isProcessing}
          className="w-full py-4 rounded-[16px] font-bold text-[15px] text-white bg-[#66B4B1] shadow-lg shadow-[#66B4B1]/20 hover:bg-[#599D9A] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            `Pay ₹${grandTotal.toLocaleString()}`
          )}
        </button>
      </div>

    </div>
  );
}
