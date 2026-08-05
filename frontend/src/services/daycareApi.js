import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Real daycare API — same exports the old `mockDaycareApi.js` had, so the
 * daycare screens work unchanged. Providers map back to the legacy shape.
 */

function toLegacyDaycare(p) {
  return {
    id: p.legacyId || p._id,
    _id: p._id, // real Mongo id — use this for /saved-items, not `id` (may be a legacy display id)
    name: p.name,
    verified: p.verified,
    rating: p.rating,
    reviews: p.ratingCount,
    distance: p.distanceText,
    isOpen: p.isOpen,
    openTime: p.openTime,
    closeTime: p.closeTime,
    pricePerDay: p.details?.pricePerDay,
    pricePerWeek: p.details?.pricePerWeek,
    pricePerMonth: p.details?.pricePerMonth,
    image: p.image,
    facilities: p.details?.facilities || [],
    about: p.about,
    rules: p.details?.rules || [],
    badge: p.badge,
    allowedPets: p.supportedPets || [],
    gallery: p.gallery || [],
    host: p.details?.host,
    stats: p.details?.stats || [],
    activities: p.details?.activities || [],
  };
}

const toLegacyOffering = (o) => ({
  id: o.legacyId,
  name: o.name,
  price: o.price,
  unit: o.unit,
  description: o.description,
  includes: o.includes || [],
  badge: o.badge,
});

export async function getDaycares() {
  const { data } = await api.get('/providers', { params: { type: 'daycare' } });
  return data.map(toLegacyDaycare);
}

export async function getDaycareById(id) {
  const { data } = await api.get(`/providers/${id}`);
  return toLegacyDaycare(data.provider);
}

// Plans/addons are scoped to the specific centre the customer is booking —
// a provider-wide catalog, not platform-wide. Falls back to a legacy demo id
// only if no real centre id is available (should not happen from the real
// booking flow, since SelectPlan always has `selectedCenter` set).
async function getDaycareOfferings(providerId) {
  const { data } = await api.get(`/providers/${providerId || 'dc_1'}`);
  return data.offerings;
}

export async function getPlans(providerId) {
  return (await getDaycareOfferings(providerId)).plans.map(toLegacyOffering);
}

export async function getAddons(providerId) {
  return (await getDaycareOfferings(providerId)).addons.map((o) => ({
    id: o.legacyId,
    name: o.name,
    price: o.price,
    unit: o.unit || 'day',
  }));
}

const toYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * Create the daycare booking. Online methods run the Razorpay sheet; "Cash"
 * confirms as pay-at-dropoff. Returns the legacy confirmation shape.
 */
export async function createBooking(payload) {
  const days =
    payload.dates?.length ||
    (payload.dateType === 'Weekly Care' ? 6 : payload.dateType === 'Monthly Care' ? 24 : 1);

  const items = [
    { refId: payload.plan.id },
    ...(payload.addons || []).map((a) => ({ refId: a.id })),
  ];

  const body = {
    type: 'daycare',
    providerId: String(payload.center.id),
    ...(payload.pet?._id || payload.pet?.id?.length === 24 ? { petId: payload.pet._id || payload.pet.id } : {}),
    items,
    schedule: {
      startDate: toYMD(payload.dates?.[0]) || toYMD(new Date()),
      ...(payload.dates?.length > 1 ? { endDate: toYMD(payload.dates[payload.dates.length - 1]) } : {}),
      durationDays: days,
    },
    paymentMethod: payload.paymentMethod === 'Cash' ? 'pay_later' : 'razorpay',
    meta: {
      dateType: payload.dateType,
      dates: (payload.dates || []).map(toYMD).filter(Boolean),
      dropoffTime: payload.dropoffTime || null,
      pickupTime: payload.pickupTime || null,
      visitOption: payload.visitOption || null,
      petAnswers: payload.petAnswers || {},
      driverTimings: payload.driverTimings || null,
      petName: payload.pet?.name || null,
    },
  };

  const { data } = await api.post('/bookings', body);
  if (data.razorpay) {
    await payWithRazorpay(data.razorpay, { description: `Daycare — ${payload.center.name}` });
  }

  return {
    ...payload,
    id: data.booking.bookingNo,
    _id: data.booking._id,
    status: 'Confirmed',
    createdAt: data.booking.createdAt,
  };
}
