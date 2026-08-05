import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Truck, Clock } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

// Matches the backend's real state machine (meal.vendor.service.js
// DELIVERY_NEXT) exactly — there is no "Packed" status server-side, so a
// column for it silently swallowed every drop into it.
const DELIVERY_NEXT = {
  Preparing: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
};

export function DeliveryManagementView() {
  const { deliveries, updateDeliveryStatus } = useMealProvider();

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Delivery Operations Board</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Drag and drop orders to update delivery status.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-6 h-full min-h-[500px] min-w-[1000px]">
          {columns.map(col => {
            const columnDeliveries = deliveries.filter(d => d.status === col.id);
            
            return (
              <div 
                key={col.id}
                className="flex-1 bg-gray-50/50 rounded-3xl border border-gray-100 p-4 flex flex-col"
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{col.label}</h3>
                  <span className={cn("px-2.5 py-1 text-[10px] font-black rounded-lg border", col.color)}>
                    {columnDeliveries.length}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                  {columnDeliveries.map(delivery => (
                    <div 
                      key={delivery.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, delivery)}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold text-gray-400 font-mono">{delivery.orderId}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1">{delivery.customer}</h4>
                      <p className="text-xs text-gray-500 font-medium mb-4">{delivery.plan}</p>

                      <div className="space-y-2 border-t border-gray-50 pt-3 mt-3">
                        {delivery.deliveryTime && (
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <Clock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{delivery.deliveryTime}</span>
                          </div>
                        )}
                        {delivery.driver && (
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 bg-gray-50 p-2 rounded-lg mt-2">
                            <div className="flex items-center gap-1.5"><Truck size={12} className="text-purple-500" /> {delivery.driver}</div>
                            {delivery.eta && <div className="text-purple-600">ETA: {delivery.eta}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {columnDeliveries.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Drop Here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
