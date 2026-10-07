import React, { useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { DataTable } from '../../components/DataTable';
import { Play, Pause, XCircle, Activity } from 'lucide-react';
import { StatusBadge, InlineError, CardAction, useConfirm } from '../../vendor/mobile';

const SUB_TONE = { Active: 'success', Expired: 'error', Paused: 'warning' };

export function SubscriptionsView() {
  const { subscriptions, pauseSubscription, cancelSubscription } = useMealProvider();
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const handlePauseToggle = async (sub) => {
    try {
      await pauseSubscription(sub.id, sub.status === 'Paused');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not update subscription');
    }
  };

  const handleCancel = async (subId) => {
    if (!(await confirm({ title: 'Are you sure you want to completely cancel this subscription?', message: 'This cannot be undone.', confirmLabel: 'Cancel Subscription', cancelLabel: 'Keep', danger: true }))) return;
    try {
      await cancelSubscription(subId);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not cancel subscription');
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
        <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-primary font-bold shrink-0">
          {row.customer.charAt(0)}
        </div>
        <div className="font-bold text-text-primary">{row.customer}</div>
      </div>
    )},
    { key: 'pet', label: 'Pet Details' },
    { key: 'plan', label: 'Subscribed Plan' },
    { key: 'endDate', label: 'Renewal Date', sortable: true },
    { key: 'status', label: 'Status', render: (row) => (
      <StatusBadge label={row.status} tone={SUB_TONE[row.status] || 'neutral'} />
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-2 w-full">
        {(row.status === 'Active' || row.status === 'Paused') && (
          <CardAction className="flex-1" icon={row.status === 'Paused' ? Play : Pause} onClick={() => handlePauseToggle(row)}>
            {row.status === 'Paused' ? 'Resume' : 'Pause'}
          </CardAction>
        )}
        <CardAction className="flex-1" tone="danger" icon={XCircle} onClick={() => handleCancel(row.id)} disabled={row.status === 'Expired'}>
          Cancel
        </CardAction>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <InlineError>{error}</InlineError>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Active Subscriptions</h2>
          <p className="text-xs text-text-secondary mt-1">Manage recurring meal deliveries and customers.</p>
        </div>
        <button onClick={handleExportCSV} className="h-11 px-4 bg-white border border-border-light text-text-primary text-sm font-bold rounded-full transition cursor-pointer flex items-center gap-1.5 shrink-0">
          <Activity size={16} /> Export CSV
        </button>
      </div>

      <div>
        <DataTable
          forceMobile
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
