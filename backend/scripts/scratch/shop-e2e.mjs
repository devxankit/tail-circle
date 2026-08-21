/**
 * End-to-end shop check: a seller lists a product, a customer buys it alongside
 * a platform-owned item, and the seller sees the order, is credited for their
 * own lines only, and can drive it through fulfilment.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { Order } from '../../src/modules/order/order.model.js';
import { Address } from '../../src/modules/address/address.model.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5988/api';
const tok = (id, role) => jwt.sign({ sub: String(id), role }, SECRET, { expiresIn: '1h' });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const TAG = 'E2E-SHOP';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5988, r));

  /* fixtures */
  const vendorUser = await User.findOneAndUpdate(
    { email: 'e2e.shop.vendor@tailcircle.test' },
    { $set: { name: `${TAG} Seller`, phone: '9000000401', role: 'vendor', vendorType: 'shop' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await VendorProfile.findOneAndUpdate(
    { userId: vendorUser._id },
    {
      $set: {
        businessName: `${TAG} Store`, vendorType: 'shop',
        approvalStatus: 'approved', commissionRate: 0.2,
      },
      $setOnInsert: { registrationNo: 'TCV-E2ESHP' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const customer = await User.findOneAndUpdate(
    { email: 'e2e.shop.user@tailcircle.test' },
    { $set: { name: `${TAG} Customer`, phone: '9000000402', role: 'user' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const address = await Address.findOneAndUpdate(
    { userId: customer._id, line1: `${TAG} 12 Test Lane` },
    {
      $set: {
        name: `${TAG} Customer`, fullName: `${TAG} Customer`, phone: '9000000402',
        city: 'Mumbai', pincode: '400001', label: 'home', deletedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Order.deleteMany({ 'addressSnapshot.line1': `${TAG} 12 Test Lane` });
  await Product.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: vendorUser._id, label: { $regex: '^Order TC' } });

  const vendorToken = tok(vendorUser._id, 'vendor');
  const userToken = tok(customer._id, 'user');

  /* 1. the seller lists a product */
  console.log('\n1. Seller lists a product');
  const created = await call('/vendor/products', {
    token: vendorToken,
    method: 'POST',
    body: {
      name: `${TAG} Salmon Kibble`,
      category: 'Food',
      petType: 'Dog',
      price: 800,
      stock: 5,
      size: '2kg',
    },
  });
  check('product created', created.status === 201 || created.status === 200,
    `status ${created.status} ${created.message || ''}`);

  const mine = await Product.findOne({ name: `${TAG} Salmon Kibble` });
  check('product is owned by the seller', String(mine?.vendorId) === String(vendorUser._id),
    `vendorId ${mine?.vendorId}`);

  // A platform-owned product to put alongside it in the same basket.
  const platform = await Product.findOne({ vendorId: null, deletedAt: null, 'packSizes.0.stock': { $gte: 2 } });
  check('a platform-owned product exists to mix into the basket', Boolean(platform), platform?.name);

  /* 2. the customer sees it */
  console.log('\n2. Customer finds it in the shop');
  const listed = await call('/shop/products?search=Salmon');
  const found = (listed.data?.items || listed.data || []).some?.((p) => p.name === `${TAG} Salmon Kibble`);
  check('seller product is publicly listed', Boolean(found),
    `${(listed.data?.items || listed.data || []).length} results`);

  /* 3. a mixed-basket order */
  console.log('\n3. Customer buys the seller\'s item plus a platform item');
  const order = await call('/orders/checkout', {
    token: userToken,
    method: 'POST',
    body: {
      items: [
        { productId: String(mine._id), packSizeIndex: 0, qty: 2 },
        { productId: String(platform._id), packSizeIndex: 0, qty: 1 },
      ],
      addressId: String(address._id),
      paymentMethod: 'cod',
    },
  });
  check('order placed', order.status === 201, `status ${order.status} ${order.message || ''}`);

  const placed = await Order.findById(order.data?.order?._id);
  check('each line records who sells it',
    (placed?.items || []).filter((i) => i.vendorId).length === 1,
    JSON.stringify((placed?.items || []).map((i) => `${i.name}:${i.vendorId ? 'seller' : 'platform'}`)));
  check('a mixed basket has no single order-level owner', placed?.vendorId == null,
    String(placed?.vendorId));

  /* 4. stock moved */
  console.log('\n4. Stock is taken');
  const afterStock = await Product.findById(mine._id);
  check('seller stock decremented by the quantity bought',
    afterStock.packSizes[0].stock === 3, `${afterStock.packSizes[0].stock} left of 5`);

  /* 5. the seller sees it */
  console.log('\n5. Seller sees the order');
  const vendorOrders = await call('/vendor/orders', { token: vendorToken });
  const row = (vendorOrders.data || []).find((o) => o._id === String(placed._id));
  check('order appears in the seller\'s list', Boolean(row), `${vendorOrders.data?.length} orders`);
  check('seller sees only their own line', row?.products === 1,
    JSON.stringify(row?.items));
  check('seller revenue is their lines, not the whole basket',
    row?.total === 1600 && row.orderTotal > row.total,
    `their ₹${row?.total} of a ₹${row?.orderTotal} basket`);
  check('the order is flagged as shared with another seller', row?.isSharedOrder === true,
    String(row?.isSharedOrder));

  /* 6. the money */
  console.log('\n6. Seller is credited for their share');
  const ledger = await VendorLedgerEntry.find({ vendorId: vendorUser._id, refId: placed._id });
  check('exactly one ledger entry for this order', ledger.length === 1, `${ledger.length} entries`);
  // 1600 of the goods + a proportional slice of the 5% tax, less 20% commission.
  const entry = ledger[0];
  const expectedGross = 160000 + Math.round((placed.amounts.tax + placed.amounts.delivery) * (160000 / placed.amounts.subtotal));
  check('credited on their own lines plus their share of tax',
    entry?.gross === expectedGross, `gross ${entry?.gross}, expected ${expectedGross}`);
  check('commission taken at the seller\'s own rate',
    entry?.commission === Math.round(expectedGross * 0.2) && entry?.net === expectedGross - entry.commission,
    `commission ${entry?.commission}, net ${entry?.net}`);
  check('the seller is not credited for the platform\'s line',
    entry?.gross < placed.amounts.total,
    `${entry?.gross} < order total ${placed.amounts.total}`);

  /* 7. fulfilment */
  console.log('\n7. Seller drives fulfilment');
  const packed = await call(`/vendor/orders/${placed._id}/status`, {
    token: vendorToken, method: 'PATCH', body: { status: 'packed' },
  });
  check('order can be marked packed', packed.status === 200, `status ${packed.status} ${packed.message || ''}`);

  const badJump = await call(`/vendor/orders/${placed._id}/status`, {
    token: vendorToken, method: 'PATCH', body: { status: 'delivered' },
  });
  check('an illegal status jump is refused', badJump.status >= 400,
    `status ${badJump.status}, "${badJump.message}"`);

  await call(`/vendor/orders/${placed._id}/status`, {
    token: vendorToken, method: 'PATCH', body: { status: 'shipped' },
  });
  const delivered = await call(`/vendor/orders/${placed._id}/status`, {
    token: vendorToken, method: 'PATCH', body: { status: 'delivered' },
  });
  check('order reaches delivered', delivered.status === 200, `status ${delivered.status}`);

  /* 8. returns */
  console.log('\n8. Customer returns it');
  const ret = await call(`/orders/${placed._id}/return`, {
    token: userToken, method: 'POST', body: { reason: 'Pet did not like it' },
  });
  check('return request accepted', ret.status === 200, `status ${ret.status} ${ret.message || ''}`);

  const returns = await call('/vendor/returns', { token: vendorToken });
  const retRow = (returns.data || []).find((r) => r._id === String(placed._id));
  check('return reaches the seller', Boolean(retRow), `${returns.data?.length} returns`);
  check('return is valued at the seller\'s lines', retRow?.amount === 1600,
    `₹${retRow?.amount}`);

  /* 9. another seller cannot touch it */
  console.log('\n9. A different seller cannot see or move it');
  // Query the vendor service directly: a second *approved* shop vendor may not
  // exist in this database, and a 403 would make an HTTP check pass vacuously.
  const { listVendorOrders } = await import('../../src/modules/vendor/shop.vendor.service.js');
  const strangerId = new mongoose.Types.ObjectId();
  const strangerOrders = await listVendorOrders(strangerId);
  check('a seller who owns no line sees none of this order',
    !strangerOrders.some((o) => o._id === String(placed._id)),
    `${strangerOrders.length} orders visible to an unrelated seller`);

  const blocked = await call(`/vendor/orders/${placed._id}/status`, {
    token: userToken, method: 'PATCH', body: { status: 'shipped' },
  });
  check('a customer cannot drive vendor fulfilment', blocked.status >= 400,
    `status ${blocked.status}`);

  /* cleanup */
  await Order.deleteMany({ 'addressSnapshot.line1': `${TAG} 12 Test Lane` });
  await Product.deleteMany({ name: { $regex: `^${TAG}` } });
  await VendorLedgerEntry.deleteMany({ vendorId: vendorUser._id, refId: placed._id });
  if (platform) await Product.updateOne({ _id: platform._id }, { $inc: { 'packSizes.0.stock': 1 } });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
