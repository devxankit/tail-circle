import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, Search, ArrowLeft, Heart, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShopList } from './ShopList';
import { api } from '../../../../services/api';

export function Shop() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [deliveryPincode, setDeliveryPincode] = useState('');

  useEffect(() => {
    api.get('/addresses')
      .then(({ data }) => {
        const address = data.find((a) => a.isDefault) || data[0];
        if (address) setDeliveryPincode(address.pincode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartCount(items.reduce((acc, item) => acc + (item.quantity || 0), 0));
        } catch (e) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('cart-updated', updateCartCount);
    return () => window.removeEventListener('cart-updated', updateCartCount);
  }, []);
  return (
    <div className="w-full bg-white relative">
      
      {/* Top Header - Like Screenshot */}
      <div className="bg-white sticky top-0 pt-4 pb-3 px-4 shadow-sm z-40">
        <div className="flex items-center justify-between mb-3">
          
          {/* Logo Icon */}
          <div className="flex flex-shrink-0 items-center justify-center">
            <img src="/logo/Tail-removebg-preview.png" alt="TailCircle Logo" className="w-[42px] h-[42px] object-contain cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate('/app/profile')} />
          </div>
          
          {/* Heart & Cart */}
          <div className="flex items-center gap-4 flex-shrink-0 ml-1">
            <button onClick={() => navigate('/app/profile/saved')} className="text-gray-700">
              <Heart size={26} strokeWidth={2} />
            </button>
            <button 
              onClick={() => navigate('/app/shop/cart')}
              className="text-gray-700 relative"
            >
              <ShoppingBag size={26} strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F87B68] text-white text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">
                   {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Deliver To Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[14px]">
            <MapPin size={16} className="text-[#F87B68]" />
            <span className="text-gray-500">Deliver to:</span>
            <span className="font-bold text-gray-800">{deliveryPincode || 'Add an address'}</span>
          </div>
          <button onClick={() => navigate('/app/profile/address')} className="text-[#F87B68] font-bold text-[14px]">Change</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#FAF7F2]">
        <ShopList />
      </div>
    </div>
  );
}
