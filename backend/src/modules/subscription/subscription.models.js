import mongoose from 'mongoose';

/**
 * Match-deck subscriptions.
 *
 * Three documents make the feature work:
 *
 *   MatchPlan        the admin-owned catalog (Free / Standard / Premium …)
 *   UserSubscription what one user bought, frozen at purchase time
 *   LikeUsage        the counter a swipe decrements, one row per quota period
 *
 * Everything the super-admin can retune — the free allowance, the prices, the
 * durations, the plan names — lives in MatchPlan rather than in code, so the
 * numbers below are only the shape, never the policy.
 */

/** A plan whose `likeLimit` is this means "no cap". */
export const UNLIMITED = null;

export const LIMIT_PERIODS = ['day', 'total'];

const matchPlanSchema = new mongoose.Schema(
  {
    /*
     * Stable slug. The default (free) plan is found by `isDefault`, never by
     * key, so an admin renaming "free" to something else cannot orphan every
     * user who is on it.
     */
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },

    /*
     * Rank, not price order. Upgrades are decided by comparing `tier`: buying a
     * strictly higher tier replaces the running subscription, buying the same
     * one extends it. Two plans may share a tier — then neither counts as an
     * upgrade over the other and both merely extend.
     */
    tier: { type: Number, default: 0 },

    // Integer paise, like every other amount on the platform. 0 for the free plan.
    pricePaise: { type: Number, default: 0, min: 0 },
    // 0 means "never expires" — only meaningful for the default plan.
    durationDays: { type: Number, default: 0, min: 0 },

    /*
     * `null` is unlimited. Note the difference from 0, which is a real limit
     * meaning "cannot like at all" — an admin may legitimately want that to
     * pause a tier without deleting it.
     */
    likeLimit: { type: Number, default: null, min: 0 },
    limitPeriod: { type: String, enum: LIMIT_PERIODS, default: 'day' },

    features: { type: [String], default: [] },
    badge: { type: String, default: '' }, // e.g. "MOST POPULAR"
    accentColor: { type: String, default: '#599D9A' },

    /*
     * Exactly one plan carries this. Every user is on it implicitly — there is
     * no UserSubscription row for the free tier, which keeps signup free of a
     * write and means an admin raising the free allowance reaches everybody at
     * once instead of only new accounts.
     */
    isDefault: { type: Boolean, default: false },

    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);
matchPlanSchema.index({ active: 1, sort: 1 });
// At most one default plan, enforced by the database rather than by whichever
// admin request happened to run last.
matchPlanSchema.index(
  { isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const MatchPlan = mongoose.model('MatchPlan', matchPlanSchema);

/**
 * One purchase. `plan` is a snapshot taken when the payment was created:
 * an admin who later re-prices Standard or trims its daily likes must not
 * retroactively change what somebody already paid for.
 */
const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchPlan', required: true },
    planKey: { type: String, required: true },
    plan: {
      name: { type: String, default: '' },
      tier: { type: Number, default: 0 },
      pricePaise: { type: Number, default: 0 },
      durationDays: { type: Number, default: 0 },
      likeLimit: { type: Number, default: null },
      limitPeriod: { type: String, default: 'day' },
      accentColor: { type: String, default: '#599D9A' },
      features: { type: [String], default: [] },
    },

    status: {
      type: String,
      enum: ['pending_payment', 'active', 'expired', 'cancelled', 'superseded'],
      default: 'pending_payment',
      index: true,
    },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    // Set when the user turns off renewal reminders; the plan still runs to
    // `expiresAt`. Distinct from status `cancelled`, which is an admin revoke.
    cancelledAt: { type: Date, default: null },

    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    amountPaise: { type: Number, default: 0 },

    // Set by an admin grant/extend so the finance view can tell a comped
    // subscription apart from a paid one.
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);
userSubscriptionSchema.index({ userId: 1, status: 1, expiresAt: -1 });

export const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);

/**
 * The like counter.
 *
 * One row per (user, scope). `scope` encodes both which subscription the quota
 * belongs to and which period it covers:
 *
 *   free:2026-09-07          the default plan, 7 Sep in IST
 *   sub:<id>:2026-09-07      a paid daily plan, that same day
 *   sub:<id>:total           a paid plan whose limit spans the whole term
 *
 * Consumption is a single guarded `findOneAndUpdate` on this row, so two taps
 * arriving together cannot both pass the `used < limit` test. Rows for past
 * days are left in place — they are the usage history the admin panel charts —
 * and are small enough not to need a TTL.
 */
const likeUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, required: true },
    // Denormalised for the admin usage charts, which group by day.
    periodKey: { type: String, default: '' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription', default: null },
    used: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);
likeUsageSchema.index({ userId: 1, scope: 1 }, { unique: true });
likeUsageSchema.index({ periodKey: 1 });

export const LikeUsage = mongoose.model('LikeUsage', likeUsageSchema);
