import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { Map, AlertOctagon, LocateFixed, Car, ArrowUpRight } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function DeliveryOperationsView() {
  const { globalDeliveries, platformMetrics } = useMealPortal();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Global Logistics Command</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Uber-style monitoring for cross-vendor fleet operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-slate-900/20 cursor-pointer flex items-center gap-2">
            <Map size={16} /> Open Live GPS Heatmap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Alerts & Metrics */}
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertOctagon size={80} /></div>
            <h3 className="text-red-900 font-black text-lg mb-1">Critical SLA Breaches</h3>
            <p className="text-red-700 text-sm font-semibold mb-6">Immediate admin intervention required.</p>
            
            <div className="space-y-3">
              {globalDeliveries.filter(d => d.status === 'Delayed' || d.status === 'Failed').map(d => (
                <div key={d.id} className="bg-white p-3 rounded-xl border border-red-200 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-red-600 font-mono">{d.orderId}</span>
                    <span className="text-[9px] font-black uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{d.status}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{d.vendor}</p>
                  <p className="text-xs text-gray-500 mt-1">Driver: {d.driver}</p>
                  <button className="w-full mt-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer">Re-assign Fleet</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Fleet Activity</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Active Drivers</span>
                <span className="text-lg font-black text-gray-900">420</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Deliveries Assigned</span>
                <span className="text-lg font-black text-gray-900">{platformMetrics.totalDeliveriesToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Avg Delivery Time</span>
                <span className="text-lg font-black text-emerald-600">28 mins</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col - Live Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-900">Active Delivery Routes</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live Radar Link</span>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {globalDeliveries.map(del => (
              <div key={del.id} className="group relative overflow-hidden bg-gray-50 rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 shadow-sm">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{del.orderId}</span>
                        <span className="text-[10px] font-bold text-gray-500">Zone: {del.zone}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{del.vendor} <span className="text-gray-400 font-medium">→</span> {del.user}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><LocateFixed size={12} className="text-[#F87B68]"/> Driver: <b>{del.driver}</b></p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border",
                      del.status === 'Delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      del.status === 'Delayed' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      del.status === 'Failed' ? "bg-red-50 text-red-700 border-red-100" :
                      "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {del.status}
                    </span>
                    <p className="text-[11px] font-bold text-gray-500 mt-2">ETA: {del.eta}</p>
                  </div>
                </div>

                {/* Progress bar mock */}
                {del.status !== 'Failed' && del.status !== 'Delivered' && (
                  <div className="mt-4 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className={cn("h-full", del.status === 'Delayed' ? 'bg-amber-500' : 'bg-blue-500')} style={{ width: del.status === 'Out for Delivery' ? '65%' : '20%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
