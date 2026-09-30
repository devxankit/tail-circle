import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { resolveShopReturn } from '../../../../services/vendor';
import { RefreshCcw, CheckCircle, XCircle, CreditCard, AlertTriangle } from 'lucide-react';
import {
  SearchBar, ListCard, StatusBadge, EmptyState, StickyActionBar, PrimaryButton, SectionLabel, useSubScreen,
  FilterSheet, FilterOptions,
} from '../../vendor/mobile';

const RETURN_TONE = { Requested: 'warning', Approved: 'success', Refunded: 'info' };

export function ReturnsRefundsView() {
  const { returns, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);

  // The side panel becomes its own screen; Back returns to the list.
  useSubScreen(selectedRequest ? { title: selectedRequest.id, onBack: () => setSelectedRequest(null) } : null);

  const returnStatuses = [...new Set(returns.map((r) => r.status).filter(Boolean))];

  const filteredReturns = returns.filter(r =>
    (r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.orderId.toLowerCase().includes(search.toLowerCase()) ||
    r.customer.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'All' || r.status === statusFilter)
  );

  // Backend only supports approve/reject — approving marks the return resolved
  // (order status 'returned'); there is no separate refund-processing step yet
  // (that needs a real Razorpay refund call, which this flow doesn't make).
  const processAction = async (req, action) => {
    setProcessing(true);
    try {
      await resolveShopReturn(req._id || req.id, action);
      await refresh();
      addToast({
        message: action === 'approve' ? 'Return request approved.' : 'Return request rejected.',
        type: action === 'approve' ? 'success' : 'error',
      });
      setSelectedRequest(null);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update the return', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  /* ── Request detail ── */
  if (selectedRequest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-text-secondary">Order: <span className="font-bold text-text-primary">{selectedRequest.orderId}</span></p>
          <StatusBadge label={selectedRequest.status} tone={RETURN_TONE[selectedRequest.status] || 'neutral'} />
        </div>

        <div>
          <SectionLabel>Reason for Return</SectionLabel>
          <div className="bg-warning/10 border border-warning/25 rounded-[20px] p-4">
            <p className="text-sm font-bold text-text-primary">"{selectedRequest.reason}"</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 space-y-4">
          <div>
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Product to Return</h4>
            <p className="text-sm font-semibold text-text-primary">{selectedRequest.product}</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Customer Info</h4>
            <p className="text-sm font-semibold text-text-primary">{selectedRequest.customer}</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Refund Amount</h4>
            <div className="flex items-center gap-2">
              <p className="text-xl font-black text-text-primary">₹{selectedRequest.amount}</p>
              <StatusBadge label="Eligible" tone="success" />
            </div>
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">To Original Payment</span>
          </div>
        </div>

        {selectedRequest.status === 'Approved' && (
          <div className="flex items-start gap-2 text-[13px] font-semibold text-text-primary bg-success/10 border border-success/25 rounded-[20px] px-4 py-3">
            <CreditCard size={16} className="text-success shrink-0 mt-0.5" /> Return approved — refund settlement isn't automated yet, process ₹{selectedRequest.amount} manually via Razorpay.
          </div>
        )}

        {selectedRequest.status === 'Requested' && (
          <StickyActionBar>
            <PrimaryButton tone="outline" className="text-error" disabled={processing} icon={XCircle} onClick={() => processAction(selectedRequest, 'reject')}>
              Reject Request
            </PrimaryButton>
            <PrimaryButton tone="dark" disabled={processing} loading={processing} icon={CheckCircle} onClick={() => processAction(selectedRequest, 'approve')}>
              Approve Return
            </PrimaryButton>
          </StickyActionBar>
        )}
      </div>
    );
  }

  /* ── Request list ── */
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Returns & Refunds</h2>
        <p className="text-xs text-text-secondary mt-1">Manage product returns and process customer refunds.</p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by ID or Customer..."
        onFilter={() => setFiltersOpen(true)}
        filterCount={statusFilter !== 'All' ? 1 : 0}
      />

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} onReset={() => setStatusFilter('All')}>
        <FilterOptions label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', ...returnStatuses]} />
      </FilterSheet>

      {filteredReturns.length === 0 ? (
        <EmptyState icon={RefreshCcw} title="No return requests" text="You're all caught up!" />
      ) : (
        <div className="space-y-3">
          {filteredReturns.map((req) => (
            <ListCard
              key={req.id}
              title={req.id}
              subtitle={`Order: ${req.orderId} · ${req.date}`}
              badge={(
                <StatusBadge
                  tone={RETURN_TONE[req.status] || 'neutral'}
                  label={<span className="inline-flex items-center gap-1">{req.status === 'Requested' && <AlertTriangle size={10} />}{req.status}</span>}
                />
              )}
              amount={`₹${req.amount}`}
              amountHint="To Original Payment"
              meta={[
                { label: 'Product', value: req.product, full: true },
                { label: 'Customer', value: req.customer },
              ]}
              onClick={() => setSelectedRequest(req)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
