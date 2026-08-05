import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { Search, Loader2, AlertCircle, Trophy, Medal, Award, Info, Star } from 'lucide-react';
import { ChartCard, CustomTooltip, COLORS } from '../../../components/ChartCard';
import { PageHeader } from '../../components/VendorShared';
import { fetchVendorPerformance } from '../../../../../services/admin';

/**
 * Vendor performance, ranked by real settled revenue.
 *
 * This screen previously rendered five invented vendors with fabricated
 * 6-month trends, radar scores, completion rates and complaint counts. None of
 * that data exists: `VendorLedgerEntry` records gross/commission/net per paid
 * order and `VendorProfile` carries the rating — so those are what is shown,
 * and the untracked metrics are named as untracked rather than invented.
 */

const C = COLORS;
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const TYPE_TONE = {
  Shop: C.teal, Clinic: C.blue, Doctor: C.blue, Meal: C.amber,
  Events: C.purple, Event: C.purple, Memorial: C.red,
  Grooming: C.teal, Daycare: C.amber, Other: C.blue,
};

const RANK_ICON = [Trophy, Medal, Award];
const RANK_TONE = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

function downloadCsv(rows) {
  if (!rows.length) return;
  const cols = ['name', 'type', 'gross', 'commission', 'net', 'orders', 'rating', 'commissionRate'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendor-performance.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function VendorPerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');

  useEffect(() => {
    let cancelled = false;
    fetchVendorPerformance()
      .then((d) => !cancelled && setRows(Array.isArray(d) ? d : []))
      .catch((e) => !cancelled && setError(e.message || 'Could not load vendor performance'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const types = useMemo(() => ['All', ...new Set(rows.map((r) => r.type).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (type !== 'All') out = out.filter((r) => r.type === type);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) => String(r.name).toLowerCase().includes(q));
    }
    return out;
  }, [rows, query, type]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, r) => ({
          gross: a.gross + (r.gross || 0),
          commission: a.commission + (r.commission || 0),
          orders: a.orders + (r.orders || 0),
        }),
        { gross: 0, commission: 0, orders: 0 }
      ),
    [filtered]
  );

  // Only vendors with settled revenue are worth charting.
  const chartData = useMemo(
    () => filtered.filter((r) => r.gross > 0).slice(0, 8).map((r) => ({ name: r.name, Revenue: r.gross, type: r.type })),
    [filtered]
  );

  const earning = filtered.filter((r) => r.gross > 0).length;

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
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20">
      <PageHeader
        title="Vendor Performance"
        subtitle={`${rows.length} approved vendors · ${earning} with settled revenue`}
        action={{ label: 'Export CSV', onClick: () => downloadCsv(filtered) }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Gross Revenue" value={inr(totals.gross)} tone="text-gray-900" />
        <Stat label="Platform Commission" value={inr(totals.commission)} tone="text-indigo-600" />
        <Stat label="Settled Orders" value={totals.orders} tone="text-emerald-600" />
        <Stat label="Vendors Earning" value={`${earning} / ${filtered.length}`} tone="text-blue-600" />
      </div>

      {chartData.length > 0 && (
        <div className="mb-6">
          <ChartCard title="Revenue by vendor" subtitle="Gross settled revenue, top 8">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4F8" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A0AEC0' }} interval={0} angle={-15} textAnchor="end" height={64} />
                <YAxis tick={{ fontSize: 11, fill: '#A0AEC0' }} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                <CustomTooltip />
                <Bar dataKey="Revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={TYPE_TONE[d.type] || C.teal} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Name what is not tracked instead of inventing it. */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[13px] text-blue-900">
          <p className="font-semibold mb-1">These are settled-ledger figures</p>
          <p className="text-blue-800">
            Completion rate, complaint counts, a composite performance score and
            period-over-period trends are not tracked yet — they need per-order outcome and
            dispute history, which the ledger does not record. Revenue, commission, order
            count and rating are real.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden">
        <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                  type === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length ? (
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  {['#', 'Vendor', 'Type', 'Gross', 'Commission', 'Net', 'Orders', 'Rating', 'Rate'].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r, i) => {
                  const Icon = r.gross > 0 && i < 3 ? RANK_ICON[i] : null;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        {Icon ? <Icon size={16} className={RANK_TONE[i]} /> : <span className="text-gray-400">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
                          style={{ background: TYPE_TONE[r.type] || C.teal }}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{inr(r.gross)}</td>
                      <td className="px-4 py-3 text-indigo-600">{inr(r.commission)}</td>
                      <td className="px-4 py-3 text-emerald-600">{inr(r.net)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.orders}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {r.rating || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.commissionRate != null ? `${Math.round(r.commissionRate * 100)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-[13px] text-gray-400">
              {query || type !== 'All' ? 'No vendors match those filters.' : 'No approved vendors yet.'}
            </div>
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
