import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { writeAudit } from '../admin/admin.service.js';
import { User } from '../user/user.model.js';
import { MatchPlan, UserSubscription, LikeUsage } from './subscription.models.js';
import {
  serializePlan,
  serializeSubscription,
  invalidatePlanCache,
  getEntitlement,
  istDateKey,
} from './subscription.service.js';

/**
 * Super-admin control surface for match subscriptions: the plan catalog (which
 * is where the "10 free likes" number actually lives), the subscriber list, and
 * the revenue roll-up behind the panel's insights tab.
 *
 * Every mutation is audited, like the rest of the admin module.
 */

const idOk = (id) => mongoose.isValidObjectId(id);

/* ── Plans ────────────────────────────────────────────────────────────── */

export async function adminListPlans() {
  const plans = await MatchPlan.find().sort({ sort: 1, tier: 1, createdAt: 1 }).lean();

  // Live subscriber count per plan, so the panel shows what each tier is worth
  // rather than just what it costs.
  const counts = await UserSubscription.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$planId', count: { $sum: 1 } } },
  ]);
  const byPlan = new Map(counts.map((c) => [String(c._id), c.count]));

  return plans.map((p) => ({
    ...serializePlan(p),
    activeSubscribers: byPlan.get(String(p._id)) || 0,
  }));
}

/**
 * Turn a request body into plan fields.
 *
 * `likeLimit` is the field that needs care: the client sends `unlimited: true`
 * to mean "no cap", which is stored as null. A plain numeric 0 is a real
 * setting (a tier that cannot like at all) and must survive.
 */
function planFieldsFrom(body = {}) {
  const fields = {};
  const copy = ['name', 'tagline', 'badge', 'accentColor', 'features', 'limitPeriod'];
  for (const k of copy) if (body[k] !== undefined) fields[k] = body[k];

  if (body.tier !== undefined) fields.tier = Number(body.tier);
  if (body.sort !== undefined) fields.sort = Number(body.sort);
  if (body.active !== undefined) fields.active = Boolean(body.active);

  // The panel talks rupees; the database stores paise everywhere.
  if (body.priceInr !== undefined) fields.pricePaise = Math.round(Number(body.priceInr) * 100);
  else if (body.pricePaise !== undefined) fields.pricePaise = Math.round(Number(body.pricePaise));

  if (body.durationDays !== undefined) fields.durationDays = Number(body.durationDays);

  if (body.unlimited === true) fields.likeLimit = null;
  else if (body.unlimited === false && body.likeLimit !== undefined) {
    fields.likeLimit = Number(body.likeLimit);
  } else if (body.likeLimit !== undefined) {
    fields.likeLimit = body.likeLimit === null ? null : Number(body.likeLimit);
  }

  return fields;
}

export async function adminCreatePlan(actor, body, ip) {
  const fields = planFieldsFrom(body);
  if (!fields.name) throw ApiError.badRequest('Plan name is required');

  const key =
    (body.key || fields.name)
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `plan_${Date.now()}`;

  if (await MatchPlan.exists({ key })) {
    throw ApiError.conflict(`A plan with the key "${key}" already exists`);
  }

  const max = await MatchPlan.findOne().sort({ sort: -1 }).select('sort').lean();
  const plan = await MatchPlan.create({
    ...fields,
    key,
    // A new plan is never the default — that flag moves only through the
    // explicit "make default" action, which also clears the previous holder.
    isDefault: false,
    sort: fields.sort ?? (max?.sort || 0) + 1,
  });

  invalidatePlanCache();
  await writeAudit(actor, {
    action: 'match_plan.create',
    targetType: 'match_plan',
    targetId: plan._id,
    after: { key, name: plan.name, pricePaise: plan.pricePaise, likeLimit: plan.likeLimit },
    ip,
  });
  return serializePlan(plan.toObject());
}

export async function adminUpdatePlan(actor, id, body, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid plan id');
  const plan = await MatchPlan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found');

  const before = {
    name: plan.name,
    pricePaise: plan.pricePaise,
    likeLimit: plan.likeLimit,
    durationDays: plan.durationDays,
    active: plan.active,
  };

  const fields = planFieldsFrom(body);

  /*
   * The default plan is what every user without a purchase is on. Charging for
   * it, or expiring it, would leave those users with no plan at all — so those
   * two fields are pinned regardless of what the panel sends. Its name and
   * like allowance stay fully editable, which is the point of the screen.
   */
  if (plan.isDefault) {
    delete fields.pricePaise;
    delete fields.durationDays;
    if (fields.active === false) {
      throw ApiError.badRequest('The default plan cannot be deactivated');
    }
  }

  Object.assign(plan, fields);
  await plan.save();
  invalidatePlanCache();

  await writeAudit(actor, {
    action: 'match_plan.update',
    targetType: 'match_plan',
    targetId: plan._id,
    before,
    after: {
      name: plan.name,
      pricePaise: plan.pricePaise,
      likeLimit: plan.likeLimit,
      durationDays: plan.durationDays,
      active: plan.active,
    },
    ip,
  });
  return serializePlan(plan.toObject());
}

