/**
 * Phase 2 exit-criteria check. Run with the dev server already up:
 *   node src/server.js   (in another terminal)
 *   node scripts/phase2-check.js
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { normalizePhone } from '../src/utils/phone.js';
import { User } from '../src/modules/user/user.model.js';
import { Otp } from '../src/modules/auth/otp.model.js';
import { Pet } from '../src/modules/pet/pet.model.js';

const BASE = `http://localhost:${env.port}${env.apiPrefix}`;
let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

const json = (res) => res.json().catch(() => ({}));
const authed = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

await mongoose.connect(env.mongoUri);

const { connectRedis, disconnectRedis } = await import('../src/config/redis.js');
const { invalidate } = await import('../src/services/cache.service.js');
await connectRedis();
await new Promise((r) => setTimeout(r, 400));
await invalidate('rl:auth:*');
await invalidate('otp:*');

async function loginAs(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    codeHash: await bcrypt.hash('1234', 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const res = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: rawPhone, code: '1234' }),
  });
  return (await json(res)).data;
}

const PHONE_A = '9999900003';
const PHONE_B = '9999900004';
for (const p of [PHONE_A, PHONE_B].map(normalizePhone)) {
  const u = await User.findOne({ phone: p });
  if (u) {
    await Pet.deleteMany({ ownerId: u._id });
    await User.deleteOne({ _id: u._id });
  }
}

const a = await loginAs(PHONE_A);
const b = await loginAs(PHONE_B);

// ── 1. Staged onboarding: create with basics (step 1) ────
const step1 = await json(
  await fetch(`${BASE}/pets`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      name: 'Bruno',
      type: 'dog',
      breed: 'Golden Retriever',
      gender: 'male',
      ageText: '2 Years',
      temperament: ['Friendly', 'Playful'],
      health: { vaccinated: true },
    }),
  })
);
check('step 1 creates pet with basics', step1.data?.name === 'Bruno' && step1.data?.health?.vaccinated === true);
const petId = step1.data?._id;

// ── 2. Step 2: patch photos (avatar auto-set) ────────────
const step2 = await json(
  await fetch(`${BASE}/pets/${petId}`, {
    method: 'PATCH',
    headers: authed(a.accessToken),
    body: JSON.stringify({
      photos: ['https://res.cloudinary.com/demo/image/upload/dog1.jpg'],
    }),
  })
);
check('step 2 patches photos + auto avatar', step2.data?.avatarUrl?.includes('dog1.jpg'));

const tooMany = await fetch(`${BASE}/pets/${petId}`, {
  method: 'PATCH',
  headers: authed(a.accessToken),
  body: JSON.stringify({ photos: Array(7).fill('https://res.cloudinary.com/demo/image/upload/x.jpg') }),
});
check('photo cap (≤6) enforced', tooMany.status === 400);

// ── 3. Step 3: patch health + weight ─────────────────────
const step3 = await json(
  await fetch(`${BASE}/pets/${petId}`, {
    method: 'PATCH',
    headers: authed(a.accessToken),
    body: JSON.stringify({ weightKg: 28, diet: 'Grain-free', health: { neutered: true, vaccinated: true } }),
  })
);
check('step 3 patches health/weight', step3.data?.weightKg === 28 && step3.data?.health?.neutered === true);

// ── 4. Listing + ownership ───────────────────────────────
const myPets = await json(await fetch(`${BASE}/pets`, { headers: authed(a.accessToken) }));
check('GET /pets lists my pets', myPets.data?.length === 1);

const idor = await fetch(`${BASE}/pets/${petId}`, { headers: authed(b.accessToken) });
check('cross-user pet access blocked (IDOR)', idor.status === 404);

const strayField = await fetch(`${BASE}/pets`, {
  method: 'POST',
  headers: authed(a.accessToken),
  body: JSON.stringify({ name: 'Evil', ownerId: String(new mongoose.Types.ObjectId()) }),
});
check('ownerId mass-assignment rejected', strayField.status === 400);

// ── 5. Vaccinations ──────────────────────────────────────
const vax = await json(
  await fetch(`${BASE}/pets/${petId}/vaccinations`, {
    method: 'POST',
    headers: authed(a.accessToken),
    body: JSON.stringify({ vaccine: 'Rabies', date: '2026-01-15', nextDueDate: '2027-01-15' }),
  })
);
check('vaccination recorded', vax.data?.vaccine === 'Rabies');
const vaxList = await json(await fetch(`${BASE}/pets/${petId}/vaccinations`, { headers: authed(a.accessToken) }));
check('vaccination list returns records', vaxList.data?.length === 1);

// ── 6. Soft delete ───────────────────────────────────────
await fetch(`${BASE}/pets/${petId}`, { method: 'DELETE', headers: authed(a.accessToken) });
const afterDelete = await json(await fetch(`${BASE}/pets`, { headers: authed(a.accessToken) }));
check('soft delete hides pet from list', afterDelete.data?.length === 0);
const stillInDb = await Pet.findById(petId);
check('soft-deleted pet retained in DB', stillInDb?.deletedAt instanceof Date);

// ── 7. Breeds catalog (public + cached) ──────────────────
const breeds = await fetch(`${BASE}/breeds?petType=dog`);
const breedsBody = await json(breeds);
check('GET /breeds public + filtered', breeds.status === 200 && breedsBody.data?.length > 0 && breedsBody.data.every((x) => x.petType === 'dog'));
check('breed list strips heavy shopData', breedsBody.data?.[0] && !('shopData' in breedsBody.data[0]));

const second = await fetch(`${BASE}/breeds?petType=dog`);
check('breed list served from Redis cache', second.headers.get('x-cache') === 'HIT');

const detail = await json(await fetch(`${BASE}/breeds/dog_golden_retriever`));
check('breed detail includes shopData', detail.data?.shopData?.monthlyBundle?.name?.includes('Golden'));

console.log(`\n${pass} passed, ${fail} failed`);
await mongoose.disconnect();
await disconnectRedis();
process.exit(fail ? 1 : 0);
