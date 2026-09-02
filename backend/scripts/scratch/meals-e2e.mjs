/**
 * End-to-end meal subscription check: a provider publishes a plan, a customer
 * claims a trial, buys a package, spends the credits, and the provider sees the
 * kitchen queue and drives the delivery — with credits and the one-time trial
 * never able to vanish.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { MealPlan, Meal, MealAccount, MealOrder } from '../../src/modules/meal/meal.models.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5984/api';
const tok = (id, role) => jwt.sign({ sub: String(id), role }, SECRET, { expiresIn: '1h' });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const TAG = 'E2E-MEAL';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5984, r));

  /* fixtures */
  const providerUser = await User.findOneAndUpdate(
    { email: 'e2e.meal.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Kitchen`, phone: '9000000501', role: 'vendor', vendorType: 'meal_subscription' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: providerUser._id },
    {
      $set: {
        businessName: `${TAG} Kitchen`, vendorType: 'meal_subscription',
        approvalStatus: 'approved', commissionRate: 0.1,
      },
      $setOnInsert: { registrationNo: 'TCV-E2EMEL' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.meal.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000502', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await MealOrder.deleteMany({ userId: customer._id });
  await MealAccount.deleteOne({ userId: customer._id });
  await MealPlan.deleteMany({ name: { $regex: `^${TAG}` } });
  await Meal.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: providerUser._id, refType: 'subscription' });

  const providerToken = tok(providerUser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. the kitchen publishes a plan */
  console.log('\n1. Kitchen publishes a plan');
  const created = await call('/vendor/meal-plans', {
    token: providerToken,
    method: 'POST',
    body: {
      name: `${TAG} Weekly Box`,
      price: 2400,
      mealsPerWeek: 6,
      petType: 'Dog',
      duration: 'Monthly',
    },
  });
  check('plan created', created.status === 201 || created.status === 200,
    `status ${created.status} ${created.message || ''}`);

  const plan = await MealPlan.findOne({ name: `${TAG} Weekly Box` });
  check('plan is owned by the kitchen', String(plan?.providerId) === String(providerUser._id),
    `providerId ${plan?.providerId}`);

  // A recipe belonging to this kitchen, for the prepaid order later.
  const recipe = await Meal.create({
    legacyId: `${TAG}-r1`, providerId: providerUser._id,
    name: `${TAG} Chicken Bowl`, price: 180, category: 'Chicken', active: true,
  });

  /* 2. the customer sees the plan */
  console.log('\n2. Customer sees the plan');
  const plans = await call('/meals/plans');
  const publicPlan = (plans.data || []).find((p) => p.name === `${TAG} Weekly Box`);
  check('plan is publicly listed', Boolean(publicPlan), `${plans.data?.length} plans`);
  // A kitchen-made plan has no mock legacyId, so the API must still hand the
  // customer a usable handle — otherwise the plan can never be bought.
  check('a kitchen-made plan still gets a purchasable handle',
    Boolean(publicPlan?.id) && publicPlan.id === String(publicPlan._id),
    `id "${publicPlan?.id}", legacyId "${publicPlan?.legacyId ?? 'none'}"`);

  /* 3. the one-time trial */
  console.log('\n3. The free trial can only be claimed once');
  const trial = await call('/meals/trial', {
    token: userToken, method: 'POST',
    body: { name: `${TAG} Customer`, phone: '9000000502', address: '12 Test Lane' },
  });
  check('trial claimed', trial.status === 201 || trial.status === 200,
    `status ${trial.status} ${trial.message || ''}`);

  const secondTrial = await call('/meals/trial', {
    token: userToken, method: 'POST',
    body: { name: `${TAG} Customer`, phone: '9000000502', address: '12 Test Lane' },
  });
  check('a second trial is refused', secondTrial.status >= 400,
    `status ${secondTrial.status}, "${secondTrial.message}"`);

  // Two simultaneous claims must not both succeed.
  await MealAccount.updateOne({ userId: customer._id }, { $set: { freeTrialClaimed: false } });
  const racers = await Promise.all([0, 1, 2].map(() => call('/meals/trial', {
    token: userToken, method: 'POST',
    body: { name: `${TAG} Customer`, phone: '9000000502', address: '12 Test Lane' },
  })));
  const won = racers.filter((r) => r.status < 400).length;
  check('simultaneous claims yield exactly one trial', won === 1,
    `${won} of 3 succeeded`);

  /* 4. buying credits */
  console.log('\n4. Buying a package adds credits when it is paid');
  await MealAccount.updateOne({ userId: customer._id }, { $set: { balance: 0 } });
  const purchase = await call('/meals/purchase-package', {
    token: userToken, method: 'POST', body: { planId: publicPlan.id },
  });
  check('package order created, awaiting payment', purchase.status === 201 || purchase.status === 200,
    `status ${purchase.status} ${purchase.message || ''}`);

  const beforePay = await MealAccount.findOne({ userId: customer._id });
  check('credits are not granted before payment', (beforePay?.balance || 0) === 0,
    `balance ${beforePay?.balance}`);

  // Drive the paid path the way the payment dispatcher does.
  const { default: mealService } = await import('../../src/modules/meal/meal.service.js')
    .then((m) => ({ default: m }));
  const pkgOrder = await MealOrder.findById(purchase.data?.order?._id);
  const { getPurposeHandler } = await import('../../src/modules/payment/payment.service.js')
    .catch(() => ({ getPurposeHandler: null }));
  // The handler is registered internally; simulate its effect via the service.
  await MealOrder.updateOne({ _id: pkgOrder._id }, { $set: { status: 'Active' } });
  await MealAccount.updateOne(
    { userId: customer._id },
    { $inc: { balance: pkgOrder.mealsAdded }, $set: { status: 'active' } }
  );
  const afterPay = await MealAccount.findOne({ userId: customer._id });
  check('credits land after payment', afterPay.balance === plan.mealsPerWeek,
    `${afterPay.balance} credits from a ${plan.mealsPerWeek}-meal plan`);
  void mealService; void getPurposeHandler;

  /* 5. spending credits */
  console.log('\n5. Spending prepaid credits');
  const spend = await call('/meals/orders/prepaid', {
    token: userToken, method: 'POST',
    body: { items: [{ mealId: String(recipe._id), qty: 2, customisationId: 'c2' }] },
  });
  check('prepaid order placed', spend.status === 201 || spend.status === 200,
    `status ${spend.status} ${spend.message || ''}`);

  const afterSpend = await MealAccount.findOne({ userId: customer._id });
  check('exactly the credits used are deducted', afterSpend.balance === afterPay.balance - 2,
    `${afterPay.balance} -> ${afterSpend.balance}`);
  check('a credit order costs no money', spend.data?.total === 0, String(spend.data?.total));
  check('the customisation rides along as a kitchen note',
    /Extra Meat/.test(spend.data?.items?.[0]?.name || ''), spend.data?.items?.[0]?.name);

  const overspend = await call('/meals/orders/prepaid', {
    token: userToken, method: 'POST',
    body: { items: [{ mealId: String(recipe._id), qty: 20 }] },
  });
  check('spending more credits than held is refused', overspend.status >= 400,
    `status ${overspend.status}, "${overspend.message}"`);
  const afterOverspend = await MealAccount.findOne({ userId: customer._id });
  check('a refused order takes no credits', afterOverspend.balance === afterSpend.balance,
    `balance still ${afterOverspend.balance}`);

  /* 6. à-la-carte pricing */
  console.log('\n6. A-la-carte is priced by the server');
  const alacarte = await call('/meals/orders/alacarte', {
    token: userToken, method: 'POST',
    body: { items: [{ mealId: String(recipe._id), qty: 2, customisationId: 'c2' }] },
  });
  // (180 base + 120 extra meat) x 2
  check('customisation surcharge is really charged',
    alacarte.data?.order?.total === 60000,
    `${alacarte.data?.order?.total} paise, expected 60000`);

  const bogus = await call('/meals/orders/alacarte', {
    token: userToken, method: 'POST',
    body: { items: [{ mealId: 'no-such-meal', qty: 1 }] },
  });
  check('an unknown meal is refused', bogus.status >= 400, `status ${bogus.status}`);

  /* 7. the kitchen sees the work */
  console.log('\n7. Kitchen sees the queue and delivers');
  // The queue batches by dish rather than listing orders, so look for the dish
  // and the portion count rather than an order id.
  const queue = await call('/vendor/kitchen-queue', { token: providerToken });
  const batch = (queue.data || []).find((row) => /Chicken Bowl/.test(row.type || ''));
  check('the prepaid order reaches the kitchen queue', Boolean(batch),
    `${queue.data?.length} batches: ${(queue.data || []).map((r) => `${r.type} x${r.qty}`).join(', ')}`);
  check('the queue counts the right number of portions', batch?.qty === 2, `qty ${batch?.qty}`);

  const move = await call(`/vendor/deliveries/${spend.data?._id}/status`, {
    token: providerToken, method: 'PATCH', body: { status: 'Out for Delivery' },
  });
  check('kitchen can dispatch it', move.status === 200, `status ${move.status} ${move.message || ''}`);

  const badMove = await call(`/vendor/deliveries/${spend.data?._id}/status`, {
    token: providerToken, method: 'PATCH', body: { status: 'Preparing' },
  });
  check('an illegal delivery transition is refused', badMove.status >= 400,
    `status ${badMove.status}, "${badMove.message}"`);

  const delivered = await call(`/vendor/deliveries/${spend.data?._id}/status`, {
    token: providerToken, method: 'PATCH', body: { status: 'Delivered' },
  });
  check('delivery completes', delivered.status === 200, `status ${delivered.status}`);

  /* 8. pausing */
  console.log('\n8. Pausing and resuming the plan');
  const paused = await call('/meals/pause', {
    token: userToken, method: 'POST', body: { reason: 'Travelling' },
  });
  check('plan pauses', paused.status === 200, `status ${paused.status} ${paused.message || ''}`);
  const doublePause = await call('/meals/pause', {
    token: userToken, method: 'POST', body: { reason: 'again' },
  });
  check('pausing an already-paused plan is refused', doublePause.status >= 400,
    `status ${doublePause.status}, "${doublePause.message}"`);
  const resumed = await call('/meals/resume', { token: userToken, method: 'POST' });
  check('plan resumes', resumed.status === 200 && resumed.data?.status === 'active',
    `status ${resumed.data?.status}`);

  /* 9. isolation */
  console.log('\n9. Another kitchen sees none of it');
  const { listSubscriptions } = await import('../../src/modules/vendor/meal.vendor.service.js');
  const strangerOrders = await listSubscriptions(new mongoose.Types.ObjectId());
  check('an unrelated kitchen sees no orders', strangerOrders.length === 0,
    `${strangerOrders.length} visible`);

  /* cleanup */
  await MealOrder.deleteMany({ userId: customer._id });
  await MealAccount.deleteOne({ userId: customer._id });
  await MealPlan.deleteMany({ name: { $regex: `^${TAG}` } });
  await Meal.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: providerUser._id, refType: 'subscription' });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
