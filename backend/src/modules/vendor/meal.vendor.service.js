import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { emitToUser, getIO } from '../../sockets/index.js';
import { notify } from '../../services/notify.js';
import { MealPlan, MealOrder } from '../meal/meal.models.js';
import { User } from '../user/user.model.js';

/* ── Plans (scoped to providerId) ─────────────────────────── */

export function toVendorPlan(p) {
  const m = p.meta || {};
  return {
    id: String(p._id),
    _id: String(p._id),
    name: p.name,
    petType: m.petType || 'Dog',
    mealType: m.mealType || 'Fresh Cooked',
    qty: m.qty || '',
    calories: m.calories || '',
    protein: m.protein || '',
    duration: m.duration || 'Monthly',
    price: p.pricePerMonth,
    status: p.active ? 'Active' : 'Inactive',
    image: p.img || null,
  };
}

export async function listPlans(providerId) {
  const plans = await MealPlan.find({ providerId, deletedAt: null }).sort({ createdAt: -1 });
  return plans.map(toVendorPlan);
}

export async function createPlan(providerId, body) {
  const plan = await MealPlan.create({
    providerId,
    name: body.name,
    pricePerMonth: Number(body.price) || 0,
    mealsPerWeek: Number(body.mealsPerWeek) || 7,
    img: body.image || '',
    active: body.status ? body.status === 'Active' : true,
    meta: {
      petType: body.petType,
      mealType: body.mealType,
      qty: body.qty,
      calories: body.calories,
      protein: body.protein,
      duration: body.duration,
    },
  });
  await invalidate('meals:*');
  return toVendorPlan(plan);
}

async function ownedPlan(providerId, id) {
  const plan = await MealPlan.findOne({ _id: id, providerId });
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
}

export async function updatePlan(providerId, id, body) {
  const plan = await ownedPlan(providerId, id);
  if (body.name != null) plan.name = body.name;
  if (body.price != null) plan.pricePerMonth = Number(body.price);
  if (body.image != null) plan.img = body.image;
  if (body.status != null) plan.active = body.status === 'Active';
  plan.meta = {
    ...plan.meta,
    ...['petType', 'mealType', 'qty', 'calories', 'protein', 'duration'].reduce((acc, k) => {
      if (body[k] != null) acc[k] = body[k];
      return acc;
    }, {}),
  };
  plan.markModified('meta');
  await plan.save();
  await invalidate('meals:*');
  return toVendorPlan(plan);
}

export async function deletePlan(providerId, id) {
  const plan = await ownedPlan(providerId, id);
  plan.active = false;
  plan.deletedAt = new Date();
  await plan.save();
  await invalidate('meals:*');
}

/* ── Subscriptions / trials (from MealOrder) ──────────────── */

const SUB_STATUS = { Active: 'Active', Preparing: 'Active', Delivered: 'Active', Cancelled: 'Expired' };

async function customerName(userId) {
  const u = await User.findById(userId).select('name');
  return u?.name || 'Customer';
}

export async function listSubscriptions(providerId) {
  const orders = await MealOrder.find({ providerId, type: { $in: ['package', 'prepaid'] }, status: { $ne: 'pending_payment' } })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name');
  return orders.map((o) => ({
    id: o.orderNo,
    _id: String(o._id),
    customer: o.userId?.name || 'Customer',
    pet: '',
    plan: o.items?.[0]?.name || 'Meal Plan',
    startDate: o.createdAt,
    mealsPerDay: 2,
    status: o.status === 'Paused' ? 'Paused' : SUB_STATUS[o.status] || 'Active',
    payment: o.type === 'package' ? 'Paid' : 'Prepaid',
  }));
}

const SUB_PREV_STATUS = ['Active', 'Preparing', 'Out for Delivery', 'Delivered'];

/** Vendor-side pause/resume — scoped to this vendor's own subscription order. */
export async function pauseVendorSubscription(providerId, id, resume) {
  const order = await MealOrder.findOne({ _id: id, providerId, type: { $in: ['package', 'prepaid'] } });
  if (!order) throw ApiError.notFound('Subscription not found');
  if (resume) {
    if (order.status !== 'Paused') throw ApiError.badRequest('Subscription is not paused');
    order.status = 'Active';
  } else {
    if (!SUB_PREV_STATUS.includes(order.status)) throw ApiError.badRequest(`Cannot pause a ${order.status} subscription`);
    order.status = 'Paused';
  }
  await order.save();
  return { _id: String(order._id), status: order.status };
}

