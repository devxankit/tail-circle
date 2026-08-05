import React, { useEffect, useState } from 'react';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { Wallet, ArrowUpRight, CheckCircle, Send, Clock, Loader2 } from 'lucide-react';

const rupees = (paise) => Math.round((paise || 0) / 100);

/** Real ledger + payouts (GET /vendor/ledger, GET /vendor/payouts). */
export function FinanceCenterView() {
  const [activeTab, setActiveTab] = useState('revenue');
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

  const getStatusColor = (status) => (
    status === 'settled' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-orange-700 bg-orange-100 border-orange-200'
  );

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finance Center</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Real ledger and settlement data from paid ticket sales.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lifetime Earnings</p>
          <h3 className="text-4xl font-black">₹{rupees(lifetimeNet).toLocaleString('en-IN')}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Settlement</p>
          <h3 className="text-3xl font-black text-slate-900">₹{rupees(pendingNet).toLocaleString('en-IN')}</h3>
          <p className="mt-2 text-slate-500 text-xs font-bold">{unsettled.length} unsettled entries</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Request Payout</p>
          <button
            onClick={handleRequestPayout}
            disabled={requesting || unsettled.length === 0}
            className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            {requesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {unsettled.length === 0 ? 'Nothing to settle' : 'Request Payout'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {['revenue', 'settlements'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 text-sm font-black uppercase tracking-wider transition-colors relative ${activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 cursor-pointer'}`}
          >
            {tab === 'revenue' ? 'Ledger' : 'Settlements'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full" />}
          </button>
        ))}
      </div>

      {activeTab === 'revenue' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Source</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Gross</th>
                  <th className="p-4">Net</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-emerald-50 text-emerald-600">
                          <ArrowUpRight size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 capitalize">{l.refType} {l.label ? `· ${l.label}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><p className="text-xs font-bold text-slate-700">{new Date(l.createdAt).toLocaleDateString('en-IN')}</p></td>
                    <td className="p-4"><p className="text-sm font-black text-slate-900">₹{rupees(l.gross).toLocaleString('en-IN')}</p></td>
                    <td className="p-4"><p className="text-sm font-black text-emerald-600">₹{rupees(l.net).toLocaleString('en-IN')}</p></td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${getStatusColor(l.status)}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
                {!ledger.length && (
                  <tr><td colSpan="5" className="p-12 text-center text-sm text-slate-400 font-semibold">No ledger entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        payouts.length ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Payout</th>
                  <th className="p-4">Period</th>
                  <th className="p-4">Net Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500">{p._id.slice(-8).toUpperCase()}</td>
                    <td className="p-4 font-bold text-sm text-slate-900">{p.period}</td>
                    <td className="p-4 font-black text-emerald-600">₹{rupees(p.netAmount).toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg inline-flex items-center gap-1 ${p.status === 'paid' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-orange-700 bg-orange-100 border-orange-200'}`}>
                        {p.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />} {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4 border border-blue-100">
              <Wallet size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">No Settlements Yet</h3>
            <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">Request a payout above once you have unsettled earnings.</p>
          </div>
        )
      )}

    </div>
  );
}
