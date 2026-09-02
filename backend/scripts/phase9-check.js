/**
 * Phase 9 (slice 1: foundation + Shop portal) exit-criteria check.
 *   node src/server.js   (in another terminal)
 *   node scripts/phase9-check.js
 *
 * Covers: KYC registration → pending (login blocked), admin approval,
 * password + reg-no OTP login, vendor-scoped products CRUD, order status
 * transitions with customer notification, and commission ledger accrual.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Order } from '../src/modules/order/order.model.js';
import { Product } from '../src/modules/shop/product.model.js';
import { MealPlan, MealOrder } from '../src/modules/meal/meal.models.js';
import { Event } from '../src/modules/provider/event.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { CustomerRequest } from '../src/modules/vendor/event.models.js';
import { MemorialRequest, TeamMember } from '../src/modules/vendor/memorial.models.js';
import { VendorProfile, VendorLedgerEntry } from '../src/modules/vendor/vendor.models.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const json = (res) => res.json().catch(() => ({}));
const authed = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

await mongoose.connect(env.mongoUri);
const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
const { invalidate } = await import('../src/services/cache.service.js');
await invalidate('rl:auth:*');
await invalidate('otp:*');

// ── clean prior run for the test registrant ──────────────
const REG_EMAIL = 'phase9vendor@example.com';
const REG_PHONE = normalizePhone('9999900091');
const existing = await User.findOne({ email: REG_EMAIL });
if (existing) {
  await VendorProfile.deleteMany({ userId: existing._id });
  await User.deleteOne({ _id: existing._id });
}
await Otp.deleteMany({ phone: REG_PHONE });

// ── 1. KYC registration → pending, login blocked ─────────
const reg = await json(
  await fetch(`${BASE}/vendor/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Phase9 Test Store',
      email: REG_EMAIL,
      phone: '9999900091',
      role: 'shop',
      city: 'Indore',
      address: '1 Test Rd',
      password: 'test1234',
      bankName: 'HDFC',
      accountNumber: '123456789012',
      ifscCode: 'HDFC0000001',
    }),
  })
);
check('KYC register returns registration no + pending', reg.data?.registrationNo?.startsWith('TCV-') && reg.data?.approvalStatus === 'pending');

const blocked = await fetch(`${BASE}/vendor/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: REG_EMAIL, password: 'test1234' }),
});
const blockedBody = await json(blocked);
check('login blocked while pending (403)', blocked.status === 403 && blockedBody.details?.approvalStatus === 'pending');

// ── 2. Admin approval (temp: direct DB) → login works ────
await VendorProfile.updateOne({ email: REG_EMAIL }, { $set: { approvalStatus: 'approved' } });
const login = await json(
  await fetch(`${BASE}/vendor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: REG_EMAIL, password: 'test1234' }),
  })
);
check('approved vendor password login issues tokens', Boolean(login.data?.accessToken) && login.data?.profile?.approvalStatus === 'approved');
check('bank account masked in profile', /^•+ \d{4}$/.test(login.data?.profile?.bank?.accountMasked || ''));

// ── 3. Seeded shop vendor: password + reg-no OTP login ───
const shopLogin = await json(
  await fetch(`${BASE}/vendor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hello@pawsandclaws.com', password: 'vendor123' }),
  })
);
check('seeded shop vendor logs in', Boolean(shopLogin.data?.accessToken) && shopLogin.data?.profile?.vendorType === 'shop');
const shopToken = shopLogin.data.accessToken;

await invalidate('otp:*');
const otpReq = await fetch(`${BASE}/vendor/request-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ registrationNo: 'TCV-SHOP01' }),
});
check('reg-no OTP request accepted', otpReq.status === 200);
// inject known OTP and verify
await Otp.deleteMany({ phone: normalizePhone('9000001001') });
await Otp.create({ phone: normalizePhone('9000001001'), codeHash: await bcrypt.hash('1234', 10), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
const otpLogin = await json(
  await fetch(`${BASE}/vendor/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNo: 'TCV-SHOP01', code: '1234' }),
  })
);
check('reg-no OTP login issues tokens', Boolean(otpLogin.data?.accessToken));

// ── 4. Vendor-scoped products ────────────────────────────
const products = await json(await fetch(`${BASE}/vendor/products`, { headers: authed(shopToken) }));
check('shop vendor sees only its 8 products', products.data?.length === 8);

const created = await json(
  await fetch(`${BASE}/vendor/products`, {
    method: 'POST',
    headers: authed(shopToken),
    body: JSON.stringify({ name: 'Phase9 Chew Toy', category: 'Toys', price: 500, discountPrice: 450, stock: 20, sku: 'P9-TOY' }),
  })
);
check('create product scoped to vendor', created.data?.name === 'Phase9 Chew Toy' && created.data?.stock === 20);

const stockAdj = await json(
  await fetch(`${BASE}/vendor/products/${created.data._id}/stock`, {
    method: 'POST',
    headers: authed(shopToken),
    body: JSON.stringify({ set: 3 }),
  })
);
check('stock adjust reflects + status flips', stockAdj.data?.stock === 3 && stockAdj.data?.status === 'Active');

// cross-vendor isolation: the pending test vendor can't edit shop's product
const otherToken = login.data.accessToken;
const idor = await fetch(`${BASE}/vendor/products/${created.data._id}`, {
  method: 'PATCH',
  headers: authed(otherToken),
  body: JSON.stringify({ name: 'hacked' }),
});
check('cross-vendor product edit blocked (404)', idor.status === 404);

await fetch(`${BASE}/vendor/products/${created.data._id}`, { method: 'DELETE', headers: authed(shopToken) });
const afterDel = await json(await fetch(`${BASE}/vendor/products`, { headers: authed(shopToken) }));
check('soft-deleted product leaves the list', afterDel.data?.length === 8);

// ── 5. Order status transition + ledger accrual ──────────
const shopUser = await User.findOne({ email: 'hello@pawsandclaws.com' });
const ownedProduct = await Product.findOne({ vendorId: shopUser._id });
await VendorLedgerEntry.deleteMany({ vendorId: shopUser._id });
const order = await Order.create({
  userId: (await User.findOne({ phone: normalizePhone('9000000001') }))._id,
  vendorId: shopUser._id,
  items: [{ productId: ownedProduct._id, name: ownedProduct.name, qty: 1, unitPrice: 500, total: 500 }],
  amounts: { subtotal: 50000, tax: 2500, delivery: 0, discount: 0, total: 52500 },
  addressSnapshot: { fullName: 'Phase9 Buyer' },
  paymentMethod: 'cod',
  status: 'placed',
  timeline: [{ status: 'placed', note: 'seeded for check' }],
});
const orders = await json(await fetch(`${BASE}/vendor/orders`, { headers: authed(shopToken) }));
check('vendor sees its order (mapped shape)', orders.data?.some((o) => o._id === String(order._id) && o.status === 'New'));

const packed = await json(
  await fetch(`${BASE}/vendor/orders/${order._id}/status`, {
    method: 'PATCH',
    headers: authed(shopToken),
    body: JSON.stringify({ status: 'packed' }),
  })
);
check('valid forward transition (New → Packed)', packed.data?.status === 'Packed');

const illegal = await fetch(`${BASE}/vendor/orders/${order._id}/status`, {
  method: 'PATCH',
  headers: authed(shopToken),
  body: JSON.stringify({ status: 'delivered' }),
});
check('illegal transition rejected (packed → delivered)', illegal.status === 400);

// ledger accrual via the same helper the order fulfilment path calls
const { postLedgerEntry } = await import('../src/modules/vendor/vendor.service.js');
await postLedgerEntry({ vendorId: shopUser._id, refType: 'order', refId: order._id, label: `Order ${order.orderNo}`, gross: 52500, commissionRate: 0.15 });
const ledger = await json(await fetch(`${BASE}/vendor/ledger`, { headers: authed(shopToken) }));
const entry = ledger.data?.find((e) => e.refId === String(order._id));
check('commission ledger accrues (15%)', entry?.gross === 52500 && entry?.commission === 7875 && entry?.net === 44625);

// idempotent: second post for same ref does not duplicate
await postLedgerEntry({ vendorId: shopUser._id, refType: 'order', refId: order._id, gross: 52500, commissionRate: 0.15 });
const ledger2 = await json(await fetch(`${BASE}/vendor/ledger`, { headers: authed(shopToken) }));
check('ledger entry idempotent on (refType, refId)', ledger2.data?.filter((e) => e.refId === String(order._id)).length === 1);

// ── 6. Dashboard stats ───────────────────────────────────
const dash = await json(await fetch(`${BASE}/vendor/dashboard`, { headers: authed(shopToken) }));
check('shop dashboard returns stats', typeof dash.data?.products === 'number' && dash.data.products === 8 && dash.data.pendingSettlement > 0);

// cleanup test order
await Order.deleteOne({ _id: order._id });

/* ══ Fresh Meals Partner portal ═══════════════════ */

