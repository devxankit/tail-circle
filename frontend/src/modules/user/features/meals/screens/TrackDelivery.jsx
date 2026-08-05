import React, { useState, useEffect } from 'react';
import { ChevronLeft, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TrackDelivery() {
  const navigate = useNavigate();
  const [latestOrder, setLatestOrder] = useState(null);

  useEffect(() => {
    import('../../../../../services/meals').then(({ fetchMealOrders }) =>
      fetchMealOrders().then((orders) =>
        setLatestOrder(orders.find((o) => o.type !== 'Package Purchase') || null)
      )
    ).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-gray-150 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black text-text-primary ml-2 flex-1 tracking-tight">Track Delivery</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-[600px] mx-auto w-full">
        <div className="w-full h-48 bg-gray-100 rounded-[28px] mb-6 overflow-hidden relative shadow-sm border border-gray-200">
          {/* Mock Map Image */}
          <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80" alt="Map" className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-[#599D9A]/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#599D9A] text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-250/60 relative overflow-hidden">
          <h2 className="text-lg font-black text-gray-900 mb-1">
            {latestOrder ? `Order #${latestOrder.id.replace('ord_', '').toUpperCase()} — ${latestOrder.status}` : 'Arriving Tomorrow'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mb-6">
            {latestOrder?.deliveryTime || 'Estimated time: 10:00 AM - 12:00 PM'}
          </p>
          
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-150"></div>
            
            <div className="flex gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]">
                <CheckCircle2 size={14} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 leading-tight">Order Prepared</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Today, 8:30 AM</p>
              </div>
            </div>
            
            <div className="flex gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-[#599D9A] text-white flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_4px_rgba(22,121,107,0.2)]">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 leading-tight">In Transit to Local Hub</h4>
                <p className="text-[10px] text-[#599D9A] font-black mt-0.5">Expected today by 8 PM</p>
              </div>
            </div>
            
            <div className="flex gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center shrink-0 z-10"></div>
              <div>
                <h4 className="font-black text-sm text-gray-400 leading-tight">Out for Delivery</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Tomorrow morning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
