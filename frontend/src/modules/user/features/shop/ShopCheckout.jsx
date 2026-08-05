import React, { useState } from 'react';
import { ArrowLeft, MapPin, CreditCard, Wallet, CheckCircle2, ChevronRight, Truck, Banknote, Plus } from 'lucide-react';
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

  // Card States
  const [savedCards, setSavedCards] = useState([
    { id: '1', type: 'VISA', last4: '4242', color: '#1A1F71' }
  ]);
  const [selectedCardId, setSelectedCardId] = useState('1');
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  // UPI States
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [upiVerified, setUpiVerified] = useState(false);
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

  const handleAddCard = (e) => {
    e.stopPropagation();
    if (!newCard.number || !newCard.expiry) return;
    const last4 = newCard.number.slice(-4).padStart(4, '0');
    const isMastercard = newCard.number.startsWith('5');
    const newSavedCard = {
      id: Date.now().toString(),
      type: isMastercard ? 'MC' : 'VISA',
      last4: last4,
      color: isMastercard ? '#EB001B' : '#1A1F71'
    };
    setSavedCards([...savedCards, newSavedCard]);
    setSelectedCardId(newSavedCard.id);
    setShowAddCard(false);
    setNewCard({ number: '', name: '', expiry: '', cvv: '' });
  };

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
                  <div className="mt-4 flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2">
                    {savedCards.map(card => (
                      <div 
                        key={card.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedCardId(card.id); }}
                        className={cn("flex items-center justify-between p-3 border-2 bg-white rounded-xl shadow-sm transition-all cursor-pointer", selectedCardId === card.id ? "border-primary-main ring-2 ring-primary-main/10" : "border-border-light hover:border-primary-main/50")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded pl-1 flex items-center shadow-inner" style={{ backgroundColor: card.color }}>
                            <span className="text-white text-[10px] font-black italic tracking-wider">{card.type}</span>
                          </div>
                          <span className="text-sm font-bold text-text-primary">**** {card.last4}</span>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border-[5px] bg-white transition-all", selectedCardId === card.id ? "border-primary-main" : "border-border-light")}></div>
                      </div>
                    ))}
                    
                    {!showAddCard ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAddCard(true); }}
                        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border-light hover:border-primary-main/50 rounded-xl text-sm font-bold text-primary-main hover:bg-bg-secondary transition-colors mt-1"
                      >
                        <Plus size={18} /> Add New Card
                      </button>
                    ) : (
                      <div className="mt-2 p-4 bg-white border border-border-light rounded-xl flex flex-col gap-3 shadow-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">New Card Details</h4>
                        </div>
                        <input type="text" placeholder="Card Number" value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value.replace(/\D/g, '')})} className="w-full bg-bg-secondary border border-border-light rounded-lg px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors placeholder:font-medium placeholder:text-text-secondary/50" maxLength={16} />
                        <div className="flex gap-3">
                          <input type="text" placeholder="MM/YY" value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-1/2 bg-bg-secondary border border-border-light rounded-lg px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors placeholder:font-medium placeholder:text-text-secondary/50" maxLength={5} />
                          <input type="password" placeholder="CVV" value={newCard.cvv} onChange={e => setNewCard({...newCard, cvv: e.target.value.replace(/\D/g, '')})} className="w-1/2 bg-bg-secondary border border-border-light rounded-lg px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors placeholder:font-medium placeholder:text-text-secondary/50" maxLength={4} />
                        </div>
                        <input type="text" placeholder="Name on Card" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full bg-bg-secondary border border-border-light rounded-lg px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-colors placeholder:font-medium placeholder:text-text-secondary/50" />
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" className="flex-1 h-12 text-sm font-bold rounded-xl" onClick={() => setShowAddCard(false)}>Cancel</Button>
                          <Button className="flex-1 h-12 text-sm font-bold rounded-xl" onClick={handleAddCard} disabled={newCard.number.length < 14 || !newCard.expiry}>Save Card</Button>
                        </div>
                      </div>
                    )}
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
                  <div className="mt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 w-full">
                    <div className="grid grid-cols-4 gap-2">
                      <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedUpiApp('gpay'); }}
                        className={cn("flex flex-col items-center gap-1 bg-white p-2 rounded-xl border-2 shadow-sm cursor-pointer transition-all", selectedUpiApp === 'gpay' ? "border-primary-main ring-2 ring-primary-main/10" : "border-border-light hover:border-primary-main/50")}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="GPay" className="h-7 w-7 object-contain" />
                        <span className="text-[10px] font-bold text-text-primary mt-1">GPay</span>
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedUpiApp('phonepe'); }}
                        className={cn("flex flex-col items-center gap-1 bg-white p-2 rounded-xl border-2 shadow-sm cursor-pointer transition-all", selectedUpiApp === 'phonepe' ? "border-primary-main ring-2 ring-primary-main/10" : "border-border-light hover:border-primary-main/50")}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" className="h-7 w-7 object-contain" />
                        <span className="text-[10px] font-bold text-text-primary mt-1">PhonePe</span>
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedUpiApp('paytm'); }}
                        className={cn("flex flex-col items-center gap-1 bg-white p-2 rounded-xl border-2 shadow-sm cursor-pointer transition-all", selectedUpiApp === 'paytm' ? "border-primary-main ring-2 ring-primary-main/10" : "border-border-light hover:border-primary-main/50")}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" alt="Paytm" className="h-7 w-7 object-contain" />
                        <span className="text-[10px] font-bold text-text-primary mt-1">Paytm</span>
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedUpiApp('amazon'); }}
                        className={cn("flex flex-col items-center gap-1 bg-white p-2 rounded-xl border-2 shadow-sm cursor-pointer transition-all", selectedUpiApp === 'amazon' ? "border-primary-main ring-2 ring-primary-main/10" : "border-border-light hover:border-primary-main/50")}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg" alt="Amazon Pay" className="h-7 w-7 object-contain" />
                        <span className="text-[10px] font-bold text-text-primary mt-1">Amazon</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-2 p-3 bg-white rounded-xl border border-border-light relative overflow-hidden" onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-bold text-text-secondary">Or Enter UPI ID</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={upiId}
                          onChange={(e) => { setUpiId(e.target.value); setUpiVerified(false); }}
                          placeholder="name@okhdfc" 
                          className={cn("flex-1 bg-bg-secondary border rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors", upiVerified ? "border-success/50 bg-success/5" : "border-border-light focus:border-primary-main focus:ring-1 focus:ring-primary-main")} 
                        />
                        <Button 
                          onClick={() => {
                            if (!upiId) return;
                            setIsVerifyingUpi(true);
                            setTimeout(() => { setIsVerifyingUpi(false); setUpiVerified(true); }, 1500);
                          }}
                          disabled={isVerifyingUpi || upiVerified || !upiId}
                          className={cn("h-10 px-4 rounded-lg text-sm font-bold shadow-sm transition-all", upiVerified ? "bg-success hover:bg-success text-white" : "")}
                        >
                          {isVerifyingUpi ? '...' : upiVerified ? 'Verified' : 'Verify'}
                        </Button>
                      </div>
                      {upiVerified && (
                        <div className="absolute top-0 right-0 p-2 text-success">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
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
