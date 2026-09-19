import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import {
  ConsentRecord,
  UserSession,
  ActivityEvent,
  EVENT_TYPES,
} from './analytics.models.js';

/**
 * Customer activity tracking, gated on consent.
 *
 * The single rule this file exists to enforce: NOTHING is recorded for a
 * visitor who has not actively granted analytics consent. Declining is not
 * "track anonymously" — it is no row at all. Every ingest path checks consent
 * first and silently drops the event otherwise, so a client that keeps sending
 * after a withdrawal cannot write anything.
 *
 * Ingest is fire-and-forget by design. A tracking failure must never surface to
 * a customer or block a page: analytics is the least important thing happening
 * on any request that carries it.
 */

export const POLICY_VERSION = 'v1';

/* ── Consent ──────────────────────────────────────────────────────── */

/**
 * Record a decision. Always inserts rather than updating, so the history of
 * grants and withdrawals stays demonstrable.
 */
export async function recordConsent({
  deviceId,
  userId = null,
  analytics,
  source = 'banner',
  ip = '',
  userAgent = '',
}) {
  if (!deviceId) throw ApiError.badRequest('A device id is required to record consent');
  if (typeof analytics !== 'boolean') throw ApiError.badRequest('Consent must be explicit');

  const record = await ConsentRecord.create({
    deviceId,
    userId,
    analytics,
    essential: true,
    policyVersion: POLICY_VERSION,
    source,
    ip,
    userAgent,
  });

  /*
   * Withdrawing consent deletes what was collected under it.
   *
   * Keeping the data would mean the withdrawal changed nothing that matters.
   * Best-effort: a failure here must not stop the withdrawal being recorded,
   * which is the part that stops further collection.
   */
  if (!analytics) {
    try {
      await Promise.all([
        ActivityEvent.deleteMany({ deviceId }),
        UserSession.deleteMany({ deviceId }),
      ]);
    } catch (err) {
      logger.error(`Consent withdrawal cleanup failed for device ${deviceId}: ${err.message}`);
    }
  }

  return serializeConsent(record);
}

/** The visitor's current decision, or null if they have never been asked. */
export async function getConsent(deviceId) {
  if (!deviceId) return null;
  const record = await ConsentRecord.findOne({ deviceId }).sort({ decidedAt: -1 }).lean();
  if (!record) return null;
  return serializeConsent(record);
}

/**
 * May we record for this device right now?
 *
 * Re-read on every ingest rather than trusted from the client, because the
 * client is the one thing that cannot be relied on to stop sending.
 */
export async function hasAnalyticsConsent(deviceId) {
  if (!deviceId) return false;
  const record = await ConsentRecord.findOne({ deviceId })
    .sort({ decidedAt: -1 })
    .select('analytics policyVersion')
    .lean();
  return Boolean(record?.analytics) && record.policyVersion === POLICY_VERSION;
}

function serializeConsent(r) {
  return {
    deviceId: r.deviceId,
    analytics: r.analytics,
    essential: r.essential,
    policyVersion: r.policyVersion,
    decidedAt: r.decidedAt,
  };
}

/* ── Ingest ───────────────────────────────────────────────────────── */

const clean = (s, max = 300) => String(s || '').trim().slice(0, max);
/** Query strings routinely carry tokens and personal detail — never stored. */
const stripQuery = (p) => clean(p).split('?')[0].split('#')[0];

/**
 * Record a batch of events for one session.
 *
 * Batched because a browsing session produces dozens of events and one request
 * per event would be both wasteful and easy to lose on navigation. Returns the
 * number actually written — zero is a normal outcome (no consent), not an error.
 */
export async function recordEvents({
  deviceId,
  userId = null,
  sessionId,
  events = [],
  city = '',
  platform = 'web',
  referrer = '',
}) {
  if (!deviceId || !sessionId || !Array.isArray(events) || !events.length) return { written: 0 };
  if (!(await hasAnalyticsConsent(deviceId))) return { written: 0, reason: 'no_consent' };

  const now = new Date();
  const rows = [];
  for (const e of events.slice(0, 200)) {
    if (!EVENT_TYPES.includes(e.type)) continue;
    rows.push({
      sessionId,
      deviceId,
      userId,
      type: e.type,
      path: stripQuery(e.path),
      screen: clean(e.screen, 80),
      durationMs: Math.max(0, Math.min(Number(e.durationMs) || 0, 6 * 3600_000)),
      query: e.type === 'search' ? clean(e.query, 120).toLowerCase() : '',
      resultCount: e.resultCount == null ? null : Number(e.resultCount),
      refType: e.refType || null,
      refId: e.refId ? clean(e.refId, 64) : null,
      refName: clean(e.refName, 120),
      category: clean(e.category, 60),
      city: clean(city, 60),
      platform: clean(platform, 20),
      meta: typeof e.meta === 'object' && e.meta ? e.meta : {},
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
    });
  }
  if (!rows.length) return { written: 0 };

  await ActivityEvent.insertMany(rows, { ordered: false });
  await touchSession({ sessionId, deviceId, userId, rows, city, platform, referrer });
  return { written: rows.length };
}

