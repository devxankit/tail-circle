# Phase 2 — Pets, Breeds & Onboarding

**Goal:** the 3-step pet onboarding writes to the DB; users manage multiple pets;
breeds become a server catalog (admin-managed later; currently in localStorage
`tailcircle_breeds` + hardcoded lists).

**Status: ✅ Done** (2026-07-17) · Depends on: Phase 1

Verification: `node scripts/phase2-check.js` (server running) — **15/15 pass**
(staged create/patch onboarding, photo cap, IDOR + mass-assignment blocks,
vaccinations, soft delete, public breeds with Redis cache HIT + shopData split).
Breeds seeded: `node scripts/seed.js breeds` (15 breeds from `breedData.js`).

Notes: the onboarding flow now runs the full 3 steps (step 2 previously jumped
straight home; it now continues to Health & Care). `ShopList.jsx` and the admin
`BreedManagement.jsx` still read localStorage breeds — their data is entangled
with shop product ids, so they migrate with Phase 3 (shop) / Phase 11 (admin)
as planned. Wallet balance display on Profile stays local until Phase 8.

UI audit (2026-07-18): covered screens clean (onboarding steps, AddPet,
Profile passport, pet pickers all on API; the only localStorage left is our
own `tc_onboarding_pet_id` step handoff). ✅ mock-free.

## Frontend screens covered
`onboarding/Step1Details.jsx`, `Step2Media.jsx`, `Step3Health.jsx`, `WelcomeIntro.jsx`,
`profile/screens/AddPet.jsx`, pet selectors used across booking flows
(grooming PetDetails, daycare PetInformation, events checkout, doctors checkout)

## Models
- **Pet**: `{ ownerId, name, type: dog|cat|bird|small_pet, breed, gender, dob/ageText, weightKg, photos: [url], avatar, bio, health: { vaccinated, dewormed, neutered, allergies: [..], conditions: [..], lastVetVisit }, temperament: [..], activityLevel, size, isMatchProfile: bool, deletedAt }` — index `ownerId`
- **Breed**: `{ name, petType, size, traits: [..], image, popularity, active }` (catalog; unique name+petType)
- **PetVaccination**: `{ petId, vaccine, date, nextDueDate, docUrl }` (also used by clinic suite in Phase 10)

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST | /pets | auth | my pets / add pet (onboarding + AddPet) |
| GET/PATCH/DELETE | /pets/:id | auth (owner) | soft delete |
| POST | /pets/:id/photos | auth | Cloudinary via existing upload middleware |
| GET/POST | /pets/:id/vaccinations | auth | health tracking |
| GET | /breeds | public | filter by petType/size; replaces localStorage breeds |

## Tasks
- [x] Pet module + validation (staged onboarding: name-only create, patch steps 2–3; max 20 pets, 6 photos)
- [x] Breed catalog module + seed from `frontend .../shop/breedData.js` (shop blobs preserved under `shopData` for Phase 3)
- [x] Vaccination sub-resource (also syncs `health.vaccinated` flag)
- [x] **Frontend:** onboarding steps post to API (step 1 creates, step 2 uploads photos → Cloudinary → patch, step 3 patches health); step 1 breed chips read `/breeds` per species
- [x] **Frontend:** AddPet screen posts to API; pet pickers wired: events ticket sheet, grooming PetDetails, daycare PetInformation
- [x] **Frontend:** `tailcircle_pets` fully replaced (Profile passport incl. mood → PATCH); `tailcircle_breeds` replaced in onboarding — ShopList/BreedManagement deferred to Phases 3/11 (shop-data entangled)
- [x] Seed: breeds catalog (15 breeds)

## Security notes
- Photo upload limits (count ≤ 6, size, mime); strip EXIF not required but note
- Owner scoping on every pet route; pets embedded in other modules referenced by id only

## Exit criteria
New user completes onboarding → pet persisted with photos + health; pets appear in
profile and all booking flows' pet selectors from the API.
