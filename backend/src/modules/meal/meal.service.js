import { ApiError } from '../../utils/ApiError.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { MealPlan, Meal, MealAccount, MealOrder } from './meal.models.js';

const toPaise = (rupees) => Math.round(rupees * 100);

// Server-side catalog for per-item customisation — mirrors MealDashboard.jsx's
// picker exactly, so the price the modal shows is the price actually charged
// (customisationId used to be accepted from the client and silently dropped).
export const MEAL_CUSTOMISATIONS = {
  c1: { name: 'Standard Portion', price: 0 },
  c2: { name: 'Extra Meat', price: 120 },
  c3: { name: 'Extra Veggies', price: 60 },
  c4: { name: 'Premium Broth', price: 90 },
};

export async function getAccount(userId) {
  let account = await MealAccount.findOne({ userId });
  if (!account) account = await MealAccount.create({ userId });
  return account;
}

/**
 * Buy a prepaid package. Credits land when the payment is confirmed
 * (purpose `subscription` in the shared dispatcher).
 */
export async function purchasePackage(user, planLegacyId) {
  const plan = await MealPlan.findOne({ legacyId: planLegacyId, active: true });
  if (!plan) throw ApiError.badRequest('Plan not found');

  const order = await MealOrder.create({
    userId: user.id,
    providerId: plan.providerId || null,
    type: 'package',
    items: [
      {
        mealId: null,
        name: `${plan.name} (${plan.mealsPerWeek} Meals)`,
        quantity: 1,
        price: plan.pricePerMonth,
      },
    ],
    total: toPaise(plan.pricePerMonth),
    mealsAdded: plan.mealsPerWeek,
    status: 'pending_payment',
    deliveryTime: 'Prepaid Balance Added',
  });

  const payment = await createPaymentOrder(user, 'subscription', {
    mealOrderId: order.id,
  });
  order.paymentId = payment.paymentId;
  await order.save();
  return { order, razorpay: payment };
}

registerPurposeHandler('subscription', {
  computeAmount: async (user, payload) => {
    const order = await MealOrder.findOne({
      _id: payload.mealOrderId,
      userId: user.id,
      status: 'pending_payment',
    });
    if (!order) throw ApiError.badRequest('Order not found or already paid');
    return { amountPaise: order.total, refId: order.id };
  },
  onPaid: async (payment) => {
    // Verify + webhook both run this; the guarded update decides the winner.
    const order = await MealOrder.findOne({ _id: payment.refId, status: 'pending_payment' });
    if (!order) return; // already fulfilled
    const newStatus = order.type === 'package' ? 'Active' : 'Preparing';
    const res = await MealOrder.updateOne(
      { _id: order.id, status: 'pending_payment' },
      { $set: { status: newStatus } }
    );
    if (res.modifiedCount === 0) return; // lost the race — other path fulfilled
    if (order.type === 'package') {
      await MealAccount.updateOne(
        { userId: order.userId },
        {
          $inc: { balance: order.mealsAdded },
          $set: { status: 'active' },
        },
        { upsert: true }
      );
    }
    await recordMealLedger(order);
  },
});

