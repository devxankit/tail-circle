import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Real grooming API — same exports the old `mockGroomingApi.js` had, so the
 * grooming screens work unchanged.
 */

/**
 * Order-preserving photo de-duplication, keyed on the URL *without* its query
 * string.
 *
 * A plain Set is not enough: the same photo is routinely referenced at two
 * sizes (`…?w=600` as the cover, `…?w=800` in the gallery), and those are
 * different strings but the same picture — which showed up as the first two
 * slides of the slider being identical.
 */
export function dedupePhotos(urls) {
  const seen = new Set();
  const out = [];
  for (const url of urls) {
    if (!url) continue;
    const key = String(url).split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function toLegacyShop(p) {
  return {
    id: p.legacyId || p._id,
    _id: p._id,
    name: p.name,
    rating: p.rating,
    reviews: p.ratingCount,
    distance: p.distanceText,
    visitTypes: p.visitTypes || [],
    startingPrice: p.startingPrice,
    availability: p.details?.availability || (p.isOpen ? 'Open Now' : 'Closed'),
    image: p.image,
    // The salon's photo strip. This was never copied out of the API response,
    // so `shop.gallery` was always undefined and the detail screen's slider
    // silently collapsed to the single cover image. Cover first, then the rest.
    gallery: dedupePhotos([p.image, ...(p.gallery || [])]),
    about: p.about,
    experience: p.details?.experience,
    hygiene: p.details?.hygiene,
    cancellation: p.details?.cancellation,
    supportedPets: p.supportedPets || [],
    servicesList: p.details?.servicesList || [],
    // Travel fee / promo discount the salon set from its dashboard. The price
    // summary used to hard-code 50 and 100 while the server charged neither,
    // so the customer approved one total and was billed another.
    fees: {
      travelFee: Number(p.details?.groomingFees?.travelFee ?? 50),
      discount: Number(p.details?.groomingFees?.discount ?? 100),
    },
  };
}

export async function getGroomingShops() {
  const { data } = await api.get('/providers', { params: { type: 'grooming' } });
  return data.map(toLegacyShop);
}

export async function getGroomingShopById(id) {
  const { data } = await api.get(`/providers/${id}`);
  const shop = toLegacyShop(data.provider);
  shop.packages = data.offerings?.packages || [];
  // The detail screen's "Add Extra Services" grid is one list of everything
  // buyable alongside a package — shared platform add-ons plus the salon's own
  // à-la-carte menu items. Both resolve server-side by `id`.
  shop.addons = [...(data.offerings?.addons || []), ...(data.offerings?.menu || [])];
  shop.menu = data.offerings?.menu || [];
  return shop;
}

export async function getGroomingPackages(shopId) {
  const { data } = await api.get(`/providers/${shopId}`);
  return data.offerings.packages.map((o) => ({
    id: o.id,
    name: o.name,
    price: o.price,
    includes: o.includes || [],
    isPopular: o.isPopular,
  }));
}

export async function getGroomingAddons(shopId) {
  const { data } = await api.get(`/providers/${shopId}`);
  return data.offerings.addons.map((o) => ({
    id: o.id,
    name: o.name,
    price: o.price,
    category: o.category,
  }));
}

export async function getGroomingMenu(shopId) {
  const { data } = await api.get(`/providers/${shopId}`);
  const sections = new Map();
  for (const item of data.offerings.menu) {
    const category = item.category || 'Individual Services';
    if (!sections.has(category)) sections.set(category, []);
    sections.get(category).push({
      id: item.id,
      name: item.name,
      price: item.price,
      desc: item.description,
    });
  }
  return [...sections.entries()].map(([category, items]) => ({ category, items }));
}

/**
 * YYYY-MM-DD in the user's own timezone. `toISOString()` converts to UTC first,
 * which in IST (UTC+5:30) rolls any time before 05:30 back to the previous day
 * — an early-morning booking was filed against yesterday's calendar.
 */
const toYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export async function getGroomingSlots(shopId, date) {
  const { data } = await api.get(`/providers/${shopId}/slots`, {
    params: { date: toYMD(date) },
  });
  return data;
}

/** Create the grooming booking (Razorpay for online methods). */
export async function createBooking(payload) {
  const items = [
    ...(payload.packageData ? [{ refId: payload.packageData.id }] : []),
    ...(payload.addonsData || []).map((a) => ({ refId: a.id })),
  ];

  const body = {
    type: 'grooming',
    providerId: String(payload.shopId),
    ...(payload.pet?._id || String(payload.pet?.id || '').length === 24 ? { petId: payload.pet._id || payload.pet.id } : {}),
    items,
    schedule: {
      startDate: toYMD(payload.date) || toYMD(new Date()),
      time: payload.timeSlot,
    },
    visitType: payload.visitType === 'Home Visit' ? 'home' : 'salon',
    ...(payload.visitType === 'Home Visit' && payload.addressId ? { addressId: payload.addressId } : {}),
    paymentMethod: payload.paymentMode === 'Cash' ? 'pay_later' : 'razorpay',
    meta: {
      serviceName: payload.serviceName,
      petName: payload.pet?.name || null,
    },
  };

  const { data } = await api.post('/bookings', body);
  if (data.razorpay) {
    await payWithRazorpay(data.razorpay, { description: `Grooming — ${payload.shopName}` });
  }

  return {
    ...payload,
    id: data.booking.bookingNo,
    _id: data.booking._id,
    status: 'Confirmed',
    createdAt: data.booking.createdAt,
  };
}

/* ── booking reads (MyBookingDetail + history) ─────────── */

function toLegacyGroomingBooking(b) {
  const items = b.items || [];
  // The booking-detail screen shows a package line, an add-on line and the fees
  // separately, so split the stored line items back out by kind. Nothing
  // supplied these before, leaving the whole breakdown blank above the total.
  const packageItem = items.find((i) => i.kind === 'package' || i.kind === 'plan') || null;
  const addonItems = items.filter((i) => i.kind === 'addon' || i.kind === 'menu_item');
  const feeItems = items.filter((i) => i.kind === 'fee');

  return {
    id: b.bookingNo,
    _id: b._id,
    shopId: b.providerId?.legacyId || b.providerId?._id,
    shopName: b.providerId?.name,
    shopImage: b.providerId?.image,
    packageData: packageItem && { name: packageItem.name, price: packageItem.price },
    addonsData: addonItems.map((i) => ({ name: i.name, price: i.price })),
    fees: feeItems.map((i) => ({ name: i.name, price: i.price })),
    discount: Math.round((b.amounts?.discount || 0) / 100),
    serviceName:
      b.meta?.serviceName ||
      items.filter((i) => i.kind !== 'fee').map((i) => i.name).join(' + '),
    pet: b.petSnapshot ? { name: b.petSnapshot.name, breed: b.petSnapshot.breed, image: b.petSnapshot.image } : null,
    date: b.schedule?.startDate,
    timeSlot: b.schedule?.time,
    visitType: b.visitType === 'home' ? 'Home Visit' : 'Salon Visit',
    totalPaid: Math.round((b.amounts?.total || 0) / 100),
    paymentMode: b.paymentMethod === 'pay_later' ? 'Cash' : 'Online',
    status: b.status === 'confirmed' ? 'Confirmed' : b.status.charAt(0).toUpperCase() + b.status.slice(1),
    createdAt: b.createdAt,
  };
}

export async function getMyBookings() {
  const { data } = await api.get('/bookings', { params: { type: 'grooming' } });
  return data.map(toLegacyGroomingBooking);
}

export async function getBookingById(id) {
  // Accept either the Mongo id or a bookingNo (legacy screens pass either).
  if (/^[0-9a-f]{24}$/i.test(String(id))) {
    const { data } = await api.get(`/bookings/${id}`);
    return toLegacyGroomingBooking(data);
  }
  const all = await getMyBookings();
  return all.find((b) => String(b.id) === String(id));
}

export async function updateBookingStatus(id, status) {
  if (status !== 'Cancelled') throw new Error('Only cancellation is supported');
  const booking = await getBookingById(id);
  const { data } = await api.post(`/bookings/${booking._id}/cancel`);
  return toLegacyGroomingBooking(data);
}

/** Real reschedule — was a localStorage-only rewrite before. */
export async function rescheduleBooking(id, date, timeSlot) {
  const booking = await getBookingById(id);
  const { data } = await api.post(`/bookings/${booking._id}/reschedule`, { date: toYMD(date), time: timeSlot });
  return toLegacyGroomingBooking(data);
}
