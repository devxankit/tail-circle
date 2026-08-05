import React, { useState, useEffect } from 'react';
import { ChevronLeft, Truck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mirrors meal.models.js's real status enum — no fabricated "Local Hub" step.
const DELIVERY_STEPS = [
  { status: 'Preparing', label: 'Order Prepared' },
  { status: 'Out for Delivery', label: 'Out for Delivery' },
  { status: 'Delivered', label: 'Delivered' },
];

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

  const currentStepIndex = latestOrder
    ? Math.max(0, DELIVERY_STEPS.findIndex((s) => s.status === latestOrder.status))
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-gray-150 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black text-text-primary ml-2 flex-1 tracking-tight">Track Delivery</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-[600px] mx-auto w-full">
        {/* No live courier GPS feed exists yet — an honest status card instead
            of a map pinned to a location nobody is actually reporting from. */}
        <div className="w-full bg-gradient-to-br from-[#599D9A] to-[#3f7d76] rounded-[28px] mb-6 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 bg-white/15 text-white rounded-full flex items-center justify-center shrink-0">
            <Truck size={26} />
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">{latestOrder?.status || 'Preparing'}</p>
            <p className="text-white/70 text-xs font-bold mt-0.5">
              {latestOrder?.deliveryTime || 'We’ll update this as your order moves'}
            </p>
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

            {DELIVERY_STEPS.map((step, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div key={step.status} className="flex gap-4 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      done
                        ? 'bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'
                        : active
                        ? 'bg-[#599D9A] text-white shadow-[0_0_0_4px_rgba(22,121,107,0.2)]'
                        : 'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    {done && <CheckCircle2 size={14} strokeWidth={2.5} />}
                    {active && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                  <div>
                    <h4 className={`font-black text-sm leading-tight ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </h4>
                    {active && (
                      <p className="text-[10px] text-[#599D9A] font-black mt-0.5">
                        {latestOrder?.deliveryTime || latestOrder?.date || ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
