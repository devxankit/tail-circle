import mongoose from 'mongoose';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { Product } from '../shop/product.model.js';
import { VendorProfile } from '../vendor/vendor.models.js';
import { VENDOR_TYPE_LABEL } from '../vendor/vendorTypeLabels.js';

/**
 * Operational queues an operator works from.
 *
 * Each of these answers a question the platform could previously only answer by
 * somebody noticing: which emergencies are live right now, which partners are
 * slow to respond, what is about to sell out, and whether a customer has
 * accidentally booked the same thing twice.
 *
 * All read-only. Nothing here mutates anything — they exist to put a problem in
 * front of a human early enough to act on.
 */

const rupees = (paise) => Math.round((paise || 0) / 100);

/* ── Emergency requests ───────────────────────────────────────────── */

/**
 * Live emergency consultations, most urgent first.
 *
 * Emergencies were bookable but had no dedicated surface — they sat in the
 * general appointments list alongside routine check-ups, which is precisely
 * where an urgent case gets lost.
 */
export async function emergencyQueue({ limit = 50 } = {}) {
  const rows = await Booking.find({
    type: 'doctor',
    $or: [{ visitType: 'emergency' }, { 'consult.mode': 'emergency' }],
    status: { $in: ['pending_payment', 'awaiting_vendor', 'confirmed', 'in_progress'] },
  })
    .populate('userId', 'name phone')
    .populate('doctorId', 'name spec clinic')
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Number(limit) || 50));

  const now = Date.now();
  return rows.map((b) => {
    const waitingMs = now - new Date(b.createdAt).getTime();
    return {
      _id: String(b._id),
      bookingNo: b.bookingNo,
      status: b.status,
      customerName: b.userId?.name || 'Guest',
      customerPhone: b.userId?.phone || '—',
      pet: b.petSnapshot?.name || '—',
      petBreed: b.petSnapshot?.breed || '',
      doctorName: b.doctorId?.name || 'Unassigned',
      clinic: b.doctorId?.clinic || '—',
      issue: b.meta?.issue || b.meta?.symptoms || '—',
      amount: rupees(b.amounts?.total),
      createdAt: b.createdAt,
      waitingMinutes: Math.floor(waitingMs / 60_000),
      /*
       * An emergency still unanswered after 15 minutes is the thing on this
       * screen that needs a phone call, not a click.
       */
      critical: waitingMs > 15 * 60_000 && ['pending_payment', 'awaiting_vendor'].includes(b.status),
    };
  });
}

/* ── Partner response times ───────────────────────────────────────── */

/**
 * How quickly each partner answers booking requests.
 *
 * Predicts failure earlier than violations do: a partner whose median response
 * is creeping toward the deadline is one bad week away from auto-declines and
 * refunds, and is worth a conversation before that happens.
 */
