import bcrypt from 'bcryptjs';
import { User } from '../../src/modules/user/user.model.js';
import { Otp } from '../../src/modules/auth/otp.model.js';
import { Address } from '../../src/modules/address/address.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';
import { Wallet } from '../../src/modules/wallet/wallet.models.js';

const TARGET_PHONE = '+919111966732';
const RAW_PHONE = '9111966732';
const DEFAULT_OTP = '1234';

export async function seedCustomUser() {
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

  const hasAddress = await Address.exists({ userId: user._id, deletedAt: null });
  if (!hasAddress) {
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
  }

  const hasPet = await Pet.exists({ ownerId: user._id, deletedAt: null });
  if (!hasPet) {
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
  }

  const hasWallet = await Wallet.exists({ userId: user._id });
  if (!hasWallet) {
    await Wallet.create({
      userId: user._id,
      balance: 250000,
      currency: 'INR',
    });
  }

  return `custom user ${TARGET_PHONE} seeded with default OTP ${DEFAULT_OTP}`;
}
