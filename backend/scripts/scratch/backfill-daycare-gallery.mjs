/**
 * Backfill the photo strip for seeded daycare centres that only carry one.
 *
 * Mirrors backfill-grooming-gallery.mjs: reads the galleries straight out of
 * `providers.seed.js` and writes only `gallery`, so re-running the full seeder
 * (which `$set`s `details` wholesale) is not needed and no vendor configuration
 * gets clobbered.
 */
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Provider } from '../../src/modules/provider/provider.model.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(here, '..', 'seeders', 'providers.seed.js');

function galleriesFromSeed() {
  const src = fs.readFileSync(seedPath, 'utf8');
  const start = src.indexOf('MOCK_DAYCARES');
  if (start === -1) throw new Error('MOCK_DAYCARES not found in the seed file');
  const region = src.slice(start, src.indexOf('MOCK_DAYCARE_PLANS'));

  const out = {};
  const entry = /id:\s*'(dc_\d+)'[\s\S]*?gallery:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = entry.exec(region))) {
    const urls = [...m[2].matchAll(/'([^']+)'/g)].map((u) => u[1]);
    if (urls.length) out[m[1]] = urls;
  }
  return out;
}

async function main() {
  const galleries = galleriesFromSeed();
  const ids = Object.keys(galleries);
  if (!ids.length) throw new Error('No daycare galleries parsed out of the seed file');
  console.log(`Parsed galleries for ${ids.length} centres: ${ids.join(', ')}`);

  await mongoose.connect(process.env.MONGODB_URI);

  let updated = 0;
  let skipped = 0;
  for (const [legacyId, gallery] of Object.entries(galleries)) {
    const provider = await Provider.findOne({ legacyId, type: 'daycare' }).select('name gallery');
    if (!provider) {
      console.log(`  -- ${legacyId}: not in this database, skipped`);
      continue;
    }
    if ((provider.gallery || []).length > 1) {
      console.log(`  == ${provider.name}: already has ${provider.gallery.length} photos, left alone`);
      skipped += 1;
      continue;
    }
    await Provider.updateOne({ _id: provider._id }, { $set: { gallery } });
    console.log(`  ++ ${provider.name}: ${gallery.length} photos`);
    updated += 1;
  }

  console.log(`\n${updated} updated, ${skipped} left alone`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
