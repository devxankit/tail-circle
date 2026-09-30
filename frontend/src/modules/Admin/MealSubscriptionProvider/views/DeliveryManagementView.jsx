import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Truck, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { SegmentedTabs, CardAction } from '../../vendor/mobile';

// Matches the backend's real state machine (meal.vendor.service.js
// DELIVERY_NEXT) exactly — there is no "Packed" status server-side, so a
// column for it silently swallowed every drop into it.
const DELIVERY_NEXT = {
  Preparing: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
};

export function DeliveryManagementView() {
  const { deliveries, updateDeliveryStatus } = useMealProvider();
  // Which column is showing (UI only) — the board is one column at a time on a phone.
  const [activeCol, setActiveCol] = useState('Preparing');

  const columns = [
    { id: 'Preparing', label: 'Preparing in Kitchen', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'Out for Delivery', label: 'Out for Delivery', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'Delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ];

  const handleDragStart = (e, delivery) => {
    e.dataTransfer.setData('deliveryId', delivery.id);
    e.dataTransfer.setData('fromStatus', delivery.status);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('deliveryId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    if (!id || fromStatus === status) return;
    if (!(DELIVERY_NEXT[fromStatus] || []).includes(status)) return; // invalid transition, ignore
    updateDeliveryStatus(id, status);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /*
   * Drag-and-drop never fires on a touch screen, so each card also carries a
   * button for its one allowed next step. It calls updateDeliveryStatus with
   * exactly what a drop into that column would: (delivery.id, nextStatus).
   */
  const moveLabel = { 'Out for Delivery': 'Move to Out for delivery', Delivered: 'Mark delivered' };
  const col = columns.find((c) => c.id === activeCol) || columns[0];
  const columnDeliveries = deliveries.filter(d => d.status === col.id);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Delivery Operations Board</h2>
        <p className="text-xs text-text-secondary mt-1">Move orders along to update their delivery status.</p>
      </div>

      <SegmentedTabs
        activeKey={col.id}
        onSelect={setActiveCol}
        items={columns.map((c) => ({
          key: c.id,
          label: c.id === 'Preparing' ? 'Preparing' : c.id === 'Out for Delivery' ? 'Out' : 'Delivered',
          badge: deliveries.filter(d => d.status === c.id).length || null,
        }))}
      />

      <div
        className="space-y-3"
        onDrop={(e) => handleDrop(e, col.id)}
        onDragOver={handleDragOver}
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary px-1">{col.label}</h3>

        {columnDeliveries.map(delivery => {
          const next = (DELIVERY_NEXT[delivery.status] || [])[0];
          return (
            <div
              key={delivery.id}
              draggable
              onDragStart={(e) => handleDragStart(e, delivery)}
              className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm"
            >
              <span className="text-[10px] font-bold text-text-secondary font-mono">{delivery.orderId}</span>
              <h4 className="text-[15px] font-bold text-text-primary mt-1">{delivery.customer}</h4>
              <p className="text-xs text-text-secondary font-medium">{delivery.plan}</p>

              {(delivery.deliveryTime || delivery.driver) && (
                <div className="space-y-2 border-t border-border-light pt-3 mt-3">
                  {delivery.deliveryTime && (
                    <div className="flex items-start gap-2 text-xs text-text-primary">
                      <Clock size={14} className="text-text-secondary shrink-0 mt-0.5" />
                      <span className="leading-tight">{delivery.deliveryTime}</span>
                    </div>
                  )}
                  {delivery.driver && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-text-secondary bg-bg-primary p-2 rounded-lg">
                      <div className="flex items-center gap-1.5"><Truck size={12} className="text-accent-teal" /> {delivery.driver}</div>
                      {delivery.eta && <div className="text-[#4C8684]">ETA: {delivery.eta}</div>}
                    </div>
                  )}
                </div>
              )}

              {next && (
                <CardAction
                  tone={next === 'Delivered' ? 'teal' : 'primary'}
                  icon={next === 'Delivered' ? CheckCircle : ArrowRight}
                  className="w-full mt-3"
                  onClick={() => updateDeliveryStatus(delivery.id, next)}
                >
                  {moveLabel[next]}
                </CardAction>
              )}
            </div>
          );
        })}

        {columnDeliveries.length === 0 && (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-border-light rounded-[20px] text-xs font-bold text-text-secondary uppercase tracking-widest bg-white">
            No orders here
          </div>
        )}
      </div>
    </div>
  );
}
