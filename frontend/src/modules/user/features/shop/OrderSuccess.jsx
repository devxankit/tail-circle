import React from 'react';
import { CheckCircle, MapPin, Package, Download, Home, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ProductImage } from './ProductImage';

export function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, total, order } = location.state || {};

  if (!items) {
    return <div className="p-8 text-center">No order data found.</div>;
  }

  const orderNo = order?.orderNo || 'ORD-77421';
  const addr = order?.addressSnapshot;

  const handleDownload = () => {
    const receiptContent = `
========================================
             ORDER INVOICE
========================================

Order ID: #${orderNo}
Status: ${order ? order.status.toUpperCase() : 'CONFIRMED'}
Date: ${new Date(order?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

SHIPPING DETAILS
----------------------------------------
${addr ? `${addr.fullName}\n${addr.line1}\n${addr.city}, ${addr.state} ${addr.pincode}\n${addr.phone}` : 'As selected at checkout'}

ORDER ITEMS
----------------------------------------
${items.map(item => `${item.quantity}x ${item.name} (₹${(item.price * item.quantity).toFixed(2)})`).join('\n')}

PAYMENT DETAILS
----------------------------------------
Subtotal: ₹${order ? (order.amounts.subtotal / 100).toFixed(2) : (total - total * 0.05).toFixed(2)}
Tax: ₹${order ? (order.amounts.tax / 100).toFixed(2) : (total * 0.05).toFixed(2)}
Total Paid: ₹${order ? (order.amounts.total / 100).toFixed(2) : total.toFixed(2)}
Payment: ${order?.paymentMethod === 'cod' ? 'CASH ON DELIVERY' : 'PAID ONLINE'}

========================================
Estimated Delivery: Tomorrow, 9 PM
Thank you for shopping at TailCircle!
========================================
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TailCircle_Invoice_${orderNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-primary-main absolute inset-0 z-[80] animate-in slide-in-from-bottom duration-500">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 sticky top-0 z-10 text-white">
        <button onClick={() => navigate('/app/shop')} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-6 pt-2 overflow-y-auto pb-32">
        
        {/* Success Icon */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-in zoom-in duration-500 delay-150">
          <CheckCircle size={48} className="text-primary-main" />
        </div>
        
        <h1 className="text-3xl font-black text-white text-center mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          Order Placed!
        </h1>
        <p className="text-white/80 text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
          Your order has been successfully confirmed.
        </p>

        {/* Order Card */}
        <div className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          
          <div className="p-6 pb-6 border-b border-border-light border-dashed">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Order ID</h2>
              <span className="font-bold text-text-primary">#ORD-77421</span>
            </div>
            <div className="flex items-center gap-4 bg-primary-light/10 p-3 rounded-xl border border-primary-light/20">
              <Package size={24} className="text-primary-main shrink-0" />
              <div>
                <p className="font-bold text-text-primary text-sm">Estimated Delivery</p>
                <p className="text-xs text-text-secondary">Arrives by tomorrow, 9 PM</p>
              </div>
            </div>
          </div>

          <div className="p-6 pb-8">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Order Summary</h2>
            
            <div className="flex flex-col gap-4 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <ProductImage src={item.img} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-bg-secondary shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-sm line-clamp-1">{item.name}</p>
                    <p className="text-xs text-text-secondary">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bg-bg-secondary rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-text-secondary mb-1">Payment Method</p>
                <p className="font-bold text-text-primary text-sm">Card (**** 4242)</p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary mt-1">Paid: <span className="font-bold text-text-primary">₹{total.toFixed(2)}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex gap-4">
        <Button onClick={() => navigate('/app/shop')} variant="outline" className="flex-1 h-14 rounded-full font-bold">
          <Home size={18} className="mr-2" /> Store
        </Button>
        <Button onClick={handleDownload} className="flex-1 h-14 rounded-full font-bold shadow-lg shadow-primary-main/30 active:scale-95 transition-transform">
          <Download size={18} className="mr-2" /> Invoice
        </Button>
      </div>

    </div>
  );
}
