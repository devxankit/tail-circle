/**
 * Rewrite legacy vendor category names stored in the database.
 *
 * Renaming the labels in code only changes what new writes produce — text that
 * was already copied into data (admin action-item types and subtitles, seeded
 * business names) keeps the old wording on screen forever. This walks every
 * collection, rewrites only the string fields that actually contain an old
 * name, and leaves every identifier alone: `vendorType`, slugs, ids and route
 * paths are never touched, because every existing row is keyed on them.
 *
 * Safe to re-run — a second pass finds nothing to do.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { findHits, OLD_NAMES } from './scan-vendor-names.mjs';

/**
 * Ordered longest-first so a specific name is consumed before a shorter one
 * that is a substring of it ("Memorial End-of-Life Provider" before
 * "Memorial Provider").
 */
const RENAMES = [
  ['Store Shop Vendor', 'Shop Partner'],
  ['Meal Subscription Provider', 'Fresh Meals Partner'],
  ['Memorial End-of-Life Provider', 'Last Ride Partner'],
  ['Clinic Veterinary Doctor', 'Veterinarian Partner'],
  ['Pet Grooming & Spa Provider', 'Grooming Partner'],
  ['Pet Daycare & Boarding Centre', 'Day Care Partner'],
  ['Pet Events Organizer', 'Events Partner'],
  ['Pet Adoption Partner', 'Adoption Partner'],
  ['Memorial Provider', 'Last Ride Partner'],
  ['Events Organizer', 'Events Partner'],
  ['Event Organizer', 'Events Partner'],
  ['Doctor / Clinic', 'Veterinarian Partner'],
  ['Meal Provider', 'Fresh Meals Partner'],
  ['Shop Vendor', 'Shop Partner'],
  ['Grooming Salon', 'Grooming Partner'],
  ['Daycare Centre', 'Day Care Partner'],
].sort((a, b) => b[0].length - a[0].length);

const rename = (text) => RENAMES.reduce((acc, [old, next]) => acc.split(old).join(next), text);

const APPLY = !process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();

  let docs = 0;
  let fields = 0;

  for (const name of collections) {
    const all = await db.collection(name).find({}).toArray();
    for (const doc of all) {
      const hits = findHits(doc, OLD_NAMES);
      if (!hits.length) continue;

      const $set = {};
      for (const h of hits) {
        const next = rename(h.value);
        if (next !== h.value) {
          // `h.path` is already a Mongo-style dotted/indexed path.
          $set[h.path] = next;
          fields += 1;
          console.log(`   ${name}  ${h.path}`);
          console.log(`       "${h.value}"  ->  "${next}"`);
        }
      }
      if (!Object.keys($set).length) continue;
      docs += 1;
      if (APPLY) await db.collection(name).updateOne({ _id: doc._id }, { $set });
    }
  }

  console.log(
    `\n${APPLY ? 'Updated' : 'Would update'} ${fields} field(s) across ${docs} document(s).`
  );
  if (!APPLY) console.log('Dry run — nothing was written. Re-run without --dry-run to apply.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
