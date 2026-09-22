import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Heart, Crown, Clock, Calendar, Info, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlanCard } from './LikeLimitSheet';
import {
  fetchMySubscription,
  fetchSubscriptionHistory,
  purchasePlan,
  cancelSubscription,
  describeLimit,
  timeUntil,
  daysUntil,
} from '../../../../services/subscriptions';

/**
 * "My Subscription" — the whole picture in one screen.
 *
 * Top: what the user has right now and how much of it is left, because that is
 * the question they came to answer. Below: what they could have instead, and
 * only then the receipts. A free user sees the same layout, with their daily
 * allowance in the ring — the screen is not a paywall wearing a settings hat.
 */
export function MySubscription() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const [me, hist] = await Promise.all([
        fetchMySubscription(),
        fetchSubscriptionHistory().catch(() => []),
      ]);
      setState(me);
      setHistory(hist);
    } catch {
      setError('Could not load your subscription.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buy = async (plan) => {
    setBuyingId(plan.id);
    setError('');
    try {
      const res = await purchasePlan(plan);
      setState(res);
      setHistory(await fetchSubscriptionHistory().catch(() => history));
      setToast(`${plan.name} is active. Happy swiping!`);
      setTimeout(() => setToast(''), 3500);
    } catch (err) {
      if (err?.message !== 'Payment cancelled') {
        setError(err?.message || 'Payment could not be completed');
      }
    } finally {
      setBuyingId(null);
    }
  };

  const stopRenewal = async () => {
    try {
      await cancelSubscription();
      await load();
      setToast('Renewal turned off. Your plan runs to its end date.');
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setError(err?.message || 'Could not update renewal');
    }
  };

  const ent = state?.entitlement;
  const current = state?.current;
  const accent = ent?.accentColor || '#599D9A';

  // What is worth showing below the fold: anything the user is not already on.
  const upgrades = (state?.plans || []).filter(
    (p) => !p.isDefault && p.id !== current?.planId
  );

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">My Subscription</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-20 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
          <>
            {ent && <UsageCard entitlement={ent} current={current} accent={accent} />}

            {current && !current.cancelledAt && current.expiresAt && (
              <button
                onClick={stopRenewal}
                className="mt-2 w-full text-[12px] font-bold text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                Turn off renewal reminders
              </button>
            )}

            {upgrades.length > 0 && (
              <section className="mt-6">
                <h2 className="text-[13px] font-extrabold text-text-primary uppercase tracking-wide mb-3">
                  {current ? 'Change your plan' : 'Get more likes'}
                </h2>
                <div className="space-y-3">
                  {upgrades.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      busy={buyingId === plan.id}
                      disabled={Boolean(buyingId)}
                      onSelect={() => buy(plan)}
                    />
                  ))}
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-gray-400 leading-relaxed">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  Buying the plan you already have adds its days to your current
                  end date. Moving up a tier starts the new plan straight away.
                </p>
              </section>
            )}

            {error && (
              <p className="mt-4 text-center text-[12.5px] text-red-600 font-semibold">{error}</p>
            )}

            {history.length > 0 && (
              <section className="mt-7">
                <h2 className="text-[13px] font-extrabold text-text-primary uppercase tracking-wide mb-3">
                  History
                </h2>
                <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
                  {history.map((h, i) => (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between px-4 py-3 ${i ? 'border-t border-border-light/60' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-text-primary truncate">
                          {h.planName}
                          {h.grantedByAdmin && (
                            <span className="ml-1.5 text-[10px] font-extrabold text-emerald-600">
                              GIFTED
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {h.startsAt ? new Date(h.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {h.expiresAt
                            ? ` → ${new Date(h.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[13px] font-extrabold text-text-primary">
                          {h.priceInr > 0 ? `₹${h.priceInr}` : 'Free'}
                        </p>
                        <StatusPill status={h.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[12.5px] font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

/**
 * The allowance, as a ring.
 *
 * A ring rather than a bar because the number that matters is what is LEFT, and
 * a ring reads as a budget rather than as progress toward something good.
 */
function UsageCard({ entitlement, current, accent }) {
  const { unlimited, limit, used, remaining, limitPeriod } = entitlement;
  const pct = unlimited || !limit ? 1 : Math.min(1, used / limit);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const daysLeft = daysUntil(current?.expiresAt);
  const resetIn = timeUntil(entitlement.resetsAt);

  return (
    <div
      className="rounded-3xl p-5 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -28)})` }}
    >
      <div className="flex items-center gap-2">
        {unlimited ? <Crown size={17} /> : <Heart size={16} fill="white" />}
        <span className="text-[12px] font-extrabold uppercase tracking-wider opacity-90">
          {entitlement.planName} plan
        </span>
        {current?.cancelledAt && (
          <span className="ml-auto text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
            RENEWAL OFF
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 mt-4">
        <div className="relative w-[104px] h-[104px] shrink-0">
          <svg viewBox="0 0 104 104" className="w-full h-full -rotate-90">
            <circle cx="52" cy="52" r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="white"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (unlimited ? 1 : 1 - pct))}
              style={{ transition: 'stroke-dashoffset 500ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {unlimited ? (
              <Crown size={30} />
            ) : (
              <>
                <span className="text-[26px] font-black leading-none">{remaining}</span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">of {limit} left</span>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-[15px] font-extrabold leading-snug">
            {unlimited
              ? 'Like as much as you want'
              : remaining > 0
                ? `${remaining} ${remaining === 1 ? 'like' : 'likes'} left ${limitPeriod === 'day' ? 'today' : 'on this plan'}`
                : 'You are out of likes'}
          </p>

          {!unlimited && limitPeriod === 'day' && resetIn && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold opacity-90">
              <Clock size={13} /> Resets in {resetIn}
            </p>
          )}

          {current?.expiresAt && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold opacity-90">
              <Calendar size={13} />
              {daysLeft === 0
                ? 'Ends today'
                : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of ${current.planName} left`}
            </p>
          )}

          {!current && (
            <p className="text-[11.5px] font-semibold opacity-80 leading-relaxed">
              {describeLimit({
                unlimited,
                likeLimit: limit,
                limitPeriod,
              })}{' '}
              on the free plan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    active: ['Active', 'text-emerald-600'],
    expired: ['Expired', 'text-gray-400'],
    cancelled: ['Cancelled', 'text-red-500'],
    superseded: ['Upgraded', 'text-indigo-500'],
  };
  const [label, tone] = map[status] || [status, 'text-gray-400'];
  return <p className={`text-[10.5px] font-extrabold uppercase mt-0.5 ${tone}`}>{label}</p>;
}

/**
 * Darken a hex colour for the card gradient, so an admin can pick any accent
 * for a plan and still get a gradient rather than a flat block.
 */
function shade(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const [r, g, b] = [1, 2, 3].map((i) => clamp(parseInt(m[i], 16) + amount));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
