/**
 * Admin -> storefront round trip for Shop by Breed.
 *
 * The admin screen writes product ids into a breed's shopData; the shop then
 * matches those ids against its own catalogue with a strict includes(). If the
 * two sides disagree about what a product id looks like, nothing errors -- the
 * section just renders empty. This proves they agree, including for a product
 * created after the fact (which the old static mock could never have offered).
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { Breed } from '../../src/modules/breed/breed.model.js';

const PORT = 5962;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

await mongoose.connect(process.env.MONGODB_URI);
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

const admin = await User.findOneAndUpdate(
  { email: 'e2e.breed.admin@tailcircle.test' },
  { $set: { name: 'Breed Admin', phone: '9000009921', role: 'admin' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
const tok = jwt.sign({ sub: String(admin._id), role: 'admin' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` };
const call = async (m, p, body) => {
  const r = await fetch(BASE + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const pub = async (p) => {
  const r = await fetch(BASE + p);
  return { status: r.status, body: await r.json().catch(() => null) };
};

// Exactly the storefront's mapper.
const toLegacyProduct = (p) => ({ id: p.legacyId ?? p._id, name: p.name, category: p.category, price: p.price });

console.log('\n1. The admin picker and the shop see the same catalogue');
// The admin screen now calls fetchProducts() -> GET /shop/products, the same
// endpoint and mapper the storefront uses.
const shopSide = ((await pub('/shop/products?limit=500')).body?.data?.items || []).map(toLegacyProduct);
check('the shared endpoint returns products', shopSide.length > 0, `${shopSide.length}`);
const withObjectId = shopSide.filter((p) => typeof p.id === 'string' && /^[0-9a-f]{24}$/.test(String(p.id)));
check(
  'products created without a legacyId are included',
  withObjectId.length > 0,
  `${withObjectId.length} such product(s) -- these were invisible to the old static mock`
);

console.log('\n2. A brand-new product is immediately recommendable');
const created = await Product.create({
  name: 'E2E Breed Test Kibble',
  brand: 'E2E',
  category: 'Food',
  petType: 'Dog',
  price: 999,
  mrp: 1299,
  img: 'https://example.com/k.jpg',
  slug: `e2e-breed-kibble-${Date.now()}`,
  packSizes: [{ size: '1kg', price: 999, mrp: 1299, stock: 10 }],
  active: true,
});
const afterCreate = ((await pub('/shop/products?limit=500')).body?.data?.items || []).map(toLegacyProduct);
const newEntry = afterCreate.find((p) => String(p.id) === String(created._id));
check('it appears in the picker straight away', Boolean(newEntry), newEntry ? `id=${newEntry.id}` : 'MISSING');
const newId = newEntry?.id;

console.log('\n3. Saving recommendations through the admin API');
const target = await Breed.findOne({ petType: 'dog' }).lean();
check('a breed exists to edit', Boolean(target), target?.name);
const before = JSON.parse(JSON.stringify(target.shopData || {}));

const saved = await call('PATCH', `/admin/breeds/${target._id}`, {
  shopData: {
    ...before,
    recommendations: { ...(before.recommendations || {}), food: [...(before.recommendations?.food || []), newId] },
    guidance: { ...(before.guidance || {}), [newId]: 'Must Have' },
  },
});
check('the admin PATCH succeeds', saved.status === 200, `status ${saved.status}`);

console.log('\n4. The storefront resolves what the admin saved');
const detail = (await pub(`/breeds/${target.slug}`)).body?.data;
const recs = detail?.shopData?.recommendations?.food || [];
check('the new id is stored on the breed', recs.some((r) => String(r) === String(newId)));
// Storefront: products.filter(p => mappedIds.includes(p.id)) -- strict.
const catalogue = ((await pub('/shop/products?limit=500')).body?.data?.items || []).map(toLegacyProduct);
const rendered = catalogue.filter((p) => recs.includes(p.id));
check(
  'a strict includes() match finds it in the catalogue',
  rendered.some((p) => String(p.id) === String(newId)),
  `${rendered.length} product(s) render in the Food section`
);
check(
  'every stored recommendation resolves (no silent drop)',
  rendered.length === recs.length,
  `${rendered.length} rendered of ${recs.length} stored`
);
// Storefront: selectedBreed.guidance?.[p.id]
const guidance = detail?.shopData?.guidance || {};
check('the guidance label is readable by product id', guidance[newId] === 'Must Have', guidance[newId]);

console.log('\n5. Cleanup restores the breed');
await call('PATCH', `/admin/breeds/${target._id}`, { shopData: before });
const restored = (await pub(`/breeds/${target.slug}`)).body?.data;
check(
  'the breed is back to its original recommendations',
  (restored?.shopData?.recommendations?.food || []).length === (before.recommendations?.food || []).length,
  `${(restored?.shopData?.recommendations?.food || []).length} item(s)`
);
await Product.deleteOne({ _id: created._id });
await User.deleteOne({ _id: admin._id });

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
await mongoose.disconnect();
process.exit(fail ? 1 : 0);
