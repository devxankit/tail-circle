import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../../src/app.js';
import { User } from '../../src/modules/user/user.model.js';
import { Pet } from '../../src/modules/pet/pet.model.js';
import { MatchProfile } from '../../src/modules/social/social.models.js';

const SECRET = process.env.JWT_ACCESS_SECRET || 'tailcircle-access-secret-key-32chars!';
const API = 'http://localhost:5971/api';
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

let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS: ${name} ${detail ? `(${detail})` : ''}`);
    pass++;
  } else {
    console.error(`  FAIL: ${name} ${detail ? `(${detail})` : ''}`);
    fail++;
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(5971, r));

  const testUser = await User.findOneAndUpdate(
    { email: 'filter.audit@tailcircle.test' },
    { $set: { name: 'Filter Audit User', phone: '9991112223', role: 'user' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const testPet = await Pet.findOneAndUpdate(
    { ownerId: testUser._id },
    { $set: { name: 'Audit Pet', species: 'dog', breed: 'Golden Retriever', deletedAt: null } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const token = tok(testUser._id);

  console.log('\n=============================================');
  console.log('--- COMPREHENSIVE MATCHMAKING FILTER AUDIT ---');
  console.log('=============================================\n');

  // 1. Type filter
  const typeRes = await call('/matches/deck?type=Dog', { token });
  check('Type Filter (Dog)', typeRes.status === 200 && (typeRes.data || []).every(p => p.type === 'Dog'), `count: ${typeRes.data?.length}`);

  // 2. Gender filter
  const genderRes = await call('/matches/deck?gender=Female', { token });
  check('Gender Filter (Female)', genderRes.status === 200 && (genderRes.data || []).every(p => p.gender === 'Female'), `count: ${genderRes.data?.length}`);

  // 3. BreedMode filter (Same Breed)
  const sameBreedRes = await call('/matches/deck?breedMode=Same+Breed', { token });
  check('BreedMode Filter (Same Breed)', sameBreedRes.status === 200 && (sameBreedRes.data || []).every(p => p.breed.toLowerCase() === 'golden retriever'), `count: ${sameBreedRes.data?.length}`);

  // 4. Specific Breed filter
  const breedRes = await call('/matches/deck?breed=Siberian+Husky', { token });
  check('Breed Filter (Siberian Husky)', breedRes.status === 200 && (breedRes.data || []).every(p => p.breed === 'Siberian Husky'), `count: ${breedRes.data?.length}`);

  // 5. Size filter
  const sizeRes = await call('/matches/deck?size=Large', { token });
  check('Size Filter (Large)', sizeRes.status === 200 && (sizeRes.data || []).every(p => p.size === 'Large'), `count: ${sizeRes.data?.length}`);

  // 6. VaccinationStatus filter
  const vaxRes = await call('/matches/deck?vaccinationStatus=Vaccinated', { token });
  check('Vaccination Filter (Vaccinated)', vaxRes.status === 200 && (vaxRes.data || []).every(p => p.vaccinationStatus === 'Vaccinated'), `count: ${vaxRes.data?.length}`);

  // 7. Neutered filter
  const neuteredRes = await call('/matches/deck?neutered=Yes', { token });
  check('Neutered Filter (Yes)', neuteredRes.status === 200 && (neuteredRes.data || []).every(p => p.neutered === 'Yes'), `count: ${neuteredRes.data?.length}`);

  // 8. ActivityLevel filter
  const activityRes = await call('/matches/deck?activityLevel=High', { token });
  check('ActivityLevel Filter (High)', activityRes.status === 200 && (activityRes.data || []).every(p => p.activityLevel === 'High'), `count: ${activityRes.data?.length}`);

  // 9. Purpose filter
  const purposeRes = await call('/matches/deck?purpose=Playdate', { token });
  check('Purpose Filter (Playdate)', purposeRes.status === 200 && (purposeRes.data || []).every(p => p.purpose === 'Playdate'), `count: ${purposeRes.data?.length}`);

  // 10. Availability filter
  const availRes = await call('/matches/deck?availability=Available+This+Week', { token });
  check('Availability Filter (Available This Week)', availRes.status === 200 && (availRes.data || []).every(p => p.availability === 'Available This Week'), `count: ${availRes.data?.length}`);

  // 11. Distance filter
  const distRes = await call('/matches/deck?distance=Within+5+KM', { token });
  check('Distance Filter (Within 5 KM)', distRes.status === 200 && (distRes.data || []).every(p => p.distance <= 5), `count: ${distRes.data?.length}`);

  // 12. Temperament filter (single item string parameter)
  const tempRes = await call('/matches/deck?temperament=Playful', { token });
  check('Temperament Filter (Playful)', tempRes.status === 200 && (tempRes.data || []).every(p => (p.temperament || []).includes('Playful')), `count: ${tempRes.data?.length}`);

  // 13. Compatibility filter (single item string parameter)
  const compatRes = await call('/matches/deck?compatibility=Good+With+Kids', { token });
  check('Compatibility Filter (Good With Kids)', compatRes.status === 200 && (compatRes.data || []).every(p => (p.compatibility || []).includes('Good With Kids') || (p.tags || []).includes('Good With Kids')), `count: ${compatRes.data?.length}`);

  // 14. Age range filter
  const ageRes = await call('/matches/deck?age=1-3+Years', { token });
  check('Age Range Filter (1-3 Years)', ageRes.status === 200 && (ageRes.data || []).every(p => p.age >= 1 && p.age <= 3), `count: ${ageRes.data?.length}`);

  console.log(`\nResults: ${pass} PASS, ${fail} FAIL`);

  server.close();
  await mongoose.disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
