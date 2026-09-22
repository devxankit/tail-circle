import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, Check, X, RefreshCw, Settings2, Ban,
  RotateCcw, Search, ChevronRight, Scale, Clock, Save,
} from 'lucide-react';
import {
  fetchComplianceSummary, fetchComplianceVendors, fetchComplianceViolations,
  forgiveComplianceViolation, upholdComplianceViolation, fetchCompliancePolicy,
  updateCompliancePolicy, suspendVendorLine, reinstateVendorLine, runComplianceSweep,
} from '../../../../../services/admin';

/**
 * Partner compliance control.
 *
 * Three jobs on one screen, because they are one decision: who is failing
 * customers, what exactly did they do, and what are the rules we are holding
 * them to. Splitting these across separate pages would mean an operator judging
 * a suspension without the policy in front of them.
 */

const SEVERITY_STYLE = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
};

const STATUS_STYLE = {
  active: 'bg-red-50 text-red-700 border-red-200',
  upheld: 'bg-orange-50 text-orange-700 border-orange-200',
  forgiven: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TABS = [
  { key: 'vendors', label: 'At-risk partners', icon: ShieldAlert },
  { key: 'violations', label: 'Violation log', icon: AlertTriangle },
  { key: 'policy', label: 'Rules & policy', icon: Settings2 },
];

export function VendorCompliance() {
  const [tab, setTab] = useState('vendors');
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState({ rows: [], threshold: 3, windowDays: 90 });
  const [violations, setViolations] = useState({ rows: [], total: 0 });
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, v, l, p] = await Promise.all([
        fetchComplianceSummary(),
        fetchComplianceVendors({ limit: 100 }),
        fetchComplianceViolations({ status: statusFilter, limit: 100 }),
        fetchCompliancePolicy(),
      ]);
      setSummary(s);
      setVendors(v);
      setViolations(l);
      setPolicy(p);
    } catch (err) {
      notify(err?.message || 'Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      notify(successMsg);
      await load();
    } catch (err) {
      notify(err?.message || 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onForgive = (v) => {
    const note = window.prompt(`Withdraw this violation against ${v.vendorName}?\n\n"${v.reason}"\n\nReason for withdrawing:`);
    if (note === null) return;
    act(() => forgiveComplianceViolation(v._id, note), 'Violation withdrawn');
  };

  const onUphold = (v) => {
    const note = window.prompt(`Uphold this violation after review?\n\n"${v.reason}"\n\nReview note:`);
    if (note === null) return;
    act(() => upholdComplianceViolation(v._id, note), 'Violation upheld');
  };

  const onSuspend = (row) => {
    if (!row.vendorProfileId) return notify('No business-line record for this partner', 'error');
    const reason = window.prompt(
      `Suspend ${row.businessName} (${row.vendorType})?\n\nThey will stop receiving new work immediately. Their other business lines are unaffected.\n\nReason (sent to the partner):`
    );
    if (!reason) return;
    act(() => suspendVendorLine(row.vendorProfileId, reason), `${row.businessName} suspended`);
  };

  const onReinstate = (row) => {
    if (!row.vendorProfileId) return notify('No business-line record for this partner', 'error');
    const reason = window.prompt(`Reinstate ${row.businessName} (${row.vendorType})?\n\nReason:`);
    if (!reason) return;
    const forgiveAll = window.confirm(
      'Clear their existing violations too?\n\nOK  = clear the slate (recommended — otherwise the next violation re-trips them immediately)\nCancel = reinstate but keep the record'
    );
    act(() => reinstateVendorLine(row.vendorProfileId, reason, forgiveAll), `${row.businessName} reinstated`);
  };

  const filteredVendors = vendors.rows.filter(
    (r) => !search || r.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3 max-w-md">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {toast.type === 'error' ? <X size={14} /> : <Check size={14} />}
            </div>
            <p className="text-[13px] font-bold text-gray-800">{toast.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Partner Compliance</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Service failures, the rules that score them, and who is at risk of suspension
          </p>
        </div>
        <button
          onClick={() => act(runComplianceSweep, 'Detection sweep complete')}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition shadow-sm"
        >
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Run detection sweep
        </button>
      </div>

      {/* Summary tiles */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Tile label="Partners over limit" value={summary.breachedLines} tone="red" icon={Ban} />
          <Tile label="One strike from review" value={summary.atRiskLines} tone="amber" icon={AlertTriangle} />
          <Tile label="Active violations" value={summary.activeViolations} tone="orange" icon={ShieldAlert} />
          <Tile label="Awaiting review" value={summary.unreviewedViolations} tone="blue" icon={Clock} />
          <Tile label="Withdrawn" value={summary.forgivenViolations} tone="emerald" icon={Check} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white p-1 rounded-xl border border-gray-200 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-lg transition ${
              tab === key ? 'bg-[#66B4B1] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-[13px] text-gray-500">Loading…</p>}

      {/* ── At-risk partners ── */}
      {!loading && tab === 'vendors' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search partner…"
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/30"
              />
            </div>
            <p className="text-[12px] text-gray-500">
              Limit: <b>{vendors.threshold} points</b> over {vendors.windowDays} days
            </p>
          </div>

          {filteredVendors.length === 0 ? (
            <EmptyState
              icon={Check}
              title="No partner has a violation on record"
              body="Nothing has been flagged in the current window. Violations appear here automatically as the detection sweeps find them."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <Th>Partner</Th><Th>Line</Th><Th>Points</Th><Th>Headroom</Th>
                    <Th>Violations</Th><Th>Last</Th><Th>Status</Th><Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((r) => (
                    <tr key={`${r.vendorId}:${r.vendorType}`} className="border-t border-gray-100 hover:bg-gray-50/60">
                      <Td><span className="font-bold text-gray-900">{r.businessName}</span></Td>
                      <Td><span className="capitalize text-gray-600">{r.vendorType || '—'}</span></Td>
                      <Td>
                        <span className={`font-bold ${r.breached ? 'text-red-600' : 'text-gray-800'}`}>
                          {r.points}/{r.threshold}
                        </span>
                      </Td>
                      <Td>
                        {r.breached
                          ? <span className="text-red-600 font-bold">Over limit</span>
                          : <span className="text-gray-600">{r.remaining} left</span>}
                      </Td>
                      <Td>{r.count}</Td>
                      <Td className="text-gray-500">
                        {r.lastViolationAt ? new Date(r.lastViolationAt).toLocaleDateString('en-IN') : '—'}
                      </Td>
                      <Td>
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize ${
                          r.approvalStatus === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {r.approvalStatus}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          {r.approvalStatus === 'suspended' ? (
                            <button onClick={() => onReinstate(r)} disabled={busy}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-[12px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                              <RotateCcw size={13} /> Reinstate
                            </button>
                          ) : (
                            <button onClick={() => onSuspend(r)} disabled={busy}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-md text-[12px] font-bold hover:bg-red-100 disabled:opacity-50">
                              <Ban size={13} /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => { setStatusFilter('All'); setTab('violations'); setSearch(r.businessName); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-md text-[12px] font-bold hover:bg-gray-200">
                            View <ChevronRight size={13} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Violation log ── */}
      {!loading && tab === 'violations' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="upheld">Upheld</option>
              <option value="forgiven">Withdrawn</option>
              <option value="All">All</option>
            </select>
            <p className="text-[12px] text-gray-500">{violations.total} record(s)</p>
          </div>

          {violations.rows.length === 0 ? (
            <EmptyState icon={Check} title="No violations recorded" body="Nothing matches this filter." />
          ) : (
            <div className="divide-y divide-gray-100">
              {violations.rows.map((v) => (
                <div key={v._id} className="p-4 hover:bg-gray-50/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${SEVERITY_STYLE[v.severity] || SEVERITY_STYLE.medium}`}>
                          {v.severity}
                        </span>
                        <span className="font-bold text-gray-900 text-[14px]">{v.label}</span>
                        <span className="text-[12px] text-gray-500">+{v.points} pt</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${STATUS_STYLE[v.status]}`}>
                          {v.status === 'forgiven' ? 'withdrawn' : v.status}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 mt-1.5">
                        <b>{v.vendorName}</b>
                        {v.vendorType && <span className="capitalize text-gray-500"> · {v.vendorType}</span>}
                        {v.refLabel && <span className="text-gray-500"> · {v.refLabel}</span>}
                      </p>
                      <p className="text-[13px] text-gray-600 mt-1">{v.reason}</p>
                      {v.customerImpact && (
                        <p className="text-[12px] text-red-600 mt-1">Customer impact: {v.customerImpact}</p>
                      )}
                      {v.detail && <p className="text-[12px] text-gray-500 mt-1">{v.detail}</p>}
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {new Date(v.occurredAt).toLocaleString('en-IN')} · detected by {v.raisedByName}
                        {v.reviewedByName && ` · reviewed by ${v.reviewedByName}`}
                        {!v.acknowledgedAt && v.status !== 'forgiven' && ' · partner has not opened this yet'}
                      </p>
                      {v.reviewNote && (
                        <p className="text-[12px] text-gray-600 mt-1 italic">Note: {v.reviewNote}</p>
                      )}
                    </div>
                    {v.status === 'active' && (
                      <div className="flex gap-2">
                        <button onClick={() => onUphold(v)} disabled={busy}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-md text-[12px] font-bold hover:bg-orange-100 disabled:opacity-50">
                          <Scale size={13} /> Uphold
                        </button>
                        <button onClick={() => onForgive(v)} disabled={busy}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-[12px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                          <Check size={13} /> Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Policy ── */}
      {!loading && tab === 'policy' && policy && (
        <PolicyEditor
          policy={policy}
          busy={busy}
          onSave={(patch) => act(() => updateCompliancePolicy(patch), 'Policy updated')}
        />
      )}
    </div>
  );
}

/**
 * The knobs an operator controls.
 *
 * Kept on one form with the rule weights visible, because "how many violations
 * are allowed" is meaningless without knowing what each one is worth — three
 * strikes means something different if a no-show costs three points.
 */
function PolicyEditor({ policy, busy, onSave }) {
  const [draft, setDraft] = useState(policy);
  useEffect(() => setDraft(policy), [policy]);

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setSla = (k, v) => setDraft((d) => ({ ...d, sla: { ...d.sla, [k]: v } }));
  const setRule = (type, patch) =>
    setDraft((d) => ({ ...d, rules: d.rules.map((r) => (r.type === type ? { ...r, ...patch } : r)) }));

  const save = () =>
    onSave({
      threshold: Number(draft.threshold),
      windowDays: Number(draft.windowDays),
      actionAtThreshold: draft.actionAtThreshold,
      warnAtPoints: Number(draft.warnAtPoints),
      ...(draft.enforcementStartsAt
        ? { enforcementStartsAt: new Date(draft.enforcementStartsAt).toISOString() }
        : {}),
      sla: {
        vendorResponseHours: Number(draft.sla.vendorResponseHours),
        serviceCompletionGraceDays: Number(draft.sla.serviceCompletionGraceDays),
        orderFulfilmentDays: Number(draft.sla.orderFulfilmentDays),
        lastMinuteCancelHours: Number(draft.sla.lastMinuteCancelHours),
      },
      rules: draft.rules.map((r) => ({ type: r.type, points: Number(r.points), enabled: r.enabled })),
    });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[15px] font-bold text-gray-900 mb-1">Suspension threshold</h2>
        <p className="text-[12px] text-gray-500 mb-4">
          How much a partner can accumulate before they are flagged. Changing these applies immediately;
          violations already recorded keep the points they were originally scored at.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Points allowed" hint="Most violations are worth 1">
            <input type="number" min={1} max={100} value={draft.threshold}
              onChange={(e) => setField('threshold', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Counting window (days)" hint="Older violations stop counting">
            <input type="number" min={1} max={730} value={draft.windowDays}
              onChange={(e) => setField('windowDays', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Warn partner at" hint="Points before they see a warning">
            <input type="number" min={0} value={draft.warnAtPoints}
              onChange={(e) => setField('warnAtPoints', e.target.value)} className={inputCls} />
          </Field>
          <Field label="At the limit" hint="Flag keeps them trading until you decide">
            <select value={draft.actionAtThreshold} onChange={(e) => setField('actionAtThreshold', e.target.value)} className={inputCls}>
              <option value="flag">Flag for my approval</option>
              <option value="suspend">Suspend automatically</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Enforce from"
              hint="Nothing before this date is ever scored"
            >
              <input
                type="date"
                value={draft.enforcementStartsAt ? String(draft.enforcementStartsAt).slice(0, 10) : ''}
                onChange={(e) => setField('enforcementStartsAt', e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle size={15} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-blue-800">
                Protects partners from being penalised for anything that happened before the rules
                existed. Move it forward to give partners a grace period after you announce a change.
              </p>
            </div>
          </div>
        </div>

        {draft.actionAtThreshold === 'suspend' && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-800">
              Partners will be suspended without a human looking first. Sensible once supply is deep;
              risky at launch, where one bad week could take a good partner offline.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[15px] font-bold text-gray-900 mb-1">Service-level clocks</h2>
        <p className="text-[12px] text-gray-500 mb-4">
          What the automatic detection measures against. These decide when a partner is counted as having failed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Respond within (hours)" hint="Then the booking auto-declines">
            <input type="number" min={1} max={168} value={draft.sla.vendorResponseHours}
              onChange={(e) => setSla('vendorResponseHours', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Service grace (days)" hint="After the service date">
            <input type="number" min={0} max={30} value={draft.sla.serviceCompletionGraceDays}
              onChange={(e) => setSla('serviceCompletionGraceDays', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Dispatch within (days)" hint="Shop orders">
            <input type="number" min={1} max={60} value={draft.sla.orderFulfilmentDays}
              onChange={(e) => setSla('orderFulfilmentDays', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Last-minute cancel (hours)" hint="Scored harder inside this">
            <input type="number" min={1} max={168} value={draft.sla.lastMinuteCancelHours}
              onChange={(e) => setSla('lastMinuteCancelHours', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-[15px] font-bold text-gray-900 mb-1">What each failure costs</h2>
          <p className="text-[12px] text-gray-500">
            Switch a rule off to stop counting it entirely. Auto-detected rules are found by the sweep;
            the rest are recorded by hand from a booking or a complaint.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {draft.rules.map((r) => (
            <div key={r.type} className="px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[260px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-[13px]">{r.label}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_STYLE[r.severity]}`}>
                    {r.severity}
                  </span>
                  {r.autoDetected && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">auto</span>
                  )}
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">{r.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] text-gray-600">
                  Points
                  <input type="number" min={0} max={100} value={r.points} disabled={!r.enabled}
                    onChange={(e) => setRule(r.type, { points: e.target.value })}
                    className="w-16 px-2 py-1.5 text-[13px] border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-400" />
                </label>
                <button onClick={() => setRule(r.type, { enabled: !r.enabled })}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-bold ${
                    r.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.enabled ? 'Counting' : 'Off'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#66B4B1] hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm">
          <Save size={16} /> Save policy
        </button>
        {policy.updatedByName && (
          <p className="text-[12px] text-gray-500">
            Last changed by {policy.updatedByName}
            {policy.updatedAt && ` on ${new Date(policy.updatedAt).toLocaleDateString('en-IN')}`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── small presentational helpers ──────────────────────────────────── */

const inputCls =
  'w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/30';

const TONE = {
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600', blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function Tile({ label, value, tone, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-500 font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TONE[tone]}`}><Icon size={14} /></div>
      </div>
      <p className="text-[24px] font-bold text-gray-900 mt-1.5">{value}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <Icon size={20} />
      </div>
      <p className="text-[14px] font-bold text-gray-800">{title}</p>
      <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}

const Th = ({ children }) => (
  <th className="text-left px-4 py-3 font-bold text-[12px] uppercase tracking-wide">{children}</th>
);
const Td = ({ children, className = '' }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;

export default VendorCompliance;
