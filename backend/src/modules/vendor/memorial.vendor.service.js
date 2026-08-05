import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { postLedgerEntry } from './vendor.service.js';
import { VendorProfile } from './vendor.models.js';
import { MemorialService, MemorialAddon, TeamMember, MemorialRequest } from './memorial.models.js';
import { Booking } from '../booking/booking.model.js';
import { Provider } from '../provider/provider.model.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ── Services ─────────────────────────────────────────────── */

const mapService = (s) => ({
  id: String(s._id), _id: String(s._id), name: s.name, category: s.category,
  description: s.description, price: rupees(s.price), priceValue: s.price,
  duration: s.duration, distance: s.distance, staff: s.staff, status: s.status,
});

export async function listServices(vendorId) {
  return (await MemorialService.find({ vendorId }).sort({ createdAt: 1 })).map(mapService);
}
export async function createService(vendorId, body) {
  const s = await MemorialService.create({
    vendorId, name: body.name, category: body.category || 'Burial', description: body.description || '',
    price: Number(body.price) || 0, duration: body.duration || '', distance: body.distance || '',
    staff: Number(body.staff) || 1, status: body.status || 'Active',
  });
  return mapService(s);
}
export async function updateService(vendorId, id, body) {
  const s = await MemorialService.findOneAndUpdate(
    { _id: id, vendorId },
    { $set: cleanUpdate(body, { name: 's', category: 's', description: 's', price: 'n', duration: 's', distance: 's', staff: 'n', status: 's' }) },
    { new: true }
  );
  if (!s) throw ApiError.notFound('Service not found');
  return mapService(s);
}
export async function deleteService(vendorId, id) {
  if (!(await MemorialService.deleteOne({ _id: id, vendorId })).deletedCount) throw ApiError.notFound('Service not found');
}

/* ── Add-ons ──────────────────────────────────────────────── */

const mapAddon = (a) => ({ id: String(a._id), _id: String(a._id), name: a.name, description: a.description, price: rupees(a.price), priceValue: a.price, status: a.status, image: a.image });

export async function listAddons(vendorId) {
  return (await MemorialAddon.find({ vendorId }).sort({ createdAt: 1 })).map(mapAddon);
}
export async function createAddon(vendorId, body) {
  const a = await MemorialAddon.create({ vendorId, name: body.name, description: body.description || '', price: Number(body.price) || 0, status: body.status || 'Active', image: body.image || null });
  return mapAddon(a);
}
export async function updateAddon(vendorId, id, body) {
  const a = await MemorialAddon.findOneAndUpdate(
    { _id: id, vendorId },
    { $set: cleanUpdate(body, { name: 's', description: 's', price: 'n', status: 's', image: 's' }) },
    { new: true }
  );
  if (!a) throw ApiError.notFound('Add-on not found');
  return mapAddon(a);
}
export async function deleteAddon(vendorId, id) {
  if (!(await MemorialAddon.deleteOne({ _id: id, vendorId })).deletedCount) throw ApiError.notFound('Add-on not found');
}

/* ── Team ─────────────────────────────────────────────────── */

const mapTeam = (t) => ({ id: String(t._id), _id: String(t._id), name: t.name, role: t.role, phone: t.phone, status: t.status, location: t.location, image: t.image });

export async function listTeam(vendorId) {
  return (await TeamMember.find({ vendorId, active: true }).sort({ createdAt: 1 })).map(mapTeam);
}
export async function addTeamMember(vendorId, body) {
  const t = await TeamMember.create({ vendorId, name: body.name, role: body.role || 'Field Staff', phone: body.phone || '', status: body.status || 'Available', location: body.location || 'Office', image: body.image || '' });
  return mapTeam(t);
}
export async function updateTeamMember(vendorId, id, body) {
  const t = await TeamMember.findOneAndUpdate(
    { _id: id, vendorId },
    { $set: cleanUpdate(body, { name: 's', role: 's', phone: 's', status: 's', location: 's', image: 's' }) },
    { new: true }
  );
  if (!t) throw ApiError.notFound('Team member not found');
  return mapTeam(t);
}
export async function removeTeamMember(vendorId, id) {
  const t = await TeamMember.findOneAndUpdate({ _id: id, vendorId }, { $set: { active: false } });
  if (!t) throw ApiError.notFound('Team member not found');
}

/* ── Requests pipeline ────────────────────────────────────── */

const mapRequest = (r) => ({
  id: String(r._id), _id: String(r._id), customerName: r.customerName, petName: r.petName,
  serviceType: r.serviceType, location: r.location, preferredDate: r.preferredDate, preferredTime: r.preferredTime,
  urgency: r.urgency, paymentStatus: r.paymentStatus, status: r.status, notes: r.notes, addons: r.addons || [],
  assignedTeam: r.assignedTeam || null, proof: r.proofs?.[0] || null, proofs: r.proofs || [],
});

export async function listRequests(vendorId) {
  return (await MemorialRequest.find({ vendorId }).sort({ createdAt: -1 }).limit(200)).map(mapRequest);
}

export async function createWalkIn(vendorId, body) {
  const r = await MemorialRequest.create({
    vendorId, createdByVendor: true, customerName: body.customerName, petName: body.petName,
    serviceType: body.serviceType, location: body.location || '', preferredDate: body.preferredDate || '',
    preferredTime: body.preferredTime || '', urgency: body.urgency || 'Normal', notes: body.notes || '',
    addons: body.addons || [], amount: Math.round((Number(body.amount) || 0) * 100), paymentStatus: 'Pending', status: 'Pending',
  });
  return mapRequest(r);
}

