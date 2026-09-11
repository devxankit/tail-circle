import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import {
  commissionRateFor,
  sanitizeRate,
  splitAmount,
  splitPayout,
  taxRate,
} from './commission.service.js';
import { maskAccount, encryptField } from '../../utils/fieldCrypto.js';
import { Order } from '../order/order.model.js';
import { Product } from '../shop/product.model.js';
import { VendorProfile, VendorLedgerEntry, Payout } from './vendor.models.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Every business line this account runs, oldest first.
 *
 * A vendor may operate several (grooming + daycare); each is its own profile
 * with its own approval state and commission. The order is stable so "the
 * first one" means the same thing on every request.
 */
export async function getVendorProfiles(userId) {
  return VendorProfile.find({ userId }).select('+bank.accountNumberEnc').sort({ createdAt: 1 });
}

/**
 * Load one of the caller's vendor profiles (404 if none).
 *
 * `vendorType` picks the business line. Omitting it returns the primary — the
 * oldest line — which is what a request that does not say which business it is
 * for should act on. An unrecognised `vendorType` falls back to the primary
 * rather than 404ing, so a stale value in a browser tab degrades to "your main
 * business" instead of locking the vendor out of their own panel.
 */
export async function getVendorProfile(userId, vendorType = null) {
  const profiles = await getVendorProfiles(userId);
  if (!profiles.length) throw ApiError.notFound('Vendor profile not found');
  if (vendorType) {
    const match = profiles.find((p) => p.vendorType === vendorType);
    if (match) return match;
  }
  return profiles[0];
}

/**
 * The profile for one specific business line, or null.
 *
 * Used wherever a commission rate is read while posting a ledger entry: a
 * shop order must bill the shop line's rate, never whichever line happens to
 * be first. Callers that find nothing fall back to the platform default.
 */
export async function profileFor(userId, vendorType) {
  if (!userId) return null;
  const exact = await VendorProfile.findOne({ userId, vendorType });
  if (exact) return exact;
  // Pre-migration rows, and vendors whose line was renamed, still have exactly
  // one profile — using it keeps historical settlement working.
  const all = await VendorProfile.find({ userId }).limit(2);
  return all.length === 1 ? all[0] : null;
}

/**
 * Commission fraction for a vendor's given business line.
 *
 * Thin wrapper over the resolver so every settlement path -- orders, bookings,
 * consults, meals, adoption -- goes through the same vendor/category/global
 * chain. It used to read `profile.commissionRate` directly against a hardcoded
 * fallback, which ignored the category and global settings entirely.
 */
export async function commissionFor(userId, vendorType) {
  const profile = await profileFor(userId, vendorType);
  const { rate } = await commissionRateFor(userId, vendorType, { profile });
  return rate;
}

/** Public-safe serialization — bank number masked, never raw. */
export function serializeProfile(profile) {
  return {
    id: String(profile._id),
    businessName: profile.businessName,
    registrationNo: profile.registrationNo,
    vendorType: profile.vendorType,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    address: profile.address,
    logo: profile.logo,
    online: profile.online,
    approvalStatus: profile.approvalStatus,
    rejectionReason: profile.rejectionReason,
    commissionRate: profile.commissionRate,
    rating: profile.rating,
    gst: profile.gst || { hasGst: false, number: '' },
    documents: (profile.documents || []).map((d) => ({
      kind: d.kind, url: d.url, status: d.status, verifiedAt: d.verifiedAt,
    })),
    policies: {
      codEnabled: profile.policies?.codEnabled ?? true,
      returnsEnabled: profile.policies?.returnsEnabled ?? true,
      minOrderValue: profile.policies?.minOrderValue ?? 0,
    },
    bank: {
      bankName: profile.bank?.bankName || '',
      accountHolder: profile.bank?.accountHolder || '',
      ifsc: profile.bank?.ifsc || '',
      accountType: profile.bank?.accountType || 'Saving',
      accountMasked: maskAccount(profile.bank?.accountNumberEnc),
    },
    createdAt: profile.createdAt,
  };
}

const EDITABLE = ['businessName', 'phone', 'city', 'address', 'logo', 'online'];

export async function updateVendorProfile(userId, patch, vendorType = null) {
  const profile = await getVendorProfile(userId, vendorType);
  for (const key of EDITABLE) if (key in patch) profile[key] = patch[key];
  if (patch.gst) profile.gst = { hasGst: Boolean(patch.gst.hasGst), number: patch.gst.number || '' };
  if (patch.bank) {
    profile.bank = {
      bankName: patch.bank.bankName ?? (profile.bank?.bankName || ''),
      accountHolder: patch.bank.accountHolder ?? (profile.bank?.accountHolder || profile.businessName),
      accountNumberEnc: patch.bank.accountNumber ? encryptField(patch.bank.accountNumber) : (profile.bank?.accountNumberEnc || null),
      ifsc: patch.bank.ifsc ?? (profile.bank?.ifsc || ''),
      accountType: patch.bank.accountType ?? (profile.bank?.accountType || 'Saving'),
    };
  }
  if (patch.policies) {
    profile.policies = {
      codEnabled: patch.policies.codEnabled !== undefined ? Boolean(patch.policies.codEnabled) : (profile.policies?.codEnabled ?? true),
      returnsEnabled: patch.policies.returnsEnabled !== undefined ? Boolean(patch.policies.returnsEnabled) : (profile.policies?.returnsEnabled ?? true),
      minOrderValue: patch.policies.minOrderValue !== undefined ? Number(patch.policies.minOrderValue) : (profile.policies?.minOrderValue ?? 0),
    };
  }
  await profile.save();
  return serializeProfile(profile);
}

