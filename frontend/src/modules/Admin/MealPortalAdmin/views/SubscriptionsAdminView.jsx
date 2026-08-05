import React from 'react';
import { useMealPortal } from '../context/MealPortalContext';
import { DataTable } from '../../components/DataTable';
import { PowerOff, UserSearch, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function SubscriptionsAdminView() {
  const { globalSubscriptions } = useMealPortal();

  const columns = [
    { key: 'id', label: 'Global SUB ID', sortable: true },
    { key: 'vendor', label: 'Assigned Vendor', sortable: true, render: (row) => (
      <span className="font-bold text-[#F87B68]">{row.vendor}</span>
    )},
    { key: 'user', label: 'User & Pet', sortable: true, render: (row) => (
      <div>
        <p className="font-bold text-gray-900">{row.user}</p>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{row.pet}</p>
      </div>
    )},
    { key: 'plan', label: 'Active Plan' },
    { key: 'endDate', label: 'Cycle End', sortable: true },
    { key: 'payment', label: 'Payment', render: (row) => (
      <span className={cn(
        "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border",
        row.payment === 'Paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.payment === 'Failed' ? "bg-red-50 text-red-700 border-red-100" :
        "bg-gray-100 text-gray-600 border-gray-200"
      )}>
        {row.payment}
      </span>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={cn(
        "flex items-center gap-1 w-max px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border",
        row.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.status === 'Cancelled' ? "bg-red-50 text-red-700 border-red-100" :
        "bg-amber-50 text-amber-700 border-amber-100"
      )}>
        {row.status === 'Cancelled' && <AlertCircle size={12} />}
        {row.status}
      </span>
    )},
    { key: 'actions', label: 'Super Actions', render: () => (
      <div className="flex items-center gap-1.5">
        <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer" title="Force Stop Delivery">
          <PowerOff size={14} />
        </button>
        <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer" title="Investigate User History">
          <UserSearch size={14} />
        </button>
        <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer" title="Process Refund">
          <RefreshCcw size={14} />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Global Subscriptions Matrix</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Master view of all active subscriptions across the platform.</p>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataTable
          columns={columns}
          data={globalSubscriptions}
          searchKey="user"
          searchPlaceholder="Search master records by user name..."
          filterKey="status"
          filterOptions={['Active', 'Paused', 'Cancelled']}
        />
      </div>
    </div>
  );
}
