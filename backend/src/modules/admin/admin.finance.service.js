import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { Payment } from '../payment/payment.model.js';
import { Wallet, WalletTransaction } from '../wallet/wallet.models.js';
import { credit, debit } from '../wallet/wallet.service.js';
import { Payout, VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { PlatformSetting } from './admin.models.js';
import { writeAudit } from './admin.service.js';
import { CommissionSchedule } from './commissionSchedule.model.js';
import { VENDOR_TYPE_LABEL } from '../vendor/vendorTypeLabels.js';
import {
  commissionMatrix,
  commissionRateFor,
  commissionBounds,
  assertWithinBounds,
  MIN_KEY,
  MAX_KEY,
  TAX_KEY,
  clearCommissionCache,
  rateFromPercent,
  percentFromRate,
  sanitizeRate,
  taxRate,
  VENDOR_TYPES,
} from '../vendor/commission.service.js';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'NetBanking', wallet: 'Wallet', cod: 'COD', emi: 'EMI' };

const rupees = (paise) => Math.round((paise || 0) / 100);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

/* ── Transactions (Payment ledger) ────────────────────────────────── */
const PURPOSE_LABEL = { order: 'Order', booking: 'Booking', subscription: 'Meal Subscription', match_subscription: 'Match Plan', adoption_fee: 'Adoption', wallet_topup: 'Wallet Top-up' };
const PAY_STATUS = { paid: 'Success', created: 'Pending', failed: 'Failed', refunded: 'Refund' };
const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export async function listTransactions({ status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const rows = await Payment.find(filter).populate('userId', 'name').sort({ createdAt: -1 }).limit(400);
  return rows.map((p) => ({
    id: p.razorpayPaymentId || String(p._id),
    date: dateTime(p.createdAt),
    // Raw values for client-side charting/grouping — the formatted fields
    // above are for display only.
    createdAt: p.createdAt,
    amountValue: rupees(p.amount),
    type: PURPOSE_LABEL[p.purpose] || p.purpose,
    vendor: '—',
    customer: p.userId?.name || 'Guest',
    amount: '₹' + rupees(p.amount).toLocaleString('en-IN'),
    method: p.method ? p.method.toUpperCase() : '—',
    status: PAY_STATUS[p.status] || p.status,
    ref: p.refId ? String(p.refId).slice(-8) : '—',
    razorpayOrderId: p.razorpayOrderId || '—',
    razorpayPaymentId: p.razorpayPaymentId || '—',
    refundedAmount: rupees(p.refundedAmount || 0),
    failureReason: p.failureReason || null,
    verifiedAt: p.webhookVerifiedAt ? dateTime(p.webhookVerifiedAt) : null,
  }));
}

export async function paymentsOverview() {
  const [paid, refunded, created, todayAgg, monthAgg, methodAgg] = await Promise.all([
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { refundedAmount: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$refundedAmount' }, n: { $sum: 1 } } }]),
    Payment.countDocuments({ status: 'created' }),
    Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: startOfToday() } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: startOfMonth() } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: '$method', total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
  ]);
  const totalPaid = paid[0]?.total || 0;
  const pct = (v) => (totalPaid ? Math.round((v / totalPaid) * 100) : 0);
  const share = {};
  for (const m of methodAgg) share[m._id || 'other'] = m.total;
  return {
    grossVolume: rupees(totalPaid),
    paidCount: paid[0]?.n || 0,
    refundedAmount: rupees(refunded[0]?.total || 0),
    refundedCount: refunded[0]?.n || 0,
    pendingCount: created,
    collectedToday: rupees(todayAgg[0]?.total || 0),
    thisMonth: rupees(monthAgg[0]?.total || 0),
    upiSharePct: pct(share.upi || 0),
    codSharePct: pct(share.cod || 0),
    methodDistribution: methodAgg
      .map((m) => ({ name: METHOD_LABEL[m._id] || (m._id ? m._id.toUpperCase() : 'Other'), value: pct(m.total) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value),
  };
}

/* ── Commission settings ──────────────────────────────────────────── */

/** Raw settings rows, still used by the generic settings screen. */
export async function getCommissionSettings() {
  const rows = await PlatformSetting.find({ group: 'commission' }).sort({ key: 1 });
  return rows.map((s) => ({ key: s.key, value: s.value, label: s.label }));
}

/** Global default, every category, every vendor override, plus limits and queue. */
export async function getCommissionMatrix() {
  // Apply anything already due before reporting, so the screen never shows a
  // change as "upcoming" when its moment has passed.
  await applyDueCommissionSchedules();
  const [matrix, bounds, scheduled, tax] = await Promise.all([
    commissionMatrix(),
    commissionBounds(),
    listCommissionSchedules({ status: 'pending' }),
    taxRate(),
  ]);
  return { ...matrix, bounds, scheduled, taxPercent: percentFromRate(tax) };
}

/**
 * Move the guardrails themselves.
 *
 * Needs its own setter because these two rows hold percentages while every
 * other `commission.*` row holds a fraction. Routing them through either of
 * the rate setters would store 5% as 0.05 and make the minimum meaningless.
 */
export async function setCommissionBounds(actor, { minPercent, maxPercent }, ip) {
  const min = Number(minPercent);
  const max = Number(maxPercent);
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw ApiError.badRequest('Limits must be numbers');
  if (min < 0 || max > 100) throw ApiError.badRequest('Limits must be between 0 and 100 percent');
  if (min > max) throw ApiError.badRequest('Minimum cannot be above the maximum');

  const before = await commissionBounds();
  await PlatformSetting.updateOne(
    { key: MIN_KEY },
    { $set: { value: min, group: 'commission', label: 'Minimum commission (%)' } },
    { upsert: true }
  );
  await PlatformSetting.updateOne(
    { key: MAX_KEY },
    { $set: { value: max, group: 'commission', label: 'Maximum commission (%)' } },
    { upsert: true }
  );
  clearCommissionCache();
  await writeAudit(actor, {
    action: 'commission.bounds.update',
    targetType: 'setting',
    targetId: 'commission.bounds',
    before,
    after: { minPercent: min, maxPercent: max },
    ip,
  });
  return commissionBounds();
}

/** Payout tax rate, as a percentage. Shares the settings cache with commission. */
export async function setTaxPercent(actor, percent, ip) {
  const value = rateFromPercent(percent);
  const before = await PlatformSetting.findOne({ key: TAX_KEY }).lean();
  await PlatformSetting.updateOne(
    { key: TAX_KEY },
    { $set: { value, group: 'tax', label: 'GST rate' } },
    { upsert: true }
  );
  clearCommissionCache();
  await writeAudit(actor, {
    action: 'tax.update',
    targetType: 'setting',
    targetId: TAX_KEY,
    before: before ? { value: before.value } : null,
    after: { value },
    ip,
  });
  return { key: TAX_KEY, value, percent: percentFromRate(value) };
}

/* ── Scheduled rate changes ───────────────────────────────────────── */

const SCOPE_LABEL = { global: 'Global default', category: 'Category', vendor: 'Vendor' };

export async function listCommissionSchedules({ status, limit = 100 } = {}) {
  const filter = status ? { status } : {};
  const rows = await CommissionSchedule.find(filter).sort({ effectiveFrom: 1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: String(r._id),
    scope: r.scope,
    scopeLabel: SCOPE_LABEL[r.scope] || r.scope,
    targetKey: r.targetKey,
    targetLabel: r.targetLabel,
    percent: r.clearsOverride ? null : r.percent,
    clearsOverride: r.clearsOverride,
    effectiveFrom: r.effectiveFrom,
    status: r.status,
    previousPercent: r.previousPercent,
    appliedAt: r.appliedAt,
    error: r.error,
    note: r.note,
    createdByName: r.createdByName,
  }));
}

/**
 * Queue a rate change for later.
 *
 * Validated now as well as at apply time: telling an operator their 2% is out
 * of bounds three weeks from now, in a log nobody reads, is not a guardrail.
 */
export async function scheduleCommissionChange(actor, body, ip) {
  const { scope, targetKey, percent, clearsOverride = false, effectiveFrom, note = '' } = body;

  const when = new Date(effectiveFrom);
  if (Number.isNaN(when.getTime())) throw ApiError.badRequest('Invalid effective date');
  if (when.getTime() <= Date.now()) {
    throw ApiError.badRequest('Effective date must be in the future. To change a rate now, edit it directly.');
  }

  let targetLabel = SCOPE_LABEL[scope] || scope;
  if (scope === 'category') {
    if (!VENDOR_TYPES.includes(targetKey)) throw ApiError.badRequest(`Unknown category "${targetKey}"`);
    targetLabel = VENDOR_TYPE_LABEL[targetKey];
  } else if (scope === 'vendor') {
    if (!mongoose.isValidObjectId(targetKey)) throw ApiError.badRequest('Invalid vendor id');
    const profile = await VendorProfile.findById(targetKey).select('businessName').lean();
    if (!profile) throw ApiError.notFound('Vendor not found');
    targetLabel = profile.businessName || 'Vendor';
  } else if (scope !== 'global') {
    throw ApiError.badRequest(`Unknown scope "${scope}"`);
  }

  if (!clearsOverride) {
    assertWithinBounds(percent, await commissionBounds());
  } else if (scope !== 'vendor') {
    throw ApiError.badRequest('Only a vendor rate can be cleared back to inheriting');
  }

  const row = await CommissionSchedule.create({
    scope,
    targetKey,
    targetLabel,
    percent: clearsOverride ? 0 : percent,
    clearsOverride,
    effectiveFrom: when,
    note,
    createdById: actor?._id || null,
    createdByName: actor?.name || '',
  });

  await writeAudit(actor, {
    action: 'commission.schedule',
    targetType: 'commission_schedule',
    targetId: String(row._id),
    before: null,
    after: { scope, targetKey, percent, clearsOverride, effectiveFrom: when },
    ip,
  });

  return (await listCommissionSchedules({ status: 'pending' })).find((r) => r.id === String(row._id));
}

export async function cancelCommissionSchedule(actor, id, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid schedule id');
  const row = await CommissionSchedule.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'cancelled' } },
    { returnDocument: 'after' }
  );
  if (!row) throw ApiError.notFound('No pending scheduled change with that id');
  await writeAudit(actor, {
    action: 'commission.schedule.cancel',
    targetType: 'commission_schedule',
    targetId: id,
    before: { status: 'pending' },
    after: { status: 'cancelled' },
    ip,
  });
  return { id, status: 'cancelled' };
}

