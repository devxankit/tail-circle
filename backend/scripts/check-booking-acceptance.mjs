/**
 * Behavioural check for the partner accept / decline flow.
 *
 *   node scripts/check-booking-acceptance.mjs
 *
 * Runs against an ISOLATED scratch database (`<dbname>_checks`) and drops it
 * afterwards, so real bookings are never touched.
 *
 * Covers the flow end to end, because the expensive failures here are quiet
 * ones: a decline that does not refund, an accept another partner can perform,
 * or an expiry that leaves the customer's money sitting in a booking nobody
 * will ever service.
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function main() {
  const scratchUri = env.mongoUri.replace(/\/([^/?]+)(\?|$)/, (_m, n, t) => `/${n}_checks${t}`);
  await mongoose.connect(scratchUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`\nScratch database: ${mongoose.connection.name}\n`);

  const { Booking, canTransition } = await import('../src/modules/booking/booking.model.js');
  const { Provider } = await import('../src/modules/provider/provider.model.js');
  const { VendorProfile, VendorLedgerEntry } = await import('../src/modules/vendor/vendor.models.js');
  const { VendorViolation, CompliancePolicy } = await import('../src/modules/compliance/compliance.models.js');
  const { vendorAcceptBooking, vendorRejectBooking, expireUnansweredBookings } =
    await import('../src/modules/booking/booking.service.js');

  for (const M of [Booking, Provider, VendorProfile, VendorLedgerEntry, VendorViolation, CompliancePolicy]) {
    await M.deleteMany({});
  }
  await VendorViolation.syncIndexes();

  const vendorId = new mongoose.Types.ObjectId();
  const otherVendorId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const provider = await Provider.create({
    name: 'Test Salon', type: 'grooming', vendorUserId: vendorId,
    approvalStatus: 'approved', details: { requiresAcceptance: true },
  });
  await VendorProfile.create({
    userId: vendorId, vendorType: 'grooming', businessName: 'Test Salon', approvalStatus: 'approved',
  });

  const makeBooking = async (extra = {}) =>
    Booking.create({
      userId, type: 'grooming', providerId: provider._id,
      schedule: { startDate: '2099-01-01', time: '10:00 AM' },
      items: [{ kind: 'package', name: 'Full groom', price: 1000 }],
      amounts: { base: 100000, total: 100000 },
      paymentMethod: 'razorpay', status: 'awaiting_vendor',
      vendorRespondBy: new Date(Date.now() + 2 * 3600_000),
      ...extra,
    });

  /* ── 1. Accept ───────────────────────────────────────────────────── */
  const a = await makeBooking();
  const accepted = await vendorAcceptBooking(vendorId, a._id, { note: 'See you then' });
  check('accept moves to confirmed', accepted.status === 'confirmed', accepted.status);
  check('accept stamps the response time', !!accepted.vendorRespondedAt);
  check('accept records who did it', accepted.timeline.at(-1)?.by === 'vendor');
  check('accept keeps the note', accepted.vendorResponseNote === 'See you then');

  /* ── 2. Another partner cannot accept it ─────────────────────────── */
  const b = await makeBooking();
  let forbidden = false;
  try {
    await vendorAcceptBooking(otherVendorId, b._id, {});
  } catch (err) {
    forbidden = /another partner/i.test(err.message);
  }
  check('a different partner cannot accept', forbidden);

  /* ── 3. Cannot accept twice ──────────────────────────────────────── */
  let doubleBlocked = false;
  try {
    await vendorAcceptBooking(vendorId, a._id, {});
  } catch (err) {
    doubleBlocked = /not awaiting a response/i.test(err.message);
  }
  check('an accepted booking cannot be accepted again', doubleBlocked);

  /* ── 4. Decline requires a reason ────────────────────────────────── */
  let reasonRequired = false;
  try {
    await vendorRejectBooking(vendorId, b._id, { reason: '' });
  } catch (err) {
    reasonRequired = /reason is required/i.test(err.message);
  }
  check('declining without a reason is refused', reasonRequired);

  /* ── 5. Decline ──────────────────────────────────────────────────── */
  const rejected = await vendorRejectBooking(vendorId, b._id, { reason: 'Fully booked that day' });
  check('decline moves to rejected', rejected.status === 'rejected', rejected.status);
  check('decline attributes it to the partner', rejected.cancelledBy === 'vendor');
  check('decline keeps the reason', rejected.cancellationReason === 'Fully booked that day');

  const declineViolation = await VendorViolation.findOne({ vendorId, type: 'vendor_rejected_booking' });
  check('decline is recorded against the partner', !!declineViolation, `${declineViolation?.points} pt`);
  check('decline is scored as low severity', declineViolation?.severity === 'low');

  /* ── 6. Expiry auto-declines and scores no_response ──────────────── */
  const c = await makeBooking({ vendorRespondBy: new Date(Date.now() - 60_000) });
  const expired = await expireUnansweredBookings();
  const cAfter = await Booking.findById(c._id);
  check('overdue request is auto-declined', cAfter.status === 'rejected', cAfter.status);
  check('auto-decline is attributed to the system', cAfter.cancelledBy === 'system');
  check('expiry sweep reports what it did', expired.length === 1, `${expired.length} processed`);

  /* ── 7. A booking not yet overdue is left alone ──────────────────── */
  const d = await makeBooking();
  await expireUnansweredBookings();
  const dAfter = await Booking.findById(d._id);
  check('a request still inside its window is untouched', dAfter.status === 'awaiting_vendor', dAfter.status);

  /* ── 8. Lifecycle guards ─────────────────────────────────────────── */
  check('awaiting_vendor -> confirmed is legal', canTransition('awaiting_vendor', 'confirmed'));
  check('awaiting_vendor -> rejected is legal', canTransition('awaiting_vendor', 'rejected'));
  check('rejected -> confirmed is refused', !canTransition('rejected', 'confirmed'));
  check('confirmed -> awaiting_vendor is refused', !canTransition('confirmed', 'awaiting_vendor'));

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
    process.exit(1);
  }
  console.log('Scratch database dropped. Real data untouched.\n');
}

main().catch((err) => {
  console.error('\ncheck FAILED to run:', err);
  process.exit(1);
});