export async function responseTimeLeaderboard({ days = 30, limit = 50 } = {}) {
  const since = new Date(Date.now() - Math.min(365, Number(days) || 30) * 86_400_000);

  const answered = await Booking.find({
    vendorRespondedAt: { $ne: null },
    createdAt: { $gte: since },
  })
    .select('vendorRespondedAt createdAt providerId doctorId eventId type status')
    .lean();

  const { resolveBookingVendor } = await import('../booking/booking.service.js');

  const byVendor = new Map();
  for (const b of answered) {
    const { vendorId, vendorType } = await resolveBookingVendor(b);
    if (!vendorId) continue;
    const key = `${vendorId}:${vendorType || ''}`;
    if (!byVendor.has(key)) {
      byVendor.set(key, { vendorId, vendorType, times: [], accepted: 0, rejected: 0 });
    }
    const entry = byVendor.get(key);
    entry.times.push(new Date(b.vendorRespondedAt) - new Date(b.createdAt));
    if (b.status === 'rejected') entry.rejected += 1;
    else entry.accepted += 1;
  }

  // Requests that expired unanswered count against the partner too — excluding
  // them would flatter exactly the partners this screen exists to surface.
  const expired = await Booking.find({
    status: 'rejected',
    cancelledBy: 'system',
    createdAt: { $gte: since },
  })
    .select('providerId doctorId eventId type')
    .lean();

  for (const b of expired) {
    const { vendorId, vendorType } = await resolveBookingVendor(b);
    if (!vendorId) continue;
    const key = `${vendorId}:${vendorType || ''}`;
    if (!byVendor.has(key)) {
      byVendor.set(key, { vendorId, vendorType, times: [], accepted: 0, rejected: 0, expired: 0 });
    }
    const entry = byVendor.get(key);
    entry.expired = (entry.expired || 0) + 1;
  }

  if (!byVendor.size) return [];

  const profiles = await VendorProfile.find({
    userId: { $in: [...byVendor.values()].map((v) => v.vendorId) },
  })
    .select('userId vendorType businessName approvalStatus')
    .lean();
  const byKey = new Map(profiles.map((p) => [`${p.userId}:${p.vendorType}`, p]));
  const byUser = new Map();
  for (const p of profiles) if (!byUser.has(String(p.userId))) byUser.set(String(p.userId), p);

  const median = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  };

  return [...byVendor.values()]
    .map((v) => {
      const profile = byKey.get(`${v.vendorId}:${v.vendorType}`) || byUser.get(String(v.vendorId));
      const answeredCount = v.times.length;
      const expiredCount = v.expired || 0;
      const total = answeredCount + expiredCount;
      return {
        vendorId: String(v.vendorId),
        vendorType: v.vendorType,
        businessName: profile?.businessName || 'Unnamed partner',
        category: VENDOR_TYPE_LABEL[v.vendorType] || VENDOR_TYPE_LABEL[profile?.vendorType] || 'Uncategorised',
        approvalStatus: profile?.approvalStatus || 'unknown',
        requests: total,
        answered: answeredCount,
        expired: expiredCount,
        accepted: v.accepted,
        rejected: v.rejected,
        medianMinutes: answeredCount ? Math.round(median(v.times) / 60_000) : null,
        slowestMinutes: answeredCount ? Math.round(Math.max(...v.times) / 60_000) : null,
        responseRate: total ? Math.round((answeredCount / total) * 1000) / 10 : 0,
        acceptRate: answeredCount ? Math.round((v.accepted / answeredCount) * 1000) / 10 : 0,
      };
    })
    /* Worst responders first — this screen exists to find problems. */
    .sort((a, b) => a.responseRate - b.responseRate || (b.medianMinutes || 0) - (a.medianMinutes || 0))
    .slice(0, Math.min(200, Number(limit) || 50));
}

/* ── Low stock ────────────────────────────────────────────────────── */

/**
 * Products at or near the point of selling out.
 *
 * Stock was tracked and decremented but never warned about, so the first sign
 * of a stockout was a customer being refused at checkout.
 */
export async function lowStockAlerts({ threshold = 5, limit = 100 } = {}) {
  const limitAt = Math.max(0, Math.min(1000, Number(threshold) || 5));

  const products = await Product.find({ active: true, deletedAt: null })
    .populate('vendorId', 'name')
    .select('name img packSizes vendorId category')
    .limit(1000)
    .lean();

  const rows = [];
  for (const p of products) {
    for (const [i, pack] of (p.packSizes || []).entries()) {
      if (pack.stock > limitAt) continue;
      rows.push({
        productId: String(p._id),
        name: p.name,
        img: p.img || '',
        category: p.category || '—',
        vendorName: p.vendorId?.name || 'Platform',
        vendorId: p.vendorId ? String(p.vendorId._id || p.vendorId) : null,
        size: pack.size,
        packIndex: i,
        stock: pack.stock,
        price: pack.price,
        outOfStock: pack.stock <= 0,
      });
    }
  }

  return rows
    .sort((a, b) => a.stock - b.stock)
    .slice(0, Math.min(500, Number(limit) || 100));
}

/* ── Duplicate bookings ───────────────────────────────────────────── */

/**
 * The same customer booking the same thing twice in quick succession.
 *
 * Almost always a double submit or an impatient retry after a slow payment
 * screen — which means the customer has been charged twice for one intention,
 * and will notice before anybody here does unless this surfaces it.
 *
 * Deliberately a detector rather than a blocker: a genuine second booking (two
 * pets, same salon, same day) is legitimate, and refusing it outright would
 * cost real revenue. A human decides.
 */