/** Create or extend the session these events belong to. */
async function touchSession({ sessionId, deviceId, userId, rows, city, platform, referrer }) {
  const screens = rows.filter((r) => r.type === 'screen_view').length;
  const searches = rows.filter((r) => r.type === 'search').length;
  const conversion = rows.find((r) => r.type === 'booking' || r.type === 'order');
  const last = rows[rows.length - 1];

  const update = {
    $setOnInsert: {
      sessionId,
      deviceId,
      startedAt: rows[0].occurredAt,
      entryPath: rows[0].path,
      city: clean(city, 60),
      platform: clean(platform, 20),
      referrer: clean(referrer, 200),
    },
    $set: { lastSeenAt: last.occurredAt, exitPath: last.path },
    $inc: { eventCount: rows.length, screenCount: screens, searchCount: searches },
  };
  // Only stamp the user once they are known — a session can start logged out.
  if (userId) update.$set.userId = userId;
  if (conversion) {
    update.$set.converted = true;
    update.$set.conversionType = conversion.type;
  }

  const session = await UserSession.findOneAndUpdate({ sessionId }, update, {
    upsert: true,
    new: true,
  });
  if (!session) return;

  /*
   * Duration is derived from the session's own timestamps rather than
   * accumulated, so it stays correct however many batches arrive and whatever
   * order they arrive in. Computed here instead of as an aggregation-pipeline
   * update because Mongoose refuses an array update without an extra option,
   * and a second tiny write is clearer than that flag.
   */
  const durationMs = new Date(session.lastSeenAt) - new Date(session.startedAt);
  if (durationMs >= 0 && durationMs !== session.durationMs) {
    await UserSession.updateOne({ sessionId }, { $set: { durationMs } });
  }
}

/* ── Per-customer journey ─────────────────────────────────────────── */

/**
 * One customer's activity, grouped into the visits it happened in.
 *
 * Grouped rather than a flat event list because a flat list of 400 rows does
 * not answer "what were they trying to do?" — the shape of a single visit does.
 */
export async function customerActivity(userId, { limit = 20 } = {}) {
  if (!mongoose.isValidObjectId(userId)) throw ApiError.badRequest('Invalid customer id');

  const sessions = await UserSession.find({ userId })
    .sort({ startedAt: -1 })
    .limit(Math.min(100, Number(limit) || 20))
    .lean();

  if (!sessions.length) {
    return { sessions: [], totals: emptyTotals(), consent: null };
  }

  const events = await ActivityEvent.find({ sessionId: { $in: sessions.map((s) => s.sessionId) } })
    .sort({ occurredAt: 1 })
    .lean();

  const bySession = new Map();
  for (const e of events) {
    if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, []);
    bySession.get(e.sessionId).push({
      type: e.type,
      screen: e.screen || e.path,
      path: e.path,
      durationMs: e.durationMs,
      query: e.query,
      refType: e.refType,
      refName: e.refName,
      category: e.category,
      occurredAt: e.occurredAt,
    });
  }

  const [consent] = await ConsentRecord.find({ userId }).sort({ decidedAt: -1 }).limit(1).lean();

  return {
    consent: consent ? serializeConsent(consent) : null,
    totals: {
      sessions: sessions.length,
      totalTimeMs: sessions.reduce((s, x) => s + (x.durationMs || 0), 0),
      screens: sessions.reduce((s, x) => s + (x.screenCount || 0), 0),
      searches: sessions.reduce((s, x) => s + (x.searchCount || 0), 0),
      conversions: sessions.filter((s) => s.converted).length,
    },
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      entryPath: s.entryPath,
      exitPath: s.exitPath,
      converted: s.converted,
      conversionType: s.conversionType,
      city: s.city,
      platform: s.platform,
      events: bySession.get(s.sessionId) || [],
    })),
  };
}

