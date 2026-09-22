import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { registerPurposeHandler, createOrder as createPaymentOrder } from '../payment/payment.service.js';
import { MatchPlan, UserSubscription, LikeUsage } from './subscription.models.js';

/**
 * Match-deck subscription service.
 *
 * Two jobs: sell plans (through the shared Razorpay dispatcher) and answer the
 * only question the swipe deck actually asks — "may this user like right now,
 * and how many likes are left?".
 */

/* ── Quota periods ────────────────────────────────────────────────────────
 *
 * Daily quotas reset at midnight IST for everybody, so the period key is the
 * calendar date in Asia/Kolkata rather than UTC. Deriving it with `Intl`
 * instead of a fixed +5:30 offset keeps it correct without a date library.
 */

const QUOTA_TZ = 'Asia/Kolkata';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: QUOTA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `2026-09-07` — the IST calendar date containing `at`. */
export function istDateKey(at = new Date()) {
  return dayFormatter.format(at);
}

/**
 * The instant the current IST day rolls over, as a real Date.
 *
 * The UI counts down to this ("resets in 4h 12m"), so it has to be the actual
 * boundary rather than "now + 24h". Found by walking forward from `at` until
 * the IST date key changes, which sidesteps hardcoding the offset.
 */
export function nextIstMidnight(at = new Date()) {
  const today = istDateKey(at);
  // IST is a fixed +5:30, so the boundary is always within the next 24h. Step
  // hour by hour to land in the right hour, then minute by minute.
  const cursor = new Date(at.getTime());
  for (let i = 0; i < 25; i += 1) {
    cursor.setTime(cursor.getTime() + 3_600_000);
    if (istDateKey(cursor) !== today) break;
  }
  // Rewind to the exact minute the date flipped.
  for (let i = 0; i < 60; i += 1) {
    const back = new Date(cursor.getTime() - 60_000);
    if (istDateKey(back) === today) break;
    cursor.setTime(back.getTime());
  }
  cursor.setSeconds(0, 0);
  return cursor;
}

/* ── Plan catalog ─────────────────────────────────────────────────────── */

/**
 * The plans a fresh install starts with. Seeded once, then owned entirely by
 * the admin panel — this array is never consulted again for a database that
 * already has plans, so an admin's edits are not overwritten on the next boot.
 */
export const DEFAULT_PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Start meeting pets nearby',
    tier: 0,
    pricePaise: 0,
    durationDays: 0,
    likeLimit: 10,
    limitPeriod: 'day',
    isDefault: true,
    badge: '',
    accentColor: '#599D9A',
    sort: 0,
    features: ['10 likes every day', 'Unlimited browsing', 'Chat with your matches'],
  },
  {
    key: 'standard',
    name: 'Standard',
    tagline: 'For pet parents who mingle',
    tier: 1,
    pricePaise: 49_900, // ₹499
    durationDays: 30,
    likeLimit: 25,
    limitPeriod: 'day',
    isDefault: false,
    badge: 'MOST POPULAR',
    accentColor: '#F87B68',
    sort: 1,
    features: [
      '25 likes every day',
      'Valid for 30 days',
      'Priority in the match deck',
      'Chat with your matches',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    tagline: 'No limits, ever',
    tier: 2,
    pricePaise: 99_900, // ₹999
    durationDays: 30,
    likeLimit: null, // unlimited
    limitPeriod: 'day',
    isDefault: false,
    badge: 'BEST VALUE',
    accentColor: '#8B5CF6',
    sort: 2,
    features: [
      'Unlimited likes',
      'Valid for 30 days',
      'Priority in the match deck',
      'Chat with your matches',
    ],
  },
];

/**
 * Create the starter catalog if — and only if — there is none.
 *
 * Guarded on the whole collection rather than per key so that an admin who
 * deliberately deletes "Premium" does not find it resurrected on next boot.
 */
