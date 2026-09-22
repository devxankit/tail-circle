import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../user/user.model.js';
import { Pet } from '../pet/pet.model.js';
import { Payment } from '../payment/payment.model.js';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { Product } from '../shop/product.model.js';
import { Provider } from '../provider/provider.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { UserSubscription } from '../subscription/subscription.models.js';
import { serializeProfile } from '../vendor/vendor.service.js';
import { VENDOR_TYPE_LABEL } from '../vendor/vendorTypeLabels.js';
import { invalidate } from '../../services/cache.service.js';
import { isUserOnline, onlineUserCount } from '../../sockets/index.js';
import { AuditLog, Banner, PlatformSetting, AdminActionItem } from './admin.models.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const todayYmd = () => new Date().toISOString().slice(0, 10);

/* ── Audit trail ──────────────────────────────────────────────────── */
export async function writeAudit(actor, { action, targetType = '', targetId = '', before = null, after = null, ip = '' }) {
  return AuditLog.create({
    actorId: actor?.id || null,
    actorName: actor?.name || actor?.email || '',
    action,
    targetType,
    targetId: String(targetId || ''),
    before,
    after,
    ip,
  });
}

export async function listAuditLogs(limit = 100) {
  const rows = await AuditLog.find().sort({ at: -1 }).limit(limit);
  return rows.map((r) => ({
    id: String(r._id),
    actor: r.actorName,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    ip: r.ip,
    at: r.at,
  }));
}

/* ── Admin Action Items Center ───────────────────────────────────── */

/*
 * The founder's "what needs me today" queue.
 *
 * This used to seed six hardcoded rows into MongoDB on first read - invented
 * vendors, invented refund requests, invented customer names, one of them
 * pointing at a route that does not exist. On launch day the first thing the
 * Admin Panel would have shown was fabricated work. The seeding is gone; every
 * item below is derived from something that actually happened.
 *
 * Derived items are upserted on a stable `sourceKey` so resolving one sticks,
 * and are withdrawn automatically when the underlying condition clears - an
 * approved vendor should not linger in the queue because nobody ticked it off.
 */

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Normal: 3 };

/**
 * Rebuild the derived queue from live data.
 *
 * Each collector returns rows keyed by `sourceKey`. Anything pending whose key
 * is no longer produced is withdrawn, so the queue can only ever show work that
 * is still outstanding.
 */
