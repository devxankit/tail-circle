/**
 * Phase 8 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase8-check.js
 *
 * Covers: wallet auto-create, Razorpay top-up → balance (idempotent),
 * atomic send-money between two users, scan & pay, and notifications
 * (in-app doc + unread badge + read-all), plus seeded demo fixtures.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Payment } from '../src/modules/payment/payment.model.js';
import { Wallet, WalletTransaction } from '../src/modules/wallet/wallet.models.js';
import { Notification } from '../src/modules/notification/notification.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const json = (res) => res.json().catch(() => ({}));
const authed = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

await mongoose.connect(env.mongoUri);
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('rl:api:*');
await invalidate('otp:*');

async function loginAs(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    codeHash: await bcrypt.hash('1234', 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: rawPhone, code: '1234' }),
  });
  return (await json(res)).data;
}

/** Forge a valid client-verify signature (same HMAC the server checks). */
function sign(orderId, paymentId) {
  return crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function payVerify(token, razorpay, paymentId) {
  const signature = sign(razorpay.razorpayOrderId, paymentId);
  return json(
    await fetch(`${BASE}/payments/verify`, {
      method: 'POST',
      headers: authed(token),
      body: JSON.stringify({ razorpayOrderId: razorpay.razorpayOrderId, razorpayPaymentId: paymentId, signature }),
    })
  );
}

// Fresh test users (wallet/notifications are per-user).
const PHONES = ['9999900081', '9999900082'];
for (const p of PHONES.map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await Promise.all([
      Wallet.deleteMany({ userId: u._id }),
      WalletTransaction.deleteMany({ userId: u._id }),
      Notification.deleteMany({ userId: u._id }),
      Payment.deleteMany({ userId: u._id }),
      User.deleteOne({ _id: u._id }),
    ]);
  }
}
const [a, b] = await Promise.all(PHONES.map(loginAs));
const bPhone = PHONES[1];

// ── 1. Wallet auto-create ────────────────────────────────
const w0 = await json(await fetch(`${BASE}/wallet`, { headers: authed(a.accessToken) }));
check('fresh wallet auto-creates at ₹0', w0.data?.balance === 0 && w0.data?.status === 'active');

// ── 2. Top-up via Razorpay verify → balance ──────────────
const topup = await json(
  await fetch(`${BASE}/wallet/topup`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ amount: 500 }),
  })
);
check('top-up creates a gateway order', topup.data?.razorpay?.razorpayOrderId?.startsWith('order_') && topup.data?.razorpay?.amount === 50000);

await payVerify(a.accessToken, topup.data.razorpay, 'pay_p8topup');
const w1 = await json(await fetch(`${BASE}/wallet`, { headers: authed(a.accessToken) }));
check('top-up reflects in balance (₹500)', w1.data?.balance === 500);

const txns1 = await json(await fetch(`${BASE}/wallet/transactions`, { headers: authed(a.accessToken) }));
check('top-up appears as a credit txn', txns1.data?.[0]?.type === 'credit' && txns1.data[0].title === 'Added Money' && txns1.data[0].amount === 500);

// Idempotency: re-verify must NOT double-credit.
await payVerify(a.accessToken, topup.data.razorpay, 'pay_p8topup');
const w1b = await json(await fetch(`${BASE}/wallet`, { headers: authed(a.accessToken) }));
check('re-verify does not double-credit (idempotent)', w1b.data?.balance === 500);

// Top-up amount validation (server clamps user-chosen amounts).
const badTopup = await fetch(`${BASE}/wallet/topup`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ amount: 999999 }),
});
check('over-limit top-up rejected', badTopup.status === 400);

// ── 3. Send money (atomic two-leg, real recipient) ───────
const send = await json(
  await fetch(`${BASE}/wallet/transfer`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ phone: bPhone, amount: 200, title: 'Sent to Friend' }),
  })
);
check('sender debited on transfer', send.data?.balance === 300 && send.data?.transaction?.type === 'debit');

const wB = await json(await fetch(`${BASE}/wallet`, { headers: authed(b.accessToken) }));
check('recipient credited on transfer', wB.data?.balance === 200);

const txnsB = await json(await fetch(`${BASE}/wallet/transactions`, { headers: authed(b.accessToken) }));
check('recipient sees a credit txn', txnsB.data?.some((t) => t.type === 'credit' && t.amount === 200));

// Insufficient balance is blocked (atomic guard).
const overSend = await fetch(`${BASE}/wallet/transfer`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ phone: bPhone, amount: 100000 }),
});
check('overdraw transfer blocked', overSend.status === 400);

// Self-transfer blocked.
const selfSend = await fetch(`${BASE}/wallet/transfer`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ phone: PHONES[0], amount: 10 }),
});
check('self-transfer blocked', selfSend.status === 400);

// ── 4. Scan & pay merchant ───────────────────────────────
const payM = await json(
  await fetch(`${BASE}/wallet/pay`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ name: 'TailCircle Shop Counter #3', title: 'Paid to TailCircle Shop Counter #3', amount: 50 }),
  })
);
check('scan & pay debits balance (₹300 → ₹250)', payM.data?.balance === 250 && payM.data?.transaction?.type === 'debit');

// ── 5. Notifications (recipient got one from the transfer) ─
const notifsB = await json(await fetch(`${BASE}/notifications`, { headers: authed(b.accessToken) }));
check('recipient received a wallet notification', notifsB.data?.unread >= 1 && notifsB.data?.items?.some((n) => n.type === 'wallet' && /received/i.test(n.title + n.body)));

const uc = await json(await fetch(`${BASE}/notifications/unread-count`, { headers: authed(b.accessToken) }));
check('unread-count endpoint matches', uc.data?.unread === notifsB.data.unread);

await fetch(`${BASE}/notifications/read-all`, { method: 'POST', headers: authed(b.accessToken) });
const uc2 = await json(await fetch(`${BASE}/notifications/unread-count`, { headers: authed(b.accessToken) }));
check('read-all clears the unread badge', uc2.data?.unread === 0);

// ── 6. Seeded demo fixtures ──────────────────────────────
const demo = await loginAs('9000000001');
if (demo?.accessToken) {
  const dW = await json(await fetch(`${BASE}/wallet`, { headers: authed(demo.accessToken) }));
  check('demo wallet seeded at ₹124.50', dW.data?.balance === 124.5);
  const dTx = await json(await fetch(`${BASE}/wallet/transactions`, { headers: authed(demo.accessToken) }));
  check('demo has 3 seeded transactions', dTx.data?.length >= 3 && dTx.data.some((t) => t.title === 'Purchase at TailShop'));
  const dN = await json(await fetch(`${BASE}/notifications`, { headers: authed(demo.accessToken) }));
  check('demo has 3 seeded notifications (2 unread)', dN.data?.items?.length >= 3 && dN.data?.unread >= 2 && dN.data.items.some((n) => n.title === 'New Match!'));
} else {
  check('demo wallet seeded at ₹124.50', false, 'demo login failed (run seeder)');
}

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
