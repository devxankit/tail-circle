import mongoose from 'mongoose';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { Payment } from '../payment/payment.model.js';
import { User } from '../user/user.model.js';
import { VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { Refund } from '../payment/refund.model.js';
import { VENDOR_TYPE_LABEL } from '../vendor/vendorTypeLabels.js';

/**
 * Business reporting, aggregated in the database.
 *
 * The Reports screen used to pull the raw bookings and appointments lists and
 * total them in the browser. That was wrong in two ways at once: it could only
 * ever see the rows the list endpoint happened to return — so every number was
 * really "the last 300 bookings", silently, with no indication — and it shipped
 * the whole dataset to the client to add it up.
 *
 * Everything here runs as a `$group` against the full collection, over an
 * explicit date range, so the totals are the real totals.
 *
 * Money is paise in the database and rupees on the way out, converted once at
 * the edge.
 */

const rupees = (paise) => Math.round((paise || 0) / 100);

/** Resolve a range, defaulting to the last 30 days. */
function resolveRange({ from, to } = {}) {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86_400_000);
  return { start, end };
}

/**
 * The founder's overview: what came in, what it cost, and what is going wrong.
 *
 * Revenue is measured from PAID payments rather than from booking totals — a
 * booking that was never paid for is not revenue, and counting it was how the
 * old client-side sum flattered the numbers.
 */
export async function businessReport({ from, to } = {}) {
  const { start, end } = resolveRange({ from, to });
  const range = { $gte: start, $lte: end };

  const [
    gmvAgg, bookingAgg, orderAgg, ledgerAgg, refundAgg,
    customers, newCustomers, activeVendors, repeatAgg,
  ] = await Promise.all([
    // Gross merchandise value: money actually captured.
    Payment.aggregate([
      { $match: { status: { $in: ['paid', 'partially_refunded', 'refunded'] }, createdAt: range } },
      { $group: { _id: null, gross: { $sum: '$amount' }, refunded: { $sum: '$refundedAmount' }, count: { $sum: 1 } } },
    ]),

    // Bookings by status, so cancellation and failure rates are real fractions.
    Booking.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$amounts.total' } } },
    ]),

    Order.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$amounts.total' } } },
    ]),

    // Commission earned, net of refund reversals — reversals are negative rows,
    // so summing everything gives the true platform take without a second query.
    VendorLedgerEntry.aggregate([
      { $match: { createdAt: range } },
      {
        $group: {
          _id: '$vendorType',
          gross: { $sum: '$gross' },
          commission: { $sum: '$commission' },
          vendorNet: { $sum: '$net' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { commission: -1 } },
    ]),

    Refund.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),

    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', createdAt: range }),
    VendorProfile.countDocuments({ approvalStatus: 'approved' }),

    // Customers with more than one paid booking in the window.
    Booking.aggregate([
      { $match: { createdAt: range, status: { $nin: ['pending_payment', 'payment_failed'] } } },
      { $group: { _id: '$userId', bookings: { $sum: 1 } } },
      { $group: { _id: null, total: { $sum: 1 }, repeat: { $sum: { $cond: [{ $gt: ['$bookings', 1] }, 1, 0] } } } },
    ]),
  ]);

  const byStatus = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const bookingStatus = byStatus(bookingAgg);
  const orderStatus = byStatus(orderAgg);

  const totalBookings = bookingAgg.reduce((s, r) => s + r.count, 0);
  const totalOrders = orderAgg.reduce((s, r) => s + r.count, 0);
  const cancelled = (bookingStatus.cancelled || 0) + (bookingStatus.rejected || 0);
  const gross = gmvAgg[0]?.gross || 0;
  const refunded = gmvAgg[0]?.refunded || 0;
  const paidCount = gmvAgg[0]?.count || 0;

  const commission = ledgerAgg.reduce((s, r) => s + r.commission, 0);
  const vendorNet = ledgerAgg.reduce((s, r) => s + r.vendorNet, 0);
  const refundStatus = Object.fromEntries(refundAgg.map((r) => [r._id, { count: r.count, amount: rupees(r.amount) }]));

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    range: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },

    money: {
      gmv: rupees(gross),
      netRevenue: rupees(gross - refunded),
      refunded: rupees(refunded),
      platformCommission: rupees(commission),
      payableToVendors: rupees(vendorNet),
      averageOrderValue: paidCount > 0 ? rupees(gross / paidCount) : 0,
      transactions: paidCount,
    },

    volume: {
      bookings: totalBookings,
      orders: totalOrders,
      completedBookings: bookingStatus.completed || 0,
      cancelledBookings: cancelled,
      noShows: bookingStatus.no_show || 0,
      disputed: bookingStatus.disputed || 0,
      awaitingVendor: bookingStatus.awaiting_vendor || 0,
      paymentFailed: bookingStatus.payment_failed || 0,
      bookingStatus,
      orderStatus,
    },

    rates: {
      cancellationRate: pct(cancelled, totalBookings),
      completionRate: pct(bookingStatus.completed || 0, totalBookings),
      refundRate: pct(refunded, gross),
      paymentFailureRate: pct(bookingStatus.payment_failed || 0, totalBookings),
      repeatCustomerRate: pct(repeatAgg[0]?.repeat || 0, repeatAgg[0]?.total || 0),
    },

    customers: {
      total: customers,
      new: newCustomers,
      transacting: repeatAgg[0]?.total || 0,
      repeat: repeatAgg[0]?.repeat || 0,
    },

    vendors: { active: activeVendors },

    refunds: {
      processed: refundStatus.processed || { count: 0, amount: 0 },
      failed: refundStatus.failed || { count: 0, amount: 0 },
      pending: refundStatus.pending || { count: 0, amount: 0 },
    },

    byCategory: ledgerAgg.map((r) => ({
      category: VENDOR_TYPE_LABEL[r._id] || r._id || 'Other',
      vendorType: r._id,
      gmv: rupees(r.gross),
      commission: rupees(r.commission),
      vendorNet: rupees(r.vendorNet),
      transactions: r.entries,
    })),
  };
}

