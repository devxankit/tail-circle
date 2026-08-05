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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Kitchen Prep List</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Meal quantities currently in "Preparing" status, grouped by item.</p>
        </div>
        <span className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl text-xs font-bold">{totalQty} units</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[13px] text-amber-800">
          Staff assignment and prep timers aren't tracked yet — this is a real quantity summary, not a per-task board.
          Move an order out of "Preparing" from the Delivery Board once it's ready.
        </p>
      </div>

      {kitchenQueue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center text-gray-400">
          <Utensils size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">Nothing in preparation right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchenQueue.map((task) => (
            <div key={task.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-400 font-mono">{task.id}</span>
                <span className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded">{task.qty} units</span>
              </div>
              <h4 className="text-base font-bold text-gray-900 leading-tight">{task.type}</h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
