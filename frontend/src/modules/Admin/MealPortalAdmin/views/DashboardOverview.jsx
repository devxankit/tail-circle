import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { 
  Package, Truck, IndianRupee, AlertOctagon, 
  CalendarCheck, Store, Clock, RefreshCcw, TrendingUp, TrendingDown 
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function DashboardOverview() {
  const { platformMetrics, globalDeliveries } = useMealPortal();

  const StatCard = ({ title, value, icon: Icon, trend, trendUp, color }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col hover:shadow-lg hover:border-gray-200 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110", color)}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full", trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">
          {title.includes('Revenue') ? `₹${(value / 100000).toFixed(2)}L` : value}
        </h3>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Platform Overview</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">Live metrics across all meal providers and delivery zones.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          System Operational
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Active Subs" value={platformMetrics.activeSubscriptions} icon={Package} trend="+12%" trendUp={true} color="bg-blue-600" />
        <StatCard title="Today's Revenue" value={platformMetrics.totalRevenue} icon={IndianRupee} trend="+5%" trendUp={true} color="bg-emerald-600" />
        <StatCard title="Live Vendors" value={platformMetrics.activeVendors} icon={Store} trend="+2" trendUp={true} color="bg-purple-600" />
        <StatCard title="Today's Deliveries" value={platformMetrics.totalDeliveriesToday} icon={Truck} trend="High" trendUp={true} color="bg-orange-600" />
        
        <StatCard title="Delayed Ops" value={platformMetrics.delayedDeliveries} icon={Clock} trend="Critical" trendUp={false} color="bg-amber-500" />
        <StatCard title="Failed Deliveries" value={platformMetrics.failedDeliveries} icon={AlertOctagon} trend="-1%" trendUp={true} color="bg-red-600" />
        <StatCard title="Pending Trials" value={platformMetrics.pendingTrials} icon={CalendarCheck} trend="+18%" trendUp={true} color="bg-indigo-600" />
        <StatCard title="Refund Requests" value={platformMetrics.refundRequests} icon={RefreshCcw} trend="Low" trendUp={true} color="bg-slate-700" />
      </div>

      <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-gray-900">Real-Time Global Delivery Radar</h3>
          <button className="text-sm font-bold text-[#F87B68] hover:underline cursor-pointer">View Map</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            {globalDeliveries.slice(0,4).map(del => (
              <div key={del.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                    del.status === 'Delivered' ? 'bg-emerald-500' :
                    del.status === 'Delayed' ? 'bg-amber-500' :
                    del.status === 'Failed' ? 'bg-red-500' : 'bg-blue-500'
                  )}>
                    <Truck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">{del.vendor}</h4>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">{del.zone} • {del.driver}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border",
                    del.status === 'Delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    del.status === 'Delayed' ? "bg-amber-50 text-amber-700 border-amber-100" :
                    del.status === 'Failed' ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {del.status}
                  </span>
                  <p className="text-[10px] font-bold text-gray-500 mt-1">ETA: {del.eta}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-white font-black text-xl mb-2">Live GPS Link Active</h3>
              <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">420 active delivery drivers currently broadcasting location data to the centralized Tail Circle node.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
