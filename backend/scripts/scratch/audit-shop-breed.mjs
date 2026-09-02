/**
 * Audit every field the "Shop by Breed" screens read against what the backend
 * actually serves. The UI filters silently -- a section whose key or id shape
 * does not line up simply renders nothing, so a mismatch here looks like an
 * empty screen, not an error.
 *
 * Mirrors the exact expressions in ShopList.jsx so the assertions cannot drift
 * from the component.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import http from 'http';
import app from '../../src/app.js';

const PORT = 5964;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0;
let fail = 0;
let warn = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};
const note = (label, detail = '') => {
  console.log(`  WARN  ${label}${detail ? ` -- ${detail}` : ''}`);
  warn += 1;
};
const get = async (p) => {
  const r = await fetch(BASE + p);
  return { status: r.status, body: await r.json().catch(() => null) };
};

await mongoose.connect(process.env.MONGODB_URI);
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

/* ── exactly what the frontend service layer produces ──────────────── */
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const toLegacyProduct = (p) => ({
  id: p.legacyId ?? p._id,
  category: p.category,
  petType: p.petType,
  price: p.price,
  mrp: p.mrp,
  rating: p.rating,
  img: p.img,
  brand: p.brand,
  name: p.name,
  lifeStage: p.lifeStage,
  specialDiet: p.specialDiet,
  subCategory: p.subCategory,
  discountRange: p.discountRange,
});
const toLegacyBreed = (b) => ({
  id: b.slug,
  species: cap(b.petType),
  name: b.name,
  size: cap(b.size),
  personality: b.personality,
  description: b.description,
  image: b.image,
  summary: b.summary || {},
  recommendations: b.shopData?.recommendations || {},
  monthlyBundle: b.shopData?.monthlyBundle || null,
  guidance: b.shopData?.guidance || {},
});

const prodRes = await get('/shop/products?limit=100');
const products = (prodRes.body?.data?.items || []).map(toLegacyProduct);
const catRes = await get('/shop/categories');
const categories = ['All', ...(catRes.body?.data || []).map((c) => c.name)];
const breedList = (await get('/breeds')).body?.data || [];
const breeds = [];
for (const b of breedList) {
  const d = await get(`/breeds/${b.slug}`);
  if (d.body?.data) breeds.push(toLegacyBreed(d.body.data));
}

console.log('\n1. Catalogue reaches the screen');
check('products load', products.length > 0, `${products.length}`);
check('breeds load', breeds.length > 0, `${breeds.length}`);
const total = prodRes.body?.data?.total ?? prodRes.body?.data?.count;
if (typeof total === 'number' && total > 100) {
  note('fetchProducts caps at limit=100', `catalogue has ${total}; recommendations beyond page 1 would vanish`);
} else {
  check('the whole catalogue fits the limit=100 the shop requests', (total ?? products.length) <= 100, `total=${total ?? products.length}`);
}

console.log('\n2. Breed grid (screen 1)');
// UI: breeds.filter(b => b.species === selectedPetType) with selectedPetType 'Dog' | 'Cat'
for (const type of ['Dog', 'Cat']) {
  const n = breeds.filter((b) => b.species === type).length;
  check(`"${type}" tab has breeds after the species filter`, n > 0, `${n}`);
}
const strays = breeds.filter((b) => !['Dog', 'Cat'].includes(b.species));
check('no breed has a species the tabs cannot show', strays.length === 0,
  strays.map((b) => `${b.name}:${b.species}`).join(', ') || 'none');
check('every card has a name', breeds.every((b) => b.name));
check('every card has personality text', breeds.every((b) => b.personality), `${breeds.filter((b) => !b.personality).length} missing`);
check('every card has an image', breeds.every((b) => b.image));
check('every breed has a size badge from the API', breeds.every((b) => b.size),
  `${breeds.filter((b) => !b.size).length} would fall back to name-guessing`);

console.log('\n3. Category pills vs the section mapping');
// The pill -> section mapping in ShopList is hardcoded to these names.
const MAPPED = ['All', 'Food', 'Treats', 'Toys', 'Health', 'Grooming', 'Accessories'];
const unmapped = categories.filter((c) => !MAPPED.includes(c));
check('every category pill maps to a breed section', unmapped.length === 0,
  unmapped.length ? `${unmapped.join(', ')} -> selecting these shows nothing` : 'all mapped');
