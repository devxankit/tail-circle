import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Check, Clock, Ban, RotateCcw,
  FileText, Bell, Scale, Info, LifeBuoy,
} from 'lucide-react';
import {
  fetchVendorCompliance,
  fetchVendorCompliancePolicy,
  fetchVendorComplianceUpdates,
  acknowledgeVendorCompliance,
} from '../../../services/providerVendor';
import { SegmentedTabs } from '../vendor/mobile/SegmentedTabs';
import { StatusBadge } from '../vendor/mobile/StatusBadge';
import { SkeletonList } from '../vendor/mobile/SkeletonList';
import { ScreenError } from '../vendor/mobile/ScreenError';

/**
 * A partner's own compliance page.
 *
 * Partners can now lose their account over this, so they get the whole picture
 * rather than a warning banner: what was recorded against them and why, every
 * message Tail Circle has sent them about it, the standing of each business
 * line they run, and the full rulebook with the points attached.
 *
 * The rulebook is shown to partners, not just operators, deliberately. A points
 * system nobody can read is a trap — a partner cannot avoid a penalty whose
 * existence they only discover by incurring it.
 *
 * One page shared by every panel (grooming, daycare, shop, meals, events,
 * memorial, clinic). The API resolves which business line is active from the
 * `X-Vendor-Type` header the panel already sets, so nothing here is per-type.
 */

// Semantic tones: the app remaps Tailwind's red/orange/amber to coral.
const SEVERITY_TONE = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
};

const UPDATE_STYLE = {
  compliance_warning: { icon: AlertTriangle, tone: 'text-warning bg-warning/10' },
  compliance_forgiven: { icon: Check, tone: 'text-success bg-success/10' },
  suspended: { icon: Ban, tone: 'text-error bg-error/10' },
  reinstated: { icon: RotateCcw, tone: 'text-success bg-success/10' },
};

const TABS = [
  { key: 'record', label: 'My record', icon: FileText },
  { key: 'updates', label: 'Messages', icon: Bell },
  { key: 'rules', label: 'Rules & points', icon: Scale },
];

