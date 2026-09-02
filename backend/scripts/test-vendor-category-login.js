import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { vendorPasswordLogin } from '../src/modules/vendor/vendor.auth.service.js';

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  const shopUser = await User.findOne({ email: 'hello@pawsandclaws.com' });
  if (!shopUser) {
    console.error('No shop vendor found');
    process.exit(1);
  }

  console.log(`Testing Shop User: ${shopUser.email} (Type: ${shopUser.vendorType})`);

  // Test 1: Wrong category (clinic selected for shop user)
  try {
    await vendorPasswordLogin(shopUser.email, 'vendor123', 'clinic');
    console.error('❌ FAIL: Expected vendor type mismatch error, but login succeeded!');
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('registered under')) {
      console.log('✅ PASS: Cross-category login blocked with message:', err.message);
    } else {
      console.error('❌ FAIL: Unexpected error:', err.message);
    }
  }

  // Test 2: Correct category (shop selected for shop user)
  try {
    const res = await vendorPasswordLogin(shopUser.email, 'vendor123', 'shop');
    console.log('✅ PASS: Correct category login succeeded for user:', res.user.email);
  } catch (err) {
    console.error('❌ FAIL: Correct category login failed:', err.message);
  }

  // Test 3: Adoption vendor category
  const adoptUser = await User.findOne({ email: 'partner@secondchance.com' });
  if (adoptUser) {
    console.log(`Testing Adoption User: ${adoptUser.email} (Type: ${adoptUser.vendorType})`);
    try {
      const res = await vendorPasswordLogin(adoptUser.email, 'vendor123', 'adoption');
      console.log('✅ PASS: Adoption partner category login succeeded:', res.user.email);
    } catch (err) {
      console.error('❌ FAIL: Adoption partner category login failed:', err.message);
    }

    // Test 3b: Wrong category selected for adoption partner
    try {
      await vendorPasswordLogin(adoptUser.email, 'vendor123', 'doctor');
      console.error('❌ FAIL: Expected mismatch error when logging in adoption partner as doctor');
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('registered under')) {
        console.log('✅ PASS: Cross-category login blocked for adoption partner:', err.message);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
