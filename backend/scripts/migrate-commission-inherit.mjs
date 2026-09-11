/**
 * One-off: convert legacy per-vendor commission rates to "inherit".
 *
 * `VendorProfile.commissionRate` used to default to 0.15, so every profile
 * carried a number whether or not an operator had ever chosen one. With
 * category-level rates that is wrong: a profile sitting at the old default
 * would pin itself to 15% and ignore its category forever.
 *
 * Only rows that still hold exactly the old default are cleared. Anything a
 * human deliberately set to a different rate is left alone -- that is a real
 * override and clearing it would silently change what a vendor is charged.
 *
 *   node scripts/migrate-commission-inherit.mjs          # report only
 *   node scripts/migrate-commission-inherit.mjs --apply  # write the change
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { VendorProfile } from '../src/modules/vendor/vendor.models.js';
import { VENDOR_TYPE_LABEL } from '../src/modules/vendor/vendorTypeLabels.js';

const LEGACY_DEFAULT = 0.15;

async function main() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const all = await VendorProfile.find({}).select('businessName vendorType commissionRate').lean();
  const legacy = all.filter((p) => p.commissionRate === LEGACY_DEFAULT);
  const kept = all.filter((p) => p.commissionRate !== null && p.commissionRate !== undefined && p.commissionRate !== LEGACY_DEFAULT);
  const already = all.filter((p) => p.commissionRate === null || p.commissionRate === undefined);

  console.log(`profiles                     : ${all.length}`);
  console.log(`already inheriting           : ${already.length}`);
  console.log(`at legacy default (to clear) : ${legacy.length}`);
  console.log(`deliberate overrides (keep)  : ${kept.length}`);

  if (kept.length) {
    console.log('\nKeeping these explicit overrides:');
    for (const p of kept) {
      const label = VENDOR_TYPE_LABEL[p.vendorType] || p.vendorType;
      console.log(`  ${(p.businessName || '—').padEnd(28)} ${label.padEnd(24)} ${(p.commissionRate * 100).toFixed(2)}%`);
    }
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write the change.');
  } else if (legacy.length) {
    const res = await VendorProfile.updateMany(
      { commissionRate: LEGACY_DEFAULT },
      { $set: { commissionRate: null } }
    );
    console.log(`\nCleared ${res.modifiedCount} profile(s) to inherit their category rate.`);
  } else {
    console.log('\nNothing to clear.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
