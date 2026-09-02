import React, { useState } from 'react';
import { ArrowLeft, MapPin, CreditCard, Wallet, CheckCircle2, ChevronRight, Truck, Banknote } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { api } from '../../../../services/api';
import { checkoutOrder } from '../../../../services/shop';

export function ShopCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, total, subtotal, tax } = location.state || { items: [], total: 0, subtotal: 0, tax: 0 };

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  /*
   * Card and UPI details are collected by the Razorpay sheet that opens after
   * the order is placed -- never here. This screen used to render its own card
   * form, a seeded "VISA 4242", and a UPI "Verify" button that was a 1.5s
   * timer, none of which reached the payment: `handlePay` sends only the
   * method. Collecting a PAN and CVV into component state that nothing reads
   * is worse than not collecting it, so the inputs are gone and the choice
   * below is what actually travels with the order.
   */
  const [deliveryAddress, setDeliveryAddress] = useState(null);

  React.useEffect(() => {
    // Selected address from the address book, else the user's default one.
    const saved = localStorage.getItem('deliveryAddress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed._id) {
          setDeliveryAddress(parsed);
          return;
        }
      } catch { /* fall through to API */ }
    }
    api
      .get('/addresses')
      .then(({ data }) => {
        const def = data.find((a) => a.isDefault) || data[0];
        if (def) {
          setDeliveryAddress(def);
          localStorage.setItem('deliveryAddress', JSON.stringify(def));
        }
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return <div className="p-8 text-center">No items to checkout.</div>;
  }

  const handlePay = async () => {
    if (!deliveryAddress?._id) {
      setError('Please select a delivery address');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      // Card + UPI both run through the Razorpay sheet; COD skips payment.
      const order = await checkoutOrder({
        items,
        addressId: deliveryAddress._id,
        paymentMethod: paymentMethod === 'cod' ? 'cod' : 'razorpay',
      });
      navigate(`/app/shop/success`, { state: { items, total, order } });
    } catch (err) {
      setError(err.message || 'Payment failed, please try again');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-[70] animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-border-light sticky top-0 bg-white z-10 shadow-sm">
        <button onClick={() => navigate(-1)} disabled={isProcessing} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary ml-2">Checkout</h1>
      </div>

      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white">
          <div className="w-16 h-16 border-4 border-border-light border-t-primary-main rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {paymentMethod === 'upi' ? 'Opening UPI App...' : 'Processing Payment'}
          </h2>
          <p className="text-text-secondary text-sm">Please do not close this window...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
          
          {/* Delivery Address */}
          <div className="bg-white p-4 mb-4 border-b border-border-light">
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2"><MapPin size={18} className="text-primary-main" /> Delivery Address</h3>
            <div
              onClick={() => navigate('/app/profile/address', { state: { isSelecting: true } })}
              className="border border-border-light rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-primary-main transition-colors active:scale-[0.98]"
            >
              {deliveryAddress ? (
                <div>
                  <p className="font-bold text-text-primary text-sm capitalize">{deliveryAddress.label || deliveryAddress.title || 'Home'}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {deliveryAddress.line1}
                    <br />
                    {deliveryAddress.city
                      ? `${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.pincode}`
                      : deliveryAddress.line2}
                  </p>
                  <p className="text-xs font-medium text-text-primary mt-1">{deliveryAddress.phone}</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-text-primary text-sm">Select a delivery address</p>
                  <p className="text-xs text-text-secondary mt-1">Tap to choose or add one</p>
                </div>
              )}
              <ChevronRight size={20} className="text-text-secondary" />
            </div>
          </div>

          {/* Delivery Estimate */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success shrink-0">
                <Truck size={20} />
              </div>
              <div>
                <p className="font-bold text-text-primary text-sm">Estimated Delivery</p>
                <p className="text-xs text-text-secondary">Arrives by tomorrow, 9 PM</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Payment Method</h3>
            <div className="flex flex-col gap-3">
              
              {/* Card Options */}
              <button 
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "flex flex-col p-3 rounded-xl border-2 transition-all w-full text-left",
                  paymentMethod === 'card' ? "border-primary-main bg-primary-light/10" : "border-border-light bg-white opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <CreditCard className={paymentMethod === 'card' ? "text-primary-main" : "text-text-secondary"} size={24} />
                    <span className="font-bold text-sm">Credit & Debit Cards</span>
                  </div>
                  {paymentMethod === 'card' && <CheckCircle2 className="text-primary-main" size={20} />}
                </div>
                {paymentMethod === 'card' && (
                  <div className="mt-4 w-full animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-medium text-text-secondary leading-relaxed">
                      You'll enter your card details on the secure payment screen after you place the order.
                    </p>
                  </div>
                )}
              </button>
              
              {/* UPI Options */}
              <button 
                onClick={() => setPaymentMethod('upi')}
                className={cn(
                  "flex flex-col p-3 rounded-xl border-2 transition-all w-full text-left",
                  paymentMethod === 'upi' ? "border-primary-main bg-primary-light/10" : "border-border-light bg-white opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Wallet className={paymentMethod === 'upi' ? "text-primary-main" : "text-text-secondary"} size={24} />
                    <span className="font-bold text-sm">UPI App / Wallets</span>
                  </div>
                  {paymentMethod === 'upi' && <CheckCircle2 className="text-primary-main" size={20} />}
                </div>
                {paymentMethod === 'upi' && (
                  <div className="mt-4 w-full animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-medium text-text-secondary leading-relaxed">
                      You'll pick your UPI app and approve the payment on the secure payment screen after you place the order.
                    </p>
                  </div>
                )}
              </button>

              {/* COD Option */}
              <button 
                onClick={() => setPaymentMethod('cod')}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border-2 transition-all w-full text-left",
                  paymentMethod === 'cod' ? "border-primary-main bg-primary-light/10" : "border-border-light bg-white opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <Banknote className={paymentMethod === 'cod' ? "text-primary-main" : "text-text-secondary"} size={24} />
                  <span className="font-bold text-sm">Cash on Delivery (COD)</span>
                </div>
                {paymentMethod === 'cod' && <CheckCircle2 className="text-primary-main" size={20} />}
              </button>

            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white p-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Order Summary</h3>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-text-secondary">Items ({items.length})</span>
              <span className="font-medium text-text-primary">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-text-secondary">Estimated Tax</span>
              <span className="font-medium text-text-primary">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-sm">
              <span className="text-text-secondary">Delivery Fee</span>
              <span className="font-bold text-success">Free</span>
            </div>
            <div className="border-t border-border-light pt-4 flex justify-between">
              <span className="font-bold text-text-primary">Total Payable</span>
              <span className="font-black text-primary-main text-lg">₹{total.toFixed(2)}</span>
            </div>
          </div>

        </div>
      )}

      {/* Fixed Bottom Bar */}
      {!isProcessing && (
        <div
          className="absolute bottom-0 w-full bg-white border-t border-border-light px-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"
          style={{
            paddingTop: '16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {error && (
            <p className="text-center text-xs font-bold text-red-500 mb-2 animate-in fade-in duration-200">{error}</p>
          )}
          <Button
            onClick={handlePay}
            className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 flex justify-between items-center px-6 cursor-pointer"
          >
            <span>Place Order</span>
            <span>₹{total.toFixed(2)}</span>
          </Button>
        </div>
      )}

    </div>
  );
}
