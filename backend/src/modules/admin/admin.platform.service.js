import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../user/user.model.js';
import { Post } from '../social/social.models.js';
import { Review } from '../review/review.model.js';
import { notify } from '../../services/notify.js';
import { writeAudit } from './admin.service.js';

const idOk = (id) => mongoose.isValidObjectId(id);

/* ── Broadcast notifications ──────────────────────────────────────── */
export async function broadcast(actor, { scope = 'All', title, message }, ip) {
  const filter = {};
  if (scope === 'Users') filter.role = 'user';
  else if (scope === 'Vendors') filter.role = 'vendor';
  else filter.role = { $in: ['user', 'vendor'] };

  const recipients = await User.find(filter).select('_id').limit(5000);
  await Promise.allSettled(
    recipients.map((u) => notify(u._id, { title, body: message, type: 'system' }))
  );
  await writeAudit(actor, { action: 'broadcast.send', targetType: 'broadcast', targetId: scope, after: { title, count: recipients.length }, ip });
  return { sent: recipients.length, scope };
}

/* ── Community moderation ─────────────────────────────────────────── */
const serPost = (p) => ({
  id: String(p._id),
  author: p.authorName,
  userId: p.authorId ? String(p.authorId) : '—',
  category: p.category,
  title: (p.content || '').split('\n')[0].slice(0, 60),
  content: p.content,
  image: p.image,
  likes: p.likesCount,
  commentsCount: p.commentsCount,
  flagsCount: p.reportCount || 0,
  flagReason: p.status === 'reported' ? 'Community-reported content' : '',
  flagDetails: p.status === 'reported' ? 'Auto-flagged after user reports.' : '',
  status: p.status === 'visible' ? 'Approved' : 'Flagged',
  postedAt: new Date(p.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  comments: [],
});

export async function listReportedPosts() {
  const rows = await Post.find({ deletedAt: null, status: { $in: ['reported', 'hidden'] } }).sort({ updatedAt: -1 }).limit(200);
  return rows.map(serPost);
}
export async function listAllPosts() {
  const rows = await Post.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(200);
  return rows.map(serPost);
}
export async function moderatePost(actor, id, action, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid post id');
  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound('Post not found');
  const before = { status: post.status };
  if (action === 'hide') post.status = 'hidden';
  else if (action === 'restore') post.status = 'visible';
  else if (action === 'delete') post.deletedAt = new Date();
  await post.save();
  await writeAudit(actor, { action: `post.${action}`, targetType: 'post', targetId: id, before, after: { status: post.status }, ip });
  return { id, status: post.deletedAt ? 'deleted' : post.status };
}

/* ── Reviews moderation ───────────────────────────────────────────── */
const TARGET_LABEL = { product: 'Product', provider: 'Vendor', doctor: 'Vendor', event: 'Vendor' };
export async function listReviews({ status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const rows = await Review.find(filter).populate('userId', 'name').sort({ createdAt: -1 }).limit(300);
  return rows.map((r) => ({
    id: String(r._id),
    customer: r.userId?.name || 'User',
    targetName: TARGET_LABEL[r.targetType] ? `${TARGET_LABEL[r.targetType]} #${String(r.targetId).slice(-5)}` : '—',
    targetType: TARGET_LABEL[r.targetType] || 'Product',
    rating: r.rating,
    comment: r.text,
    status: r.status === 'hidden' ? 'Flagged' : 'Approved',
    flagged: r.status === 'hidden',
    flagReason: r.status === 'hidden' ? 'Hidden by moderation' : '',
    date: new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    reply: '',
  }));
}
export async function moderateReview(actor, id, action, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid review id');
  const r = await Review.findByIdAndUpdate(id, { $set: { status: action === 'hide' ? 'hidden' : 'visible' } }, { new: true });
  if (!r) throw ApiError.notFound('Review not found');
  await writeAudit(actor, { action: `review.${action}`, targetType: 'review', targetId: id, ip });
  return { id, status: r.status };
}

/* ── Staff management (super-only) ────────────────────────────────── */
const serStaff = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  adminRole: u.adminRole || 'ops',
  permissions: u.permissions || [],
  status: u.isBlocked ? 'Disabled' : 'Active',
  lastLoginAt: u.lastLoginAt || null,
});

export async function listStaff() {
  return (await User.find({ role: 'admin' }).sort({ createdAt: 1 })).map(serStaff);
}
export async function createStaff(actor, body, ip) {
  const email = body.email.toLowerCase().trim();
  if (await User.findOne({ email })) throw ApiError.conflict('An account with this email exists');
  const u = await User.create({
    name: body.name,
    email,
    role: 'admin',
    adminRole: body.adminRole || 'ops',
    permissions: body.permissions || [],
    passwordHash: await bcrypt.hash(body.password || 'changeme123', 10),
    isPhoneVerified: true,
  });
  await writeAudit(actor, { action: 'staff.create', targetType: 'user', targetId: u._id, after: { email, adminRole: u.adminRole }, ip });
  return serStaff(u);
}
export async function updateStaff(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid staff id');
  const set = {};
  if (patch.adminRole !== undefined) set.adminRole = patch.adminRole;
  if (patch.permissions !== undefined) set.permissions = patch.permissions;
  if (patch.disabled !== undefined) set.isBlocked = patch.disabled;
  const u = await User.findOneAndUpdate({ _id: id, role: 'admin' }, { $set: set }, { new: true });
  if (!u) throw ApiError.notFound('Staff not found');
  await writeAudit(actor, { action: 'staff.update', targetType: 'user', targetId: id, after: set, ip });
  return serStaff(u);
}
export async function removeStaff(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid staff id');
  if (String(id) === String(actor.id)) throw ApiError.badRequest('You cannot remove your own account');
  const u = await User.findOne({ _id: id, role: 'admin' });
  if (!u) throw ApiError.notFound('Staff not found');
  if (u.adminRole === 'super') throw ApiError.badRequest('Cannot remove a super-admin');
  await User.deleteOne({ _id: id });
  await writeAudit(actor, { action: 'staff.remove', targetType: 'user', targetId: id, ip });
  return { id };
}

/* ── Reports / analytics summary ──────────────────────────────────── */
export async function reportsSummary() {
  const [users, vendors, posts, reviews] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'vendor' }),
    Post.countDocuments({ deletedAt: null }),
    Review.countDocuments({}),
  ]);
  return { users, vendors, posts, reviews };
}
