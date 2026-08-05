import { MealPlan, MealOrder, MealAccount } from '../meal/meal.models.js';
import { VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { User } from '../user/user.model.js';

const rupees = (paise) => Math.round((paise || 0) / 100);
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const STATUS_LABEL = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');

/**
 * Cross-vendor meal-ops super-admin snapshot (MealPortalAdmin). Aggregates the
 * real Phase 5 meal models + Phase 9 meal vendors into the six datasets the
 * portal renders — replacing the `tailcircle_super_admin_meal_state` localStorage.
 */
export async function getMealPortalData() {
  const [
    revenueAgg, activeSubs, deliveriesToday, mealVendors, statusCounts, pendingTrials,
    plans, subs, deliveries, trials, ledger,
  ] = await Promise.all([
    MealOrder.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    MealAccount.countDocuments({ status: 'active' }),
    MealOrder.countDocuments({ createdAt: { $gte: startOfDay() } }),
    VendorProfile.find({ vendorType: 'meal_subscription' }).select('userId businessName city approvalStatus rating'),
    MealOrder.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    MealOrder.countDocuments({ type: 'trial', status: { $in: ['pending', 'placed'] } }),
    MealPlan.find({ deletedAt: null }).sort({ sort: 1 }).limit(100),
    MealOrder.find({ type: 'package' }).populate('userId', 'name').sort({ createdAt: -1 }).limit(100),
    MealOrder.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(100),
    MealOrder.find({ type: 'trial' }).populate('userId', 'name phone').sort({ createdAt: -1 }).limit(100),
    VendorLedgerEntry.aggregate([{ $group: { _id: '$vendorId', orders: { $sum: 1 }, gross: { $sum: '$gross' } } }]),
  ]);

  const ledgerMap = new Map(ledger.map((l) => [String(l._id), l]));
  const vendorNameMap = new Map(mealVendors.map((v) => [String(v.userId), v.businessName]));
  const statusMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.n]));

  const platformMetrics = {
    totalRevenue: rupees(revenueAgg[0]?.total || 0),
    activeSubscriptions: activeSubs,
    totalDeliveriesToday: deliveriesToday,
    activeVendors: mealVendors.filter((v) => v.approvalStatus === 'approved').length,
    failedDeliveries: statusMap.failed || 0,
    delayedDeliveries: statusMap.delayed || 0,
    pendingTrials,
    refundRequests: statusMap.refunded || 0,
  };

  const vendors = mealVendors.map((v) => {
    const l = ledgerMap.get(String(v.userId)) || { orders: 0, gross: 0 };
    return {
      id: String(v._id),
      name: v.businessName,
      type: 'Cloud Kitchen',
      zone: v.city || '—',
      activeSubs: l.orders,
      revenue: rupees(l.gross),
      status: v.approvalStatus === 'approved' ? 'Verified' : 'Pending',
      rating: v.rating || 0,
    };
  });

  const globalMealPlans = plans.map((p) => ({
    id: String(p._id),
    name: p.name,
    vendor: vendorNameMap.get(String(p.providerId)) || 'Platform',
    petType: p.meta?.petType || 'Dog',
    price: p.pricePerMonth,
    subsCount: 0,
    status: p.active ? 'Active' : 'Inactive',
  }));

  const globalSubscriptions = subs.map((o) => ({
    id: o.orderNo || String(o._id),
    user: o.userId?.name || 'Guest',
    pet: o.contact?.petName || '—',
    plan: o.items?.[0]?.name || 'Meal Plan',
    vendor: vendorNameMap.get(String(o.providerId)) || 'Platform',
    endDate: '—',
    status: STATUS_LABEL(o.status),
    payment: o.paymentId ? 'Paid' : 'Pending',
  }));

  const globalDeliveries = deliveries.map((o) => ({
    id: String(o._id),
    orderId: o.orderNo || String(o._id),
    user: o.userId?.name || 'Guest',
    vendor: vendorNameMap.get(String(o.providerId)) || 'Platform',
    driver: 'Unassigned',
    eta: o.deliveryTime || '--',
    status: STATUS_LABEL(o.status),
    zone: '—',
  }));

  const globalTrials = trials.map((o) => ({
    id: o.orderNo || String(o._id),
    user: o.userId?.name || o.contact?.name || 'Guest',
    pet: o.contact?.petName || '—',
    mobile: o.userId?.phone || o.contact?.phone || '—',
    vendor: vendorNameMap.get(String(o.providerId)) || 'Platform',
    eligibility: 'Verified',
    status: STATUS_LABEL(o.status),
  }));

  return { platformMetrics, vendors, globalMealPlans, globalSubscriptions, globalDeliveries, globalTrials };
}
