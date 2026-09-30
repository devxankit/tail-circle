import React, { useState, useEffect } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { Wallet, Download, CheckCircle, Clock, Send } from 'lucide-react';
import {
  SegmentedTabs, ListCard, StatusBadge, EmptyState, SkeletonList, InlineError, PrimaryButton, CardAction,
} from '../../vendor/mobile';

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
    return <SkeletonList rows={3} />;
  }

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Finance Center</h2>
          <p className="text-xs text-text-secondary mt-1">Track earnings, payouts, and commission details.</p>
        </div>
        <button
          onClick={handleExportReport}
          className="h-11 px-4 rounded-full bg-text-primary text-white text-sm font-bold flex items-center gap-1.5 shrink-0"
        >
          <Download size={16} /> Export Ledger
        </button>
      </div>

      <InlineError>{error}</InlineError>

      <SegmentedTabs items={tabs.map((t) => ({ key: t, label: t }))} activeKey={activeTab} onSelect={setActiveTab} />

      {activeTab === 'Overview' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] rounded-[28px] p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-85 mb-1.5">Lifetime Earnings</h3>
            <p className="text-[34px] font-black leading-none mb-4">₹{rupees(dashboard?.lifetimeEarnings).toLocaleString('en-IN')}</p>
            <div className="pt-3 border-t border-white/20 text-xs font-semibold opacity-90">
              <span>{ledger.length} settled transactions</span>
            </div>
          </div>

          <div className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-1.5">Pending Settlement</h3>
            <p className="text-2xl font-black text-text-primary">₹{rupees(dashboard?.pendingSettlement).toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-text-secondary mt-1">{unsettledCount} unsettled ledger {unsettledCount === 1 ? 'entry' : 'entries'}</p>
          </div>

          <div className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-1">Request Payout</h3>
            <p className="text-xs font-semibold text-text-secondary mb-3">Bundles every unsettled entry into one payout request.</p>
            <PrimaryButton
              tone="dark"
              className="w-full"
              onClick={handleRequestPayout}
              disabled={requesting || unsettledCount === 0}
              loading={requesting}
              icon={Send}
            >
              {unsettledCount === 0 ? 'Nothing to settle' : 'Request Payout'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {activeTab === 'Ledger' && (
        ledger.length === 0 ? (
          <EmptyState icon={Wallet} text="No ledger entries yet." />
        ) : (
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
                  { label: 'Net', value: <span className="text-success font-black">₹{rupees(l.net).toLocaleString('en-IN')}</span> },
                ]}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'Payouts' && (
        payouts.length === 0 ? (
          <EmptyState icon={Wallet} text="No payouts requested yet." />
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <ListCard
                key={p._id}
                title={p._id.slice(-8).toUpperCase()}
                subtitle={p.period}
                badge={(
                  <StatusBadge
                    status={p.status}
                    label={<span className="inline-flex items-center gap-1">{p.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />}{p.status}</span>}
                  />
                )}
                amount={`₹${rupees(p.netAmount).toLocaleString('en-IN')}`}
                meta={[{ label: 'UTR', value: <span className="font-mono">{p.utr || '—'}</span>, full: true }]}
                footer={(
                  <CardAction
                    icon={Download}
                    className="w-full"
                    onClick={() => {
                      const lines = [
                        `TAILCIRCLE VENDOR PAYOUT STATEMENT`,
                        `-----------------------------------`,
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
                      a.download = `payout_statement_${p._id.slice(-6)}.txt`;
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
        )
      )}

    </div>
  );
}
