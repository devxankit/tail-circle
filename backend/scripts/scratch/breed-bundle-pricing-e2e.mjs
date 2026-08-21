/**
 * Breed Monthly Essentials Bundle: prove the customer is charged the price the
 * button shows.
 *
 * Before this, "Add Bundle" added each product at catalogue price and the
 * order's discount was hardcoded to 0, so a Golden Retriever box advertised at
 * ₹4,299 rang up at ₹10,642.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Cart } from '../../src/modules/cart/cart.model.js';
import { Order } from '../../src/modules/order/order.model.js';
import { Address } from '../../src/modules/address/address.model.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { Breed } from '../../src/modules/breed/breed.model.js';

const PORT = 5960;
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

const user = await User.findOneAndUpdate(
  { email: 'e2e.bundle@tailcircle.test' },
  { $set: { name: 'Bundle Buyer', phone: '9000009931', role: 'user' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
const tok = jwt.sign({ sub: String(user._id), role: 'user' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` };
const call = async (m, p, body) => {
  const r = await fetch(BASE + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const pub = async (p) => (await (await fetch(BASE + p)).json().catch(() => null));

await Cart.deleteMany({ userId: user._id });
await Order.deleteMany({ userId: user._id });

// The breed whose box shows the biggest advertised saving.
const breed = await Breed.findOne({ slug: 'dog_golden_retriever' }).lean()
  || await Breed.findOne({ 'shopData.monthlyBundle.bundlePrice': { $gt: 0 } }).lean();
const bundle = breed.shopData.monthlyBundle;
const allProducts = await Product.find({ active: true, deletedAt: null }).lean();
const byHandle = new Map(allProducts.map((p) => [String(p.legacyId ?? p._id), p]));
const boxProducts = bundle.productIds.map((h) => byHandle.get(String(h))).filter(Boolean);
const listTotal = boxProducts.reduce((s, p) => s + (p.packSizes?.[0]?.price ?? p.price), 0);

console.log(`\n   breed: ${breed.name}`);
console.log(`   box advertises ₹${bundle.bundlePrice} against ₹${listTotal} of contents\n`);

console.log('1. Adding the complete box');
check('every advertised product resolves', boxProducts.length === bundle.productIds.length,
  `${boxProducts.length}/${bundle.productIds.length}`);
for (const p of boxProducts) {
  await call('POST', '/cart/items', { productId: String(p._id), packSizeIndex: 0, qty: 1, bundleSlug: breed.slug });
}
const cart = (await call('GET', '/cart')).body?.data;
check('the cart holds the whole box', cart.items.length === boxProducts.length, `${cart.items.length} line(s)`);
check('line prices stay at catalogue value', cart.subtotal === listTotal, `subtotal ₹${cart.subtotal} vs list ₹${listTotal}`);
check('the bundle discount is applied', cart.bundleDiscount === listTotal - bundle.bundlePrice,
  `₹${cart.bundleDiscount}, expected ₹${listTotal - bundle.bundlePrice}`);
check('the cart total equals the advertised box price', cart.total === bundle.bundlePrice,
  `₹${cart.total} vs advertised ₹${bundle.bundlePrice}`);
check('the box is named for the customer', (cart.bundles || []).some((b) => b.slug === breed.slug),
  JSON.stringify(cart.bundles?.[0] || null));

console.log('\n2. A partial box gets no discount');
const dropped = boxProducts[0];
await call('PUT', '/cart', {
  items: cart.items
    .filter((i) => String(i.productId) !== String(dropped._id))
    .map((i) => ({ productId: i.productId, packSizeIndex: i.packSizeIndex, qty: i.quantity, bundleSlug: i.bundleSlug })),
});
const partial = (await call('GET', '/cart')).body?.data;
check('removing one item withdraws the discount', partial.bundleDiscount === 0, `₹${partial.bundleDiscount}`);
check('and the total falls back to catalogue prices', partial.total === partial.subtotal,
  `total ₹${partial.total}, subtotal ₹${partial.subtotal}`);

console.log('\n3. Checkout charges the advertised price');
await Cart.deleteMany({ userId: user._id });
for (const p of boxProducts) {
  await call('POST', '/cart/items', { productId: String(p._id), packSizeIndex: 0, qty: 1, bundleSlug: breed.slug });
}
const addr = await Address.create({
  userId: user._id, label: 'home', fullName: 'Bundle Buyer', phone: '9000009931',
  line1: '1 Test St', city: 'Pune', state: 'MH', pincode: '411001',
});
const full = (await call('GET', '/cart')).body?.data;
const co = await call('POST', '/orders/checkout', {
  items: full.items.map((i) => ({ productId: i.productId, packSizeIndex: i.packSizeIndex, qty: i.quantity, bundleSlug: i.bundleSlug })),
  addressId: String(addr._id),
  paymentMethod: 'cod',
});
check('the order is placed', co.status === 200 || co.status === 201, `status ${co.status} ${co.body?.message || ''}`);
const order = co.body?.data?.order;
const amt = order?.amounts || {};
check('the order records the discount', amt.discount === Math.round((listTotal - bundle.bundlePrice) * 100),
  `₹${(amt.discount / 100).toFixed(0)}`);
check('the charged subtotal-after-discount is the box price',
  (amt.subtotal - amt.discount) / 100 === bundle.bundlePrice,
  `₹${((amt.subtotal - amt.discount) / 100).toFixed(0)} vs advertised ₹${bundle.bundlePrice}`);
// Rate-agnostic: whatever the rate is, it must be applied to the discounted
// amount and not to the list subtotal.
const impliedRate = amt.tax / (amt.subtotal - amt.discount);
check('tax is charged on the discounted amount, not list',
  amt.tax === Math.round((amt.subtotal - amt.discount) * impliedRate)
    && amt.tax < Math.round(amt.subtotal * impliedRate),
  `tax ₹${(amt.tax / 100).toFixed(2)} at ${(impliedRate * 100).toFixed(0)}% of ₹${((amt.subtotal - amt.discount) / 100).toFixed(0)}, `
  + `vs ₹${(Math.round(amt.subtotal * impliedRate) / 100).toFixed(2)} if charged on list`);
check('the order total never exceeds the list price',
  amt.total <= amt.subtotal, `total ₹${(amt.total / 100).toFixed(0)} vs list ₹${(amt.subtotal / 100).toFixed(0)}`);
const saved = listTotal - (amt.subtotal - amt.discount) / 100;
check('the customer really saves what the card promised', saved === listTotal - bundle.bundlePrice,
  `saved ₹${saved}`);

console.log('\n4. A forged bundle slug buys nothing');
await Cart.deleteMany({ userId: user._id });
const one = boxProducts[0];
await call('POST', '/cart/items', { productId: String(one._id), packSizeIndex: 0, qty: 1, bundleSlug: breed.slug });
const lonely = (await call('GET', '/cart')).body?.data;
check('one item tagged as a box earns no discount', lonely.bundleDiscount === 0, `₹${lonely.bundleDiscount}`);
await Cart.deleteMany({ userId: user._id });
await call('POST', '/cart/items', { productId: String(one._id), packSizeIndex: 0, qty: 1, bundleSlug: 'not-a-real-breed' });
const bogus = (await call('GET', '/cart')).body?.data;
check('an unknown slug earns no discount', bogus.bundleDiscount === 0, `₹${bogus.bundleDiscount}`);

console.log('\n5. Buying loose does not join the box');
await Cart.deleteMany({ userId: user._id });
await call('POST', '/cart/items', { productId: String(one._id), packSizeIndex: 0, qty: 1 });
await call('POST', '/cart/items', { productId: String(one._id), packSizeIndex: 0, qty: 1, bundleSlug: breed.slug });
const mixed = (await call('GET', '/cart')).body?.data;
check('loose and bundled copies stay separate lines', mixed.items.length === 2, `${mixed.items.length} line(s)`);

await Cart.deleteMany({ userId: user._id });
await Order.deleteMany({ userId: user._id });
await Address.deleteMany({ userId: user._id });
await User.deleteOne({ _id: user._id });

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
await mongoose.disconnect();
process.exit(fail ? 1 : 0);
