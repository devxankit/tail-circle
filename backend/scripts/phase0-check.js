/**
 * Phase 0 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase0-check.js
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';
import { env } from '../src/config/env.js';
import { connectRedis, disconnectRedis, isRedisReady } from '../src/config/redis.js';
import { getOrSet, invalidate } from '../src/services/cache.service.js';
import { createRazorpayOrder, verifyPaymentSignature } from '../src/services/razorpay.service.js';
import { User } from '../src/modules/user/user.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

// 1. Health + API root
const health = await fetch(`http://localhost:${env.port}/health`).then((r) => r.json());
check('health endpoint', health.status === 'ok');

// 2. Redis + cache service round trip
await connectRedis();
await new Promise((r) => setTimeout(r, 500));
check('redis connected', isRedisReady());
let loads = 0;
const loader = async () => {
  loads++;
  return { n: 42 };
};
await getOrSet('check:roundtrip', 60, loader);
const second = await getOrSet('check:roundtrip', 60, loader);
check('cache getOrSet (hit on 2nd read)', loads === 1 && second.n === 42);
const removed = await invalidate('check:*');
check('cache invalidate', removed >= 1, `${removed} key(s)`);

// 3. Socket.IO handshake — rejected without token, accepted with one
await mongoose.connect(env.mongoUri);
const user = await User.findOneAndUpdate(
  { phone: '9999900000' },
  { $setOnInsert: { phone: '9999900000', isPhoneVerified: true } },
  { upsert: true, new: true }
);
const anonRejected = await new Promise((resolve) => {
  const s = io(`http://localhost:${env.port}`, { reconnection: false });
  s.on('connect', () => resolve(false));
  s.on('connect_error', () => resolve(true));
});
check('socket rejects anonymous connection', anonRejected);

const token = jwt.sign({ sub: user.id, role: user.role }, env.jwt.accessSecret, {
  expiresIn: '5m',
});
const authed = await new Promise((resolve) => {
  const s = io(`http://localhost:${env.port}`, { auth: { token }, reconnection: false });
  s.on('connect', () => {
    s.disconnect();
    resolve(true);
  });
  s.on('connect_error', (e) => {
    console.log('    connect_error:', e.message);
    resolve(false);
  });
});
check('socket accepts JWT handshake', authed);

// 4. Razorpay: test order + signature verification logic
try {
  const order = await createRazorpayOrder({ amountPaise: 100_00, receipt: 'tc_check' });
  check('razorpay test order created', order.id?.startsWith('order_'), order.id);
} catch (e) {
  check('razorpay test order created', false, e.message);
}
const crypto = await import('node:crypto');
const sig = crypto
  .createHmac('sha256', env.razorpay.keySecret)
  .update('order_x|pay_y')
  .digest('hex');
check(
  'payment signature verify (valid + tampered)',
  verifyPaymentSignature({ orderId: 'order_x', paymentId: 'pay_y', signature: sig }) &&
    !verifyPaymentSignature({ orderId: 'order_x', paymentId: 'pay_z', signature: sig })
);

// 5. OTP request still works end to end (dev logging path)
const otp = await fetch(`${BASE}/auth/request-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '9999900000' }),
});
check('request-otp accepted', otp.status === 200, `status ${otp.status}`);
const otpAgain = await fetch(`${BASE}/auth/request-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '9999900000' }),
});
check('per-phone OTP cooldown enforced', otpAgain.status === 429, `status ${otpAgain.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
