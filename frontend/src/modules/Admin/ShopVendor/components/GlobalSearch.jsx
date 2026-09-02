import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, ShoppingCart, Package, Truck } from 'lucide-react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useNavigate } from 'react-router-dom';

export function GlobalSearch({ disabled }) {
  const { orders = [], products = [], services = [] } = useShopVendor();
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

  const matchedServices = q.length > 0
    ? (services || []).filter(s => (s.customer || '').toLowerCase().includes(q) || (s.petName || '').toLowerCase().includes(q)).slice(0, 2)
    : [];

  const hasResults = matchedOrders.length > 0 || matchedProducts.length > 0 || matchedServices.length > 0;

  const handleSelect = (path) => {
    setQuery('');
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="hidden md:flex relative w-72">
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search products, orders, customers..."
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent border-none outline-none ml-2 text-sm font-semibold w-full text-slate-700 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="text-slate-400 hover:text-slate-700 transition cursor-pointer ml-1 shrink-0"
          >
            <span className="text-base leading-none">&times;</span>
          </button>
        )}
      </div>

      {isOpen && q.length > 0 && (
        <div className="absolute top-12 left-0 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {!hasResults ? (
            <div className="p-4 text-sm font-semibold text-slate-500 text-center py-6">
              No results found for "{query}"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {matchedOrders.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Orders</p>
                  {matchedOrders.map(o => (
                    <button
                      key={o.id}
                      onClick={() => handleSelect('/vendor/shop-provider/orders')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <ShoppingCart size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{o.id}</p>
                        <p className="text-xs font-semibold text-slate-500">{o.customer} · ₹{o.total}</p>
                      </div>
                      <span className={`ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${o.status === 'New' ? 'bg-amber-100 text-amber-700' : o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {o.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Products</p>
                  {matchedProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect('/vendor/shop-provider/products')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <ShoppingBag size={13} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{p.sku} · Stock: {p.stock}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        ₹{p.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {matchedServices.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bookings</p>
                  {matchedServices.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect('/vendor/shop-provider/services')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Package size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.petName}</p>
                        <p className="text-xs font-semibold text-slate-500">{s.customer} · {s.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