const mealLogin = await json(
  await fetch(`${BASE}/vendor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'partner@wholesomebowl.com', password: 'vendor123' }),
  })
);
check('meal vendor logs in', Boolean(mealLogin.data?.accessToken) && mealLogin.data?.profile?.vendorType === 'meal_subscription');
const mealToken = mealLogin.data.accessToken;
const mealUser = await User.findOne({ email: 'partner@wholesomebowl.com' });
// idempotency: purge any test plans left by a prior run
await MealPlan.deleteMany({ name: { $in: ['Phase9 Lamb Diet', 'X'] } });

// requireType isolation: shop token cannot hit meal endpoints
const wrongType = await fetch(`${BASE}/vendor/meal-plans`, { headers: authed(shopToken) });
check('vendorType guard blocks cross-portal access (403)', wrongType.status === 403);

const plans = await json(await fetch(`${BASE}/vendor/meal-plans`, { headers: authed(mealToken) }));
check('meal vendor sees seeded plans', plans.data?.length === 3);

const newPlan = await json(
  await fetch(`${BASE}/vendor/meal-plans`, {
    method: 'POST',
    headers: authed(mealToken),
    body: JSON.stringify({ name: 'Phase9 Lamb Diet', price: 1400, petType: 'Dog', mealType: 'Fresh Cooked', duration: 'Weekly', calories: '420 kcal' }),
  })
);
check('create meal plan (meta persisted)', newPlan.data?.name === 'Phase9 Lamb Diet' && newPlan.data?.calories === '420 kcal');

const updPlan = await json(
  await fetch(`${BASE}/vendor/meal-plans/${newPlan.data._id}`, {
    method: 'PATCH',
    headers: authed(mealToken),
    body: JSON.stringify({ status: 'Inactive', protein: '14%' }),
  })
);
check('update meal plan (status + meta)', updPlan.data?.status === 'Inactive' && updPlan.data?.protein === '14%');

await fetch(`${BASE}/vendor/meal-plans/${newPlan.data._id}`, { method: 'DELETE', headers: authed(mealToken) });

// seed a paid subscription + a preparing delivery for this provider
const buyer = await User.findOne({ phone: normalizePhone('9000000001') });
await MealOrder.deleteMany({ providerId: mealUser._id, orderNo: { $in: ['ord_p9sub', 'ord_p9del'] } });
const sub = await MealOrder.create({ orderNo: 'ord_p9sub', userId: buyer._id, providerId: mealUser._id, type: 'package', items: [{ name: 'Fresh Chicken & Veggie', quantity: 1, price: 1250 }], total: 125000, mealsAdded: 8, status: 'Active' });
const del = await MealOrder.create({ orderNo: 'ord_p9del', userId: buyer._id, providerId: mealUser._id, type: 'prepaid', items: [{ name: 'Grain-Free Salmon', quantity: 3, price: 0 }], total: 0, mealsUsed: 3, status: 'Preparing' });

const subs = await json(await fetch(`${BASE}/vendor/subscriptions`, { headers: authed(mealToken) }));
check('subscriptions list shows the package order', subs.data?.some((s) => s._id === String(sub._id) && s.status === 'Active'));

const kq = await json(await fetch(`${BASE}/vendor/kitchen-queue`, { headers: authed(mealToken) }));
check('kitchen queue aggregates preparing orders', kq.data?.some((k) => k.type === 'Grain-Free Salmon' && k.qty === 3));

const dels = await json(await fetch(`${BASE}/vendor/deliveries`, { headers: authed(mealToken) }));
check('deliveries list shows active order', dels.data?.some((d) => d._id === String(del._id) && d.status === 'Preparing'));

const badMove = await fetch(`${BASE}/vendor/deliveries/${del._id}/status`, {
  method: 'PATCH',
  headers: authed(mealToken),
  body: JSON.stringify({ status: 'Delivered' }),
});
check('illegal delivery transition rejected (Preparing → Delivered)', badMove.status === 400);

const goodMove = await json(
  await fetch(`${BASE}/vendor/deliveries/${del._id}/status`, {
    method: 'PATCH',
    headers: authed(mealToken),
    body: JSON.stringify({ status: 'Out for Delivery' }),
  })
);
check('valid delivery transition (Preparing → Out for Delivery)', goodMove.data?.status === 'Out for Delivery');

const loc = await json(
  await fetch(`${BASE}/vendor/deliveries/${del._id}/location`, {
    method: 'POST',
    headers: authed(mealToken),
    body: JSON.stringify({ lat: 22.71, lng: 75.85, eta: '15 mins' }),
  })
);
check('rider location broadcast accepted', loc.data?.orderId === String(del._id) && loc.data?.eta === '15 mins');

// cleanup meal test orders
await MealOrder.deleteMany({ _id: { $in: [sub._id, del._id] } });

/* ══ Events Partner portal ═════════════════════════ */

const evLogin = await json(
  await fetch(`${BASE}/vendor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'partner@pawfectevents.com', password: 'vendor123' }),
  })
);
check('events vendor logs in', Boolean(evLogin.data?.accessToken) && evLogin.data?.profile?.vendorType === 'events');
const evToken = evLogin.data.accessToken;
const evUser = await User.findOne({ email: 'partner@pawfectevents.com' });

