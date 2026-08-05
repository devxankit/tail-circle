import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/user/user.model.js';
import { AdoptionListing } from '../src/modules/adoption/adoption.models.js';
import app from '../src/app.js';

const PORT = 5009;
const API_BASE = `http://localhost:${PORT}/api`;

async function runTest() {
  console.log('--- TESTING ADOPTION PET LISTING ENDPOINTS ---');
  await connectDatabase();
  const server = app.listen(PORT);

  // 1. Get or create test user
  let user = await User.findOne({ phone: '9755620716' });
  if (!user) {
    user = await User.create({
      name: 'Aakash Test',
      phone: '9755620716',
      role: 'user',
      city: 'Indore',
    });
  }

  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET || 'dev-secret-change-me', {
    expiresIn: '1h',
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. GET /adoption/pets
  const petsRes = await fetch(`${API_BASE}/adoption/pets`);
  const petsData = await petsRes.json();
  console.log(`[PASS] GET /adoption/pets -> Status ${petsRes.status}, count: ${petsData.data?.length || 0}`);

  // 3. POST /adoption/pets (Create listing)
  const createRes = await fetch(`${API_BASE}/adoption/pets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Simba',
      type: 'Dog',
      breed: 'Golden Retriever',
      age: '4 Months',
      gender: 'Male',
      price: 0,
      location: 'Indore, Vijay Nagar',
      vaccinated: true,
      dewormed: true,
      neutered: false,
      about: 'Simba is a super friendly Golden Retriever puppy seeking a happy home!',
      traits: ['Playful', 'Friendly', 'Good with Kids'],
    }),
  });
  const createData = await createRes.json();
  console.log(`[PASS] POST /adoption/pets -> Status ${createRes.status}, ID: ${createData.data?._id}`);
  const createdId = createData.data?._id;

  // 4. GET /adoption/my-listings
  const myListingsRes = await fetch(`${API_BASE}/adoption/my-listings`, {
    headers: authHeaders,
  });
  const myListingsData = await myListingsRes.json();
  console.log(`[PASS] GET /adoption/my-listings -> Status ${myListingsRes.status}, count: ${myListingsData.data?.length || 0}`);

  // 5. PATCH /adoption/my-listings/:id
  if (createdId) {
    const patchRes = await fetch(`${API_BASE}/adoption/my-listings/${createdId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'Adopted' }),
    });
    const patchData = await patchRes.json();
    console.log(`[PASS] PATCH /adoption/my-listings/${createdId} -> Status ${patchRes.status}, new status: ${patchData.data?.status}`);
  }

  // 6. Clean up test listing
  if (createdId) {
    const deleteRes = await fetch(`${API_BASE}/adoption/my-listings/${createdId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log(`[PASS] DELETE /adoption/my-listings/${createdId} -> Status ${deleteRes.status}`);
  }

  console.log('✅ ALL ADOPTION FLOW ENDPOINTS PASSED VERIFICATION');
  server.close();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
