/**
 * Behavioural check for dispute resolution, the payout hold, and the
 * operational queues.
 *
 *   node scripts/check-disputes-ops.mjs
 *
 * Runs against an ISOLATED scratch database (`<dbname>_checks`) and drops it
 * afterwards.
 *
 * The payout hold is the part that matters most: money that leaves for a
 * partner before a dispute is settled is far harder to recover than money
 * withheld, so "a disputed booking does not settle" is asserted directly.
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

  const { Booking } = await import('../src/modules/booking/booking.model.js');
  const { Provider } = await import('../src/modules/provider/provider.model.js');
  const { Product } = await import('../src/modules/shop/product.model.js');
  const { VendorProfile, VendorLedgerEntry, Payout } = await import('../src/modules/vendor/vendor.models.js');
  const { User } = await import('../src/modules/user/user.model.js');
  const { requestPayout } = await import('../src/modules/vendor/vendor.service.js');
  const ops = await import('../src/modules/admin/admin.opsqueues.service.js');
  const disputes = await import('../src/modules/admin/admin.disputes.service.js');

  for (const M of [Booking, Provider, Product, VendorProfile, VendorLedgerEntry, Payout, User]) {
    await M.deleteMany({});
  }

  const vendorUser = await User.create({ name: 'Salon Owner', phone: '9111100001', role: 'vendor', isPhoneVerified: true });
  const customer = await User.create({ name: 'Asha', phone: '9111100002', role: 'user', isPhoneVerified: true });
  const provider = await Provider.create({
    name: 'ClipPaw', type: 'grooming', vendorUserId: vendorUser._id, approvalStatus: 'approved',
  });
  await VendorProfile.create({
    userId: vendorUser._id, vendorType: 'grooming', businessName: 'ClipPaw', approvalStatus: 'approved',
  });

  const mkBooking = async (over = {}) =>
    Booking.create({
      userId: customer._id, type: 'grooming', providerId: provider._id,
      schedule: { startDate: '2099-03-01', time: '10:00 AM' },
      items: [{ kind: 'package', name: 'Full groom', price: 1000 }],
      amounts: { base: 100000, total: 100000 },
      paymentMethod: 'razorpay', status: 'completed', ...over,
    });

  /* ── 1. Payout hold on a disputed booking ────────────────────────── */
  const clean = await mkBooking({ schedule: { startDate: '2099-03-01', time: '10:00 AM' } });
  const disputed = await mkBooking({
    schedule: { startDate: '2099-03-02', time: '02:00 PM' },
    status: 'disputed',
    dispute: { raisedBy: 'customer', reason: 'Pet came back matted', raisedAt: new Date() },
  });

  for (const b of [clean, disputed]) {
    await VendorLedgerEntry.create({
      vendorId: vendorUser._id, refType: 'booking', refId: b._id, vendorType: 'grooming',
      label: `Booking ${b.bookingNo}`, gross: 100000, commission: 15000, net: 85000,
      commissionRate: 0.15, kind: 'earning', status: 'unsettled',
    });
  }

  const payout = await requestPayout(vendorUser._id);
  check('payout excludes the disputed booking', payout.grossAmount === 100000,
        `gross=${payout.grossAmount} (one booking, not two)`);
  check('payout records what was held', payout.heldCount === 1 && payout.heldAmount === 85000,
        `held=${payout.heldCount} amount=${payout.heldAmount}`);

  const disputedEntry = await VendorLedgerEntry.findOne({ refId: disputed._id });
  check('held earning stays unsettled', disputedEntry.status === 'unsettled', disputedEntry.status);
  const cleanEntry = await VendorLedgerEntry.findOne({ refId: clean._id });
  check('undisputed earning is settled', cleanEntry.status === 'settled', cleanEntry.status);

  /* ── 2. Everything held = no payout at all ───────────────────────── */
  let blocked = false; let msg = '';
  try {
    await requestPayout(vendorUser._id);
  } catch (err) { blocked = true; msg = err.message; }
  check('payout refused when only held earnings remain', blocked, msg.slice(0, 60));

  /* ── 3. Dispute listing and triage ───────────────────────────────── */
  const list = await disputes.listDisputes({ status: 'open' });
  check('open disputes are listed', list.rows.length === 1, `${list.rows.length} row(s)`);
  check('dispute row carries the reason', list.rows[0]?.reason === 'Pet came back matted');
  check('dispute row reports days open', typeof list.rows[0]?.daysOpen === 'number');

  const summary = await disputes.disputeSummary();
  check('summary counts open disputes', summary.open === 1, `open=${summary.open}`);
  check('summary reports value at risk', summary.valueAtRisk === 1000, `Rs ${summary.valueAtRisk}`);

  /* ── 4. Resolving a dispute ──────────────────────────────────────── */
  const admin = { id: new mongoose.Types.ObjectId(), name: 'Test Admin' };
  const rejected = await disputes.resolveDispute(
    admin, disputed._id, { outcome: 'reject', note: 'Photos show a clean groom' }, '127.0.0.1'
  );
  check('rejecting a dispute returns the booking to completed',
        rejected.status === 'completed', rejected.status);

  const after = await Booking.findById(disputed._id);
  check('resolution note is stored', /Photos show a clean groom/.test(after.dispute.resolution || ''));
  check('resolution is timestamped', !!after.dispute.resolvedAt);

  /* ── 5. …and the hold releases ───────────────────────────────────── */
  const payout2 = await requestPayout(vendorUser._id);
  check('resolved dispute releases the held earning', payout2.grossAmount === 100000,
        `gross=${payout2.grossAmount}`);
  check('nothing held on the second payout', payout2.heldCount === 0);

  /* ── 6. Duplicate booking detection ──────────────────────────────── */
  const now = new Date();
  for (let i = 0; i < 2; i += 1) {
    await Booking.create({
      userId: customer._id, type: 'grooming', providerId: provider._id,
      petId: null, schedule: { startDate: '2099-04-01', time: '11:00 AM' },
      items: [{ kind: 'package', name: 'Full groom', price: 1000 }],
      amounts: { base: 100000, total: 100000 },
      paymentMethod: 'razorpay', status: 'confirmed', createdAt: now,
    });
  }
  const dupes = await ops.duplicateBookings({ withinMinutes: 30, days: 14 });
  check('duplicate bookings detected', dupes.length === 1, `${dupes.length} group(s)`);
  check('duplicate group reports both bookings', dupes[0]?.count === 2, `count=${dupes[0]?.count}`);
  check('duplicate group totals what was charged', dupes[0]?.totalCharged === 2000,
        `Rs ${dupes[0]?.totalCharged}`);

  /* ── 7. Low stock ────────────────────────────────────────────────── */
  await Product.create({
    name: 'Dog Harness', active: true, category: 'Accessories',
    petType: 'dog', price: 500, mrp: 700,
    packSizes: [
      { size: 'M', price: 500, mrp: 700, stock: 2 },
      { size: 'L', price: 600, mrp: 800, stock: 40 },
    ],
  });
  const low = await ops.lowStockAlerts({ threshold: 5 });
  check('low stock flags only the low pack size', low.length === 1, `${low.length} row(s)`);
  check('low stock reports the size and count', low[0]?.size === 'M' && low[0]?.stock === 2);

  /* ── 8. Orphaned bookings after suspension ───────────────────────── */
  await VendorProfile.updateOne({ userId: vendorUser._id }, { $set: { approvalStatus: 'suspended' } });
  const orphans = await ops.orphanedBookings({});
  check('suspension surfaces bookings still owed to customers', orphans.length >= 2,
        `${orphans.length} booking(s) stranded`);
  check('orphan row names the suspended business', orphans[0]?.businessName === 'ClipPaw');

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
