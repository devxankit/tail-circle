import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../user/user.model.js';
import { Pet } from '../pet/pet.model.js';
import { Payment } from '../payment/payment.model.js';
import { Booking } from '../booking/booking.model.js';
import { Order } from '../order/order.model.js';
import { Product } from '../shop/product.model.js';
import { Provider } from '../provider/provider.model.js';
import { VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { serializeProfile } from '../vendor/vendor.service.js';
import { invalidate } from '../../services/cache.service.js';
import { AuditLog, Banner, PlatformSetting } from './admin.models.js';

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

/* ── Dashboard ────────────────────────────────────────────────────── */
const TYPE_LABEL = { shop: 'Shop', meal_subscription: 'Meal', events: 'Event', clinic: 'Doctor', memorial: 'Memorial' };
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export async function getDashboard() {
  const [totalUsers, activeVendors, pendingVendors, revenueAgg, appointmentsToday, ledgerByVendor] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    VendorProfile.countDocuments({ approvalStatus: 'approved' }),
    VendorProfile.countDocuments({ approvalStatus: 'pending' }),
    Payment.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: startOfDay() } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.countDocuments({ type: 'doctor', 'schedule.startDate': todayYmd() }),
    VendorLedgerEntry.aggregate([{ $group: { _id: '$vendorId', gross: { $sum: '$gross' } } }]),
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
export async function listUsers({ search } = {}) {
  const filter = { role: 'user' };
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
  const counts = await Pet.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: '$ownerId', n: { $sum: 1 } } },
  ]);
  const petMap = new Map(counts.map((c) => [String(c._id), c.n]));
  return users.map((u) => ({
    id: String(u._id),
    name: u.name || 'Unnamed',
    email: u.email || u.phone || '',
    phone: u.phone || '—',
    city: u.city || '—',
    avatar: u.avatarUrl || `https://i.pravatar.cc/150?u=${u._id}`,
    joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
    plan: 'Free',
    pets: petMap.get(String(u._id)) || 0,
    status: u.isBlocked ? 'Suspended' : 'Active',
    kyc: u.isPhoneVerified ? 'Verified' : 'Pending',
  }));
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

export async function listPets({ search } = {}) {
  const filter = { deletedAt: null };
  if (search) filter.name = new RegExp(search, 'i');
  const pets = await Pet.find(filter).populate('ownerId', 'name phone').sort({ createdAt: -1 }).limit(500);
  return pets.map((p) => ({
    id: String(p._id),
    name: p.name,
    species: p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Dog',
    breed: p.breed,
    owner: p.ownerId?.name || '—',
    gender: p.gender,
    age: p.ageText || '—',
    weight: p.weightKg ? `${p.weightKg} kg` : '—',
    avatar: p.avatarUrl || (p.photos && p.photos[0]) || `https://i.pravatar.cc/150?u=${p._id}`,
    vaccinated: true,
    healthStatus: 'Good',
  }));
}

/* ── Vendors & approvals ──────────────────────────────────────────── */
const DOC_LABEL = { license: 'Business License', owner_id: 'ID Proof', gst: 'GST' };

/** KYC documents every vendor must have verified before a first approval. */
const REQUIRED_DOC_KINDS = ['license', 'owner_id'];

/**
 * What still stands between a pending application and approval.
 *
 * Mirrors the vet reviewer's `completeness()` check: a document that exists but
 * has never been through the VendorDocuments screen is *not* verified, and
 * approving on it would put an unchecked vendor in front of customers.
 *
 * Needs a profile loaded with `+bank.accountNumberEnc`.
 */
export function vendorKycMissing(profile) {
  const missing = [];
  const byKind = new Map((profile.documents || []).map((d) => [d.kind, d]));
  const required = [...REQUIRED_DOC_KINDS, ...(profile.gst?.hasGst ? ['gst'] : [])];

  for (const kind of required) {
    const label = DOC_LABEL[kind] || kind;
    const doc = byKind.get(kind);
    if (!doc || !doc.url) missing.push(`${label} (not uploaded)`);
    else if (doc.status !== 'Verified') missing.push(`${label} (${doc.status || 'Pending'})`);
  }

  if (!profile.bank?.accountNumberEnc) missing.push('bank account number');
  if (!profile.bank?.ifsc) missing.push('bank IFSC');
  return missing;
}

