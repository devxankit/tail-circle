import React, { useState } from 'react';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ProductImage } from './ProductImage';
import { loadCart, saveCart as saveCartApi } from '../../../../services/shop';

export function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  React.useEffect(() => {
    loadCart().then(setItems).catch(() => setItems([]));
  }, []);

  const saveCart = (newItems) => {
    setItems(newItems);
    saveCartApi(newItems).catch(() => {});
  };

  const updateQuantity = (id, size, newQuantity) => {
    if (newQuantity < 1) return;
    const newItems = items.map(item => (item.id === id && item.size === size) ? { ...item, quantity: newQuantity } : item);
    saveCart(newItems);
  };

  const removeItem = (id, size) => {
    const newItems = items.filter(item => !(item.id === id && item.size === size));
    saveCart(newItems);
  };

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-[70] animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-border-light sticky top-0 bg-white z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary ml-2 flex items-center gap-2">
          My Cart <span className="bg-primary-main text-white text-xs px-2 py-0.5 rounded-full">{items.length}</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center mt-20">
            <div className="w-24 h-24 bg-primary-light/30 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={48} className="text-primary-main opacity-50" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Your cart is empty</h2>
            <p className="text-text-secondary mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Button onClick={() => navigate('/app/shop')} className="px-8 rounded-full font-bold">Start Shopping</Button>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-2xl flex gap-4 shadow-sm border border-border-light relative animate-in fade-in duration-300">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-bg-secondary shrink-0">
                    <ProductImage src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 py-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-text-primary text-sm leading-tight pr-6">{item.name}</h3>
                      <button onClick={() => removeItem(item.id, item.size)} className="absolute top-3 right-3 text-text-secondary hover:text-error transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mb-2 mt-0.5">Size: {item.size}</p>
                    
                    <div className="mt-auto flex justify-between items-center">
                      <span className="font-black text-primary-dark">₹{item.price.toFixed(2)}</span>
                      
                      <div className="flex items-center gap-3 bg-bg-secondary rounded-lg px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-text-primary shadow-sm hover:bg-gray-50 active:scale-95"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-primary-main shadow-sm hover:bg-gray-50 active:scale-95"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="bg-white p-6 mt-4 border-t border-border-light rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <h3 className="font-bold text-text-primary mb-4 text-lg">Order Summary</h3>
              <div className="flex justify-between mb-3 text-sm">
                <span className="text-text-secondary font-medium">Subtotal</span>
                <span className="font-bold text-text-primary">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-3 text-sm">
                <span className="text-text-secondary font-medium">Estimated Tax</span>
                <span className="font-bold text-text-primary">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-4 text-sm">
                <span className="text-text-secondary font-medium">Delivery</span>
                <span className="font-bold text-success">Free</span>
              </div>
              <div className="border-t border-border-light border-dashed pt-4 flex justify-between items-center">
                <span className="font-bold text-text-primary text-base">Total</span>
                <span className="font-black text-primary-main text-2xl">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      {items.length > 0 && (
        <div 
          className="absolute bottom-0 w-full bg-white border-t border-border-light px-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"
          style={{
            paddingTop: '16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <Button 
            onClick={() => navigate('/app/shop/checkout', { state: { items, total, subtotal, tax } })}
            className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30 flex justify-between items-center px-6 cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <span>₹{total.toFixed(2)}</span>
          </Button>
        </div>
      )}

    </div>
  );
}
