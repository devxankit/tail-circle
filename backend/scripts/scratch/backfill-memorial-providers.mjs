/**
 * Give every memorial vendor the Provider record their portal needs.
 *
 * The memorial dashboard resolves the vendor's own `Provider` before it can
 * list, claim or resolve customer requests — and a vendor without one gets
 * "No memorial provider profile linked to this account yet" on every load, so
 * incoming requests from grieving owners are simply invisible to them.
 *
 * Signup creates this record now; vendors approved before that mapping existed
 * (or seeded straight into the database) never got one.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import { Provider } from '../../src/modules/provider/provider.model.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const vendors = await VendorProfile.find({ vendorType: 'memorial' })
    .select('userId businessName city approvalStatus');
  console.log(`${vendors.length} memorial vendors\n`);

  let created = 0;
  let ok = 0;

  for (const vendor of vendors) {
    const existing = await Provider.findOne({ vendorUserId: vendor.userId, type: 'memorial' });
    if (existing) {
      console.log(`  == ${vendor.businessName}: already linked`);
      ok += 1;
      continue;
    }

    await Provider.create({
      vendorUserId: vendor.userId,
      type: 'memorial',
      name: vendor.businessName,
      distanceText: vendor.city || '',
      supportedPets: ['Dogs', 'Cats'],
      // An end-of-life service has no salon/home choice and no slot template.
      visitTypes: [],
      details: {},
      // Mirror the vendor's own standing rather than forcing a fresh review.
      approvalStatus: vendor.approvalStatus === 'approved' ? 'approved' : 'pending',
      active: true,
    });
    console.log(`  ++ ${vendor.businessName}: provider record created (${vendor.approvalStatus})`);
    created += 1;
  }

  console.log(`\n${created} created, ${ok} already linked`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