const evList = await json(await fetch(`${BASE}/vendor/events`, { headers: authed(evToken) }));
check('events vendor sees its seeded events', evList.data?.length === 5);

const newEvent = await json(
  await fetch(`${BASE}/vendor/events`, {
    method: 'POST',
    headers: authed(evToken),
    body: JSON.stringify({ title: 'Phase9 Puppy Social', category: 'Social Meetup', price: 400, capacity: 30, date: '2026-08-01', time: '10:00 AM', location: 'Central Park', status: 'Draft' }),
  })
);
check('create event (draft, date round-trips)', newEvent.data?.title === 'Phase9 Puppy Social' && newEvent.data?.status === 'Draft' && newEvent.data?.date === '2026-08-01');

const published = await json(await fetch(`${BASE}/vendor/events/${newEvent.data._id}/publish`, { method: 'POST', headers: authed(evToken) }));
check('publish flips status to Published', published.data?.status === 'Published');

// capacity full → "Fully Booked" derived status
await Event.updateOne({ _id: newEvent.data._id }, { $set: { sold: 30 } });
const evList2 = await json(await fetch(`${BASE}/vendor/events`, { headers: authed(evToken) }));
check('full event shows Fully Booked', evList2.data?.find((e) => e._id === newEvent.data._id)?.status === 'Fully Booked');

