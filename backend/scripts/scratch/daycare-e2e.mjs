/**
 * End-to-end daycare check: a centre publishes plans, add-ons and a daily
 * capacity; a customer books a multi-day stay; the centre sees it on every day
 * of that stay and is billed the total the customer approved.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { ServiceOffering } from '../../src/modules/provider/serviceOffering.model.js';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { SlotBooking } from '../../src/modules/booking/slot.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5994/api';
const tok = (id, role) => jwt.sign({ sub: String(id), role }, SECRET, { expiresIn: '1h' });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

const TAG = 'E2E-DAYCARE';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5994, r));

  /* fixtures */
  const vendorUser = await User.findOneAndUpdate(
    { email: 'e2e.daycare.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Vendor`, phone: '9000000201', role: 'vendor', vendorType: 'daycare' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: vendorUser._id },
    {
      $set: { businessName: `${TAG} Centre`, vendorType: 'daycare', approvalStatus: 'approved' },
      $setOnInsert: { registrationNo: 'TCV-E2EDAY' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const provider = await Provider.findOneAndUpdate(
    { vendorUserId: vendorUser._id, type: 'daycare' },
    {
      $set: {
        name: `${TAG} Centre`,
        approvalStatus: 'approved',
        active: true,
        isOpen: true,
        openTime: '7:00 AM',
        closeTime: '8:00 PM',
        startingPrice: 600,
        details: {},
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await ServiceOffering.deleteMany({ providerId: provider._id });
  await Booking.deleteMany({ providerId: provider._id });
  await SlotBooking.deleteMany({ providerId: provider._id });

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.daycare.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000202', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pet = await Pet.findOneAndUpdate(
    { ownerId: customer._id, name: `${TAG} Coco` },
    { $set: { species: 'dog', breed: 'Labrador', deletedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const vendorToken = tok(vendorUser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. centre publishes */
  console.log('\n1. Centre publishes a day plan, an add-on and its daily capacity');
  const plan = await call('/vendor/daycare/services', {
    token: vendorToken,
    method: 'POST',
    body: { name: 'Full Day Care', price: 600, kind: 'plan', unit: 'day' },
  });
  check('day plan created', plan.status === 201, `status ${plan.status} ${plan.message || ''}`);

  const addon = await call('/vendor/daycare/services', {
    token: vendorToken,
    method: 'POST',
    body: { name: 'Pickup & Drop', price: 120, kind: 'addon', unit: 'day' },
  });
  check('add-on created', addon.status === 201, `status ${addon.status}`);

  const cfg = await call('/vendor/daycare/profile', {
    token: vendorToken,
    method: 'PATCH',
    body: { dailyCapacity: 2, daycareFees: { platformFee: 49, discount: 300 } },
  });
  check('daily capacity saved', cfg.data?.details?.dailyCapacity === 2, String(cfg.data?.details?.dailyCapacity));

  /* 2. customer sees the catalogue and the day grid */
  console.log('\n2. Customer opens the centre');
  const centre = await call(`/providers/${provider._id}`);
  const plans = centre.data?.offerings?.plans || [];
  const addons = centre.data?.offerings?.addons || [];
  check('centre lists its own plan', plans.length === 1 && plans[0].name === 'Full Day Care',
    plans.map((p) => p.name).join(', ') || 'none');
  check('plan exposes a bookable id and unit', Boolean(plans[0]?.id) && plans[0]?.unit === 'day',
    `${plans[0]?.id} / ${plans[0]?.unit}`);
  const myAddon = addons.find((a) => a.name === 'Pickup & Drop');
  check('centre add-on is listed', Boolean(myAddon));

  const start = inDays(3);
  const grid = await call(`/providers/${provider._id}/availability?from=${start}&days=7`);
  check('day-availability grid returns', grid.status === 200 && grid.data?.days?.length === 7,
    `status ${grid.status}, ${grid.data?.days?.length} days, capacity ${grid.data?.capacity}`);

  /* 3. a three-day stay */
  console.log('\n3. Customer books a 3-day stay');
  const stay = [start, inDays(4), inDays(5)];
  const booking = await call('/bookings', {
    token: userToken,
    method: 'POST',
    body: {
      type: 'daycare',
      providerId: String(provider._id),
      petId: String(pet._id),
      items: [{ refId: plans[0].id }, { refId: myAddon.id }],
      schedule: { startDate: stay[0], endDate: stay[2], durationDays: 3, time: '9:00 AM' },
      paymentMethod: 'pay_later',
      meta: { dates: stay, dropoffTime: '9:00 AM', pickupTime: '6:00 PM' },
    },
  });
  check('booking accepted', booking.status === 201, `status ${booking.status} ${booking.message || ''}`);

  // (600 + 120) x 3 days + 49 platform - 300 discount = 1909
  const total = booking.data?.booking?.amounts?.total;
  check('charged total matches the price summary', total === 190900, `${total} paise, expected 190900`);
  check('per-day items billed x3',
    (booking.data?.booking?.items || []).filter((i) => i.qty === 3).length === 2,
    JSON.stringify((booking.data?.booking?.items || []).map((i) => `${i.name} x${i.qty}`)));
  check('stay spans 3 days', booking.data?.booking?.schedule?.durationDays === 3,
    `${booking.data?.booking?.schedule?.startDate} -> ${booking.data?.booking?.schedule?.endDate}`);

  /* 4. every day of the stay holds a place */
  console.log('\n4. Capacity is held on every day of the stay');
  const after = await call(`/providers/${provider._id}/availability?from=${start}&days=7`);
  const booked = (after.data?.days || []).filter((d) => d.booked > 0).map((d) => d.date);
  check('all three days reserved', JSON.stringify(booked) === JSON.stringify(stay), JSON.stringify(booked));

  // capacity 2 -> a second stay fits, a third does not
  const second = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'daycare', providerId: String(provider._id), petId: String(pet._id),
      items: [{ refId: plans[0].id }],
      schedule: { startDate: stay[1], durationDays: 1, time: '9:00 AM' },
      paymentMethod: 'pay_later', meta: { dates: [stay[1]] },
    },
  });
  check('second stay fits within capacity 2', second.status === 201, `status ${second.status} ${second.message || ''}`);

  const third = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'daycare', providerId: String(provider._id), petId: String(pet._id),
      items: [{ refId: plans[0].id }],
      schedule: { startDate: stay[1], durationDays: 1, time: '9:00 AM' },
      paymentMethod: 'pay_later', meta: { dates: [stay[1]] },
    },
  });
  check('third stay rejected — centre full that day', third.status >= 400,
    `status ${third.status}, "${third.message}"`);

  /* 5. a stay that overlaps a full day is refused whole */
  console.log('\n5. A stay overlapping a full day is refused outright');
  const spanning = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'daycare', providerId: String(provider._id), petId: String(pet._id),
      items: [{ refId: plans[0].id }],
      schedule: { startDate: inDays(2), durationDays: 4, time: '9:00 AM' },
      paymentMethod: 'pay_later',
    },
  });
  check('overlapping stay rejected', spanning.status >= 400, `status ${spanning.status}, "${spanning.message}"`);

  const afterFail = await call(`/providers/${provider._id}/availability?from=${inDays(2)}&days=2`);
  const dayBefore = (afterFail.data?.days || []).find((d) => d.date === inDays(2));
  check('no capacity leaked from the refused stay', dayBefore?.booked === 0, JSON.stringify(dayBefore));

  /* 6. the centre sees it on every day */
  console.log('\n6. Centre sees the stay on each of its days');
  for (const date of stay) {
    const sheet = await call(`/vendor/daycare/bookings?date=${date}`, { token: vendorToken });
    const found = (sheet.data || []).some((b) => b.bookingNo === booking.data.booking.bookingNo);
    check(`day sheet for ${date} shows the stay`, found, `${sheet.data?.length} rows`);
  }

  const summary = await call('/vendor/daycare/summary', { token: vendorToken });
  check('summary reports the daily capacity', summary.data?.dailyCapacity === 2, String(summary.data?.dailyCapacity));

  /* 6b. moving the whole stay */
  console.log('\n6b. Rescheduling moves the whole stay');
  const moveTo = inDays(20);
  const moved = await call(`/bookings/${booking.data.booking._id}/reschedule`, {
    token: userToken, method: 'POST', body: { date: moveTo, time: '9:00 AM' },
  });
  check('reschedule accepted', moved.status === 200, `status ${moved.status} ${moved.message || ''}`);
  check('stay keeps its 3-day length at the new start',
    moved.data?.schedule?.startDate === moveTo && moved.data?.meta?.dates?.length === 3,
    `${moved.data?.schedule?.startDate} -> ${moved.data?.schedule?.endDate}, ${moved.data?.meta?.dates?.length} days`);

  const oldFreed = await call(`/providers/${provider._id}/availability?from=${start}&days=3`);
  const stillOnOldDays = (oldFreed.data?.days || []).filter((d) => d.date === stay[0] && d.booked > 0);
  check('the original days were handed back', stillOnOldDays.length === 0,
    JSON.stringify((oldFreed.data?.days || []).map((d) => `${d.date}:${d.booked}`)));

  const nowHeld = await call(`/providers/${provider._id}/availability?from=${moveTo}&days=3`);
  check('all three new days are held',
    (nowHeld.data?.days || []).filter((d) => d.booked > 0).length === 3,
    JSON.stringify((nowHeld.data?.days || []).map((d) => `${d.date}:${d.booked}`)));

  // Fill the destination to capacity, then try to move a stay onto it.
  const blockDate = inDays(40);
  for (let i = 0; i < 2; i += 1) {
    await call('/bookings', {
      token: userToken, method: 'POST',
      body: {
        type: 'daycare', providerId: String(provider._id), petId: String(pet._id),
        items: [{ refId: plans[0].id }],
        schedule: { startDate: blockDate, durationDays: 1, time: '9:00 AM' },
        paymentMethod: 'pay_later', meta: { dates: [blockDate] },
      },
    });
  }
  const blocked = await call(`/bookings/${booking.data.booking._id}/reschedule`, {
    token: userToken, method: 'POST', body: { date: blockDate, time: '9:00 AM' },
  });
  check('move onto a full day refused', blocked.status >= 400, `status ${blocked.status}, "${blocked.message}"`);

  const intact = await call(`/providers/${provider._id}/availability?from=${moveTo}&days=3`);
  check('a refused move leaves the stay where it was',
    (intact.data?.days || []).filter((d) => d.booked > 0).length === 3,
    JSON.stringify((intact.data?.days || []).map((d) => `${d.date}:${d.booked}`)));

  /* 7. cancelling frees every day */
  console.log('\n7. Cancelling hands back all the days');
  const cancelled = await call(`/bookings/${booking.data.booking._id}/cancel`, {
    token: userToken, method: 'POST',
  });
  check('cancel accepted', cancelled.status === 200, `status ${cancelled.status}`);

  const freed = await call(`/providers/${provider._id}/availability?from=${moveTo}&days=3`);
  const stillHeld = (freed.data?.days || []).filter((d) => d.booked > 0);
  check('every day of the cancelled stay released', stillHeld.length === 0,
    JSON.stringify((freed.data?.days || []).map((d) => `${d.date}:${d.booked}`)));

  /* cleanup */
  await Booking.deleteMany({ providerId: provider._id });
  await SlotBooking.deleteMany({ providerId: provider._id });
  await ServiceOffering.deleteMany({ providerId: provider._id });
  await Provider.updateOne({ _id: provider._id }, { $set: { active: false, approvalStatus: 'pending' } });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
