/**
 * Behavioural check for the partner compliance engine.
 *
 *   node scripts/check-compliance.mjs
 *
 * Runs against an ISOLATED scratch database (`<dbname>_checks`) and drops it
 * afterwards, so real partner records are never read or written.
 *
 * Covers the things that are expensive to get wrong: double-counting a partner
 * into a suspension they did not earn, a threshold that does not trip, a
 * forgiveness that does not actually clear the flag, and a policy change that
 * silently reprices a partner's history.
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

  const { VendorViolation, CompliancePolicy } = await import('../src/modules/compliance/compliance.models.js');
  const { AdminActionItem } = await import('../src/modules/admin/admin.models.js');
  const {
    recordViolation,
    evaluateStanding,
    forgiveViolation,
    updatePolicy,
    getPolicy,
    complianceLeaderboard,
    vendorStanding,
  } = await import('../src/modules/compliance/compliance.service.js');

  await VendorViolation.syncIndexes();
  await VendorViolation.deleteMany({});
  await CompliancePolicy.deleteMany({});
  await AdminActionItem.deleteMany({});

  const vendorId = new mongoose.Types.ObjectId();
  const bookingA = new mongoose.Types.ObjectId();
  const bookingB = new mongoose.Types.ObjectId();

  const policy = await getPolicy();
  check('policy seeds from catalogue', policy.rules.length > 0, `${policy.rules.length} rules`);
  check('default threshold is 3', policy.threshold === 3, `threshold=${policy.threshold}`);
  check('defaults to flag, not auto-suspend', policy.actionAtThreshold === 'flag');

  /* ── 1. Recording and scoring ────────────────────────────────────── */
  const first = await recordViolation({
    vendorId, vendorType: 'grooming', type: 'vendor_rejected_booking',
    refType: 'booking', refId: bookingA, refLabel: 'Booking A',
    reason: 'Declined a booking request',
  });
  check('violation recorded', !!first, `points=${first?.violation?.points}`);
  check('scored at catalogue default (1pt)', first?.violation?.points === 1);
  check('not breached at 1/3', first?.standing?.breached === false, `points=${first?.standing?.points}`);

  /* ── 2. Idempotency: the sweeps re-run constantly ────────────────── */
  const dup = await recordViolation({
    vendorId, vendorType: 'grooming', type: 'vendor_rejected_booking',
    refType: 'booking', refId: bookingA, refLabel: 'Booking A',
    reason: 'Declined a booking request',
  });
  const afterDup = await evaluateStanding(vendorId, 'grooming');
  check('duplicate for same reference is ignored', dup === null);
  check('duplicate did not inflate points', afterDup.points === 1, `points=${afterDup.points}`);

  /* ── 3. Per-business-line isolation ──────────────────────────────── */
  await recordViolation({
    vendorId, vendorType: 'daycare', type: 'service_not_delivered',
    refType: 'booking', refId: bookingB, refLabel: 'Booking B',
    reason: 'Service not delivered',
  });
  const grooming = await evaluateStanding(vendorId, 'grooming');
  const daycare = await evaluateStanding(vendorId, 'daycare');
  check('daycare violation did not touch grooming', grooming.points === 1, `grooming=${grooming.points}`);
  check('daycare scored independently (3pt)', daycare.points === 3, `daycare=${daycare.points}`);
  check('daycare breached at 3/3', daycare.breached === true);
  check('grooming still clear', grooming.breached === false);

  /* ── 4. Breach raises an Urgent admin item, does NOT suspend ─────── */
  const flag = await AdminActionItem.findOne({ sourceKey: `compliance_breach:${vendorId}:daycare` });
  check('breach raises an admin action item', !!flag, flag?.priority || '');
  check('action item is Urgent', flag?.priority === 'Urgent');
  check('flag policy did not auto-suspend', flag?.type === 'Partner Under Review');

  /* ── 5. Forgiveness clears the breach and withdraws the flag ─────── */
  const daycareViolation = await VendorViolation.findOne({ vendorId, vendorType: 'daycare' });
  const forgiven = await forgiveViolation({ name: 'Test Admin' }, daycareViolation._id, 'Customer was at fault');
  check('forgiving drops the points', forgiven.standing.points === 0, `points=${forgiven.standing.points}`);
  check('forgiving clears the breach', forgiven.standing.breached === false);
  const flagAfter = await AdminActionItem.findOne({
    sourceKey: `compliance_breach:${vendorId}:daycare`, status: 'pending',
  });
  check('breach flag withdrawn on forgiveness', !flagAfter);

  /* ── 6. Policy changes do not reprice history ────────────────────── */
  await updatePolicy({ name: 'Test Admin' }, {
    threshold: 4,
    rules: [{ type: 'vendor_rejected_booking', points: 10 }],
  });
  const afterRepricing = await evaluateStanding(vendorId, 'grooming');
  check(
    'existing violation keeps the points it was scored at',
    afterRepricing.points === 1,
    `still ${afterRepricing.points}, not 10`
  );
  check('new threshold applies immediately', afterRepricing.threshold === 4);

  const newOne = await recordViolation({
    vendorId, vendorType: 'grooming', type: 'vendor_rejected_booking',
    refType: 'booking', refId: new mongoose.Types.ObjectId(), refLabel: 'Booking C',
    reason: 'Declined again',
  });
  check('new violation uses the NEW weight', newOne?.violation?.points === 10, `points=${newOne?.violation?.points}`);

  /* ── 7. Disabling a rule stops it counting ───────────────────────── */
  await updatePolicy({ name: 'Test Admin' }, {
    rules: [{ type: 'late_completion', enabled: false }],
  });
  const disabled = await recordViolation({
    vendorId, vendorType: 'grooming', type: 'late_completion',
    refType: 'booking', refId: new mongoose.Types.ObjectId(),
    reason: 'Ran late',
  });
  check('disabled rule records nothing', disabled === null);

  /* ── 8. Rolling window expires old violations ────────────────────── */
  await VendorViolation.updateMany(
    { vendorId, vendorType: 'grooming' },
    { $set: { occurredAt: new Date(Date.now() - 200 * 86400000) } }
  );
  const aged = await evaluateStanding(vendorId, 'grooming');
  check('violations outside the window stop counting', aged.points === 0, `points=${aged.points}`);

  /* ── 9. Partner-facing view ──────────────────────────────────────── */
  await recordViolation({
    vendorId, vendorType: 'grooming', type: 'vendor_cancelled_late',
    refType: 'booking', refId: new mongoose.Types.ObjectId(), refLabel: 'Booking D',
    reason: 'Cancelled last minute',
  });
  const standing = await vendorStanding(vendorId, 'grooming');
  check('partner sees a warning message', !!standing.warning, (standing.warning || '').slice(0, 45));
  check('partner sees points and threshold', standing.threshold === 4 && standing.points > 0);

  /* ── 10. Leaderboard surfaces at-risk lines ──────────────────────── */
  const board = await complianceLeaderboard({ limit: 10 });
  check('leaderboard returns the offending line', board.rows.length > 0, `${board.rows.length} line(s)`);
  check('leaderboard is sorted worst-first', board.rows.every((r, i, a) => i === 0 || a[i - 1].points >= r.points));

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