/**
 * Apply every scheduled change whose moment has arrived.
 *
 * Each row is claimed with a conditional update before it is acted on, so two
 * servers running this at the same time cannot apply the same change twice.
 * A row that fails is marked failed with its reason rather than retried
 * forever — a rate that is out of bounds by the time it comes due is a
 * decision for an operator, not something to keep attempting.
 *
 * Applying goes through the ordinary setters, so a scheduled change is
 * bounds-checked, cache-invalidated and audited exactly like a manual one.
 */
export async function applyDueCommissionSchedules(now = new Date()) {
  const due = await CommissionSchedule.find({ status: 'pending', effectiveFrom: { $lte: now } })
    .sort({ effectiveFrom: 1 })
    .limit(50)
    .lean();

  const applied = [];
  for (const row of due) {
    const claimed = await CommissionSchedule.findOneAndUpdate(
      { _id: row._id, status: 'pending' },
      { $set: { status: 'applied', appliedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!claimed) continue; // another worker got there first

    const actor = { _id: row.createdById, name: `${row.createdByName || 'Admin'} (scheduled)` };
    try {
      let previousPercent = null;
      if (row.scope === 'vendor') {
        const profile = await VendorProfile.findById(row.targetKey).select('commissionRate').lean();
        previousPercent = percentFromRate(profile?.commissionRate);
        await setVendorCommission(
          actor,
          row.targetKey,
          row.clearsOverride ? null : row.percent,
          'scheduler',
          { allowZero: true }
        );
      } else {
        const key = row.scope === 'global' ? 'commission.default' : `commission.${row.targetKey}`;
        const before = await PlatformSetting.findOne({ key }).lean();
        previousPercent = percentFromRate(before?.value);
        await setCommissionPercent(actor, key, row.percent, 'scheduler', { allowZero: true });
      }
      await CommissionSchedule.updateOne({ _id: row._id }, { $set: { previousPercent } });
      applied.push(String(row._id));
    } catch (err) {
      await CommissionSchedule.updateOne(
        { _id: row._id },
        { $set: { status: 'failed', error: err?.message || 'Apply failed', appliedAt: null } }
      );
    }
  }
  if (applied.length) clearCommissionCache();
  return applied;
}

/**
 * Set the global or a category default.
 *
 * Takes a percentage because that is what the screen shows; the fraction that
 * actually multiplies money is derived once, here, by `rateFromPercent`.
 * Writing a percentage straight into the settings row would make every future
 * settlement bill 100x the intended rate.
 */
export async function setCommissionPercent(actor, key, percent, ip, { allowZero = false } = {}) {
  if (!key.startsWith('commission.')) throw ApiError.badRequest('Not a commission setting');
  const suffix = key.slice('commission.'.length);
  if (suffix !== 'default' && !VENDOR_TYPES.includes(suffix)) {
    throw ApiError.badRequest(`Unknown commission category "${suffix}"`);
  }
  const bounds = await commissionBounds();
  // A category may legitimately be free; the caller has to say so explicitly.
  assertWithinBounds(percent, bounds, { allowZero: percent === 0 && allowZero });
  const value = rateFromPercent(percent);
  const before = await PlatformSetting.findOne({ key });
  const label =
    suffix === 'default' ? 'Default commission rate' : `${VENDOR_TYPE_LABEL[suffix]} commission`;
  const s = await PlatformSetting.findOneAndUpdate(
    { key },
    { $set: { value, group: 'commission', label } },
    { new: true, upsert: true }
  );
  clearCommissionCache();
  await writeAudit(actor, {
    action: 'commission.update',
    targetType: 'setting',
    targetId: key,
    before: before ? { value: before.value } : null,
    after: { value },
    ip,
  });
  return { key: s.key, value: s.value, percent: percentFromRate(s.value) };
}

/**
 * Legacy fraction-valued setter, kept for the generic settings screen.
 *
 * That screen posts the stored fraction directly, so it must not go through
 * the percentage conversion above.
 */
export async function setCommission(actor, key, value, ip) {
  if (!key.startsWith('commission.')) throw ApiError.badRequest('Not a commission setting');
  if (sanitizeRate(value) === null) {
    throw ApiError.badRequest('Commission rate must be a fraction between 0 and 1');
  }
  const before = await PlatformSetting.findOne({ key });
  const s = await PlatformSetting.findOneAndUpdate({ key }, { $set: { value } }, { new: true, upsert: true });
  clearCommissionCache();
  await writeAudit(actor, { action: 'commission.update', targetType: 'setting', targetId: key, before: before ? { value: before.value } : null, after: { value }, ip });
  return { key: s.key, value: s.value };
}

/**
 * Give one vendor its own rate, or clear it back to inheriting.
 *
 * `percent === null` removes the override rather than storing a zero -- those
 * are very different instructions, and storing 0 would hand the vendor the
 * platform's entire cut.
 */
export async function setVendorCommission(actor, profileId, percent, ip, { allowZero = false } = {}) {
  if (!mongoose.isValidObjectId(profileId)) throw ApiError.badRequest('Invalid vendor id');
  const profile = await VendorProfile.findById(profileId);
  if (!profile) throw ApiError.notFound('Vendor not found');

  const clearing = percent === null || percent === undefined;
  if (!clearing) {
    const bounds = await commissionBounds();
    assertWithinBounds(percent, bounds, { allowZero: percent === 0 && allowZero });
  }

  const before = { commissionRate: profile.commissionRate };
  profile.commissionRate = clearing ? null : rateFromPercent(percent);
  await profile.save();
  clearCommissionCache();

  await writeAudit(actor, {
    action: profile.commissionRate === null ? 'vendor.commission.clear' : 'vendor.commission.set',
    targetType: 'vendor',
    targetId: String(profile._id),
    before,
    after: { commissionRate: profile.commissionRate },
    ip,
  });

  const resolved = await commissionRateFor(profile.userId, profile.vendorType, { profile });
  return {
    id: String(profile._id),
    vendorType: profile.vendorType,
    overridePercent: percentFromRate(profile.commissionRate),
    effectivePercent: percentFromRate(resolved.rate),
    source: resolved.source,
  };
}

/* ── Payout queue ─────────────────────────────────────────────────── */
export async function listPayouts({ status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const rows = await Payout.find(filter).sort({ createdAt: -1 }).limit(300);
  const vendorIds = [...new Set(rows.map((r) => String(r.vendorId)))];
  const profiles = await VendorProfile.find({ userId: { $in: vendorIds } }).select('userId businessName');
  const nameMap = new Map(profiles.map((p) => [String(p.userId), p.businessName]));
  return rows.map((p) => ({
    id: String(p._id),
    vendor: nameMap.get(String(p.vendorId)) || 'Vendor',
    period: p.period,
    gross: rupees(p.grossAmount),
    commission: rupees(p.commission),
    tax: rupees(p.tax),
    net: rupees(p.netAmount),
    status: p.status,
    utr: p.utr || '',
    date: fmtDate(p.createdAt),
  }));
}

export async function markPayoutPaid(actor, id, utr, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid payout id');
  const p = await Payout.findById(id);
  if (!p) throw ApiError.notFound('Payout not found');
  const before = { status: p.status };
  p.status = 'paid';
  p.utr = utr || p.utr || `UTR${Date.now().toString().slice(-10)}`;
  await p.save();
  await writeAudit(actor, { action: 'payout.paid', targetType: 'payout', targetId: id, before, after: { status: 'paid', utr: p.utr }, ip });
  return { id: String(p._id), status: p.status, utr: p.utr };
}

/* ── Wallet oversight ─────────────────────────────────────────────── */
const txnKind = (t) => {
  if (t.type === 'debit') return 'Debit';
  if (t.purpose === 'refund') return 'Refund';
  return 'Credit';
};

export async function walletOverview() {
  const [agg, wallets, lastMoves, loadedToday, redeemedToday, cashbackMTD, recentTxns] = await Promise.all([
    Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' }, n: { $sum: 1 } } }]),
    Wallet.find().populate('userId', 'name phone').sort({ balance: -1 }).limit(100),
    // Latest credit/debit timestamp per wallet, for the "last loaded / last used" columns.
    WalletTransaction.aggregate([
      { $match: { status: 'success' } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$walletId',
          lastLoaded: { $max: { $cond: [{ $eq: ['$type', 'credit'] }, '$createdAt', null] } },
          lastUsed: { $max: { $cond: [{ $eq: ['$type', 'debit'] }, '$createdAt', null] } },
        },
      },
    ]),
    WalletTransaction.aggregate([{ $match: { status: 'success', type: 'credit', createdAt: { $gte: startOfToday() } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    WalletTransaction.aggregate([{ $match: { status: 'success', type: 'debit', createdAt: { $gte: startOfToday() } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    WalletTransaction.aggregate([{ $match: { status: 'success', purpose: 'refund', createdAt: { $gte: startOfMonth() } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    WalletTransaction.find({ status: 'success' }).populate('userId', 'name').sort({ createdAt: -1 }).limit(100),
  ]);
  const moveMap = new Map(lastMoves.map((m) => [String(m._id), m]));
  return {
    stats: {
      totalFloat: rupees(agg[0]?.total || 0),
      walletCount: agg[0]?.n || 0,
      loadedToday: rupees(loadedToday[0]?.total || 0),
      redemptionsToday: rupees(redeemedToday[0]?.total || 0),
      cashbackMTD: rupees(cashbackMTD[0]?.total || 0),
    },
    wallets: wallets.map((w) => {
      const m = moveMap.get(String(w._id)) || {};
      return {
        id: String(w._id),
        customer: w.userId?.name || 'User',
        phone: w.userId?.phone || '—',
        balance: rupees(w.balance),
        lastLoaded: m.lastLoaded ? fmtDate(m.lastLoaded) : '—',
        lastUsed: m.lastUsed ? fmtDate(m.lastUsed) : '—',
        status: w.status === 'active' ? 'Active' : w.status === 'frozen' ? 'Frozen' : 'Inactive',
      };
    }),
    transactions: recentTxns.map((t) => ({
      id: String(t._id),
      customer: t.userId?.name || 'User',
      type: txnKind(t),
      amount: rupees(t.amount),
      balanceAfter: rupees(t.balanceAfter),
      desc: t.title || t.note || '—',
      date: dateTime(t.createdAt),
    })),
  };
}

/** Admin credit/debit of a customer wallet (real ledger movement + audit). */
export async function adjustWallet(actor, walletId, { action, amount, reason }, ip) {
  if (!mongoose.isValidObjectId(walletId)) throw ApiError.badRequest('Invalid wallet id');
  if (action !== 'credit' && action !== 'debit') throw ApiError.badRequest('Action must be credit or debit');
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 1) throw ApiError.badRequest('Enter a valid amount');

  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw ApiError.notFound('Wallet not found');

  const move = action === 'credit' ? credit : debit;
  const txn = await move(wallet.userId, {
    purpose: 'admin_adjust',
    amount: paise,
    title: reason || `Admin ${action}`,
    icon: action === 'credit' ? '💳' : '💸',
    note: reason || '',
    refType: 'admin',
  });
  await writeAudit(actor, { action: `wallet.${action}`, targetType: 'wallet', targetId: walletId, after: { amount: paise, reason: reason || '' }, ip });
  return { id: walletId, balance: rupees(txn.balanceAfter), txnId: String(txn._id) };
}

/* ── Tax / GST report ─────────────────────────────────────────────── */


const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Tax report — monthly rollup plus the per-payment rows behind it.
 *
 * ⚠ A compliant GSTR-1 needs a CGST/SGST/IGST split, which is decided by
 * supplier state vs place of supply. Neither is captured today:
 *   • VendorProfile has `city` but no `state`
 *   • Payment has no link to the customer's billing address
 * So the split is reported as unavailable rather than invented. `gaps` tells
 * the UI exactly what is missing so it can say so instead of showing zeros.
 */
export async function taxReport({ limit = 200 } = {}) {
  const [monthly, payments] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, gross: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
      { $limit: 12 },
    ]),
    Payment.find({ status: 'paid' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean(),
  ]);

  // The same `tax.gst` setting payouts withhold at. This was a second
  // hardcoded 0.05, so the report and the payouts could disagree the moment
  // either was edited.
  const GST_RATE = await taxRate();

  const summary = monthly.map((r) => {
    const gross = rupees(r.gross);
    const gst = Math.round(gross * GST_RATE);
    return {
      period: `${MON[r._id.m - 1]} ${r._id.y}`,
      gross,
      gst,
      net: gross - gst,
      invoices: r.count,
    };
  });

  // Per-payment detail. `taxable` is the pre-GST value backed out of the
  // gross, so taxable + gst === gross exactly.
  const invoices = payments.map((p) => {
    const gross = rupees(p.amount);
    const taxable = Math.round(gross / (1 + GST_RATE));
    return {
      id: p.razorpayPaymentId || String(p._id),
      orderId: p.razorpayOrderId,
      date: p.createdAt,
      customer: p.userId?.name || p.userId?.email || '—',
      purpose: p.purpose,
      method: p.method || '—',
      taxable,
      rate: `${GST_RATE * 100}%`,
      gst: gross - taxable,
      total: gross,
    };
  });

  const totals = invoices.reduce(
    (acc, i) => ({ taxable: acc.taxable + i.taxable, gst: acc.gst + i.gst, total: acc.total + i.total }),
    { taxable: 0, gst: 0, total: 0 }
  );

  return {
    summary,
    invoices,
    totals: { ...totals, invoiceCount: invoices.length, rate: `${GST_RATE * 100}%` },
    gaps: {
      // Surfaced in the UI so nobody mistakes this for a filed-ready GSTR-1.
      stateSplit: 'CGST/SGST/IGST split unavailable — vendor state and place of supply are not captured',
      gstin: 'Vendor GSTIN is collected at signup but not yet linked per payment',
    },
  };
}
