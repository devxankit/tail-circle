import React, { useMemo } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag, Clock, AlertTriangle, RefreshCcw,
  Wallet, Star, ChevronRight, Package, ShoppingCart, Plus, Store, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StatGrid, StatusBadge, SectionLabel, ListCard } from '../../vendor/mobile';

const ORDER_TONE = { New: 'warning', Delivered: 'success', Cancelled: 'error' };
const FEED_TONE = { New: 'warning', Requested: 'warning', Delivered: 'success', Approved: 'success' };

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
  // The store switch and the verified gate belong to the layout.
  const { storeOpen, toggleStoreOpen, togglingStore, isVerified } = useOutletContext() || {};

  const stats = useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'New').length;
    const lowStock = products.filter(p => p.stock <= p.alertLimit).length;
    const pendingReturns = returns.filter(r => r.status === 'Requested').length;

    return [
      { label: 'Total Orders', value: dashboard?.totalOrders ?? orders.length, icon: ShoppingBag, tone: 'teal', path: '/vendor/shop-provider/orders' },
      { label: 'Pending Orders', value: pendingOrders, icon: Clock, tone: 'warning', path: '/vendor/shop-provider/orders' },
      { label: 'Low Stock Alerts', value: lowStock, icon: AlertTriangle, tone: 'error', path: '/vendor/shop-provider/inventory' },
      { label: 'Return Requests', value: pendingReturns, icon: RefreshCcw, tone: 'primary', path: '/vendor/shop-provider/returns' },
      { label: 'Lifetime Earnings', value: `₹${rupees(dashboard?.lifetimeEarnings).toLocaleString('en-IN')}`, icon: Wallet, tone: 'teal', path: '/vendor/shop-provider/finance' },
      { label: 'Customer Rating', value: (dashboard?.avgRating || profile?.rating) ? `${(dashboard?.avgRating || profile?.rating).toFixed(1)}/5` : (feedback.length > 0 ? `${(feedback.reduce((a, f) => a + (f.rating || 0), 0) / feedback.length).toFixed(1)}/5` : 'No ratings yet'), icon: Star, tone: 'warning', path: '/vendor/shop-provider/feedback' },
    ];
  }, [orders, products, returns, feedback, dashboard, profile]);

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

  const lowStockProducts = products.filter(p => p.stock <= p.alertLimit);

  return (
    <div className="space-y-5">

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Shop Dashboard</h2>
        <p className="text-xs text-text-secondary mt-1">Here's what's happening at {profile?.businessName || 'your store'} today.</p>
      </div>

      {/* The storefront's open/closed sign (the profile's own flag). The
          Online switch in the top bar is separate: it hides the whole
          business from customers. */}
      {toggleStoreOpen && (
        <button
          type="button"
          onClick={toggleStoreOpen}
          disabled={togglingStore}
          aria-pressed={storeOpen}
          className="w-full bg-white rounded-[20px] border border-border-light shadow-sm p-4 flex items-center gap-3 text-left"
        >
          <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', storeOpen ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary')}>
            {togglingStore ? <Loader2 size={20} className="animate-spin" /> : <Store size={20} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold text-text-primary">{storeOpen ? 'Store is Open' : 'Store is Closed'}</span>
            <span className="block text-xs text-text-secondary mt-0.5">Your storefront's open/closed sign</span>
          </span>
          <span className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0', storeOpen ? 'bg-success' : 'bg-text-disabled')}>
            <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all', storeOpen ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>
      )}

      {/* The header's "+ Quick Action" menu, as a row. */}
      {isVerified && (
        <div>
          <SectionLabel>Quick Actions</SectionLabel>
          <div className="flex justify-around bg-white p-4 rounded-[24px] shadow-sm border border-border-light">
            <button onClick={() => navigate('/vendor/shop-provider/products', { state: { openAdd: true } })} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer">
              <span className="w-12 h-12 rounded-full bg-primary-light/30 text-primary-main flex items-center justify-center"><Plus size={22} /></span>
              <span className="text-xs font-semibold text-text-primary">Add Product</span>
            </button>
            <button onClick={() => navigate('/vendor/shop-provider/inventory')} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer">
              <span className="w-12 h-12 rounded-full bg-accent-teal/15 text-[#4C8684] flex items-center justify-center"><Package size={20} /></span>
              <span className="text-xs font-semibold text-text-primary">Update Stock</span>
            </button>
            <button onClick={() => navigate('/vendor/shop-provider/orders')} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer">
              <span className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center"><ShoppingCart size={20} /></span>
              <span className="text-xs font-semibold text-text-primary">View New Orders</span>
            </button>
          </div>
        </div>
      )}

      <StatGrid tiles={stats.map((stat) => ({ ...stat, onClick: () => navigate(stat.path) }))} />

      <div>
        <SectionLabel
          action={(
            <button
              onClick={() => navigate('/vendor/shop-provider/orders')}
              className="min-h-[36px] text-xs font-bold text-primary-main flex items-center gap-0.5 cursor-pointer"
            >
              View All <ChevronRight size={14} />
            </button>
          )}
        >
          Recent Orders
        </SectionLabel>
        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-border-light p-8 text-center text-text-secondary text-sm font-semibold">No orders yet</div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order, idx) => (
              <ListCard
                key={idx}
                title={order.id}
                subtitle={`${new Date(order.date).toLocaleDateString('en-IN')} · ${order.customer} · ${order.products} items`}
                badge={<StatusBadge label={order.status} tone={ORDER_TONE[order.status] || 'info'} />}
                amount={`₹${order.total.toLocaleString()}`}
                onClick={() => navigate('/vendor/shop-provider/orders')}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel
          action={(
            <button onClick={() => navigate('/vendor/shop-provider/inventory')} className="min-h-[36px] text-xs font-bold text-primary-main flex items-center gap-0.5 cursor-pointer">
              Manage <ChevronRight size={14} />
            </button>
          )}
        >
          <span className="inline-flex items-center gap-1.5"><AlertTriangle size={14} className="text-error" /> Low Stock</span>
        </SectionLabel>
        {lowStockProducts.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-border-light flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <Package size={26} className="text-success" />
            </div>
            <p className="text-sm font-bold text-text-primary">Inventory is healthy!</p>
            <p className="text-[11px] text-text-secondary mt-1">No low stock alerts at the moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
            {lowStockProducts.map((product, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => navigate('/vendor/shop-provider/inventory')}
                className={cn('w-full p-3 flex items-center gap-3 text-left active:bg-bg-primary', idx > 0 && 'border-t border-border-light')}
              >
                <div className="w-12 h-12 rounded-xl bg-bg-primary overflow-hidden shrink-0 border border-border-light">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-text-primary truncate">{product.name}</p>
                  <p className="text-[10px] font-semibold text-text-secondary">{product.sku}</p>
                </div>
                <div className="text-center shrink-0 bg-bg-primary border border-border-light rounded-xl p-1.5 min-w-[44px]">
                  <p className={cn("text-base font-black leading-none", product.stock === 0 ? 'text-error' : 'text-warning')}>{product.stock}</p>
                  <p className="text-[8px] font-bold uppercase text-text-secondary mt-1">Left</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Activity Feed</SectionLabel>
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
          {activityFeed.map((item, i) => (
            <div key={i} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border-light')}>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                item.type === 'order' ? 'bg-accent-teal/10 text-[#4C8684]' :
                item.type === 'feedback' ? 'bg-warning/10 text-warning' :
                'bg-primary-light/30 text-primary-main'
              )}>
                {item.type === 'order' ? <ShoppingCart size={15} /> : item.type === 'feedback' ? <Star size={15} /> : <RefreshCcw size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{item.label}</p>
                <p className="text-[11px] font-semibold text-text-secondary truncate">{item.sub}</p>
              </div>
              <StatusBadge size="xs" label={item.status} tone={FEED_TONE[item.status] || 'info'} />
            </div>
          ))}
          {activityFeed.length === 0 && (
            <div className="p-8 text-center text-text-secondary text-sm font-semibold">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
