/**
 * End-to-end vet consultation check: a clinic sets a vet's working hours and
 * per-mode fees, a customer sees exactly those slots, books one, and the clinic
 * sees the appointment — with the slot held, released and re-offered correctly.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Doctor } from '../../src/modules/provider/doctor.model.js';
import { Availability } from '../../src/modules/provider/availability.model.js';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { SlotBooking } from '../../src/modules/booking/slot.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5989/api';
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
/** The next date, at least `min` days out, that falls on `weekday` (0 = Sun). */
const nextWeekday = (weekday, min = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + min);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return ymd(d);
};

const TAG = 'E2E-VET';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5989, r));

  /* fixtures */
  const vendorUser = await User.findOneAndUpdate(
    { email: 'e2e.vet.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Clinic`, phone: '9000000301', role: 'vendor', vendorType: 'clinic' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: vendorUser._id },
    {
      $set: { businessName: `${TAG} Clinic`, vendorType: 'clinic', approvalStatus: 'approved' },
      $setOnInsert: { registrationNo: 'TCV-E2EVET' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const doctor = await Doctor.findOneAndUpdate(
    { clinicVendorId: vendorUser._id, name: `${TAG} Dr. Rao` },
    {
      $set: {
        userId: vendorUser._id,
        clinic: `${TAG} Clinic`,
        active: true,
        'credentials.verification.status': 'approved',
        modes: {
          inClinic: { enabled: true, fee: 500, followUpFee: 250, durationMinutes: 30 },
          video: { enabled: true, fee: 400, durationMinutes: 15 },
          homeVisit: { enabled: false },
          emergency: { enabled: false },
        },
        policies: { cancellationHours: 4, followUpWindowDays: 30 },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Booking.deleteMany({ doctorId: doctor._id });
  await SlotBooking.deleteMany({ doctorId: doctor._id });
  await Availability.deleteOne({ doctorId: doctor._id });

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.vet.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000302', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pet = await Pet.findOneAndUpdate(
    { ownerId: customer._id, name: `${TAG} Milo` },
    { $set: { species: 'dog', breed: 'Beagle', deletedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const vendorToken = tok(vendorUser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. clinic sets the vet's working week */
  console.log('\n1. Clinic sets the working week');
  // Wednesday only: in-clinic 10:00-12:00, video 18:00-19:00.
  const weekly = Array.from({ length: 7 }, (_, day) => ({ day, enabled: false, blocks: [] }));
  weekly[3] = {
    day: 3,
    enabled: true,
    blocks: [
      { start: '10:00', end: '12:00', modes: ['inClinic'], capacity: 1 },
      { start: '18:00', end: '19:00', modes: ['video'], capacity: 1 },
    ],
  };
  const avail = await call('/vendor/vet/availability', {
    token: vendorToken,
    method: 'PUT',
    body: { weekly, slotMinutes: 30, bufferMinutes: 0, leadTimeMinutes: 60, horizonDays: 60, timezone: 'Asia/Kolkata' },
  });
  check('availability saved', avail.status === 200, `status ${avail.status} ${avail.message || ''}`);

  const wed = nextWeekday(3, 2);
  const thu = nextWeekday(4, 2);

  /* 2. the customer sees exactly those slots */
  console.log('\n2. Customer sees the vet\'s real slots');
  const clinicSlots = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=clinic`);
  check('in-clinic slots on the working day', (clinicSlots.data || []).length === 4,
    `${(clinicSlots.data || []).length} slots: ${(clinicSlots.data || []).map((s) => s.time).join(', ')}`);

  const videoSlots = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=video`);
  check('video slots come from the evening block only', (videoSlots.data || []).length === 4,
    `${(videoSlots.data || []).map((s) => s.time).join(', ')}`);

  const offDay = await call(`/doctors/${doctor._id}/slots?date=${thu}&visitType=clinic`);
  check('a non-working day returns nothing, with a reason',
    (offDay.data || []).length === 0 && offDay.meta?.reason === 'not_a_working_day',
    `${(offDay.data || []).length} slots, reason "${offDay.meta?.reason}"`);

  const homeSlots = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=home`);
  check('a mode the vet does not offer is refused with a reason',
    (homeSlots.data || []).length === 0 && homeSlots.meta?.reason === 'mode_not_offered',
    `reason "${homeSlots.meta?.reason}"`);

  /* 3. booking */
  console.log('\n3. Customer books an in-clinic consult');
  const firstSlot = clinicSlots.data[0];
  const booking = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'doctor', doctorId: String(doctor._id), petId: String(pet._id),
      schedule: { startDate: wed, time: firstSlot.time },
      visitType: 'clinic', paymentMethod: 'razorpay',
    },
  });
  check('booking accepted', booking.status === 201, `status ${booking.status} ${booking.message || ''}`);
  // 500 consult + 29 online platform fee
  check('charged total matches the checkout screen',
    booking.data?.booking?.amounts?.total === 52900,
    `${booking.data?.booking?.amounts?.total} paise, expected 52900`);
  check('consult duration recorded from the vet profile',
    booking.data?.booking?.consult?.durationMinutes === 30,
    String(booking.data?.booking?.consult?.durationMinutes));
  check('startAt resolved to a real instant', Boolean(booking.data?.booking?.schedule?.startAt),
    String(booking.data?.booking?.schedule?.startAt));

  /* 4. the slot is held */
  console.log('\n4. The booked slot stops being offered');
  const afterSlots = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=clinic`);
  check('booked slot no longer offered',
    !(afterSlots.data || []).some((s) => s.time === firstSlot.time),
    (afterSlots.data || []).map((s) => s.time).join(', '));

  const dup = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'doctor', doctorId: String(doctor._id), petId: String(pet._id),
      schedule: { startDate: wed, time: firstSlot.time },
      visitType: 'clinic', paymentMethod: 'razorpay',
    },
  });
  check('double-booking refused', dup.status >= 400, `status ${dup.status}, "${dup.message}"`);

  /* 5. video consults must be prepaid */
  console.log('\n5. Video consults cannot be pay-at-clinic');
  const payLaterVideo = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'doctor', doctorId: String(doctor._id), petId: String(pet._id),
      schedule: { startDate: wed, time: videoSlots.data[0].time },
      visitType: 'video', paymentMethod: 'pay_later',
    },
  });
  check('pay-later video refused', payLaterVideo.status >= 400, `status ${payLaterVideo.status}, "${payLaterVideo.message}"`);

  /* 6. blackout */
  console.log('\n6. A blackout clears the day');
  const black = await call('/vendor/vet/blackouts', {
    token: vendorToken, method: 'POST', body: { date: wed, reason: 'Conference' },
  });
  check('blackout added', black.status === 200 || black.status === 201, `status ${black.status}`);
  const blackedOut = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=clinic`);
  check('no slots on a blackout date',
    (blackedOut.data || []).length === 0 && blackedOut.meta?.reason === 'blackout',
    `${(blackedOut.data || []).length} slots, reason "${blackedOut.meta?.reason}"`);
  await call(`/vendor/vet/blackouts/${wed}`, { token: vendorToken, method: 'DELETE' });

  /* 7. the clinic sees it */
  console.log('\n7. Clinic sees the appointment');
  const appts = await call('/vendor/appointments', { token: vendorToken });
  const mine = (appts.data || []).find((a) => a.id === String(booking.data.booking._id));
  check('appointment listed for the clinic', Boolean(mine), `${appts.data?.length} appointments`);
  check('appointment quotes the booking reference the customer sees',
    mine?.bookingNo === booking.data.booking.bookingNo,
    `"${mine?.bookingNo}" vs "${booking.data.booking.bookingNo}"`);
  check('appointment carries the pet, owner and fee',
    Boolean(mine?.petName) && Boolean(mine?.owner) && mine?.fee === 529,
    JSON.stringify({ pet: mine?.petName, owner: mine?.owner, fee: mine?.fee }));

  /* 8. clinic-side cancellation must free the slot */
  console.log('\n8. Cancelling from the clinic frees the slot');
  const cancelled = await call(`/vendor/appointments/${booking.data.booking._id}/status`, {
    token: vendorToken, method: 'PATCH', body: { status: 'Cancelled' },
  });
  check('clinic cancel accepted', cancelled.status === 200, `status ${cancelled.status} ${cancelled.message || ''}`);

  const dbBooking = await Booking.findById(booking.data.booking._id).select('status');
  check('booking really is cancelled', dbBooking?.status === 'cancelled', `status "${dbBooking?.status}"`);

  const reopened = await call(`/doctors/${doctor._id}/slots?date=${wed}&visitType=clinic`);
  check('the freed slot is offered again',
    (reopened.data || []).some((s) => s.time === firstSlot.time),
    (reopened.data || []).map((s) => s.time).join(', ') || 'none');

  const rebook = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'doctor', doctorId: String(doctor._id), petId: String(pet._id),
      schedule: { startDate: wed, time: firstSlot.time },
      visitType: 'clinic', paymentMethod: 'razorpay',
    },
  });
  check('someone else can take the freed slot', rebook.status === 201, `status ${rebook.status}, "${rebook.message}"`);

  /* 9. the quote the checkout shows is the amount charged */
  console.log('\n9. Quote matches what is charged, follow-up rate included');
  const firstQuote = await call(
    `/doctors/${doctor._id}/quote?visitType=clinic&petId=${pet._id}`,
    { token: userToken }
  );
  check('quote returns the standard fee for a new patient',
    firstQuote.data?.fee === 500 && firstQuote.data?.isFollowUp === false && firstQuote.data?.total === 529,
    JSON.stringify(firstQuote.data));

  // Complete a consult so the next one prices as a follow-up.
  await Booking.updateOne(
    { _id: rebook.data.booking._id },
    { $set: { status: 'completed', updatedAt: new Date() } }
  );

  const followUpQuote = await call(
    `/doctors/${doctor._id}/quote?visitType=clinic&petId=${pet._id}`,
    { token: userToken }
  );
  check('quote drops to the follow-up rate after a completed visit',
    followUpQuote.data?.isFollowUp === true && followUpQuote.data?.fee === 250,
    JSON.stringify(followUpQuote.data));

  const followUpBooking = await call('/bookings', {
    token: userToken, method: 'POST',
    body: {
      type: 'doctor', doctorId: String(doctor._id), petId: String(pet._id),
      schedule: { startDate: wed, time: clinicSlots.data[2].time },
      visitType: 'clinic', paymentMethod: 'razorpay',
    },
  });
  check('the follow-up booking is billed exactly what was quoted',
    followUpBooking.data?.booking?.amounts?.total === followUpQuote.data.total * 100,
    `charged ${followUpBooking.data?.booking?.amounts?.total} paise, quoted ${followUpQuote.data.total * 100}`);

  check('the booking records the pet the clinic will see',
    followUpBooking.data?.booking?.petSnapshot?.name === `${TAG} Milo`,
    JSON.stringify(followUpBooking.data?.booking?.petSnapshot?.name));

  const withPet = await call('/vendor/appointments', { token: vendorToken });
  const petRow = (withPet.data || []).find((a) => a.id === String(followUpBooking.data.booking._id));
  check('the clinic sees the pet name and breed',
    petRow?.petName === `${TAG} Milo` && petRow?.breed === 'Beagle',
    JSON.stringify({ pet: petRow?.petName, breed: petRow?.breed }));

  /* cleanup */
  await Booking.deleteMany({ doctorId: doctor._id });
  await SlotBooking.deleteMany({ doctorId: doctor._id });
  await Availability.deleteOne({ doctorId: doctor._id });
  await Doctor.updateOne({ _id: doctor._id }, { $set: { active: false } });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
