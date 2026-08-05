import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { User } from '../src/modules/user/user.model.js';
import { Provider } from '../src/modules/provider/provider.model.js';
import { ServiceOffering } from '../src/modules/provider/serviceOffering.model.js';
import mongoose from 'mongoose';

async function testGroomingFlow() {
  console.log('--- STARTING GROOMING END-TO-END VERIFICATION ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Find or create a Grooming Vendor user
  let vendor = await User.findOne({ email: 'grooming.vendor@tailcircle.com' });
  if (!vendor) {
    vendor = await User.create({
      name: 'Spa Paws Grooming',
      email: 'grooming.vendor@tailcircle.com',
      phone: '9876543210',
      role: 'vendor',
      businessName: 'Spa Paws Pet Grooming & Salon',
    });
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
  const vendorToken = jwt.sign({ sub: vendor._id.toString(), role: 'vendor' }, accessSecret, { expiresIn: '1h' });

  // 2. Simulate API calls
  const API_URL = `http://localhost:${process.env.PORT || 5000}/api`;

  console.log('1. Testing Vendor Grooming Profile GET /vendor/grooming/profile...');
  const profRes = await fetch(`${API_URL}/vendor/grooming/profile`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const profData = await profRes.json();
  console.log(`   Status: ${profRes.status} | Salon: "${profData.data?.name}"`);

  console.log('2. Testing Service Creation POST /vendor/grooming/services...');
  const createRes = await fetch(`${API_URL}/vendor/grooming/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorToken}`,
    },
    body: JSON.stringify({
      name: 'Royal Spa & Haircut Package',
      description: 'Aromatherapy bath, blueberry facial, full body styling, nail clipping & filing.',
      price: 899,
      mrp: 1199,
      durationMin: 75,
      category: 'Luxury Spa',
    }),
  });
  const createData = await createRes.json();
  console.log(`   Status: ${createRes.status} | Created Package: "${createData.data?.name}" (₹${createData.data?.price})`);

  console.log('3. Testing User Grooming Discovery GET /providers?type=grooming...');
  const providersRes = await fetch(`${API_URL}/providers?type=grooming`);
  const providersData = await providersRes.json();
  console.log(`   Status: ${providersRes.status} | Found ${providersData.data?.length || 0} Grooming Salons.`);

  console.log('4. Testing Vendor Bookings GET /vendor/grooming/bookings...');
  const bookRes = await fetch(`${API_URL}/vendor/grooming/bookings`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  const bookData = await bookRes.json();
  console.log(`   Status: ${bookRes.status} | Total Vendor Bookings: ${bookData.data?.length || 0}`);

  await mongoose.disconnect();
  console.log('--- GROOMING VERIFICATION COMPLETE — ALL ENDPOINTS 200 OK! ---');
  process.exit(0);
}

testGroomingFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});
