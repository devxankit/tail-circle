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

  // Semantic tokens, not red/orange/amber: the app remaps those palettes to
  // coral, which would make all three levels look the same.
  const tone = breached
    ? { wrap: 'bg-white border-error/40', icon: 'bg-error/10 text-error', head: 'text-error', body: 'text-text-primary', bar: 'bg-error' }
    : remaining <= 1
      ? { wrap: 'bg-white border-warning/50', icon: 'bg-warning/15 text-warning', head: 'text-warning', body: 'text-text-primary', bar: 'bg-warning' }
      : { wrap: 'bg-white border-warning/30', icon: 'bg-warning/10 text-warning', head: 'text-text-primary', body: 'text-text-secondary', bar: 'bg-warning' };

  const Icon = breached ? ShieldAlert : AlertTriangle;
  const pct = Math.min(100, Math.round((points / Math.max(1, threshold)) * 100));

  return (
    <div className={`rounded-[20px] border-2 shadow-sm ${tone.wrap} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone.icon}`}>
            <Icon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className={`text-[14px] font-bold ${tone.head}`}>
                {breached ? 'Your account is under review' : 'Service warning'}
              </h3>
              {!breached && (
                <button onClick={() => setDismissed(true)} className="-mr-1 -mt-1 min-h-[36px] px-2 rounded-lg flex items-center gap-1 text-[12px] font-bold shrink-0 text-text-secondary active:bg-black/5" aria-label="Hide for now">
                  <X size={15} /> Hide
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
                  className={`min-h-[40px] flex items-center gap-1 px-3 rounded-xl text-[12px] font-bold bg-bg-primary border border-border-light ${tone.body}`}>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expanded ? 'Hide details' : `See what was recorded (${active.length})`}
                </button>
              )}
              {unacknowledgedCount > 0 && (
                <button onClick={acknowledge} disabled={acknowledging}
                  className="min-h-[40px] flex items-center gap-1 px-3 rounded-xl text-[12px] font-bold bg-bg-primary border border-border-light text-text-primary disabled:opacity-50">
                  <Check size={14} /> I understand
                </button>
              )}
              <Link to={compliancePathFor(pathname)}
                className={`min-h-[40px] flex items-center px-3 rounded-xl text-[12px] font-bold bg-bg-primary border border-border-light ${tone.body}`}>
                Open Service Standing
              </Link>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2">
            {active.map((v) => (
              <div key={v._id} className="bg-bg-primary rounded-xl p-3 border border-border-light">
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
