import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { DataTable } from '../../components/DataTable';
import { Play, Pause, XCircle, Activity } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function SubscriptionsView() {
  const { subscriptions, pauseSubscription, cancelSubscription } = useMealProvider();
  const [error, setError] = useState('');

  const handlePauseToggle = async (sub) => {
    try {
      await pauseSubscription(sub.id, sub.status === 'Paused');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update subscription');
    }
  };

  const handleCancel = async (subId) => {
    if (!window.confirm('Are you sure you want to completely cancel this subscription? This cannot be undone.')) return;
    try {
      await cancelSubscription(subId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not cancel subscription');
    }
  };

  const handleExportCSV = () => {
    if (!subscriptions.length) return;
    const headers = ['SUB ID', 'Customer', 'Plan', 'Status', 'Payment'];
    const rows = [headers.join(','), ...subscriptions.map((s) => [s.id, s.customer, s.plan, s.status, s.payment].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: 'id', label: 'SUB ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true, render: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
          {row.customer.charAt(0)}
        </div>
        <div className="font-bold text-gray-900">{row.customer}</div>
      </div>
    )},
    { key: 'pet', label: 'Pet Details' },
    { key: 'plan', label: 'Subscribed Plan' },
    { key: 'endDate', label: 'Renewal Date', sortable: true },
    { key: 'status', label: 'Status', render: (row) => (
      <span className={cn(
        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border",
        row.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        row.status === 'Expired' ? "bg-red-50 text-red-700 border-red-100" :
        row.status === 'Paused' ? "bg-amber-50 text-amber-700 border-amber-100" :
        "bg-gray-100 text-gray-600 border-gray-200"
      )}>
        {row.status}
      </span>
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-1.5">
        {(row.status === 'Active' || row.status === 'Paused') && (
          <button onClick={() => handlePauseToggle(row)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer" title={row.status === 'Paused' ? 'Resume' : 'Pause'}>
            {row.status === 'Paused' ? <Play size={14} /> : <Pause size={14} />}
          </button>
        )}
        <button onClick={() => handleCancel(row.id)} disabled={row.status === 'Expired'} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-40" title="Cancel Subscription">
          <XCircle size={14} />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Subscriptions</h2>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Manage recurring meal deliveries and customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2">
            <Activity size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataTable
          columns={columns}
          data={subscriptions}
          searchKey="customer"
          searchPlaceholder="Search by customer name..."
          filterKey="status"
          filterOptions={['Active', 'Expired', 'Paused']}
        />
      </div>
    </div>
  );
}
