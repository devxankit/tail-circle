/**
 * Behavioural check for the Admin Action Required Center.
 *
 *   node scripts/check-action-items.mjs
 *
 * Runs against an ISOLATED scratch database (`<dbname>_checks`) and drops it
 * afterwards.
 *
 * The bug this guards against: approving an item flipped a flag on the item and
 * did nothing to the vendor/ticket/refund behind it, and the sync that runs on
 * every read reset the item straight back to pending. Approving anything
 * appeared to do nothing at all.
 *
 * So the checks are deliberately end-to-end: resolve an item, then assert the
 * REAL entity changed and that the item does not reappear on the next read.
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

  const { AdminActionItem } = await import('../src/modules/admin/admin.models.js');
  const { VendorProfile } = await import('../src/modules/vendor/vendor.models.js');
  const { User } = await import('../src/modules/user/user.model.js');
  const { SupportTicket } = await import('../src/modules/support/supportTicket.model.js');
  const { listActionItems } = await import('../src/modules/admin/admin.service.js');
  const { resolveActionItem } = await import('../src/modules/admin/admin.actions.service.js');

  for (const M of [AdminActionItem, VendorProfile, User, SupportTicket]) await M.deleteMany({});
  await AdminActionItem.syncIndexes();

  const admin = { id: new mongoose.Types.ObjectId(), name: 'Test Admin', email: 'admin@test' };

  /* ── Fixtures: a pending partner and an open ticket ──────────────── */
  const vendorUser = await User.create({
    name: 'Rishabh', phone: '9000000001', role: 'vendor', isPhoneVerified: true,
  });
  const profile = await VendorProfile.create({
    userId: vendorUser._id, vendorType: 'grooming', businessName: 'Rishabh Grooming',
    approvalStatus: 'pending',
    // Complete, verified KYC so approval is not gated — the gate has its own
    // coverage; this check is about whether resolving does anything at all.
    documents: [
      { kind: 'license', name: 'license.pdf', url: 'http://x/license.pdf', status: 'Verified' },
      { kind: 'owner_id', name: 'id.pdf', url: 'http://x/id.pdf', status: 'Verified' },
    ],
    bank: { bankName: 'Test Bank' },
  });

  const ticketUser = await User.create({
    name: 'Customer', phone: '9000000002', role: 'user', isPhoneVerified: true,
  });
  const ticket = await SupportTicket.create({
    userId: ticketUser._id, subject: 'Test ticket', category: 'account',
    message: 'Something is not working right.', status: 'open',
  });

  /* ── 1. The queue is derived from live data ──────────────────────── */
  let items = await listActionItems({ status: 'pending' });
  const vendorItem = items.find((i) => i.sourceKey === `vendor:${profile._id}`);
  const ticketItem = items.find((i) => i.sourceKey === `support:${ticket._id}`);
  check('pending partner raises an item', !!vendorItem, vendorItem?.title);
  check('open ticket raises an item', !!ticketItem, ticketItem?.title);
  check('no invented rows', items.every((i) => i.sourceKey), `${items.length} items, all derived`);

  /* ── 2. Approving actually approves the partner ──────────────────── */
  const res = await resolveActionItem(admin, vendorItem.id, { action: 'approve' }, '127.0.0.1');
  const profileAfter = await VendorProfile.findById(profile._id);
  check('approve changes the REAL partner record', profileAfter.approvalStatus === 'approved', profileAfter.approvalStatus);
  check('approve reports what it did', /approved/i.test(res.effect || ''), res.effect);

  /* ── 3. …and it does not come back on the next read ──────────────── */
  items = await listActionItems({ status: 'pending' });
  check(
    'approved item does not reappear',
    !items.some((i) => i.sourceKey === `vendor:${profile._id}`),
    `${items.length} pending now`
  );

  /* ── 4. Two admins clicking at once ──────────────────────────────── */
  /*
   * The dangerous case is not a second click minutes later — by then the item
   * has been withdrawn because its cause is gone. It is two operators hitting
   * Approve in the same second, before any sync runs. On a failed-refund item
   * that would refund the customer twice, so only one may get through.
   */
  const raceTicket = await SupportTicket.create({
    userId: ticketUser._id, subject: 'Race ticket', category: 'account',
    message: 'Concurrent resolve test.', status: 'open',
  });
  items = await listActionItems({ status: 'pending' });
  const raceItem = items.find((i) => i.sourceKey === `support:${raceTicket._id}`);

  const settled = await Promise.allSettled([
    resolveActionItem(admin, raceItem.id, { action: 'approve' }, '127.0.0.1'),
    resolveActionItem(admin, raceItem.id, { action: 'approve' }, '127.0.0.1'),
  ]);
  const won = settled.filter((r) => r.status === 'fulfilled').length;
  const lost = settled.filter((r) => r.status === 'rejected');
  check('exactly one concurrent resolve succeeds', won === 1, `${won} succeeded`);
  check(
    'the loser is told, not silently repeated',
    lost.length === 1 && /already|another admin/i.test(lost[0].reason?.message || ''),
    lost[0]?.reason?.message
  );

  /* ── 5. Rejecting a ticket closes the real ticket ────────────────── */
  await resolveActionItem(admin, ticketItem.id, { action: 'reject', note: 'Not an issue' }, '127.0.0.1');
  const ticketAfter = await SupportTicket.findById(ticket._id);
  check('reject changes the REAL ticket', ticketAfter.status === 'closed', ticketAfter.status);
  items = await listActionItems({ status: 'pending' });
  check('closed ticket leaves the queue', !items.some((i) => i.sourceKey === `support:${ticket._id}`));

  /* ── 6. A failing operation leaves the item pending ──────────────── */
  const orphan = await VendorProfile.create({
    userId: new mongoose.Types.ObjectId(), vendorType: 'daycare',
    businessName: 'Missing Docs Daycare', approvalStatus: 'pending',
  });
  items = await listActionItems({ status: 'pending' });
  const orphanItem = items.find((i) => i.sourceKey === `vendor:${orphan._id}`);
  check('second pending partner raises an item', !!orphanItem);

  await VendorProfile.deleteOne({ _id: orphan._id }); // vanishes underneath us
  let failedLoudly = false;
  try {
    await resolveActionItem(admin, orphanItem.id, { action: 'approve' }, '127.0.0.1');
  } catch {
    failedLoudly = true;
  }
  check('a failing operation throws instead of reporting success', failedLoudly);
  const stillPending = await AdminActionItem.findById(orphanItem.id);
  check(
    'a failed resolve leaves the item pending',
    stillPending === null || stillPending.status === 'pending',
    stillPending ? stillPending.status : 'withdrawn (cause gone)'
  );

  /* ── 7. A recurrence after resolution raises a fresh item ────────── */
  profileAfter.approvalStatus = 'pending';
  await profileAfter.save();
  items = await listActionItems({ status: 'pending' });
  check(
    'a partner returning to pending raises a new item',
    items.some((i) => i.sourceKey === `vendor:${profile._id}`)
  );

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
