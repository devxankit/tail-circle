import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw, AlertTriangle, Check, X, RefreshCw, Search, IndianRupee, Link2Off,
} from 'lucide-react';
import {
  fetchAdminRefunds, fetchAdminRefundTotals, retryAdminRefund, reverseAdminRefundLedger,
} from '../../../../../services/admin';

/**
 * The refund register — every rupee that went back, why, and whether it landed.
 *
 * Refunds used to leave no trace beyond a counter on the payment, so
 * "how much did we refund last month and why?" was unanswerable. Two columns
 * here exist specifically to catch money problems that are otherwise silent:
 *
 *   Status  — a FAILED refund means the customer was told they would be repaid
 *             and never was. Nothing else in the system surfaces that.
 *   Ledger  — a processed refund whose vendor clawback failed means the platform
 *             paid out on a sale it handed back. Real money, lost quietly.
 */

const STATUS_STYLE = {
  processed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const INITIATOR_LABEL = {
  customer: 'Customer', vendor: 'Partner', admin: 'Admin', system: 'System',
};

export function Refunds() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 1 });
  const [totals, setTotals] = useState(null);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, t] = await Promise.all([
        fetchAdminRefunds({ status, page, limit: 50 }),
        fetchAdminRefundTotals(),
      ]);
      setData(rows);
      setTotals(t);
    } catch (err) {
      notify(err?.message || 'Failed to load refunds', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const onRetry = async (r) => {
    if (!window.confirm(`Retry refund ${r.id} of ₹${r.amount.toLocaleString('en-IN')} to ${r.customerName}?`)) return;
    setBusyId(r._id);
    try {
      await retryAdminRefund(r._id);
      notify(`Refund ${r.id} succeeded`);
      await load();
    } catch (err) {
      notify(err?.message || 'Retry failed again — check the gateway', 'error');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onReverseLedger = async (r) => {
    if (!window.confirm(
      `Claw back the partner's earning for ${r.id}?\n\nThe customer was refunded ₹${r.amount.toLocaleString('en-IN')} but the partner is still credited for this sale.`
    )) return;
    setBusyId(r._id);
    try {
      const res = await reverseAdminRefundLedger(r._id);
      notify(res.ledgerReversed ? 'Partner earning clawed back' : `Still failing: ${res.error}`, res.ledgerReversed ? 'success' : 'error');
      await load();
    } catch (err) {
      notify(err?.message || 'Reversal failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const rows = data.rows.filter(
    (r) => !search ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3 max-w-md">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {toast.type === 'error' ? <X size={14} /> : <Check size={14} />}
            </div>
            <p className="text-[13px] font-bold text-gray-800">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Refunds</h1>
          <p className="text-[13px] text-gray-500 mt-1">Every refund issued, why it was issued, and whether it actually landed</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Tile label="Refunded" value={`₹${totals.processedAmount.toLocaleString('en-IN')}`}
            sub={`${totals.processedCount} refund(s)`} tone="emerald" icon={IndianRupee} />
          <Tile label="Failed — customer still owed" value={`₹${totals.failedAmount.toLocaleString('en-IN')}`}
            sub={`${totals.failedCount} to retry`} tone={totals.failedCount ? 'red' : 'gray'} icon={AlertTriangle} />
          <Tile label="In flight" value={totals.pendingCount} sub="awaiting gateway" tone="blue" icon={RefreshCw} />
          <Tile label="Partner not clawed back" value={totals.unreversedCount}
            sub={totals.unreversedCount ? 'platform is out of pocket' : 'all reconciled'}
            tone={totals.unreversedCount ? 'red' : 'gray'} icon={Link2Off} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Refund no, customer, booking…"
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/30" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none">
            <option value="All">All statuses</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <p className="text-[12px] text-gray-500 ml-auto">{data.total} record(s)</p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-[13px] text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check size={20} />
            </div>
            <p className="text-[14px] font-bold text-gray-800">No refunds to show</p>
            <p className="text-[13px] text-gray-500 mt-1">Nothing matches this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <Th>Refund</Th><Th>Customer</Th><Th>Against</Th><Th>Amount</Th>
                  <Th>Reason</Th><Th>By</Th><Th>Status</Th><Th>Ledger</Th><Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50/60 align-top">
                    <Td>
                      <span className="font-bold text-gray-900">{r.id}</span>
                      <p className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleString('en-IN')}</p>
                    </Td>
                    <Td>
                      <span className="text-gray-800">{r.customerName}</span>
                      <p className="text-[11px] text-gray-400">{r.customerPhone}</p>
                    </Td>
                    <Td className="text-gray-600">{r.reference}</Td>
                    <Td>
                      <span className="font-bold text-gray-900">₹{r.amount.toLocaleString('en-IN')}</span>
                      {r.isPartial && (
                        <p className="text-[11px] text-amber-600 font-bold">
                          partial of ₹{r.paymentAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </Td>
                    <Td className="text-gray-600 max-w-[220px]">
                      {r.reason}
                      {r.failureReason && <p className="text-[11px] text-red-600 mt-0.5">{r.failureReason}</p>}
                    </Td>
                    <Td>
                      <span className="text-gray-600">{INITIATOR_LABEL[r.initiatedBy] || r.initiatedBy}</span>
                      {r.actorName !== '-' && <p className="text-[11px] text-gray-400">{r.actorName}</p>}
                    </Td>
                    <Td>
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize ${STATUS_STYLE[r.status]}`}>
                        {r.status}
                      </span>
                      {r.attempts > 1 && <p className="text-[11px] text-gray-400 mt-0.5">{r.attempts} attempts</p>}
                    </Td>
                    <Td>
                      {r.status !== 'processed' ? (
                        <span className="text-gray-400 text-[12px]">—</span>
                      ) : r.ledgerReversed ? (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">
                          Clawed back
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-red-100 text-red-700">
                          Not reversed
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1.5">
                        {r.status === 'failed' && (
                          <button onClick={() => onRetry(r)} disabled={busyId === r._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-md text-[12px] font-bold hover:bg-red-100 disabled:opacity-50 whitespace-nowrap">
                            <RotateCcw size={13} /> Retry refund
                          </button>
                        )}
                        {r.status === 'processed' && !r.ledgerReversed && (
                          <button onClick={() => onReverseLedger(r)} disabled={busyId === r._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-md text-[12px] font-bold hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap">
                            <Link2Off size={13} /> Claw back
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[12px] text-gray-500">Page {data.page} of {data.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}
                className="px-3 py-1.5 text-[12px] font-bold border border-gray-200 rounded-lg disabled:opacity-40">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data.page >= data.pages}
                className="px-3 py-1.5 text-[12px] font-bold border border-gray-200 rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TONE = {
  emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600', gray: 'bg-gray-100 text-gray-500',
};

function Tile({ label, value, sub, tone, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500 font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TONE[tone]}`}><Icon size={14} /></div>
      </div>
      <p className="text-[22px] font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const Th = ({ children }) => (
  <th className="text-left px-4 py-3 font-bold text-[12px] uppercase tracking-wide">{children}</th>
);
const Td = ({ children, className = '' }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;

export default Refunds;
