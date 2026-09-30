import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Car, CheckCircle, Clock } from 'lucide-react';
import { SearchBar, CardAction, useConfirm } from '../../vendor/mobile';

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
  const confirm = useConfirm();

  const active = deliveries.filter((d) => d.status === 'Out for Delivery');
  const filtered = active.filter((d) =>
    !search ||
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.customer.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkDelivered = async (del) => {
    if (await confirm({ title: `Mark delivery ${del.id} to ${del.customer} as Delivered?`, confirmLabel: 'Mark Delivered' })) {
      updateDeliveryStatus(del._id || del.id, 'Delivered');
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Out for Delivery</h2>
        <p className="text-xs text-text-secondary mt-1">Orders currently on their way. No live GPS/rider tracking is wired up yet.</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search order or customer..." />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border-light flex flex-col items-center justify-center py-14 text-center">
          <Car size={40} className="text-text-disabled mb-4" />
          <p className="font-bold text-text-secondary text-sm">No orders out for delivery</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((del) => (
            <div key={del.id} className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent-teal/10 text-[#4C8684] flex items-center justify-center shrink-0">
                  <Car size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary truncate">{del.customer}</p>
                  <p className="text-xs text-text-secondary truncate">{del.plan} &middot; {del.orderId}</p>
                </div>
              </div>
              {del.deliveryTime && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-2">
                  <Clock size={13} /> {del.deliveryTime}
                </div>
              )}
              <CardAction tone="teal" icon={CheckCircle} className="w-full mt-3" onClick={() => handleMarkDelivered(del)}>
                Mark Delivered
              </CardAction>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
