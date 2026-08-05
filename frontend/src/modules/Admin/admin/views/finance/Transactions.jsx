import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, RefreshCcw, Copy, ExternalLink, Check, X, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2, Info } from 'lucide-react';
import { fetchAdminTransactions, fetchAdminPaymentsOverview } from '../../../../../services/admin';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartCard, CustomTooltip, COLORS } from '../../../components/ChartCard';

/**
 * Transactions — the real Payment ledger.
 *
 * Stats and the payment-method donut come from `paymentsOverview()`, an
 * aggregate over every payment. The volume/daily-count charts are grouped
 * client-side from the same rows the table shows (the last 400 payments),
 * so their subtitle says so rather than claiming a fixed "30 days" window.
 * There is no refund API and no server-side pagination/date-range filter —
 * both are labelled rather than faked.
 */

const C = COLORS;
const axisTick = { fontSize: 11, fill: '#A0AEC0' };
const gridStroke = '#F0F4F8';
const rupeeFmt = (v) => `₹${(v / 1000).toFixed(0)}k`;
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function groupByDay(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (t.status !== 'Success' || !t.createdAt) continue;
    const d = new Date(t.createdAt);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleString('en', { month: 'short', day: 'numeric' });
    const row = map.get(key) || { key, day: label, amount: 0, count: 0 };
    row.amount += t.amountValue || 0;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function Transactions() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchAdminTransactions(), fetchAdminPaymentsOverview()])
      .then(([txns, ov]) => { setTransactions(txns); setOverview(ov); })
      .catch((err) => setError(err.message || 'Could not load transactions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const types = useMemo(() => ['All', ...new Set(transactions.map((t) => t.type).filter(Boolean))], [transactions]);
  const methods = useMemo(() => ['All', ...new Set(transactions.map((t) => t.method).filter((m) => m && m !== '—'))], [transactions]);
  const statuses = ['All', 'Success', 'Pending', 'Failed', 'Refund'];

  const filtered = useMemo(() => {
    let out = transactions;
    if (typeFilter !== 'All') out = out.filter((t) => t.type === typeFilter);
    if (methodFilter !== 'All') out = out.filter((t) => t.method === methodFilter);
    if (statusFilter !== 'All') out = out.filter((t) => t.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((t) => `${t.id} ${t.customer} ${t.vendor}`.toLowerCase().includes(q));
    }
    return out;
  }, [transactions, typeFilter, methodFilter, statusFilter, query]);

  const dailyData = useMemo(() => groupByDay(transactions), [transactions]);

  const openDrawer = (txn) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
  };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = 'Transaction ID,Date,Type,Customer,Amount,Payment Method,Status\n';
    const csvContent = 'data:text/csv;charset=utf-8,' + headers + filtered.map((t) => `${t.id},"${t.date}",${t.type},"${t.customer}",${t.amountValue},${t.method},${t.status}`).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'transactions_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV exported');
  };

  const handleDownloadReceipt = () => {
    if (!selectedTxn) return;
    const content = `RECEIPT\n\nTransaction ID: ${selectedTxn.id}\nDate & Time: ${selectedTxn.date}\nType: ${selectedTxn.type}\nStatus: ${selectedTxn.status}\n\nCustomer: ${selectedTxn.customer}\nPayment Method: ${selectedTxn.method}\nRazorpay Order: ${selectedTxn.razorpayOrderId}\n\nAMOUNT: ${inr(selectedTxn.amountValue)}\n\nThank you for using TailCircle!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = `${selectedTxn.id}_receipt.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Receipt downloaded');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'info');
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Order': return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Refund': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'Booking': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Subscription': return 'bg-blue-100 text-blue-700 border border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      case 'Refund': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Success': return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'Pending': return <Clock size={14} className="text-amber-600" />;
      case 'Failed': return <AlertCircle size={14} className="text-red-600" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-gray-400" /></div>;
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

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3 max-w-md">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Info size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Transactions</h1>
          <p className="text-[13px] text-gray-500 mt-1">Platform-wide payment ledger</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition shadow-sm" title="Refresh">
            <RefreshCcw size={15} />
          </button>
          <button onClick={handleExportCSV} className="flex justify-center w-full sm:w-auto items-center gap-2 px-4 py-2.5 sm:py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      {/* Stats — real aggregates from the Payment collection. */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between h-28">
          <h3 className="text-[13px] text-gray-500 font-medium">Revenue This Month</h3>
          <p className="text-[26px] font-bold text-gray-900">{inr(overview?.thisMonth)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between h-28">
          <h3 className="text-[13px] text-gray-500 font-medium">Collected Today</h3>
          <p className="text-[26px] font-bold text-gray-900">{inr(overview?.collectedToday)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between h-28">
          <h3 className="text-[13px] text-gray-500 font-medium">Refunded</h3>
          <p className="text-[26px] font-bold text-gray-900">{inr(overview?.refundedAmount)}</p>
          <p className="text-[11px] text-gray-400">{overview?.refundedCount || 0} payments</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
             <h3 className="text-[13px] text-gray-500 font-medium">Pending Payments</h3>
             <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </div>
          <p className="text-[26px] font-bold text-amber-600">{overview?.pendingCount || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-8 space-y-5">
        <ChartCard title="Payment Volume" subtitle={`Grouped from the ${transactions.length} most recent payments loaded`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.teal} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} dy={6} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={rupeeFmt} width={44} />
              <Tooltip content={<CustomTooltip formatter={rupeeFmt} />} />
              <Area type="monotone" dataKey="amount" name="Collected" stroke={C.teal} strokeWidth={2.5} fill="url(#inGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="w-full lg:w-[40%] shrink-0 min-w-0">
            <ChartCard title="By Payment Method" subtitle="Share of all successful payments">
              {overview?.methodDistribution?.length ? (
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={overview.methodDistribution} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                          {overview.methodDistribution.map((d, i) => <Cell key={i} fill={[C.teal, C.blue, C.amber, C.purple, C.red][i % 5]} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-semibold">Paid</span>
                      <span className="text-[14px] font-black text-slate-800">{overview.paidCount}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {overview.methodDistribution.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: [C.teal, C.blue, C.amber, C.purple, C.red][i % 5] }} />
                          <span className="text-[11px] text-slate-600 font-medium">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 py-10 text-center">No successful payments yet.</p>
              )}
            </ChartCard>
          </div>
          <div className="flex-1 min-w-0">
            <ChartCard title="Daily Transaction Count" subtitle="Successful payments per day, loaded set">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Transactions" fill={C.teal} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">

        <div className="p-4 border-b border-[#FAF7F2] flex flex-col lg:flex-row gap-3 bg-gray-50/50">
          <div className="relative w-full lg:w-[250px] shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Txn ID or customer…"
              className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm"
            />
          </div>

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none cursor-pointer w-full sm:w-auto">
              {types.map((t) => <option key={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none cursor-pointer w-full sm:w-auto">
              {methods.map((m) => <option key={m}>{m === 'All' ? 'All Methods' : m}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none cursor-pointer w-full sm:w-auto">
              {statuses.map((s) => <option key={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {filtered.length ? (
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
             <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                <tr>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                   <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[#FAF7F2]">
                {filtered.map(txn => (
                   <tr key={txn.id} onClick={() => openDrawer(txn)} className="hover:bg-[#FAF7F2] transition cursor-pointer group">
                      <td className="px-5 py-4">
                         <span className="text-[13px] font-semibold text-gray-900 group-hover:text-[#66B4B1] transition">{txn.id}</span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600 font-medium">{txn.date}</td>
                      <td className="px-5 py-4">
                         <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getTypeStyle(txn.type)}`}>{txn.type}</span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600">{txn.customer}</td>
                      <td className="px-5 py-4 text-[13px] font-bold text-gray-900">{txn.amount}</td>
                      <td className="px-5 py-4 text-[13px] text-gray-600 font-medium">{txn.method}</td>
                      <td className="px-5 py-4">
                         <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${getStatusStyle(txn.status)}`}>
                            {getStatusIcon(txn.status)}
                            <span className="text-[11px] font-bold">{txn.status}</span>
                         </div>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
          ) : (
            <div className="py-16 text-center text-[13px] text-gray-400">
              {query || typeFilter !== 'All' || methodFilter !== 'All' || statusFilter !== 'All' ? 'No transactions match those filters.' : 'No transactions yet.'}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#FAF7F2] flex items-center justify-between bg-white">
           <p className="text-[13px] text-gray-500 font-medium">
             Showing {filtered.length} of {transactions.length} loaded (most recent 400 payments — no server-side pagination yet)
           </p>
        </div>
      </div>

      {/* Right Drawer */}
      {isDrawerOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition">
                   <ChevronRight size={20} />
                 </button>
                 <div>
                    <h2 className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
                      Transaction Details
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getTypeStyle(selectedTxn.type)}`}>{selectedTxn.type}</span>
                    </h2>
                    <p className="text-[12px] text-gray-500 font-mono mt-0.5">{selectedTxn.id}</p>
                 </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getStatusStyle(selectedTxn.status)}`}>
                  {getStatusIcon(selectedTxn.status)}
                  <span className="text-[12px] font-bold">{selectedTxn.status}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">

               <div className="flex flex-col items-center justify-center py-6 border border-gray-100 rounded-xl bg-gray-50/30">
                  <p className="text-[13px] text-gray-500 font-medium mb-1">Transaction Amount</p>
                  <p className="text-[36px] font-black text-gray-900">{selectedTxn.amount}</p>
                  <p className="text-[12px] text-gray-400 mt-2">{selectedTxn.date}</p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Razorpay Order</p>
                     <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(selectedTxn.razorpayOrderId)}>
                        <p className="text-[14px] font-semibold text-[#66B4B1] group-hover:underline truncate">{selectedTxn.razorpayOrderId}</p>
                        <ExternalLink size={14} className="text-[#66B4B1] opacity-0 group-hover:opacity-100 transition shrink-0" />
                     </div>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Method</p>
                     <p className="text-[14px] font-medium text-gray-900">{selectedTxn.method}</p>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                     <p className="text-[14px] font-medium text-gray-900">{selectedTxn.customer}</p>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Refunded</p>
                     <p className="text-[14px] font-medium text-gray-900">{selectedTxn.refundedAmount > 0 ? inr(selectedTxn.refundedAmount) : '—'}</p>
                  </div>
               </div>

               {selectedTxn.failureReason && (
                 <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-2">Failure Reason</h3>
                    <p className="text-[13px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{selectedTxn.failureReason}</p>
                 </div>
               )}

               <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-[14px] font-bold text-gray-900 mb-3">Gateway Metadata</h3>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-[11px] text-gray-300 overflow-x-auto">
<pre>{JSON.stringify({
  gateway: 'Razorpay',
  razorpay_order_id: selectedTxn.razorpayOrderId,
  razorpay_payment_id: selectedTxn.razorpayPaymentId,
  method: selectedTxn.method,
  status: selectedTxn.status,
  webhook_verified_at: selectedTxn.verifiedAt || 'not verified',
}, null, 2)}</pre>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Fee/tax breakdown and customer IP are not captured on the Payment record.</p>
               </div>

            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
               <button onClick={handleDownloadReceipt} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition flex items-center gap-2">
                  <Download size={16} /> Download Receipt
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
