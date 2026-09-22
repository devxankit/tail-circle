/**
 * End-to-end check of the match subscription quota, against the real database.
 *
 *   node scripts/scratch/test-match-subscriptions.mjs
 *
 * Creates a throwaway user, spends its free allowance, asserts the refusal,
 * grants it a paid plan, asserts the bigger allowance, then deletes everything
 * it made. Safe to run repeatedly.
 */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/user/user.model.js';
import { MatchPlan, UserSubscription, LikeUsage } from '../../src/modules/subscription/subscription.models.js';
import {
  ensureDefaultPlans,
  getEntitlement,
  consumeLike,
  refundLike,
  activateSubscription,
  istDateKey,
  nextIstMidnight,
} from '../../src/modules/subscription/subscription.service.js';

let pass = 0;
let fail = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✅ ${label}`); }
  else { fail += 1; console.log(`  ❌ ${label} ${extra}`); }
};

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  console.log('1. Plan catalog');
  await ensureDefaultPlans();
  const plans = await MatchPlan.find().sort({ tier: 1 }).lean();
  ok(`catalog has ${plans.length} plans`, plans.length >= 3);
  const free = plans.find((p) => p.isDefault);
  const standard = plans.find((p) => p.key === 'standard');
  const premium = plans.find((p) => p.key === 'premium');
  ok('a default (free) plan exists', Boolean(free));
  ok(`free allowance is ${free?.likeLimit}/${free?.limitPeriod}`, free?.likeLimit === 10 && free?.limitPeriod === 'day');
  ok('premium is unlimited', premium?.likeLimit === null);

  const dupe = await MatchPlan.countDocuments({ isDefault: true });
  ok('exactly one default plan', dupe === 1, `(found ${dupe})`);

  console.log('\n2. Free user quota');
  const user = await User.create({
    name: 'QA Subscription Probe',
    phone: `9${Date.now().toString().slice(-9)}`,
  });
  const uid = user._id;

  let ent = await getEntitlement(uid);
  ok('starts on the free plan', ent.isDefault === true);
  ok(`limit ${ent.limit}, remaining ${ent.remaining}`, ent.limit === free.likeLimit && ent.remaining === free.likeLimit);
  ok('resetsAt is the next IST midnight', new Date(ent.resetsAt).getTime() === nextIstMidnight().getTime());

  for (let i = 1; i <= free.likeLimit; i += 1) {
    const r = await consumeLike(uid);
    if (i === free.likeLimit) {
      ok(`like ${i} of ${free.likeLimit} spent, 0 remaining`, r.remaining === 0, `(got ${r.remaining})`);
    }
  }

  let refused = false;
  let errDetails = null;
  try {
    await consumeLike(uid);
  } catch (err) {
    refused = err.statusCode === 402;
    errDetails = err.details;
  }
  ok('the 11th like is refused with 402', refused);
  ok('refusal carries LIKE_LIMIT_REACHED', errDetails?.code === 'LIKE_LIMIT_REACHED');
  ok('refusal carries the entitlement', errDetails?.entitlement?.remaining === 0);

  console.log('\n3. Refund');
  await refundLike(uid);
  ent = await getEntitlement(uid);
  ok('a refunded like is available again', ent.remaining === 1, `(remaining ${ent.remaining})`);
  await consumeLike(uid); // spend it back down to 0

  console.log('\n4. Concurrency — 20 simultaneous likes against a fresh 10/day');
  const user2 = await User.create({
    name: 'QA Race Probe',
    phone: `8${Date.now().toString().slice(-9)}`,
  });
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => consumeLike(user2._id))
  );
  const granted = results.filter((r) => r.status === 'fulfilled').length;
  const denied = results.filter((r) => r.status === 'rejected').length;
  ok(`exactly ${free.likeLimit} granted, ${denied} denied`, granted === free.likeLimit, `(granted ${granted}, denied ${denied})`);
  const row = await LikeUsage.findOne({ userId: user2._id }).lean();
  ok('the counter never exceeded the limit', row.used === free.likeLimit, `(used ${row.used})`);

  console.log('\n5. Buying Standard');
  const pending = await UserSubscription.create({
    userId: uid, planId: standard._id, planKey: standard.key,
    plan: {
      name: standard.name, tier: standard.tier, pricePaise: standard.pricePaise,
      durationDays: standard.durationDays, likeLimit: standard.likeLimit,
      limitPeriod: standard.limitPeriod, accentColor: standard.accentColor, features: standard.features,
    },
    status: 'pending_payment', amountPaise: standard.pricePaise,
  });
  const activated = await activateSubscription(pending._id);
  ok('activation flipped it to active', activated?.status === 'active');
  const days = Math.round((activated.expiresAt - activated.startsAt) / 86400000);
  ok(`expires ${standard.durationDays} days out`, days === standard.durationDays, `(got ${days})`);

  ent = await getEntitlement(uid);
  ok('now on Standard', ent.planKey === 'standard' && ent.isDefault === false);
  ok(`fresh ${standard.likeLimit} likes on the new plan`, ent.remaining === standard.likeLimit, `(remaining ${ent.remaining})`);

  console.log('\n6. Activation is idempotent (verify + webhook race)');
  const again = await activateSubscription(pending._id);
  ok('a second activation is a no-op', again === null);

  console.log('\n7. Re-buying the same tier extends, higher tier replaces');
  const stack = await UserSubscription.create({
    userId: uid, planId: standard._id, planKey: standard.key,
    plan: { ...pending.plan.toObject?.() ?? pending.plan },
    status: 'pending_payment', amountPaise: standard.pricePaise,
  });
  const stacked = await activateSubscription(stack._id);
  ok('same tier starts at the old expiry', Math.abs(stacked.startsAt - activated.expiresAt) < 1000);

  const up = await UserSubscription.create({
    userId: uid, planId: premium._id, planKey: premium.key,
    plan: {
      name: premium.name, tier: premium.tier, pricePaise: premium.pricePaise,
      durationDays: premium.durationDays, likeLimit: premium.likeLimit,
      limitPeriod: premium.limitPeriod, accentColor: premium.accentColor, features: premium.features,
    },
    status: 'pending_payment', amountPaise: premium.pricePaise,
  });
  const upgraded = await activateSubscription(up._id);
  ok('higher tier starts now', Math.abs(upgraded.startsAt - Date.now()) < 5000);
  const oldOnes = await UserSubscription.find({ userId: uid, planKey: 'standard' }).lean();
  ok('the standard plan(s) were superseded', oldOnes.every((s) => s.status === 'superseded'), `(${oldOnes.map((s) => s.status).join(',')})`);

  console.log('\n8. Unlimited');
  ent = await getEntitlement(uid);
  ok('on Premium, unlimited', ent.unlimited === true && ent.remaining === null);
  const r = await consumeLike(uid);
  ok('an unlimited like writes no counter', r.unlimited === true);
  const premiumRows = await LikeUsage.countDocuments({ userId: uid, scope: new RegExp(`^sub:${upgraded._id}`) });
  ok('no usage row created for unlimited', premiumRows === 0, `(found ${premiumRows})`);

  console.log('\n9. Expiry falls back to free');
  await UserSubscription.updateOne({ _id: upgraded._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  ent = await getEntitlement(uid);
  ok('an expired plan drops back to free', ent.isDefault === true && ent.limit === free.likeLimit);
  const nowExpired = await UserSubscription.findById(upgraded._id).lean();
  ok('the lapsed row was marked expired', nowExpired.status === 'expired');

  console.log('\n10. Scopes are per-day');
  const scopes = await LikeUsage.find({ userId: uid }).distinct('scope');
  ok(`scopes keyed by IST date (${istDateKey()})`, scopes.every((s) => s.endsWith(istDateKey())), scopes.join(','));

  // ── cleanup ──
  await Promise.all([
    UserSubscription.deleteMany({ userId: { $in: [uid, user2._id] } }),
    LikeUsage.deleteMany({ userId: { $in: [uid, user2._id] } }),
    User.deleteMany({ _id: { $in: [uid, user2._id] } }),
  ]);
  console.log('\nCleaned up test users.');

  console.log(`\n${'='.repeat(48)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(48)}`);
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
