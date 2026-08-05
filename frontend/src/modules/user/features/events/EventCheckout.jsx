import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Wallet, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { api } from '../../../../services/api';
import { payWithRazorpay } from '../../../../services/payments';

export function EventCheckout() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [ticketCount, setTicketCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const event = location.state?.event;

  if (!event) {
    return <div className="p-8 text-center">Event not found.</div>;
  }

  // Parse price logic (price may arrive as a number or a display string)
  const priceStr = String(event.price);
  const isFree = priceStr.toLowerCase() === 'free' || Number(event.price) === 0;
  const numericPrice = isFree ? 0 : parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  const subtotal = numericPrice * ticketCount;
  const platformFee = isFree ? 0 : 49;
  const total = subtotal + platformFee;

  const [error, setError] = useState('');

  const handlePay = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/bookings', {
        type: 'event',
        eventId: String(event.id),
        ticketQty: ticketCount,
        paymentMethod: 'razorpay',
        meta: { withPlatformFee: true },
      });
      if (data.razorpay) {
        await payWithRazorpay(data.razorpay, { description: `Tickets — ${event.title}` });
      }
      navigate(`/app/services/events/${id}/success`, {
        state: { event, ticketCount, total, bookingNo: data.booking.bookingNo },
      });
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
        <h1 className="text-xl font-bold text-text-primary ml-2">Review Booking</h1>
      </div>

      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white">
          <div className="w-16 h-16 border-4 border-border-light border-t-primary-main rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {!isFree && paymentMethod === 'upi' ? 'Opening UPI App...' : 'Processing Payment'}
          </h2>
          <p className="text-text-secondary">Please do not close this screen...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Event Summary Card */}
          <div className="bg-white p-4 mb-4 border-b border-border-light">
            <div className="flex gap-4">
              <img src={event.img} alt={event.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
              <div className="flex flex-col flex-1 py-1">
                <h3 className="font-bold text-text-primary text-base leading-tight mb-1">{event.title}</h3>
                <p className="text-xs text-text-secondary mb-1">{event.day} {event.month} 2026 • {event.time}</p>
                <p className="text-xs text-text-secondary">{event.location}</p>
              </div>
            </div>
          </div>

          {/* Ticket Selection */}
          <div className="bg-white p-4 mb-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Select Tickets</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-text-primary">General Admission</p>
                <p className="text-xs text-text-secondary">{event.price} per person</p>
              </div>
              <div className="flex items-center gap-4 bg-bg-secondary rounded-full px-2 py-1">
                <button 
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-text-primary shadow-sm active:scale-95 transition-transform"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-lg w-4 text-center">{ticketCount}</span>
                <button 
                  onClick={() => setTicketCount(ticketCount + 1)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-main shadow-sm active:scale-95 transition-transform"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method (if not free) */}
          {!isFree && (
            <div className="bg-white p-4 mb-4 border-y border-border-light">
              <h3 className="font-bold text-text-primary mb-4">Payment Method</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all w-full text-left",
                    paymentMethod === 'card' ? "border-primary-main bg-primary-light/10" : "border-border-light bg-white opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={paymentMethod === 'card' ? "text-primary-main" : "text-text-secondary"} size={24} />
                    <span className="font-bold text-sm">Credit Card (**** 4242)</span>
                  </div>
                  {paymentMethod === 'card' && <CheckCircle2 className="text-primary-main" size={20} />}
                </button>
                
                <button 
                  onClick={() => setPaymentMethod('upi')}
                  className={cn(
                    "flex flex-col p-3 rounded-xl border-2 transition-all w-full text-left",
                    paymentMethod === 'upi' ? "border-primary-main bg-primary-light/10" : "border-border-light bg-white opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className={paymentMethod === 'upi' ? "text-primary-main" : "text-text-secondary"} size={24} />
                      <span className="font-bold text-sm">UPI / Wallets</span>
                    </div>
                    {paymentMethod === 'upi' && <CheckCircle2 className="text-primary-main" size={20} />}
                  </div>
                  {/* UPI Options Dropdown */}
                  {paymentMethod === 'upi' && (
                    <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 w-full">
                      <div className="flex-1 flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-border-light shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple Pay" className="h-6 object-contain" />
                        <span className="text-[10px] font-bold text-text-secondary">Apple Pay</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-border-light shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="GPay" className="h-6 object-contain" />
                        <span className="text-[10px] font-bold text-text-secondary">GPay</span>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-white p-4 border-y border-border-light">
            <h3 className="font-bold text-text-primary mb-4">Price Details</h3>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-text-secondary">{ticketCount} x Ticket{ticketCount > 1 ? 's' : ''}</span>
              <span className="font-medium text-text-primary">{isFree ? 'Free' : `₹${subtotal}`}</span>
            </div>
            {!isFree && (
              <div className="flex justify-between mb-4 text-sm">
                <span className="text-text-secondary">Platform Fee & Taxes</span>
                <span className="font-medium text-text-primary">₹{platformFee}</span>
              </div>
            )}
            <div className="border-t border-border-light pt-4 flex justify-between">
              <span className="font-bold text-text-primary">Total Amount</span>
              <span className="font-black text-primary-main text-lg">{isFree ? 'Free' : `₹${total}`}</span>
            </div>
          </div>

        </div>
      )}

      {/* Fixed Bottom Bar */}
      {!isProcessing && (
        <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
          {error && (
            <p className="text-center text-xs font-bold text-red-500 mb-2">{error}</p>
          )}
          <Button onClick={handlePay} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 flex justify-between items-center px-6">
            <span>{isFree ? 'Get Ticket' : 'Pay Securely'}</span>
            <span>{isFree ? 'Free' : `₹${total}`}</span>
          </Button>
        </div>
      )}

    </div>
  );
}
