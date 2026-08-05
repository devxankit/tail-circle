import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { Payment } from '../payment/payment.model.js';
import { Wallet, WalletTransaction } from '../wallet/wallet.models.js';
import { credit, debit } from '../wallet/wallet.service.js';
import { Payout, VendorProfile, VendorLedgerEntry } from '../vendor/vendor.models.js';
import { PlatformSetting } from './admin.models.js';
import { writeAudit } from './admin.service.js';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'NetBanking', wallet: 'Wallet', cod: 'COD', emi: 'EMI' };

const rupees = (paise) => Math.round((paise || 0) / 100);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

/* ── Transactions (Payment ledger) ────────────────────────────────── */
const PURPOSE_LABEL = { order: 'Order', booking: 'Booking', subscription: 'Subscription', adoption_fee: 'Adoption', wallet_topup: 'Wallet Top-up' };
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
export async function getCommissionSettings() {
  const rows = await PlatformSetting.find({ group: 'commission' }).sort({ key: 1 });
  return rows.map((s) => ({ key: s.key, value: s.value, label: s.label }));
}
export async function setCommission(actor, key, value, ip) {
  if (!key.startsWith('commission.')) throw ApiError.badRequest('Not a commission setting');
  const before = await PlatformSetting.findOne({ key });
  const s = await PlatformSetting.findOneAndUpdate({ key }, { $set: { value } }, { new: true, upsert: true });
  await writeAudit(actor, { action: 'commission.update', targetType: 'setting', targetId: key, before: before ? { value: before.value } : null, after: { value }, ip });
  return { key: s.key, value: s.value };
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

/** Platform GST rate, matching the 5% applied to payouts in vendor.service.js. */
const GST_RATE = 0.05;

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
