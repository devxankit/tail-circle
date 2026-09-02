import { useEffect, useMemo, useState } from 'react';
import { getDaycareById } from '../../../../services/daycareApi';

/**
 * The daycare "Quick Booking" panel's pricing and payload, shared by the three
 * screens that render it (home, listing, centre detail).
 *
 * Those three carried byte-identical copies of this logic, and all three
 * invented their numbers: plans were priced `pricePerDay × 5.2` and `× 20`,
 * add-ons were a flat ₹150/₹100, and the ids posted to the API were the
 * hard-coded strings 'custom', 'addon_1' and 'addon_2'. Nothing resolves those,
 * so any centre that was not one of the seeded demo rows had every booking
 * rejected. Everything here now comes from the centre's own catalogue.
 */

const pad = (n) => String(n).padStart(2, '0');

/** `startStr` + (days - 1) as a local-time YYYY-MM-DD. */
export function addDays(startStr, days) {
  const d = new Date(`${startStr}T00:00:00`);
  d.setDate(d.getDate() + days - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useQuickBooking(centre, {
  selectedPlanId,
  customDates = [],
  startDate,
  isPickupChecked,
  isMealsChecked,
} = {}) {
  // The list screens hand over a summary row from `GET /providers`, which
  // carries no offerings, so the full record is fetched when the panel opens.
  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(false);

  const centreId = centre?._id || centre?.id || null;

  useEffect(() => {
    if (!centreId) { setCatalogue(null); return; }
    if (centre?.plans?.length) { setCatalogue(centre); return; }

    let cancelled = false;
    setLoading(true);
    getDaycareById(centreId)
      .then((full) => { if (!cancelled) setCatalogue(full); })
      .catch(() => { if (!cancelled) setCatalogue(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [centreId, centre]);

  const plans = catalogue?.plans || [];
  const addons = catalogue?.addons || [];

  const planCards = useMemo(() => {
    const planFor = (unit) => plans.find((p) => p.unit === unit) || null;
    const dayPlan = planFor('day');
    const weekPlan = planFor('week');
    const monthPlan = planFor('month');
    const customDays = customDates.length || 1;

    return [
      { key: 'plan_day', label: 'Day Pass', desc: '1 Day', offering: dayPlan, days: 1, stayDays: 1 },
      { key: 'plan_week', label: '6 Days', desc: 'Weekly', offering: weekPlan || dayPlan, days: weekPlan ? 1 : 6, stayDays: 6 },
      { key: 'plan_month', label: '30 Days', desc: 'Monthly', offering: monthPlan || dayPlan, days: monthPlan ? 1 : 30, stayDays: 30 },
      { key: 'custom', label: 'Custom', desc: 'Pick Range', offering: dayPlan, days: customDays, stayDays: customDays },
    ].filter((c) => c.offering);
  }, [plans, customDates.length]);

  const activeCard = planCards.find((c) => c.key === selectedPlanId) || planCards[0] || null;
  const priceOf = (card) => (card?.offering ? card.offering.price * card.days : 0);

  // Calendar days the stay occupies. A weekly plan sold as a single unit still
  // blocks six days of the centre's capacity.
  const stayDays = activeCard?.stayDays || 1;

  const pickupAddon = addons.find((a) => /pick\s*-?\s*up|drop/i.test(a.name)) || null;
  const mealsAddon = addons.find((a) => /meal|food|nutrit/i.test(a.name)) || null;

  const planSubtotal = priceOf(activeCard);
  const addonCost =
    (isPickupChecked && pickupAddon ? pickupAddon.price * (pickupAddon.unit === 'day' ? stayDays : 1) : 0) +
    (isMealsChecked && mealsAddon ? mealsAddon.price * (mealsAddon.unit === 'day' ? stayDays : 1) : 0);

  const platformFee = catalogue?.fees?.platformFee ?? 49;
  const beforeDiscount = planSubtotal + addonCost + platformFee;
  const discount = Math.min(catalogue?.fees?.discount ?? 300, beforeDiscount);
  const totalPrice = Math.max(0, beforeDiscount - discount);

  /** Every calendar day of the stay — not just its endpoints. */
  const stayDates = () => {
    if (selectedPlanId === 'custom') return [...customDates];
    if (!startDate) return [];
    return Array.from({ length: stayDays }, (_, i) => addDays(startDate, i + 1));
  };

  const selectedAddons = [
    ...(isPickupChecked && pickupAddon ? [pickupAddon] : []),
    ...(isMealsChecked && mealsAddon ? [mealsAddon] : []),
  ];

  return {
    loading,
    catalogue,
    planCards,
    activeCard,
    priceOf,
    stayDays,
    stayDates,
    pickupAddon,
    mealsAddon,
    selectedAddons,
    planSubtotal,
    addonCost,
    platformFee,
    discount,
    totalPrice,
    dateTypeFor: (planId) =>
      planId === 'plan_day' ? 'Single Day' : planId === 'plan_month' ? 'Monthly' : 'Multiple Days',
  };
}

export default useQuickBooking;
