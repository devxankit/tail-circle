/**
 * Remove the fixture accounts the e2e suites leave behind.
 *
 * Each suite upserts an approved vendor so it can exercise a real portal, but
 * only tears down the rows it created *inside* the test — the vendor account
 * itself survives. Nine of them had accumulated, and because they are approved
 * they show up in the admin vendor tables, the documents queue and the
 * performance report, inflating every count an operator looks at.
 *
 * Only touches accounts on the reserved `@tailcircle.test` domain.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../../src/modules/user/user.model.js';
import { VendorProfile, VendorLedgerEntry } from '../../src/modules/vendor/vendor.models.js';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { Doctor } from '../../src/modules/provider/doctor.model.js';
import { ServiceOffering } from '../../src/modules/provider/serviceOffering.model.js';
import { Booking } from '../../src/modules/booking/booking.model.js';
import { Order } from '../../src/modules/order/order.model.js';
import { Product } from '../../src/modules/shop/product.model.js';
import { AdoptionListing, AdoptionApplication } from '../../src/modules/adoption/adoption.models.js';
import { MealPlan, Meal, MealOrder, MealAccount } from '../../src/modules/meal/meal.models.js';
import { Event } from '../../src/modules/provider/event.model.js';
import { MemorialService, MemorialAddon, TeamMember, MemorialRequest } from '../../src/modules/vendor/memorial.models.js';
import { Pet } from '../../src/modules/pet/pet.model.js';
import { Address } from '../../src/modules/address/address.model.js';

const TEST_EMAIL = /@tailcircle\.test$/i;
const APPLY = !process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({ email: TEST_EMAIL }).select('_id email name role');
  if (!users.length) {
    console.log('No e2e fixture accounts found — nothing to purge.');
    await mongoose.disconnect();
    return;
  }

  const ids = users.map((u) => u._id);
  console.log(`${users.length} fixture account(s) on @tailcircle.test:\n`);
  for (const u of users) console.log(`   ${u.role.padEnd(7)} ${u.email}`);

  // Everything those accounts own, on either side of the marketplace.
  const providerIds = await Provider.find({ vendorUserId: { $in: ids } }).distinct('_id');
  const doctorIds = await Doctor.find({ clinicVendorId: { $in: ids } }).distinct('_id');
  const eventIds = await Event.find({ vendorId: { $in: ids } }).distinct('_id');
  const listingIds = await AdoptionListing.find({ vendorId: { $in: ids } }).distinct('_id');

  const steps = [
    ['bookings (as customer)', () => Booking.deleteMany({ userId: { $in: ids } })],
    ['bookings (at their venue)', () => Booking.deleteMany({ $or: [
      { providerId: { $in: providerIds } }, { doctorId: { $in: doctorIds } }, { eventId: { $in: eventIds } },
    ] })],
    ['orders', () => Order.deleteMany({ $or: [{ userId: { $in: ids } }, { 'items.vendorId': { $in: ids } }] })],
    ['products', () => Product.deleteMany({ vendorId: { $in: ids } })],
    ['service offerings', () => ServiceOffering.deleteMany({ providerId: { $in: providerIds } })],
    ['providers', () => Provider.deleteMany({ vendorUserId: { $in: ids } })],
    ['doctors', () => Doctor.deleteMany({ clinicVendorId: { $in: ids } })],
    ['events', () => Event.deleteMany({ vendorId: { $in: ids } })],
    ['adoption applications', () => AdoptionApplication.deleteMany({ $or: [
      { userId: { $in: ids } }, { listingId: { $in: listingIds } },
    ] })],
    ['adoption listings', () => AdoptionListing.deleteMany({ $or: [
      { vendorId: { $in: ids } }, { postedBy: { $in: ids } },
    ] })],
    ['meal plans', () => MealPlan.deleteMany({ providerId: { $in: ids } })],
    ['meal recipes', () => Meal.deleteMany({ providerId: { $in: ids } })],
    ['meal orders', () => MealOrder.deleteMany({ $or: [{ userId: { $in: ids } }, { providerId: { $in: ids } }] })],
    ['meal accounts', () => MealAccount.deleteMany({ userId: { $in: ids } })],
    ['memorial services', () => MemorialService.deleteMany({ vendorId: { $in: ids } })],
    ['memorial addons', () => MemorialAddon.deleteMany({ vendorId: { $in: ids } })],
    ['memorial team', () => TeamMember.deleteMany({ vendorId: { $in: ids } })],
    ['memorial requests', () => MemorialRequest.deleteMany({ vendorId: { $in: ids } })],
    ['pets', () => Pet.deleteMany({ ownerId: { $in: ids } })],
    ['addresses', () => Address.deleteMany({ userId: { $in: ids } })],
    ['ledger entries', () => VendorLedgerEntry.deleteMany({ vendorId: { $in: ids } })],
    ['vendor profiles', () => VendorProfile.deleteMany({ userId: { $in: ids } })],
    ['users', () => User.deleteMany({ _id: { $in: ids } })],
  ];

  console.log('');
  let total = 0;
  for (const [label, run] of steps) {
    if (!APPLY) continue;
    const res = await run();
    if (res.deletedCount) {
      console.log(`   removed ${String(res.deletedCount).padStart(3)}  ${label}`);
      total += res.deletedCount;
    }
  }

  console.log(
    APPLY
      ? `\n${total} document(s) removed.`
      : '\nDry run — nothing was written. Re-run without --dry-run to apply.'
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
