import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../../services/api';

export function SavedItems() {
  const navigate = useNavigate();
  const [savedItems, setSavedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchSaved = async () => {
    try {
      const { data } = await api.get('/saved-items');
      setSavedItems(data);
    } catch {
      setSavedItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleUnsave = async (item) => {
    setBusyId(item._id);
    try {
      await api.delete('/saved-items', {
        data: { targetType: item.targetType, targetId: item.targetId },
      });
      setSavedItems((prev) => prev.filter((s) => s._id !== item._id));
    } catch {
      /* ignore */
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
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Saved Posts & Items</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : savedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart size={40} className="text-text-disabled mb-3" />
            <p className="font-bold text-text-primary">No saved items yet</p>
            <p className="text-sm text-text-secondary mt-1 max-w-[240px]">
              Explore the marketplace and tap heart to save your favorite products & services!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {savedItems.map((item) => {
              const product = item.product || {};
              const title = product.title || product.name || 'Saved Item';
              const price = product.pricePaise
                ? `₹${(product.pricePaise / 100).toFixed(2)}`
                : product.price
                ? `₹${product.price}`
                : null;
              const img = product.images?.[0] || product.img || product.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80';

              return (
                <div key={item._id} className="bg-white p-4 rounded-[24px] shadow-sm border border-border-light flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-[16px] bg-bg-secondary overflow-hidden shrink-0 border border-slate-100">
                    <img src={img} alt={title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary-main/10 text-primary-dark">
                      {item.targetType || 'Item'}
                    </span>
                    <h3 className="text-sm font-bold text-text-primary truncate mt-1">{title}</h3>
                    {price && <p className="text-xs font-black text-primary-dark mt-0.5">{price}</p>}
                  </div>
                  <button
                    onClick={() => handleUnsave(item)}
                    disabled={busyId === item._id}
                    className="p-2 text-text-disabled hover:text-error hover:bg-error/10 rounded-full transition-colors shrink-0"
                    title="Remove from saved"
                  >
                    {busyId === item._id ? <Loader2 size={18} className="animate-spin text-error" /> : <Trash2 size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