export async function syncActionItems() {
  const collected = [
    ...(await collectPendingVendors()),
    ...(await collectFailedRefunds()),
    ...(await collectUnreversedRefunds()),
    ...(await collectUnansweredBookings()),
    ...(await collectReturnRequests()),
    ...(await collectOpenSupport()),
    ...(await collectReportedContent()),
  ];

  for (const item of collected) {
    /*
     * `status` is set ONLY on insert.
     *
     * This used to `$set: { ...item, status: 'pending' }` on every sync, and
     * `listActionItems` syncs on every read — so an item an admin had just
     * approved was flipped straight back to pending and reappeared on the
     * dashboard the moment the page refreshed. Approving anything looked like
     * it did nothing.
     *
     * Display fields still refresh (a vendor's document count can change while
     * the item sits in the queue); the workflow state does not.
     */
    const { sourceKey, ...display } = item;
    await AdminActionItem.updateOne(
      { sourceKey },
      {
        $set: display,
        $setOnInsert: { sourceKey, status: 'pending', createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  /*
   * Withdraw items whose cause is gone — whatever their state.
   *
   * Resolved rows are cleared too, not just pending ones: keeping them would
   * mean a condition that recurs later (a vendor re-applying after rejection)
   * could never raise a fresh item, because the old resolved row still owns the
   * unique `sourceKey`.
   */
  const liveKeys = collected.map((i) => i.sourceKey);
  await AdminActionItem.deleteMany({
    sourceKey: { $exists: true, $nin: liveKeys },
  });

  return collected.length;
}

async function collectPendingVendors() {
  const rows = await VendorProfile.find({ approvalStatus: 'pending' })
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map((v) => ({
    sourceKey: `vendor:${v._id}`,
    category: 'Vendor Approval',
    type: VENDOR_TYPE_LABEL[v.vendorType] || 'Partner',
    title: v.businessName || v.userId?.name || 'Partner registration',
    subtitle: `${VENDOR_TYPE_LABEL[v.vendorType] || 'Partner'} - awaiting verification`,
    details: `${(v.documents || []).length} document(s) submitted. Applied ${new Date(v.createdAt).toLocaleDateString('en-IN')}.`,
    priority: (v.documents || []).length ? 'High' : 'Medium',
    targetId: String(v._id),
    navPath: '/admin/vendors/pending',
    docName: v.documents?.[0]?.name || '',
    applicant: v.userId?.name || v.userId?.email || '',
  }));
}

async function collectFailedRefunds() {
  const { Refund } = await import('../payment/refund.model.js');
  const rows = await Refund.find({ status: 'failed' })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map((r) => ({
    sourceKey: `refund_failed:${r._id}`,
    category: 'Refund Request',
    type: 'Failed Refund',
    title: `Refund ${r.refundNo} failed`,
    subtitle: `${r.userId?.name || 'Customer'} - Rs ${Math.round(r.amount / 100).toLocaleString('en-IN')}`,
    details: `${r.reason}. Gateway error: ${r.failureReason || 'unknown'}. ${r.attempts} attempt(s). The customer is still owed this money.`,
    priority: 'Urgent',
    targetId: String(r._id),
    navPath: '/admin/finance/refunds',
    amount: `Rs ${Math.round(r.amount / 100).toLocaleString('en-IN')}`,
    applicant: r.userId?.name || '',
  }));
}

/*
 * Refunds that reached the customer but never clawed the vendor's earning
 * back. Silent money leak: the platform pays out on a sale it refunded.
 */
async function collectUnreversedRefunds() {
  const { Refund } = await import('../payment/refund.model.js');
  const rows = await Refund.find({ status: 'processed', ledgerReversed: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map((r) => ({
    sourceKey: `refund_unreversed:${r._id}`,
    category: 'Reconciliation',
    type: 'Ledger Reversal Pending',
    title: `Refund ${r.refundNo} not clawed back from partner`,
    subtitle: `Rs ${Math.round(r.amount / 100).toLocaleString('en-IN')} refunded, partner still credited`,
    details: r.ledgerReversalError || 'The vendor ledger was not reversed for this refund.',
    priority: 'Urgent',
    targetId: String(r._id),
    navPath: '/admin/finance/refunds',
    amount: `Rs ${Math.round(r.amount / 100).toLocaleString('en-IN')}`,
  }));
}

async function collectUnansweredBookings() {
  const rows = await Booking.find({
    status: 'awaiting_vendor',
    vendorRespondBy: { $ne: null, $lt: new Date() },
  })
    .populate('userId', 'name')
    .sort({ vendorRespondBy: 1 })
    .limit(50)
    .lean();
  return rows.map((b) => ({
    sourceKey: `booking_unanswered:${b._id}`,
    category: 'Operations',
    type: 'Unanswered Booking',
    title: `Booking ${b.bookingNo} unanswered by partner`,
    subtitle: `${b.userId?.name || 'Customer'} - ${b.type} on ${b.schedule?.startDate || 'TBC'}`,
    details: 'The partner did not respond inside their window. Reassign or refund before the customer turns up to nothing.',
    priority: 'Urgent',
    targetId: String(b._id),
    navPath: '/admin/operations/bookings',
    amount: `Rs ${Math.round((b.amounts?.total || 0) / 100).toLocaleString('en-IN')}`,
    applicant: b.userId?.name || '',
  }));
}

async function collectReturnRequests() {
  const rows = await Order.find({ status: 'return_requested' })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map((o) => ({
    sourceKey: `return:${o._id}`,
    category: 'Refund Request',
    type: 'Order Return',
    title: `Return requested - ${o.orderNo}`,
    subtitle: `${o.userId?.name || 'Customer'} - Rs ${Math.round((o.amounts?.total || 0) / 100).toLocaleString('en-IN')}`,
    details: o.timeline?.slice(-1)[0]?.note || 'Return requested by customer.',
    priority: 'High',
    targetId: String(o._id),
    navPath: '/admin/operations/returns',
    amount: `Rs ${Math.round((o.amounts?.total || 0) / 100).toLocaleString('en-IN')}`,
    applicant: o.userId?.name || '',
  }));
}

async function collectOpenSupport() {
  const { SupportTicket } = await import('../support/supportTicket.model.js');
  const rows = await SupportTicket.find({ status: { $in: ['open', 'in_progress'] } })
    .populate('userId', 'name role')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return rows.map((t) => ({
    sourceKey: `support:${t._id}`,
    category: 'Support',
    type: t.userId?.role === 'vendor' ? 'Partner Issue' : 'Customer Complaint',
    title: t.subject || 'Support ticket',
    subtitle: `${t.userId?.name || 'User'} - ${t.category || 'general'}`,
    details: t.message || '',
    priority: 'Medium',
    targetId: String(t._id),
    navPath: '/admin/operations/support',
    applicant: t.userId?.name || '',
  }));
}

/*
 * Reports live in their own collection, so the count per post comes from an
 * aggregation rather than an embedded array.
 */
async function collectReportedContent() {
  const { Post, PostReport } = await import('../social/social.models.js');
  const grouped = await PostReport.aggregate([
    { $group: { _id: '$postId', count: { $sum: 1 }, reason: { $first: '$reason' } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
  if (!grouped.length) return [];

  const posts = await Post.find({
    _id: { $in: grouped.map((g) => g._id) },
    deletedAt: null,
    status: { $ne: 'hidden' },
  })
    .select('_id caption')
    .lean();
  const live = new Map(posts.map((post) => [String(post._id), post]));

  return grouped
    .filter((g) => live.has(String(g._id)))
    .map((g) => ({
      sourceKey: `post_report:${g._id}`,
      category: 'Moderation',
      type: 'Reported Post',
      title: 'Reported community post',
      subtitle: `${g.count} report(s)`,
      details: g.reason || 'Reported by a community member.',
      priority: g.count > 2 ? 'High' : 'Medium',
      targetId: String(g._id),
      navPath: '/admin/platform/reports',
    }));
}

export async function listActionItems({ status = 'pending', category, priority } = {}) {
  /*
   * Refreshed on read rather than on a schedule. The queue is small, it is
   * opened a handful of times a day, and a stale action queue is worse than a
   * slightly slower one - an operator acting on withdrawn work is exactly the
   * failure this replaced.
   */
  await syncActionItems().catch(() => {});
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category && category !== 'All') filter.category = category;
  if (priority && priority !== 'All') filter.priority = priority;

  const rows = await AdminActionItem.find(filter).sort({ createdAt: -1 }).lean();
  // `priority` is a label, not a number - sorting on it put "High" before
  // "Urgent" alphabetically and buried the things that actually mattered.
  rows.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  );

  return rows.map((r) => ({
    id: String(r._id),
    sourceKey: r.sourceKey,
    category: r.category,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle,
    details: r.details,
    priority: r.priority,
    status: r.status,
    time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently',
    targetId: r.targetId,
    navPath: r.navPath,
    docName: r.docName,
    applicant: r.applicant,
    amount: r.amount,
  }));
}

/*
 * `resolveActionItem` moved to admin.actions.service.js.
 *
 * It lived here doing nothing but flipping a status flag, which is exactly why
 * approving from the dashboard never changed anything. It now dispatches to the
 * real operation behind each item, so it needs the ops/refund/social services
 * that cannot be imported from this file without a cycle.
 */

/* ── Dashboard ────────────────────────────────────────────────────── */
// Shared labels — this map covered only five of the eight vendor types, so
// grooming, daycare and adoption vendors were reported as "Other".
const TYPE_LABEL = VENDOR_TYPE_LABEL;
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export async function getDashboard() {
  const [totalUsers, activeVendors, pendingVendors, revenueAgg, appointmentsToday, ledgerByVendor, actionItems] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    VendorProfile.countDocuments({ approvalStatus: 'approved' }),
    VendorProfile.countDocuments({ approvalStatus: 'pending' }),
    Payment.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: startOfDay() } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.countDocuments({ type: 'doctor', 'schedule.startDate': todayYmd() }),
    VendorLedgerEntry.aggregate([{ $group: { _id: '$vendorId', gross: { $sum: '$gross' } } }]),
    listActionItems({ status: 'pending' }),
  ]);

  // Join ledger totals with vendor profiles for donut + top partners.
  const vendorIds = ledgerByVendor.map((l) => l._id).filter(Boolean);
  const profiles = await VendorProfile.find({ userId: { $in: vendorIds } }).select('userId businessName vendorType rating');
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]));

  const donutMap = {};
  const partners = [];
  for (const l of ledgerByVendor) {
    const p = byUser.get(String(l._id));
    if (!p) continue;
    const label = TYPE_LABEL[p.vendorType] || 'Other';
    donutMap[label] = (donutMap[label] || 0) + l.gross;
    partners.push({ name: p.businessName, type: label, revenue: l.gross, rating: p.rating || 0 });
  }
  partners.sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: {
      totalUsers,
      activeVendors,
      pendingVendors,
      revenueToday: Math.round((revenueAgg[0]?.total || 0) / 100),
      appointmentsToday,
    },
    actionItems,
    donut: Object.entries(donutMap).map(([name, value]) => ({ name, value: Math.round(value / 100) })),
    topPartners: partners.slice(0, 6).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      role: p.type,
      revenue: Math.round(p.revenue / 100),
      rating: p.rating,
    })),
  };
}

