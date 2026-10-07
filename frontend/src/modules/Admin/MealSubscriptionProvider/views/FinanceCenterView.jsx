import React, { useEffect, useState } from 'react';
import { useMealProvider } from '../context/MealProviderContext';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { IndianRupee, Download, CheckCircle, Clock, Send, Wallet } from 'lucide-react';
import { SegmentedTabs, ListCard, StatusBadge, EmptyState, SkeletonList, InlineError, PrimaryButton, CardAction } from '../../vendor/mobile';

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
      .catch((e) => setError(e?.response?.data?.message || e?.message || 'Could not load finance data'))
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
      setError(err?.response?.data?.message || err?.message || 'Could not request payout');
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

  if (loading) return <SkeletonList rows={3} />;

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Finance Operations Center</h2>
          <p className="text-xs text-text-secondary mt-1">Real ledger and settlement data from paid orders.</p>
        </div>
        <button onClick={handleExport} className="h-11 px-4 bg-white border border-border-light text-text-primary text-sm font-bold rounded-full transition cursor-pointer flex items-center gap-1.5 shrink-0">
          <Download size={16} /> Export
        </button>
      </div>

      <SegmentedTabs
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'ledger', label: 'Ledger' },
          { key: 'settlements', label: 'Payouts' },
        ]}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <InlineError>{error}</InlineError>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] p-5 rounded-[28px] text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
            <div className="flex items-center gap-2 opacity-85 mb-1.5"><IndianRupee size={14} /><p className="text-[11px] font-bold uppercase tracking-wider">Lifetime Earnings</p></div>
            <h3 className="text-[34px] font-black leading-none">₹{rupees(lifetimeNet).toLocaleString('en-IN')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
              <div className="w-9 h-9 bg-warning/10 rounded-xl flex items-center justify-center text-warning mb-2"><Clock size={18} /></div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Pending Settlement</p>
              <h3 className="text-xl font-black text-text-primary">₹{rupees(pendingNet).toLocaleString('en-IN')}</h3>
              <p className="text-[11px] text-text-secondary mt-1">{unsettled.length} unsettled entries</p>
            </div>
            <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Active Subscriptions</p>
              <h3 className="text-3xl font-black text-text-primary mt-1">{finances?.activeSubs ?? 0}</h3>
            </div>
          </div>
          <PrimaryButton
            tone="dark"
            className="w-full"
            onClick={handleRequestPayout}
            disabled={requesting || unsettled.length === 0}
            loading={requesting}
            icon={Send}
          >
            {unsettled.length === 0 ? 'Nothing to settle' : 'Request Payout'}
          </PrimaryButton>
        </div>
      )}

      {activeTab === 'ledger' && (
        ledger.length ? (
          <div className="space-y-3">
            {ledger.map((l) => (
              <ListCard
                key={l._id}
                title={<span className="capitalize">{l.refType} {l.label ? `· ${l.label}` : ''}</span>}
                subtitle={new Date(l.createdAt).toLocaleDateString('en-IN')}
                status={l.status}
                meta={[
                  { label: 'Gross', value: `₹${rupees(l.gross).toLocaleString('en-IN')}` },
                  { label: 'Commission', value: <span className="text-error">-₹{rupees(l.commission).toLocaleString('en-IN')}</span> },
                  { label: 'Net', value: <span className="font-black text-success">₹{rupees(l.net).toLocaleString('en-IN')}</span> },
                ]}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Wallet} text="No ledger entries yet." />
        )
      )}

      {activeTab === 'settlements' && (
        payouts.length ? (
          <div className="space-y-3">
            {payouts.map((p) => (
              <ListCard
                key={p._id}
                title={<span className="font-mono">{p._id.slice(-8).toUpperCase()}</span>}
                subtitle={p.period}
                badge={(
                  <StatusBadge
                    status={p.status}
                    label={<span className="inline-flex items-center gap-1">{p.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />} {p.status}</span>}
                  />
                )}
                amount={<span className="text-success">₹{rupees(p.netAmount).toLocaleString('en-IN')}</span>}
                meta={[{ label: 'UTR', value: <span className="font-mono">{p.utr || '—'}</span>, full: true }]}
                footer={(
                  <CardAction
                    icon={Download}
                    className="w-full"
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
                  >
                    Download Payout Statement
                  </CardAction>
                )}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Wallet} text="No payouts requested yet." />
        )
      )}

    </div>
  );
}
