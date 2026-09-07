import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Match-deck subscriptions: the plan catalog, the current user's like
 * allowance, and checkout.
 *
 * The allowance shape returned by the API — used by the swipe counter, the
 * paywall sheet and the subscription screen alike — is:
 *
 *   { planName, unlimited, limit, used, remaining, limitPeriod,
 *     resetsAt, expiresAt, isDefault, accentColor }
 *
 * `remaining` is null when `unlimited` is true; render a crown, not a number.
 */

/** The error code the API returns when a like is refused for want of quota. */
export const LIKE_LIMIT_CODE = 'LIKE_LIMIT_REACHED';

/**
 * True when a caught API error is "you are out of likes".
 *
 * Keyed on the code rather than the 402 alone, so a future paid feature
 * returning the same status does not open the likes paywall.
 */
export function isLikeLimitError(err) {
  return err?.status === 402 && err?.details?.code === LIKE_LIMIT_CODE;
}

/** The allowance carried on a like-limit error, so the sheet can open with real numbers. */
export function entitlementFromError(err) {
  return err?.details?.entitlement || null;
}

export async function fetchPlans() {
  const { data } = await api.get('/subscriptions/plans');
  return data;
}

/** Current plan + live allowance + catalog, in one request. */
export async function fetchMySubscription() {
  const { data } = await api.get('/subscriptions/me');
  return data;
}

/** Just the allowance — used to re-sync the swipe counter. */
export async function fetchEntitlement() {
  const { data } = await api.get('/subscriptions/entitlement');
  return data;
}

export async function fetchSubscriptionHistory() {
  const { data } = await api.get('/subscriptions/history');
  return data;
}

/**
 * Buy a plan end to end: open the Razorpay sheet, wait for verification, then
 * hand back the freshly activated allowance so the caller can update its UI
 * without a second round of guessing.
 *
 * Rejects if the user dismisses the sheet — callers should treat that as a
 * cancel, not a failure worth an error toast.
 */
export async function purchasePlan(plan) {
  const { data } = await api.post('/subscriptions/checkout', { planId: plan.id });
  await payWithRazorpay(data.razorpay, { description: `TailCircle ${plan.name} plan` });
  return fetchMySubscription();
}

export async function cancelSubscription() {
  const { data } = await api.post('/subscriptions/cancel');
  return data;
}

/* ── Display helpers ──────────────────────────────────────────────────── */

/** "25 likes a day" / "Unlimited likes" / "10 likes total". */
export function describeLimit(plan) {
  if (!plan) return '';
  if (plan.unlimited || plan.likeLimit === null) return 'Unlimited likes';
  const noun = plan.likeLimit === 1 ? 'like' : 'likes';
  return plan.limitPeriod === 'day'
    ? `${plan.likeLimit} ${noun} a day`
    : `${plan.likeLimit} ${noun} total`;
}

/** "4h 12m" until the daily quota rolls over, or '' when there is nothing to count down to. */
export function timeUntil(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours >= 1) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

/** Whole days left on a paid plan, for the "expires in 12 days" line. */
export function daysUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
