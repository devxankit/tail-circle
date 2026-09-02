import React, { useEffect, useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { IndianRupee, Download, CheckCircle, Clock, Send, Loader2 } from 'lucide-react';
import { cn } from '../../../user/utils/cn';

const rupees = (paise) => Math.round((paise || 0) / 100);

/** Real ledger + payouts (GET /vendor/ledger, GET /vendor/payouts). */
export function FinanceCenterView() {
  const { finances = {} } = useMealProvider();
  const [activeTab, setActiveTab] = useState('overview');
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([fetchVendorLedger(), fetchVendorPayouts()])
      .then(([l, p]) => { setLedger(l); setPayouts(p); })
      .catch((e) => setError(e?.response?.data?.message || 'Could not load finance data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unsettled = ledger.filter((l) => l.status === 'unsettled');
  const pendingNet = unsettled.reduce((s, l) => s + l.net, 0);
  const lifetimeNet = ledger.reduce((s, l) => s + l.net, 0);

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

  const handleExport = () => {
    if (!ledger.length) return;
    const headers = ['Date', 'Source', 'Gross', 'Commission', 'Net', 'Status'];
    const rows = [headers.join(','), ...ledger.map((l) => [new Date(l.createdAt).toLocaleDateString('en-IN'), l.refType, rupees(l.gross), rupees(l.commission), rupees(l.net), l.status].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meal-vendor-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col pb-10">

      <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Finance Operations Center</h2>
            <p className="text-sm font-semibold text-gray-500 mt-0.5">Real ledger and settlement data from paid orders.</p>
          </div>
          <button onClick={handleExport} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2">
            <Download size={16} /> Export Ledger
          </button>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl w-max border border-gray-200 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'ledger', label: 'Ledger' },
            { id: 'settlements', label: 'Payouts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('px-5 py-2 text-sm font-bold rounded-lg transition shrink-0 cursor-pointer', activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100"><IndianRupee size={20} /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lifetime Earnings</p>
            <h3 className="text-2xl font-black text-gray-900">₹{rupees(lifetimeNet).toLocaleString('en-IN')}</h3>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-3 border border-orange-100"><Clock size={20} /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Settlement</p>
            <h3 className="text-2xl font-black text-gray-900">₹{rupees(pendingNet).toLocaleString('en-IN')}</h3>
            <p className="text-[11px] text-gray-400 mt-1">{unsettled.length} unsettled entries</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Subscriptions</p>
            <h3 className="text-3xl font-black text-white mt-1">{finances?.activeSubs ?? 0}</h3>
            <button
              onClick={handleRequestPayout}
              disabled={requesting || unsettled.length === 0}
              className="mt-3 w-full py-2 bg-white text-slate-900 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              {requesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {unsettled.length === 0 ? 'Nothing to settle' : 'Request Payout'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Gross</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Net</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledger.map((l) => (
                <tr key={l._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-600">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 capitalize">{l.refType} {l.label ? `· ${l.label}` : ''}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{rupees(l.gross).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-500">-₹{rupees(l.commission).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600">₹{rupees(l.net).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border', l.status === 'settled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100')}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {!ledger.length && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-400 font-semibold">No ledger entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Payout</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Net Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">UTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">{p._id.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-4 font-bold text-sm text-gray-900">{p.period}</td>
                  <td className="px-6 py-4 font-black text-emerald-600 text-lg">₹{rupees(p.netAmount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border inline-flex items-center gap-1', p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100')}>
                      {p.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />} {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500 flex items-center justify-between">
                    <span>{p.utr || '—'}</span>
                    <button
                      onClick={() => {
                        const lines = [
                          `TAILCIRCLE MEAL PROVIDER PAYOUT STATEMENT`,
                          `-----------------------------------------`,
                          `Payout ID: ${p._id}`,
                          `Period: ${p.period}`,
                          `Status: ${p.status.toUpperCase()}`,
                          `UTR Reference: ${p.utr || 'N/A'}`,
                          `Net Amount Settled: ₹${rupees(p.netAmount).toLocaleString('en-IN')}`,
                          `Date Issued: ${new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN')}`,
                        ].join('\n');
                        const blob = new Blob([lines], { type: 'text/plain;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `meal_payout_statement_${p._id.slice(-6)}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      title="Download Payout Statement"
                      className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100 transition cursor-pointer"
                    >
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!payouts.length && (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-400 font-semibold">No payouts requested yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
