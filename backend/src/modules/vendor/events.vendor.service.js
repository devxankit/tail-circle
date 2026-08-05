import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../services/cache.service.js';
import { Event } from '../provider/event.model.js';
import { Booking } from '../booking/booking.model.js';
import { Review } from '../review/review.model.js';
import { EventPackage, EventAddon, CustomerRequest, EventGalleryItem } from './event.models.js';

/* ── Events (scoped to vendorId) ──────────────────────────── */

const STATUS_TO_MOCK = { draft: 'Draft', published: 'Published', completed: 'Completed', cancelled: 'Cancelled' };
const MOCK_TO_STATUS = { Draft: 'draft', Published: 'published', Completed: 'completed', Cancelled: 'cancelled' };

function isoDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export function toVendorEvent(e) {
  const full = e.sold >= e.capacity;
  const status = e.status === 'published' && full ? 'Fully Booked' : STATUS_TO_MOCK[e.status] || e.status;
  return {
    id: String(e._id),
    _id: String(e._id),
    title: e.title,
    category: e.category,
    date: isoDate(e.startAt),
    time: e.timeText,
    location: e.location,
    capacity: e.capacity,
    booked: e.sold,
    price: e.price,
    status,
    image: e.img || null,
    description: e.desc || '',
  };
}

export async function listEvents(vendorId) {
  const events = await Event.find({ vendorId }).sort({ startAt: -1, createdAt: -1 });
  return events.map(toVendorEvent);
}

export async function createEvent(vendorId, body) {
  const event = await Event.create({
    vendorId,
    title: body.title,
    category: body.category || 'Social Meetup',
    timeText: body.time || '',
    location: body.location || '',
    capacity: Number(body.capacity) || 50,
    price: Number(body.price) || 0,
    img: body.image || '',
    desc: body.description || '',
    startAt: body.date ? new Date(body.date) : null,
    status: MOCK_TO_STATUS[body.status] || 'published',
  });
  await invalidate('events:*');
  return toVendorEvent(event);
}