/* ── Users & pets ─────────────────────────────────────────────────── */
/**
 * A paid subscription counts only while it is both `active` and unexpired.
 * `getActiveSubscription()` settles a lapsed row on read, but that is a write
 * per user — far too heavy for a 500-row list, so the same expiry rule is
 * applied in memory here and the row is left for that path to clean up.
 */
const liveSub = (s, now) => s.status === 'active' && (!s.expiresAt || s.expiresAt > now);

/** Search text is a literal, not a pattern — a stray `(` must not 500. */
const rx = (text) => new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

export async function listUsers({ search } = {}) {
  const filter = { role: 'user' };
  if (search) {
    const re = rx(search);
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
  const ids = users.map((u) => u._id);

  const [counts, subs] = await Promise.all([
    // Pet names ride along with the count so the profile drawer can list the
    // actual pets instead of only saying how many there are.
    Pet.aggregate([
      { $match: { deletedAt: null, ownerId: { $in: ids } } },
      { $group: { _id: '$ownerId', n: { $sum: 1 }, names: { $push: '$name' } } },
    ]),
    UserSubscription.find({ userId: { $in: ids }, status: 'active' })
      .select('userId plan planKey expiresAt')
      .sort({ expiresAt: -1 })
      .lean(),
  ]);

  const now = new Date();
  const petMap = new Map(counts.map((c) => [String(c._id), c]));
  // Sorted by expiry above, so the first live row per user is the longest-running.
  const subMap = new Map();
  for (const s of subs) {
    if (liveSub(s, now) && !subMap.has(String(s.userId))) subMap.set(String(s.userId), s);
  }

  return users.map((u) => {
    const pets = petMap.get(String(u._id));
    const sub = subMap.get(String(u._id));
    return {
      id: String(u._id),
      name: u.name || 'Unnamed',
      // The phone belongs in its own column; borrowing it here made every
      // OTP-only account look like it had an email address.
      email: u.email || '',
      phone: u.phone || '—',
      city: u.city || '—',
      // Null when the user never set a picture — the panel draws initials.
      // This used to hand back a random stock portrait from pravatar.cc.
      avatar: u.avatarUrl || null,
      joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
      joinedAt: u.createdAt || null,
      // `plan` is the bucket the filter tabs work on; `planName` is what the
      // user actually bought ("Gold", "Standard", …).
      plan: sub ? 'Premium' : 'Free',
      planName: sub?.plan?.name || sub?.planKey || 'Free',
      planExpiresAt: sub?.expiresAt || null,
      pets: pets?.n || 0,
      petNames: pets?.names || [],
      status: u.isBlocked ? 'Suspended' : 'Active',
      kyc: u.isPhoneVerified ? 'Verified' : 'Pending',
      lastActiveAt: u.lastSeenAt || u.lastLoginAt || null,
      // Live socket presence, not a timestamp comparison: `isUserOnline` counts
      // the sockets actually open for this account right now.
      online: isUserOnline(u._id),
      lastLoginAt: u.lastLoginAt || null,
      lastSeenAt: u.lastSeenAt || null,
    };
  });
}

/**
 * Counters for the User Management header cards.
 *
 * Deliberately separate from the list: the list is capped at 500 rows and
 * narrowed by the search box, so counting it would understate the platform.
 */
export async function userStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const unexpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
  // Subscribers, not subscriptions — one person renewing twice is one of these.
  // Grouped rather than `distinct()`, which would cap out at a 16MB result.
  const subscribers = (match) =>
    UserSubscription.aggregate([{ $match: match }, { $group: { _id: '$userId' } }, { $count: 'n' }])
      .then((rows) => rows[0]?.n || 0);

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // "Seen" covers either signal, because a user who signed in today but has
  // not reconnected a socket since is still someone who used the platform.
  const seenSince = (since) => ({
    role: 'user',
    $or: [{ lastSeenAt: { $gte: since } }, { lastLoginAt: { $gte: since } }],
  });

  const [total, newThisWeek, suspended, premium, premiumNewThisWeek, activeToday, activeThisWeek] =
    await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: weekAgo } }),
      User.countDocuments({ role: 'user', isBlocked: true }),
      subscribers({ status: 'active', ...unexpired }),
      subscribers({ status: 'active', startsAt: { $gte: weekAgo }, ...unexpired }),
      User.countDocuments(seenSince(dayAgo)),
      User.countDocuments(seenSince(weekAgo)),
    ]);

  return {
    total,
    newThisWeek,
    // `active` is "not suspended" -- an account state. The engagement numbers
    // below are the ones that answer "who is actually using the platform".
    active: total - suspended,
    suspended,
    premium,
    premiumNewThisWeek,
    free: total - premium,
    onlineNow: onlineUserCount(),
    activeToday,
    activeThisWeek,
  };
}

