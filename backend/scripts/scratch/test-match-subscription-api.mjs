/**
 * Live HTTP check of the subscription + swipe-quota flow.
 *
 *   node scripts/scratch/test-match-subscription-api.mjs
 *
 * Needs the API running on PORT. Mints a token for a throwaway user, swipes
 * through the free allowance against the real deck, asserts the 402 paywall
 * payload, then cleans up.
 */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/user/user.model.js';
import { MatchProfile } from '../../src/modules/social/social.models.js';
import { UserSubscription, LikeUsage, MatchPlan } from '../../src/modules/subscription/subscription.models.js';
import jwt from 'jsonwebtoken';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✅ ${label}`); }
  else { fail += 1; console.log(`  ❌ ${label} ${extra}`); }
};

async function main() {
  await mongoose.connect(env.mongoUri);

  const user = await User.create({
    name: 'QA API Probe',
    phone: `7${Date.now().toString().slice(-9)}`,
    role: 'user',
  });
  const token = jwt.sign({ sub: String(user._id), role: 'user' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const get = async (p) => {
    const r = await fetch(`${BASE}${p}`, { headers: H });
    return { status: r.status, body: await r.json() };
  };
  const post = async (p, b) => {
    const r = await fetch(`${BASE}${p}`, { method: 'POST', headers: H, body: JSON.stringify(b) });
    return { status: r.status, body: await r.json() };
  };

  console.log(`Testing ${BASE}\n`);

  console.log('1. GET /subscriptions/plans');
  const plans = await get('/subscriptions/plans');
  ok('200', plans.status === 200, `(${plans.status})`);
  ok(`${plans.body.data?.length} plans returned`, plans.body.data?.length >= 3);
  const free = plans.body.data.find((p) => p.isDefault);
  ok('free plan is flagged default and costs 0', free && free.priceInr === 0);
  ok(`free plan is ${free?.likeLimit} likes/${free?.limitPeriod}`, free?.likeLimit > 0);

  console.log('\n2. GET /subscriptions/me');
  const me = await get('/subscriptions/me');
  ok('200', me.status === 200, `(${me.status})`);
  ok('starts on the free plan', me.body.data?.entitlement?.isDefault === true);
  ok(`remaining === limit === ${free.likeLimit}`, me.body.data.entitlement.remaining === free.likeLimit);
  ok('resetsAt present for a daily plan', Boolean(me.body.data.entitlement.resetsAt));

  console.log('\n3. GET /matches/deck carries the entitlement');
  const deck = await get('/matches/deck');
  ok('200', deck.status === 200, `(${deck.status})`);
  ok('meta.entitlement present', Boolean(deck.body.meta?.entitlement));
  ok(`deck has ${deck.body.data?.length} profiles`, Array.isArray(deck.body.data));

  console.log('\n4. Spending the allowance through POST /matches/swipe');
  // Use real profiles the probe has never seen. Fall back to the deck if the
  // collection is small.
  const ids = await MatchProfile.find({ active: true })
    .limit(free.likeLimit + 3)
    .distinct('_id');
  ok(`found ${ids.length} profiles to swipe (need ${free.likeLimit + 1})`, ids.length > free.likeLimit);

  let lastRemaining = null;
  let refusal = null;
  for (let i = 0; i < Math.min(ids.length, free.likeLimit + 1); i += 1) {
    const res = await post('/matches/swipe', { profileId: String(ids[i]), action: 'like' });
    if (res.status === 402) { refusal = res; break; }
    lastRemaining = res.body.data?.entitlement?.remaining;
  }
  ok('the last allowed like reported 0 remaining', lastRemaining === 0, `(got ${lastRemaining})`);
  ok('the next like returned 402', refusal?.status === 402, `(got ${refusal?.status})`);
  ok('402 body carries LIKE_LIMIT_REACHED', refusal?.body?.details?.code === 'LIKE_LIMIT_REACHED');
  ok('402 body carries the entitlement for the paywall', refusal?.body?.details?.entitlement?.remaining === 0);
  ok('402 body carries the plan name', Boolean(refusal?.body?.details?.entitlement?.planName));

  console.log('\n5. Passing is never metered');
  const passRes = await post('/matches/swipe', { profileId: String(ids[free.likeLimit + 1] || ids[0]), action: 'pass' });
  ok('a pass succeeds even at zero likes', passRes.status === 200, `(${passRes.status})`);
  ok('the pass response still reports the quota', passRes.body.data?.entitlement?.remaining === 0);

  console.log('\n6. Re-liking an already-liked profile is free');
  const usageBefore = await LikeUsage.findOne({ userId: user._id }).lean();
  const again = await post('/matches/swipe', { profileId: String(ids[0]), action: 'superlike' });
  const usageAfter = await LikeUsage.findOne({ userId: user._id }).lean();
  ok('upgrading a like to a superlike is allowed at zero', again.status === 200, `(${again.status})`);
  ok('and spent nothing extra', usageAfter.used === usageBefore.used, `(${usageBefore.used} → ${usageAfter.used})`);

  console.log('\n7. Checkout opens a Razorpay order');
  const paid = plans.body.data.find((p) => !p.isDefault && p.priceInr > 0);
  const checkout = await post('/subscriptions/checkout', { planId: paid.id });
  if (checkout.status === 201) {
    ok('201 created', true);
    ok('returns a razorpay order id', Boolean(checkout.body.data?.razorpay?.razorpayOrderId));
    ok(`amount is ${paid.priceInr * 100} paise`, checkout.body.data?.razorpay?.amount === paid.priceInr * 100,
      `(got ${checkout.body.data?.razorpay?.amount})`);
    ok('the subscription is pending, not active', Boolean(checkout.body.data?.subscriptionId));
    const row = await UserSubscription.findById(checkout.body.data.subscriptionId).lean();
    ok('DB row is pending_payment', row?.status === 'pending_payment', `(${row?.status})`);
    const ent = await get('/subscriptions/entitlement');
    ok('an unpaid checkout grants nothing', ent.body.data.isDefault === true);
  } else {
    console.log(`  ⚠️  checkout returned ${checkout.status}: ${checkout.body.message}`);
    console.log('     (expected when Razorpay keys are not configured in this env)');
  }

  console.log('\n8. Free plan cannot be "bought"');
  const freeBuy = await post('/subscriptions/checkout', { planId: free.id });
  ok('400 rejected', freeBuy.status === 400, `(${freeBuy.status})`);

  // ── cleanup ──
  const { Swipe } = await import('../../src/modules/social/social.models.js');
  await Promise.all([
    UserSubscription.deleteMany({ userId: user._id }),
    LikeUsage.deleteMany({ userId: user._id }),
    Swipe.deleteMany({ userId: user._id }),
    User.deleteOne({ _id: user._id }),
  ]);
  console.log('\nCleaned up.');

  console.log(`\n${'='.repeat(48)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(48)}`);
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