async function ownedRequest(vendorId, id) {
  const r = await MemorialRequest.findOne({ _id: id, vendorId });
  if (!r) throw ApiError.notFound('Request not found');
  return r;
}

export async function updateRequestStatus(vendorId, id, status) {
  const r = await ownedRequest(vendorId, id);
  r.status = status;
  await r.save();
  if (status === 'Completed') await recordMemorialLedger(r);
  return mapRequest(r);
}

export async function assignTeam(vendorId, id, teamId) {
  const r = await ownedRequest(vendorId, id);
  const member = await TeamMember.findOne({ _id: teamId, vendorId, active: true });
  if (!member) throw ApiError.notFound('Team member not found');
  r.assignedTeamId = member._id;
  r.assignedTeam = member.name;
  if (r.status === 'Pending' || r.status === 'Accepted') r.status = 'Assigned';
  await r.save();
  member.status = 'Assigned';
  await member.save();
  return mapRequest(r);
}

export async function addProof(vendorId, id, { url, note }) {
  const r = await ownedRequest(vendorId, id);
  r.proofs.push({ url, note: note || '' });
  r.status = 'Completed';
  await r.save();
  await recordMemorialLedger(r);
  return mapRequest(r);
}

/* ── Real customer callback requests (generic Booking, type: memorial) ──
 * These come from the customer-facing "Talk to Us" form — a free, instantly
 * confirmed booking with no provider chosen at request time. A vendor claims
 * one (assigning their own Provider) to make it theirs, the same way a
 * pending order gets picked up; unclaimed requests are visible to every
 * approved memorial vendor so none go unanswered. */

async function ownMemorialProvider(vendorId) {
  const provider = await Provider.findOne({ vendorUserId: vendorId, type: 'memorial' });
  if (!provider) throw ApiError.badRequest('No memorial provider profile linked to this account yet');
  return provider;
}

const mapCustomerRequest = (b, providerId) => ({
  id: String(b._id), _id: String(b._id), source: 'booking',
  customerName: b.meta?.contact?.name || b.userId?.name || 'Customer',
  petName: b.meta?.contact?.petName || '',
  phone: b.meta?.contact?.phone || b.userId?.phone || '',
  message: b.meta?.contact?.message || '',
  createdAt: b.createdAt,
  claimed: String(b.providerId || '') === String(providerId),
  resolved: Boolean(b.meta?.resolved),
});

export async function listCustomerRequests(vendorId) {
  const provider = await ownMemorialProvider(vendorId);
  const bookings = await Booking.find({
    type: 'memorial',
    $or: [{ providerId: null }, { providerId: provider._id }],
  }).sort({ createdAt: -1 }).limit(200);
  return bookings.map((b) => mapCustomerRequest(b, provider._id));
}

export async function claimCustomerRequest(vendorId, id) {
  const provider = await ownMemorialProvider(vendorId);
  const booking = await Booking.findOne({ _id: id, type: 'memorial', providerId: null });
  if (!booking) throw ApiError.notFound('Request not found or already claimed');
  booking.providerId = provider._id;
  await booking.save();
  return mapCustomerRequest(booking, provider._id);
}

export async function resolveCustomerRequest(vendorId, id) {
  const provider = await ownMemorialProvider(vendorId);
  const booking = await Booking.findOne({ _id: id, type: 'memorial', providerId: provider._id });
  if (!booking) throw ApiError.notFound('Request not found or not claimed by you');
  booking.meta = { ...(booking.meta || {}), resolved: true };
  booking.markModified('meta');
  await booking.save();
  return mapCustomerRequest(booking, provider._id);
}

/** KPI tiles for the dashboard. */
export async function getKpis(vendorId) {
  const [newRequests, todayScheduled, assignedTeams, completedServices, pendingProofs, earningsAgg] = await Promise.all([
    MemorialRequest.countDocuments({ vendorId, status: 'Pending' }),
    MemorialRequest.countDocuments({ vendorId, preferredDate: new Date().toISOString().slice(0, 10) }),
    TeamMember.countDocuments({ vendorId, active: true, status: 'Assigned' }),
    MemorialRequest.countDocuments({ vendorId, status: 'Completed' }),
    MemorialRequest.countDocuments({ vendorId, status: 'In Progress', proofs: { $size: 0 } }),
    MemorialRequest.aggregate([
      { $match: { vendorId: oid(vendorId), status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  return {
    newRequests, todayScheduled, assignedTeams, completedServices, pendingProofs,
    totalEarnings: rupees(Math.round((earningsAgg[0]?.total || 0) / 100)),
  };
}

async function recordMemorialLedger(request) {
  if (!request.amount) return;
  try {
    const profile = await VendorProfile.findOne({ userId: request.vendorId });
    await postLedgerEntry({
      vendorId: request.vendorId, refType: 'booking', refId: request._id,
      label: `Memorial ${request.serviceType || 'service'}`, gross: request.amount,
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch {
    // best-effort
  }
}

/** Apply only provided fields; 'n' coerces to Number, 's' passes through. */
function cleanUpdate(body, spec) {
  const out = {};
  for (const [k, kind] of Object.entries(spec)) if (body[k] != null) out[k] = kind === 'n' ? Number(body[k]) : body[k];
  return out;
}