export async function cancelVendorSubscription(providerId, id) {
  const order = await MealOrder.findOne({ _id: id, providerId, type: { $in: ['package', 'prepaid'] } });
  if (!order) throw ApiError.notFound('Subscription not found');
  if (order.status === 'Cancelled') throw ApiError.badRequest('Already cancelled');
  order.status = 'Cancelled';
  await order.save();
  return { _id: String(order._id), status: order.status };
}

export async function listTrials(providerId) {
  const orders = await MealOrder.find({ providerId, type: 'trial' })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name');
  return orders.map((o) => ({
    id: o.orderNo,
    _id: String(o._id),
    customer: o.userId?.name || o.contact?.name || 'Customer',
    pet: o.contact?.petName || '',
    mobile: o.contact?.phone || '',
    status: o.status,
    requestedDate: o.createdAt,
  }));
}

/* ── Kitchen queue + deliveries ───────────────────────────── */

const ACTIVE_DELIVERY = ['Preparing', 'Out for Delivery'];
const DELIVERY_NEXT = {
  Preparing: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
};

export async function kitchenQueue(providerId) {
  const orders = await MealOrder.find({ providerId, status: 'Preparing' }).limit(200);
  const byPlan = new Map();
  for (const o of orders) {
    const key = o.items?.[0]?.name || 'Meal';
    byPlan.set(key, (byPlan.get(key) || 0) + (o.items?.reduce((s, i) => s + i.quantity, 0) || 1));
  }
  return [...byPlan.entries()].map(([type, qty], i) => ({
    id: `KQ-${i + 1}`,
    type,
    qty,
    notes: '',
    assigned: 'Unassigned',
    status: 'Preparing',
    timer: '45 mins',
  }));
}

export async function listDeliveries(providerId) {
  const orders = await MealOrder.find({ providerId, status: { $in: [...ACTIVE_DELIVERY, 'Delivered'] } })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate('userId', 'name');
  return orders.map((o) => ({
    id: `DEL-${o.orderNo}`,
    _id: String(o._id),
    orderId: o.orderNo,
    customer: o.userId?.name || 'Customer',
    plan: o.items?.[0]?.name || 'Meal',
    // MealOrder does not capture a delivery address today — only a delivery
    // time window. Named honestly rather than mislabelled as "address".
    deliveryTime: o.deliveryTime || '',
    status: o.status,
  }));
}

export async function updateDeliveryStatus(providerId, id, target) {
  const order = await MealOrder.findOne({ _id: id, providerId });
  if (!order) throw ApiError.notFound('Delivery not found');
  const allowed = DELIVERY_NEXT[order.status] || [];
  if (!allowed.includes(target)) throw ApiError.badRequest(`Cannot move delivery from ${order.status} to ${target}`);
  order.status = target;
  await order.save();
  notify(order.userId, {
    title: 'Meal Delivery Update',
    body: target === 'Delivered' ? 'Your fresh meal has been delivered. Enjoy!' : 'Your meal is out for delivery!',
    type: 'system',
    link: '/app/meals',
    data: { orderId: String(order._id), status: target },
  }).catch(() => {});
  return { _id: String(order._id), status: order.status };
}

/** Broadcast a rider's live location to the customer + a delivery room. */
export async function broadcastRiderLocation(providerId, id, { lat, lng, eta }) {
  const order = await MealOrder.findOne({ _id: id, providerId }).select('userId');
  if (!order) throw ApiError.notFound('Delivery not found');
  const payload = { orderId: id, lat, lng, eta: eta || null, at: Date.now() };
  try {
    getIO()?.to(`delivery:${id}`).emit('delivery:location', payload);
  } catch {
    // socket layer not ready — ignore
  }
  emitToUser(order.userId, 'delivery:location', payload);
  return payload;
}
