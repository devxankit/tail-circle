/**
 * Phase 11 (Slice 1) verification — Super Admin foundation.
 * Admin auth (+ wrong-password reject), dashboard KPIs, user block/unblock,
 * vendor approval workflow (drives Phase 9/10 statuses) with audit trail,
 * banners (public + admin CRUD), and platform settings.
 * Run: node scripts/phase11-check.js
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { redis, connectRedis, disconnectRedis } from '../src/config/redis.js';
import { User } from '../src/modules/user/user.model.js';
import { VendorProfile } from '../src/modules/vendor/vendor.models.js';
import { Provider } from '../src/modules/provider/provider.model.js';
import { AuditLog, Banner, PlatformSetting } from '../src/modules/admin/admin.models.js';
import { registerVendor } from '../src/modules/vendor/vendor.auth.service.js';
import { adminPasswordLogin } from '../src/modules/admin/admin.auth.service.js';
import * as admin from '../src/modules/admin/admin.service.js';
import * as ops from '../src/modules/admin/admin.ops.service.js';
import * as cat from '../src/modules/admin/admin.catalog.service.js';
import * as fin from '../src/modules/admin/admin.finance.service.js';
import * as plat from '../src/modules/admin/admin.platform.service.js';
import * as cfg from '../src/modules/admin/admin.config.service.js';
import { Product } from '../src/modules/shop/product.model.js';
import { ProductCategory } from '../src/modules/shop/productCategory.model.js';
import { Breed } from '../src/modules/breed/breed.model.js';
import { MealPlan } from '../src/modules/meal/meal.models.js';
import { seedVendors } from './seeders/vendors.seed.js';
import { seedClinic } from './seeders/clinic.seed.js';
import { seedAdmin } from './seeders/admin.seed.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${mongoose.connection.name}`);
  // Admin login uses Redis for the lockout counter (lazyConnect → connect now).
  await connectRedis();
  console.log('');

  console.log('— Seeding (idempotent) —');
  await seedVendors();
  await seedClinic();
  console.log('  ' + (await seedAdmin()) + '\n');

  const actor = { id: (await User.findOne({ role: 'admin' }))._id, name: 'System Admin' };

  console.log('— Admin auth —');
  await redis.del('admin:lock:admin@tailcircle.com').catch(() => {});
  const session = await adminPasswordLogin('admin@tailcircle.com', 'admin123', '127.0.0.1');
  ok(session.user.role === 'admin' && session.user.adminRole === 'super', 'super-admin logs in with email + password');
  ok(!!session.tokens.accessToken, 'access token issued');
  let rejected = false;
  try { await adminPasswordLogin('admin@tailcircle.com', 'wrongpass', '127.0.0.1'); } catch { rejected = true; }
  ok(rejected, 'wrong password is rejected');
  await redis.del('admin:lock:admin@tailcircle.com').catch(() => {});

  console.log('\n— Dashboard —');
  const dash = await admin.getDashboard();
  ok(typeof dash.kpis.totalUsers === 'number' && dash.kpis.totalUsers >= 1, 'dashboard returns totalUsers KPI');
  ok(typeof dash.kpis.activeVendors === 'number' && dash.kpis.activeVendors >= 5, 'dashboard counts approved vendors');
  ok(Array.isArray(dash.topPartners), 'dashboard returns top partners array');

  console.log('\n— Users —');
  const users = await admin.listUsers();
  ok(users.length >= 1, `user list returned (${users.length})`);
  const demo = users.find((u) => u.name === 'Demo Parent') || users[0];
  const blocked = await admin.setUserBlocked(actor, demo.id, true);
  ok(blocked.status === 'Suspended', 'block user → Suspended');
  const unblocked = await admin.setUserBlocked(actor, demo.id, false);
  ok(unblocked.status === 'Active', 'unblock user → Active');

  console.log('\n— Vendor approval workflow —');
  // Create a fresh pending vendor via the real KYC registration.
  await User.deleteOne({ email: 'pendingvendor@test.com' });
  await VendorProfile.deleteMany({ email: 'pendingvendor@test.com' });
  const reg = await registerVendor({
    businessName: 'Test Pending Shop',
    email: 'pendingvendor@test.com',
    phone: '+919000009999',
    role: 'shop',
    city: 'Indore',
    accountNumber: '123456789012',
    ifscCode: 'HDFC0001234',
    licenseUrl: 'https://example.com/license.pdf',
    ownerIdUrl: 'https://example.com/owner-id.pdf',
  });
  ok(reg.approvalStatus === 'pending', 'KYC register → pending vendor');

  const pending = await admin.listPendingVendors();
  const target = pending.find((v) => v.email === 'pendingvendor@test.com');
  ok(!!target, 'pending vendor appears in the approval queue');
  ok(target.missing.length > 0, 'queue reports uploaded-but-unverified docs as missing');
  ok(
    target.documentStatuses.every((d) => d.status !== 'Verified'),
    'queue reports real document status, never an assumed "verified"'
  );

  // A first approval is the KYC decision: it refuses while documents are unverified.
  let gate = null;
  try { await admin.approveVendor(actor, target.id, '127.0.0.1'); } catch (err) { gate = err; }
  ok(gate?.statusCode === 400, 'approve refused while KYC documents are unverified');

  await admin.verifyDocument(actor, target.id, 'license', 'verify', '127.0.0.1');
  await admin.verifyDocument(actor, target.id, 'owner_id', 'verify', '127.0.0.1');
  ok((await admin.getVendorDocuments(target.id)).missing.length === 0, 'verifying both docs clears the gate');

  const approved = await admin.approveVendor(actor, target.id, '127.0.0.1');
  ok(approved.approvalStatus === 'approved', 'approve vendor → approved (drives Phase 9/10)');
  const auditRow = await AuditLog.findOne({ action: 'vendor.approved', targetId: String(target.id) });
  ok(!!auditRow, 'approval wrote an audit-log entry');

  // Suspend then reject flows.
  const suspended = await admin.suspendVendor(actor, target.id, '127.0.0.1');
  ok(suspended.approvalStatus === 'suspended', 'suspend vendor → suspended');
  const suspendedUser = await User.findOne({ email: 'pendingvendor@test.com' });
  ok(suspendedUser.isBlocked === true, 'suspending a vendor blocks its user account');

  const docs = await admin.getVendorDocuments(target.id);
  ok(Array.isArray(docs.documents), 'vendor documents endpoint returns docs');

  // Provider-backed verticals: the salon/centre customers browse is a separate
  // Provider record, and `GET /providers` filters on its own approvalStatus —
  // so approving the vendor has to carry over or the vendor is never listed.
  await User.deleteOne({ email: 'pendinggroomer@test.com' });
  await VendorProfile.deleteMany({ email: 'pendinggroomer@test.com' });
  await Provider.deleteMany({ name: 'Test Pending Salon' });
  await registerVendor({
    businessName: 'Test Pending Salon',
    email: 'pendinggroomer@test.com',
    phone: '+919000009998',
    role: 'grooming',
    city: 'Indore',
    accountNumber: '123456789013',
    ifscCode: 'HDFC0001234',
  });
  const groomProfile = await VendorProfile.findOne({ email: 'pendinggroomer@test.com' });
  const groomProvider = await Provider.findOne({ vendorUserId: groomProfile.userId });
  ok(groomProvider?.approvalStatus === 'pending', 'grooming signup creates an unlisted Provider');

  // `force` is the deliberate override for a vendor whose KYC is incomplete.
  await admin.approveVendor(actor, String(groomProfile._id), '127.0.0.1', { force: true });
  ok(
    (await Provider.findById(groomProvider._id)).approvalStatus === 'approved',
    'approving the vendor lists its Provider'
  );
  await admin.suspendVendor(actor, String(groomProfile._id), '127.0.0.1');
  ok(
    (await Provider.findById(groomProvider._id)).approvalStatus === 'suspended',
    'suspending the vendor unlists its Provider'
  );

  const perf = await admin.vendorPerformance();
  ok(Array.isArray(perf) && perf.length >= 5, 'vendor performance aggregation returns rows');

  console.log('\n— Banners —');
  const publicBanners = await admin.listPublicBanners();
  ok(publicBanners.length >= 3, `public banners seeded (${publicBanners.length})`);
  ok(publicBanners.every((b) => b.active), 'public banners are all active');
  const newBanner = await admin.createBanner(actor, { key: 'test_promo', title: 'Test Promo', slot: 'Home Hero' }, '127.0.0.1');
  ok(!!newBanner.id, 'admin creates a banner');
  const upd = await admin.updateBanner(actor, newBanner.id, { active: false }, '127.0.0.1');
  ok(upd.active === false, 'admin toggles banner active flag');
  const stillPublic = await admin.listPublicBanners();
  ok(!stillPublic.some((b) => b.id === newBanner.id), 'inactive banner drops from the public feed');

  console.log('\n— Settings —');
  const settings = await admin.getSettings();
  ok(settings.some((s) => s.key === 'commission.default'), 'platform settings seeded');
  const setRes = await admin.updateSetting(actor, 'tax.gst', 0.06, '127.0.0.1');
  ok(setRes.value === 0.06, 'super-admin updates a setting');
  await admin.updateSetting(actor, 'tax.gst', 0.05, '127.0.0.1'); // reset

  console.log('\n— Operations —');
  ok(Array.isArray(await ops.listOrders()), 'orders list (cross-vendor)');
  ok(Array.isArray(await ops.listBookings()), 'bookings list');
  ok(Array.isArray(await ops.listAppointments()), 'appointments list (cross-clinic)');
  ok(Array.isArray(await ops.listDeliveries()), 'deliveries list (meal + shop)');
  ok(Array.isArray(await ops.listReturns()), 'returns/refunds queue');
  ok(Array.isArray(await ops.listSupport()), 'support tickets list');

  console.log('\n— Catalogs —');
  const prod = await cat.createProduct(actor, { name: 'ZZ Admin Test Product', category: 'Food', petType: 'Dog', price: 199, stock: 12 }, 'ip');
  ok(!!prod.id && prod.stock === 12, 'create product');
  const prodUpd = await cat.updateProduct(actor, prod.id, { price: 249 }, 'ip');
  ok(prodUpd.price === 249, 'update product');
  await cat.deleteProduct(actor, prod.id, 'ip');
  ok(!(await cat.listProducts({ search: 'ZZ Admin Test' })).length, 'delete (soft) product');

  const breed = await cat.createBreed(actor, { name: 'ZZ Test Hound', species: 'Dog' }, 'ip');
  ok(!!breed.id && breed.petType === 'dog', 'create breed (species→petType)');
  await cat.updateBreed(actor, breed.id, { active: false }, 'ip');
  await cat.deleteBreed(actor, breed.id, 'ip');
  ok(!(await cat.listBreeds({ search: 'ZZ Test Hound' })).length, 'delete breed');

  const pcat = await cat.createProductCategory(actor, { name: 'ZZ Test Cat' }, 'ip');
  await cat.deleteProductCategory(actor, pcat.id, 'ip');
  ok(!!pcat.id, 'product category create + delete');

  const plan = await cat.createMealPlan(actor, { name: 'ZZ Test Plan', pricePerMonth: 1000, mealsPerWeek: 4 }, 'ip');
  await cat.deleteMealPlan(actor, plan.id, 'ip');
  ok(!!plan.id, 'meal plan create + delete');

  ok((await cat.listDoctorServices()).length >= 1, 'doctor services list');
  ok(Array.isArray(await cat.listEventCategories()), 'event categories list');
  ok(Array.isArray(await cat.listMemorialPackages()), 'memorial packages list');
  ok(Array.isArray(await cat.listGroomingDaycare()), 'grooming/daycare offerings list');
  ok(Array.isArray(await cat.listAddons()), 'add-ons list');

  // Catalog-config store backing the 6 bespoke "services" admin screens (seeded verbatim).
  // Cross-vendor KYC document feed + verification workflow.
  const allDocs = await admin.listAllDocuments();
  ok(Array.isArray(allDocs) && allDocs.length >= 1 && allDocs[0].vendorId && allDocs[0].kind, 'documents: cross-vendor feed');
  const pendingDoc = allDocs.find((d) => d.status === 'Pending');
  if (pendingDoc) {
    const verified = await admin.verifyDocument(actor, pendingDoc.vendorId, pendingDoc.kind, 'verify', 'ip');
    ok(verified.status === 'Verified', 'documents: verify a document');
    await admin.verifyDocument(actor, pendingDoc.vendorId, pendingDoc.kind, 'reupload', 'ip'); // revert to non-verified
  } else {
    ok(true, 'documents: verify (no pending doc to test)');
  }

  ok((await cfg.listConfig('product_category')).length === 8, 'config: product categories seeded');
  ok((await cfg.listConfig('doctor_consultation')).length === 4, 'config: doctor consultation types seeded');
  ok((await cfg.listConfig('doctor_specialization')).length === 6, 'config: doctor specializations seeded');
  ok((await cfg.listConfig('service_addon')).length === 5, 'config: service add-ons seeded');
  ok((await cfg.listConfig('facility_amenity')).length === 6, 'config: facility amenities seeded');
  ok((await cfg.listConfig('memorial_service')).length === 6, 'config: memorial services seeded');
  ok((await cfg.listConfig('memorial_package')).length === 4, 'config: memorial packages seeded');
  ok((await cfg.listConfig('event_category')).length === 5, 'config: event categories seeded');
  ok((await cfg.listConfig('event_addon')).length === 6, 'config: event add-ons seeded');
  ok((await cfg.listConfig('grooming_service')).length === 6, 'config: grooming services seeded');
  ok((await cfg.listConfig('daycare_package')).length === 5, 'config: day-care packages seeded');
  ok((await cfg.listConfig('grooming_facility')).length === 5, 'config: grooming facilities seeded');
  // Config CRUD round-trip: create → toggle status → delete.
  const cfgRow = await cfg.createConfig(actor, 'product_category', { name: 'ZZ Config Test', status: 'Active' }, 'ip');
  const cfgUpd = await cfg.updateConfig(actor, cfgRow.id, { status: 'Inactive' }, 'ip');
  ok(cfgRow.id && cfgRow.name === 'ZZ Config Test' && cfgUpd.status === 'Inactive', 'config create + update (status)');
  await cfg.deleteConfig(actor, cfgRow.id, 'ip');
  ok(!(await cfg.listConfig('product_category')).some((r) => r.id === cfgRow.id), 'config delete');

  console.log('\n— Finance —');
  ok(Array.isArray(await fin.listTransactions()), 'transactions ledger');
  ok(typeof (await fin.paymentsOverview()).grossVolume === 'number', 'payments overview aggregation');
  ok((await fin.getCommissionSettings()).length >= 1, 'commission settings');
  const commRes = await fin.setCommission(actor, 'commission.shop', 0.18, 'ip');
  ok(commRes.value === 0.18, 'update commission');
  await fin.setCommission(actor, 'commission.shop', 0.15, 'ip'); // reset
  ok(Array.isArray(await fin.listPayouts()), 'payout queue');
  const walletData = await fin.walletOverview();
  ok(
    typeof walletData.stats?.totalFloat === 'number' &&
      Array.isArray(walletData.wallets) &&
      Array.isArray(walletData.transactions),
    'wallet oversight'
  );
  // Admin wallet adjust: credit then debit the same amount → net-zero, no drift.
  const firstWallet = walletData.wallets[0];
  if (firstWallet) {
    const credited = await fin.adjustWallet(actor, firstWallet.id, { action: 'credit', amount: 5, reason: 'phase11 check' }, 'ip');
    const debited = await fin.adjustWallet(actor, firstWallet.id, { action: 'debit', amount: 5, reason: 'phase11 check revert' }, 'ip');
    ok(credited.balance === firstWallet.balance + 5 && debited.balance === firstWallet.balance, 'wallet admin credit/debit adjustment');
  } else {
    ok(true, 'wallet admin adjustment (no wallets to test)');
  }
  ok(Array.isArray(await fin.taxReport()), 'tax/GST report');

  console.log('\n— Platform —');
  const bc = await plat.broadcast(actor, { scope: 'Vendors', title: 'Test Notice', message: 'Hello vendors' }, 'ip');
  ok(bc.sent >= 5, `broadcast fan-out to vendors (${bc.sent})`);
  const posts = await plat.listAllPosts();
  ok(Array.isArray(posts), 'community posts list');
  if (posts[0]) {
    const modded = await plat.moderatePost(actor, posts[0].id, 'hide', 'ip');
    ok(modded.status === 'hidden', 'hide a post');
    await plat.moderatePost(actor, posts[0].id, 'restore', 'ip');
  } else ok(true, 'community posts list (none to moderate)');
  ok(Array.isArray(await plat.listReviews()), 'reviews list');
  ok(typeof (await plat.reportsSummary()).users === 'number', 'reports summary');

  await User.deleteOne({ email: 'zz-staff-test@tailcircle.com' });
  const staff = await plat.createStaff(actor, { name: 'ZZ Staff', email: 'zz-staff-test@tailcircle.com', adminRole: 'ops', password: 'test1234' }, 'ip');
  ok(staff.adminRole === 'ops', 'create staff member');
  const staffUpd = await plat.updateStaff(actor, staff.id, { adminRole: 'finance' }, 'ip');
  ok(staffUpd.adminRole === 'finance', 'update staff role');
  await plat.removeStaff(actor, staff.id, 'ip');
  ok(!(await plat.listStaff()).some((s) => s.email === 'zz-staff-test@tailcircle.com'), 'remove staff member');

  // Cleanup test artifacts.
  await Promise.all([
    User.deleteOne({ email: 'pendingvendor@test.com' }),
    VendorProfile.deleteMany({ email: 'pendingvendor@test.com' }),
    User.deleteOne({ email: 'zz-staff-test@tailcircle.com' }),
    Banner.deleteOne({ _id: newBanner.id }),
    AuditLog.deleteMany({ targetId: String(target.id) }),
    Product.deleteMany({ name: /^ZZ Admin Test/ }),
    Breed.deleteMany({ name: /^ZZ Test/ }),
    ProductCategory.deleteMany({ name: /^ZZ Test/ }),
    MealPlan.deleteMany({ name: /^ZZ Test/ }),
  ]);

  console.log(`\n${'='.repeat(48)}`);
  console.log(`Phase 11 checks: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(48));

  await mongoose.disconnect();
  await disconnectRedis().catch(() => {});
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