// packages + addons CRUD
const pkgs = await json(await fetch(`${BASE}/vendor/event-packages`, { headers: authed(evToken) }));
check('seeded event packages present', pkgs.data?.length === 2);
const newPkg = await json(
  await fetch(`${BASE}/vendor/event-packages`, { method: 'POST', headers: authed(evToken), body: JSON.stringify({ name: 'Photoshoot Only', price: 5000, duration: '1 Hour', maxPets: 1, status: 'Inactive' }) })
);
check('create event package', newPkg.data?.name === 'Photoshoot Only' && newPkg.data?.status === 'Inactive');
await fetch(`${BASE}/vendor/event-packages/${newPkg.data._id}`, { method: 'DELETE', headers: authed(evToken) });

const addons = await json(await fetch(`${BASE}/vendor/event-addons`, { headers: authed(evToken) }));
check('seeded event add-ons present', addons.data?.length === 2);

// requests inbox + status update (reset seeded request for idempotent re-runs)
await CustomerRequest.updateOne({ vendorId: evUser._id, customer: 'Amit Patel' }, { $set: { status: 'New' } });
const reqs = await json(await fetch(`${BASE}/vendor/event-requests`, { headers: authed(evToken) }));
check('custom-event request inbox populated', reqs.data?.some((r) => r.customer === 'Amit Patel' && r.status === 'New'));
const quoted = await json(
  await fetch(`${BASE}/vendor/event-requests/${reqs.data[0]._id}`, { method: 'PATCH', headers: authed(evToken), body: JSON.stringify({ status: 'Quotation Sent' }) })
);
check('request status transitions', quoted.data?.status === 'Quotation Sent');

