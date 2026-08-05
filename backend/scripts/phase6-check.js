/**
 * Phase 6 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase6-check.js
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import {
  AdoptionListing,
  AdoptionApplication,
  MarketplaceListing,
} from '../src/modules/adoption/adoption.models.js';
import { Payment } from '../src/modules/payment/payment.model.js';

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
await invalidate('adoption:*');

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

const PHONES = ['9999900011', '9999900012'];
for (const p of PHONES.map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await AdoptionApplication.deleteMany({ userId: u._id });
    await Payment.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
}
// Reset the two listings used below.
await AdoptionListing.updateOne({ legacyId: 'ADOPT-101' }, { $set: { status: 'Available' } });
await AdoptionListing.updateOne({ legacyId: 'ADOPT-102' }, { $set: { status: 'Available' } });
await AdoptionApplication.deleteMany({});
await MarketplaceListing.updateMany({ legacyId: { $in: ['m1', 'm2', 'm3', 'm4'] } }, { $set: { status: 'active' } });
await MarketplaceListing.deleteMany({ legacyId: null });

const [a, b] = await Promise.all(PHONES.map(loginAs));

// ── 1. Catalog ───────────────────────────────────────────
const pets = await json(await fetch(`${BASE}/adoption/pets`));
check('155 adoption listings seeded', pets.data?.length === 155, `n=${pets.data?.length}`);

const breeds = await json(await fetch(`${BASE}/adoption/breeds`));
const golden = breeds.data?.find((x) => x.name === 'Golden Retriever');
check('20 breed cards with live counts', breeds.data?.length === 20 && golden?.count === 12);

const byBreed = await json(await fetch(`${BASE}/adoption/pets?breed=pug`));
check('breed filter (case-insensitive)', byBreed.data?.length === 7 && byBreed.data.every((p) => p.breed === 'Pug'));

const detail = await json(await fetch(`${BASE}/adoption/pets/ADOPT-101`));
check('detail by legacy id (free pet)', detail.data?.legacyId === 'ADOPT-101' && detail.data?.price === 0);

// ── 2. Free adoption end-to-end ──────────────────────────
const app1 = await json(
  await fetch(`${BASE}/adoption/applications`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ listingId: 'ADOPT-101', form: { fullName: 'Tester', reason: 'Love' } }),
  })
);
check('application submitted', app1.data?.status === 'submitted' && app1.data?.applicationNo?.startsWith('ADP'));

const dup = await json(
  await fetch(`${BASE}/adoption/applications`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ listingId: 'ADOPT-101', form: {} }),
  })
);
check('duplicate application returns existing', dup.data?._id === app1.data._id);

const jump = await fetch(`${BASE}/adoption/applications/${app1.data._id}/advance`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ step: 'agreement_signed' }),
});
check('step-jumping rejected', jump.status === 400);

const advance = async (step) =>
  json(
    await fetch(`${BASE}/adoption/applications/${app1.data._id}/advance`, {
      method: 'POST',
      headers: authed(a.accessToken),
      body: JSON.stringify({ step }),
    })
  );
await advance('home_check_scheduled');
const approved = await advance('approved');
check('sequential advance to approved', approved.data?.status === 'approved');
const lockedListing = await AdoptionListing.findOne({ legacyId: 'ADOPT-101' });
check('listing locked (Pending) on approval', lockedListing.status === 'Pending');

await advance('meet_scheduled');
await advance('agreement_signed');
const freeComplete = await json(
  await fetch(`${BASE}/adoption/applications/${app1.data._id}/pay-fee`, {
    method: 'POST',
    headers: authed(a.accessToken),
  })
);
check('free adoption completes without payment', freeComplete.data?.application?.status === 'completed');
const adoptedListing = await AdoptionListing.findOne({ legacyId: 'ADOPT-101' });
check('listing marked Adopted', adoptedListing.status === 'Adopted');

// ── 3. Paid adoption fee via Razorpay ────────────────────
const paidPet = await json(await fetch(`${BASE}/adoption/pets/ADOPT-102`));
check('paid pet has fee', paidPet.data?.price > 0);

const app2 = await json(
  await fetch(`${BASE}/adoption/applications`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ listingId: 'ADOPT-102', form: {} }),
  })
);
const advB = async (step) =>
  fetch(`${BASE}/adoption/applications/${app2.data._id}/advance`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ step }),
  });
await advB('home_check_scheduled');
await advB('approved');
await advB('meet_scheduled');
await advB('agreement_signed');

const feeOrder = await json(
  await fetch(`${BASE}/adoption/applications/${app2.data._id}/pay-fee`, {
    method: 'POST',
    headers: authed(b.accessToken),
  })
);
check(
  'paid fee creates gateway order for listing price',
  feeOrder.data?.razorpay?.razorpayOrderId?.startsWith('order_') &&
    feeOrder.data?.razorpay?.amount === paidPet.data.price * 100
);

const sig = crypto
  .createHmac('sha256', env.razorpay.keySecret)
  .update(`${feeOrder.data.razorpay.razorpayOrderId}|pay_p6check`)
  .digest('hex');
await fetch(`${BASE}/payments/verify`, {
  method: 'POST',
  headers: authed(b.accessToken),
  body: JSON.stringify({ razorpayOrderId: feeOrder.data.razorpay.razorpayOrderId, razorpayPaymentId: 'pay_p6check', signature: sig }),
});
const app2Final = await AdoptionApplication.findById(app2.data._id);
check('paid fee completes adoption', app2Final.status === 'completed');

// ── 4. MyAdoptions + IDOR ────────────────────────────────
const myApps = await json(await fetch(`${BASE}/adoption/applications`, { headers: authed(a.accessToken) }));
check('MyAdoptions scoped + populated', myApps.data?.length === 1 && myApps.data[0].listingId?.name);

const idor = await fetch(`${BASE}/adoption/applications/${app1.data._id}/advance`, {
  method: 'POST',
  headers: authed(b.accessToken),
  body: JSON.stringify({ step: 'home_check_scheduled' }),
});
check('cross-user application blocked (IDOR)', idor.status === 404);

// ── 5. Marketplace ───────────────────────────────────────
const listings = await json(await fetch(`${BASE}/marketplace/listings`));
check('4 marketplace listings seeded', listings.data?.length === 4);

const sell = await json(
  await fetch(`${BASE}/marketplace/listings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ name: 'Biscuit', species: 'Dog', breed: 'Indie', price: '5000', location: 'Indore' }),
  })
);
check('sell tab creates listing (seller from account)', sell.data?.status === 'active' && sell.data?.seller?.length > 0);

const meet = await json(
  await fetch(`${BASE}/marketplace/listings/${listings.data[0]._id}/book-meet`, {
    method: 'POST',
    headers: authed(b.accessToken),
  })
);
check('book-meet marks listing booked', meet.data?.status === 'booked');

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
