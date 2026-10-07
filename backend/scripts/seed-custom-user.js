import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Address } from '../src/modules/address/address.model.js';
import { Pet } from '../src/modules/pet/pet.model.js';
import { Wallet } from '../src/modules/wallet/wallet.models.js';

const TARGET_PHONE = '+919111966732';
const RAW_PHONE = '9111966732';
const DEFAULT_OTP = '1234';

async function seedUser() {
  await mongoose.connect(env.mongoUri);
  logger.info(`Connected to MongoDB database: ${mongoose.connection.name}`);

  // 1. Create or update User
  const user = await User.findOneAndUpdate(
    { phone: TARGET_PHONE },
    {
      $set: {
        phone: TARGET_PHONE,
        name: 'Ankit Ahirwar',
        email: 'ankit@tailcircle.in',
        bio: 'Pet parent & dog lover on Tail Circle!',
        city: 'Indore',
        state: 'Madhya Pradesh',
        address: '101 Green Park Colony, Indore',
        gender: 'male',
        role: 'user',
        isPhoneVerified: true,
        isBlocked: false,
        points: 500,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  logger.info(`User seeded: ${user.name} (${user.phone}) — ID: ${user._id}`);

  // 2. Seed active OTP record for 1234
  const codeHash = await bcrypt.hash(DEFAULT_OTP, 10);
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await Otp.deleteMany({ phone: TARGET_PHONE });
  await Otp.create({
    phone: TARGET_PHONE,
    codeHash,
    expiresAt: oneYearFromNow,
    attempts: 0,
    consumed: false,
  });

  logger.info(`Active OTP record created for ${TARGET_PHONE} with default code: ${DEFAULT_OTP}`);

  // 3. Seed default Address
  const existingAddress = await Address.findOne({ userId: user._id, deletedAt: null });
  if (!existingAddress) {
    await Address.create({
      userId: user._id,
      label: 'home',
      fullName: user.name,
      phone: RAW_PHONE,
      line1: '101 Green Park Colony',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      isDefault: true,
    });
    logger.info(`Default shipping/service address created for ${user.name}`);
  }

  // 4. Seed Pet profile (so user has a complete pet profile ready)
  const existingPet = await Pet.findOne({ ownerId: user._id, deletedAt: null });
  if (!existingPet) {
    await Pet.create({
      ownerId: user._id,
      name: 'Rocky',
      type: 'dog',
      breed: 'Golden Retriever',
      gender: 'male',
      ageText: '2 Years',
      weightKg: 28,
      bio: 'Friendly, playful Golden Retriever who loves park fetch & belly rubs!',
      temperament: ['Friendly', 'Playful', 'Energetic', 'Social'],
      health: {
        vaccinated: true,
        dewormed: true,
        neutered: true,
        allergies: [],
      },
      purpose: 'Playdate',
      isMatchProfile: true,
      city: 'Indore',
      state: 'Madhya Pradesh',
    });
    logger.info(`Pet profile 'Rocky' created for user ${user.name}`);
  }

  // 5. Seed Wallet balance
  const existingWallet = await Wallet.findOne({ userId: user._id });
  if (!existingWallet) {
    await Wallet.create({
      userId: user._id,
      balance: 250000, // ₹2,500.00
      currency: 'INR',
    });
    logger.info(`Wallet initialized with ₹2,500.00 balance for user ${user.name}`);
  }

  logger.info(`ALL SEEDING COMPLETED FOR ${TARGET_PHONE}!`);
  logger.info(`Phone: ${RAW_PHONE} (or ${TARGET_PHONE})`);
  logger.info(`Default OTP: ${DEFAULT_OTP}`);

  await mongoose.disconnect();
}

seedUser().catch((err) => {
  logger.error('Failed to seed user', err);
  process.exit(1);
});
