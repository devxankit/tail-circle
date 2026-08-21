/**
 * Give every daycare centre its own plans, priced from its own rates.
 *
 * The three daycare plans were seeded once as platform-wide rows
 * (`providerId: null`), so every centre offered the same ₹499 / ₹2499 / ₹7999
 * while its card advertised its own pricePerDay/Week/Month — the customer saw
 * one number and was billed another. Plans now belong to the centre; the shared
 * rows are deactivated (not deleted, so historical bookings keep their
 * reference) once each centre has its own.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Provider } from '../../src/modules/provider/provider.model.js';
import { ServiceOffering } from '../../src/modules/provider/serviceOffering.model.js';

const TEMPLATES = [
  {
    suffix: 'plan_day', name: 'Day Pass', unit: 'day', key: 'pricePerDay', fallback: 499,
    description: 'Perfect for single day care.',
    includes: ['Playtime', 'Rest Area', 'Basic Care'], badge: null,
  },
  {
    suffix: 'plan_week', name: 'Weekly Care', unit: 'week', key: 'pricePerWeek', fallback: 2499,
    description: '6 days daycare. Best for working pet parents.',
    includes: ['6 Days Access', 'Priority Slots', 'Playtime', 'Rest Area'], badge: 'Most Popular',
  },
  {
    suffix: 'plan_month', name: 'Monthly Care', unit: 'month', key: 'pricePerMonth', fallback: 7999,
    description: 'Priority slots + discount. Best value.',
    includes: ['Unlimited Access', 'Priority Slots', 'Special Discounts', 'Extra Playtime'], badge: 'Best Value',
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const centres = await Provider.find({ type: 'daycare' }).select('name legacyId details');
  console.log(`${centres.length} daycare centres\n`);

  let created = 0;
  let skipped = 0;

  for (const centre of centres) {
    const own = await ServiceOffering.countDocuments({
      providerId: centre._id, providerType: 'daycare', kind: 'plan',
    });
    if (own > 0) {
      console.log(`  == ${centre.name}: already has ${own} plans of its own`);
      skipped += 1;
      continue;
    }

    for (const t of TEMPLATES) {
      const price = Number(centre.details?.[t.key]) || t.fallback;
      await ServiceOffering.updateOne(
        { providerId: centre._id, providerType: 'daycare', kind: 'plan', unit: t.unit },
        {
          $set: {
            legacyId: centre.legacyId ? `${centre.legacyId}_${t.suffix}` : undefined,
            name: t.name, price, description: t.description,
            includes: t.includes, badge: t.badge, active: true,
          },
        },
        { upsert: true }
      );
      created += 1;
    }
    console.log(
      `  ++ ${centre.name}: ` +
      TEMPLATES.map((t) => `${t.name} Rs${Number(centre.details?.[t.key]) || t.fallback}`).join(', ')
    );
  }

  // Retire the shared plans now that every centre carries its own. Add-ons stay
  // platform-wide on purpose — they really are a shared extras list.
  const retired = await ServiceOffering.updateMany(
    { providerId: null, providerType: 'daycare', kind: 'plan' },
    { $set: { active: false } }
  );

  console.log(`\n${created} plans written, ${skipped} centres left alone`);
  console.log(`${retired.modifiedCount} platform-wide daycare plans deactivated`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