export async function setUserBlocked(actor, userId, blocked, ip) {
  if (!mongoose.isValidObjectId(userId)) throw ApiError.badRequest('Invalid user id');
  const user = await User.findOne({ _id: userId, role: 'user' });
  if (!user) throw ApiError.notFound('User not found');
  const before = { isBlocked: user.isBlocked };
  user.isBlocked = blocked;
  await user.save();
  await writeAudit(actor, { action: blocked ? 'user.block' : 'user.unblock', targetType: 'user', targetId: userId, before, after: { isBlocked: blocked }, ip });
  return { id: String(user._id), status: blocked ? 'Suspended' : 'Active' };
}

/**
 * Coarse health summary from the record the owner filled in. "Unknown" is a
 * real answer here — an untouched health section must not read as "Good".
 */
function petHealthStatus(health) {
  if (!health) return 'Unknown';
  if (health.conditions?.length) return 'Needs Attention';
  if (health.allergies?.length) return 'Monitored';
  if (health.vaccinated) return 'Good';
  return 'Unknown';
}

/** One pet row, shaped the way every admin pet list renders it. */
function serializePet(p) {
  return {
    id: String(p._id),
    name: p.name,
    species: p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Dog',
    breed: p.breed,
    owner: p.ownerId?.name || '—',
    ownerPhone: p.ownerId?.phone || '—',
    gender: p.gender,
    age: p.ageText || '—',
    weight: p.weightKg ? `${p.weightKg} kg` : '—',
    // Null rather than a stock photo when the owner uploaded nothing; the
    // panel falls back to the pet's initial.
    avatar: p.avatarUrl || (p.photos && p.photos[0]) || null,
    // Both of these were hardcoded, so every pet on the platform read as
    // vaccinated and healthy no matter what its record said.
    vaccinated: Boolean(p.health?.vaccinated),
    healthStatus: petHealthStatus(p.health),
    createdAt: p.createdAt || null,
  };
}