/** Revenue by partner, worst-to-best on commission contribution. */
export async function revenueByVendor({ from, to, limit = 25 } = {}) {
  const { start, end } = resolveRange({ from, to });
  const rows = await VendorLedgerEntry.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { vendorId: '$vendorId', vendorType: '$vendorType' },
        gross: { $sum: '$gross' },
        commission: { $sum: '$commission' },
        net: { $sum: '$net' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { gross: -1 } },
    { $limit: Math.min(200, Number(limit) || 25) },
  ]);
  if (!rows.length) return [];

  const profiles = await VendorProfile.find({ userId: { $in: rows.map((r) => r._id.vendorId) } })
    .select('userId vendorType businessName rating approvalStatus')
    .lean();
  const byKey = new Map(profiles.map((p) => [`${p.userId}:${p.vendorType}`, p]));
  /*
   * Ledger rows written before multi-line support carry `vendorType: null`, so
   * the exact key misses and every one of them rendered as the placeholder
   * "Partner". Falling back to any profile on that account at least names the
   * business correctly.
   */
  const byUser = new Map();
  for (const p of profiles) if (!byUser.has(String(p.userId))) byUser.set(String(p.userId), p);

  return rows.map((r) => {
    const p =
      byKey.get(`${r._id.vendorId}:${r._id.vendorType}`) || byUser.get(String(r._id.vendorId));
    return {
      vendorId: String(r._id.vendorId),
      vendorType: r._id.vendorType,
      businessName: p?.businessName || 'Unnamed partner',
      category:
        VENDOR_TYPE_LABEL[r._id.vendorType] ||
        VENDOR_TYPE_LABEL[p?.vendorType] ||
        'Uncategorised',
      rating: p?.rating || 0,
      approvalStatus: p?.approvalStatus || 'unknown',
      gmv: rupees(r.gross),
      commission: rupees(r.commission),
      vendorNet: rupees(r.net),
      transactions: r.transactions,
    };
  });
}

