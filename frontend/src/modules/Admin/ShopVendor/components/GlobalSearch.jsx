import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, ShoppingCart, Truck } from 'lucide-react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../vendor/mobile/BottomSheet';

/**
 * Shop search — orders and products by id, name or SKU. In the partner app
 * it opens from the app bar as a full-screen sheet. (A "Bookings" group used
 * to link to /vendor/shop-provider/services, which never existed; shops have
 * no bookings, so it is gone.)
 */
export function GlobalSearch({ disabled, open, onClose }) {
  const { orders = [], products = [] } = useShopVendor();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const q = query.toLowerCase().trim();

  const matchedOrders = q.length > 0
    ? (orders || []).filter(o => (o.id || '').toLowerCase().includes(q) || (o.customer || '').toLowerCase().includes(q)).slice(0, 3)
    : [];

  const matchedProducts = q.length > 0
    ? (products || []).filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasResults = matchedOrders.length > 0 || matchedProducts.length > 0;

  const handleSelect = (path) => {
    setQuery('');
    setIsOpen(false);
    onClose?.();
    navigate(path);
  };

  return (
    <BottomSheet open={open} onClose={onClose} fullScreen title="Search">
      <div ref={containerRef} className="space-y-4 pb-6">
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-text-secondary pointer-events-none" />
          <input
            type="search"
            autoFocus
            placeholder="Search products, orders, customers..."
            value={query}
            disabled={disabled}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            className="w-full h-12 rounded-2xl border border-border-light bg-white pl-11 pr-12 text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setIsOpen(false); }}
              aria-label="Clear search"
              className="absolute right-1 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary cursor-pointer"
            >
              <span className="text-xl leading-none">&times;</span>
            </button>
          )}
        </div>

        {isOpen && q.length > 0 && (
          !hasResults ? (
            <div className="p-4 text-sm font-semibold text-text-secondary text-center py-10">
              No results found for "{query}"
            </div>
          ) : (
            <div className="bg-white rounded-[20px] border border-border-light overflow-hidden">
              {matchedOrders.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black text-text-secondary uppercase tracking-widest">Orders</p>
                  {matchedOrders.map(o => (
                    <button
                      key={o.id}
                      onClick={() => handleSelect('/vendor/shop-provider/orders')}
                      className="w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 active:bg-bg-primary transition cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-accent-teal/10 flex items-center justify-center text-[#4C8684] shrink-0">
                        <ShoppingCart size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary">{o.id}</p>
                        <p className="text-xs font-semibold text-text-secondary truncate">{o.customer} · ₹{o.total}</p>
                      </div>
                      <span className={`ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${o.status === 'New' ? 'bg-warning/10 text-warning' : o.status === 'Delivered' ? 'bg-success/10 text-success' : 'bg-accent-teal/10 text-[#4C8684]'}`}>
                        {o.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black text-text-secondary uppercase tracking-widest">Products</p>
                  {matchedProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect('/vendor/shop-provider/products')}
                      className="w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 active:bg-bg-primary transition cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center text-primary-main shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-text-primary truncate">{p.name}</p>
                        <p className="text-xs font-semibold text-text-secondary">{p.sku} · Stock: {p.stock}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-bg-secondary text-text-secondary shrink-0">
                        ₹{p.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </BottomSheet>
  );
}
