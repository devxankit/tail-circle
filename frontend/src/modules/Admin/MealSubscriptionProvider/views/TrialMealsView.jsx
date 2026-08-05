import React from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { DataTable } from '../../components/DataTable';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

/**
 * Trial meal requests. There is no vendor-approval step in the backend —
 * a trial order is created straight into the same Preparing → Out for
 * Delivery → Delivered pipeline as any other order (see meal.vendor.service.js
 * listTrials), so this screen shows that real lifecycle status instead of a
 * fake "Pending Approval / Approved / Rejected" gate that never matched what
 * the API actually returns.
 */
export function TrialMealsView() {
  const { trials } = useMealProvider();

  const columns = [
    { key: 'id', label: 'Req ID' },
    { key: 'customer', label: 'Customer', sortable: true, render: (row) => (
      <div>
        <p className="font-bold text-gray-900">{row.customer}</p>
        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{row.mobile}</p>
      </div>
    )},
    { key: 'pet', label: 'Pet Details' },
    { key: 'requestedDate', label: 'Requested', sortable: true, render: (row) => new Date(row.requestedDate).toLocaleDateString('en-IN') },
    { key: 'verification', label: 'Eligibility', render: () => (
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 w-max">
        <ShieldCheck size={12} /> Verified
      </span>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={cn(
        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border",
        row.status === 'Delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.status === 'Cancelled' ? "bg-red-50 text-red-700 border-red-100" :
        "bg-orange-50 text-orange-700 border-orange-100"
      )}>
        {row.status}
      </span>
    )},
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-4">
        <div className="shrink-0 text-orange-600"><AlertTriangle size={24} /></div>
        <div>
          <h3 className="text-sm font-bold text-orange-900">Trial Eligibility Rules</h3>
          <p className="text-xs text-orange-700 mt-1 font-medium leading-relaxed">
            One trial meal per registered mobile number and pet. Trials are auto-confirmed on request —
            there's no separate approval step; manage their kitchen/delivery status from the Kitchen Queue
            and Delivery Board like any other order.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataTable
          columns={columns}
          data={trials}
          searchKey="customer"
          searchPlaceholder="Search trial requests..."
          filterKey="status"
          filterOptions={['Preparing', 'Out for Delivery', 'Delivered', 'Cancelled']}
        />
      </div>
    </div>
  );
}
