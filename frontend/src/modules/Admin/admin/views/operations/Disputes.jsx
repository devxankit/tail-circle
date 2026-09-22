import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale, AlertTriangle, Clock, IndianRupee, RefreshCw, Check, X, Gavel,
} from 'lucide-react';
import {
  fetchDisputeSummary, fetchDisputes, fetchDisputeOutcomes, resolveDisputeApi,
} from '../../../../../services/admin';

/**
 * Dispute resolution queue.
 *
 * A disputed booking holds the partner's earning back from payout, so every
 * unresolved row is costing a partner money as well as leaving a customer
 * waiting. That is why the queue is sorted oldest-first and `daysOpen` is the
 * most prominent column — this screen is meant to be emptied, not browsed.
 *
 * Resolving forces a choice about the money. There is no "close" that leaves
 * the payment ambiguous, because "resolved" on its own tells the customer
 * nothing and tells finance less.
 */

const OUTCOME_STYLE = {
  refund_full: 'bg-red-50 text-red-700 border-red-200',
  refund_partial: 'bg-amber-50 text-amber-700 border-amber-200',
  reject: 'bg-gray-50 text-gray-700 border-gray-200',
  goodwill: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function Disputes() {
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [outcomes, setOutcomes] = useState([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [active, setActive] = useState(null);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list, o] = await Promise.all([
        fetchDisputeSummary(),
        fetchDisputes({ status, limit: 100 }),
        fetchDisputeOutcomes(),
      ]);
      setSummary(s);
      setData(list);
      setOutcomes(o);
    } catch (err) {
      notify(err?.message || 'Could not load disputes', 'error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (row, outcome, note, amount) => {
    setBusyId(row._id);
    try {
      const res = await resolveDisputeApi(row._id, {
        outcome,
        note,
        ...(outcome === 'refund_partial' ? { amount } : {}),
      });
      notify(
        res.refund
          ? `${row.bookingNo} resolved · ₹${res.refund.amount.toLocaleString('en-IN')} refunded`
          : `${row.bookingNo} resolved`
      );
      setActive(null);
      await load();
    } catch (err) {
      notify(err?.message || 'Could not resolve this dispute', 'error');
    } finally {
      setBusyId(null);
    }
  };

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
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Disputes</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Customer disputes awaiting a decision. The partner's earning is held until each is resolved.
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Tile label="Open" value={summary.open} tone={summary.open ? 'red' : 'gray'} icon={Scale} />
          <Tile label="Value at risk" value={`₹${summary.valueAtRisk.toLocaleString('en-IN')}`}
            sub="held from payout" tone="amber" icon={IndianRupee} />
          <Tile label="Oldest" value={`${summary.oldestDays}d`}
            sub={summary.overSevenDays ? `${summary.overSevenDays} over a week` : 'all recent'}
            tone={summary.oldestDays > 7 ? 'red' : 'gray'} icon={Clock} />
          <Tile label="Resolved" value={summary.resolved} tone="emerald" icon={Check} />
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-white p-1 rounded-xl border border-gray-200 w-fit">
        {[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)}
            className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition ${
              status === k ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-gray-500">Loading…</p>
      ) : data.rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Check size={20} />
          </div>
          <p className="text-[14px] font-bold text-gray-800">
            {status === 'open' ? 'No open disputes' : 'Nothing to show'}
          </p>
          <p className="text-[13px] text-gray-500 mt-1">
            {status === 'open' ? 'Every dispute has been ruled on.' : 'Nothing matches this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.rows.map((r) => (
            <div key={r._id} className={`bg-white rounded-xl border p-4 ${
              r.daysOpen > 7 && !r.resolvedAt ? 'border-red-300' : 'border-gray-200'}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-[14px]">{r.bookingNo}</span>
                    <span className="capitalize text-[12px] text-gray-500">{r.type}</span>
                    {!r.resolvedAt && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        r.daysOpen > 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        open {r.daysOpen}d
                      </span>
                    )}
                    <span className="text-[12px] text-gray-500">
                      raised by {r.raisedBy || 'customer'}
                    </span>
                  </div>

                  <p className="text-[13px] text-gray-700 mt-1.5">
                    <b>{r.customerName}</b> · {r.customerPhone} · partner <b>{r.vendorName}</b>
                    {r.scheduledFor && <span className="text-gray-500"> · service {r.scheduledFor}</span>}
                  </p>
                  <p className="text-[13px] text-gray-600 mt-1">"{r.reason}"</p>

                  <p className="text-[12px] text-gray-500 mt-1.5">
                    Paid ₹{r.amount.toLocaleString('en-IN')}
                    {r.refundedAmount > 0 && ` · refunded ₹${r.refundedAmount.toLocaleString('en-IN')}`}
                    {r.raisedAt && ` · raised ${new Date(r.raisedAt).toLocaleDateString('en-IN')}`}
                  </p>

                  {r.resolution && (
                    <p className="text-[12px] text-gray-600 mt-2 italic border-l-2 border-gray-200 pl-2">
                      {r.resolution}
                    </p>
                  )}
                </div>

                {!r.resolvedAt && (
                  <button onClick={() => setActive(r)} disabled={busyId === r._id}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-[13px] font-bold shrink-0">
                    <Gavel size={15} /> Rule on this
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <ResolveModal
          dispute={active}
          outcomes={outcomes}
          busy={busyId === active._id}
          onClose={() => setActive(null)}
          onResolve={resolve}
        />
      )}
    </div>
  );
}

/**
 * The decision itself.
 *
 * Every outcome states what happens to the money in plain words, and a note is
 * mandatory — a dispute closed with no explanation is unreviewable later, and
 * the customer is told what was decided.
 */
function ResolveModal({ dispute, outcomes, busy, onClose, onResolve }) {
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const maxRefund = dispute.amount - dispute.refundedAmount;
  const valid =
    outcome &&
    note.trim().length >= 3 &&
    (outcome !== 'refund_partial' || (Number(amount) > 0 && Number(amount) <= maxRefund));

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">Rule on {dispute.bookingNo}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {dispute.customerName} · ₹{dispute.amount.toLocaleString('en-IN')} paid
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">The dispute</p>
            <p className="text-[13px] text-gray-700 mt-1">"{dispute.reason}"</p>
          </div>

          <div>
            <p className="text-[12px] font-bold text-gray-700 mb-2">What is the outcome?</p>
            <div className="space-y-2">
              {outcomes.map((o) => (
                <button key={o.key} onClick={() => setOutcome(o.key)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${
                    outcome === o.key
                      ? OUTCOME_STYLE[o.key] || 'bg-gray-50 border-gray-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <p className="text-[13px] font-bold text-gray-900">{o.label}</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">{o.describe}</p>
                </button>
              ))}
            </div>
          </div>

          {outcome === 'refund_partial' && (
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">
                Refund amount (₹) — up to {maxRefund.toLocaleString('en-IN')}
              </label>
              <input type="number" min={1} max={maxRefund} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/30" />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-gray-700 mb-1">
              Reason for the decision <span className="font-normal text-gray-400">· the customer is told this</span>
            </label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="What did you find, and why did you decide this way?"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/30" />
          </div>

          {(outcome === 'refund_full' || outcome === 'refund_partial') && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800">
                This refunds the customer, reverses the partner's earning, and records a service
                failure against the partner. Choose "Refund without fault" if the partner is not to blame.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-[13px] font-bold hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => onResolve(dispute, outcome, note.trim(), Number(amount))}
            disabled={!valid || busy}
            className="px-4 py-2.5 rounded-lg bg-[#66B4B1] hover:opacity-90 disabled:opacity-40 text-white text-[13px] font-bold">
            {busy ? 'Working…' : 'Confirm decision'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TONE = {
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600', gray: 'bg-gray-100 text-gray-500',
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

export default Disputes;
