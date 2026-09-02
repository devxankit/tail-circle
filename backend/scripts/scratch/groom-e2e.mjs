/**
 * End-to-end grooming check: a vendor publishes a package + add-on + slots,
 * a customer books them, and the vendor sees the appointment with the same
 * total the customer approved.
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
const API = 'http://localhost:5998/api';
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

const TAG = 'E2E-GROOM';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5998, r));

  /* fixtures */
  const vendorUser = await User.findOneAndUpdate(
    { email: 'e2e.groom.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Vendor`, phone: '9000000101', role: 'vendor', vendorType: 'grooming' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  // registrationNo is assigned by a pre('save') hook that findOneAndUpdate
  // never runs, and the field is uniquely indexed — so it has to be set here.
  await VendorProfile.findOneAndUpdate(
    { userId: vendorUser._id },
    {
      $set: { businessName: `${TAG} Salon`, vendorType: 'grooming', approvalStatus: 'approved' },
      $setOnInsert: { registrationNo: `TCV-E2EGRM` },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const provider = await Provider.findOneAndUpdate(
    { vendorUserId: vendorUser._id, type: 'grooming' },
    {
      $set: {
        name: `${TAG} Salon`,
        approvalStatus: 'approved',
        active: true,
        isOpen: true,
        visitTypes: ['Salon Visit', 'Home Visit'],
        startingPrice: 499,
        details: {},
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await ServiceOffering.deleteMany({ providerId: provider._id });
  await Booking.deleteMany({ providerId: provider._id });
  await SlotBooking.deleteMany({ providerId: provider._id });

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.groom.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000102', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pet = await Pet.findOneAndUpdate(
    { ownerId: customer._id, name: `${TAG} Bruno` },
    { $set: { species: 'dog', breed: 'Beagle', deletedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const vendorToken = tok(vendorUser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. vendor publishes catalogue */
  console.log('\n1. Vendor publishes a package, an add-on and slots');
  const pkg = await call('/vendor/grooming/services', {
    token: vendorToken,
    method: 'POST',
    body: {
      name: 'Signature Full Groom',
      price: 1200,
      kind: 'package',
      includes: ['Bath', 'Haircut', 'Nail Trim'],
      isPopular: true,
    },
  });
  check('package created', pkg.status === 201, `status ${pkg.status} ${pkg.message || ''}`);

  const addon = await call('/vendor/grooming/services', {
    token: vendorToken,
    method: 'POST',
    body: { name: 'Blueberry Facial', price: 300, kind: 'addon', category: 'Spa' },
  });
  check('add-on created', addon.status === 201, `status ${addon.status}`);

  const slots = await call('/vendor/grooming/slots', {
    token: vendorToken,
    method: 'PUT',
    body: {
      slotTemplate: [
        { time: '10:00 AM', period: 'Morning', capacity: 1 },
        { time: '04:00 PM', period: 'Evening', capacity: 3 },
      ],
    },
  });
  check('slot template saved', slots.status === 200, `status ${slots.status}`);

  const fees = await call('/vendor/grooming/profile', {
    token: vendorToken,
    method: 'PATCH',
    body: { groomingFees: { travelFee: 80, discount: 150 } },
  });
  check(
    'travel fee + discount saved',
    fees.data?.details?.groomingFees?.travelFee === 80,
    JSON.stringify(fees.data?.details?.groomingFees)
  );

  /* 2. customer sees exactly that */
  console.log('\n2. Customer opens the salon');
  const shop = await call(`/providers/${provider._id}`);
  const pubPkgs = shop.data?.offerings?.packages || [];
  const pubAddons = shop.data?.offerings?.addons || [];
  check(
    'vendor package is the one listed',
    pubPkgs.length === 1 && pubPkgs[0].name === 'Signature Full Groom',
    pubPkgs.map((p) => `${p.name} Rs${p.price}`).join(', ') || 'none'
  );
  check(
    'package keeps its includes chips',
    (pubPkgs[0]?.includes || []).length === 3,
    JSON.stringify(pubPkgs[0]?.includes)
  );
  check('offering exposes a bookable id', Boolean(pubPkgs[0]?.id), String(pubPkgs[0]?.id));
  const myAddon = pubAddons.find((a) => a.name === 'Blueberry Facial');
  check('vendor add-on is listed', Boolean(myAddon));

  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const slotList = await call(`/providers/${provider._id}/slots?date=${ymd}`);
  check(
    'customer sees the two vendor slots',
    slotList.data?.length === 2,
    (slotList.data || []).map((s) => `${s.time}(cap ${s.capacity})`).join(', ')
  );

  /* 3. customer books */
  console.log('\n3. Customer books a home visit');
  const booking = await call('/bookings', {
    token: userToken,
    method: 'POST',
    body: {
      type: 'grooming',
      providerId: String(provider._id),
      petId: String(pet._id),
      items: [{ refId: pubPkgs[0].id }, { refId: myAddon.id }],
      schedule: { startDate: ymd, time: '10:00 AM' },
      visitType: 'home',
      paymentMethod: 'pay_later',
    },
  });
  check('booking accepted', booking.status === 201, `status ${booking.status} ${booking.message || ''}`);

  // 1200 + 300 + 80 travel - 150 discount = 1430
  const total = booking.data?.booking?.amounts?.total;
  check('charged total matches the price summary', total === 143000, `${total} paise, expected 143000`);
  check(
    'travel fee is a real line item',
    (booking.data?.booking?.items || []).some((i) => i.name === 'Travel Fee' && i.price === 80)
  );

  /* 4. capacity is enforced */
  console.log('\n4. A capacity-1 slot refuses a second booking');
  const dup = await call('/bookings', {
    token: userToken,
    method: 'POST',
    body: {
      type: 'grooming',
      providerId: String(provider._id),
      petId: String(pet._id),
      items: [{ refId: pubPkgs[0].id }],
      schedule: { startDate: ymd, time: '10:00 AM' },
      visitType: 'salon',
      paymentMethod: 'pay_later',
    },
  });
  check('second booking rejected', dup.status >= 400, `status ${dup.status}, "${dup.message}"`);

  const after = await call(`/providers/${provider._id}/slots?date=${ymd}`);
  const tenAm = (after.data || []).find((s) => s.time === '10:00 AM');
  check('10:00 AM now shows as unavailable', tenAm?.available === false, JSON.stringify(tenAm));

  const four = await call('/bookings', {
    token: userToken,
    method: 'POST',
    body: {
      type: 'grooming',
      providerId: String(provider._id),
      petId: String(pet._id),
      items: [{ refId: pubPkgs[0].id }],
      schedule: { startDate: ymd, time: '04:00 PM' },
      visitType: 'salon',
      paymentMethod: 'pay_later',
    },
  });
  check('capacity-3 slot still accepts a booking', four.status === 201, `status ${four.status} ${four.message || ''}`);

  /* 5. vendor sees it */
  console.log('\n5. Vendor sees the appointments');
  const day = await call(`/vendor/grooming/bookings?date=${ymd}`, { token: vendorToken });
  check('day sheet lists both bookings', day.data?.length === 2, `${day.data?.length} rows`);
  const home = (day.data || []).find((b) => b.visitType === 'home');
  check('home visit is flagged as such', Boolean(home));
  check('vendor sees the pet name', Boolean(home?.petSnapshot?.name), home?.petSnapshot?.name);

  const summary = await call('/vendor/grooming/summary', { token: vendorToken });
  check('summary counts today bookings', summary.data?.todaysBookings === 2, String(summary.data?.todaysBookings));
  check('summary counts the package', summary.data?.packageCount === 1, String(summary.data?.packageCount));
  check('summary reports daily capacity', summary.data?.dailyCapacity === 4, String(summary.data?.dailyCapacity));

  /* 6. reschedule guard */
  console.log('\n6. Reschedule only into real slots');
  const bad = await call(`/bookings/${booking.data.booking._id}/reschedule`, {
    token: userToken,
    method: 'POST',
    body: { date: ymd, time: '11:30 PM' },
  });
  check('made-up time rejected', bad.status >= 400, `status ${bad.status}, "${bad.message}"`);

  const good = await call(`/bookings/${booking.data.booking._id}/reschedule`, {
    token: userToken,
    method: 'POST',
    body: { date: ymd, time: '04:00 PM' },
  });
  check('real slot accepted', good.status === 200, `status ${good.status} ${good.message || ''}`);

  /* cleanup — the fixture salon is approved and active during the run, so it
     has to be taken off the public listing again before we exit. */
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