export async function duplicateBookings({ withinMinutes = 30, days = 14, limit = 50 } = {}) {
  const since = new Date(Date.now() - Math.min(90, Number(days) || 14) * 86_400_000);
  const windowMs = Math.min(1440, Number(withinMinutes) || 30) * 60_000;

  const groups = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        status: { $nin: ['cancelled', 'rejected', 'payment_failed'] },
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          type: '$type',
          providerId: '$providerId',
          doctorId: '$doctorId',
          eventId: '$eventId',
          startDate: '$schedule.startDate',
          time: '$schedule.time',
        },
        count: { $sum: 1 },
        bookings: {
          $push: {
            id: '$_id', bookingNo: '$bookingNo', createdAt: '$createdAt',
            status: '$status', total: '$amounts.total', petId: '$petId',
            petName: '$petSnapshot.name',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 500 },
  ]);

  const users = await mongoose.model('User')
    .find({ _id: { $in: groups.map((g) => g._id.userId) } })
    .select('name phone')
    .lean();
  const byUser = new Map(users.map((u) => [String(u._id), u]));

  const out = [];
  for (const g of groups) {
    const sorted = [...g.bookings].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const gapMs = new Date(sorted[sorted.length - 1].createdAt) - new Date(sorted[0].createdAt);
    if (gapMs > windowMs) continue;

    /*
     * Different pets on the same slot is a family booking, not a duplicate.
     * Flagging those would train operators to ignore this screen.
     */
    const pets = new Set(sorted.map((b) => String(b.petId || '')));
    if (pets.size === sorted.length && pets.size > 1 && !pets.has('')) continue;

    const user = byUser.get(String(g._id.userId));
    out.push({
      userId: String(g._id.userId),
      customerName: user?.name || 'Guest',
      customerPhone: user?.phone || '—',
      type: g._id.type,
      scheduledFor: g._id.startDate || null,
      time: g._id.time || null,
      count: sorted.length,
      minutesApart: Math.round(gapMs / 60_000),
      totalCharged: rupees(sorted.reduce((s, b) => s + (b.total || 0), 0)),
      bookings: sorted.map((b) => ({
        _id: String(b.id),
        bookingNo: b.bookingNo,
        status: b.status,
        amount: rupees(b.total),
        pet: b.petName || '—',
        createdAt: b.createdAt,
      })),
    });
  }

  return out
    .sort((a, b) => a.minutesApart - b.minutesApart)
    .slice(0, Math.min(200, Number(limit) || 50));
}

/* ── Bookings orphaned by a suspension ────────────────────────────── */

/**
 * Work still owed to customers by partners who are no longer trading.
 *
 * Suspending a partner stops NEW bookings immediately, but it does nothing
 * about the ones they already accepted — those customers have paid, are
 * expecting a service, and the partner cannot deliver it. Without this screen
 * they find out on the day.
 *
 * Rejected and pending-payment bookings are excluded: nothing is owed on those.
 */
export async function orphanedBookings({ limit = 100 } = {}) {
  const suspended = await VendorProfile.find({ approvalStatus: 'suspended' })
    .select('userId vendorType businessName')
    .lean();
  if (!suspended.length) return [];

  const byUser = new Map();
  for (const p of suspended) {
    if (!byUser.has(String(p.userId))) byUser.set(String(p.userId), []);
    byUser.get(String(p.userId)).push(p);
  }

  const open = await Booking.find({
    status: { $in: ['awaiting_vendor', 'confirmed', 'in_progress'] },
  })
    .populate('userId', 'name phone')
    .sort({ 'schedule.startDate': 1 })
    .limit(500);

  const { resolveBookingVendor } = await import('../booking/booking.service.js');
  const rows = [];
  for (const b of open) {
    const { vendorId, vendorType } = await resolveBookingVendor(b);
    if (!vendorId) continue;
    const lines = byUser.get(String(vendorId));
    if (!lines) continue;
    // Only the suspended LINE strands its bookings - a partner whose grooming
    // is suspended still runs their daycare normally.
    const line = lines.find((l) => !vendorType || l.vendorType === vendorType);
    if (!line) continue;

    rows.push({
      _id: String(b._id),
      bookingNo: b.bookingNo,
      type: b.type,
      status: b.status,
      customerName: b.userId?.name || 'Guest',
      customerPhone: b.userId?.phone || '-',
      pet: b.petSnapshot?.name || '-',
      vendorId: String(vendorId),
      vendorType: line.vendorType,
      businessName: line.businessName || 'Suspended partner',
      scheduledFor: b.schedule?.startDate || null,
      time: b.schedule?.time || null,
      amount: rupees(b.amounts?.total),
      /* Service date already past means the customer has already been let down. */
      overdue: b.schedule?.startDate
        ? b.schedule.startDate < new Date().toISOString().slice(0, 10)
        : false,
    });
  }

  return rows.slice(0, Math.min(500, Number(limit) || 100));
}