// gallery add/remove
const gal = await json(
  await fetch(`${BASE}/vendor/event-gallery`, { method: 'POST', headers: authed(evToken), body: JSON.stringify({ url: 'https://res.cloudinary.com/demo/image/upload/party.jpg', caption: 'Bella bash' }) })
);
check('gallery item added', Boolean(gal.data?._id) && gal.data?.caption === 'Bella bash');
await fetch(`${BASE}/vendor/event-gallery/${gal.data._id}`, { method: 'DELETE', headers: authed(evToken) });

// event booking appears + commission ledger via booking onPaid helper path
const seedEvent = evList.data[0];
await Booking.deleteMany({ bookingNo: 'TCG-P9EVT' });
const evBooking = await Booking.create({
  bookingNo: 'TCG-P9EVT', userId: buyer._id, type: 'event', eventId: seedEvent._id,
  items: [{ kind: 'ticket', name: seedEvent.title, price: seedEvent.price, qty: 2 }],
  amounts: { base: 100000, addons: 0, discount: 0, tax: 0, total: 100000 },
  meta: { ticketQty: 2, addOns: ['Cake'] }, paymentMethod: 'razorpay', status: 'confirmed',
  timeline: [{ status: 'confirmed', note: 'seeded' }],
});
const evBookings = await json(await fetch(`${BASE}/vendor/event-bookings`, { headers: authed(evToken) }));
check('event booking shows in vendor list', evBookings.data?.some((b) => b._id === String(evBooking._id) && b.tickets === 2));

const chk = await json(await fetch(`${BASE}/vendor/event-bookings/${evBooking._id}/checkin`, { method: 'POST', headers: authed(evToken) }));
check('booking check-in flips flag', chk.data?.checkedIn === true);

await VendorLedgerEntry.deleteMany({ vendorId: evUser._id, refId: evBooking._id });
const { postLedgerEntry: postEv } = await import('../src/modules/vendor/vendor.service.js');
await postEv({ vendorId: evUser._id, refType: 'booking', refId: evBooking._id, label: 'Event booking', gross: 100000, commissionRate: 0.15 });
const evLedger = await json(await fetch(`${BASE}/vendor/ledger`, { headers: authed(evToken) }));
check('event booking commission accrues (15%)', evLedger.data?.find((e) => e.refId === String(evBooking._id))?.commission === 15000);

// isolation: meal token cannot access events endpoints
const evIsolation = await fetch(`${BASE}/vendor/events`, { headers: authed(mealToken) });
check('vendorType guard blocks meal→events access (403)', evIsolation.status === 403);

// cleanup events test data
await Booking.deleteOne({ _id: evBooking._id });
await Event.deleteOne({ _id: newEvent.data._id });

/* ══ Last Ride Partner portal ════════════════════════════ */