export async function ensureDefaultPlans() {
  const existing = await MatchPlan.estimatedDocumentCount();
  if (existing > 0) return { seeded: 0 };
  await MatchPlan.insertMany(DEFAULT_PLANS);
  logger.info(`Seeded ${DEFAULT_PLANS.length} match subscription plans`);
  return { seeded: DEFAULT_PLANS.length };
}

/** The plan every user falls back to. Cached briefly — it is read on every swipe. */
let defaultPlanCache = { at: 0, plan: null };

export function invalidatePlanCache() {
  defaultPlanCache = { at: 0, plan: null };
}

export async function getDefaultPlan() {
  if (defaultPlanCache.plan && Date.now() - defaultPlanCache.at < 60_000) {
    return defaultPlanCache.plan;
  }
  let plan = await MatchPlan.findOne({ isDefault: true }).lean();
  if (!plan) {
    // No default configured (a fresh database, or an admin cleared the flag).
    // Fall back to the lowest active plan so the deck keeps working instead of
    // locking every user out of liking.
    plan = await MatchPlan.findOne({ active: true }).sort({ tier: 1, sort: 1 }).lean();
  }
  defaultPlanCache = { at: Date.now(), plan };
  return plan;
}

export async function listPlans({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { active: true };
  return MatchPlan.find(filter).sort({ sort: 1, tier: 1, createdAt: 1 }).lean();
}

/** The public shape of a plan card. */
export function serializePlan(plan) {
  if (!plan) return null;
  return {
    id: String(plan._id),
    key: plan.key,
    name: plan.name,
    tagline: plan.tagline || '',
    tier: plan.tier ?? 0,
    priceInr: Math.round((plan.pricePaise || 0) / 100),
    pricePaise: plan.pricePaise || 0,
    durationDays: plan.durationDays || 0,
    likeLimit: plan.likeLimit ?? null,
    unlimited: plan.likeLimit === null || plan.likeLimit === undefined,
    limitPeriod: plan.limitPeriod || 'day',
    features: plan.features || [],
    badge: plan.badge || '',
    accentColor: plan.accentColor || '#599D9A',
    isDefault: Boolean(plan.isDefault),
    active: plan.active !== false,
    sort: plan.sort ?? 0,
  };
}

/* ── The running subscription ─────────────────────────────────────────── */

/**
 * The user's live paid subscription, or null if they are on the free plan.
 *
 * Expiry is settled here rather than by a cron: a row whose `expiresAt` has
 * passed is flipped to `expired` on the first read after the fact. That keeps
 * the deployment free of a scheduler while still never handing out a stale
 * entitlement — nothing can read the quota without coming through this.
 */
export async function getActiveSubscription(userId) {
  const now = new Date();

  const sub = await UserSubscription.findOne({
    userId,
    status: 'active',
  })
    .sort({ expiresAt: -1 })
    .lean();

  if (!sub) return null;

  if (sub.expiresAt && sub.expiresAt <= now) {
    await UserSubscription.updateOne(
      { _id: sub._id, status: 'active' },
      { $set: { status: 'expired' } }
    );
    // There may be a second, longer subscription behind the one that just
    // lapsed (a stacked renewal); look again rather than assuming free.
    return getActiveSubscription(userId);
  }

  return sub;
}

/**
 * Everything the client needs to render the quota, in one object.
 *
 * `limit: null` means unlimited, in which case `remaining` is null too — the
 * UI shows a crown rather than a number.
 */
export async function getEntitlement(userId) {
  const [sub, defaultPlan] = await Promise.all([
    getActiveSubscription(userId),
    getDefaultPlan(),
  ]);

  const effective = sub
    ? { ...sub.plan, name: sub.plan?.name || 'Plan', key: sub.planKey }
    : {
        name: defaultPlan?.name || 'Free',
        key: defaultPlan?.key || 'free',
        tier: defaultPlan?.tier ?? 0,
        likeLimit: defaultPlan?.likeLimit ?? 10,
        limitPeriod: defaultPlan?.limitPeriod || 'day',
        accentColor: defaultPlan?.accentColor || '#599D9A',
        features: defaultPlan?.features || [],
      };

  const limit = effective.likeLimit === undefined ? null : effective.likeLimit;
  const unlimited = limit === null;
  const limitPeriod = effective.limitPeriod || 'day';
  const scope = usageScope({ subscription: sub, limitPeriod });

  let used = 0;
  if (!unlimited) {
    const row = await LikeUsage.findOne({ userId, scope }).select('used').lean();
    used = row?.used || 0;
  }

  return {
    planId: sub ? String(sub.planId) : defaultPlan ? String(defaultPlan._id) : null,
    planKey: effective.key,
    planName: effective.name,
    tier: effective.tier ?? 0,
    accentColor: effective.accentColor || '#599D9A',
    isDefault: !sub,
    unlimited,
    limit,
    used: unlimited ? 0 : used,
    remaining: unlimited ? null : Math.max(0, limit - used),
    limitPeriod,
    // Only meaningful for daily quotas; `null` for a whole-term allowance.
    resetsAt: limitPeriod === 'day' ? nextIstMidnight() : null,
    expiresAt: sub?.expiresAt || null,
    subscriptionId: sub ? String(sub._id) : null,
    cancelledAt: sub?.cancelledAt || null,
  };
}

/** The LikeUsage `scope` for a user's current plan + period. */
function usageScope({ subscription, limitPeriod }) {
  const base = subscription ? `sub:${subscription._id}` : 'free';
  return limitPeriod === 'day' ? `${base}:${istDateKey()}` : `${base}:total`;
}

/* ── Spending a like ──────────────────────────────────────────────────── */

export class LikeLimitError extends ApiError {
  constructor(entitlement) {
    /*
     * 402 rather than 403: this is "payment required to continue", and the
     * client keys its paywall off exactly that. `details.code` is what the
     * frontend actually branches on — the status alone is not specific enough
     * once other paid features exist.
     */
    super(402, 'You have used all your likes for now', {
      details: { code: 'LIKE_LIMIT_REACHED', entitlement },
    });
    this.name = 'LikeLimitError';
  }
}

/**
 * Take one like off the user's allowance, or refuse.
 *
 * The whole check-and-decrement is a single atomic update filtered on
 * `used < limit`, so concurrent swipes — a double tap, two open tabs — cannot
 * both squeeze past a limit of one remaining. On refusal it throws
 * LikeLimitError carrying the entitlement, so the route need not re-query it
 * for the paywall payload.
 */
export async function consumeLike(userId) {
  const entitlement = await getEntitlement(userId);
  if (entitlement.unlimited) return entitlement;

  const sub = entitlement.subscriptionId ? { _id: entitlement.subscriptionId } : null;
  const scope = usageScope({ subscription: sub, limitPeriod: entitlement.limitPeriod });
  const limit = entitlement.limit;

  if (limit <= 0) throw new LikeLimitError(entitlement);

  /*
   * Guarded decrement, then create-on-miss.
   *
   * The guard `used < limit` cannot ride along on an upsert — Mongo copies the
   * filter into the inserted document, which would seed `used` from a range
   * expression. So the first like of a period falls through to an explicit
   * create, and the duplicate-key race that two simultaneous first likes
   * produce is caught and retried against the row that now exists.
   */
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const updated = await LikeUsage.findOneAndUpdate(
      { userId, scope, used: { $lt: limit } },
      { $inc: { used: 1 } },
      { new: true }
    );
    if (updated) {
      return { ...entitlement, used: updated.used, remaining: Math.max(0, limit - updated.used) };
    }

    // Either the row is at its limit, or it does not exist yet.
    const existing = await LikeUsage.findOne({ userId, scope }).select('used').lean();
    if (existing) {
      // It exists and is full.
      throw new LikeLimitError({ ...entitlement, used: existing.used, remaining: 0 });
    }
    try {
      const created = await LikeUsage.create({
        userId,
        scope,
        periodKey: istDateKey(),
        subscriptionId: sub?._id || null,
        used: 1,
      });
      return { ...entitlement, used: created.used, remaining: Math.max(0, limit - created.used) };
    } catch (err) {
      if (err?.code !== 11000) throw err;
      // Someone else created it a moment ago — loop and decrement theirs.
    }
  }

  throw new LikeLimitError(entitlement);
}