const emptyTotals = () => ({ sessions: 0, totalTimeMs: 0, screens: 0, searches: 0, conversions: 0 });

/* ── Aggregate reports ────────────────────────────────────────────── */

function range({ from, to } = {}) {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86_400_000);
  return { $gte: start, $lte: end };
}

/** What customers searched for, most common first. */
export async function topSearches({ from, to, limit = 25 } = {}) {
  const rows = await ActivityEvent.aggregate([
    { $match: { type: 'search', query: { $ne: '' }, occurredAt: range({ from, to }) } },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        people: { $addToSet: '$deviceId' },
        avgResults: { $avg: '$resultCount' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: Math.min(100, Number(limit) || 25) },
  ]);
  return rows.map((r) => ({
    query: r._id,
    searches: r.count,
    people: r.people.length,
    /* A common search returning nothing is a gap in the catalogue. */
    avgResults: r.avgResults == null ? null : Math.round(r.avgResults * 10) / 10,
  }));
}

/** Most viewed services, products and categories. */
export async function topViewedItems({ from, to, refType, limit = 25 } = {}) {
  const match = { type: 'item_view', occurredAt: range({ from, to }) };
  if (refType && refType !== 'All') match.refType = refType;

  const rows = await ActivityEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: { refType: '$refType', refId: '$refId' },
        name: { $last: '$refName' },
        category: { $last: '$category' },
        views: { $sum: 1 },
        people: { $addToSet: '$deviceId' },
        totalTimeMs: { $sum: '$durationMs' },
      },
    },
    { $sort: { views: -1 } },
    { $limit: Math.min(100, Number(limit) || 25) },
  ]);
  return rows.map((r) => ({
    refType: r._id.refType,
    refId: r._id.refId,
    name: r.name || '(unnamed)',
    category: r.category || '-',
    views: r.views,
    people: r.people.length,
    avgTimeMs: r.views ? Math.round(r.totalTimeMs / r.views) : 0,
  }));
}

/** Where customers spend their time, by screen. */
export async function screenEngagement({ from, to, limit = 25 } = {}) {
  const rows = await ActivityEvent.aggregate([
    { $match: { type: 'screen_view', occurredAt: range({ from, to }) } },
    {
      $group: {
        _id: { $ifNull: ['$screen', '$path'] },
        path: { $last: '$path' },
        views: { $sum: 1 },
        people: { $addToSet: '$deviceId' },
        totalTimeMs: { $sum: '$durationMs' },
      },
    },
    { $sort: { views: -1 } },
    { $limit: Math.min(100, Number(limit) || 25) },
  ]);
  return rows.map((r) => ({
    screen: r._id || r.path,
    path: r.path,
    views: r.views,
    people: r.people.length,
    avgTimeMs: r.views ? Math.round(r.totalTimeMs / r.views) : 0,
    totalTimeMs: r.totalTimeMs,
  }));
}

/**
 * Browse-to-booking funnel.
 *
 * Counted on DISTINCT sessions per stage, not raw events: a customer who views
 * six providers is one person shopping, not six.
 */
export async function conversionFunnel({ from, to } = {}) {
  const occurredAt = range({ from, to });
  const stage = async (match) => {
    const [r] = await ActivityEvent.aggregate([
      { $match: { occurredAt, ...match } },
      { $group: { _id: '$sessionId' } },
      { $count: 'n' },
    ]);
    return r?.n || 0;
  };

  const [visited, viewedItem, startedCheckout, completed] = await Promise.all([
    stage({ type: 'screen_view' }),
    stage({ type: 'item_view' }),
    stage({ type: { $in: ['add_to_cart', 'checkout_start'] } }),
    stage({ type: { $in: ['booking', 'order'] } }),
  ]);

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
  return {
    stages: [
      { stage: 'Visited', sessions: visited, ofPrevious: 100, ofTotal: 100 },
      { stage: 'Viewed a service or product', sessions: viewedItem, ofPrevious: pct(viewedItem, visited), ofTotal: pct(viewedItem, visited) },
      { stage: 'Started checkout', sessions: startedCheckout, ofPrevious: pct(startedCheckout, viewedItem), ofTotal: pct(startedCheckout, visited) },
      { stage: 'Completed booking or order', sessions: completed, ofPrevious: pct(completed, startedCheckout), ofTotal: pct(completed, visited) },
    ],
    /* The single number the founder actually asked for. */
    overallConversion: pct(completed, visited),
    /* Biggest single drop, so the screen names where to look first. */
    biggestDropOff: [
      { from: 'Visited', to: 'Viewed', lost: visited - viewedItem },
      { from: 'Viewed', to: 'Checkout', lost: viewedItem - startedCheckout },
      { from: 'Checkout', to: 'Completed', lost: startedCheckout - completed },
    ].sort((a, b) => b.lost - a.lost)[0] || null,
  };
}