const memLogin = await json(
  await fetch(`${BASE}/vendor/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'partner@rainbowbridge.com', password: 'vendor123' }),
  })
);
check('memorial vendor logs in', Boolean(memLogin.data?.accessToken) && memLogin.data?.profile?.vendorType === 'memorial');
const memToken = memLogin.data.accessToken;
const memUser = await User.findOne({ email: 'partner@rainbowbridge.com' });

const svcs = await json(await fetch(`${BASE}/vendor/memorial-services`, { headers: authed(memToken) }));
check('memorial services seeded (₹ formatted)', svcs.data?.length === 3 && svcs.data.some((s) => s.price === '₹4,500'));

const memAddons = await json(await fetch(`${BASE}/vendor/memorial-addons`, { headers: authed(memToken) }));
check('memorial add-ons seeded', memAddons.data?.length === 3);

const teamList = await json(await fetch(`${BASE}/vendor/memorial-team`, { headers: authed(memToken) }));
check('memorial team seeded', teamList.data?.length === 3 && teamList.data.some((t) => t.name === 'Ravi Kumar'));

const newMember = await json(
  await fetch(`${BASE}/vendor/memorial-team`, { method: 'POST', headers: authed(memToken), body: JSON.stringify({ name: 'Phase9 Helper', role: 'Coordinator', phone: '9000000099' }) })
);
check('add team member', newMember.data?.name === 'Phase9 Helper' && newMember.data?.status === 'Available');
await fetch(`${BASE}/vendor/memorial-team/${newMember.data._id}`, { method: 'DELETE', headers: authed(memToken) });

const reqList = await json(await fetch(`${BASE}/vendor/memorial-requests`, { headers: authed(memToken) }));
check('memorial requests pipeline populated', reqList.data?.length >= 2 && reqList.data.some((r) => r.customerName === 'Aarti Sharma'));

// walk-in create
const walkIn = await json(
  await fetch(`${BASE}/vendor/memorial-requests`, { method: 'POST', headers: authed(memToken), body: JSON.stringify({ customerName: 'Phase9 Walkin', petName: 'Coco', serviceType: 'Burial Service', urgency: 'Urgent', amount: 5000 }) })
);
check('create walk-in request', walkIn.data?.customerName === 'Phase9 Walkin' && walkIn.data?.status === 'Pending');

// assign team → status Assigned
const teamMemberId = teamList.data[0]._id;
const assigned = await json(
  await fetch(`${BASE}/vendor/memorial-requests/${walkIn.data._id}/assign`, { method: 'POST', headers: authed(memToken), body: JSON.stringify({ teamId: teamMemberId }) })
);
check('assign team → status Assigned', assigned.data?.status === 'Assigned' && assigned.data?.assignedTeam === 'Ravi Kumar');

// upload proof → Completed + ledger accrues (walk-in amount ₹5000 = 500000 paise)
await VendorLedgerEntry.deleteMany({ vendorId: memUser._id, refId: walkIn.data._id });
const proof = await json(
  await fetch(`${BASE}/vendor/memorial-requests/${walkIn.data._id}/proof`, { method: 'POST', headers: authed(memToken), body: JSON.stringify({ url: 'https://res.cloudinary.com/demo/image/upload/proof.jpg', note: 'Service completed' }) })
);
check('upload proof → Completed', proof.data?.status === 'Completed' && proof.data?.proof?.url?.includes('proof.jpg'));

const memLedger = await json(await fetch(`${BASE}/vendor/ledger`, { headers: authed(memToken) }));
check('memorial completion accrues commission (15%)', memLedger.data?.find((e) => e.refId === String(walkIn.data._id))?.commission === 75000);

const kpis = await json(await fetch(`${BASE}/vendor/memorial-kpis`, { headers: authed(memToken) }));
check('memorial KPIs computed', typeof kpis.data?.completedServices === 'number' && kpis.data.completedServices >= 1);

// isolation: events token cannot access memorial endpoints
const memIsolation = await fetch(`${BASE}/vendor/memorial-requests`, { headers: authed(evToken) });
check('vendorType guard blocks events→memorial access (403)', memIsolation.status === 403);

// payout request: bundles unsettled ledger into a pending Payout
const payoutReq = await json(await fetch(`${BASE}/vendor/payouts/request`, { method: 'POST', headers: authed(memToken) }));
check('payout request bundles unsettled earnings', payoutReq.data?.status === 'pending' && payoutReq.data?.netAmount > 0);
const memLedger2 = await json(await fetch(`${BASE}/vendor/ledger`, { headers: authed(memToken) }));
check('ledger entries flip to settled after payout', memLedger2.data?.every((e) => e.status === 'settled'));

// cleanup memorial test data
await MemorialRequest.deleteOne({ _id: walkIn.data._id });
await TeamMember.deleteMany({ vendorId: memUser._id, name: 'Phase9 Helper' });

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