async function ownedEvent(vendorId, id) {
  const event = await Event.findOne({ _id: id, vendorId });
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

export async function updateEvent(vendorId, id, body) {
  const event = await ownedEvent(vendorId, id);
  if (body.title != null) event.title = body.title;
  if (body.category != null) event.category = body.category;
  if (body.time != null) event.timeText = body.time;
  if (body.location != null) event.location = body.location;
  if (body.capacity != null) event.capacity = Number(body.capacity);
  if (body.price != null) event.price = Number(body.price);
  if (body.image != null) event.img = body.image;
  if (body.description != null) event.desc = body.description;
  if (body.date != null) event.startAt = body.date ? new Date(body.date) : null;
  if (body.status && MOCK_TO_STATUS[body.status]) event.status = MOCK_TO_STATUS[body.status];
  await event.save();
  await invalidate('events:*');
  return toVendorEvent(event);
}

export async function publishEvent(vendorId, id) {
  const event = await ownedEvent(vendorId, id);
  event.status = 'published';
  await event.save();
  await invalidate('events:*');
  return toVendorEvent(event);
}

/* ── Bookings for this vendor's events ────────────────────── */

const BOOKING_STATUS_MOCK = { confirmed: 'Confirmed', pending_payment: 'Pending', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Cancelled' };

export async function listEventBookings(vendorId) {
  const eventIds = await Event.find({ vendorId }).distinct('_id');
  const bookings = await Booking.find({ type: 'event', eventId: { $in: eventIds } })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name')
    .populate('eventId', 'title');
  return bookings.map((b) => ({
    id: b.bookingNo,
    _id: String(b._id),
    customer: b.userId?.name || 'Customer',
    pet: b.petSnapshot?.name || '',
    event: b.eventId?.title || '',
    date: b.schedule?.startDate || isoDate(b.createdAt),
    tickets: b.meta?.ticketQty || b.items?.find((i) => i.kind === 'ticket')?.qty || 1,
    amount: Math.round((b.amounts?.total || 0) / 100),
    status: BOOKING_STATUS_MOCK[b.status] || b.status,
    payment: b.status === 'refunded' ? 'Refunded' : b.paymentMethod === 'pay_later' ? 'Pending' : 'Paid',
    addOns: b.meta?.addOns || [],
    checkedIn: Boolean(b.meta?.checkedIn),
  }));
}

export async function checkInBooking(vendorId, id) {
  const eventIds = await Event.find({ vendorId }).distinct('_id');
  const booking = await Booking.findOne({ _id: id, type: 'event', eventId: { $in: eventIds } });
  if (!booking) throw ApiError.notFound('Booking not found');
  booking.meta = { ...booking.meta, checkedIn: true };
  booking.markModified('meta');
  await booking.save();
  return { _id: String(booking._id), checkedIn: true };
}

/* ── Packages / add-ons ───────────────────────────────────── */

const mapPackage = (p) => ({ id: String(p._id), _id: String(p._id), name: p.name, price: p.price, duration: p.duration, maxPets: p.maxPets, status: p.status });
const mapAddon = (a) => ({ id: String(a._id), _id: String(a._id), name: a.name, price: a.price, status: a.status });

export async function listPackages(vendorId) {
  return (await EventPackage.find({ vendorId }).sort({ createdAt: -1 })).map(mapPackage);
}
export async function createPackage(vendorId, body) {
  const p = await EventPackage.create({ vendorId, name: body.name, price: Number(body.price) || 0, duration: body.duration || '', maxPets: Number(body.maxPets) || 1, status: body.status || 'Active' });
  return mapPackage(p);
}
export async function updatePackage(vendorId, id, body) {
  const p = await EventPackage.findOneAndUpdate({ _id: id, vendorId }, { $set: cleanUpdate(body, ['name', 'price', 'duration', 'maxPets', 'status']) }, { new: true });
  if (!p) throw ApiError.notFound('Package not found');
  return mapPackage(p);
}
export async function deletePackage(vendorId, id) {
  const res = await EventPackage.deleteOne({ _id: id, vendorId });
  if (!res.deletedCount) throw ApiError.notFound('Package not found');
}

export async function listAddons(vendorId) {
  return (await EventAddon.find({ vendorId }).sort({ createdAt: -1 })).map(mapAddon);
}
export async function createAddon(vendorId, body) {
  const a = await EventAddon.create({ vendorId, name: body.name, price: Number(body.price) || 0, status: body.status || 'Active' });
  return mapAddon(a);
}
export async function updateAddon(vendorId, id, body) {
  const a = await EventAddon.findOneAndUpdate({ _id: id, vendorId }, { $set: cleanUpdate(body, ['name', 'price', 'status']) }, { new: true });
  if (!a) throw ApiError.notFound('Add-on not found');
  return mapAddon(a);
}
export async function deleteAddon(vendorId, id) {
  const res = await EventAddon.deleteOne({ _id: id, vendorId });
  if (!res.deletedCount) throw ApiError.notFound('Add-on not found');
}

/* ── Custom-event requests inbox ──────────────────────────── */

const mapRequest = (r) => ({ id: String(r._id), _id: String(r._id), customer: r.customer, pet: r.pet, type: r.type, date: r.date, budget: r.budget, message: r.message, vendorNote: r.vendorNote, status: r.status });

export async function listRequests(vendorId) {
  return (await CustomerRequest.find({ vendorId }).sort({ createdAt: -1 })).map(mapRequest);
}
export async function updateRequest(vendorId, id, body) {
  const r = await CustomerRequest.findOneAndUpdate({ _id: id, vendorId }, { $set: cleanUpdate(body, ['status', 'budget', 'vendorNote']) }, { new: true });
  if (!r) throw ApiError.notFound('Request not found');
  return mapRequest(r);
}

/* ── Gallery ──────────────────────────────────────────────── */

const mapGallery = (g) => ({ id: String(g._id), _id: String(g._id), url: g.url, caption: g.caption });

export async function listGallery(vendorId) {
  return (await EventGalleryItem.find({ vendorId }).sort({ createdAt: -1 })).map(mapGallery);
}
export async function addGalleryItem(vendorId, body) {
  const g = await EventGalleryItem.create({ vendorId, url: body.url, caption: body.caption || '' });
  return mapGallery(g);
}
export async function deleteGalleryItem(vendorId, id) {
  const res = await EventGalleryItem.deleteOne({ _id: id, vendorId });
  if (!res.deletedCount) throw ApiError.notFound('Gallery item not found');
}

/* ── Feedback (event reviews) ─────────────────────────────── */

export async function listFeedback(vendorId) {
  const events = await Event.find({ vendorId }).select('title');
  const titleById = new Map(events.map((e) => [String(e._id), e.title]));
  const reviews = await Review.find({ targetType: 'event', targetId: { $in: [...titleById.keys()] }, status: 'visible' })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name');
  return reviews.map((r) => ({
    id: String(r._id),
    customer: r.userId?.name || 'Customer',
    event: titleById.get(String(r.targetId)) || '',
    rating: r.rating,
    message: r.text || '',
    reply: r.vendorReply?.text || '',
    status: r.vendorReply?.text ? 'Replied' : 'New',
    date: r.createdAt,
  }));
}

export async function replyToFeedback(vendorId, reviewId, text) {
  const review = await Review.findOne({ _id: reviewId, targetType: 'event' });
  if (!review) throw ApiError.notFound('Review not found');
  const owns = await Event.exists({ _id: review.targetId, vendorId });
  if (!owns) throw ApiError.forbidden('Not your event review');
  review.vendorReply = { text, repliedAt: new Date() };
  await review.save();
  return { id: String(review._id), reply: text, status: 'Replied' };
}

function cleanUpdate(body, allowed) {
  const out = {};
  for (const k of allowed) if (body[k] != null) out[k] = k === 'price' || k === 'maxPets' ? Number(body[k]) : body[k];
  return out;
}