/** Which cities customers are browsing from. */
export async function browsingByLocation({ from, to } = {}) {
  const rows = await UserSession.aggregate([
    { $match: { startedAt: range({ from, to }) } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$city', ''] }, 'Unknown', '$city'] },
        sessions: { $sum: 1 },
        people: { $addToSet: '$deviceId' },
        converted: { $sum: { $cond: ['$converted', 1, 0] } },
        totalTimeMs: { $sum: '$durationMs' },
      },
    },
    { $sort: { sessions: -1 } },
    { $limit: 50 },
  ]);
  return rows.map((r) => ({
    city: r._id,
    sessions: r.sessions,
    people: r.people.length,
    converted: r.converted,
    conversionRate: r.sessions ? Math.round((r.converted / r.sessions) * 1000) / 10 : 0,
    avgTimeMs: r.sessions ? Math.round(r.totalTimeMs / r.sessions) : 0,
  }));
}

/** What customers looked at but never booked — the demand the platform missed. */
export async function viewedNotBooked({ from, to, limit = 25 } = {}) {
  const occurredAt = range({ from, to });
  const rows = await ActivityEvent.aggregate([
    { $match: { type: 'item_view', occurredAt, refId: { $ne: null } } },
    { $group: { _id: { refType: '$refType', refId: '$refId' }, name: { $last: '$refName' }, views: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
    { $sort: { views: -1 } },
    { $limit: 200 },
  ]);
  if (!rows.length) return [];

  // Sessions that ended in a purchase — anything viewed only in other sessions
  // is interest that never converted.
  const convertedSessions = new Set(
    (await UserSession.find({ converted: true, startedAt: occurredAt }).select('sessionId').lean())
      .map((s) => s.sessionId)
  );

  return rows
    .map((r) => {
      const total = r.sessions.length;
      const withPurchase = r.sessions.filter((s) => convertedSessions.has(s)).length;
      return {
        refType: r._id.refType,
        refId: r._id.refId,
        name: r.name || '(unnamed)',
        views: r.views,
        sessions: total,
        sessionsThatBooked: withPurchase,
        abandonRate: total ? Math.round(((total - withPurchase) / total) * 1000) / 10 : 0,
      };
    })
    .filter((r) => r.sessions >= 2 && r.abandonRate > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, Math.min(100, Number(limit) || 25));
}

/** Headline behaviour numbers for the Admin dashboard. */
export async function behaviourSummary({ from, to } = {}) {
  const startedAt = range({ from, to });
  const [sessionAgg] = await UserSession.aggregate([
    { $match: { startedAt } },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        people: { $addToSet: '$deviceId' },
        converted: { $sum: { $cond: ['$converted', 1, 0] } },
        totalTimeMs: { $sum: '$durationMs' },
        totalScreens: { $sum: '$screenCount' },
      },
    },
  ]);

  const [consentAgg] = await ConsentRecord.aggregate([
    { $sort: { decidedAt: -1 } },
    { $group: { _id: '$deviceId', analytics: { $first: '$analytics' } } },
    {
      $group: {
        _id: null,
        asked: { $sum: 1 },
        granted: { $sum: { $cond: ['$analytics', 1, 0] } },
      },
    },
  ]);

  const sessions = sessionAgg?.sessions || 0;
  const asked = consentAgg?.asked || 0;
  const granted = consentAgg?.granted || 0;

  return {
    sessions,
    visitors: sessionAgg?.people?.length || 0,
    convertedSessions: sessionAgg?.converted || 0,
    conversionRate: sessions ? Math.round((sessionAgg.converted / sessions) * 1000) / 10 : 0,
    avgSessionMs: sessions ? Math.round(sessionAgg.totalTimeMs / sessions) : 0,
    avgScreensPerSession: sessions ? Math.round((sessionAgg.totalScreens / sessions) * 10) / 10 : 0,
    consent: {
      asked,
      granted,
      declined: asked - granted,
      /* Low opt-in means the analytics below describe a minority — worth knowing. */
      grantRate: asked ? Math.round((granted / asked) * 1000) / 10 : 0,
    },
  };
}
