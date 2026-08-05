import React, { useState, useEffect } from 'react';
import { ChevronLeft, Package, CheckCircle, Clock, Truck, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchMyOrders, cancelOrder } from '../../../../../services/shop';

const STATUS_META = {
  placed: { label: 'Placed', icon: Clock, cls: 'text-amber-600' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, cls: 'text-amber-600' },
  packed: { label: 'Packed', icon: Package, cls: 'text-blue-600' },
  shipped: { label: 'Shipped', icon: Truck, cls: 'text-blue-600' },
  out_for_delivery: { label: 'Out for delivery', icon: Truck, cls: 'text-blue-600' },
  delivered: { label: 'Delivered', icon: CheckCircle, cls: 'text-success' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'text-red-500' },
  return_requested: { label: 'Return requested', icon: Clock, cls: 'text-amber-600' },
  returned: { label: 'Returned', icon: CheckCircle, cls: 'text-text-secondary' },
  refunded: { label: 'Refunded', icon: CheckCircle, cls: 'text-text-secondary' },
};

const CANCELLABLE = ['placed', 'confirmed', 'packed'];

export function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCancel = async (order) => {
    setBusyId(order._id);
    try {
      const updated = await cancelOrder(order._id);
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    } catch {
      /* keep list as-is */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">My Orders</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={40} className="text-text-disabled mb-3" />
            <p className="font-bold text-text-primary">No orders yet</p>
            <p className="text-sm text-text-secondary mt-1">Your shop orders will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const first = order.items[0] || {};
              const extra = order.items.length - 1;
              const meta = STATUS_META[order.status] || STATUS_META.placed;
              const StatusIcon = meta.icon;
              return (
                <div key={order._id} className="bg-white p-4 rounded-[20px] shadow-sm border border-border-light flex gap-4">
                  <div className="w-16 h-16 rounded-[12px] bg-bg-secondary overflow-hidden shrink-0">
                    <img src={first.img} alt="Product" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-bold text-text-primary text-sm leading-tight">
                        {first.name}{extra > 0 ? ` +${extra} more` : ''}
                      </h3>
                      <p className="text-xs font-medium text-text-secondary mt-1">
                        Order #{order.orderNo} · {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <span className="font-bold text-primary-dark">₹{(order.amounts.total / 100).toFixed(2)}</span>
                      <div className="flex items-center gap-3">
                        {CANCELLABLE.includes(order.status) && (
                          <button
                            onClick={() => handleCancel(order)}
                            disabled={busyId === order._id}
                            className="text-[10px] uppercase font-bold text-red-500 hover:underline disabled:opacity-50"
                          >
                            {busyId === order._id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                        <span className={`flex items-center gap-1 text-[10px] uppercase font-bold ${meta.cls}`}>
                          <StatusIcon size={12} /> {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