export async function listPets({ search } = {}) {
  const filter = { deletedAt: null };
  if (search) filter.name = rx(search);
  const pets = await Pet.find(filter).populate('ownerId', 'name phone').sort({ createdAt: -1 }).limit(500);
  return pets.map(serializePet);
}

/**
 * Every pet registered to one owner.
 *
 * Backs the expandable pets panel on User Management, which replaced the
 * separate Pets screen. Loaded per row on demand rather than embedded in the
 * user list: most rows are never expanded, and full pet records for 500 users
 * would dwarf the list they are attached to.
 */
export async function listUserPets(userId) {
  if (!mongoose.isValidObjectId(userId)) throw ApiError.badRequest('Invalid user id');
  const pets = await Pet.find({ ownerId: userId, deletedAt: null })
    .populate('ownerId', 'name phone')
    .sort({ createdAt: -1 });
  return pets.map(serializePet);
}

/* ── Vendors & approvals ──────────────────────────────────────────── */
const DOC_LABEL = { 
  license: 'Business License', 
  owner_id: 'ID Proof (Aadhaar/PAN)', 
  id_proof: 'ID Proof (Aadhaar/PAN)', 
  gst: 'GST Certificate',
  degree: 'Veterinary Degree',
  clinic_auth: 'Clinic Authorization',
};

const DOC_TYPE_LABEL = { 
  license: 'Business License', 
  owner_id: 'ID Proof (Aadhaar)', 
  id_proof: 'ID Proof (Aadhaar)', 
  gst: 'GST Certificate',
  degree: 'Veterinary Degree',
  clinic_auth: 'Clinic Authorization',
};

/** KYC documents every vendor must have verified before a first approval. */
const REQUIRED_DOC_KINDS = ['license', 'owner_id'];

/**
 * What still stands between a pending application and approval.
 */
export function vendorKycMissing(profile) {
  const missing = [];
  const byKind = new Map((profile.documents || []).map((d) => [d.kind, d]));
  // Accept both 'owner_id' and 'id_proof'
  if (byKind.has('id_proof') && !byKind.has('owner_id')) {
    byKind.set('owner_id', byKind.get('id_proof'));
  }

  const required = [...REQUIRED_DOC_KINDS, ...(profile.gst?.hasGst ? ['gst'] : [])];

  for (const kind of required) {
    const label = DOC_LABEL[kind] || kind;
    const doc = byKind.get(kind);
    if (!doc || !doc.url) missing.push(`${label} (not uploaded)`);
    else if (doc.status !== 'Verified') missing.push(`${label} (${doc.status || 'Pending'})`);
  }

  if (!profile.bank?.accountNumberEnc && !profile.bank?.bankName) missing.push('bank account details');
  return missing;
}

/** Per-document review state for the admin screens (real status, not assumed). */
function documentStatuses(profile) {
  const docsList = profile.documents || [];
  const byKind = new Map(docsList.map((d) => [d.kind, d]));
  if (byKind.has('id_proof') && !byKind.has('owner_id')) {
    byKind.set('owner_id', byKind.get('id_proof'));
  }

  const kinds = [...REQUIRED_DOC_KINDS, ...(profile.gst?.hasGst ? ['gst'] : [])];
  for (const d of docsList) if (!kinds.includes(d.kind)) kinds.push(d.kind);

  return kinds.map((kind) => {
    const doc = byKind.get(kind);
    return {
      kind,
      label: DOC_LABEL[kind] || kind,
      url: doc?.url || '',
      status: !doc || !doc.url ? 'Missing' : doc.status || 'Pending',
      verifiedBy: doc?.verifiedBy || '',
      verifiedAt: doc?.verifiedAt || null,
      required: REQUIRED_DOC_KINDS.includes(kind) || (kind === 'gst' && Boolean(profile.gst?.hasGst)),
    };
  });
}

