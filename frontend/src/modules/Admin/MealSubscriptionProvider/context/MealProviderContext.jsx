import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredVendor,
  fetchMealPlans,
  createMealPlan,
  updateMealPlan as apiUpdateMealPlan,
  deleteMealPlan as apiDeleteMealPlan,
  fetchMealSubscriptions,
  pauseMealSubscription,
  cancelMealSubscription,
  fetchMealTrials,
  fetchKitchenQueue,
  fetchMealDeliveries,
  updateMealDeliveryStatus,
  fetchVendorDashboard,
} from '../../../../services/vendor';

const MealProviderContext = createContext();

/** Map the API vendor profile to the portal's profile shape. */
function toPortalProfile(p) {
  if (!p) return { businessName: 'Meal Provider', email: '', phone: '', address: '', status: 'Online', verification: 'Pending', logo: null };
  const vmap = { approved: 'Verified Premium', pending: 'Pending', rejected: 'Rejected', suspended: 'Suspended' };
  return {
    businessName: p.businessName,
    email: p.email,
    phone: p.phone,
    address: p.address,
    status: p.online ? 'Online' : 'Offline',
    verification: vmap[p.approvalStatus] || 'Pending',
    logo: p.logo || null,
  };
}

// Only what's real: lifetime/pending come from the ledger aggregate
// (GET /vendor/dashboard); there's no daily/weekly revenue breakdown
// anywhere in the backend, so those are not fabricated here.
const EMPTY_FINANCES = {
  lifetimeEarnings: 0, pendingPayout: 0, deliveriesToday: 0, activeSubs: 0,
};

export const MealProviderProvider = ({ children }) => {
  const stored = getStoredVendor();
  const [profile, setProfile] = useState(toPortalProfile(stored?.profile));
  const [mealPlans, setMealPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [trials, setTrials] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [kitchenQueue, setKitchenQueue] = useState([]);
  const [finances, setFinances] = useState(EMPTY_FINANCES);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [plans, subs, trs, dels, kq, dash] = await Promise.all([
      fetchMealPlans().catch(() => []),
      fetchMealSubscriptions().catch(() => []),
      fetchMealTrials().catch(() => []),
      fetchMealDeliveries().catch(() => []),
      fetchKitchenQueue().catch(() => []),
      fetchVendorDashboard().catch(() => null),
    ]);
    setMealPlans(plans);
    setSubscriptions(subs);
    setTrials(trs);
    setDeliveries(dels);
    setKitchenQueue(kq);
    if (dash) {
      setFinances((f) => ({
        ...f,
        pendingPayout: Math.round((dash.pendingSettlement || 0) / 100),
        lifetimeEarnings: Math.round((dash.lifetimeEarnings || 0) / 100),
        activeSubs: subs.filter((s) => s.status === 'Active').length,
        deliveriesToday: dels.length,
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  /* ── mutators ─────────────────────────────────────────── */

  const updateProfile = (updates) => setProfile((p) => ({ ...p, ...updates }));

  const addMealPlan = async (plan) => {
    const created = await createMealPlan({
      name: plan.name,
      price: Number(plan.price) || 0,
      petType: plan.petType,
      mealType: plan.mealType,
      qty: plan.qty,
      calories: plan.calories,
      protein: plan.protein,
      duration: plan.duration,
      image: plan.image || undefined,
    }).catch(() => null);
    if (created) setMealPlans((prev) => [created, ...prev]);
  };

  const updateMealPlan = async (id, updates) => {
    setMealPlans((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    await apiUpdateMealPlan(id, updates).catch(() => {});
  };

  const deleteMealPlan = async (id) => {
    setMealPlans((prev) => prev.filter((m) => m.id !== id));
    await apiDeleteMealPlan(id).catch(() => {});
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    const item = deliveries.find((d) => d.id === id || d._id === id);
    setDeliveries((prev) => prev.map((d) => (d.id === id || d._id === id ? { ...d, status: newStatus } : d)));
    if (item?._id && (newStatus === 'Out for Delivery' || newStatus === 'Delivered')) {
      await updateMealDeliveryStatus(item._id, newStatus).catch(() => {});
    }
  };

  const pauseSubscription = async (id, resume = false) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub?._id) return;
    const updated = await pauseMealSubscription(sub._id, resume);
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status: updated.status } : s)));
  };

  const cancelSubscription = async (id) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub?._id) return;
    const updated = await cancelMealSubscription(sub._id);
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'Expired' } : s)));
    return updated;
  };

  return (
    <MealProviderContext.Provider value={{
      profile, mealPlans, subscriptions, trials, deliveries, kitchenQueue, finances,
      loading, refresh,
      updateProfile,
      addMealPlan,
      updateMealPlan,
      deleteMealPlan,
      updateDeliveryStatus,
      pauseSubscription,
      cancelSubscription,
    }}>
      {children}
    </MealProviderContext.Provider>
  );
};

export const useMealProvider = () => useContext(MealProviderContext);
