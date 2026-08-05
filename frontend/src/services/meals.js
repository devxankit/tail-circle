import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Meals service — replaces `mealData.js` and the localStorage prepaid state
 * (`mealBalance`, `freeTrialClaimed`, `user_meal_orders`,
 * `meal_subscription_plans`, `user_meal_allergies`, `mealSubscription`).
 * Shapes mirror the mock exactly so the screens render identically.
 */

export async function fetchMealPlans() {
  const { data } = await api.get('/meals/plans');
  return data.map((p) => ({
    id: p.legacyId,
    name: p.name,
    mealsCount: p.mealsCount,
    pricePerMonth: p.pricePerMonth,
    pricePerMeal: p.pricePerMeal,
    mealsPerWeek: p.mealsPerWeek,
    features: p.features || [],
    badge: p.badge,
    saveText: p.saveText,
    bgColor: p.bgColor,
    borderColor: p.borderColor,
    textColor: p.textColor,
    buttonBg: p.buttonBg,
    img: p.img,
  }));
}

export async function fetchMeals() {
  const { data } = await api.get('/meals/recipes');
  return data.map((m) => ({
    id: m.legacyId,
    name: m.name,
    description: m.description,
    protein: m.protein,
    tag: m.tag,
    features: m.features || [],
    img: m.img,
    category: m.category,
    price: m.price,
    rating: m.rating,
    reviews: m.reviews,
    filterTags: m.filterTags || [],
  }));
}

export async function fetchMealAccount() {
  const { data } = await api.get('/meals/account');
  return data;
}

const TYPE_LABEL = {
  package: 'Package Purchase',
  prepaid: 'Prepaid Deduction',
  a_la_carte: 'a_la_carte',
  trial: 'Free Trial',
};

export async function fetchMealOrders() {
  const { data } = await api.get('/meals/orders');
  return data.map((o) => ({
    id: o.orderNo,
    _id: o._id,
    type: TYPE_LABEL[o.type] || o.type,
    items: (o.items || []).map((i) => ({
      id: i.mealId || 'pkg',
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
    total: Math.round((o.total || 0) / 100),
    date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: o.status,
    deliveryTime: o.deliveryTime,
  }));
}

/** Buy a prepaid package (opens the Razorpay sheet). */
export async function purchasePackage(planId, planName) {
  const { data } = await api.post('/meals/purchase-package', { planId });
  if (data.razorpay) {
    await payWithRazorpay(data.razorpay, { description: `Meal package — ${planName || planId}` });
  }
  return data.order;
}

/** Order menu meals with prepaid credits. */
export async function orderPrepaid(items) {
  const { data } = await api.post('/meals/orders/prepaid', { items });
  return data;
}

/** À-la-carte order paid via Razorpay. */
export async function orderALaCarte(items) {
  const { data } = await api.post('/meals/orders/alacarte', { items });
  if (data.razorpay) {
    await payWithRazorpay(data.razorpay, { description: 'Fresh meal order' });
  }
  return data.order;
}

export async function claimFreeTrial(form) {
  const { data } = await api.post('/meals/trial', form);
  return data;
}

export async function updateMealAllergies(allergies) {
  const { data } = await api.patch('/meals/allergies', { allergies });
  return data;
}

export async function pauseMealPlan(payload = {}) {
  const { data } = await api.post('/meals/pause', payload);
  return data;
}

export async function resumeMealPlan() {
  const { data } = await api.post('/meals/resume');
  return data;
}
