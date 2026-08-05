import { User } from '../../src/modules/user/user.model.js';
import { Address } from '../../src/modules/address/address.model.js';

/**
 * Demo account for manual testing: phone 9000000001. Log in with any OTP
 * flow in dev (the code is printed in the server log).
 */
export async function seedDemoUser() {
  const phone = '+919000000001';
  const user = await User.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: { phone, isPhoneVerified: true },
      $set: {
        name: 'Demo Parent',
        bio: 'Dog lover & proud parent of Max!',
        city: 'Indore',
        gender: 'other',
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const hasAddress = await Address.exists({ userId: user._id, deletedAt: null });
  if (!hasAddress) {
    await Address.create({
      userId: user._id,
      label: 'home',
      fullName: 'Demo Parent',
      phone: '9000000001',
      line1: '12 Pet Lane, Vijay Nagar',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452010',
      isDefault: true,
    });
  }

  return `demo user ${phone} ready (id ${user._id})`;
}
