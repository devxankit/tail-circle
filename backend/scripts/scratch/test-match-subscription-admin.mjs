/**
 * Live HTTP check of the admin control surface for match subscriptions.
 *
 *   node scripts/scratch/test-match-subscription-admin.mjs
 *
 * Exercises the plan CRUD the panel calls, the guards on the default plan, and
 * grant/extend/revoke. Creates and removes its own test plan and user.
 */
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/user/user.model.js';
import { MatchPlan, UserSubscription, LikeUsage } from '../../src/modules/subscription/subscription.models.js';
import { AuditLog } from '../../src/modules/admin/admin.models.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const ok = (l, c, e = '') => {
  if (c) { pass += 1; console.log(`  ✅ ${l}`); }
  else { fail += 1; console.log(`  ❌ ${l} ${e}`); }
};

async function main() {
  await mongoose.connect(env.mongoUri);

  const admin = await User.create({
    name: 'QA Admin Probe', phone: `5${Date.now().toString().slice(-9)}`, role: 'admin',
  });
  const member = await User.create({
    name: 'QA Member Probe', phone: `4${Date.now().toString().slice(-9)}`, role: 'user',
  });
  const tok = (u) => jwt.sign({ sub: String(u._id), role: u.role }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
  const H = { Authorization: `Bearer ${tok(admin)}`, 'Content-Type': 'application/json' };
  const call = async (m, p, b) => {
    const r = await fetch(`${BASE}${p}`, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  console.log(`Testing ${BASE} as admin\n`);
  let createdPlanId = null;

  console.log('1. GET /admin/match-plans');
  const list = await call('GET', '/admin/match-plans');
  ok('200', list.status === 200, `(${list.status})`);
  ok('returns plans with subscriber counts', list.body.data?.every((p) => 'activeSubscribers' in p));
  const free = list.body.data.find((p) => p.isDefault);
  ok('the default plan is marked', Boolean(free));

  console.log('\n2. Changing the free like allowance (the headline control)');
  const original = free.likeLimit;
  const bump = await call('PATCH', `/admin/match-plans/${free.id}`, { likeLimit: 15, unlimited: false });
  ok('200', bump.status === 200, `(${bump.status})`);
  ok('the new free allowance is 15', bump.body.data?.likeLimit === 15, `(got ${bump.body.data?.likeLimit})`);

  // …and a plain user immediately sees the new number.
  const userRes = await fetch(`${BASE}/subscriptions/entitlement`, {
    headers: { Authorization: `Bearer ${tok(member)}` },
  });
  const userEnt = (await userRes.json()).data;
  ok('a user sees the raised limit right away', userEnt.limit === 15, `(got ${userEnt.limit})`);

  await call('PATCH', `/admin/match-plans/${free.id}`, { likeLimit: original, unlimited: false });
  ok(`restored the free allowance to ${original}`, true);

  console.log('\n3. Guards on the default plan');
  const priceAttempt = await call('PATCH', `/admin/match-plans/${free.id}`, { priceInr: 99 });
  const freeAfter = (await call('GET', '/admin/match-plans')).body.data.find((p) => p.isDefault);
  ok('the default plan stays free even if a price is sent', freeAfter.priceInr === 0, `(got ${freeAfter.priceInr})`);
  ok('…and the request itself still succeeds', priceAttempt.status === 200);

  const deact = await call('PATCH', `/admin/match-plans/${free.id}`, { active: false });
  ok('the default plan cannot be deactivated', deact.status === 400, `(${deact.status})`);

  const del = await call('DELETE', `/admin/match-plans/${free.id}`);
  ok('the default plan cannot be deleted', del.status === 400, `(${del.status})`);

  console.log('\n4. Creating a plan');
  const created = await call('POST', '/admin/match-plans', {
    name: 'QA Probe Plan', tagline: 'temporary', priceInr: 199, durationDays: 7,
    unlimited: false, likeLimit: 40, limitPeriod: 'day',
    features: ['40 likes a day', 'Seven days'], badge: 'QA', accentColor: '#123456', tier: 5,
  });
  ok('201', created.status === 201, `(${created.status}) ${created.body.message || ''}`);
  createdPlanId = created.body.data?.id;
  ok('price stored in rupees→paise correctly', created.body.data?.priceInr === 199);
  ok('like limit stored', created.body.data?.likeLimit === 40);
  ok('key slugified from the name', created.body.data?.key === 'qa_probe_plan', `(${created.body.data?.key})`);

  console.log('\n5. Unlimited toggle');
  const unlim = await call('PATCH', `/admin/match-plans/${createdPlanId}`, { unlimited: true });
  ok('unlimited clears the numeric cap', unlim.body.data?.likeLimit === null && unlim.body.data?.unlimited === true);
  const relim = await call('PATCH', `/admin/match-plans/${createdPlanId}`, { unlimited: false, likeLimit: 40 });
  ok('and it can be set back to a number', relim.body.data?.likeLimit === 40);

  console.log('\n6. Zero is a real limit, not "unlimited"');
  const zero = await call('PATCH', `/admin/match-plans/${createdPlanId}`, { unlimited: false, likeLimit: 0 });
  ok('likeLimit 0 survives', zero.body.data?.likeLimit === 0 && zero.body.data?.unlimited === false,
    `(limit ${zero.body.data?.likeLimit}, unlimited ${zero.body.data?.unlimited})`);
  await call('PATCH', `/admin/match-plans/${createdPlanId}`, { unlimited: false, likeLimit: 40 });

  console.log('\n7. Granting a plan to a user');
  const grant = await call('POST', '/admin/subscriptions/grant', {
    userId: String(member._id), planId: createdPlanId, note: 'QA probe',
  });
  ok('201', grant.status === 201, `(${grant.status}) ${grant.body.message || ''}`);
  ok('the grant is active', grant.body.data?.status === 'active');
  ok('a grant records ₹0, not the list price', grant.body.data?.priceInr === 0, `(got ${grant.body.data?.priceInr})`);
  const subId = grant.body.data?.id;

  const memberEnt = await (await fetch(`${BASE}/subscriptions/entitlement`, {
    headers: { Authorization: `Bearer ${tok(member)}` },
  })).json();
  ok('the user now has 40 likes', memberEnt.data.limit === 40, `(got ${memberEnt.data.limit})`);

  console.log('\n8. Subscriber list');
  const subs = await call('GET', '/admin/subscriptions?search=QA Member Probe');
  ok('200', subs.status === 200, `(${subs.status})`);
  ok('finds the granted subscription by user name', subs.body.data?.some((s) => s.id === subId));
  const row = subs.body.data.find((s) => s.id === subId);
  ok('the row carries the user', Boolean(row?.user?.name));
  ok('the row carries today\'s like usage', typeof row?.usedToday === 'number');
  ok('the row is flagged as gifted', row?.grantedByAdmin === true);

  console.log('\n9. Extend');
  const before = new Date(row.expiresAt).getTime();
  const ext = await call('POST', `/admin/subscriptions/${subId}/extend`, { days: 10 });
  ok('200', ext.status === 200, `(${ext.status})`);
  const delta = Math.round((new Date(ext.body.data.expiresAt).getTime() - before) / 86400000);
  ok('expiry moved out by 10 days', delta === 10, `(moved ${delta})`);

  console.log('\n10. Revoke drops the user back to free');
  const rev = await call('POST', `/admin/subscriptions/${subId}/revoke`, { reason: 'QA' });
  ok('200', rev.status === 200, `(${rev.status})`);
  const afterRevoke = await (await fetch(`${BASE}/subscriptions/entitlement`, {
    headers: { Authorization: `Bearer ${tok(member)}` },
  })).json();
  ok('back on the free plan', afterRevoke.data.isDefault === true);
  ok(`free limit restored (${original})`, afterRevoke.data.limit === original, `(got ${afterRevoke.data.limit})`);

  console.log('\n11. Stats');
  const stats = await call('GET', '/admin/subscriptions/stats');
  ok('200', stats.status === 200, `(${stats.status})`);
  ok('reports active subscribers', typeof stats.body.data?.activeSubscribers === 'number');
  ok('reports revenue', typeof stats.body.data?.revenueAllTimeInr === 'number');
  ok('reports likes sent today', typeof stats.body.data?.likesToday === 'number');

  console.log('\n12. Deleting a plan with no subscribers removes it');
  const delPlan = await call('DELETE', `/admin/match-plans/${createdPlanId}`);
  ok('200', delPlan.status === 200, `(${delPlan.status})`);
  ok('hard-deleted (nobody active on it)', delPlan.body.data?.deactivated === false, `(deactivated ${delPlan.body.data?.deactivated})`);
  const gone = await MatchPlan.findById(createdPlanId).lean();
  ok('row is gone from the database', gone === null);
  createdPlanId = null;

  console.log('\n13. Non-admins are refused');
  const asUser = await fetch(`${BASE}/admin/match-plans`, { headers: { Authorization: `Bearer ${tok(member)}` } });
  ok('a plain user gets 403', asUser.status === 403, `(${asUser.status})`);

  console.log('\n14. Every mutation was audited');
  const audits = await AuditLog.countDocuments({
    actorId: admin._id,
    action: { $regex: '^(match_plan|subscription)\\.' },
  });
  ok(`${audits} audit rows written`, audits >= 8, `(only ${audits})`);

  // ── cleanup ──
  if (createdPlanId) await MatchPlan.deleteOne({ _id: createdPlanId });
  await Promise.all([
    MatchPlan.deleteMany({ key: 'qa_probe_plan' }),
    UserSubscription.deleteMany({ userId: { $in: [admin._id, member._id] } }),
    LikeUsage.deleteMany({ userId: { $in: [admin._id, member._id] } }),
    AuditLog.deleteMany({ actorId: admin._id }),
    User.deleteMany({ _id: { $in: [admin._id, member._id] } }),
  ]);
  console.log('\nCleaned up.');

  console.log(`\n${'='.repeat(48)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(48)}`);
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
