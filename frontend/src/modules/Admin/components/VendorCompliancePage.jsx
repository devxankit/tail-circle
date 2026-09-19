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

const SEVERITY_STYLE = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
};

const UPDATE_STYLE = {
  compliance_warning: { icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50' },
  compliance_forgiven: { icon: Check, tone: 'text-emerald-600 bg-emerald-50' },
  suspended: { icon: Ban, tone: 'text-red-600 bg-red-50' },
  reinstated: { icon: RotateCcw, tone: 'text-emerald-600 bg-emerald-50' },
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
    return <div className="p-6 text-[13px] text-gray-500">Loading your service record…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-800">{error}</div>
      </div>
    );
  }

  const { points = 0, threshold = 3, remaining = 0, windowDays = 90, breached, violations = [], profile, lines = [] } = standing || {};
  const active = violations.filter((v) => v.status !== 'forgiven');
  const withdrawn = violations.filter((v) => v.status === 'forgiven');
  const suspended = profile?.suspended;

  return (
    <div className="max-w-[1100px] mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Service Standing</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Your record with Tail Circle, the messages we have sent you, and the rules we all work to.
        </p>
      </div>

      {/* Suspension notice trumps everything else on the page. */}
      {suspended && (
        <div className="mb-5 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Ban size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-red-900">
                {profile.businessName || 'This business'} is suspended
              </h2>
              <p className="text-[13px] text-red-800 mt-1">
                You are not receiving new bookings or orders on your {profile.vendorType} business.
                Any work you already accepted still needs to be delivered.
              </p>
              <p className="text-[13px] text-red-800 mt-2">
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
        <div className="mt-5 bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-[14px] font-bold text-gray-900 mb-1">Your businesses</h3>
          <p className="text-[12px] text-gray-500 mb-3">
            Each business is scored separately — a problem on one does not affect the others.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lines.map((l) => (
              <div key={l.vendorType}
                className={`rounded-lg border p-3 ${l.suspended ? 'border-red-200 bg-red-50' : l.breached ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{l.businessName || l.vendorType}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{l.vendorType}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize shrink-0 ${
                    l.suspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {l.approvalStatus}
                  </span>
                </div>
                <p className="text-[12px] text-gray-600 mt-2">
                  <b>{l.points}</b> of {l.threshold} points · {l.count} record(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-4 bg-white p-1 rounded-xl border border-gray-200 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-lg transition ${
              tab === key ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={15} /> {label}
            {key === 'updates' && updates.some((u) => !u.read) && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

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
                <p className="text-[12px] font-bold text-gray-500 pt-3 pb-1">
                  Withdrawn after review — these no longer count
                </p>
                {withdrawn.map((v) => <ViolationCard key={v._id} v={v} withdrawn />)}
              </>
            )}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <LifeBuoy size={15} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-blue-800">
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
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {updates.map((u) => {
              const style = UPDATE_STYLE[u.kind] || UPDATE_STYLE.compliance_warning;
              const Icon = style.icon;
              return (
                <div key={u.id} className="p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.tone}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-gray-900">{u.title}</p>
                      {!u.read && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />}
                    </div>
                    <p className="text-[13px] text-gray-600 mt-0.5">{u.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">How this works</h3>
            <p className="text-[13px] text-gray-600">
              Each service failure adds points to your record. Reach <b>{policy.threshold} points</b> inside
              a rolling <b>{policy.windowDays} days</b> and your account goes under review, which can end in
              suspension. Points older than {policy.windowDays} days stop counting on their own.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Stat label="Respond to requests within" value={`${policy.sla?.vendorResponseHours ?? 2} hrs`} />
              <Stat label="Complete bookings within" value={`${policy.sla?.serviceCompletionGraceDays ?? 2} days of service`} />
              <Stat label="Dispatch orders within" value={`${policy.sla?.orderFulfilmentDays ?? 3} days`} />
              <Stat label="Last-minute cancel is" value={`under ${policy.sla?.lastMinuteCancelHours ?? 24} hrs`} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-[15px] font-bold text-gray-900">What each failure costs</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Only the rules currently in force are listed.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {policy.rules.map((r) => (
                <div key={r.type} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-gray-900">{r.label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.medium}`}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-0.5">{r.description}</p>
                  </div>
                  <span className="text-[13px] font-bold text-gray-700 shrink-0 whitespace-nowrap">
                    +{r.points} {r.points === 1 ? 'point' : 'points'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Info size={15} className="text-gray-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-gray-600">
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
    ? { bar: 'bg-red-500', ring: 'bg-red-50 text-red-600', head: 'text-red-900' }
    : remaining <= 1
      ? { bar: 'bg-orange-500', ring: 'bg-orange-50 text-orange-600', head: 'text-orange-900' }
      : clear
        ? { bar: 'bg-emerald-500', ring: 'bg-emerald-50 text-emerald-600', head: 'text-emerald-900' }
        : { bar: 'bg-amber-500', ring: 'bg-amber-50 text-amber-600', head: 'text-amber-900' };

  const Icon = clear ? ShieldCheck : ShieldAlert;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone.ring}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-[16px] font-bold ${tone.head}`}>
            {suspended
              ? 'Suspended'
              : breached
                ? 'Under review'
                : clear
                  ? 'Good standing'
                  : `${remaining} ${remaining === 1 ? 'point' : 'points'} before review`}
          </h2>
          <p className="text-[13px] text-gray-600 mt-0.5">
            {clear
              ? `No service failures in the last ${windowDays} days.`
              : `${points} of ${threshold} points · ${count} record(s) in the last ${windowDays} days.`}
          </p>

          <div className="mt-3">
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.max(pct, clear ? 100 : 4)}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-bold mt-1">
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
    <div className={`bg-white rounded-xl border p-4 ${withdrawn ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-gray-900">{v.label}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_STYLE[v.severity] || SEVERITY_STYLE.medium}`}>
              {v.severity}
            </span>
            {withdrawn && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                withdrawn
              </span>
            )}
            {v.status === 'upheld' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700">
                reviewed &amp; upheld
              </span>
            )}
          </div>
          <p className="text-[13px] text-gray-700 mt-1">{v.reason}</p>
          {v.detail && <p className="text-[12px] text-gray-500 mt-0.5">{v.detail}</p>}
          {v.customerImpact && !withdrawn && (
            <p className="text-[12px] text-red-600 mt-1">What the customer experienced: {v.customerImpact}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
            <Clock size={11} />
            {new Date(v.occurredAt).toLocaleString('en-IN')}
            {v.refLabel && <span>· {v.refLabel}</span>}
          </p>
          {v.reviewNote && (
            <p className="text-[12px] text-gray-600 mt-1.5 italic">
              Tail Circle: {v.reviewNote}
            </p>
          )}
        </div>
        <span className={`text-[13px] font-bold shrink-0 whitespace-nowrap ${withdrawn ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
          +{v.points} {v.points === 1 ? 'pt' : 'pts'}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[11px] text-gray-500 font-medium">{label}</p>
      <p className="text-[13px] font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function Empty({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <Icon size={20} />
      </div>
      <p className="text-[14px] font-bold text-gray-800">{title}</p>
      <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}

export default VendorCompliancePage;
