import React from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { DataTable } from '../../components/DataTable';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../../vendor/mobile';

const TRIAL_TONE = { Delivered: 'success', Cancelled: 'error' };

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
        <p className="font-bold text-text-primary">{row.customer}</p>
        <p className="text-[10px] text-text-secondary font-mono mt-0.5">{row.mobile}</p>
      </div>
    )},
    { key: 'pet', label: 'Pet Details' },
    { key: 'requestedDate', label: 'Requested', sortable: true, render: (row) => new Date(row.requestedDate).toLocaleDateString('en-IN') },
    { key: 'verification', label: 'Eligibility', render: () => (
      <StatusBadge tone="success" label={<span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> Verified</span>} />
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <StatusBadge label={row.status} tone={TRIAL_TONE[row.status] || 'primary'} />
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-warning/30 rounded-[20px] p-4 flex gap-3 shadow-sm">
        <div className="shrink-0 text-warning"><AlertTriangle size={22} /></div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">Trial Eligibility Rules</h3>
          <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">
            One trial meal per registered mobile number and pet. Trials are auto-confirmed on request —
            there's no separate approval step; manage their kitchen/delivery status from the Kitchen Queue
            and Delivery Board like any other order.
          </p>
        </div>
      </div>

      <div>
        <DataTable
          forceMobile
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
