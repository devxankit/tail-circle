import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Download, FileText, Receipt, PieChart, Loader2, AlertCircle, Info,
} from 'lucide-react';
import { fetchAdminTaxReport } from '../../../../../services/admin';

/**
 * Tax & GST reporting, backed by real paid Payments.
 *
 * Previously rendered invented invoices with a CGST/SGST/IGST split. That split
 * is decided by supplier state vs place of supply, and neither is captured
 * (VendorProfile has `city` but no `state`; Payment has no billing address).
 * The API reports those as `gaps` and this screen surfaces them, rather than
 * showing zeros that could be mistaken for a filed-ready return.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const asDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Client-side CSV so an export never silently produces an empty file. */
function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TaxGSTReports() {
  const [viewMode, setViewMode] = useState('detailed');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAdminTaxReport()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message || 'Could not load the tax report'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const invoices = useMemo(() => {
    const rows = data?.invoices || [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        String(r.id).toLowerCase().includes(q) ||
        String(r.customer).toLowerCase().includes(q) ||
        String(r.purpose).toLowerCase().includes(q)
    );
  }, [data, query]);

  const summary = data?.summary || [];
  const totals = data?.totals || { taxable: 0, gst: 0, total: 0, invoiceCount: 0, rate: '—' };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle size={30} className="text-amber-500" />
        <p className="font-semibold text-gray-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Tax &amp; GST Reports</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            GST breakdown across {totals.invoiceCount} paid transactions
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => downloadCsv('tax-detailed.csv', data?.invoices || [])}
            disabled={!data?.invoices?.length}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-[13px] font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <Download size={16} /> Export Detailed CSV
          </button>
          <button
            onClick={() => downloadCsv('tax-monthly.csv', summary)}
            disabled={!summary.length}
            className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#5aa3a0] text-white text-[13px] font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <FileText size={16} /> Export Monthly CSV
          </button>
        </div>
      </div>

      {/* Real totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Taxable Value" value={inr(totals.taxable)} tone="text-gray-900" />
        <Stat label="Total GST Collected" value={inr(totals.gst)} tone="text-indigo-600" />
        <Stat label="Gross Collected" value={inr(totals.total)} tone="text-emerald-600" />
        <Stat label="Applied Rate" value={totals.rate} tone="text-blue-600" />
      </div>

      {/* Honest gap notice */}
      {data?.gaps && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[13px] text-amber-900">
            <p className="font-semibold mb-1">Not a filed-ready GSTR-1</p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              {Object.values(data.gaps).map((g) => <li key={g}>{g}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50/50">
          <div className="flex items-center gap-1">
            <Tab active={viewMode === 'detailed'} onClick={() => setViewMode('detailed')} icon={Receipt}>
              Detailed Invoices
            </Tab>
            <Tab active={viewMode === 'summary'} onClick={() => setViewMode('summary')} icon={PieChart}>
              Monthly Summary
            </Tab>
          </div>
        </div>

        {viewMode === 'detailed' && (
          <div className="p-4 border-b border-[#FAF7F2]">
            <div className="relative max-w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search payment id, customer, purpose…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {viewMode === 'detailed' ? (
            invoices.length ? (
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    {['Payment ID', 'Date', 'Customer', 'Purpose', 'Method', 'Taxable', 'Rate', 'GST', 'Total'].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-700">{r.id}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{asDate(r.date)}</td>
                      <td className="px-4 py-3 text-gray-800">{r.customer}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{String(r.purpose).replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-500 uppercase">{r.method}</td>
                      <td className="px-4 py-3 text-gray-800">{inr(r.taxable)}</td>
                      <td className="px-4 py-3 text-gray-500">{r.rate}</td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">{inr(r.gst)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{inr(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty text={query ? 'No transactions match that search.' : 'No paid transactions yet.'} />
            )
          ) : summary.length ? (
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  {['Period', 'Invoices', 'Gross', 'GST', 'Net'].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((r) => (
                  <tr key={r.period} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-900">{r.period}</td>
                    <td className="px-4 py-3 text-gray-600">{r.invoices}</td>
                    <td className="px-4 py-3 text-gray-800">{inr(r.gross)}</td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">{inr(r.gst)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{inr(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No monthly data yet." />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
      <h3 className="text-[13px] text-gray-500 font-medium">{label}</h3>
      <p className={`text-[26px] font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${
        active ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={18} /> {children}
    </button>
  );
}

function Empty({ text }) {
  return <div className="py-16 text-center text-[13px] text-gray-400">{text}</div>;
}
