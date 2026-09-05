/**
 * Multi-line vendor migration.
 *
 * Brings existing single-line vendors onto the multi-business schema:
 *   1. Backfills `User.vendorTypes` from the legacy single `vendorType`.
 *   2. Replaces VendorProfile's unique index on `userId` with a compound
 *      unique on (userId, vendorType), which is what lets one account own a
 *      grooming profile *and* a daycare profile.
 *
 * Safe to run repeatedly — every step is idempotent. Run with `--dry` first to
 * see the counts without writing:
 *
 *   node backend/src/scripts/migrateMultiVendor.js --dry
 *   node backend/src/scripts/migrateMultiVendor.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../modules/user/user.model.js';
import { VendorProfile } from '../modules/vendor/vendor.models.js';

const LEGACY_USER_INDEX = 'userId_1';
const TARGET_INDEX = 'userId_1_vendorType_1';

export async function runMultiVendorMigration({ dry = false } = {}) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI missing in .env');
    return { ok: false };
  }

  let localConnection = false;
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
    localConnection = true;
  }

  console.log(`\nMulti-line vendor migration${dry ? ' (DRY RUN — nothing will be written)' : ''}\n`);

  const summary = { usersBackfilled: 0, profilesRepaired: 0, conflicts: [], indexDropped: false, indexCreated: false };

  /* ── 1. User.vendorTypes backfill ──────────────────────── */

  const vendors = await User.find({ role: 'vendor' }).select('_id name email vendorType vendorTypes');
  const needBackfill = vendors.filter(
    (u) => u.vendorType && !(u.vendorTypes || []).includes(u.vendorType)
  );
  console.log(`  users: ${vendors.length} vendor accounts, ${needBackfill.length} need vendorTypes backfilled`);

  if (!dry) {
    for (const u of needBackfill) {
      const types = new Set([...(u.vendorTypes || []).filter(Boolean), u.vendorType]);
      // updateOne rather than save(): these are pre-multi-line rows that may
      // fail validation on unrelated fields added since they were written.
      await User.updateOne({ _id: u._id }, { $set: { vendorTypes: [...types] } });
      summary.usersBackfilled += 1;
    }
  } else {
    summary.usersBackfilled = needBackfill.length;
  }

  /* ── 2. Profiles missing a vendorType ──────────────────── */

  // The compound index needs vendorType on every row. Any profile without one
  // inherits it from its owning User; if neither has it the row is reported
  // rather than guessed at, because picking wrong would hand a vendor the
  // wrong panel.
  const typeless = await VendorProfile.find({ $or: [{ vendorType: null }, { vendorType: { $exists: false } }] })
    .select('_id userId businessName');
  for (const p of typeless) {
    const owner = await User.findById(p.userId).select('vendorType');
    if (owner?.vendorType) {
      console.log(`  profile ${p._id} ("${p.businessName}") → vendorType ${owner.vendorType} (from owner)`);
      if (!dry) {
        await VendorProfile.updateOne({ _id: p._id }, { $set: { vendorType: owner.vendorType } });
        summary.profilesRepaired += 1;
      }
    } else {
      summary.conflicts.push(`profile ${p._id} ("${p.businessName}") has no vendorType and its owner has none either`);
    }
  }

  /* ── 3. Duplicate (userId, vendorType) pairs ───────────── */

  // The unique index cannot be built while duplicates exist. Report them
  // instead of deleting — which of two profiles for the same line is the real
  // one is a business call, not a script's.
  const dupes = await VendorProfile.aggregate([
    { $group: { _id: { userId: '$userId', vendorType: '$vendorType' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  for (const d of dupes) {
    summary.conflicts.push(
      `user ${d._id.userId} has ${d.count} "${d._id.vendorType}" profiles: ${d.ids.join(', ')} — merge or delete one before rerunning`
    );
  }

  /* ── 4. Index swap ─────────────────────────────────────── */

  const collection = VendorProfile.collection;
  const indexes = await collection.indexes();
  const hasLegacy = indexes.some((i) => i.name === LEGACY_USER_INDEX && i.unique);
  const hasTarget = indexes.some((i) => i.name === TARGET_INDEX);

  console.log(`  indexes: legacy unique userId ${hasLegacy ? 'present' : 'absent'}, compound ${hasTarget ? 'present' : 'absent'}`);

  if (summary.conflicts.length) {
    console.log('\n  Skipping the index swap — resolve these first:');
    for (const c of summary.conflicts) console.log(`    ! ${c}`);
  } else if (!dry) {
    if (hasLegacy) {
      await collection.dropIndex(LEGACY_USER_INDEX);
      summary.indexDropped = true;
      console.log(`  dropped ${LEGACY_USER_INDEX}`);
    }
    if (!hasTarget) {
      await collection.createIndex({ userId: 1, vendorType: 1 }, { unique: true, name: TARGET_INDEX });
      summary.indexCreated = true;
      console.log(`  created ${TARGET_INDEX}`);
    }
    // A non-unique userId index is still wanted for the "all my lines" lookup.
    await collection.createIndex({ userId: 1 }, { name: 'userId_lookup' }).catch(() => {});
  }

  console.log(
    `\nDone. users backfilled: ${summary.usersBackfilled}, profiles repaired: ${summary.profilesRepaired}, conflicts: ${summary.conflicts.length}\n`
  );

  if (localConnection) await mongoose.disconnect();
  return { ok: summary.conflicts.length === 0, ...summary };
}

// Direct invocation (node backend/src/scripts/migrateMultiVendor.js)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runMultiVendorMigration({ dry: process.argv.includes('--dry') })
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default runMultiVendorMigration;
