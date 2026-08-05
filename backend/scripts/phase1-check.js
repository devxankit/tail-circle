/**
 * Phase 1 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase1-check.js
 *
 * OTP codes are inserted directly into Mongo (bcrypt-hashed) instead of
 * calling /auth/request-otp, so automated runs never hit the SMS gateway.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

async function json(res) {
  return res.json().catch(() => ({}));
}

async function seedOtpAndLogin(rawPhone, code = '1234') {
  const phone = normalizePhone(rawPhone);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: rawPhone, code }),
  });
  return { status: res.status, body: await json(res) };
}

const authed = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

await mongoose.connect(env.mongoUri);

// Clear rate-limit counters so repeated runs don't 429 (Redis-backed limits
// survive server restarts — good in prod, bad for tests).
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('rl:api:*');
await invalidate('otp:*');

// Fresh slate for the two test identities.
const PHONE_A = '9999900001';
const PHONE_B = '9999900002';
for (const p of [PHONE_A, PHONE_B].map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    const { RefreshToken } = await import('../src/modules/auth/refreshToken.model.js');
    const { Address } = await import('../src/modules/address/address.model.js');
    const { SupportTicket } = await import('../src/modules/support/supportTicket.model.js');
    await Promise.all([
      RefreshToken.deleteMany({ userId: u._id }),
      Address.deleteMany({ userId: u._id }),
      SupportTicket.deleteMany({ userId: u._id }),
      User.deleteOne({ _id: u._id }),
    ]);
  }
}

// ── 1. OTP login + phone normalization ───────────────────
const login = await seedOtpAndLogin(PHONE_A);
check('verify-otp issues tokens (new user 201)', login.status === 201 && !!login.body.data?.accessToken);
check('phone stored normalized (+91…)', login.body.data?.user?.phone === normalizePhone(PHONE_A));
let { accessToken, refreshToken } = login.body.data;

// Wrong OTP path
await Otp.deleteMany({ phone: normalizePhone(PHONE_A) });
await Otp.create({
  phone: normalizePhone(PHONE_A),
  codeHash: await bcrypt.hash('1234', 10),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
});
const badOtp = await fetch(`${BASE}/auth/verify-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE_A, code: '9999' }),
});
check('wrong OTP rejected', badOtp.status === 400);

// ── 2. Profile ───────────────────────────────────────────
const me = await json(await fetch(`${BASE}/users/me`, { headers: authed(accessToken) }));
check('GET /users/me', me.data?.phone === normalizePhone(PHONE_A));

const patched = await json(
  await fetch(`${BASE}/users/me`, {
    method: 'PATCH',
    headers: authed(accessToken),
    body: JSON.stringify({ name: 'Phase One', bio: 'testing', gender: 'other', city: 'Indore' }),
  })
);
check('PATCH /users/me persists fields', patched.data?.name === 'Phase One' && patched.data?.city === 'Indore');

const badPatch = await fetch(`${BASE}/users/me`, {
  method: 'PATCH',
  headers: authed(accessToken),
  body: JSON.stringify({ role: 'admin' }),
});
check('PATCH /users/me rejects role escalation (strict schema)', badPatch.status === 400);

// ── 3. Refresh rotation + reuse detection ────────────────
const r1 = await json(
  await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
);
check('refresh rotates tokens', !!r1.data?.refreshToken && r1.data.refreshToken !== refreshToken);

const reuse = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken }), // OLD token again
});
check('reused refresh token rejected', reuse.status === 401);

const familyDead = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: r1.data.refreshToken }),
});
check('reuse revokes whole family (theft response)', familyDead.status === 401);

// Log back in for the rest.
const relogin = await seedOtpAndLogin(PHONE_A);
accessToken = relogin.body.data.accessToken;
refreshToken = relogin.body.data.refreshToken;

// ── 4. Logout revocation ─────────────────────────────────
await fetch(`${BASE}/auth/logout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken }),
});
const afterLogout = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken }),
});
check('logout revokes refresh token', afterLogout.status === 401);

const relogin2 = await seedOtpAndLogin(PHONE_A);
accessToken = relogin2.body.data.accessToken;

// ── 5. Addresses ─────────────────────────────────────────
const addrBase = {
  fullName: 'Phase One',
  phone: '9876543210',
  line1: '12 Test Lane',
  city: 'Indore',
  state: 'MP',
  pincode: '452001',
};
const a1 = await json(
  await fetch(`${BASE}/addresses`, {
    method: 'POST',
    headers: authed(accessToken),
    body: JSON.stringify({ ...addrBase, label: 'home' }),
  })
);
check('first address auto-default', a1.data?.isDefault === true);

const a2 = await json(
  await fetch(`${BASE}/addresses`, {
    method: 'POST',
    headers: authed(accessToken),
    body: JSON.stringify({ ...addrBase, label: 'work', line1: '99 Office Rd', isDefault: true }),
  })
);
const listAfter = await json(await fetch(`${BASE}/addresses`, { headers: authed(accessToken) }));
const defaults = listAfter.data.filter((a) => a.isDefault);
check('default switches to new address (exactly one default)', defaults.length === 1 && defaults[0]._id === a2.data._id);

const badPin = await fetch(`${BASE}/addresses`, {
  method: 'POST',
  headers: authed(accessToken),
  body: JSON.stringify({ ...addrBase, pincode: '12' }),
});
check('invalid pincode rejected', badPin.status === 400);

// Ownership: user B cannot touch user A's address
const loginB = await seedOtpAndLogin(PHONE_B);
const tokenB = loginB.body.data.accessToken;
const idorPatch = await fetch(`${BASE}/addresses/${a1.data._id}`, {
  method: 'PATCH',
  headers: authed(tokenB),
  body: JSON.stringify({ city: 'Hacked' }),
});
check('cross-user address access blocked (IDOR)', idorPatch.status === 404);

const del = await fetch(`${BASE}/addresses/${a2.data._id}`, {
  method: 'DELETE',
  headers: authed(accessToken),
});
const listFinal = await json(await fetch(`${BASE}/addresses`, { headers: authed(accessToken) }));
check(
  'deleting default promotes another to default',
  del.status === 200 && listFinal.data.length === 1 && listFinal.data[0].isDefault === true
);

// ── 6. Support tickets ───────────────────────────────────
const ticket = await json(
  await fetch(`${BASE}/support/tickets`, {
    method: 'POST',
    headers: authed(accessToken),
    body: JSON.stringify({ subject: 'Test ticket', category: 'account', message: 'Something is not working right.' }),
  })
);
check('ticket created with ticketNo', ticket.data?.ticketNo?.startsWith('TC-'));

const reply = await json(
  await fetch(`${BASE}/support/tickets/${ticket.data._id}/replies`, {
    method: 'POST',
    headers: authed(accessToken),
    body: JSON.stringify({ message: 'Adding more details.' }),
  })
);
check('user reply appended', reply.data?.replies?.length === 1);

const ticketsB = await json(await fetch(`${BASE}/support/tickets`, { headers: authed(tokenB) }));
check('tickets scoped to owner', Array.isArray(ticketsB.data) && ticketsB.data.length === 0);

// ── 7. FCM token registration ────────────────────────────
const fcm = await fetch(`${BASE}/users/me/fcm-token`, {
  method: 'POST',
  headers: authed(accessToken),
  body: JSON.stringify({ token: 'test-device-token-phase1-0123456789', platform: 'web' }),
});
check('FCM device token registered', fcm.status === 200);

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
