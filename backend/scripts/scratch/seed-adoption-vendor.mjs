/**
 * Seed the Adoption Partner demo account.
 *
 * Every other partner type already had an approved demo vendor; adoption was
 * the only one without, since the type was added after `vendors.seed.js` was
 * last run. Mirrors that seeder exactly (same password, bank block, verified
 * licence) and adds a few listings so the portal opens on real data rather than
 * an empty state.
 *
 * Idempotent — re-running updates the same account instead of duplicating it.
 */
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../../src/modules/user/user.model.js';
import { VendorProfile } from '../../src/modules/vendor/vendor.models.js';
import { AdoptionListing } from '../../src/modules/adoption/adoption.models.js';
import { encryptField } from '../../src/utils/fieldCrypto.js';

const VENDOR = {
  businessName: 'Second Chance Pet Rescue',
  email: 'partner@secondchance.com',
  phone: '+919000001008',
  password: 'vendor123',
  regNo: 'TCV-ADOP01',
  city: 'Indore',
  logo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&auto=format&fit=crop&q=60',
};

/** A small starting roster so the dashboard and listings tab show real rows. */
const PETS = [
  {
    name: 'Rocky', type: 'Dog', breed: 'Indie', age: '1 year', gender: 'Male',
    price: 1500, weight: 'Medium', about: 'Gentle street rescue, great with children.',
    traits: ['Friendly', 'Playful'], vaccinated: true, dewormed: true, neutered: true,
    images: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'],
  },
  {
    name: 'Luna', type: 'Cat', breed: 'Indian Shorthair', age: 'Young', gender: 'Female',
    price: 0, weight: 'Small', about: 'Quiet, litter-trained, looking for a calm home.',
    traits: ['Calm', 'Independent'], vaccinated: true, dewormed: true, neutered: false,
    images: ['https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=600&q=80'],
  },
  {
    name: 'Bruno', type: 'Dog', breed: 'Labrador', age: 'Adult', gender: 'Male',
    price: 2500, weight: 'Large', about: 'Surrendered by a relocating family. Fully trained.',
    traits: ['Loyal', 'Trained'], vaccinated: true, dewormed: true, neutered: true,
    images: ['https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80'],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(VENDOR.password, 10);

  const user = await User.findOneAndUpdate(
    { email: VENDOR.email },
    {
      $set: {
        name: VENDOR.businessName,
        phone: VENDOR.phone,
        role: 'vendor',
        vendorType: 'adoption',
        passwordHash,
        isPhoneVerified: true,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  await VendorProfile.updateOne(
    { userId: user._id },
    {
      $set: {
        businessName: VENDOR.businessName,
        vendorType: 'adoption',
        email: VENDOR.email,
        phone: VENDOR.phone,
        city: VENDOR.city,
        logo: VENDOR.logo,
        // Approved so the account can log straight in — an unapproved vendor is
        // blocked at login by design.
        approvalStatus: 'approved',
        commissionRate: 0.15,
        rating: 4.8,
        'bank.bankName': 'HDFC Bank',
        'bank.accountHolder': VENDOR.businessName,
        'bank.accountNumberEnc': encryptField(`50100${VENDOR.phone.slice(-7)}`),
        'bank.ifsc': 'HDFC0001234',
        'bank.accountType': 'Current',
        documents: [
          { kind: 'license', url: 'https://res.cloudinary.com/demo/image/upload/license.pdf', status: 'Verified', verifiedBy: 'Admin', verifiedAt: new Date() },
          { kind: 'owner_id', url: 'https://res.cloudinary.com/demo/image/upload/id.jpg', status: 'Pending', verifiedBy: '', verifiedAt: null },
          { kind: 'gst', url: 'https://res.cloudinary.com/demo/image/upload/gst.pdf', status: 'Pending', verifiedBy: '', verifiedAt: null },
        ],
      },
      $setOnInsert: { registrationNo: VENDOR.regNo },
    },
    { upsert: true }
  );

  const profile = await VendorProfile.findOne({ userId: user._id });

  let listed = 0;
  for (const pet of PETS) {
    const res = await AdoptionListing.updateOne(
      { vendorId: user._id, name: pet.name },
      {
        $set: {
          ...pet,
          vendorId: user._id,
          sourceType: 'vendor',
          location: VENDOR.city,
          distance: VENDOR.city,
          contactPhone: VENDOR.phone,
          contactEmail: VENDOR.email,
          shelter: { name: VENDOR.businessName, verified: true, image: VENDOR.logo },
        },
        $setOnInsert: {
          legacyId: `ADOPT-SEED-${pet.name.toUpperCase()}`,
          status: 'Available',
        },
      },
      { upsert: true }
    );
    if (res.upsertedCount || res.modifiedCount) listed += 1;
  }

  console.log('\n  Adoption Partner account ready\n');
  console.log(`     Business        ${VENDOR.businessName}`);
  console.log(`     Login email     ${VENDOR.email}`);
  console.log(`     Password        ${VENDOR.password}`);
  console.log(`     Phone (OTP)     ${VENDOR.phone}`);
  console.log(`     Registration    ${profile.registrationNo}`);
  console.log(`     Category        Adoption Partner`);
  console.log(`     Status          ${profile.approvalStatus}`);
  console.log(`     Portal          /vendor/adoption-partner`);
  console.log(`     Pets listed     ${PETS.length} (${listed} written this run)\n`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
