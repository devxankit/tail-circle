import React from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { Utensils, Info } from 'lucide-react';

/**
 * Real prep list — grouped totals of every order currently in "Preparing"
 * status (GET /vendor/kitchen-queue). There is no per-task Pending/Preparing/
 * Completed workflow on the backend (it's an aggregate by meal type, not
 * individual tracked tasks), so this reads as a prep sheet rather than a fake
 * drag-style board with no real state behind it. Advance an order's real
 * status from the Delivery Board once it's ready to go out.
 */
export function KitchenQueueView() {
  const { kitchenQueue } = useMealProvider();
  const totalQty = kitchenQueue.reduce((s, k) => s + (k.qty || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Kitchen Prep List</h2>
          <p className="text-xs text-text-secondary mt-1">Meal quantities currently in "Preparing" status, grouped by item.</p>
        </div>
        <span className="px-3 py-1.5 bg-primary-light/30 text-primary-dark rounded-full text-xs font-black shrink-0">{totalQty} units</span>
      </div>

      <div className="bg-white border border-warning/30 rounded-[20px] p-4 flex gap-3 shadow-sm">
        <Info size={18} className="text-warning shrink-0 mt-0.5" />
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Staff assignment and prep timers aren't tracked yet — this is a real quantity summary, not a per-task board.
          Move an order out of "Preparing" from the Delivery Board once it's ready.
        </p>
      </div>

      {kitchenQueue.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border-light p-12 text-center text-text-secondary">
          <Utensils size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">Nothing in preparation right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {kitchenQueue.map((task) => (
            <div key={task.id} className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] font-bold text-text-secondary font-mono truncate">{task.id}</span>
                <span className="text-[10px] font-bold text-white bg-primary-main px-2 py-0.5 rounded-full shrink-0">{task.qty} units</span>
              </div>
              <h4 className="text-[15px] font-bold text-text-primary leading-tight">{task.type}</h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