/** Per-document review state for the admin screens (real status, not assumed). */
function documentStatuses(profile) {
  const byKind = new Map((profile.documents || []).map((d) => [d.kind, d]));
  const kinds = [...REQUIRED_DOC_KINDS, ...(profile.gst?.hasGst ? ['gst'] : [])];
  for (const d of profile.documents || []) if (!kinds.includes(d.kind)) kinds.push(d.kind);

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

  // Per-vendor stats (orders + revenue from the ledger, product counts for shops).
  const userIds = rows.map((r) => r.userId);
  const [ledger, products] = await Promise.all([
    VendorLedgerEntry.aggregate([
      { $match: { vendorId: { $in: userIds } } },
      { $group: { _id: '$vendorId', orders: { $sum: 1 }, gross: { $sum: '$gross' } } },
    ]),
    Product.aggregate([
      { $match: { vendorId: { $in: userIds }, deletedAt: null } },
      { $group: { _id: '$vendorId', total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
    ]),
  ]);
  const ledgerMap = new Map(ledger.map((l) => [String(l._id), l]));
  const prodMap = new Map(products.map((p) => [String(p._id), p]));

  return rows.map((p) => {
    const l = ledgerMap.get(String(p.userId)) || { orders: 0, gross: 0 };
    const pc = prodMap.get(String(p.userId)) || { total: 0, active: 0 };
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

async function setVendorStatus(actor, vendorProfileId, status, ip, { force = false } = {}) {
  if (!mongoose.isValidObjectId(vendorProfileId)) throw ApiError.badRequest('Invalid vendor id');
  const profile = await VendorProfile.findById(vendorProfileId).select('+bank.accountNumberEnc');
  if (!profile) throw ApiError.notFound('Vendor not found');
  const before = { approvalStatus: profile.approvalStatus };

  // A *first* approval is the KYC decision, so it refuses while documents are
  // unverified unless the reviewer explicitly forces it. Reinstating a
  // suspended/rejected vendor is not re-litigating KYC, so it stays ungated.
  if (status === 'approved' && profile.approvalStatus === 'pending' && !force) {
    const missing = vendorKycMissing(profile);
    if (missing.length) {
      throw ApiError.badRequest(`Cannot approve — KYC incomplete: ${missing.join(', ')}`);
    }
  }

  profile.approvalStatus = status;
  await profile.save();
  // Keep the underlying User in sync (blocked when suspended/rejected).
  await User.updateOne({ _id: profile.userId }, { $set: { isBlocked: status === 'suspended' } });

  // Grooming / daycare / memorial vendors are fronted by a Provider record, and
  // `GET /providers` filters on its own approvalStatus. Without this sync the
  // Provider stays `pending` after approval and the vendor is never listed.
  const synced = await Provider.updateMany(
    { vendorUserId: profile.userId },
    { $set: { approvalStatus: status } }
  );
  if (synced.modifiedCount) {
    try { await invalidate('providers:resp:*'); } catch { /* best-effort */ }
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
  return {
    vendor: serializeProfile(profile),
    documents: profile.documents || [],
    documentStatuses: documentStatuses(profile),
    missing: vendorKycMissing(profile),
  };
}

/* ── Cross-vendor KYC document feed + verification workflow ────────── */
const DOC_TYPE_LABEL = { license: 'Business License', owner_id: 'ID Proof (Aadhaar)', gst: 'GST Certificate' };
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const docStatus = (d) => d.status || (d.verifiedAt ? 'Verified' : 'Pending');
const fileName = (d) => {
  const url = d.url || '';
  const base = url.split('/').pop();
  return base || `${d.kind || 'document'}.pdf`;
};

/** Flatten every vendor's KYC documents into one admin verification feed. */
export async function listAllDocuments() {
  const profiles = await VendorProfile.find().select('businessName vendorType documents createdAt').sort({ createdAt: -1 });
  const rows = [];
  for (const p of profiles) {
    (p.documents || []).forEach((d) => {
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
  const doc = (profile.documents || []).find((d) => d.kind === kind);
  if (!doc) throw ApiError.notFound('Document not found');
  doc.status = status;
  doc.verifiedBy = status === 'Re-upload' ? '' : actor?.name || 'Admin';
  doc.verifiedAt = status === 'Verified' ? new Date() : null;
  await profile.save();
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

export async function listBanners() {
  const rows = await Banner.find().sort({ sort: 1, createdAt: 1 });
  return rows.map(serializeBanner);
}

export async function listPublicBanners() {
  const rows = await Banner.find({ active: true }).sort({ sort: 1, createdAt: 1 });
  return rows.map(serializeBanner);
}

export async function createBanner(actor, body, ip) {
  const b = await Banner.create({
    key: body.key || 'home_hero',
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
  });
  await writeAudit(actor, { action: 'banner.create', targetType: 'banner', targetId: b._id, after: serializeBanner(b), ip });
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
