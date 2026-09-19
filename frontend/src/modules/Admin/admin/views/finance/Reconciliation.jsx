import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, AlertOctagon, AlertTriangle, Info, RefreshCw, IndianRupee, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fetchReconciliation } from '../../../../../services/admin';

/**
 * Daily reconciliation.
 *
 * Every other screen in the admin panel reads the same database, so if a
 * payment succeeded at the gateway and fulfilment never ran, every screen
 * agrees — and every screen is wrong. This is the only place that checks the
 * platform's records against themselves and names what does not add up.
 *
 * Read-only on purpose. It surfaces discrepancies; a human decides. Automatic
 * "fixes" on money are how small problems become big ones.
 */

const SEVERITY = {
  critical: { icon: AlertOctagon, tone: 'bg-red-50 border-red-200', text: 'text-red-800', pill: 'bg-red-100 text-red-700' },
  high: { icon: AlertTriangle, tone: 'bg-orange-50 border-orange-200', text: 'text-orange-800', pill: 'bg-orange-100 text-orange-700' },
  medium: { icon: Info, tone: 'bg-amber-50 border-amber-200', text: 'text-amber-800', pill: 'bg-amber-100 text-amber-700' },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function Reconciliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const [range, setRange] = useState({ from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchReconciliation(range));
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not run the reconciliation');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const issues = data ? Object.entries(data.issues) : [];
  const problems = issues.filter(([, v]) => v.count > 0);

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Reconciliation</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Does the platform's record of money agree with itself? Anything that does not is listed below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none" />
          <span className="text-gray-400 text-[13px]">to</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none" />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Run
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-800">{error}</p>
        </div>
      )}

      {loading && <p className="text-[13px] text-gray-500">Running…</p>}

      {!loading && data && (
        <>
          {/* The headline: is anything unexplained? */}
          <div className={`mb-6 rounded-xl border-2 p-4 ${
            data.clean ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                data.clean ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {data.clean ? <ShieldCheck size={20} /> : <AlertOctagon size={20} />}
              </div>
              <div>
                <h2 className={`text-[16px] font-bold ${data.clean ? 'text-emerald-900' : 'text-red-900'}`}>
                  {data.clean
                    ? 'Everything reconciles'
                    : `${problems.reduce((s, [, v]) => s + v.count, 0)} discrepancies need attention`}
                </h2>
                <p className={`text-[13px] mt-0.5 ${data.clean ? 'text-emerald-800' : 'text-red-800'}`}>
                  {data.clean
                    ? `No unexplained money movements between ${data.range.from} and ${data.range.to}.`
                    : 'Each one below names the money involved and enough detail to chase it.'}
                </p>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Tile label="Captured" value={inr(data.totals.captured)} sub={`${data.totals.transactions} payments`} />
            <Tile label="Refunded" value={inr(data.totals.refundedPerPayments)}
              sub={data.totals.refundVariance !== 0
                ? `⚠ ${inr(Math.abs(data.totals.refundVariance))} unexplained`
                : 'register agrees'}
              tone={data.totals.refundVariance !== 0 ? 'red' : 'gray'} />
            <Tile label="Platform commission" value={inr(data.totals.platformCommission)} />
            <Tile label="Payable to partners" value={inr(data.totals.payableToPartners)} />
          </div>

          {/* Issues */}
          <div className="space-y-3">
            {problems.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <ShieldCheck size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-[14px] font-bold text-gray-800">Nothing to chase</p>
                <p className="text-[13px] text-gray-500 mt-1">
                  Payments, refunds and the partner ledger all agree for this period.
                </p>
              </div>
            )}

            {problems.map(([key, issue]) => {
              const sev = SEVERITY[issue.severity] || SEVERITY.medium;
              const Icon = sev.icon;
              const expanded = open[key];
              return (
                <div key={key} className={`rounded-xl border-2 overflow-hidden ${sev.tone}`}>
                  <button onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    className="w-full p-4 text-left flex items-start gap-3">
                    <Icon size={18} className={`${sev.text} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[14px] font-bold ${sev.text}`}>{issue.title}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${sev.pill}`}>
                          {issue.count}
                        </span>
                        {issue.amount > 0 && (
                          <span className={`text-[12px] font-bold ${sev.text}`}>{inr(issue.amount)}</span>
                        )}
                      </div>
                      <p className={`text-[12px] mt-1 ${sev.text} opacity-90`}>{issue.why}</p>
                    </div>
                    {expanded ? <ChevronUp size={16} className={sev.text} /> : <ChevronDown size={16} className={sev.text} />}
                  </button>

                  {expanded && (
                    <div className="bg-white border-t border-gray-200 overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            {Object.keys(issue.rows[0] || {}).map((h) => (
                              <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wide whitespace-nowrap">
                                {h.replace(/([A-Z])/g, ' $1').trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {issue.rows.map((r, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              {Object.entries(r).map(([k, v]) => (
                                <td key={k} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                  {k.toLowerCase().includes('amount') || k === 'variance' || k === 'onPayment' || k === 'inRegister'
                                    ? inr(v)
                                    : k === 'at' || k.endsWith('At')
                                      ? new Date(v).toLocaleString('en-IN')
                                      : String(v ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {issue.count > issue.rows.length && (
                        <p className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
                          Showing {issue.rows.length} of {issue.count}. Narrow the date range to see the rest.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 mt-4">
            Period {data.range.from} to {data.range.to}. This report reads only — nothing here changes any record.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500 font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
          <IndianRupee size={14} />
        </div>
      </div>
      <p className="text-[20px] font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && (
        <p className={`text-[11px] mt-0.5 ${tone === 'red' ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{sub}</p>
      )}
    </div>
  );
}

export default Reconciliation;