/**
 * Generic KYC document re-upload — every vendor type except clinic (which has
 * its own per-doctor documents on the `Doctor` record) shares this. Re-adding
 * a document resets it to `Pending` so admin reviews it again.
 */
export async function addVendorDocument(userId, { kind, url }, vendorType = null) {
  const profile = await getVendorProfile(userId, vendorType);
  profile.documents = (profile.documents || []).filter((d) => d.kind !== kind);
  profile.documents.push({ kind, url, status: 'Pending' });
  await profile.save();
  return serializeProfile(profile);
}

export async function removeVendorDocument(userId, index, vendorType = null) {
  const profile = await getVendorProfile(userId, vendorType);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= (profile.documents || []).length) {
    throw ApiError.badRequest('Invalid document index');
  }
  profile.documents.splice(i, 1);
  await profile.save();
  return serializeProfile(profile);
}

/* ── Ledger + payouts ─────────────────────────────────────── */

/**
 * Post a settleable entry for a vendor. Idempotent on (refType, refId) so
 * re-fulfilment (verify + webhook) never double-credits the vendor.
 */
export async function postLedgerEntry({ vendorId, refType, refId, label, gross, commissionRate, vendorType = null }) {
  if (!vendorId || !gross) return null;
  /*
   * Resolve here too, rather than trusting the caller's argument.
   *
   * Every caller already passes a resolved rate, but this is the last point
   * before money is written down: an omitted or malformed rate must fall back
   * to the configured chain, never to 0% commission. `splitAmount` is the only
   * place the arithmetic lives, so gross always equals commission + net.
   */
  const rate =
    sanitizeRate(commissionRate) ??
    (await commissionRateFor(vendorId, vendorType)).rate;
  const amounts = splitAmount(gross, rate);
  try {
    return await VendorLedgerEntry.create({
      vendorId,
      refType,
      refId,
      label: label || '',
      gross: amounts.gross,
      commission: amounts.commission,
      net: amounts.net,
      commissionRate: amounts.rate,
      // Which business line earned it, so a vendor running several can break
      // their combined earnings down per business.
      vendorType,
      status: 'unsettled',
    });
  } catch (err) {
    if (err.code === 11000) return null; // already posted
    throw err;
  }
}

export async function listLedger(vendorId, { limit = 100 } = {}) {
  return VendorLedgerEntry.find({ vendorId }).sort({ createdAt: -1 }).limit(limit);
}

export async function listPayouts(vendorId) {
  return Payout.find({ vendorId }).sort({ createdAt: -1 }).limit(100);
}

/**
 * Request settlement of all unsettled ledger entries: bundles them into one
 * pending Payout and marks them settled.
 *
 * Totals are summed from the entries, never recomputed from a rate: each entry
 * already holds the commission it was billed at, and re-deriving it here would
 * quietly reprice historical earnings whenever an admin changed a rate. Tax is
 * the configured `tax.gst` rather than the 0.05 this used to hardcode.
 */
export async function requestPayout(vendorId) {
  const entries = await VendorLedgerEntry.find({ vendorId, status: 'unsettled' });
  if (!entries.length) throw ApiError.badRequest('No unsettled earnings to request');

  const gross = entries.reduce((s, e) => s + e.gross, 0);
  const commission = entries.reduce((s, e) => s + e.commission, 0);
  const net = entries.reduce((s, e) => s + e.net, 0);
  const { tax, payable, rate } = splitPayout(net, await taxRate());

  const payout = await Payout.create({
    vendorId,
    period: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    grossAmount: gross,
    commission,
    tax,
    taxRate: rate,
    netAmount: payable,
    status: 'pending',
    lineItemIds: entries.map((e) => e._id),
  });

  await VendorLedgerEntry.updateMany(
    { _id: { $in: entries.map((e) => e._id) } },
    { $set: { status: 'settled', settledPayoutId: payout._id } }
  );
  return payout;
}

/* ── Dashboard stats (per vendor type) ────────────────────── */

export async function getDashboard(vendorId, vendorType) {
  const [ledger, unsettled] = await Promise.all([
    VendorLedgerEntry.find({ vendorId }),
    VendorLedgerEntry.aggregate([
      { $match: { vendorId: oid(vendorId), status: 'unsettled' } },
      { $group: { _id: null, net: { $sum: '$net' } } },
    ]),
  ]);
  const totalNet = ledger.reduce((s, e) => s + e.net, 0);
  const stats = {
    lifetimeEarnings: totalNet, // paise
    pendingSettlement: unsettled[0]?.net || 0,
    totalTransactions: ledger.length,
  };

  if (vendorType === 'shop') {
    const [productCount, lowStock, orderAgg, reviewAgg] = await Promise.all([
      Product.countDocuments({ vendorId, deletedAt: null }),
      Product.countDocuments({ vendorId, deletedAt: null, 'packSizes.stock': { $lte: 5 } }),
      // Matched on the line owner, not the order-level `vendorId` — that field
      // is only set when one seller owns the whole basket, and nothing set it
      // at all until recently, so this counted zero orders for every vendor.
      Order.aggregate([
        { $match: { 'items.vendorId': oid(vendorId), status: { $ne: 'pending_payment' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      (async () => {
        const productIds = await Product.find({ vendorId }).distinct('_id');
        if (!productIds.length) return null;
        const res = await Review.aggregate([
          { $match: { targetType: 'product', targetId: { $in: productIds }, status: 'visible' } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]);
        return res[0]?.avgRating || null;
      })(),
    ]);
    const byStatus = Object.fromEntries(orderAgg.map((o) => [o._id, o.count]));
    stats.products = productCount;
    stats.lowStock = lowStock;
    stats.newOrders = byStatus.placed || 0;
    stats.totalOrders = orderAgg.reduce((s, o) => s + o.count, 0);
    stats.avgRating = reviewAgg;
  }

  return stats;
}
