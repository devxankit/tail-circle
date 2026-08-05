/**
 * Phase 5 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase5-check.js
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { MealAccount, MealOrder } from '../src/modules/meal/meal.models.js';
import { Payment } from '../src/modules/payment/payment.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const json = (res) => res.json().catch(() => ({}));
const authed = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

await mongoose.connect(env.mongoUri);
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('otp:*');
await invalidate('meals:*');

async function loginAs(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    codeHash: await bcrypt.hash('1234', 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: rawPhone, code: '1234' }),
  });
  return (await json(res)).data;
}

const PHONE = '9999900010';
{
  const u = await User.findOne({ phone: normalizePhone(PHONE) });
  if (u) {
    await MealAccount.deleteMany({ userId: u._id });
    await MealOrder.deleteMany({ userId: u._id });
    await Payment.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
}
const a = await loginAs(PHONE);

async function payFor(razorpay, token) {
  const payId = `pay_p5_${Date.now()}`;
  const sig = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpay.razorpayOrderId}|${payId}`)
    .digest('hex');
  await fetch(`${BASE}/payments/verify`, {
    method: 'POST',
    headers: authed(token),
    body: JSON.stringify({ razorpayOrderId: razorpay.razorpayOrderId, razorpayPaymentId: payId, signature: sig }),
  });
}

// ── 1. Catalog ───────────────────────────────────────────
const plans = await json(await fetch(`${BASE}/meals/plans`));
check('3 meal plans seeded', plans.data?.length === 3 && plans.data[0].legacyId === 'starter');
const recipes = await json(await fetch(`${BASE}/meals/recipes`));
check('10 recipes seeded (7 dog / 3 cat)', recipes.data?.length === 10 && recipes.data.filter((m) => m.category === 'Cat').length === 3);

// ── 2. Account starts empty ──────────────────────────────
const account0 = await json(await fetch(`${BASE}/meals/account`, { headers: authed(a.accessToken) }));
check('fresh account: 0 balance, trial unclaimed', account0.data?.balance === 0 && account0.data?.freeTrialClaimed === false);

// ── 3. Package purchase → credits on payment ─────────────
const pkg = await json(
  await fetch(`${BASE}/meals/purchase-package`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ planId: 'starter' }),
  })
);
check('package order pending + gateway order (₹2490)', pkg.data?.order?.status === 'pending_payment' && pkg.data?.order?.total === 249000 && pkg.data?.razorpay?.razorpayOrderId?.startsWith('order_'));

const balBefore = (await json(await fetch(`${BASE}/meals/account`, { headers: authed(a.accessToken) }))).data.balance;
check('no credits before payment', balBefore === 0);

await payFor(pkg.data.razorpay, a.accessToken);
const account1 = await json(await fetch(`${BASE}/meals/account`, { headers: authed(a.accessToken) }));
check('payment credits 10 meals + activates plan', account1.data?.balance === 10 && account1.data?.status === 'active');

// ── 4. Prepaid ordering ──────────────────────────────────
const prepaid = await json(
  await fetch(`${BASE}/meals/orders/prepaid`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ items: [{ mealId: 'd1', qty: 2 }] }),
  })
);
check('prepaid order deducts credits', prepaid.data?.status === 'Preparing' && prepaid.data?.mealsUsed === 2);
const account2 = await json(await fetch(`${BASE}/meals/account`, { headers: authed(a.accessToken) }));
check('balance now 8', account2.data?.balance === 8);

const tooMany = await json(
  await fetch(`${BASE}/meals/orders/prepaid`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ items: [{ mealId: 'd1', qty: 20 }] }),
  })
);
check('insufficient balance rejected', tooMany.success === false && /prepaid/i.test(tooMany.message || ''));

// ── 5. À-la-carte (server-priced) ────────────────────────
const alc = await json(
  await fetch(`${BASE}/meals/orders/alacarte`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ items: [{ mealId: 'd1', qty: 2 }, { mealId: 'c1', qty: 1 }] }),
  })
);
// d1 189×2 + c1 229 = 607 → 60700
check('à-la-carte server-priced (189×2+229)', alc.data?.order?.total === 60700, `total=${alc.data?.order?.total}`);
await payFor(alc.data.razorpay, a.accessToken);
const orders = await json(await fetch(`${BASE}/meals/orders`, { headers: authed(a.accessToken) }));
const alcRow = orders.data?.find((o) => o._id === alc.data.order._id);
check('paid à-la-carte order → Preparing', alcRow?.status === 'Preparing');

// ── 6. Trial (one-time) ──────────────────────────────────
const trial = await json(
  await fetch(`${BASE}/meals/trial`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ name: 'Test', phone: '9876543210', address: '12 Meal Lane, Indore' }),
  })
);
check('free trial claimed', trial.data?.type === 'trial');
const trial2 = await fetch(`${BASE}/meals/trial`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ name: 'Test', phone: '9876543210', address: '12 Meal Lane, Indore' }),
});
check('second trial claim rejected', trial2.status === 400);

// ── 7. Allergies + pause/resume ──────────────────────────
const allergies = await json(
  await fetch(`${BASE}/meals/allergies`, {
    method: 'PATCH',
    headers: authed(a.accessToken),
    body: JSON.stringify({ allergies: ['Chicken', 'Grain'] }),
  })
);
check('allergies persist', allergies.data?.allergies?.length === 2);

const paused = await json(
  await fetch(`${BASE}/meals/pause`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ till: '2099-01-31' }),
  })
);
check('pause plan', paused.data?.status === 'paused' && paused.data?.pause?.till === '2099-01-31');
const resumed = await json(
  await fetch(`${BASE}/meals/resume`, { method: 'POST', headers: authed(a.accessToken) })
);
check('resume plan', resumed.data?.status === 'active');

// ── 8. Orders list shape ─────────────────────────────────
check(
  'orders list: package + prepaid + alacarte + trial, no pendings',
  orders.data?.length >= 3 && orders.data.every((o) => o.status !== 'pending_payment')
);

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