/** Move the "every user starts here" flag onto another plan. */
export async function adminSetDefaultPlan(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid plan id');
  const plan = await MatchPlan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (plan.pricePaise > 0) {
    throw ApiError.badRequest('Only a free plan can be the default plan');
  }

  // Clear the old holder first — the unique partial index rejects two.
  await MatchPlan.updateOne({ isDefault: true }, { $set: { isDefault: false } });
  plan.isDefault = true;
  plan.active = true;
  await plan.save();
  invalidatePlanCache();

  await writeAudit(actor, {
    action: 'match_plan.set_default',
    targetType: 'match_plan',
    targetId: plan._id,
    after: { key: plan.key },
    ip,
  });
  return serializePlan(plan.toObject());
}

export async function adminDeletePlan(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid plan id');
  const plan = await MatchPlan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (plan.isDefault) throw ApiError.badRequest('The default plan cannot be deleted');

  /*
   * A plan somebody is still paying for is deactivated, not removed. Their
   * UserSubscription keeps its own snapshot so it runs to expiry either way,
   * but keeping the row means the admin list can still name the plan they are
   * on rather than showing a dangling id.
   */
  const liveCount = await UserSubscription.countDocuments({ planId: plan._id, status: 'active' });
  if (liveCount > 0) {
    plan.active = false;
    await plan.save();
    invalidatePlanCache();
    await writeAudit(actor, {
      action: 'match_plan.deactivate',
      targetType: 'match_plan',
      targetId: plan._id,
      after: { reason: 'has active subscribers', liveCount },
      ip,
    });
    return { id: String(plan._id), deactivated: true, activeSubscribers: liveCount };
  }

  await plan.deleteOne();
  invalidatePlanCache();
  await writeAudit(actor, {
    action: 'match_plan.delete',
    targetType: 'match_plan',
    targetId: id,
    before: { key: plan.key, name: plan.name },
    ip,
  });
  return { id: String(plan._id), deactivated: false };
}

/** Persist a drag-reorder of the plan cards in one write. */
export async function adminReorderPlans(actor, order = [], ip) {
  const ops = order
    .filter((id) => idOk(id))
    .map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sort: index } } },
    }));
  if (!ops.length) throw ApiError.badRequest('Nothing to reorder');
  await MatchPlan.bulkWrite(ops);
  invalidatePlanCache();
  await writeAudit(actor, { action: 'match_plan.reorder', targetType: 'match_plan', after: { order }, ip });
  return adminListPlans();
}

/* ── Subscribers ──────────────────────────────────────────────────────── */

/**
 * The subscriber table.
 *
 * Only rows for real purchases exist — free-plan users have no document by
 * design — so this lists people who have paid or been granted a plan, which is
 * what the screen is for.
 */
export async function adminListSubscriptions({ status = '', planId = '', search = '', limit = 100 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  else filter.status = { $ne: 'pending_payment' };
  if (planId && idOk(planId)) filter.planId = planId;

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const userIds = await User.find({ $or: [{ name: rx }, { phone: rx }, { email: rx }] })
      .limit(200)
      .distinct('_id');
    filter.userId = { $in: userIds };
  }

  const rows = await UserSubscription.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .populate('userId', 'name phone email avatarUrl')
    .lean();

  const today = istDateKey();

  // Today's like usage for everyone on the page, in one query rather than one
  // per row.
  const scopes = rows.map((r) => `sub:${r._id}:${today}`);
  const usageRows = scopes.length
    ? await LikeUsage.find({ scope: { $in: scopes } }).select('scope used').lean()
    : [];
  const usedByScope = new Map(usageRows.map((u) => [u.scope, u.used]));

  return rows.map((r) => ({
    ...serializeSubscription(r),
    user: r.userId
      ? {
          id: String(r.userId._id),
          name: r.userId.name || '',
          phone: r.userId.phone || '',
          email: r.userId.email || '',
          avatarUrl: r.userId.avatarUrl || '',
        }
      : null,
    usedToday: usedByScope.get(`sub:${r._id}:${today}`) || 0,
  }));
}