export function VendorCompliancePage() {
  const [tab, setTab] = useState('record');
  const [standing, setStanding] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, u] = await Promise.all([
        fetchVendorCompliance(),
        fetchVendorCompliancePolicy(),
        fetchVendorComplianceUpdates().catch(() => []),
      ]);
      setStanding(s);
      setPolicy(p);
      setUpdates(u);
      setError(null);
      // Opening this page IS reading the warnings — no separate button needed.
      if (s?.unacknowledgedCount > 0) {
        acknowledgeVendorCompliance()
          .then(() => setStanding((cur) => ({ ...cur, unacknowledgedCount: 0 })))
          .catch(() => {});
      }
    } catch (err) {
      setError(err?.message || 'Could not load your service record');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <SkeletonList rows={3} />;
  }
  if (error) {
    return <ScreenError message={error} onRetry={load} />;
  }

  const { points = 0, threshold = 3, remaining = 0, windowDays = 90, breached, violations = [], profile, lines = [] } = standing || {};
  const active = violations.filter((v) => v.status !== 'forgiven');
  const withdrawn = violations.filter((v) => v.status === 'forgiven');
  const suspended = profile?.suspended;

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary px-1">
        Your record with Tail Circle, the messages we have sent you, and the rules we all work to.
      </p>

      {/* Suspension notice trumps everything else on the page. */}
      {suspended && (
        <div className="rounded-[20px] border-2 border-error/40 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
              <Ban size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-error">
                {profile.businessName || 'This business'} is suspended
              </h2>
              <p className="text-[13px] text-text-primary mt-1">
                You are not receiving new bookings or orders on your {profile.vendorType} business.
                Any work you already accepted still needs to be delivered.
              </p>
              <p className="text-[13px] text-text-primary mt-2">
                Contact support to appeal. If a violation below is wrong, say which one and why — an
                operator can withdraw it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Headline standing */}
      <StandingCard
        points={points}
        threshold={threshold}
        remaining={remaining}
        windowDays={windowDays}
        breached={breached}
        suspended={suspended}
        count={active.length}
      />

      {/* Every business line this account runs. */}
      {lines.length > 1 && (
        <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
          <h3 className="text-[15px] font-bold text-text-primary mb-1">Your businesses</h3>
          <p className="text-xs text-text-secondary mb-3">
            Each business is scored separately — a problem on one does not affect the others.
          </p>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.vendorType}
                className={`rounded-xl border p-3 ${l.suspended ? 'border-error/30 bg-error/5' : l.breached ? 'border-warning/30 bg-warning/5' : 'border-border-light bg-bg-primary'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text-primary truncate">{l.businessName || l.vendorType}</p>
                    <p className="text-[11px] text-text-secondary capitalize">{l.vendorType}</p>
                  </div>
                  <StatusBadge label={l.approvalStatus} tone={l.suspended ? 'error' : 'success'} />
                </div>
                <p className="text-[12px] text-text-primary mt-2">
                  <b>{l.points}</b> of {l.threshold} points · {l.count} record(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <SegmentedTabs
        activeKey={tab}
        onSelect={setTab}
        items={TABS.map((t) => ({
          key: t.key,
          label: t.key === 'updates' && updates.some((u) => !u.read)
            ? <span className="inline-flex items-center gap-1">{t.label}<span className="w-1.5 h-1.5 rounded-full bg-error" /></span>
            : t.label,
        }))}
      />

      {/* ── My record ── */}
      {tab === 'record' && (
        active.length === 0 && withdrawn.length === 0 ? (
          <Empty
            icon={ShieldCheck}
            title="Nothing on your record"
            body={`No service failures recorded in the last ${windowDays} days. Keep answering requests on time and completing bookings and it stays that way.`}
          />
        ) : (
          <div className="space-y-3">
            {active.map((v) => <ViolationCard key={v._id} v={v} />)}
            {withdrawn.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-text-secondary pt-3 pb-1 px-1">
                  Withdrawn after review — these no longer count
                </p>
                {withdrawn.map((v) => <ViolationCard key={v._id} v={v} withdrawn />)}
              </>
            )}
            <div className="flex items-start gap-2 p-3 bg-accent-teal/10 border border-accent-teal/25 rounded-xl mt-4">
              <LifeBuoy size={15} className="text-[#4C8684] mt-0.5 shrink-0" />
              <p className="text-[12px] text-text-primary">
                Think something here is wrong? Raise it through Support with the booking reference.
                An operator reviews every appeal and can withdraw a violation entirely.
              </p>
            </div>
          </div>
        )
      )}

      {/* ── Messages ── */}
      {tab === 'updates' && (
        updates.length === 0 ? (
          <Empty icon={Bell} title="No messages" body="Warnings, withdrawals and account changes appear here." />
        ) : (
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
            {updates.map((u) => {
              const style = UPDATE_STYLE[u.kind] || UPDATE_STYLE.compliance_warning;
              const Icon = style.icon;
              return (
                <div key={u.id} className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.tone}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-text-primary">{u.title}</p>
                      {!u.read && <span className="w-2 h-2 rounded-full bg-error mt-1.5 shrink-0" />}
                    </div>
                    <p className="text-[13px] text-text-primary mt-0.5">{u.body}</p>
                    <p className="text-[11px] text-text-secondary mt-1">
                      {new Date(u.createdAt).toLocaleString('en-IN')}
                      {u.vendorType && <span className="capitalize"> · {u.vendorType}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Rules ── */}
      {tab === 'rules' && policy && (
        <div className="space-y-4">
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
            <h3 className="text-[15px] font-bold text-text-primary mb-1">How this works</h3>
            <p className="text-[13px] text-text-primary leading-relaxed">
              Each service failure adds points to your record. Reach <b>{policy.threshold} points</b> inside
              a rolling <b>{policy.windowDays} days</b> and your account goes under review, which can end in
              suspension. Points older than {policy.windowDays} days stop counting on their own.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <Stat label="Respond to requests within" value={`${policy.sla?.vendorResponseHours ?? 2} hrs`} />
              <Stat label="Complete bookings within" value={`${policy.sla?.serviceCompletionGraceDays ?? 2} days of service`} />
              <Stat label="Dispatch orders within" value={`${policy.sla?.orderFulfilmentDays ?? 3} days`} />
              <Stat label="Last-minute cancel is" value={`under ${policy.sla?.lastMinuteCancelHours ?? 24} hrs`} />
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
            <div className="p-4 pb-3">
              <h3 className="text-[15px] font-bold text-text-primary">What each failure costs</h3>
              <p className="text-xs text-text-secondary mt-0.5">Only the rules currently in force are listed.</p>
            </div>
            <div className="divide-y divide-border-light">
              {policy.rules.map((r) => (
                <div key={r.type} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-text-primary">{r.label}</span>
                      <StatusBadge size="xs" label={r.severity} tone={SEVERITY_TONE[r.severity] || 'warning'} />
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">{r.description}</p>
                  </div>
                  <span className="text-[13px] font-black text-text-primary shrink-0 whitespace-nowrap">
                    +{r.points} {r.points === 1 ? 'point' : 'points'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-white border border-border-light rounded-xl">
            <Info size={15} className="text-text-secondary mt-0.5 shrink-0" />
            <p className="text-[12px] text-text-secondary">
              Points are fixed at the moment a failure is recorded. If Tail Circle changes these values later,
              anything already on your record keeps the points it was given.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── pieces ────────────────────────────────────────────────────────── */

function StandingCard({ points, threshold, remaining, windowDays, breached, suspended, count }) {
  const pct = Math.min(100, Math.round((points / Math.max(1, threshold)) * 100));
  const clear = points === 0;

  const tone = suspended || breached
    ? { bar: 'bg-error', ring: 'bg-error/10 text-error', head: 'text-error' }
    : remaining <= 1
      ? { bar: 'bg-warning', ring: 'bg-warning/15 text-warning', head: 'text-warning' }
      : clear
        ? { bar: 'bg-success', ring: 'bg-success/10 text-success', head: 'text-success' }
        : { bar: 'bg-warning', ring: 'bg-warning/10 text-warning', head: 'text-text-primary' };

  const Icon = clear ? ShieldCheck : ShieldAlert;

  return (
    <div className="bg-white rounded-[24px] border border-border-light shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone.ring}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-[17px] font-black ${tone.head}`}>
            {suspended
              ? 'Suspended'
              : breached
                ? 'Under review'
                : clear
                  ? 'Good standing'
                  : `${remaining} ${remaining === 1 ? 'point' : 'points'} before review`}
          </h2>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {clear
              ? `No service failures in the last ${windowDays} days.`
              : `${points} of ${threshold} points · ${count} record(s) in the last ${windowDays} days.`}
          </p>

          <div className="mt-3">
            <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.max(pct, clear ? 100 : 4)}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-text-secondary font-bold mt-1">
              <span>0</span>
              <span>{threshold} = review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViolationCard({ v, withdrawn = false }) {
  return (
    <div className={`bg-white rounded-[20px] border border-border-light shadow-sm p-4 ${withdrawn ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-text-primary mr-0.5">{v.label}</span>
            <StatusBadge size="xs" label={v.severity} tone={SEVERITY_TONE[v.severity] || 'warning'} />
            {withdrawn && <StatusBadge size="xs" label="withdrawn" tone="success" />}
            {v.status === 'upheld' && <StatusBadge size="xs" label="reviewed & upheld" tone="warning" />}
          </div>
          <p className="text-[13px] text-text-primary mt-1.5">{v.reason}</p>
          {v.detail && <p className="text-[12px] text-text-secondary mt-0.5">{v.detail}</p>}
          {v.customerImpact && !withdrawn && (
            <p className="text-[12px] text-error mt-1">What the customer experienced: {v.customerImpact}</p>
          )}
          <p className="text-[11px] text-text-secondary mt-2 flex items-center gap-1.5 flex-wrap">
            <Clock size={11} />
            {new Date(v.occurredAt).toLocaleString('en-IN')}
            {v.refLabel && <span>· {v.refLabel}</span>}
          </p>
          {v.reviewNote && (
            <p className="text-[12px] text-text-secondary mt-1.5 italic">
              Tail Circle: {v.reviewNote}
            </p>
          )}
        </div>
        <span className={`text-[14px] font-black shrink-0 whitespace-nowrap ${withdrawn ? 'text-text-disabled line-through' : 'text-text-primary'}`}>
          +{v.points} {v.points === 1 ? 'pt' : 'pts'}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-bg-primary border border-border-light rounded-2xl p-3">
      <p className="text-[11px] text-text-secondary font-medium leading-snug">{label}</p>
      <p className="text-[14px] font-black text-text-primary mt-1">{value}</p>
    </div>
  );
}

function Empty({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-[20px] border border-border-light py-10 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-3">
        <Icon size={24} />
      </div>
      <p className="text-[15px] font-bold text-text-primary">{title}</p>
      <p className="text-[13px] text-text-secondary mt-1 max-w-[300px] mx-auto leading-relaxed">{body}</p>
    </div>
  );
}

export default VendorCompliancePage;
