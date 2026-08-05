import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Car, CheckCircle, Clock, Search } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * Orders currently "Out for Delivery" — real data from GET /vendor/deliveries.
 *
 * There is no rider-assignment, GPS-location or call/SMS backend anywhere in
 * this app, so the live map / driver-calling UI that used to live here was
 * pure decoration. This screen now only shows what's real: the order, who
 * it's for, and a working "Mark Delivered" action.
 */
export function LiveTrackingView() {
  const { deliveries, updateDeliveryStatus } = useMealProvider();
  const [search, setSearch] = useState('');

  const active = deliveries.filter((d) => d.status === 'Out for Delivery');
  const filtered = active.filter((d) =>
    !search ||
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.customer.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkDelivered = (del) => {
    if (window.confirm(`Mark delivery ${del.id} to ${del.customer} as Delivered?`)) {
      updateDeliveryStatus(del._id || del.id, 'Delivered');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Out for Delivery</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Orders currently on their way. No live GPS/rider tracking is wired up yet.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order or customer..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F87B68]/20 focus:border-[#F87B68] transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Car size={40} className="text-gray-200 mb-4" />
            <p className="font-bold text-gray-400 text-sm">No orders out for delivery</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((del) => (
              <div key={del.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{del.customer}</p>
                    <p className="text-xs text-gray-500 truncate">{del.plan} &middot; {del.orderId}</p>
                  </div>
                </div>
                {del.deliveryTime && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <Clock size={13} /> {del.deliveryTime}
                  </div>
                )}
                <button
                  onClick={() => handleMarkDelivered(del)}
                  className="shrink-0 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Mark Delivered
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