const missingPill = MAPPED.filter((c) => !categories.includes(c));
check('every mapped section has a pill to reach it', missingPill.length === 0, missingPill.join(', ') || 'none');

console.log('\n4. Recommendation keys the sections read');
const SECTION_KEYS = ['food', 'treats', 'toys', 'health', 'accessories', 'grooming', 'comfort', 'travel'];
const usedKeys = new Set(breeds.flatMap((b) => Object.keys(b.recommendations)));
const unknown = [...usedKeys].filter((k) => !SECTION_KEYS.includes(k));
check('no recommendation key is unreadable by the UI', unknown.length === 0,
  unknown.join(', ') || `keys in use: ${[...usedKeys].sort().join(', ')}`);
const emptyBreeds = breeds.filter((b) => !Object.keys(b.recommendations).length);
check('every breed has at least one populated section', emptyBreeds.length === 0,
  emptyBreeds.map((b) => b.name).join(', ') || 'all populated');

console.log('\n5. Recommended ids resolve to real products');
// UI: products.filter(p => mappedIds.includes(p.id)) -- strict ===, so type matters.
const byId = new Map(products.map((p) => [p.id, p]));
let dangling = [];
let typeMismatch = [];
for (const b of breeds) {
  for (const [key, ids] of Object.entries(b.recommendations)) {
    for (const raw of ids || []) {
      if (byId.has(raw)) continue;
      if (byId.has(String(raw)) || byId.has(Number(raw))) typeMismatch.push(`${b.name}/${key}:${raw}`);
      else dangling.push(`${b.name}/${key}:${raw}`);
    }
  }
}
check('no recommended id is a type mismatch (includes() is strict)', typeMismatch.length === 0,
  typeMismatch.slice(0, 5).join(', ') || 'none');
check('no recommended id points at a missing product', dangling.length === 0,
  dangling.slice(0, 5).join(', ') || 'none');

console.log('\n6. Life-stage filter (applied to every section, default "Adult")');
const stages = {};
for (const p of products) stages[p.lifeStage ?? '(unset)'] = (stages[p.lifeStage ?? '(unset)'] || 0) + 1;
console.log(`        lifeStage values: ${JSON.stringify(stages)}`);
// UI keeps a product when lifeStage is falsy, 'all life stages', or === ageFilter.
const survives = (p, age) =>
  !p.lifeStage || p.lifeStage.toLowerCase() === 'all life stages' || p.lifeStage.toLowerCase() === age.toLowerCase();
for (const age of ['Puppy', 'Adult', 'Senior']) {
  const n = products.filter((p) => survives(p, age)).length;
  check(`"${age}" stage keeps products`, n > 0, `${n}/${products.length}`);
}
const recIds = new Set(breeds.flatMap((b) => Object.values(b.recommendations).flat()));
const recProducts = [...recIds].map((id) => byId.get(id)).filter(Boolean);
const adultSurvivors = recProducts.filter((p) => survives(p, 'Adult'));
check('recommended products survive the default Adult filter', adultSurvivors.length > 0,
  `${adultSurvivors.length}/${recProducts.length} recommended products visible on open`);

console.log('\n7. Guidance labels');
const GUIDANCE = ['Must Have', 'Good To Have', 'Optional'];
const badGuidance = [];
const guidanceOrphans = [];
for (const b of breeds) {
  for (const [pid, level] of Object.entries(b.guidance)) {
    if (!GUIDANCE.includes(level)) badGuidance.push(`${b.name}:${pid}=${level}`);
    if (!byId.has(pid) && !byId.has(Number(pid))) guidanceOrphans.push(`${b.name}:${pid}`);
  }
}
check('every guidance value is one the UI can colour', badGuidance.length === 0, badGuidance.slice(0, 5).join(', ') || 'all valid');
check('every guidance key matches a real product', guidanceOrphans.length === 0, guidanceOrphans.slice(0, 5).join(', ') || 'none');
// UI: selectedBreed.guidance?.[p.id] -- object keys are strings, p.id may be a number.
const numericIds = products.filter((p) => typeof p.id === 'number').length;
if (numericIds > 0) {
  const b0 = breeds.find((b) => Object.keys(b.guidance).length);
  const sampleKey = b0 && Object.keys(b0.guidance)[0];
  const lookupWorks = b0 && recProducts.some((p) => b0.guidance[p.id] !== undefined);
  check('guidance lookup by product id works despite numeric ids', Boolean(lookupWorks),
    `sample key ${JSON.stringify(sampleKey)}, ${numericIds} numeric product id(s)`);
}

