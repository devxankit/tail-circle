import { api } from './api';
import { payWithRazorpay } from './payments';

/**
 * Wallet service — replaces the localStorage mock (`tailcircle_wallet_balance`,
 * `tailcircle_wallet_transactions`). Shapes mirror the retired mock exactly so
 * Wallet.jsx renders identically: transactions are `{ id, title, date, amount,
 * type, icon }` with `amount` a positive rupee number and the sign derived
 * from `type` in the view.
 */

export async function fetchWallet() {
  const { data } = await api.get('/wallet');
  return data; // { balance, currency, status }
}

export async function fetchWalletTransactions() {
  const { data } = await api.get('/wallet/transactions');
  return data.map((t) => ({
    id: t.id,
    title: t.title,
    date: formatTxnDate(t.createdAt),
    amount: t.amount,
    type: t.type,
    icon: t.icon,
  }));
}

/** Add money — opens the Razorpay sheet, then returns the fresh balance. */
export async function topupWallet(amount) {
  const { data } = await api.post('/wallet/topup', { amount: Number(amount) });
  await payWithRazorpay(data.razorpay, { description: 'Wallet top-up' });
  return fetchWallet();
}

/** Send money to a contact (real user by phone, or a demo contact by name). */
export async function sendMoney({ phone, name, icon, title, amount, note }) {
  const { data } = await api.post('/wallet/transfer', {
    phone,
    name,
    icon,
    title,
    amount: Number(amount),
    note,
  });
  return data; // { transaction, balance }
}

/** Scan & pay a merchant from wallet balance. */
export async function payMerchant({ merchantId, name, title, amount }) {
  const { data } = await api.post('/wallet/pay', {
    merchantId,
    name,
    title,
    amount: Number(amount),
  });
  return data; // { transaction, balance }
}

/** "Today, 10:42 AM" / "Yesterday" / "Oct 15" — matches the mock verbatim. */
export function formatTxnDate(createdAt) {
  const d = new Date(createdAt);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `Today, ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
