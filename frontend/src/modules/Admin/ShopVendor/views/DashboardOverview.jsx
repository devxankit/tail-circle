import React, { useMemo } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Clock, AlertTriangle, RefreshCcw,
  Wallet, Star, ChevronRight, Package, ShoppingCart
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

const rupees = (paise) => Math.round((paise || 0) / 100);

/**
 * Real dashboard — every number here comes from `fetchVendorDashboard()` or
 * the vendor's own orders/products/returns/feedback arrays. There is no
 * date-range breakdown backend-side, so this shows today's true state rather
 * than fabricating a per-range multiplier.
 */
export function DashboardOverview() {
  const { profile, orders, products, returns, feedback, dashboard } = useShopVendor();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'New').length;
    const lowStock = products.filter(p => p.stock <= p.alertLimit).length;
    const pendingReturns = returns.filter(r => r.status === 'Requested').length;

    return [
      { label: 'Total Orders', value: dashboard?.totalOrders ?? orders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', path: '/vendor/shop-provider/orders' },
      { label: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', path: '/vendor/shop-provider/orders' },
      { label: 'Low Stock Alerts', value: lowStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', path: '/vendor/shop-provider/inventory' },
      { label: 'Return Requests', value: pendingReturns, icon: RefreshCcw, color: 'text-rose-600', bg: 'bg-rose-50', path: '/vendor/shop-provider/returns' },
      { label: 'Lifetime Earnings', value: `₹${rupees(dashboard?.lifetimeEarnings).toLocaleString('en-IN')}`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/vendor/shop-provider/finance' },
      { label: 'Customer Rating', value: profile?.rating ? `${profile.rating.toFixed(1)}/5` : 'No ratings yet', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', path: '/vendor/shop-provider/feedback' },
    ];
  }, [orders, products, returns, dashboard, profile]);

  const recentOrders = useMemo(() => [...orders].slice(0, 6), [orders]);

  const activityFeed = useMemo(() => {
    const feed = [
      ...orders.slice(0, 10).map(o => ({ type: 'order', label: `Order ${o.id}`, sub: `${o.customer} · ₹${o.total}`, status: o.status, time: o.date })),
      ...returns.slice(0, 10).map(r => ({ type: 'return', label: `Return ${r.id}`, sub: `${r.customer} · ₹${r.amount}`, status: r.status, time: r.date })),
      ...feedback.slice(0, 10).map(f => ({ type: 'feedback', label: `${f.rating}★ review`, sub: `${f.customer} · ${(f.message || '').slice(0, 40)}`, status: f.status, time: f.date })),
    ];
    return feed
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);
  }, [orders, returns, feedback]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shop Dashboard</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Here's what's happening at {profile?.businessName || 'your store'} today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.path)}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">{stat.value}</h3>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900">Recent Orders</h3>
              <button
                onClick={() => navigate('/vendor/shop-provider/orders')}
                className="text-xs font-bold text-[#F87B68] hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr>
                    <th className="py-3 px-5 text-[10px] font-black uppercase tracking-wider text-slate-500">Order ID & Date</th>
                    <th className="py-3 px-5 text-[10px] font-black uppercase tracking-wider text-slate-500">Customer</th>
                    <th className="py-3 px-5 text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="py-3 px-5 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order, idx) => (
                    <tr
                      key={idx}
                      onClick={() => navigate('/vendor/shop-provider/orders')}
                      className="hover:bg-slate-50/80 transition group cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <p className="text-sm font-bold text-slate-900">{order.id}</p>
                        <p className="text-[11px] font-medium text-slate-500">{new Date(order.date).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm font-semibold text-slate-800">{order.customer}</p>
                        <p className="text-[11px] text-slate-500">{order.products} items</p>
                      </td>
                      <td className="py-4 px-5 text-sm font-bold text-slate-900">₹{order.total.toLocaleString()}</td>
                      <td className="py-4 px-5">
                        <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold tracking-wide",
                          order.status === 'New' ? "bg-amber-100 text-amber-700" :
                          order.status === 'Delivered' ? "bg-emerald-100 text-emerald-700" :
                          order.status === 'Cancelled' ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentOrders.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-semibold">No orders yet</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900">Activity Feed</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    item.type === 'order' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    item.type === 'feedback' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                    'bg-rose-50 text-rose-600 border border-rose-100'
                  )}>
                    {item.type === 'order' ? <ShoppingCart size={14} /> : item.type === 'feedback' ? <Star size={14} /> : <RefreshCcw size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.label}</p>
                    <p className="text-[11px] font-semibold text-slate-500 truncate">{item.sub}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                      item.status === 'New' || item.status === 'Requested' ? 'bg-amber-100 text-amber-700' :
                      item.status === 'Delivered' || item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
              {activityFeed.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm font-semibold">No activity yet</div>
              )}
            </div>
          </div>

        </div>

        <div className="space-y-6">

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> Low Stock
              </h3>
              <button onClick={() => navigate('/vendor/shop-provider/inventory')} className="text-xs font-bold text-[#F87B68] hover:text-orange-600 flex items-center gap-1 cursor-pointer transition bg-orange-50 px-2 py-1 rounded-md">
                Manage <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-2">
              {products.filter(p => p.stock <= p.alertLimit).map((product, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/vendor/shop-provider/inventory')}
                  className="p-3 mb-2 rounded-xl border border-slate-100 flex items-center gap-3 hover:border-red-200 hover:bg-red-50/50 transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{product.sku}</p>
                  </div>
                  <div className="text-center shrink-0 bg-white shadow-sm border border-slate-100 rounded-lg p-1.5 min-w-[40px]">
                    <p className={cn("text-base font-black leading-none", product.stock === 0 ? 'text-red-600' : 'text-amber-600')}>{product.stock}</p>
                    <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Left</p>
                  </div>
                </div>
              ))}
              {products.filter(p => p.stock <= p.alertLimit).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                    <Package size={28} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Inventory is healthy!</p>
                  <p className="text-[11px] mt-1">No low stock alerts at the moment.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