export async function listVendors({ type, status } = {}) {
  const filter = {};
  if (type) filter.vendorType = type;
  if (status) filter.approvalStatus = status;
  const rows = await VendorProfile.find(filter).select('+bank.accountNumberEnc').sort({ createdAt: -1 });

  // Per-vendor stats (orders + revenue from the ledger, product counts for shops, doctor documents).
  const userIds = rows.map((r) => r.userId);
  const [ledger, products, doctors] = await Promise.all([
    VendorLedgerEntry.aggregate([
      { $match: { vendorId: { $in: userIds } } },
      { $group: { _id: '$vendorId', orders: { $sum: 1 }, gross: { $sum: '$gross' } } },
    ]),
    Product.aggregate([
      { $match: { vendorId: { $in: userIds }, deletedAt: null } },
      { $group: { _id: '$vendorId', total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
    ]),
    Doctor.find({ userId: { $in: userIds } }).select('userId credentials.documents'),
  ]);
  const ledgerMap = new Map(ledger.map((l) => [String(l._id), l]));
  const prodMap = new Map(products.map((p) => [String(p._id), p]));
  const docMap = new Map(doctors.map((d) => [String(d.userId), d.credentials?.documents || []]));

  return rows.map((p) => {
    const l = ledgerMap.get(String(p.userId)) || { orders: 0, gross: 0 };
    const pc = prodMap.get(String(p.userId)) || { total: 0, active: 0 };
    
    // Merge doctor credentials documents if profile.documents is empty
    const docArr = [...(p.documents || [])];
    const docExtra = docMap.get(String(p.userId)) || [];
    for (const d of docExtra) {
      if (d.url && !docArr.some(existing => existing.kind === d.kind || (d.kind === 'id_proof' && existing.kind === 'owner_id'))) {
        docArr.push({ kind: d.kind, url: d.url, status: d.verified ? 'Verified' : 'Pending' });
      }
    }
    p.documents = docArr;

    return {
      ...serializeProfile(p),
      documents: (p.documents || []).map((d) => DOC_LABEL[d.kind] || d.kind),
      documentStatuses: documentStatuses(p),
      missing: vendorKycMissing(p),
      owner: p.bank?.accountHolder || p.businessName,
      orders: l.orders,
      revenue: Math.round(l.gross / 100),
      productCount: pc.total,
      activeProductCount: pc.active,
    };
  });
}

export async function listPendingVendors() {
  return listVendors({ status: 'pending' });
}

/**
 * Vendor lines whose customer-facing record is a `Provider`, and the
 * `Provider.type` each maps to. Mirrors PROVIDER_BACKED in
 * vendor.auth.service.js — approval has to reach the same records signup
 * creates, or an approved salon would stay unlisted.
 */
const PROVIDER_BACKED_TYPE = {
  grooming: 'grooming',
  daycare: 'daycare',
  memorial: 'memorial',
};

async function setVendorStatus(actor, vendorProfileId, status, ip, { force = false } = {}) {
  if (!mongoose.isValidObjectId(vendorProfileId)) throw ApiError.badRequest('Invalid vendor id');
  const profile = await VendorProfile.findById(vendorProfileId).select('+bank.accountNumberEnc');
  if (!profile) throw ApiError.notFound('Vendor not found');
  const before = { approvalStatus: profile.approvalStatus };

  if (status === 'approved' && profile.approvalStatus === 'pending' && !force) {
    const missing = vendorKycMissing(profile);
    if (missing.length) {
      throw ApiError.badRequest(`Cannot approve — KYC incomplete: ${missing.join(', ')}`);
    }
  }

  profile.approvalStatus = status;
  await profile.save();

  // Blocking the login is an account-level act, so it only applies when the
  // account has nothing left to trade through. A vendor who runs grooming and
  // daycare and has their daycare suspended must still be able to sign in and
  // run the salon.
  const siblings = await VendorProfile.find({ userId: profile.userId }).select('approvalStatus');
  const allSuspended = siblings.length > 0 && siblings.every((p) => p.approvalStatus === 'suspended');
  await User.updateOne({ _id: profile.userId }, { $set: { isBlocked: allSuspended } });

  // Sync only the Provider backing THIS business line.
  //
  // This used to match on `vendorUserId` alone, which was harmless while an
  // account could own one line — but for a grooming + daycare vendor it meant
  // approving the salon silently published the daycare centre that was still
  // under review, and suspending one took down both.
  const providerType = PROVIDER_BACKED_TYPE[profile.vendorType];
  if (providerType) {
    const synced = await Provider.updateMany(
      { vendorUserId: profile.userId, type: providerType },
      { $set: { approvalStatus: status } }
    );
    if (synced.modifiedCount) {
      try { await invalidate('providers:resp:*'); } catch { /* best-effort */ }
    }
  }

  await writeAudit(actor, { action: `vendor.${status}`, targetType: 'vendor', targetId: vendorProfileId, before, after: { approvalStatus: status, forced: force || undefined }, ip });
  return serializeProfile(profile);
}

export const approveVendor = (actor, id, ip, opts) => setVendorStatus(actor, id, 'approved', ip, opts);
export const rejectVendor = (actor, id, ip) => setVendorStatus(actor, id, 'rejected', ip);
export const suspendVendor = (actor, id, ip) => setVendorStatus(actor, id, 'suspended', ip);

export async function getVendorDocuments(vendorProfileId) {
  if (!mongoose.isValidObjectId(vendorProfileId)) throw ApiError.badRequest('Invalid vendor id');
  const profile = await VendorProfile.findById(vendorProfileId).select('+bank.accountNumberEnc');
  if (!profile) throw ApiError.notFound('Vendor not found');

  // Merge doctor documents if applicable
  const doctor = await Doctor.findOne({ userId: profile.userId }).select('credentials.documents');
  if (doctor?.credentials?.documents?.length) {
    const docArr = [...(profile.documents || [])];
    for (const d of doctor.credentials.documents) {
      if (d.url && !docArr.some(existing => existing.kind === d.kind || (d.kind === 'id_proof' && existing.kind === 'owner_id'))) {
        docArr.push({ kind: d.kind, url: d.url, status: d.verified ? 'Verified' : 'Pending' });
      }
    }
    profile.documents = docArr;
  }

  return {
    vendor: serializeProfile(profile),
    documents: profile.documents || [],
    documentStatuses: documentStatuses(profile),
    missing: vendorKycMissing(profile),
  };
}

/* ── Cross-vendor KYC document feed + verification workflow ────────── */
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const docStatus = (d) => d.status || (d.verifiedAt ? 'Verified' : 'Pending');
const fileName = (d) => {
  const url = d.url || '';
  const base = url.split('/').pop();
  return base || `${d.kind || 'document'}.pdf`;
};

/** Flatten every vendor's KYC documents into one admin verification feed. */
export async function listAllDocuments() {
  const profiles = await VendorProfile.find().select('businessName vendorType documents createdAt userId').sort({ createdAt: -1 });
  const doctors = await Doctor.find().select('userId credentials.documents');
  const docMap = new Map(doctors.map((d) => [String(d.userId), d.credentials?.documents || []]));

  const rows = [];
  for (const p of profiles) {
    const docArr = [...(p.documents || [])];
    const doctorDocs = docMap.get(String(p.userId)) || [];
    for (const d of doctorDocs) {
      if (d.url && !docArr.some(existing => existing.kind === d.kind)) {
        docArr.push({ kind: d.kind, url: d.url, status: d.verified ? 'Verified' : 'Pending' });
      }
    }

    docArr.forEach((d) => {
      rows.push({
        id: `${p._id}:${d.kind}`,
        vendorId: String(p._id),
        kind: d.kind,
        vendor: p.businessName,
        type: TYPE_LABEL[p.vendorType] || 'Other',
        docType: DOC_TYPE_LABEL[d.kind] || d.kind,
        date: fmtDay(p.createdAt),
        status: docStatus(d),
        verifiedBy: d.verifiedBy || '—',
        docUrl: fileName(d),
        url: d.url || '',
      });
    });
  }
  return rows;
}

/** Verify / reject / request-reupload a single vendor KYC document. */
const DOC_ACTION = { verify: 'Verified', reject: 'Rejected', reupload: 'Re-upload' };
export async function verifyDocument(actor, vendorProfileId, kind, action, ip) {
  if (!mongoose.isValidObjectId(vendorProfileId)) throw ApiError.badRequest('Invalid vendor id');
  const status = DOC_ACTION[action];
  if (!status) throw ApiError.badRequest('Invalid action');
  const profile = await VendorProfile.findById(vendorProfileId);
  if (!profile) throw ApiError.notFound('Vendor not found');

  let doc = (profile.documents || []).find((d) => d.kind === kind || (kind === 'owner_id' && d.kind === 'id_proof') || (kind === 'id_proof' && d.kind === 'owner_id'));
  if (!doc) {
    doc = { kind, url: '', status };
    if (!profile.documents) profile.documents = [];
    profile.documents.push(doc);
  } else {
    doc.status = status;
  }
  doc.verifiedBy = status === 'Re-upload' ? '' : actor?.name || 'Admin';
  doc.verifiedAt = status === 'Verified' ? new Date() : null;
  await profile.save();

  // Also sync to Doctor record if vet
  await Doctor.updateOne(
    { userId: profile.userId, 'credentials.documents.kind': kind },
    { $set: { 'credentials.documents.$.verified': status === 'Verified' } }
  );

  await writeAudit(actor, { action: `document.${action}`, targetType: 'vendor', targetId: vendorProfileId, after: { kind, status }, ip });
  return { id: `${vendorProfileId}:${kind}`, status, verifiedBy: doc.verifiedBy || '—' };
}

export async function vendorPerformance() {
  const ledger = await VendorLedgerEntry.aggregate([
    { $group: { _id: '$vendorId', gross: { $sum: '$gross' }, commission: { $sum: '$commission' }, net: { $sum: '$net' }, orders: { $sum: 1 } } },
  ]);
  const map = new Map(ledger.map((l) => [String(l._id), l]));
  const profiles = await VendorProfile.find({ approvalStatus: 'approved' }).select('userId businessName vendorType rating commissionRate');
  return profiles
    .map((p) => {
      const l = map.get(String(p.userId)) || { gross: 0, commission: 0, net: 0, orders: 0 };
      return {
        id: String(p._id),
        name: p.businessName,
        type: TYPE_LABEL[p.vendorType] || 'Other',
        gross: Math.round(l.gross / 100),
        commission: Math.round(l.commission / 100),
        net: Math.round(l.net / 100),
        orders: l.orders,
        rating: p.rating || 0,
        commissionRate: p.commissionRate,
      };
    })
    .sort((a, b) => b.gross - a.gross);
}

/* ── Banners ──────────────────────────────────────────────────────── */
const serializeBanner = (b) => ({
  id: String(b._id),
  key: b.key,
  title: b.title,
  subtitle: b.subtitle,
  image: b.image,
  link: b.link,
  slot: b.slot,
  btnText: b.btnText || '',
  bg: b.bg || '',
  badge: b.badge || '',
  active: b.active,
  sort: b.sort,
});

/**
 * Turn a `?slot=` query value into a Mongo filter.
 *
 * Callers that want one rail should not have to download every other one.
 * Banner images can be inlined data URLs -- the Banners & Content screen
 * writes them that way -- so a handful of Section rows makes an unfiltered
 * list several megabytes, which is slow enough to look like a hung screen.
 * Accepts one slot or a comma-separated list.
 */
function slotFilter(slot) {
  if (!slot) return {};
  const slots = String(slot)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!slots.length) return {};
  return { slot: { $in: slots } };
}

export async function listBanners({ slot } = {}) {
  const rows = await Banner.find(slotFilter(slot)).sort({ sort: 1, createdAt: 1 });
  return rows.map(serializeBanner);
}

export async function listPublicBanners({ slot } = {}) {
  const rows = await Banner.find({ active: true, ...slotFilter(slot) }).sort({ sort: 1, createdAt: 1 });
  return rows.map(serializeBanner);
}

/**
 * Create a banner, or overwrite the one already holding that key.
 *
 * Upsert rather than insert: the key identifies a fixed slot in the user app,
 * so "create" from an editor that has lost track of the existing row's id must
 * update that row instead of adding a rival copy the app might read instead.
 */
export async function createBanner(actor, body, ip) {
  const key = body.key || 'home_hero';
  const existing = await Banner.findOne({ key });
  const before = existing ? serializeBanner(existing) : null;

  const b = await Banner.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        title: body.title || '',
        subtitle: body.subtitle || '',
        image: body.image || '',
        link: body.link || '',
        slot: body.slot || 'Home Hero',
        btnText: body.btnText || '',
        bg: body.bg || '',
        badge: body.badge || '',
        active: body.active !== false,
        sort: body.sort || 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await writeAudit(actor, {
    action: before ? 'banner.update' : 'banner.create',
    targetType: 'banner',
    targetId: b._id,
    before,
    after: serializeBanner(b),
    ip,
  });
  return serializeBanner(b);
}

export async function updateBanner(actor, id, patch, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid banner id');
  const b = await Banner.findById(id);
  if (!b) throw ApiError.notFound('Banner not found');
  const before = serializeBanner(b);
  for (const k of ['key', 'title', 'subtitle', 'image', 'link', 'slot', 'btnText', 'bg', 'badge', 'active', 'sort']) {
    if (patch[k] !== undefined) b[k] = patch[k];
  }
  await b.save();
  await writeAudit(actor, { action: 'banner.update', targetType: 'banner', targetId: id, before, after: serializeBanner(b), ip });
  return serializeBanner(b);
}

export async function deleteBanner(actor, id, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid banner id');
  const b = await Banner.findByIdAndDelete(id);
  if (!b) throw ApiError.notFound('Banner not found');
  await writeAudit(actor, { action: 'banner.delete', targetType: 'banner', targetId: id, before: serializeBanner(b), ip });
  return { id };
}

/* ── Platform settings ────────────────────────────────────────────── */
export async function getSettings() {
  const rows = await PlatformSetting.find().sort({ group: 1, key: 1 });
  return rows.map((s) => ({ key: s.key, value: s.value, label: s.label, group: s.group }));
}

export async function updateSetting(actor, key, value, ip) {
  const before = await PlatformSetting.findOne({ key });
  const s = await PlatformSetting.findOneAndUpdate({ key }, { $set: { value } }, { new: true, upsert: true });
  await writeAudit(actor, { action: 'setting.update', targetType: 'setting', targetId: key, before: before ? { value: before.value } : null, after: { value }, ip });
  return { key: s.key, value: s.value, label: s.label, group: s.group };
}