/**
 * Hand a like back.
 *
 * Called when the swipe that spent it could not be recorded, so a failed write
 * does not silently cost the user one of their ten. Never drops below zero.
 */
export async function refundLike(userId) {
  try {
    const entitlement = await getEntitlement(userId);
    if (entitlement.unlimited) return;
    const sub = entitlement.subscriptionId ? { _id: entitlement.subscriptionId } : null;
    const scope = usageScope({ subscription: sub, limitPeriod: entitlement.limitPeriod });
    await LikeUsage.updateOne({ userId, scope, used: { $gt: 0 } }, { $inc: { used: -1 } });
  } catch (err) {
    logger.warn(`Could not refund like for ${userId}: ${err.message}`);
  }
}

/* ── Buying a plan ────────────────────────────────────────────────────── */

/**
 * Start a checkout. Creates the subscription in `pending_payment` and returns
 * the Razorpay order for the client sheet; nothing is granted until the
 * payment is verified.
 */
export async function startCheckout(user, planId) {
  if (!mongoose.isValidObjectId(planId)) throw ApiError.badRequest('Invalid plan id');
  const plan = await MatchPlan.findOne({ _id: planId, active: true }).lean();
  if (!plan) throw ApiError.badRequest('Plan not found');
  if (plan.isDefault || !plan.pricePaise) {
    throw ApiError.badRequest('This plan is free — there is nothing to pay for');
  }

  const current = await getActiveSubscription(user.id);
  if (current && (current.plan?.tier ?? 0) > (plan.tier ?? 0)) {
    throw ApiError.badRequest(
      `Your ${current.plan?.name || 'current'} plan already includes more than ${plan.name}`
    );
  }

  /*
   * Clear this user's abandoned checkouts for the same plan before opening a
   * new one, so a user who dismissed the sheet three times does not leave
   * three pending rows for the admin subscriber list to show.
   */
  await UserSubscription.deleteMany({
    userId: user.id,
    planId: plan._id,
    status: 'pending_payment',
  });

  const pending = await UserSubscription.create({
    userId: user.id,
    planId: plan._id,
    planKey: plan.key,
    plan: {
      name: plan.name,
      tier: plan.tier ?? 0,
      pricePaise: plan.pricePaise,
      durationDays: plan.durationDays,
      likeLimit: plan.likeLimit ?? null,
      limitPeriod: plan.limitPeriod || 'day',
      accentColor: plan.accentColor,
      features: plan.features || [],
    },
    status: 'pending_payment',
    amountPaise: plan.pricePaise,
  });

  const payment = await createPaymentOrder(user, 'match_subscription', {
    subscriptionId: pending.id,
  });
  pending.paymentId = payment.paymentId;
  await pending.save();

  return { subscriptionId: pending.id, plan: serializePlan(plan), razorpay: payment };
}

