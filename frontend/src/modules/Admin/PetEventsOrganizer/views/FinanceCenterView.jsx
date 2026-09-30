import React, { useEffect, useState } from 'react';
import { fetchVendorLedger, fetchVendorPayouts, requestVendorPayout } from '../../../../services/vendor';
import { Wallet, ArrowUpRight, CheckCircle, Send, Clock } from 'lucide-react';
import { SegmentedTabs, ListCard, StatusBadge, EmptyState, SkeletonList, InlineError, PrimaryButton } from '../../vendor/mobile';

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

  if (loading) return <SkeletonList rows={3} />;

  return (
    <div className="space-y-4">

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Finance Center</h2>
        <p className="text-xs text-text-secondary mt-1">Real ledger and settlement data from paid ticket sales.</p>
      </div>

      <InlineError>{error}</InlineError>

      <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] p-5 rounded-[28px] text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-85 mb-1.5">Lifetime Earnings</p>
        <h3 className="text-[34px] font-black leading-none">₹{rupees(lifetimeNet).toLocaleString('en-IN')}</h3>
      </div>

      <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Pending Settlement</p>
        <h3 className="text-2xl font-black text-text-primary">₹{rupees(pendingNet).toLocaleString('en-IN')}</h3>
        <p className="mt-1 text-text-secondary text-xs font-bold">{unsettled.length} unsettled entries</p>
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-4 mb-2">Request Payout</p>
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

      <SegmentedTabs
        items={[{ key: 'revenue', label: 'Ledger' }, { key: 'settlements', label: 'Settlements' }]}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {activeTab === 'revenue' && (
        ledger.length ? (
          <div className="space-y-3">
            {ledger.map((l) => (
              <ListCard
                key={l._id}
                leading={(
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-success/10 text-success">
                    <ArrowUpRight size={18} />
                  </div>
                )}
                title={<span className="capitalize">{l.refType} {l.label ? `· ${l.label}` : ''}</span>}
                subtitle={new Date(l.createdAt).toLocaleDateString('en-IN')}
                status={l.status}
                meta={[
                  { label: 'Gross', value: `₹${rupees(l.gross).toLocaleString('en-IN')}` },
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
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Wallet} title="No Settlements Yet" text="Request a payout above once you have unsettled earnings." />
        )
      )}

    </div>
  );
}
