import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Real grooming API — same exports the old `mockGroomingApi.js` had, so the
 * grooming screens work unchanged.
 */

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
    about: p.about,
    experience: p.details?.experience,
    hygiene: p.details?.hygiene,
    cancellation: p.details?.cancellation,
    supportedPets: p.supportedPets || [],
    servicesList: p.details?.servicesList || [],
  };
}

export async function getGroomingShops() {
  const { data } = await api.get('/providers', { params: { type: 'grooming' } });
  return data.map(toLegacyShop);
}

export async function getGroomingShopById(id) {
  const { data } = await api.get(`/providers/${id}`);
  return toLegacyShop(data.provider);
}

export async function getGroomingPackages(shopId) {
  const { data } = await api.get(`/providers/${shopId}`);
  return data.offerings.packages.map((o) => ({
    id: o.legacyId,
    name: o.name,
    price: o.price,
    includes: o.includes || [],
    isPopular: o.isPopular,
  }));
}

export async function getGroomingAddons(shopId) {
  const { data } = await api.get(`/providers/${shopId || 'gshop_1'}`);
  return data.offerings.addons.map((o) => ({
    id: o.legacyId,
    name: o.name,
    price: o.price,
    category: o.category,
  }));
}

export async function getGroomingMenu(shopId) {
  const { data } = await api.get(`/providers/${shopId}`);
  const sections = new Map();
  for (const item of data.offerings.menu) {
    if (!sections.has(item.category)) sections.set(item.category, []);
    sections.get(item.category).push({
      id: item.legacyId,
      name: item.name,
      price: item.price,
      desc: item.description,
    });
  }
  return [...sections.entries()].map(([category, items]) => ({ category, items }));
}

const toYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
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
  return {
    id: b.bookingNo,
    _id: b._id,
    shopId: b.providerId?.legacyId,
    shopName: b.providerId?.name,
    shopImage: b.providerId?.image,
    serviceName:
      b.meta?.serviceName ||
      b.items?.filter((i) => i.kind !== 'fee').map((i) => i.name).join(' + '),
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
