import React, { useEffect, useState } from 'react';
import { X, Heart, Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  fetchMySubscription,
  purchasePlan,
  describeLimit,
  timeUntil,
} from '../../../../services/subscriptions';

/**
 * The paywall.
 *
 * Opens the moment a like is refused for want of allowance, so it has to be
 * legible in the half-second after a tap the user expected to work: it leads
 * with what just happened, then with when the free allowance comes back, and
 * only then asks for money. Somebody who does not want to pay can wait for
 * midnight, and the sheet says so rather than hiding it.
 */
export function LikeLimitSheet({ open, entitlement, onClose, onPurchased }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMySubscription()
      .then((res) => {
        if (cancelled) return;
        // Only the plans worth upgrading TO: the tier they are already on, and
        // anything below it, are noise on a paywall.
        const tier = res.entitlement?.tier ?? 0;
        setPlans((res.plans || []).filter((p) => !p.isDefault && p.tier > tier));
      })
      .catch(() => !cancelled && setError('Could not load plans. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const buy = async (plan) => {
    setBuyingId(plan.id);
    setError('');
    try {
      const res = await purchasePlan(plan);
      onPurchased?.(res.entitlement);
      onClose?.();
    } catch (err) {
      // Dismissing the Razorpay sheet rejects too; that is a cancel, not a
      // failure the user needs shouting about.
      if (err?.message !== 'Payment cancelled') {
        setError(err?.message || 'Payment could not be completed');
      }
    } finally {
      setBuyingId(null);
    }
  };

  if (!open) return null;

  const resetIn = timeUntil(entitlement?.resetsAt);
  const limit = entitlement?.limit ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="tc-sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div className="tc-sheet-panel relative w-full max-w-md bg-white rounded-t-[28px] shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white rounded-t-[28px] pt-3">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200" />
          <button
            onClick={onClose}
            className="absolute right-4 top-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#FFF1EE] flex items-center justify-center mb-3">
            <Heart size={30} className="text-[#F87B68]" fill="#F87B68" />
          </div>
          <h2 className="text-[21px] font-extrabold text-[#2D2A28] leading-tight">
            {limit > 0 ? `That's all ${limit} likes for today` : 'Likes are paused'}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-gray-500 leading-relaxed">
            {resetIn ? (
              <>
                You'll get {limit} more in <span className="font-bold text-[#2D2A28]">{resetIn}</span>.
                Or keep going right now with a plan.
              </>
            ) : (
              'Upgrade to keep meeting pets nearby.'
            )}
          </p>
        </div>

        <div className="px-4 pb-6 pt-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {!loading && !plans.length && (
            <p className="text-center text-[13px] text-gray-500 py-6">
              No upgrades available right now. Your likes come back {resetIn ? `in ${resetIn}` : 'soon'}.
            </p>
          )}

          {!loading &&
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                busy={buyingId === plan.id}
                disabled={Boolean(buyingId)}
                onSelect={() => buy(plan)}
              />
            ))}

          {error && (
            <p className="text-center text-[12.5px] text-red-600 font-semibold pt-1">{error}</p>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 text-[13.5px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            {resetIn ? 'Maybe later' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One purchasable tier. Shared by the paywall and the full plans screen, so
 * both always describe a plan the same way.
 */
export function PlanCard({ plan, busy, disabled, onSelect, current = false, compact = false }) {
  const accent = plan.accentColor || '#599D9A';

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 bg-white p-4 transition-all',
        current ? 'shadow-sm' : 'hover:shadow-md'
      )}
      style={{ borderColor: accent }}
    >
      {plan.badge && (
        <span
          className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide text-white"
          style={{ backgroundColor: accent }}
        >
          {plan.badge}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-extrabold text-[#2D2A28] flex items-center gap-1.5">
            {plan.unlimited && <Crown size={15} style={{ color: accent }} />}
            {plan.name}
          </h3>
          {plan.tagline && (
            <p className="text-[12px] text-gray-500 mt-0.5 truncate">{plan.tagline}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[20px] font-extrabold leading-none" style={{ color: accent }}>
            ₹{plan.priceInr}
          </div>
          {plan.durationDays > 0 && (
            <div className="text-[11px] text-gray-400 font-semibold mt-0.5">
              for {plan.durationDays} days
            </div>
          )}
        </div>
      </div>

      <div
        className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        <Sparkles size={13} />
        {describeLimit(plan)}
      </div>

      {!compact && plan.features?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12.5px] text-gray-600">
              <Check size={14} className="mt-0.5 shrink-0" style={{ color: accent }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {current ? (
        <div
          className="mt-4 w-full py-2.5 rounded-xl text-[13.5px] font-extrabold text-center"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          Your current plan
        </div>
      ) : (
        <button
          onClick={onSelect}
          disabled={disabled || busy}
          className="mt-4 w-full py-2.5 rounded-xl text-[13.5px] font-extrabold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: accent }}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Opening payment…
            </>
          ) : (
            `Get ${plan.name} · ₹${plan.priceInr}`
          )}
        </button>
      )}
    </div>
  );
}
