/**
 * Create (or reset) a Super Admin account for the admin panel login.
 *
 *   node scripts/create-admin.js                          # defaults / env vars
 *   node scripts/create-admin.js you@email.com  secret123 # explicit creds
 *
 * Credentials resolve in this order: CLI args → env (ADMIN_EMAIL / ADMIN_PASSWORD)
 * → demo defaults. Idempotent: re-running updates the same account's password.
 * Log in at /admin/login.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@tailcircle.com').toLowerCase().trim();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';
const name = process.env.ADMIN_NAME || 'System Admin';

async function main() {
  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        role: 'admin',
        adminRole: 'super',
        permissions: ['*'],
        passwordHash,
        isPhoneVerified: true,
        isBlocked: false,
      },
    },
    { upsert: true }
  );

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Super Admin ${existing ? 'updated' : 'created'}`);
  console.log('='.repeat(50));
  console.log(`  Login URL : /admin/login`);
  console.log(`  Email     : ${email}`);
  console.log(`  Password  : ${password}`);
  console.log(`  Role      : super`);
  console.log(`${'='.repeat(50)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to create admin:', err.message);
  process.exit(1);
});
