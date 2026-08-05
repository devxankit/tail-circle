/**
 * Phase 4 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase4-check.js
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { SlotBooking } from '../src/modules/booking/slot.model.js';
import { Event } from '../src/modules/provider/event.model.js';
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
await invalidate('providers:*');
await invalidate('doctors:*');
await invalidate('events:*');

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

const PHONES = ['9999900007', '9999900008', '9999900009'];
for (const p of PHONES.map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await Booking.deleteMany({ userId: u._id });
    await Payment.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
}
await SlotBooking.deleteMany({ date: '2099-01-05' });
await Event.updateOne({ legacyId: 1 }, { $set: { sold: 0, capacity: 100 } });

const [a, b, c] = await Promise.all(PHONES.map(loginAs));

// ── 1. Catalogs ──────────────────────────────────────────
const daycares = await json(await fetch(`${BASE}/providers?type=daycare`));
check('3 daycares seeded with pricing details', daycares.data?.length === 3 && daycares.data[0].details?.pricePerDay > 0);

const dcDetail = await json(await fetch(`${BASE}/providers/dc_1`));
check('daycare detail + platform plans/addons', dcDetail.data?.offerings?.plans.length === 3 && dcDetail.data?.offerings?.addons.length === 5);

const shops = await json(await fetch(`${BASE}/providers?type=grooming`));
check('5 grooming shops seeded', shops.data?.length === 5);

const shopDetail = await json(await fetch(`${BASE}/providers/gshop_1`));
check('grooming detail: packages + menu + shared addons', shopDetail.data?.offerings?.packages.length === 3 && shopDetail.data?.offerings?.menu.length === 8);

const doctors = await json(await fetch(`${BASE}/doctors`));
check('doctors seeded and listed', doctors.data?.length >= 3, `got ${doctors.data?.length}`);

const events = await json(await fetch(`${BASE}/events`));
check('5 events seeded', events.data?.length === 5);

const meta = await json(await fetch(`${BASE}/events/meta`));
check('event categories + package templates', meta.data?.categories?.length === 11 && meta.data?.packageTemplates?.length === 5);

// ── 2. Slots ─────────────────────────────────────────────
const slots = await json(await fetch(`${BASE}/providers/gshop_1/slots?date=2099-01-05`));
check('grooming slots from template', slots.data?.length === 10 && slots.data.every((s) => s.available));

// ── 3. Grooming booking (pay later) + slot capacity ─────
const groomingBody = (token) =>
  fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(token),
    body: JSON.stringify({
      type: 'grooming',
      providerId: 'gshop_1',
      items: [{ refId: 'pkg_2' }, { refId: 'addon_1' }],
      schedule: { startDate: '2099-01-05', time: '09:00 AM' },
      visitType: 'salon',
      paymentMethod: 'pay_later',
    }),
  });

const g1 = await json(await groomingBody(a.accessToken));
check('grooming booking confirmed (pay later)', g1.data?.booking?.status === 'confirmed' && g1.data.booking.bookingNo.startsWith('TCG'));
// pkg_2 999 + addon_1 299 - discount 100 = 1198 → 119800 paise
check('grooming pricing mirrors UI (999+299-100)', g1.data?.booking?.amounts?.total === 119800, `total=${g1.data?.booking?.amounts?.total}`);

await groomingBody(b.accessToken); // fills capacity (2)
const g3 = await json(await groomingBody(c.accessToken));
check('slot capacity enforced (3rd booking rejected)', g3.success === false && /slot/i.test(g3.message || ''));

const slotsAfter = await json(await fetch(`${BASE}/providers/gshop_1/slots?date=2099-01-05`));
check('booked slot shows unavailable', slotsAfter.data?.find((s) => s.time === '09:00 AM')?.available === false);

// ── 4. Daycare booking (razorpay, priced server-side) ────
const daycare = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      type: 'daycare',
      providerId: 'dc_1',
      items: [{ refId: 'plan_day' }, { refId: 'addon_1' }],
      schedule: { startDate: '2099-01-06', durationDays: 2 },
      paymentMethod: 'razorpay',
    }),
  })
);
// (499×2 + 150×2 + fee 49) - 300 = 1047 → 104700
check('daycare razorpay booking pending + gateway order', daycare.data?.booking?.status === 'pending_payment' && daycare.data?.razorpay?.razorpayOrderId?.startsWith('order_'));
check('daycare pricing mirrors UI (499×2+150×2+49-300)', daycare.data?.booking?.amounts?.total === 104700, `total=${daycare.data?.booking?.amounts?.total}`);

// Signed verify completes it
const sig = crypto
  .createHmac('sha256', env.razorpay.keySecret)
  .update(`${daycare.data.razorpay.razorpayOrderId}|pay_p4check`)
  .digest('hex');
await fetch(`${BASE}/payments/verify`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ razorpayOrderId: daycare.data.razorpay.razorpayOrderId, razorpayPaymentId: 'pay_p4check', signature: sig }),
});
const paidBooking = await json(await fetch(`${BASE}/bookings/${daycare.data.booking._id}`, { headers: authed(a.accessToken) }));
check('paid booking → confirmed', paidBooking.data?.status === 'confirmed');

// ── 5. Doctor bookings ───────────────────────────────────
// Slots come from the vet's own working days now, not a global template, so the
// test asks the availability engine for a real slot instead of hardcoding one.
async function firstSlot(doctorId, visitType) {
  for (let i = 1; i <= 14; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const r = await json(await fetch(`${BASE}/doctors/${doctorId}/slots?date=${date}&visitType=${visitType}`));
    if (r.data?.length) return { date, time: r.data[0].time };
  }
  return null;
}

const slot1 = await firstSlot('1', 'clinic');
check('vet availability yields bookable in-clinic slots', !!slot1, slot1 ? `${slot1.date} ${slot1.time}` : 'none found');

const doc1 = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      type: 'doctor',
      doctorId: '1',
      schedule: { startDate: slot1.date, time: slot1.time },
      visitType: 'clinic',
      paymentMethod: 'pay_later',
    }),
  })
);
check('doctor pay-at-clinic booking (fee 500, no platform fee)', doc1.data?.booking?.status === 'confirmed' && doc1.data.booking.amounts.total === 50000, `total=${doc1.data?.booking?.amounts?.total}`);

const slot2 = await firstSlot('1', 'clinic');
const doc2 = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      type: 'doctor',
      doctorId: '1',
      schedule: { startDate: slot2.date, time: slot2.time },
      visitType: 'clinic',
      paymentMethod: 'razorpay',
    }),
  })
);
check('doctor online booking adds ₹29 platform fee (529)', doc2.data?.booking?.amounts?.total === 52900, `total=${doc2.data?.booking?.amounts?.total}`);

// Doctor 1 has not enabled video consults — the server must refuse regardless
// of what the client sends.
const docVideo = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      type: 'doctor',
      doctorId: '1',
      schedule: { startDate: slot1.date, time: slot1.time },
      visitType: 'video',
      paymentMethod: 'pay_later',
    }),
  })
);
check('video booking refused for a vet who does not offer it', /does not offer/i.test(docVideo.message || ''), docVideo.message);

// A video consult has no venue at which to collect cash — pay-at-clinic on a
// remote consult once handed out a completely free consultation.
const gogale = await (await fetch(`${BASE}/doctors`)).json().then((r) => r.data.find((d) => d.modes?.video?.enabled));
if (gogale) {
  let videoSlot = null;
  for (let i = 1; i <= 10 && !videoSlot; i += 1) {
    const dt = new Date();
    dt.setDate(dt.getDate() + i);
    const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const rr = await json(await fetch(`${BASE}/doctors/${gogale._id}/slots?date=${ds}&visitType=video`));
    if (rr.data?.length) videoSlot = { date: ds, time: rr.data[0].time };
  }
  if (videoSlot) {
    const payLaterVideo = await json(
      await fetch(`${BASE}/bookings`, {
        method: 'POST',
        headers: authed(a.accessToken),
        body: JSON.stringify({
          type: 'doctor',
          doctorId: String(gogale._id),
          schedule: { startDate: videoSlot.date, time: videoSlot.time },
          visitType: 'video',
          paymentMethod: 'pay_later',
        }),
      })
    );
    check('video consult cannot be booked pay-at-clinic', payLaterVideo.success === false && /in advance/i.test(payLaterVideo.message || ''), payLaterVideo.message);
  }
}

// ── 6. Event tickets: capacity + fee flag ────────────────
const ev = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ type: 'event', eventId: '1', ticketQty: 2, paymentMethod: 'pay_later' }),
  })
);
check('event tickets booked (699×2)', ev.data?.booking?.amounts?.total === 139800);
const evDoc = await Event.findOne({ legacyId: 1 });
check('ticket sales increment sold', evDoc.sold === 2);

const evFee = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ type: 'event', eventId: '1', ticketQty: 1, paymentMethod: 'razorpay', meta: { withPlatformFee: true } }),
  })
);
check('checkout flow adds ₹49 fee (699+49)', evFee.data?.booking?.amounts?.total === 74800);

await Event.updateOne({ legacyId: 1 }, { $set: { capacity: 3 } });
const evOver = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(b.accessToken),
    body: JSON.stringify({ type: 'event', eventId: '1', ticketQty: 5, paymentMethod: 'pay_later' }),
  })
);
check('ticket capacity guard', evOver.success === false && /tickets/i.test(evOver.message || ''));
await Event.updateOne({ legacyId: 1 }, { $set: { capacity: 100 } });

// ── 7. Memorial free booking ─────────────────────────────
const mem = await json(
  await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      type: 'memorial',
      paymentMethod: 'pay_later',
      meta: { contact: { name: 'Test', phone: '9876543210', petName: 'Bruno' } },
    }),
  })
);
check('memorial callback booking (free, confirmed)', mem.data?.booking?.status === 'confirmed' && mem.data.booking.amounts.total === 0 && mem.data.booking.paymentMethod === 'free');

// ── 8. List, IDOR, cancel releases slot ──────────────────
const list = await json(await fetch(`${BASE}/bookings`, { headers: authed(a.accessToken) }));
check('unified booking history lists all verticals', list.data?.length >= 6);

const idor = await fetch(`${BASE}/bookings/${g1.data.booking._id}`, { headers: authed(c.accessToken) });
check('cross-user booking access blocked (IDOR)', idor.status === 404);

await fetch(`${BASE}/bookings/${g1.data.booking._id}/cancel`, { method: 'POST', headers: authed(a.accessToken) });
const slotsFinal = await json(await fetch(`${BASE}/providers/gshop_1/slots?date=2099-01-05`));
check('cancel releases the slot seat', slotsFinal.data?.find((s) => s.time === '09:00 AM')?.available === true);

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
