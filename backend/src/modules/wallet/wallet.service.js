import { ApiError } from '../../utils/ApiError.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '../../sockets/events.js';
import { registerPurposeHandler, createOrder as createPaymentOrder } from '../payment/payment.service.js';
import { notify } from '../../services/notify.js';
import { User } from '../user/user.model.js';
import { Wallet, WalletTransaction } from './wallet.models.js';

const RUPEE = 100; // paise per rupee
const TOPUP_MIN = 1 * RUPEE; // ₹1
const TOPUP_MAX = 100_000 * RUPEE; // ₹1,00,000

const toRupees = (paise) => paise / 100;

/** Fetch (auto-creating) a user's wallet. */
export async function getWallet(userId) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, balance: 0, currency: 'INR', status: 'active' } },
      { upsert: true, new: true }
    );
  }
  return wallet;
}

export async function listTransactions(userId, { limit = 100 } = {}) {
  const wallet = await getWallet(userId);
  return WalletTransaction.find({ walletId: wallet._id, status: 'success' })
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Core ledger primitive — the ONLY way money moves. Race-safe against
 * webhook double-fires: the unique `idempotencyKey` is reserved by writing a
 * `pending` transaction first; a duplicate short-circuits to the existing
 * row. The balance itself changes through a single atomic guarded update.
 */
async function applyEntry(userId, { type, purpose, amount, title, icon, note, counterparty, refType, refId, idempotencyKey }) {
  if (!Number.isInteger(amount) || amount < 1) throw ApiError.badRequest('Invalid amount');
  const wallet = await getWallet(userId);

  // Reserve idempotency slot up front so concurrent callers can't both apply.
  let txn;
  try {
    txn = await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type,
      purpose,
      amount,
      balanceAfter: 0,
      title: title || '',
      icon: icon || (type === 'credit' ? '💳' : '💸'),
      note: note || '',
      counterparty: counterparty || {},
      refType: refType || null,
      refId: refId || null,
      status: 'pending',
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
  } catch (err) {
    if (err.code === 11000 && idempotencyKey) {
      return WalletTransaction.findOne({ idempotencyKey }); // already applied
    }
    throw err;
  }

  // Atomic balance move: debit is guarded by $gte so it can't overdraw.
  const filter = { userId, status: 'active' };
  if (type === 'debit') filter.balance = { $gte: amount };
  const delta = type === 'debit' ? -amount : amount;

  const updated = await Wallet.findOneAndUpdate(filter, { $inc: { balance: delta } }, { new: true });
  if (!updated) {
    await WalletTransaction.updateOne({ _id: txn._id }, { $set: { status: 'failed' } });
    if (wallet.status !== 'active') throw ApiError.badRequest('Wallet is frozen');
    throw ApiError.badRequest('Insufficient wallet balance');
  }

  await WalletTransaction.updateOne(
    { _id: txn._id },
    { $set: { balanceAfter: updated.balance, status: 'success' } }
  );
  txn.balanceAfter = updated.balance;
  txn.status = 'success';

  emitToUser(userId, SOCKET_EVENTS.WALLET_UPDATED, { balance: updated.balance });
  return txn;
}

export const credit = (userId, opts) => applyEntry(userId, { ...opts, type: 'credit' });
export const debit = (userId, opts) => applyEntry(userId, { ...opts, type: 'debit' });

/* ── Top-up (Razorpay) ────────────────────────────────────── */

/** Start a wallet top-up; balance is credited when the payment confirms. */
export async function startTopup(user, rupees) {
  const amountPaise = Math.round(Number(rupees) * RUPEE);
  if (!Number.isFinite(amountPaise) || amountPaise < TOPUP_MIN || amountPaise > TOPUP_MAX) {
    throw ApiError.badRequest('Enter an amount between ₹1 and ₹1,00,000');
  }
  const payment = await createPaymentOrder(user, 'wallet_topup', { amountPaise });
  return payment;
}

registerPurposeHandler('wallet_topup', {
  // Amount is genuinely user-chosen here, but MUST be validated/clamped.
  computeAmount: async (_user, payload) => {
    const amountPaise = Math.round(Number(payload.amountPaise));
    if (!Number.isFinite(amountPaise) || amountPaise < TOPUP_MIN || amountPaise > TOPUP_MAX) {
      throw ApiError.badRequest('Invalid top-up amount');
    }
    return { amountPaise, refId: null };
  },
  onPaid: async (payment) => {
    // verify + webhook both call this; idempotencyKey makes the credit safe.
    await credit(payment.userId, {
      purpose: 'topup',
      amount: payment.amount,
      title: 'Added Money',
      icon: '💳',
      refType: 'payment',
      refId: payment._id,
      idempotencyKey: `topup:${payment._id}`,
    });
    await notify(payment.userId, {
      title: 'Money Added',
      body: `₹${toRupees(payment.amount).toFixed(2)} added to your wallet.`,
      type: 'wallet',
      link: '/app/wallet',
      data: { amount: payment.amount },
    });
  },
});

/* ── Transfer (send money) ────────────────────────────────── */

/**
 * Send money. Two modes:
 *  - real recipient: `{ phone, amount }` → resolves a user and does an atomic
 *    two-leg transfer (debit sender / credit recipient) + notifies recipient.
 *  - demo contact: `{ name, icon, amount }` with no phone → records a single
 *    debit to the named counterparty (mirrors the mock's hardcoded contacts).
 */
export async function transfer(user, { phone, name, icon, amount, title }) {
  const paise = Math.round(Number(amount) * RUPEE);
  if (!Number.isFinite(paise) || paise < 1) throw ApiError.badRequest('Invalid amount');

  let recipient = null;
  if (phone) {
    recipient = await findUserByPhone(phone);
    if (!recipient) throw ApiError.notFound('No TailCircle user with that number');
    if (String(recipient._id) === String(user.id)) throw ApiError.badRequest("You can't send money to yourself");
  }

  const label = recipient?.name || name || 'Contact';
  const out = await debit(user.id, {
    purpose: 'transfer_out',
    amount: paise,
    title: title || label,
    icon: icon || '👤',
    counterparty: { userId: recipient?._id || null, name: label },
    refType: 'transfer',
  });

  if (recipient) {
    await credit(recipient._id, {
      purpose: 'transfer_in',
      amount: paise,
      title: user.name || 'A friend',
      icon: '👤',
      counterparty: { userId: user.id, name: user.name || 'A friend' },
      refType: 'transfer',
    });
    await notify(recipient._id, {
      title: 'Money Received',
      body: `${user.name || 'Someone'} sent you ₹${toRupees(paise).toFixed(2)}.`,
      type: 'wallet',
      link: '/app/wallet',
      data: { amount: paise },
    });
  }

  return { transaction: out, balance: out.balanceAfter };
}

/* ── Scan & Pay (merchant) ────────────────────────────────── */

/** Pay a merchant from wallet balance (single atomic debit). */
export async function payMerchant(user, { merchantId, name, amount, title }) {
  const paise = Math.round(Number(amount) * RUPEE);
  if (!Number.isFinite(paise) || paise < 1) throw ApiError.badRequest('Invalid amount');

  const txn = await debit(user.id, {
    purpose: 'merchant_pay',
    amount: paise,
    title: title || name || 'Merchant',
    icon: '🛍️',
    counterparty: { merchantId: merchantId || null, name: name || 'Merchant' },
    refType: 'merchant',
  });
  return { transaction: txn, balance: txn.balanceAfter };
}

/* ── helpers ──────────────────────────────────────────────── */

async function findUserByPhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  const local = digits.slice(-10);
  const candidates = [raw, `+91${local}`, `+${digits}`, local, digits];
  return User.findOne({ phone: { $in: [...new Set(candidates)] } });
}
