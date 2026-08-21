import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { VENDOR_TYPES } from '../src/modules/vendor/vendor.models.js';
import { vendorPasswordLogin, resolveVendorType } from '../src/modules/vendor/vendor.auth.service.js';
import { VENDOR_TYPE_LABEL } from '../src/modules/vendor/vendorTypeLabels.js';

const VENDOR_PORTALS = {
  shop: '/vendor/shop-provider',
  clinic: '/vendor/doctor/consultations',
  meal_subscription: '/vendor/meal-provider/dashboard',
  events: '/vendor/events-organizer',
  memorial: '/vendor/memorial-provider',
  grooming: '/vendor/grooming-provider',
  daycare: '/vendor/daycare-provider',
  adoption: '/vendor/adoption-partner',
};

const DEMO_EMAILS = {
  shop: 'hello@pawsandclaws.com',
  clinic: 'partner@happypaws.com',
  meal_subscription: 'partner@wholesomebowl.com',
  events: 'partner@pawfectevents.com',
  memorial: 'partner@rainbowbridge.com',
  grooming: 'partner@clippaw.com',
  daycare: 'partner@happytails.com',
  adoption: 'partner@secondchance.com',
};

async function testAllVendorTypes() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  console.log('\n--- 1. AUDITING VENDOR_TYPES SCHEMA & LABELS ---');
  let missingLabels = 0;
  for (const vt of VENDOR_TYPES) {
    const label = VENDOR_TYPE_LABEL[vt];
    const portal = VENDOR_PORTALS[vt];
    if (!label) {
      console.error(`❌ MISSING LABEL for vendorType: ${vt}`);
      missingLabels++;
    } else if (!portal) {
      console.error(`❌ MISSING PORTAL ROUTE for vendorType: ${vt}`);
      missingLabels++;
    } else {
      console.log(`  ✓ ${vt.padEnd(18)} → Label: "${label.padEnd(22)}" → Portal: ${portal}`);
    }
  }
  if (missingLabels === 0) console.log('✅ ALL 8 VENDOR TYPES HAVE VALID LABELS & PORTAL ROUTES');

  console.log('\n--- 2. AUDITING FRONTEND SLUG RESOLUTION ---');
  const slugTestCases = [
    { slug: 'shop', expected: 'shop' },
    { slug: 'doctor', expected: 'clinic' },
    { slug: 'clinic', expected: 'clinic' },
    { slug: 'meal', expected: 'meal_subscription' },
    { slug: 'meal_subscription', expected: 'meal_subscription' },
    { slug: 'event', expected: 'events' },
    { slug: 'events', expected: 'events' },
    { slug: 'memorial', expected: 'memorial' },
    { slug: 'grooming', expected: 'grooming' },
    { slug: 'daycare', expected: 'daycare' },
    { slug: 'adopt', expected: 'adoption' },
    { slug: 'adoption', expected: 'adoption' },
  ];

  let slugErrors = 0;
  for (const tc of slugTestCases) {
    try {
      const res = resolveVendorType(tc.slug);
      if (res !== tc.expected) {
        console.error(`❌ Slug "${tc.slug}" resolved to "${res}", expected "${tc.expected}"`);
        slugErrors++;
      } else {
        console.log(`  ✓ Slug "${tc.slug.padEnd(18)}" → "${res}"`);
      }
    } catch (err) {
      console.error(`❌ Slug "${tc.slug}" threw error:`, err.message);
      slugErrors++;
    }
  }
  if (slugErrors === 0) console.log('✅ ALL FRONTEND SLUGS RESOLVE CORRECTLY');

  console.log('\n--- 3. AUDITING ACCOUNTS & CROSS-CATEGORY LOGIN SECURITY ---');

  let securityPasses = 0;
  let securityFails = 0;

  for (const vt of VENDOR_TYPES) {
    const demoEmail = DEMO_EMAILS[vt];
    const user = await User.findOne({ email: demoEmail });
    if (!user) {
      console.log(`  ⚠️ Demo account ${demoEmail} not found for category "${vt}"`);
      continue;
    }

    // A) Login with correct category
    try {
      await vendorPasswordLogin(user.email, 'vendor123', vt);
      console.log(`  ✓ [MATCH] ${vt.padEnd(18)}: Login succeeded for ${user.email}`);
      securityPasses++;
    } catch (err) {
      console.error(`  ❌ [MATCH] ${vt.padEnd(18)}: Unexpected login failure for ${user.email}: ${err.message}`);
      securityFails++;
    }

    // B) Login with incorrect category -> MUST fail with 403 Forbidden
    const wrongType = vt === 'shop' ? 'clinic' : 'shop';
    try {
      await vendorPasswordLogin(user.email, 'vendor123', wrongType);
      console.error(`  ❌ [MISMATCH] ${vt.padEnd(18)}: Logged in under wrong category "${wrongType}"!`);
      securityFails++;
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('registered under')) {
        console.log(`  ✓ [MISMATCH] ${vt.padEnd(18)}: Mismatch correctly blocked ("${err.message}")`);
        securityPasses++;
      } else {
        console.error(`  ❌ [MISMATCH] ${vt.padEnd(18)}: Unexpected error:`, err.message);
        securityFails++;
      }
    }
  }

  await mongoose.disconnect();
  console.log(`\nVerification complete. Passes: ${securityPasses}, Fails: ${securityFails}`);
}

testAllVendorTypes().catch(console.error);
