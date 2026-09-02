/**
 * End-to-end events check: an organiser publishes a ticketed event, customers
 * buy tickets against a real capacity, and the organiser sees the guest list,
 * checks people in and is credited — with the sold counter always matching
 * the tickets that actually exist.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Event } from '../../src/modules/provider/event.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5981/api';
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

const TAG = 'E2E-EVENT';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5981, r));

  /* fixtures */
  const organiser = await User.findOneAndUpdate(
    { email: 'e2e.events.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Organiser`, phone: '9000000601', role: 'vendor', vendorType: 'events' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: organiser._id },
    {
      $set: {
        businessName: `${TAG} Events`, vendorType: 'events',
        approvalStatus: 'approved', commissionRate: 0.15,
      },
      $setOnInsert: { registrationNo: 'TCV-E2EEVT' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.events.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000602', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const oldEvents = await Event.find({ title: { $regex: `^${TAG}` } }).distinct('_id');
  await Booking.deleteMany({ eventId: { $in: oldEvents } });
  await Event.deleteMany({ title: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: organiser._id });

  const organiserToken = tok(organiser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. the organiser publishes an event */
  console.log('\n1. Organiser publishes a ticketed event');
  const created = await call('/vendor/events', {
    token: organiserToken, method: 'POST',
    body: {
      title: `${TAG} Puppy Social`,
      category: 'Social Meetup',
      capacity: 4,
      price: 500,
      location: 'Bandra',
      time: '4:00 PM - 7:00 PM',
      status: 'Published',
    },
  });
  check('event created', created.status === 201 || created.status === 200,
    `status ${created.status} ${created.message || ''}`);

  const event = await Event.findOne({ title: `${TAG} Puppy Social` });
  check('event is owned by the organiser', String(event?.vendorId) === String(organiser._id),
    `vendorId ${event?.vendorId}`);
  check('it starts with no tickets sold', (event?.sold || 0) === 0, `sold ${event?.sold}`);

  /* 2. the customer sees it */
  console.log('\n2. Customer sees it listed');
  const listed = await call('/events');
  check('event is publicly listed',
    (listed.data || []).some((e) => e.title === `${TAG} Puppy Social`),
    `${listed.data?.length} events`);

  /* 3. buying tickets */
  console.log('\n3. Buying tickets');
  const booking = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'event', eventId: String(event._id), ticketQty: 2,
      paymentMethod: 'pay_later', meta: { withPlatformFee: true },
    },
  });
  check('tickets booked', booking.status === 201, `status ${booking.status} ${booking.message || ''}`);
  // 2 x 500 + the ₹49 platform fee the Review Booking screen displays
  check('the platform fee the screen shows is really charged',
    booking.data?.booking?.amounts?.total === 104900,
    `${booking.data?.booking?.amounts?.total} paise, expected 104900`);
  check('the ticket count is recorded', booking.data?.booking?.meta?.ticketQty === 2,
    String(booking.data?.booking?.meta?.ticketQty));

  const afterSale = await Event.findById(event._id);
  check('the sold counter moves', afterSale.sold === 2, `sold ${afterSale.sold} of ${afterSale.capacity}`);

  /* 4. capacity is real */
  console.log('\n4. Capacity is enforced');
  const overbook = await call('/bookings', {
    token: userToken, method: 'POST',
    body: { type: 'event', eventId: String(event._id), ticketQty: 3, paymentMethod: 'pay_later' },
  });
  check('a sale beyond capacity is refused', overbook.status >= 400,
    `status ${overbook.status}, "${overbook.message}"`);

  const stillTwo = await Event.findById(event._id);
  check('a refused sale leaks no capacity', stillTwo.sold === 2, `sold ${stillTwo.sold}`);

  const lastTwo = await call('/bookings', {
    token: userToken, method: 'POST',
    body: { type: 'event', eventId: String(event._id), ticketQty: 2, paymentMethod: 'pay_later' },
  });
  check('the remaining tickets can be sold', lastTwo.status === 201,
    `status ${lastTwo.status} ${lastTwo.message || ''}`);
  const soldOut = await Event.findById(event._id);
  check('the event is now sold out', soldOut.sold === soldOut.capacity,
    `${soldOut.sold}/${soldOut.capacity}`);

  /* 5. the organiser cannot shrink below what is sold */
  console.log('\n5. Capacity cannot drop below tickets sold');
  const shrink = await call(`/vendor/events/${event._id}`, {
    token: organiserToken, method: 'PATCH', body: { capacity: 1 },
  });
  check('shrinking below sold is refused', shrink.status >= 400,
    `status ${shrink.status}, "${shrink.message}"`);
  const grow = await call(`/vendor/events/${event._id}`, {
    token: organiserToken, method: 'PATCH', body: { capacity: 6 },
  });
  check('raising capacity is allowed', grow.status === 200, `status ${grow.status}`);

  /* 6. the guest list */
  console.log('\n6. Organiser sees the guest list');
  const guests = await call('/vendor/event-bookings', { token: organiserToken });
  const row = (guests.data || []).find((b) => b._id === String(booking.data.booking._id));
  check('the booking reaches the organiser', Boolean(row), `${guests.data?.length} bookings`);
  check('the organiser sees how many tickets', row?.tickets === 2, `tickets ${row?.tickets}`);
  check('the organiser sees the customer', Boolean(row?.customer), row?.customer);

  /* 7. check-in */
  console.log('\n7. Check-in at the door');
  const checkedIn = await call(`/vendor/event-bookings/${booking.data.booking._id}/checkin`, {
    token: organiserToken, method: 'POST',
  });
  check('a valid ticket checks in', checkedIn.status === 200 || checkedIn.status === 201,
    `status ${checkedIn.status} ${checkedIn.message || ''}`);

  /* 8. cancelling returns the tickets */
  console.log('\n8. Cancelling returns the tickets to the pool');
  const cancelled = await call(`/bookings/${lastTwo.data.booking._id}/cancel`, {
    token: userToken, method: 'POST',
  });
  check('cancel accepted', cancelled.status === 200, `status ${cancelled.status}`);
  const afterCancel = await Event.findById(event._id);
  check('the sold counter comes back down', afterCancel.sold === 2,
    `sold ${afterCancel.sold} after returning 2 of 4`);
  check('the counter never goes negative', afterCancel.sold >= 0, `sold ${afterCancel.sold}`);

  const cancelledCheckIn = await call(`/vendor/event-bookings/${lastTwo.data.booking._id}/checkin`, {
    token: organiserToken, method: 'POST',
  });
  check('a cancelled ticket cannot be checked in', cancelledCheckIn.status >= 400,
    `status ${cancelledCheckIn.status}, "${cancelledCheckIn.message}"`);

  /* 9. the sold counter always matches reality */
  console.log('\n9. The counter matches the tickets that exist');
  const live = await Booking.find({
    type: 'event', eventId: event._id, status: { $nin: ['cancelled', 'refunded', 'pending_payment'] },
  });
  const realTickets = live.reduce((s, b) => s + (b.meta?.ticketQty || 1), 0);
  const finalEvent = await Event.findById(event._id);
  check('sold equals the tickets actually held', finalEvent.sold === realTickets,
    `sold ${finalEvent.sold}, real tickets ${realTickets}`);

  /* 10. isolation */
  console.log('\n10. Another organiser sees none of it');
  const { listEventBookings } = await import('../../src/modules/vendor/events.vendor.service.js');
  const stranger = await listEventBookings(new mongoose.Types.ObjectId());
  check('an unrelated organiser sees no bookings', stranger.length === 0, `${stranger.length} visible`);

  /* cleanup */
  await Booking.deleteMany({ eventId: event._id });
  await Event.deleteMany({ title: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: organiser._id });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