/** Post the meal provider's commission when a meal order is paid. Best-effort. */
async function recordMealLedger(order) {
  if (!order.providerId || !order.total) return;
  try {
    const { postLedgerEntry } = await import('../vendor/vendor.service.js');
    const { VendorProfile } = await import('../vendor/vendor.models.js');
    const profile = await VendorProfile.findOne({ userId: order.providerId });
    await postLedgerEntry({
      vendorId: order.providerId,
      refType: 'subscription',
      refId: order._id,
      label: `Meal order ${order.orderNo}`,
      gross: order.total,
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch {
    // ledger is best-effort
  }
}

/** Order menu meals using prepaid credits — atomic balance deduction. */
export async function orderWithPrepaid(user, lines) {
  const meals = await Meal.find({ legacyId: { $in: lines.map((l) => l.mealId) }, active: true });
  const byId = new Map(meals.map((m) => [m.legacyId, m]));
  const items = lines.map((l) => {
    const meal = byId.get(l.mealId);
    if (!meal) throw ApiError.badRequest(`Unknown meal: ${l.mealId}`);
    // Credit-based — a customisation never changes what's deducted, but its
    // name still rides along as a real kitchen note instead of being dropped.
    const custom = MEAL_CUSTOMISATIONS[l.customisationId];
    return {
      mealId: meal.legacyId,
      name: custom && custom.name !== 'Standard Portion' ? `${meal.name} (${custom.name})` : meal.name,
      quantity: l.qty,
      price: 0,
    };
  });
  const creditsNeeded = items.reduce((s, i) => s + i.quantity, 0);

  const res = await MealAccount.updateOne(
    { userId: user.id, balance: { $gte: creditsNeeded } },
    { $inc: { balance: -creditsNeeded } }
  );
  if (res.modifiedCount === 0) {
    throw ApiError.badRequest('Not enough prepaid meals. Please purchase a new plan.');
  }

  return MealOrder.create({
    userId: user.id,
    providerId: meals[0]?.providerId || null,
    type: 'prepaid',
    items,
    total: 0,
    mealsUsed: creditsNeeded,
    status: 'Preparing',
    deliveryTime: 'Today, in 45 mins',
  });
}

/** À-la-carte order — server-priced, paid via Razorpay. */
export async function orderALaCarte(user, lines) {
  const meals = await Meal.find({ legacyId: { $in: lines.map((l) => l.mealId) }, active: true });
  const byId = new Map(meals.map((m) => [m.legacyId, m]));
  const items = lines.map((l) => {
    const meal = byId.get(l.mealId);
    if (!meal) throw ApiError.badRequest(`Unknown meal: ${l.mealId}`);
    // Server-priced, same as the base meal — the customisation surcharge the
    // modal shows is now what's actually charged, not just displayed.
    const custom = MEAL_CUSTOMISATIONS[l.customisationId] || MEAL_CUSTOMISATIONS.c1;
    return {
      mealId: meal.legacyId,
      name: custom.name !== 'Standard Portion' ? `${meal.name} (${custom.name})` : meal.name,
      quantity: l.qty,
      price: meal.price + custom.price,
    };
  });
  const totalRupees = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await MealOrder.create({
    userId: user.id,
    providerId: meals[0]?.providerId || null,
    type: 'a_la_carte',
    items,
    total: toPaise(totalRupees),
    status: 'pending_payment',
    deliveryTime: 'Today, in 45 mins',
  });

  const payment = await createPaymentOrder(user, 'subscription', { mealOrderId: order.id });
  order.paymentId = payment.paymentId;
  await order.save();
  return { order, razorpay: payment };
}

/** The (single) meal provider that owns the seeded catalog, for unplanned orders. */
async function primaryMealProviderId() {
  const plan = await MealPlan.findOne({ providerId: { $ne: null } }).select('providerId');
  return plan?.providerId || null;
}

/** One-time free trial claim. */
export async function claimTrial(user, contact) {
  const account = await getAccount(user.id);
  if (account.freeTrialClaimed) throw ApiError.badRequest('Free trial already claimed');
  account.freeTrialClaimed = true;
  await account.save();

  return MealOrder.create({
    userId: user.id,
    providerId: await primaryMealProviderId(),
    type: 'trial',
    items: [{ mealId: null, name: 'Free Trial Meal', quantity: 1, price: 0 }],
    total: 0,
    status: 'Preparing',
    deliveryTime: 'Today, in 45 mins',
    contact,
  });
}

export async function listOrders(userId) {
  return MealOrder.find({ userId, status: { $ne: 'pending_payment' } })
    .sort({ createdAt: -1 })
    .limit(100);
}

export async function updateAllergies(userId, allergies) {
  const account = await getAccount(userId);
  account.allergies = allergies;
  await account.save();
  return account;
}

export async function pause(userId, { from, till, reason }) {
  const account = await getAccount(userId);
  if (account.status !== 'active') throw ApiError.badRequest('No active plan to pause');
  const today = new Date().toISOString().slice(0, 10);
  if (from && from < today) throw ApiError.badRequest('Pause cannot start in the past');
  if (till && from && till < from) throw ApiError.badRequest('Invalid pause window');
  account.status = 'paused';
  account.pause = { from: from || today, till: till || null, reason: reason || null };
  await account.save();
  return account;
}

export async function resume(userId) {
  const account = await getAccount(userId);
  if (account.status !== 'paused') throw ApiError.badRequest('Plan is not paused');
  account.status = 'active';
  account.pause = { from: null, till: null, reason: null };
  await account.save();
  return account;
}
