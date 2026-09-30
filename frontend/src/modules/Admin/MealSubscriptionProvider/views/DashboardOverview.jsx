import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useMealProvider } from '../context/MealProviderContext';
import { Package, Utensils, IndianRupee, Clock, ChefHat } from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StatGrid, SectionLabel, StatusBadge } from '../../vendor/mobile';

export function DashboardOverview() {
  const { finances, subscriptions, deliveries, kitchenQueue } = useMealProvider();
  const navigate = useNavigate();
  // The kitchen switch belongs to the layout (it used to sit in the sidebar).
  const { kitchenOpen, toggleKitchen } = useOutletContext() || {};

  const activeCount = subscriptions.filter(s => s.status === 'Active').length;
  const preparingCount = kitchenQueue.reduce((s, k) => s + (k.qty || 0), 0);
  const outForDelivery = deliveries.filter(d => d.status === 'Out for Delivery').length;
  const deliveredCount = deliveries.filter(d => d.status === 'Delivered').length;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Morning Shift Overview</h2>
        <p className="text-xs text-text-secondary mt-1">Here is what is happening in the kitchen today.</p>
      </div>

      {/* The kitchen's open/closed sign (the profile's own flag). The Online
          switch in the top bar is separate: it hides the whole business. */}
      {toggleKitchen && (
        <button
          type="button"
          onClick={toggleKitchen}
          aria-pressed={kitchenOpen}
          className="w-full bg-white rounded-[20px] border border-border-light shadow-sm p-4 flex items-center gap-3 text-left"
        >
          <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', kitchenOpen ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary')}>
            <ChefHat size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold text-text-primary">{kitchenOpen ? 'Kitchen is Open' : 'Kitchen Closed'}</span>
            <span className="block text-xs text-text-secondary mt-0.5">Your kitchen's open/closed sign</span>
          </span>
          <span className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0', kitchenOpen ? 'bg-success' : 'bg-text-disabled')}>
            <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all', kitchenOpen ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>
      )}

      <StatGrid
        tiles={[
          { label: 'Active Subscriptions', value: activeCount, icon: Package, tone: 'teal' },
          { label: 'Units Preparing', value: preparingCount, icon: Utensils, tone: 'primary' },
          { label: 'Out for Delivery', value: outForDelivery, icon: Clock, tone: 'warning' },
          { label: 'Lifetime Earnings', value: `₹${(finances.lifetimeEarnings || 0).toLocaleString('en-IN')}`, icon: IndianRupee, tone: 'success' },
        ]}
      />

      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] rounded-[28px] p-5 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-6 opacity-10"><Utensils size={100} /></div>
        <h3 className="text-sm font-bold mb-4">Delivery Snapshot</h3>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-85 mb-1">Delivered</p>
            <p className="text-3xl font-black leading-none">{deliveredCount} <span className="text-sm opacity-85 font-medium tracking-normal">/ {deliveries.length} loaded</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-85 mb-1">Out for Delivery</p>
            <p className="text-3xl font-black leading-none">{deliveries.filter(d => d.status === 'Out for Delivery').length}</p>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel action={<button onClick={() => navigate('/vendor/meal-provider/kitchen')} className="min-h-[36px] text-xs font-bold text-primary-main cursor-pointer">View Full Board</button>}>
          Live Kitchen Queue
        </SectionLabel>
        <div className="space-y-2">
          {kitchenQueue.map(kq => (
            <div key={kq.id} className="flex items-center justify-between p-4 bg-white rounded-[20px] border border-border-light shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-main bg-primary-light/30">
                  <Utensils size={18} />
                </div>
                <h4 className="text-sm font-bold text-text-primary">{kq.qty}x {kq.type}</h4>
              </div>
              <StatusBadge label="Preparing" tone="primary" />
            </div>
          ))}
          {!kitchenQueue.length && (
            <p className="bg-white rounded-[20px] border border-border-light text-sm text-text-secondary text-center py-6">Nothing in preparation right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
