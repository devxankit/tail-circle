/**
 * Put a real location on every pet and every deck profile.
 *
 *   node scripts/backfill-locations.js            # apply
 *   node scripts/backfill-locations.js --dry-run  # report only
 *
 * Two gaps, both from the same cause — nothing in the product ever captured a
 * location, so nothing downstream had one to copy:
 *
 *   1. Pets with no location inherit their owner's, which is what
 *      `createPet` now does for new pets at the moment they are created.
 *   2. `MatchProfile` rows carry a stale copy of their pet's city and state.
 *      The deck filters on `MatchProfile`, not `Pet`, so a pet with a city the
 *      profile does not know about cannot be found by a city search.
 *
 * Idempotent: rows already agreeing with their source are skipped, so this is
 * safe to re-run and safe to run after a partial failure.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/user/user.model.js';
import { Pet } from '../src/modules/pet/pet.model.js';
import { MatchProfile } from '../src/modules/social/social.models.js';

const DRY_RUN = process.argv.includes('--dry-run');

const hasCoords = (loc) => loc?.lat != null && loc?.lng != null;

/** Pets with no location of their own take their owner's. */
async function inheritOwnerLocation() {
  const pets = await Pet.find({ deletedAt: null }).select('name ownerId location city state').lean();
  const pending = pets.filter((p) => !hasCoords(p.location) && p.ownerId);
  let changed = 0;
  let orphaned = 0;

  for (const pet of pending) {
    const owner = await User.findById(pet.ownerId).select('location city state').lean();
    if (!hasCoords(owner?.location)) {
      orphaned += 1;
      console.log(`  ${(pet.name || '?').padEnd(14)} -> owner has no location either (owner must set one)`);
      continue;
    }
    const set = { location: { lat: owner.location.lat, lng: owner.location.lng } };
    if (!pet.city && owner.city) set.city = owner.city;
    if (!pet.state && owner.state) set.state = owner.state;
    console.log(`  ${(pet.name || '?').padEnd(14)} -> ${set.city || pet.city || '(no city)'} ${set.location.lat},${set.location.lng}`);
    changed += 1;
    if (!DRY_RUN) await Pet.updateOne({ _id: pet._id }, { $set: set });
  }

  if (!pending.length) console.log('  (every pet already has a location)');
  return { scanned: pets.length, changed, orphaned };
}

/** Deck profiles re-take their pet's location, city and state. */
async function mirrorToProfiles() {
  const pets = await Pet.find({ deletedAt: null }).select('location city state').lean();
  const byId = new Map(pets.map((p) => [String(p._id), p]));
  const profiles = await MatchProfile.find({ petId: { $ne: null } })
    .select('name petId location city state')
    .lean();

  let changed = 0;
  for (const prof of profiles) {
    const pet = byId.get(String(prof.petId));
    if (!pet) continue;

    const set = {};
    if (hasCoords(pet.location) && (pet.location.lat !== prof.location?.lat || pet.location.lng !== prof.location?.lng)) {
      set.location = { lat: pet.location.lat, lng: pet.location.lng };
    }
    if ((pet.city || '') !== (prof.city || '')) set.city = pet.city || '';
    if ((pet.state || '') !== (prof.state || '')) set.state = pet.state || '';
    if (!Object.keys(set).length) continue;

    console.log(`  ${(prof.name || '?').padEnd(14)} -> ${Object.keys(set).join(', ')}  (${set.city ?? prof.city ?? '-'})`);
    changed += 1;
    if (!DRY_RUN) await MatchProfile.updateOne({ _id: prof._id }, { $set: set });
  }

  if (!changed) console.log('  (every profile already matches its pet)');
  return { scanned: profiles.length, changed };
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(DRY_RUN ? 'DRY RUN - no writes' : 'Applying');

  console.log('\nPets inheriting owner location');
  const pets = await inheritOwnerLocation();

  console.log('\nDeck profiles mirroring their pet');
  const profiles = await mirrorToProfiles();

  console.log(`\n${'='.repeat(56)}`);
  console.log(DRY_RUN ? 'Dry run complete - nothing written' : 'Location backfill complete');
  console.log('='.repeat(56));
  console.log(`  pets     : ${pets.changed}/${pets.scanned} updated, ${pets.orphaned} still unplaceable`);
  console.log(`  profiles : ${profiles.changed}/${profiles.scanned} updated`);
  console.log(`${'='.repeat(56)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
