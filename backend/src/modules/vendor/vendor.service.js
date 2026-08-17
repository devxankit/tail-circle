import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { maskAccount, encryptField } from '../../utils/fieldCrypto.js';
import { Order } from '../order/order.model.js';
import { Product } from '../shop/product.model.js';
import { VendorProfile, VendorLedgerEntry, Payout } from './vendor.models.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** Load the caller's vendor profile (404 if none). Includes the masked bank field. */
export async function getVendorProfile(userId) {
  const profile = await VendorProfile.findOne({ userId }).select('+bank.accountNumberEnc');
  if (!profile) throw ApiError.notFound('Vendor profile not found');
  return profile;
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

export async function updateVendorProfile(userId, patch) {
  const profile = await getVendorProfile(userId);
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
export async function addVendorDocument(userId, { kind, url }) {
  const profile = await getVendorProfile(userId);
  profile.documents = (profile.documents || []).filter((d) => d.kind !== kind);
  profile.documents.push({ kind, url, status: 'Pending' });
  await profile.save();
  return serializeProfile(profile);
}

export async function removeVendorDocument(userId, index) {
  const profile = await getVendorProfile(userId);
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
export async function postLedgerEntry({ vendorId, refType, refId, label, gross, commissionRate = 0.15 }) {
  if (!vendorId || !gross) return null;
  const commission = Math.round(gross * commissionRate);
  const net = gross - commission;
  try {
    return await VendorLedgerEntry.create({
      vendorId,
      refType,
      refId,
      label: label || '',
      gross,
      commission,
      net,
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
 * pending Payout and marks them settled. 5% platform tax on the net.
 */
export async function requestPayout(vendorId) {
  const entries = await VendorLedgerEntry.find({ vendorId, status: 'unsettled' });
  if (!entries.length) throw ApiError.badRequest('No unsettled earnings to request');

  const gross = entries.reduce((s, e) => s + e.gross, 0);
  const commission = entries.reduce((s, e) => s + e.commission, 0);
  const net = entries.reduce((s, e) => s + e.net, 0);
  const tax = Math.round(net * 0.05);

  const payout = await Payout.create({
    vendorId,
    period: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    grossAmount: gross,
    commission,
    tax,
    netAmount: net - tax,
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
      Order.aggregate([
        { $match: { vendorId: oid(vendorId) } },
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
