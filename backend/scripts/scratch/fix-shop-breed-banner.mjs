/**
 * Repair the banners collection so "Shop by Breed" is reachable again.
 *
 * Three things had gone wrong with the shop_promotional row -- the card that
 * reads "Find products by breed ... Browse Breeds":
 *
 *  1. Its link held `http://localhost:5174/admin/platform/content`, an admin
 *     panel URL typed into a free-text field. The shop handed anything
 *     starting with "http" to window.open(), so tapping the card tried to open
 *     the admin app in a new tab -- a blocked popup on mobile.
 *  2. Two rows shared the key, so the admin panel could edit one while the
 *     user app read the other.
 *  3. Seven inactive `test_promo` rows left over from earlier testing.
 *
 * Idempotent: re-running finds nothing to do. Pass --dry-run to preview.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Banner } from '../../src/modules/admin/admin.models.js';

const APPLY = !process.argv.includes('--dry-run');
const SHOP_BY_BREED = '/app/shop?tab=breed';

/** A link a customer cannot usefully follow. */
const isUnusable = (raw) => {
  const link = String(raw || '').trim();
  if (!link) return true;
  if (/^https?:\/\//i.test(link)) {
    try {
      const path = new URL(link).pathname;
      return /^\/(admin|vendor)(\/|$)/.test(path);
    } catch {
      return true;
    }
  }
  return /^\/(admin|vendor)(\/|$)/.test(link) || !link.startsWith('/');
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const plan = [];

  // ── 1. drop the leftover test rows ────────────────────────────────
  const testRows = await Banner.find({ key: 'test_promo' }).lean();
  if (testRows.length) {
    plan.push(`remove ${testRows.length} leftover test_promo row(s)`);
    if (APPLY) await Banner.deleteMany({ key: 'test_promo' });
  }

  // ── 2. collapse duplicate keys, newest wins ───────────────────────
  const dupes = await Banner.aggregate([
    { $group: { _id: '$key', ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  for (const d of dupes) {
    const rows = await Banner.find({ key: d._id }).sort({ updatedAt: -1, _id: -1 }).lean();
    const [keep, ...drop] = rows;
    plan.push(`key "${d._id}": keep ${keep._id}, drop ${drop.length} duplicate(s)`);
    if (APPLY) await Banner.deleteMany({ _id: { $in: drop.map((r) => r._id) } });
  }

  // ── 3. repair links that point nowhere a customer can go ──────────
  const all = await Banner.find().lean();
  for (const b of all) {
    if (!isUnusable(b.link)) continue;
    // Only the shop promo has a known correct destination; flag the rest
    // rather than inventing one.
    if (b.key === 'shop_promotional') {
      plan.push(`shop_promotional: link ${JSON.stringify(b.link)} -> ${SHOP_BY_BREED}`);
      if (APPLY) await Banner.updateOne({ _id: b._id }, { $set: { link: SHOP_BY_BREED } });
    } else if (b.link) {
      plan.push(`(review) ${b.key}: unusable link ${JSON.stringify(b.link)} -- left as is`);
    }
  }

  // ── 4. make the key unique so this cannot drift again ─────────────
  const idx = await Banner.collection.indexes();
  if (!idx.some((i) => i.name === 'key_1')) {
    plan.push('create unique index on banners.key');
    if (APPLY) await Banner.collection.createIndex({ key: 1 }, { unique: true });
  }

  console.log(plan.length ? plan.map((l) => `  ${l}`).join('\n') : '  nothing to do');
  if (!APPLY) console.log('\nDry run -- nothing written. Re-run without --dry-run to apply.');
  else {
    const promo = await Banner.findOne({ key: 'shop_promotional' }).lean();
    console.log(
      `\nshop_promotional now: active=${promo?.active} link=${JSON.stringify(promo?.link)} image=${promo?.image ? 'set' : 'EMPTY'}`
    );
    console.log(`banners total: ${await Banner.countDocuments()}`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
