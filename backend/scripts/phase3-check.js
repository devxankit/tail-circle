/**
 * Phase 3 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase3-check.js
 *
 * The Razorpay payment is "completed" by signing the verify payload with the
 * key secret locally — exercising the real verify path without a browser.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Product } from '../src/modules/shop/product.model.js';
import { Order } from '../src/modules/order/order.model.js';
import { Payment } from '../src/modules/payment/payment.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

const json = (res) => res.json().catch(() => ({}));
const authed = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

await mongoose.connect(env.mongoUri);
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('rl:api:*');
await invalidate('otp:*');
await invalidate('shop:*');

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

const PHONE_A = '9999900005';
const PHONE_B = '9999900006';
for (const p of [PHONE_A, PHONE_B].map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await Order.deleteMany({ userId: u._id });
    await Payment.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
}

const a = await loginAs(PHONE_A);
const b = await loginAs(PHONE_B);

// Address needed for checkout.
const addr = await json(
  await fetch(`${BASE}/addresses`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      fullName: 'Shop Tester', phone: '9876543210', line1: '1 Checkout St',
      city: 'Indore', state: 'MP', pincode: '452001',
    }),
  })
);

// ── 1. Catalog ───────────────────────────────────────────
const list = await json(await fetch(`${BASE}/shop/products`));
check('catalog lists 88 seeded products', list.data?.total === 88, `total=${list.data?.total}`);

const dogFood = await json(await fetch(`${BASE}/shop/products?petType=Dog&category=Food`));
check('filters (petType+category)', dogFood.data?.items.every((p) => p.petType === 'Dog' && p.category === 'Food'));

const search = await json(await fetch(`${BASE}/shop/products?search=dental`));
check('search matches name', search.data?.items.some((p) => /dental/i.test(p.name)));

const cached = await fetch(`${BASE}/shop/products`);
check('product list served from Redis cache', cached.headers.get('x-cache') === 'HIT');

const byLegacy = await json(await fetch(`${BASE}/shop/products/1`));
check('product detail by legacy id', byLegacy.data?.legacyId === 1 && byLegacy.data?.name?.includes('Dental'));

const cats = await json(await fetch(`${BASE}/shop/categories`));
check('categories seeded', cats.data?.length === 6);

// ── 2. Cart with price revalidation ──────────────────────
const productA = byLegacy.data;
const putCart = await json(
  await fetch(`${BASE}/cart`, {
    method: 'PUT',
    headers: authed(a.accessToken),
    body: JSON.stringify({ items: [{ productId: productA._id, packSizeIndex: 0, qty: 2 }] }),
  })
);
check(
  'cart hydrates with live catalog price',
  putCart.data?.items[0]?.price === productA.packSizes[0].price && putCart.data?.items[0]?.quantity === 2
);

// ── 3. COD checkout: stock + cart clearing ───────────────
const stockBefore = (await Product.findById(productA._id)).packSizes[0].stock;
const cod = await json(
  await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      items: [{ productId: productA._id, packSizeIndex: 0, qty: 2 }],
      addressId: addr.data._id,
      paymentMethod: 'cod',
    }),
  })
);
check('COD order placed', cod.data?.order?.status === 'placed' && cod.data.order.orderNo.startsWith('TC'));
const stockAfterCod = (await Product.findById(productA._id)).packSizes[0].stock;
check('stock decremented atomically', stockAfterCod === stockBefore - 2, `${stockBefore}→${stockAfterCod}`);
const cartAfter = await json(await fetch(`${BASE}/cart`, { headers: authed(a.accessToken) }));
check('cart cleared after order', cartAfter.data?.items.length === 0);

const amounts = cod.data.order.amounts;
const expectedSubtotal = productA.packSizes[0].price * 2 * 100;
check(
  'server-side pricing (subtotal + 5% tax in paise)',
  amounts.subtotal === expectedSubtotal && amounts.total === expectedSubtotal + Math.round(expectedSubtotal * 0.05)
);

// ── 4. Razorpay checkout → signed verify → fulfilment ────
const rzpCheckout = await json(
  await fetch(`${BASE}/orders/checkout`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      items: [{ productId: productA._id, packSizeIndex: 0, qty: 1 }],
      addressId: addr.data._id,
      paymentMethod: 'razorpay',
    }),
  })
);
check(
  'razorpay checkout returns real gateway order',
  rzpCheckout.data?.order?.status === 'pending_payment' &&
    rzpCheckout.data?.razorpay?.razorpayOrderId?.startsWith('order_')
);

const rzpOrderId = rzpCheckout.data.razorpay.razorpayOrderId;
const fakePaymentId = `pay_check${Date.now()}`;
const signature = crypto
  .createHmac('sha256', env.razorpay.keySecret)
  .update(`${rzpOrderId}|${fakePaymentId}`)
  .digest('hex');
const verify = await json(
  await fetch(`${BASE}/payments/verify`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ razorpayOrderId: rzpOrderId, razorpayPaymentId: fakePaymentId, signature }),
  })
);
check('payment verify → paid', verify.data?.status === 'paid');
const paidOrder = await json(
  await fetch(`${BASE}/orders/${rzpCheckout.data.order._id}`, { headers: authed(a.accessToken) })
);
check('paid order fulfilled to placed', paidOrder.data?.status === 'placed');

const tamper = await fetch(`${BASE}/payments/verify`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_evil', signature }),
});
check('tampered signature rejected', tamper.status === 400);

// ── 5. Orders list, IDOR, cancel restores stock ──────────
const myOrders = await json(await fetch(`${BASE}/orders`, { headers: authed(a.accessToken) }));
check('orders list (newest first, no pending)', myOrders.data?.length === 2 && myOrders.data.every((o) => o.status !== 'pending_payment'));

const idor = await fetch(`${BASE}/orders/${cod.data.order._id}`, { headers: authed(b.accessToken) });
check('cross-user order access blocked (IDOR)', idor.status === 404);

const stockBeforeCancel = (await Product.findById(productA._id)).packSizes[0].stock;
const cancelled = await json(
  await fetch(`${BASE}/orders/${cod.data.order._id}/cancel`, {
    method: 'POST',
    headers: authed(a.accessToken),
  })
);
const stockAfterCancel = (await Product.findById(productA._id)).packSizes[0].stock;
check('cancel restores stock', cancelled.data?.status === 'cancelled' && stockAfterCancel === stockBeforeCancel + 2);

// ── 6. Reviews + wishlist ────────────────────────────────
const review = await json(
  await fetch(`${BASE}/reviews`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ targetType: 'product', targetId: productA._id, rating: 5, text: 'Great for my dog!' }),
  })
);
check('review created', review.data?.rating === 5);
const productAfterReview = await Product.findById(productA._id);
check('product rating aggregate refreshed', productAfterReview.ratingCount === 1 && productAfterReview.rating === 5);

await fetch(`${BASE}/saved-items`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ targetType: 'product', targetId: productA._id }),
});
const saved = await json(await fetch(`${BASE}/saved-items`, { headers: authed(a.accessToken) }));
check('wishlist save + hydrated read', saved.data?.length === 1 && saved.data[0].product?.name === productA.name);

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
