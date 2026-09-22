/**
 * Migration for the refund/reconciliation work.
 *
 * Run once per environment BEFORE deploying the new build:
 *   node scripts/migrate-refund-reconciliation.mjs
 *
 * It is idempotent — running it twice is safe and the second run reports
 * everything as already done.
 *
 * What it does and why:
 *
 * 1. Drops the old unique index on VendorLedgerEntry (vendorId, refType,
 *    refId). Refund clawbacks post a second row against the same reference, so
 *    that index would reject every reversal. The replacement is partial-filtered
 *    to `kind: 'earning'`, which keeps re-fulfilment idempotent while letting a
 *    reversal coexist with the earning it reverses. Mongoose creates the new
 *    index on boot but never drops the old one, so this has to be explicit.
 *
 * 2. Backfills `kind: 'earning'` on existing ledger rows. The new partial index
 *    only covers documents that HAVE the field, so rows written before this
 *    change would sit outside it and lose their duplicate protection.
 *
 * 3. Backfills `refundStatus`/`refundedAmount` on Bookings and Orders from the
 *    payments they point at, so historical rows report the same way new ones do
 *    rather than all claiming `none`.
 *
 * 4. Removes the seeded fake Admin action items. Six invented rows — fake
 *    vendors, fake refund requests, fake customer names — were written into the
 *    database on first read of the action centre. They are identified by
 *    `seedKey` and deleted.
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const log = (...args) => console.log('[migrate]', ...args);

async function main() {
  await mongoose.connect(env.mongoUri);
  log('connected to', mongoose.connection.name);

  const db = mongoose.connection.db;

  /* 1 ─ drop the superseded ledger indexes ─────────────────────────── */
  /*
   * TWO stale unique indexes exist in deployed databases, not one:
   *
   *   vendorId_1_refType_1_refId_1  — blocks refund reversals, which post a
   *                                   second row against the same reference.
   *   refType_1_refId_1             — the ORIGINAL index, superseded when
   *                                   multi-vendor orders were fixed in code
   *                                   but never actually dropped. While it
   *                                   survives, a basket split across two
   *                                   sellers still silently drops the second
   *                                   seller's earnings, exactly as before the
   *                                   "fix". Dropping it is a live bug fix in
   *                                   its own right.
   *
   * Both are replaced by one partial-filtered index scoped to `kind: 'earning'`,
   * which Mongoose builds on boot.
   */
  const ledger = db.collection('vendorledgerentries');
  const indexes = await ledger.indexes();
  const staleKeys = [
    JSON.stringify({ vendorId: 1, refType: 1, refId: 1 }),
    JSON.stringify({ refType: 1, refId: 1 }),
  ];
  const stale = indexes.filter(
    (i) => i.unique && !i.partialFilterExpression && staleKeys.includes(JSON.stringify(i.key))
  );
  if (stale.length) {
    for (const idx of stale) {
      await ledger.dropIndex(idx.name);
      log(`dropped stale unique index ${idx.name} ${JSON.stringify(idx.key)}`);
    }
  } else {
    log('ledger: no stale unique indexes to drop');
  }

  /* 2 ─ backfill ledger kind ───────────────────────────────────────── */
  const kindRes = await ledger.updateMany({ kind: { $exists: false } }, { $set: { kind: 'earning' } });
  log(`ledger: tagged ${kindRes.modifiedCount} existing rows as kind=earning`);

  /* 3 ─ backfill refund columns on bookings and orders ─────────────── */
  const payments = db.collection('payments');
  for (const name of ['bookings', 'orders']) {
    const coll = db.collection(name);
    const cursor = coll.find({ refundStatus: { $exists: false }, paymentId: { $ne: null } });

    let touched = 0;
    for await (const doc of cursor) {
      const payment = await payments.findOne({ _id: doc.paymentId });
      const refunded = payment?.refundedAmount || 0;
      const total = doc.amounts?.total || 0;
      let status = 'none';
      if (refunded > 0) status = refunded >= total ? 'full' : 'partial';

      await coll.updateOne(
        { _id: doc._id },
        { $set: { refundStatus: status, refundedAmount: refunded } }
      );
      touched += 1;
    }
    // Anything without a payment simply has nothing refunded.
    const rest = await coll.updateMany(
      { refundStatus: { $exists: false } },
      { $set: { refundStatus: 'none', refundedAmount: 0 } }
    );
    log(`${name}: backfilled ${touched} from payments, ${rest.modifiedCount} with no payment`);
  }

  /* 4 ─ delete the seeded fake action items ────────────────────────── */
  const actionItems = db.collection('adminactionitems');
  const seeded = await actionItems.deleteMany({ seedKey: { $exists: true, $ne: null } });
  log(`action items: removed ${seeded.deletedCount} seeded demo rows`);

  /* Report what is left so the operator can eyeball it. */
  const remaining = await actionItems.countDocuments();
  log(`action items: ${remaining} rows remain (all derived from real data)`);

  await mongoose.disconnect();
  log('done');
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
