import { api } from './api';
import { payWithRazorpay } from './payments';
import { dedupePhotos } from './groomingApi';

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
    // Cover photo first, then the rest, de-duplicated on the URL path so the
    // same picture at two CDN widths does not become two identical slides.
    gallery: dedupePhotos([p.image, ...(p.gallery || [])]),
    host: p.details?.host,
    stats: p.details?.stats || [],
    activities: p.details?.activities || [],
    dailyCapacity: Number(p.details?.dailyCapacity) || 20,
    // Platform fee / promo discount the centre set. These were hard-coded in
    // the price summary and charged nowhere, so the displayed total was not the
    // billed total.
    fees: {
      platformFee: Number(p.details?.daycareFees?.platformFee ?? 49),
      discount: Number(p.details?.daycareFees?.discount ?? 300),
    },
  };
}

const toLegacyOffering = (o) => ({
  // `id` is the handle the booking API resolves. Reading `legacyId` meant
  // anything a centre created from its own dashboard came through with
  // `id: undefined` and was rejected at checkout.
  id: o.id,
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
  const centre = toLegacyDaycare(data.provider);
  centre.plans = (data.offerings?.plans || []).map(toLegacyOffering);
  centre.addons = (data.offerings?.addons || []).map(toLegacyOffering);
  return centre;
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
    id: o.id,
    name: o.name,
    price: o.price,
    unit: o.unit || 'day',
  }));
}

/**
 * YYYY-MM-DD in the user's own timezone. `toISOString()` converts to UTC first,
 * which in IST (UTC+5:30) rolls any time before 05:30 back to the previous day.
 * Strings that are already YYYY-MM-DD pass through untouched.
 */
const toYMD = (d) => {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Day-by-day availability for the booking calendar. */
export async function getDaycareAvailability(providerId, from, days = 60) {
  const { data } = await api.get(`/providers/${providerId}/availability`, {
    params: { from: toYMD(from), days },
  });
  return data;
}

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

  const dates = [...new Set((payload.dates || []).map(toYMD).filter(Boolean))].sort();

  const body = {
    type: 'daycare',
    providerId: String(payload.center._id || payload.center.id),
    ...(payload.pet?._id || String(payload.pet?.id || '').length === 24
      ? { petId: payload.pet._id || payload.pet.id }
      : {}),
    items,
    schedule: {
      startDate: dates[0] || toYMD(new Date()),
      ...(dates.length > 1 ? { endDate: dates[dates.length - 1] } : {}),
      durationDays: days,
      // The drop-off time. This used to be sent only inside `meta`, where
      // nothing looked for it, so the server rejected every daycare booking
      // with "Pick a date and time slot". Omitted rather than sent as null,
      // because the schema accepts a string or nothing — not null.
      ...(payload.dropoffTime ? { time: payload.dropoffTime } : {}),
    },
    paymentMethod: payload.paymentMethod === 'Cash' ? 'pay_later' : 'razorpay',
    meta: {
      dateType: payload.dateType,
      // The exact days booked. A Tue/Thu-only arrangement is not a contiguous
      // range, so the server reserves against this list when it is present.
      dates,
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