/** Daily GMV and volume for the dashboard trend lines. */
export async function revenueTrend({ from, to } = {}) {
  const { start, end } = resolveRange({ from, to });
  const rows = await Payment.aggregate([
    { $match: { status: { $in: ['paid', 'partially_refunded', 'refunded'] }, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        gmv: { $sum: '$amount' },
        refunded: { $sum: '$refundedAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({
    date: r._id,
    gmv: rupees(r.gmv),
    net: rupees(r.gmv - r.refunded),
    transactions: r.count,
  }));
}

/** Revenue by delivery city, read from the address snapshot on each row. */
export async function revenueByLocation({ from, to } = {}) {
  const { start, end } = resolveRange({ from, to });
  const range = { $gte: start, $lte: end };
  const [bookings, orders] = await Promise.all([
    Booking.aggregate([
      { $match: { createdAt: range, status: { $nin: ['pending_payment', 'payment_failed'] } } },
      { $group: { _id: { $ifNull: ['$addressSnapshot.city', 'Unknown'] }, value: { $sum: '$amounts.total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: range, status: { $nin: ['pending_payment'] } } },
      { $group: { _id: { $ifNull: ['$addressSnapshot.city', 'Unknown'] }, value: { $sum: '$amounts.total' }, count: { $sum: 1 } } },
    ]),
  ]);

  const merged = new Map();
  for (const row of [...bookings, ...orders]) {
    const key = row._id || 'Unknown';
    const cur = merged.get(key) || { city: key, value: 0, count: 0 };
    cur.value += row.value || 0;
    cur.count += row.count || 0;
    merged.set(key, cur);
  }
  return [...merged.values()]
    .map((r) => ({ city: r.city, revenue: rupees(r.value), transactions: r.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* ── Dashboard charts ─────────────────────────────────────────────── */

/**
 * Everything the admin dashboard plots, in one round trip.
 *
 * Every series on that screen was previously a hardcoded array — several built
 * with `Math.random()`, regenerated on each page load. The revenue line, the
 * vendor-type donut, the weekly bars and the top-partner table all showed
 * invented numbers that moved when you refreshed, which is worse than showing
 * nothing: an operator reading "₹28.1L" had no way to know it was fiction.
 *
 * Grouped by `$dateToString` in UTC rather than `$dayOfWeek` so buckets line up
 * with their labels regardless of the server's timezone.
 */
export async function dashboardCharts({ range = '1m' } = {}) {
  const [comparison, byVendorType, week, topVendors, sparklines] = await Promise.all([
    revenueComparison(range),
    revenueByVendorType(),
    weeklyActivity(),
    revenueByVendor({ limit: 6 }),
    kpiSparklines(),
  ]);

  return {
    range,
    revenueTrend: comparison,
    revenueByVendorType: byVendorType,
    newUsersThisWeek: week.newUsers,
    ordersVsBookings: week.ordersVsBookings,
    topVendors: topVendors.slice(0, 5).map((v) => ({ name: v.businessName, revenue: v.gmv })),
    partners: topVendors.map((v, i) => ({
      rank: i + 1,
      name: v.businessName,
      role: v.category,
      vendorId: v.vendorId,
      revenue: v.gmv,
      commission: v.commission,
      rating: v.rating,
      transactions: v.transactions,
    })),
    kpiSparklines: sparklines,
  };
}

const RANGE_SPEC = {
  '7d': { days: 7, bucketDays: 1 },
  '1m': { days: 30, bucketDays: 1 },
  '3m': { days: 90, bucketDays: 7 },
};

/**
 * The current period against the one immediately before it, bucket for bucket.
 *
 * Both periods come from a single daily aggregation over the whole span and are
 * bucketed in JS — one round trip instead of two, and it guarantees identical
 * bucket boundaries for the two series, which is the entire point of a
 * comparison chart.
 */
async function revenueComparison(range) {
  const spec = RANGE_SPEC[range] || RANGE_SPEC['1m'];
  const dayMs = 86_400_000;

  const endDay = new Date();
  endDay.setUTCHours(0, 0, 0, 0);
  const currentStart = new Date(endDay.getTime() - (spec.days - 1) * dayMs);
  const previousStart = new Date(currentStart.getTime() - spec.days * dayMs);

  const rows = await Payment.aggregate([
    {
      $match: {
        status: { $in: ['paid', 'partially_refunded', 'refunded'] },
        createdAt: { $gte: previousStart, $lt: new Date(endDay.getTime() + dayMs) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        gross: { $sum: '$amount' },
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [r._id, r.gross]));
  const ymd = (d) => d.toISOString().slice(0, 10);
  const sumRange = (start, days) => {
    let total = 0;
    for (let i = 0; i < days; i += 1) {
      total += byDay.get(ymd(new Date(start.getTime() + i * dayMs))) || 0;
    }
    return total;
  };

  const buckets = Math.ceil(spec.days / spec.bucketDays);
  const out = [];
  for (let b = 0; b < buckets; b += 1) {
    const offset = b * spec.bucketDays * dayMs;
    const curStart = new Date(currentStart.getTime() + offset);
    const prevStart = new Date(previousStart.getTime() + offset);
    out.push({
      day: curStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      date: ymd(curStart),
      thisMonth: rupees(sumRange(curStart, spec.bucketDays)),
      lastMonth: rupees(sumRange(prevStart, spec.bucketDays)),
    });
  }
  return out;
}

/** Donut: gross billing by partner category, net of refund reversals. */
async function revenueByVendorType() {
  const rows = await VendorLedgerEntry.aggregate([
    { $group: { _id: '$vendorType', value: { $sum: '$gross' } } },
    { $sort: { value: -1 } },
  ]);
  return rows
    .filter((r) => r.value > 0)
    .map((r) => ({
      vendorType: r._id || 'other',
      name: VENDOR_TYPE_LABEL[r._id] || 'Other',
      value: rupees(r.value),
    }));
}

/**
 * This week, Monday to Sunday: registrations, and orders against bookings.
 *
 * All seven buckets are pre-seeded so a quiet Tuesday plots as zero rather than
 * disappearing and shifting every later bar along the axis.
 */
async function weeklyActivity() {
  const dayMs = 86_400_000;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  // getUTCDay(): 0 = Sunday. Shift back so the week starts on Monday.
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start.getTime() + 7 * dayMs);

  const groupByDay = (extraMatch = {}) => [
    { $match: { createdAt: { $gte: start, $lt: end }, ...extraMatch } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        count: { $sum: 1 },
      },
    },
  ];

  const [users, orders, bookings] = await Promise.all([
    User.aggregate(groupByDay({ role: 'user' })),
    Order.aggregate(groupByDay({ status: { $ne: 'pending_payment' } })),
    Booking.aggregate(groupByDay({ status: { $nin: ['pending_payment', 'payment_failed'] } })),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [r._id, r.count]));
  const uMap = toMap(users);
  const oMap = toMap(orders);
  const bMap = toMap(bookings);

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const newUsers = [];
  const ordersVsBookings = [];
  for (let i = 0; i < 7; i += 1) {
    const key = new Date(start.getTime() + i * dayMs).toISOString().slice(0, 10);
    newUsers.push({ day: labels[i], value: uMap.get(key) || 0 });
    ordersVsBookings.push({
      day: labels[i],
      orders: oMap.get(key) || 0,
      bookings: bMap.get(key) || 0,
    });
  }
  return { newUsers, ordersVsBookings };
}

/**
 * The ten-day series behind each KPI tile.
 *
 * User and partner counts are cumulative totals as at the end of each day.
 * Plotting daily signups beneath a tile that reads "Total Users" would draw a
 * line contradicting the number printed directly above it.
 */
async function kpiSparklines() {
  const dayMs = 86_400_000;
  const days = 10;
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - (days - 1) * dayMs);
  start.setUTCHours(0, 0, 0, 0);

  const dayKeys = Array.from({ length: days }, (_, i) =>
    new Date(start.getTime() + i * dayMs).toISOString().slice(0, 10)
  );

  const dailyCounts = async (Model, match) => {
    const rows = await Model.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, ...match } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const map = new Map(rows.map((r) => [r._id, r.count]));
    return dayKeys.map((k) => map.get(k) || 0);
  };

  const [baseUsers, baseVendors, userDaily, vendorDaily, revenueRows, apptDaily] = await Promise.all([
    User.countDocuments({ role: 'user', createdAt: { $lt: start } }),
    VendorProfile.countDocuments({ approvalStatus: 'approved', createdAt: { $lt: start } }),
    dailyCounts(User, { role: 'user' }),
    dailyCounts(VendorProfile, { approvalStatus: 'approved' }),
    Payment.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
    dailyCounts(Booking, { type: 'doctor' }),
  ]);

  const runningTotal = (base, daily) => {
    let acc = base;
    return daily.map((n) => {
      acc += n;
      return acc;
    });
  };
  const revMap = new Map(revenueRows.map((r) => [r._id, r.total]));

  return {
    totalUsers: runningTotal(baseUsers, userDaily),
    activeVendors: runningTotal(baseVendors, vendorDaily),
    revenueToday: dayKeys.map((k) => rupees(revMap.get(k) || 0)),
    appointmentsToday: apptDaily,
  };
}
