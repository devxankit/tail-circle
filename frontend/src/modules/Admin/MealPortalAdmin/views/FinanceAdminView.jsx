import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { Wallet, IndianRupee, PieChart, TrendingUp, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function FinanceAdminView() {
  const { platformMetrics, vendors } = useMealPortal();

  const platformRevenue = platformMetrics.totalRevenue;
  const platformCommission = platformRevenue * 0.15; // Simulated 15% commission
  const vendorPayouts = platformRevenue - platformCommission;

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trendUp }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", color)}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{(value/100000).toFixed(2)}L</h3>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{title}</p>
        {subtitle && (
          <p className={cn("text-xs font-bold mt-2 flex items-center gap-1", trendUp ? "text-emerald-600" : "text-red-600")}>
            <TrendingUp size={12}/> {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Global Finance & Settlements</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Manage platform revenue, commissions, and vendor payouts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2">
            <Download size={16} /> Export GST Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Platform Volume" value={platformRevenue} subtitle="+12.5% MTD" icon={IndianRupee} color="bg-blue-600" trendUp={true} />
        <StatCard title="Platform Commission (15%)" value={platformCommission} subtitle="+12.5% MTD" icon={PieChart} color="bg-emerald-600" trendUp={true} />
        <StatCard title="Vendor Payouts Pending" value={vendorPayouts} subtitle="Settlements due Friday" icon={Wallet} color="bg-orange-600" trendUp={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
          <h3 className="text-base font-bold text-gray-900 mb-6">Top Grossing Vendors</h3>
          <div className="space-y-4">
            {vendors.sort((a,b) => b.revenue - a.revenue).slice(0,4).map((v, i) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    #{i+1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{v.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{v.activeSubs} Active Subs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">₹{(v.revenue/1000).toFixed(1)}k</p>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Revenue</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
          <h3 className="text-base font-bold text-gray-900 mb-6">Recent Settlement Ledger</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <ArrowDownRight size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Payout to {vendors[i%vendors.length].name}</h4>
                    <p className="text-xs text-gray-500 font-medium">Auto-settlement • NEFT</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">-₹{((vendors[i%vendors.length].revenue * 0.85)/1000).toFixed(1)}k</p>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold uppercase tracking-wider mt-1 inline-block">Cleared</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
