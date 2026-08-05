import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGroomingStore } from '../../../../../store/useGroomingStore';
import { createBooking } from '../../../../../services/groomingApi';

export function PriceSummary() {
  const navigate = useNavigate();
  const bookingData = useGroomingStore(state => state.bookingData);
  const { shop, pkg, addons, date, timeSlot, pet, visitType } = bookingData;
  
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiApp, setUpiApp] = useState(null);

  // Card details state for realism
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  if (!shop || (!pkg && addons.length === 0)) {
    navigate('/app/services/grooming');
    return null;
  }

  // Calculate totals
  const packagePrice = pkg?.price || 0;
  const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
  const travelFee = visitType === 'Home Visit' ? 50 : 0;
  const discount = 100;
  
  const subtotal = packagePrice + addonsPrice + travelFee;
  const total = Math.max(0, subtotal - discount);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      // Card/UPI details are collected inside the Razorpay sheet.
      const serviceName = pkg ? pkg.name : addons[0]?.name + (addons.length > 1 ? ` + ${addons.length - 1} more` : '');
      const newBooking = {
        shopId: shop.id,
        shopName: shop.name,
        shopImage: shop.image,
        serviceName,
        packageData: pkg,
        addonsData: addons,
        pet: pet,
        date,
        timeSlot,
        visitType,
        addressId: bookingData.address?._id,
        totalPaid: total,
        paymentMode: paymentMethod
      };

      const savedBooking = await createBooking(newBooking);
      useGroomingStore.setState({ lastConfirmedBooking: savedBooking });

      navigate('/app/services/grooming/book/success');
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white absolute inset-0 z-50 animate-in slide-in-from-right text-text-primary">
      {/* Header */}
      <div className="bg-white pt-4 pb-4 sticky top-0 z-10 px-4">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full absolute left-0 hover:bg-gray-50 active:scale-95">
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[17px] font-black text-gray-900">Price Summary</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-36 hide-scrollbar">
        
        {/* Bill Details */}
        <div className="mb-8 pt-2">
          
          {/* Package Row */}
          {pkg && (
            <div className="flex justify-between items-end border-b border-gray-100 py-4">
              <div>
                <p className="text-[12px] font-bold text-gray-900 mb-1">Package</p>
                <p className="text-[14px] text-gray-600 font-medium">{pkg.name}</p>
              </div>
              <span className="text-[14px] font-bold text-gray-900 leading-snug">₹{packagePrice}</span>
            </div>
          )}

          {/* Add-ons Row */}
          {addons.length > 0 && (
            <div className="flex justify-between items-end border-b border-gray-100 py-4">
              <div>
                <p className="text-[12px] font-bold text-gray-900 mb-1">Add-ons</p>
                <p className="text-[14px] text-gray-600 font-medium">{addons.map(a => a.name).join(', ')}</p>
              </div>
              <span className="text-[14px] font-bold text-gray-900 leading-snug">₹{addonsPrice}</span>
            </div>
          )}

          {/* Travel Fee */}
          {visitType === 'Home Visit' && (
            <div className="flex justify-between items-center border-b border-gray-100 py-4">
              <span className="text-[14px] text-gray-600 font-medium">Travel Fee</span>
              <span className="text-[14px] font-bold text-gray-900">₹{travelFee}</span>
            </div>
          )}

          {/* Discount */}
          <div className="flex justify-between items-center border-b border-gray-100 py-4">
            <span className="text-[14px] text-gray-600 font-medium">Discount</span>
            <span className="text-[14px] font-bold text-[#66B4B1]">- ₹{discount}</span>
          </div>

          {/* Total Amount */}
          <div className="flex justify-between items-center pt-5">
            <span className="text-[15px] font-black text-gray-900">Total Amount</span>
            <span className="text-[20px] font-black text-gray-900 tracking-tight">₹{total}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h2 className="text-[14px] font-bold text-gray-900 mb-3 px-1">Payment Method</h2>
          
          <div className="space-y-3">
            
            {/* UPI Option */}
            <div className={`rounded-[12px] border transition-all ${paymentMethod === 'UPI' ? 'border-[#66B4B1] bg-white' : 'border-gray-200 bg-white'}`}>
              <div 
                onClick={() => setPaymentMethod('UPI')}
                className="flex items-center justify-between p-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {paymentMethod === 'UPI' ? (
                    <CheckCircle2 size={20} className="text-[#66B4B1] fill-[#66B4B1]/10" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-gray-300" />
                  )}
                  <span className={`text-[14px] font-bold ${paymentMethod === 'UPI' ? 'text-gray-900' : 'text-gray-700'}`}>UPI</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {/* Simulated logos using colored text/shapes */}
                    <span className="text-[#66B4B1] font-black text-[12px] italic">GPay</span>
                    <span className="text-[#4C8684] font-black text-[12px]">पे</span>
                  </div>
                  {paymentMethod === 'UPI' ? <ChevronUp size={18} className="text-[#66B4B1]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>
              
              {/* Expanded UPI Apps */}
              {paymentMethod === 'UPI' && (
                <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2">
                  <div className="bg-gray-50 rounded-[8px] p-3 border border-gray-100 flex gap-3">
                    {['GPay', 'PhonePe', 'Paytm'].map(app => (
                      <button 
                        key={app}
                        onClick={() => setUpiApp(app)}
                        className={`flex-1 py-2 rounded-[8px] text-[12px] font-bold transition-all border ${
                          upiApp === app ? 'bg-[#66B4B1] text-white border-[#66B4B1]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#66B4B1]/50'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card Option */}
            <div className={`rounded-[12px] border transition-all ${paymentMethod === 'Card' ? 'border-[#66B4B1] bg-white' : 'border-gray-200 bg-white'}`}>
              <div 
                onClick={() => setPaymentMethod('Card')}
                className="flex items-center justify-between p-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {paymentMethod === 'Card' ? (
                    <CheckCircle2 size={20} className="text-[#66B4B1] fill-[#66B4B1]/10" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-gray-300" />
                  )}
                  <span className={`text-[14px] font-bold ${paymentMethod === 'Card' ? 'text-gray-900' : 'text-gray-700'}`}>Card</span>
                </div>
              </div>

              {/* Expanded Card Form */}
              {paymentMethod === 'Card' && (
                <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <div className="relative border border-gray-300 rounded-[8px] overflow-hidden focus-within:border-[#66B4B1]">
                      <CreditCard size={18} className="absolute left-3 top-3 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Card Number" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        className="w-full py-3 pl-10 pr-4 text-[14px] font-medium focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-[8px] text-[14px] font-medium focus:outline-none focus:border-[#66B4B1]"
                      />
                      <input 
                        type="password" 
                        placeholder="CVV" 
                        value={cvv}
                        maxLength={3}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-24 py-3 px-4 border border-gray-300 rounded-[8px] text-[14px] font-medium focus:outline-none focus:border-[#66B4B1]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COD Option */}
            <div className={`rounded-[12px] border transition-all ${paymentMethod === 'COD' ? 'border-[#66B4B1] bg-white' : 'border-gray-200 bg-white'}`}>
              <div 
                onClick={() => setPaymentMethod('COD')}
                className="flex items-center justify-between p-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {paymentMethod === 'COD' ? (
                    <CheckCircle2 size={20} className="text-[#66B4B1] fill-[#66B4B1]/10" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-gray-300" />
                  )}
                  <span className={`text-[14px] font-bold ${paymentMethod === 'COD' ? 'text-gray-900' : 'text-gray-700'}`}>Cash on Delivery</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-6 z-20">
        <button 
          onClick={handlePay}
          disabled={isProcessing}
          className="w-full py-3.5 rounded-[12px] font-bold text-[16px] transition-all flex items-center justify-center gap-2 bg-[#66B4B1] text-white hover:bg-[#599D9A] active:scale-95 disabled:opacity-80"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : (
            `Pay ₹${total}`
          )}
        </button>
      </div>

    </div>
  );
}
