/**
 * "Shop by Breed" end to end: the banner points somewhere a shopper can go,
 * the breed directory has data, and each breed's profile can actually render
 * its recommendations.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import http from 'http';
import app from '../../src/app.js';
import { Banner } from '../../src/modules/admin/admin.models.js';

const PORT = 5965;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};
const get = async (p) => {
  const r = await fetch(BASE + p);
  return { status: r.status, body: await r.json().catch(() => null) };
};

await mongoose.connect(process.env.MONGODB_URI);
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

console.log('\n1. The banner the shopper taps');
const banners = await get('/banners');
const rows = (banners.body?.data || []).filter((b) => b.key === 'shop_promotional');
check('exactly one shop_promotional banner', rows.length === 1, `${rows.length} row(s)`);
const promo = rows[0];
check('it is active', promo?.active !== false);
check('it has an image to render', Boolean(promo?.image), promo?.image ? 'set' : 'EMPTY');
check('its link is an in-app path, not an absolute URL', Boolean(promo?.link) && promo.link.startsWith('/'), promo?.link);
check(
  'and it does not point at an operator surface',
  !/^\/(admin|vendor)(\/|$)/.test(promo?.link || ''),
  promo?.link
);
check('it lands on the breed tab', (promo?.link || '').includes('tab=breed'), promo?.link);

console.log('\n2. No banner key is duplicated');
const byKey = {};
for (const b of banners.body?.data || []) byKey[b.key] = (byKey[b.key] || 0) + 1;
const dupes = Object.entries(byKey).filter(([, n]) => n > 1);
check('every key appears once', dupes.length === 0, dupes.map(([k, n]) => `${k}x${n}`).join(', ') || 'clean');
const idx = await Banner.collection.indexes();
check('a unique index enforces that', idx.some((i) => i.name === 'key_1' && i.unique));

console.log('\n3. The breed directory has something to show');
const list = await get('/breeds');
const breeds = list.body?.data || [];
check('breeds load', list.status === 200 && breeds.length > 0, `${breeds.length} breed(s)`);
const dogs = breeds.filter((b) => String(b.petType).toLowerCase() === 'dog');
const cats = breeds.filter((b) => String(b.petType).toLowerCase() === 'cat');
// The UI splits the grid by species and defaults to Dog, so an empty Dog
// bucket would render an empty directory even with breeds in the database.
check('the default Dog tab is not empty', dogs.length > 0, `${dogs.length} dog breed(s)`);
check('the Cat tab has breeds too', cats.length > 0, `${cats.length} cat breed(s)`);
check('every breed has a slug to fetch by', breeds.every((b) => Boolean(b.slug)));
check('every breed has a name to show', breeds.every((b) => Boolean(b.name)));
check('every breed has an image', breeds.every((b) => Boolean(b.image)), `${breeds.filter((b) => !b.image).length} missing`);

console.log('\n4. Each breed profile can render');
let noRecs = [];
let noBundle = [];
let noSummary = [];
for (const b of breeds) {
  const d = await get(`/breeds/${b.slug}`);
  const data = d.body?.data;
  if (!data) {
    noRecs.push(`${b.slug} (404)`);
    continue;
  }
  const shop = data.shopData || {};
  if (!shop.recommendations || !Object.keys(shop.recommendations).length) noRecs.push(b.name);
  if (!shop.monthlyBundle) noBundle.push(b.name);
  if (!data.summary || !Object.keys(data.summary).length) noSummary.push(b.name);
}
check('every breed detail resolves by slug', !noRecs.some((n) => n.includes('404')), noRecs.join(', '));
check('every breed has product recommendations', noRecs.length === 0, noRecs.join(', ') || 'all present');
check('every breed has a monthly bundle', noBundle.length === 0, noBundle.join(', ') || 'all present');
check('every breed has a summary block', noSummary.length === 0, noSummary.join(', ') || 'all present');

console.log('\n5. Recommendations point at real products');
const productsRes = await get('/shop/products');
const products = productsRes.body?.data?.items || productsRes.body?.data || [];
const ids = new Set(products.flatMap((p) => [String(p.id), String(p._id), String(p.legacyId)]));
check('the catalog loads', Array.isArray(products) && products.length > 0, `${products.length} product(s)`);
const sample = await get(`/breeds/${breeds[0].slug}`);
const recs = Object.values(sample.body?.data?.shopData?.recommendations || {}).flat();
const dangling = recs.filter((r) => {
  const handle = String(r?.productId ?? r?.id ?? r);
  return handle && handle !== 'undefined' && !ids.has(handle);
});
check(
  `${breeds[0].name}'s recommendations resolve to catalog products`,
  recs.length > 0 && dangling.length === 0,
  `${recs.length} rec(s), ${dangling.length} dangling`
);

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
await mongoose.disconnect();
process.exit(fail ? 1 : 0);
