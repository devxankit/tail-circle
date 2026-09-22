/**
 * Behavioural check for the refund / reconciliation work.
 *
 *   node scripts/check-refund-reconciliation.mjs
 *
 * Runs against an ISOLATED scratch database on the same cluster
 * (`<dbname>_checks`), creates its own fixtures and drops them at the end, so
 * it never reads or writes real platform data.
 *
 * It exercises the arithmetic and the invariants that the money fixes depend
 * on — the parts where being subtly wrong is expensive and silent:
 *
 *   1. a full refund reverses the vendor's earning exactly
 *   2. a partial refund reverses it proportionally, commission included
 *   3. repeated partial refunds never over-reverse
 *   4. a vendor's payable nets earnings against clawbacks
 *   5. a payout cannot be taken while refunds exceed earnings
 *   6. the reservation guard refuses to over-refund a payment
 *   7. lifecycle transitions accept legal moves and refuse illegal ones
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function main() {
  const base = env.mongoUri;
  // Same cluster, separate database — real collections are never touched.
  const scratchUri = base.replace(/\/([^/?]+)(\?|$)/, (_m, name, tail) => `/${name}_checks${tail}`);
  await mongoose.connect(scratchUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`\nScratch database: ${mongoose.connection.name}\n`);

  const { VendorLedgerEntry } = await import('../src/modules/vendor/vendor.models.js');
  const { reverseLedgerForRefund, requestPayout } = await import('../src/modules/vendor/vendor.service.js');
  const { Payment } = await import('../src/modules/payment/payment.model.js');
  const { canTransition } = await import('../src/modules/booking/booking.model.js');

  await VendorLedgerEntry.syncIndexes();
  await VendorLedgerEntry.deleteMany({});
  await Payment.deleteMany({});

  const vendorId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  /* ── 1. Full refund reverses the earning exactly ─────────────────── */
  const refA = new mongoose.Types.ObjectId();
  await VendorLedgerEntry.create({
    vendorId, refType: 'booking', refId: refA, label: 'Booking A',
    gross: 200000, commission: 30000, net: 170000, commissionRate: 0.15, kind: 'earning',
  });
  await reverseLedgerForRefund({
    refType: 'booking', refId: refA, refundId: new mongoose.Types.ObjectId(),
    refundedPaise: 200000, paymentAmountPaise: 200000, label: 'full refund',
  });
  let rows = await VendorLedgerEntry.find({ refId: refA });
  let net = rows.reduce((s, e) => s + e.net, 0);
  let comm = rows.reduce((s, e) => s + e.commission, 0);
  check('full refund zeroes vendor net', net === 0, `net=${net}`);
  check('full refund zeroes platform commission', comm === 0, `commission=${comm}`);

  /* ── 2. Partial refund reverses proportionally ───────────────────── */
  const refB = new mongoose.Types.ObjectId();
  await VendorLedgerEntry.create({
    vendorId, refType: 'booking', refId: refB, label: 'Booking B',
    gross: 200000, commission: 30000, net: 170000, commissionRate: 0.15, kind: 'earning',
  });
  await reverseLedgerForRefund({
    refType: 'booking', refId: refB, refundId: new mongoose.Types.ObjectId(),
    refundedPaise: 50000, paymentAmountPaise: 200000, label: '25% refund',
  });
  rows = await VendorLedgerEntry.find({ refId: refB });
  const rev = rows.find((r) => r.kind === 'reversal');
  check('partial refund reverses 25% of gross', rev?.gross === -50000, `gross=${rev?.gross}`);
  check('partial refund reverses 25% of commission', rev?.commission === -7500, `commission=${rev?.commission}`);
  check(
    'gross = commission + net holds on the reversal',
    rev && rev.gross === rev.commission + rev.net,
    `${rev?.gross} vs ${rev?.commission} + ${rev?.net}`
  );

  /* ── 3. Repeated partials never over-reverse ─────────────────────── */
  for (let i = 0; i < 4; i += 1) {
    await reverseLedgerForRefund({
      refType: 'booking', refId: refB, refundId: new mongoose.Types.ObjectId(),
      refundedPaise: 50000, paymentAmountPaise: 200000, label: `extra ${i}`,
    });
  }
  rows = await VendorLedgerEntry.find({ refId: refB });
  const totalGross = rows.reduce((s, e) => s + e.gross, 0);
  check('repeated partials cannot reverse past zero', totalGross === 0, `residual gross=${totalGross}`);

  /* ── 4. Payable nets earnings against clawbacks ──────────────────── */
  const refC = new mongoose.Types.ObjectId();
  await VendorLedgerEntry.create({
    vendorId, refType: 'booking', refId: refC, label: 'Booking C',
    gross: 100000, commission: 15000, net: 85000, commissionRate: 0.15, kind: 'earning',
  });
  const payable = (await VendorLedgerEntry.find({ vendorId, status: 'unsettled' }))
    .reduce((s, e) => s + e.net, 0);
  check('payable nets refunds against earnings', payable === 85000, `payable=${payable}`);

  /* ── 5. No payout while refunds exceed earnings ──────────────────── */
  const refD = new mongoose.Types.ObjectId();
  await VendorLedgerEntry.create({
    vendorId, refType: 'booking', refId: refD, label: 'Booking D',
    gross: -300000, commission: -45000, net: -255000, commissionRate: 0.15,
    kind: 'reversal', refundId: new mongoose.Types.ObjectId(),
  });
  let blocked = false;
  let blockMsg = '';
  try {
    await requestPayout(vendorId);
  } catch (err) {
    blocked = true;
    blockMsg = err.message;
  }
  check('negative balance blocks payout', blocked, blockMsg.slice(0, 60));

  /* ── 6. Reservation guard refuses over-refund ────────────────────── */
  const payment = await Payment.create({
    userId, purpose: 'booking', refId: new mongoose.Types.ObjectId(),
    amount: 100000, razorpayOrderId: `test_${Date.now()}`,
    razorpayPaymentId: 'pay_test', status: 'paid', refundedAmount: 0,
  });
  const reserveOnce = () =>
    Payment.findOneAndUpdate(
      { _id: payment._id, $expr: { $lte: [{ $add: ['$refundedAmount', 60000] }, '$amount'] } },
      { $inc: { refundedAmount: 60000 } },
      { new: true }
    );
  const [first, second] = [await reserveOnce(), await reserveOnce()];
  check('first reservation succeeds', !!first, `refunded=${first?.refundedAmount}`);
  check('second reservation refused (would exceed payment)', second === null);

  /* ── 7. Lifecycle transitions ────────────────────────────────────── */
  check('confirmed -> completed is legal', canTransition('confirmed', 'completed'));
  check('awaiting_vendor -> rejected is legal', canTransition('awaiting_vendor', 'rejected'));
  check('completed -> confirmed is refused', !canTransition('completed', 'confirmed'));
  check('refunded is terminal', !canTransition('refunded', 'confirmed'));

  /* ── clean up ────────────────────────────────────────────────────── */
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