/** Headline numbers for the insights tab. */
export async function adminSubscriptionStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [byPlan, revenueAllTime, revenueThisMonth, activeTotal, expiringSoon, todayLikes] =
    await Promise.all([
      UserSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$planKey', count: { $sum: 1 }, revenue: { $sum: '$amountPaise' } } },
        { $sort: { count: -1 } },
      ]),
      UserSubscription.aggregate([
        { $match: { status: { $in: ['active', 'expired', 'superseded'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      UserSubscription.aggregate([
        {
          $match: {
            status: { $in: ['active', 'expired', 'superseded'] },
            startsAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      UserSubscription.countDocuments({ status: 'active' }),
      UserSubscription.countDocuments({
        status: 'active',
        expiresAt: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      }),
      LikeUsage.aggregate([
        { $match: { periodKey: istDateKey() } },
        { $group: { _id: null, likes: { $sum: '$used' }, users: { $sum: 1 } } },
      ]),
    ]);

  return {
    activeSubscribers: activeTotal,
    expiringIn7Days: expiringSoon,
    revenueAllTimeInr: Math.round((revenueAllTime[0]?.total || 0) / 100),
    revenueThisMonthInr: Math.round((revenueThisMonth[0]?.total || 0) / 100),
    likesToday: todayLikes[0]?.likes || 0,
    likersToday: todayLikes[0]?.users || 0,
    byPlan: byPlan.map((p) => ({
      planKey: p._id,
      subscribers: p.count,
      revenueInr: Math.round((p.revenue || 0) / 100),
    })),
  };
}

/**
 * Comp a plan to a user — support gestures, influencer deals, making good on a
 * failed payment. Goes through the same activation path as a purchase so the
 * stacking rules are identical, but records who granted it.
 */
export async function adminGrantSubscription(actor, { userId, planId, note = '' }, ip) {
  if (!idOk(userId)) throw ApiError.badRequest('Invalid user id');
  if (!idOk(planId)) throw ApiError.badRequest('Invalid plan id');

  const [user, plan] = await Promise.all([User.findById(userId).lean(), MatchPlan.findById(planId).lean()]);
  if (!user) throw ApiError.notFound('User not found');
  if (!plan) throw ApiError.notFound('Plan not found');
  if (plan.isDefault) throw ApiError.badRequest('Every user already has the default plan');

  const pending = await UserSubscription.create({
    userId,
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
    // A grant is free: it must not inflate the revenue roll-up above.
    amountPaise: 0,
    grantedBy: actor?.id || actor?._id || null,
    note,
  });

  const { activateSubscription } = await import('./subscription.service.js');
  const activated = await activateSubscription(pending.id);

  await writeAudit(actor, {
    action: 'subscription.grant',
    targetType: 'subscription',
    targetId: pending._id,
    after: { userId: String(userId), plan: plan.key, note },
    ip,
  });
  return serializeSubscription(activated);
}

/** Push an active subscription's expiry out (or pull it in, with a negative). */
export async function adminExtendSubscription(actor, id, days, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid subscription id');
  const n = Number(days);
  if (!Number.isFinite(n) || n === 0) throw ApiError.badRequest('Days must be a non-zero number');

  const sub = await UserSubscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');
  if (sub.status !== 'active') throw ApiError.badRequest('Only an active subscription can be extended');
  if (!sub.expiresAt) throw ApiError.badRequest('This subscription does not expire');

  const before = sub.expiresAt;
  sub.expiresAt = new Date(sub.expiresAt.getTime() + n * 24 * 60 * 60 * 1000);
  if (sub.expiresAt <= new Date()) {
    throw ApiError.badRequest('That would put the expiry in the past — revoke it instead');
  }
  await sub.save();

  await writeAudit(actor, {
    action: 'subscription.extend',
    targetType: 'subscription',
    targetId: sub._id,
    before: { expiresAt: before },
    after: { expiresAt: sub.expiresAt, days: n },
    ip,
  });
  return serializeSubscription(sub.toObject());
}

/** End a subscription now. The user drops back to the default plan. */
export async function adminRevokeSubscription(actor, id, reason = '', ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid subscription id');
  const sub = await UserSubscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');
  if (sub.status !== 'active') throw ApiError.badRequest('This subscription is not active');

  sub.status = 'cancelled';
  sub.expiresAt = new Date();
  sub.note = reason || sub.note;
  await sub.save();

  await writeAudit(actor, {
    action: 'subscription.revoke',
    targetType: 'subscription',
    targetId: sub._id,
    after: { reason },
    ip,
  });
  return serializeSubscription(sub.toObject());
}

/** What one user's quota looks like right now — the row-expand in the panel. */
export async function adminUserEntitlement(userId) {
  if (!idOk(userId)) throw ApiError.badRequest('Invalid user id');
  const entitlement = await getEntitlement(userId);
  const history = await UserSubscription.find({ userId, status: { $ne: 'pending_payment' } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return { entitlement, history: history.map(serializeSubscription) };
}
