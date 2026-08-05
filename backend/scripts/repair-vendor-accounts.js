/**
 * Repair vendor accounts left in an unusable state.
 *
 *   node scripts/repair-vendor-accounts.js --dry-run
 *   node scripts/repair-vendor-accounts.js
 *   node scripts/repair-vendor-accounts.js --type grooming --password secret123
 *
 * A `role: 'vendor'` User needs three things to actually work:
 *   1. a `vendorType`      — routes the portal and gates every API
 *   2. a `VendorProfile`   — `withVendor` refuses the account without one
 *   3. for grooming/daycare, its OWN `Provider`
 *
 * Accounts created by the old unguarded grooming router have none of these:
 * it wrote a User but no profile, then adopted somebody else's salon. This
 * script completes them instead of deleting them, so nothing a real partner
 * signed up with is lost.
 *
 * Every repair is scoped to the account being fixed — a Provider is created
 * fresh, never claimed from another vendor.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { VendorProfile, VENDOR_TYPES } from '../src/modules/vendor/vendor.models.js';
import { Provider } from '../src/modules/provider/provider.model.js';
import { normalizePhone } from '../src/utils/phone.js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DEFAULT_TYPE = flag('type', 'grooming');
const PASSWORD = flag('password', 'vendor123');
const PROVIDER_BACKED = new Set(['grooming', 'daycare']);

/** Infer the intended vertical from the account's own name/email. */
function inferType(user) {
  const hay = `${user.name || ''} ${user.email || ''}`.toLowerCase();
  if (/groom|salon|spa/.test(hay)) return 'grooming';
  if (/daycare|boarding|creche/.test(hay)) return 'daycare';
  if (/clinic|vet|doctor/.test(hay)) return 'clinic';
  if (/meal|kitchen|bowl/.test(hay)) return 'meal_subscription';
  if (/event/.test(hay)) return 'events';
  if (/memorial|cremation|burial/.test(hay)) return 'memorial';
  if (/shop|store|mart/.test(hay)) return 'shop';
  return null;
}

async function main() {
  await mongoose.connect(env.mongoUri);

  /* Backfill any profile missing its registrationNo before doing anything else.
   * `registrationNo` is uniquely indexed, so more than one null makes every
   * subsequent insert fail with E11000. */
  const unnumbered = await VendorProfile.find({
    $or: [{ registrationNo: null }, { registrationNo: { $exists: false } }],
  });
  for (const p of unnumbered) {
    console.log(`  ↻ backfilling registrationNo for "${p.businessName}"`);
    if (!DRY_RUN) await p.save(); // pre-save hook generates it
  }

  const vendors = await User.find({ role: 'vendor' }).select('+passwordHash');
  const profiles = await VendorProfile.find({}).select('userId');
  const hasProfile = new Set(profiles.map((p) => String(p.userId)));

  const broken = vendors.filter((u) => !u.vendorType || !hasProfile.has(String(u._id)));

  console.log(`\n${'='.repeat(56)}`);
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : '🔧 Repairing vendor accounts');
  console.log('='.repeat(56));
  console.log(`  vendor accounts : ${vendors.length}`);
  console.log(`  needing repair  : ${broken.length}\n`);

  if (!broken.length) {
    console.log('  Nothing to repair.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const user of broken) {
    const type = user.vendorType || inferType(user) || DEFAULT_TYPE;
    if (!VENDOR_TYPES.includes(type)) {
      console.log(`  ⏭  ${user.email || user._id} — cannot infer a valid vendorType, skipped`);
      continue;
    }

    const missing = [];
    if (!user.vendorType) missing.push('vendorType');
    if (!hasProfile.has(String(user._id))) missing.push('VendorProfile');
    if (!user.passwordHash) missing.push('password');

    console.log(`  ${user.email || user._id}`);
    console.log(`     name       : ${user.name || '(none)'}`);
    console.log(`     missing    : ${missing.join(', ')}`);
    console.log(`     → vendorType: ${type}`);

    if (DRY_RUN) {
      if (PROVIDER_BACKED.has(type)) console.log('     → would create its own Provider');
      console.log('');
      continue;
    }

    /* 1. User */
    user.vendorType = type;
    if (user.phone) user.phone = normalizePhone(user.phone);
    // Only set a password where there is none — never overwrite a real one.
    if (!user.passwordHash) user.passwordHash = passwordHash;
    user.isPhoneVerified = true;
    await user.save();

    /* 2. VendorProfile — approved so the account is immediately usable.
     *
     * Built with `.save()` on purpose: `registrationNo` comes from a pre-save
     * hook, and `findOneAndUpdate({upsert})` bypasses document middleware,
     * leaving it null — which then collides on the unique index for the second
     * such profile (E11000 on `registrationNo: null`). */
    let profile = await VendorProfile.findOne({ userId: user._id });
    if (!profile) profile = new VendorProfile({ userId: user._id });
    profile.businessName = user.name || user.email;
    profile.vendorType = type;
    profile.email = user.email;
    profile.phone = user.phone || '';
    profile.approvalStatus = 'approved';
    profile.commissionRate = profile.commissionRate ?? 0.15;
    await profile.save();
    console.log(`     → VendorProfile ${profile.registrationNo}`);

    /* 3. Its OWN Provider, for the Provider-backed verticals. */
    if (PROVIDER_BACKED.has(type)) {
      let provider = await Provider.findOne({ vendorUserId: user._id, type });
      if (!provider) {
        provider = await Provider.create({
          vendorUserId: user._id,
          type,
          name: user.name || `${user.email} ${type}`,
          about: '',
          supportedPets: ['Dogs', 'Cats'],
          visitTypes: type === 'grooming' ? ['Salon Visit', 'Home Visit'] : [],
          openTime: '09:00',
          closeTime: '20:00',
          details: { slotTemplate: [] },
          // Deliberately NOT approved: the vendor can manage this from their
          // dashboard straight away, but a brand-new salon has no services and
          // no slots, so publishing it would put an empty storefront in front
          // of customers. An admin approves once it is set up.
          approvalStatus: 'pending',
          active: true,
        });
      }
      console.log(`     → Provider "${provider.name}" (${provider.approvalStatus} — not yet public)`);
    }
    console.log('');
  }

  if (!DRY_RUN) {
    console.log(`  Password for repaired accounts without one: ${PASSWORD}`);
  }
  console.log(`${'='.repeat(56)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Repair failed:', err.message);
  process.exit(1);
});