/**
 * Turn a paid checkout into a live subscription.
 *
 * Idempotent: the status transition is a guarded update, so the verify call
 * and the webhook racing each other still activate exactly once.
 *
 * Stacking rule (confirmed with the product owner):
 *   • same tier as the running plan  → the new term starts at its expiry
 *   • strictly higher tier           → starts now, the old plan is superseded
 */
export async function activateSubscription(pendingId) {
  const pending = await UserSubscription.findOne({
    _id: pendingId,
    status: 'pending_payment',
  });
  if (!pending) return null; // already activated by the other path

  const now = new Date();
  const current = await getActiveSubscription(pending.userId);

  const isUpgrade = current ? (pending.plan?.tier ?? 0) > (current.plan?.tier ?? 0) : false;
  const startsAt = current && !isUpgrade ? current.expiresAt || now : now;

  const days = pending.plan?.durationDays || 0;
  const expiresAt = days
    ? new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000)
    : null;

  const res = await UserSubscription.updateOne(
    { _id: pending._id, status: 'pending_payment' },
    { $set: { status: 'active', startsAt, expiresAt } }
  );
  if (res.modifiedCount === 0) return null; // lost the race

  if (isUpgrade) {
    /*
     * Every lower-tier plan is done, not merely the one `getActiveSubscription`
     * happened to return.
     *
     * A user who renewed Standard before upgrading has two active Standard
     * rows stacked back to back. Superseding only the latest-expiring of them
     * left the earlier one running, so when Premium lapsed they silently fell
     * back to a Standard subscription they had already been upgraded off —
     * instead of to the free plan.
     */
    await UserSubscription.updateMany(
      {
        userId: pending.userId,
        _id: { $ne: pending._id },
        status: 'active',
        'plan.tier': { $lt: pending.plan?.tier ?? 0 },
      },
      { $set: { status: 'superseded', expiresAt: now } }
    );
  }

  return UserSubscription.findById(pending._id).lean();
}

