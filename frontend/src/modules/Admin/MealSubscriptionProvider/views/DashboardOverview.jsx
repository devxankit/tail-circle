import React from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Package, Utensils, IndianRupee, Clock } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function DashboardOverview() {
  const { finances, subscriptions, deliveries, kitchenQueue } = useMealProvider();

  const activeCount = subscriptions.filter(s => s.status === 'Active').length;
  const preparingCount = kitchenQueue.reduce((s, k) => s + (k.qty || 0), 0);
  const outForDelivery = deliveries.filter(d => d.status === 'Out for Delivery').length;
  const deliveredCount = deliveries.filter(d => d.status === 'Delivered').length;

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", color)}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Morning Shift Overview</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">Here is what is happening in the kitchen today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Active Subscriptions" value={activeCount} icon={Package} color="bg-blue-600" />
        <StatCard title="Units Preparing" value={preparingCount} icon={Utensils} color="bg-orange-600" />
        <StatCard title="Out for Delivery" value={outForDelivery} icon={Clock} color="bg-purple-600" />
        <StatCard title="Lifetime Earnings" value={`₹${(finances.lifetimeEarnings || 0).toLocaleString('en-IN')}`} icon={IndianRupee} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-900">Live Kitchen Queue</h3>
            <button className="text-sm font-bold text-[#F87B68] hover:underline cursor-pointer">View Full Board</button>
          </div>
          <div className="space-y-3">
            {kitchenQueue.map(kq => (
              <div key={kq.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-orange-500">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{kq.qty}x {kq.type}</h4>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                  Preparing
                </span>
              </div>
            ))}
            {!kitchenQueue.length && (
              <p className="text-sm text-gray-400 text-center py-6">Nothing in preparation right now.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Utensils size={120} /></div>
          <h3 className="text-base font-bold mb-6">Delivery Snapshot</h3>

          <div className="space-y-6">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Delivered</p>
              <p className="text-4xl font-black">{deliveredCount} <span className="text-base text-slate-400 font-medium tracking-normal">/ {deliveries.length} loaded</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Out for Delivery</p>
              <p className="text-2xl font-black text-purple-300">{deliveries.filter(d => d.status === 'Out for Delivery').length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
