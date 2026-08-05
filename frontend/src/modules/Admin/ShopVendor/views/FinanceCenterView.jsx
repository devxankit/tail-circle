import React, { useState, useEffect } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { Wallet, Download, CheckCircle, Clock, Loader2, Send } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

const rupees = (paise) => Math.round((paise || 0) / 100);

/** Real ledger + payout data from GET /vendor/ledger and GET /vendor/payouts. */
export function FinanceCenterView() {
  const { dashboard } = useShopVendor();
  const [activeTab, setActiveTab] = useState('Overview');
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const tabs = ['Overview', 'Ledger', 'Payouts'];

  const load = () => {
    setLoading(true);
    Promise.all([fetchVendorLedger(), fetchVendorPayouts()])
      .then(([l, p]) => { setLedger(l); setPayouts(p); })
      .catch((e) => setError(e?.response?.data?.message || 'Could not load finance data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unsettledCount = ledger.filter((l) => l.status === 'unsettled').length;

  const handleRequestPayout = async () => {
    setRequesting(true);
    try {
      await requestVendorPayout();
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not request payout');
    } finally {
      setRequesting(false);
    }
  };

  const handleExportReport = () => {
    if (!ledger.length) return;
    const headers = ['Date', 'Ref Type', 'Gross', 'Commission', 'Net', 'Status'];
    const rows = [
      headers.join(','),
      ...ledger.map((l) => [new Date(l.createdAt).toLocaleDateString('en-IN'), l.refType, rupees(l.gross), rupees(l.commission), rupees(l.net), l.status].join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finance Center</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Track earnings, payouts, and commission details.</p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer shrink-0"
        >
          <Download size={16} /> Export Ledger
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-xl p-4">{error}</div>}

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3 text-sm font-bold border-b-2 transition cursor-pointer",
              activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Lifetime Earnings</h3>
            <p className="text-4xl font-black mb-4">₹{rupees(dashboard?.lifetimeEarnings).toLocaleString('en-IN')}</p>
            <div className="flex justify-between items-center pt-4 border-t border-white/10 text-xs font-semibold text-slate-300">
              <span>{ledger.length} settled transactions</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Pending Settlement</h3>
            <p className="text-3xl font-black text-slate-900 mb-4">₹{rupees(dashboard?.pendingSettlement).toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500">{unsettledCount} unsettled ledger {unsettledCount === 1 ? 'entry' : 'entries'}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Request Payout</h3>
              <p className="text-xs font-semibold text-slate-500 mb-4">Bundles every unsettled entry into one payout request.</p>
            </div>
            <button
              onClick={handleRequestPayout}
              disabled={requesting || unsettledCount === 0}
              className="w-full py-3 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {requesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {unsettledCount === 0 ? 'Nothing to settle' : 'Request Payout'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Ledger' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Date</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Source</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Gross</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Commission</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Net</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((l) => (
                <tr key={l._id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-4 px-6 text-sm font-bold text-slate-700 capitalize">{l.refType} {l.label ? `· ${l.label}` : ''}</td>
                  <td className="py-4 px-6 text-sm font-black text-slate-900">₹{rupees(l.gross).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6 text-sm font-bold text-red-600">-₹{rupees(l.commission).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6 text-sm font-black text-emerald-600">₹{rupees(l.net).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      l.status === 'settled' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500 font-semibold">No ledger entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Payouts' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Payout</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Period</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Net Amount</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">UTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-6 text-sm font-black text-slate-900">{p._id.slice(-8).toUpperCase()}</td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">{p.period}</td>
                  <td className="py-4 px-6 text-sm font-black text-slate-900">₹{rupees(p.netAmount).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1",
                      p.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {p.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm font-mono text-slate-500">{p.utr || '—'}</td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-slate-500 font-semibold">No payouts requested yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
