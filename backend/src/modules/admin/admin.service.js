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
import { serializeProfile } from '../vendor/vendor.service.js';
import { VENDOR_TYPE_LABEL } from '../vendor/vendorTypeLabels.js';
import { invalidate } from '../../services/cache.service.js';
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
const DEFAULT_ACTION_ITEMS = [
  {
    seedKey: 'act_101',
    category: 'Vendor Approval',
    type: 'Veterinarian Partner',
    title: 'Dr. Happy Paws Vet Clinic Registration',
    subtitle: 'Medical License & Clinic Verification Pending',
    details: 'Submitted Practice License #VET-88219 and Clinic Registration Certificate for admin audit.',
    priority: 'Urgent',
    status: 'pending',
    targetId: 'VND-101',
    navPath: '/admin/vendors/pending',
    docName: 'Practice_License_2026.pdf',
    applicant: 'Dr. Ramesh Sharma (Mumbai)',
  },
  {
    seedKey: 'act_102',
    category: 'Vendor Approval',
    type: 'Fresh Meals Partner',
    title: 'NutriPaw Organic Meals Co.',
    subtitle: 'FSSAI Food Safety Cert Verification',
    details: 'Applied for Fresh Pet Meal Subscription program. Commission rate requested: 10%.',
    priority: 'High',
    status: 'pending',
    targetId: 'VND-102',
    navPath: '/admin/vendors/pending',
    docName: 'FSSAI_Food_Safety_Cert.pdf',
    applicant: 'Ananya Roy (Bengaluru)',
  },
  {
    seedKey: 'act_103',
    category: 'Refund Request',
    type: 'Event Refund',
    title: 'Refund Request #TXN-901',
    subtitle: 'Customer: Rahul Kumar • Amount: ₹1,500',
    details: 'Pet Event "Monsoon Dog Splash" was rescheduled. Client requested immediate full refund.',
    priority: 'Urgent',
    status: 'pending',
    targetId: 'TXN-901',
    navPath: '/admin/operations/refunds',
    amount: '₹1,500',
    applicant: 'Rahul Kumar',
  },
  {
    seedKey: 'act_104',
    category: 'Moderation',
    type: 'Spam Feed Report',
    title: 'Reported Feed Post #RPT-501',
    subtitle: 'Reported by: Aisha Khan • Reason: Commercial Spam',
    details: 'Content contains unauthorized external links and unauthorized promotional spam.',
    priority: 'High',
    status: 'pending',
    targetId: 'RPT-501',
    navPath: '/admin/platform/reports',
    applicant: 'Reported User: Spammer_88',
  },
  {
    seedKey: 'act_105',
    category: 'Refund Request',
    type: 'Order Return',
    title: 'Refund Request #TXN-902',
    subtitle: 'Customer: Priya Dev • Amount: ₹850',
    details: 'Incorrect dog harness sizing delivered. Item returned and inspected by vendor.',
    priority: 'Medium',
    status: 'pending',
    targetId: 'TXN-902',
    navPath: '/admin/operations/refunds',
    amount: '₹850',
    applicant: 'Priya Dev',
  },
  {
    seedKey: 'act_106',
    category: 'Vendor Approval',
    type: 'Memorial Service',
    title: 'Rainbow Bridge Care Services',
    subtitle: 'Last Ride Partner Registration',
    details: 'Submitted tax registry and service menu for pet cremation & memorial plaques.',
    priority: 'Medium',
    status: 'pending',
    targetId: 'VND-103',
    navPath: '/admin/vendors/pending',
    docName: 'GST_Registry_Cert.pdf',
    applicant: 'Sanjay Dutt (Delhi)',
  },
  {
    seedKey: 'act_107',
    category: 'Moderation',
    type: 'Review Comment',
    title: 'Review Flag #RPT-502',
    subtitle: 'Reported by: Rahul Kumar • Reason: Abusive Language',
    details: 'Inappropriate language used in seller review comment on vendor page.',
    priority: 'Normal',
    status: 'pending',
    targetId: 'RPT-502',
    navPath: '/admin/platform/reports',
    applicant: 'Reported User: AngryReviewer',
  },
];

export async function ensureActionItemsSeeded() {
  const count = await AdminActionItem.countDocuments();
  if (count === 0) {
    for (const item of DEFAULT_ACTION_ITEMS) {
      await AdminActionItem.updateOne({ seedKey: item.seedKey }, { $setOnInsert: item }, { upsert: true });
    }
  }
}

export async function listActionItems({ status = 'pending', category, priority } = {}) {
  await ensureActionItemsSeeded();
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category && category !== 'All') filter.category = category;
  if (priority && priority !== 'All') filter.priority = priority;

  const rows = await AdminActionItem.find(filter).sort({ priority: 1, createdAt: -1 });

  return rows.map((r) => ({
    id: String(r._id),
    seedKey: r.seedKey,
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

export async function resolveActionItem(actor, actionId, { action = 'approve', note = '' } = {}, ip = '') {
  let item = null;

  // 1. Try finding by MongoDB ObjectId
  if (mongoose.isValidObjectId(actionId)) {
    item = await AdminActionItem.findById(actionId);
  }

  // 2. Try matching seedKey, targetId, or normalized string ID (ACT-101 -> act_101)
  if (!item) {
    const normId = String(actionId).toLowerCase().replace('-', '_');
    const numPart = String(actionId).replace(/\D/g, '');
    item = await AdminActionItem.findOne({
      $or: [
        { seedKey: actionId },
        { seedKey: normId },
        { seedKey: numPart ? `act_${numPart}` : normId },
        { targetId: actionId },
        { targetId: actionId.toUpperCase() },
      ],
    });
  }

  // 3. Fallback: match seed in default list and insert into DB as resolved
  if (!item) {
    const normId = String(actionId).toLowerCase().replace('-', '_');
    const numPart = String(actionId).replace(/\D/g, '');
    const mock = DEFAULT_ACTION_ITEMS.find(
      (m) =>
        m.seedKey.toLowerCase() === normId ||
        m.seedKey.toLowerCase() === actionId.toLowerCase() ||
        (numPart && m.seedKey.endsWith(numPart)) ||
        m.targetId.toLowerCase() === actionId.toLowerCase()
    );
    if (mock) {
      item = await AdminActionItem.create({
        ...mock,
        status: action === 'approve' ? 'approved' : 'rejected',
        resolvedBy: actor?.name || actor?.email || 'admin',
        resolvedAt: new Date(),
        note,
      });
    }
  } else {
    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.resolvedBy = actor?.name || actor?.email || 'admin';
    item.resolvedAt = new Date();
    if (note) item.note = note;
    await item.save();
  }

  if (!item) throw ApiError.notFound(`Action item '${actionId}' not found`);

  await writeAudit(actor, {
    action: `action_item.${action}`,
    targetType: item.category.toLowerCase().replace(/\s+/g, '_'),
    targetId: String(item._id),
    before: { status: 'pending' },
    after: { status: item.status, note },
    ip,
  });

  return {
    id: String(item._id),
    status: item.status,
    message: `Action item '${item.title}' ${item.status} successfully`,
  };
}



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
  await User.updateOne({ _id: profile.userId }, { $set: { isBlocked: status === 'suspended' } });

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

export async function listBanners() {
  const rows = await Banner.find().sort({ sort: 1, createdAt: 1 });
  return rows.map(serializeBanner);
}

export async function listPublicBanners() {
  const rows = await Banner.find({ active: true }).sort({ sort: 1, createdAt: 1 });
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