registerPurposeHandler('match_subscription', {
  // Amount is always re-derived from the plan snapshot on the server; the
  // client sends only which pending subscription it is paying for.
  computeAmount: async (user, payload) => {
    const pending = await UserSubscription.findOne({
      _id: payload.subscriptionId,
      userId: user.id,
      status: 'pending_payment',
    }).lean();
    if (!pending) throw ApiError.badRequest('Checkout not found or already paid');
    return {
      amountPaise: pending.amountPaise,
      refId: pending._id,
      notes: { plan: pending.planKey },
    };
  },
  onPaid: async (payment) => {
    await activateSubscription(payment.refId);
  },
  onFailed: async (payment) => {
    await UserSubscription.deleteOne({ _id: payment.refId, status: 'pending_payment' });
  },
});

/* ── User-facing reads ────────────────────────────────────────────────── */

export function serializeSubscription(sub) {
  if (!sub) return null;
  return {
    id: String(sub._id),
    planId: String(sub.planId),
    planKey: sub.planKey,
    planName: sub.plan?.name || '',
    priceInr: Math.round((sub.amountPaise || 0) / 100),
    likeLimit: sub.plan?.likeLimit ?? null,
    unlimited: (sub.plan?.likeLimit ?? null) === null,
    limitPeriod: sub.plan?.limitPeriod || 'day',
    durationDays: sub.plan?.durationDays || 0,
    accentColor: sub.plan?.accentColor || '#599D9A',
    features: sub.plan?.features || [],
    status: sub.status,
    startsAt: sub.startsAt,
    expiresAt: sub.expiresAt,
    cancelledAt: sub.cancelledAt,
    grantedByAdmin: Boolean(sub.grantedBy),
    createdAt: sub.createdAt,
  };
}

export async function getMySubscription(userId) {
  const [entitlement, plans, current] = await Promise.all([
    getEntitlement(userId),
    listPlans(),
    getActiveSubscription(userId),
  ]);
  return {
    entitlement,
    current: serializeSubscription(current),
    plans: plans.map(serializePlan),
  };
}

export async function listMyHistory(userId) {
  const rows = await UserSubscription.find({
    userId,
    status: { $ne: 'pending_payment' },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map(serializeSubscription);
}

/**
 * Stop the renewal nudges. The plan keeps running to its expiry — the user has
 * paid for those days — so this only stamps `cancelledAt`.
 */
export async function cancelMySubscription(userId) {
  const sub = await getActiveSubscription(userId);
  if (!sub) throw ApiError.badRequest('You are on the free plan');
  if (sub.cancelledAt) return serializeSubscription(sub);
  await UserSubscription.updateOne({ _id: sub._id }, { $set: { cancelledAt: new Date() } });
  const fresh = await UserSubscription.findById(sub._id).lean();
  return serializeSubscription(fresh);
}
