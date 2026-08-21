/**
 * Find every stored document still carrying a legacy vendor category name.
 *
 * The labels were renamed in code, but names also got copied into data at write
 * time — vendor business names, admin action-item subtitles, seeded provider
 * names. Those rows keep showing the old wording until they are updated too.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

export const OLD_NAMES = [
  'Store Shop Vendor',
  'Shop Vendor',
  'Meal Subscription Provider',
  'Meal Provider',
  'Pet Events Organizer',
  'Events Organizer',
  'Event Organizer',
  'Memorial End-of-Life Provider',
  'Memorial Provider',
  'Clinic Veterinary Doctor',
  'Doctor / Clinic',
  'Pet Grooming & Spa Provider',
  'Grooming Salon',
  'Pet Daycare & Boarding Centre',
  'Daycare Centre',
  'Pet Adoption Partner',
];

/** Walk a document and yield every [path, string] pair that contains a hit. */
export function findHits(value, oldNames, path = '') {
  const out = [];
  if (typeof value === 'string') {
    const hit = oldNames.find((o) => value.includes(o));
    if (hit) out.push({ path, value, hit });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...findHits(v, oldNames, `${path}[${i}]`)));
    return out;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id') continue;
      out.push(...findHits(v, oldNames, path ? `${path}.${k}` : k));
    }
  }
  return out;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();

  let total = 0;
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const rows = [];
    for (const doc of docs) {
      const hits = findHits(doc, OLD_NAMES);
      if (hits.length) rows.push({ id: String(doc._id), hits });
    }
    if (!rows.length) continue;
    total += rows.length;
    console.log(`\n${name} — ${rows.length} document(s)`);
    for (const row of rows.slice(0, 10)) {
      for (const h of row.hits) {
        console.log(`   ${row.id}  ${h.path} = "${h.value}"`);
      }
    }
    if (rows.length > 10) console.log(`   … and ${rows.length - 10} more`);
  }

  console.log(`\nTOTAL documents carrying a legacy vendor name: ${total}`);
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('scan-vendor-names.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