console.log('\n8. Monthly bundle');
const noBundle = breeds.filter((b) => !b.monthlyBundle);
check('every breed has a bundle', noBundle.length === 0, noBundle.map((b) => b.name).join(', ') || 'all present');
const bundleIssues = [];
for (const b of breeds) {
  const mb = b.monthlyBundle;
  if (!mb) continue;
  if (!Array.isArray(mb.productIds) || !mb.productIds.length) bundleIssues.push(`${b.name}: no productIds (card hidden)`);
  else {
    const missing = mb.productIds.filter((id) => !byId.has(id));
    if (missing.length) bundleIssues.push(`${b.name}: ${missing.length} id(s) not in catalogue`);
  }
  if (typeof mb.bundlePrice !== 'number' || mb.bundlePrice <= 0) bundleIssues.push(`${b.name}: bundlePrice=${mb.bundlePrice}`);
}
check('every bundle renders and prices', bundleIssues.length === 0, bundleIssues.slice(0, 6).join(' | ') || 'all valid');
// The card shows a struck-through "Buy Separately" total; it must beat the bundle price.
const upsideDown = [];
for (const b of breeds) {
  const mb = b.monthlyBundle;
  if (!mb?.productIds?.length) continue;
  const sum = mb.originalPrice || mb.productIds.reduce((s, pid) => s + (byId.get(pid)?.price || 0), 0);
  if (sum <= mb.bundlePrice) upsideDown.push(`${b.name}: separate ₹${sum} vs bundle ₹${mb.bundlePrice}`);
}
check('the bundle is actually cheaper than buying separately', upsideDown.length === 0,
  upsideDown.slice(0, 5).join(' | ') || 'all discounted');

console.log('\n9. Breed details drawer');
const SUMMARY_FIELDS = ['weightRange', 'energyLevel', 'lifeSpan'];
const missingSummary = [];
for (const b of breeds) {
  const gaps = SUMMARY_FIELDS.filter((f) => !b.summary?.[f]);
  if (gaps.length) missingSummary.push(`${b.name}: ${gaps.join('/')}`);
}
check('every breed fills the summary tiles', missingSummary.length === 0,
  missingSummary.slice(0, 6).join(' | ') || 'all present');
check('every breed has an About description', breeds.every((b) => b.description),
  `${breeds.filter((b) => !b.description).length} missing`);

console.log('\n10. Product card fields');
const cardGaps = {};
for (const p of recProducts) {
  for (const f of ['name', 'brand', 'img', 'price', 'rating', 'category']) {
    if (p[f] === undefined || p[f] === null || p[f] === '') cardGaps[f] = (cardGaps[f] || 0) + 1;
  }
}
check('recommended product cards have every field they render',
  Object.keys(cardGaps).length === 0,
  Object.entries(cardGaps).map(([f, n]) => `${f}:${n}`).join(', ') || 'all complete');
const badMrp = recProducts.filter((p) => p.mrp && p.mrp < p.price);
check('no product shows an MRP below its price', badMrp.length === 0, badMrp.map((p) => p.name).slice(0, 3).join(', ') || 'none');

console.log('\n11. Dynamic fallback path (breeds with an empty section)');
// When a section has no mapped ids the UI falls back to category+petType.
const petTypes = {};
for (const p of products) petTypes[p.petType ?? '(unset)'] = (petTypes[p.petType ?? '(unset)'] || 0) + 1;
console.log(`        product petType values: ${JSON.stringify(petTypes)}`);
// UI compares p.petType?.toLowerCase() !== breed.species?.toLowerCase()
const speciesSet = new Set(breeds.map((b) => b.species.toLowerCase()));
const matchable = products.filter((p) => speciesSet.has(String(p.petType).toLowerCase())).length;
check('product petType values line up with breed species', matchable > 0,
  `${matchable}/${products.length} products match a breed species`);

console.log(`\n${pass} passed, ${fail} failed, ${warn} warning(s)`);
server.close();
await mongoose.disconnect();
process.exit(fail ? 1 : 0);
