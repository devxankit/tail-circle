import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { fetchVendorCompliance, acknowledgeVendorCompliance } from '../../../services/providerVendor';

/**
 * The partner's own service record, shown at the top of their panel.
 *
 * A partner can now be suspended for repeated failures, so the warning has to
 * reach them BEFORE that happens and has to be specific: which booking, what
 * went wrong, how many points it cost and how many they have left. A vague
 * "your rating is low" changes nothing — this is the screen that has to make a
 * partner answer their next request on time.
 *
 * Dismissal is per-session rather than permanent: a partner who is one strike
 * from suspension should see it again next time they open the panel.
 */
/**
 * Where the compliance page lives in the panel the partner currently has open.
 *
 * Each standalone panel mounts the page under its own base path so it appears
 * inside that panel's navigation rather than bouncing the partner out to a
 * different shell mid-task.
 */
function compliancePathFor(pathname) {
  const bases = [
    '/vendor/shop-provider',
    '/vendor/meal-provider',
    '/vendor/events-organizer',
    '/vendor/memorial-provider',
  ];
  const base = bases.find((b) => pathname.startsWith(b));
  return base ? `${base}/compliance` : '/vendor/compliance';
}

export function VendorComplianceBanner() {
  const { pathname } = useLocation();
  const [standing, setStanding] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchVendorCompliance()
      .then((data) => { if (alive) setStanding(data); })
      .catch(() => {/* a missing standing must never break the panel */});
    return () => { alive = false; };
  }, []);

  if (!standing || dismissed || !standing.warning) return null;
  if (pathname.endsWith('/compliance')) return null;

  const { breached, points, threshold, remaining, windowDays, violations = [], unacknowledgedCount } = standing;
  const active = violations.filter((v) => v.status !== 'forgiven');

  const acknowledge = async () => {
    setAcknowledging(true);
    try {
      await acknowledgeVendorCompliance();
      setStanding((s) => ({ ...s, unacknowledgedCount: 0 }));
    } catch {
      /* acknowledgement is a courtesy, not a gate */
    } finally {
      setAcknowledging(false);
    }
  };

  const tone = breached
    ? { wrap: 'bg-red-50 border-red-300', icon: 'bg-red-100 text-red-600', head: 'text-red-900', body: 'text-red-800', bar: 'bg-red-500' }
    : remaining <= 1
      ? { wrap: 'bg-orange-50 border-orange-300', icon: 'bg-orange-100 text-orange-600', head: 'text-orange-900', body: 'text-orange-800', bar: 'bg-orange-500' }
      : { wrap: 'bg-amber-50 border-amber-300', icon: 'bg-amber-100 text-amber-600', head: 'text-amber-900', body: 'text-amber-800', bar: 'bg-amber-500' };

  const Icon = breached ? ShieldAlert : AlertTriangle;
  const pct = Math.min(100, Math.round((points / Math.max(1, threshold)) * 100));

  return (
    <div className={`mx-3 sm:mx-6 mt-4 rounded-xl border-2 ${tone.wrap} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone.icon}`}>
            <Icon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className={`text-[14px] font-bold ${tone.head}`}>
                {breached ? 'Your account is under review' : 'Service warning'}
              </h3>
              {!breached && (
                <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-black/5 shrink-0" title="Hide for now">
                  <X size={15} className={tone.body} />
                </button>
              )}
            </div>

            <p className={`text-[13px] mt-1 ${tone.body}`}>{standing.warning}</p>

            {/* Progress toward the limit, so the consequence is concrete. */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span className={tone.body}>{points} of {threshold} points · last {windowDays} days</span>
                {!breached && <span className={tone.body}>{remaining} before review</span>}
              </div>
              <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {active.length > 0 && (
                <button onClick={() => setExpanded((e) => !e)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/70 hover:bg-white ${tone.body}`}>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expanded ? 'Hide details' : `See what was recorded (${active.length})`}
                </button>
              )}
              {unacknowledgedCount > 0 && (
                <button onClick={acknowledge} disabled={acknowledging}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/70 hover:bg-white text-gray-700 disabled:opacity-50">
                  <Check size={14} /> I understand
                </button>
              )}
              <Link to={compliancePathFor(pathname)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/70 hover:bg-white ${tone.body}`}>
                Open Service Standing
              </Link>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 ml-12 space-y-2">
            {active.map((v) => (
              <div key={v._id} className="bg-white/80 rounded-lg p-3 border border-black/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-gray-900">{v.label}</p>
                    <p className="text-[12px] text-gray-600 mt-0.5">{v.reason}</p>
                    {v.refLabel && <p className="text-[11px] text-gray-400 mt-0.5">{v.refLabel}</p>}
                    {v.detail && <p className="text-[11px] text-gray-500 mt-0.5">{v.detail}</p>}
                  </div>
                  <span className="text-[12px] font-bold text-gray-700 shrink-0">+{v.points} pt</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {new Date(v.occurredAt).toLocaleString('en-IN')}
                  {v.status === 'upheld' && ' · reviewed and upheld'}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-gray-500 pt-1">
              Think one of these is wrong? Raise it through Support and an operator will review it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorComplianceBanner;
