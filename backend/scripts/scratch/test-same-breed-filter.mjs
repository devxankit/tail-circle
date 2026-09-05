import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';
import { MatchProfile, Swipe } from '../../src/modules/social/social.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5970/api';
const tok = (id) => jwt.sign({ sub: String(id), role: 'user' }, SECRET, { expiresIn: '1h' });

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5970, r));

  const testUser = await User.findOneAndUpdate(
    { email: 'breed.test@tailcircle.test' },
    { $set: { name: 'Breed Test User', phone: '9998887770', role: 'user' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const testPet = await Pet.findOneAndUpdate(
    { ownerId: testUser._id },
    { $set: { name: 'Test Beagle', species: 'dog', breed: 'Beagle', deletedAt: null } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const token = tok(testUser._id);

  console.log('\n--- Testing Matchmaking Breed Filters ---');

  // Test 1: All Breeds
  const allBreedsRes = await call('/matches/deck?breedMode=All+Breeds', { token });
  console.log(`[All Breeds] count: ${allBreedsRes.data?.length}`);
  const allBreedsList = (allBreedsRes.data || []).map(p => p.breed);
  console.log(`[All Breeds] Breeds present:`, [...new Set(allBreedsList)]);

  // Test 2: Same Breed
  const sameBreedRes = await call('/matches/deck?breedMode=Same+Breed', { token });
  console.log(`[Same Breed] count: ${sameBreedRes.data?.length}`);
  const sameBreedsList = (sameBreedRes.data || []).map(p => p.breed);
  console.log(`[Same Breed] Breeds present:`, [...new Set(sameBreedsList)]);

  const isSameBreedOnly = sameBreedsList.every(b => b && b.toLowerCase() === 'beagle');
  console.log(`\nVerified Same Breed only returns Beagle: ${isSameBreedOnly ? 'PASS' : 'FAIL'}`);

  server.close();
  await mongoose.disconnect();
  process.exit(isSameBreedOnly ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
