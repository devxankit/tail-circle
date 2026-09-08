/**
 * Give every pet enough temperament to be matchable.
 *
 *   node scripts/seed-temperaments.js            # apply
 *   node scripts/seed-temperaments.js --dry-run  # report only
 *
 * Compatibility is temperament alone, so a pet carrying one trait — or none —
 * produces a score built on almost nothing, and a deck full of those cannot be
 * tested against. This tops any pet under `MIN_TRAITS` up to `TARGET_TRAITS`.
 *
 * Fill is not random. Traits are drawn from consecutive slots on a ring of the
 * seven temperament groups — see `RING` below for why that shape, and why it
 * guarantees no two seeded pets ever score a flat 0% against each other.
 *
 * Assignment is by a hash of the pet's id, so it spreads evenly across the
 * deck and gives the same pet the same character on every re-run.
 *
 * 'Aggressive' is never added. It is an owner's declaration about their own
 * animal and drives whether an event needs a handler; inventing it would put
 * words in their mouth. Pets that already carry it keep it.
 *
 * `--all` rewrites every pet rather than only the thin ones. That overwrites
 * choices real owners made, so it is opt-in and for populating a test deck.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Pet } from '../src/modules/pet/pet.model.js';
import { MatchProfile } from '../src/modules/social/social.models.js';

const DRY_RUN = process.argv.includes('--dry-run');
const RESEED_ALL = process.argv.includes('--all');

const MIN_TRAITS = 3; // below this, a pet is topped up
const TARGET_TRAITS = 4; // and topped up to this
/** Traits taken from the pet's second archetype, the rest from its first. */
const BLEND_TRAITS = 2;

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * The seven temperament groups the scorer recognises, as a ring.
 *
 * Every pet is given one trait from each of `TARGET_TRAITS` *consecutive*
 * slots. That is not decoration — it is what stops the deck filling with
 * zeroes. Two windows of four consecutive slots on a ring of seven cannot miss
 * each other (4 + 4 > 7), so any two seeded pets are guaranteed to share at
 * least one group, and pets whose windows sit further apart share fewer. The
 * result is a gradient from roughly 15% to 100% instead of a cliff between
 * 100% and nothing.
 *
 * Traits inside a slot all belong to the same group in `behaviour.service.js`,
 * so varying which one a pet gets adds variety without breaking that promise.
 */
const RING = [
  ['Friendly', 'Affectionate'], // warm
  ['Playful', 'Energetic', 'Excitable'], // lively
  ['Curious'], // curious
  ['Confident'], // confident
  ['Calm', 'Gentle'], // settled
  ['Easy-going', 'Adaptable'], // easy
  ['Shy', 'Reserved', 'Cautious'], // reserved
];

/** Stable per-id hash, so a re-run does not reshuffle personalities. */
function hashOf(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Which ring slot a trait sits in, or -1 for one the ring does not carry. */
function slotOf(trait) {
  return RING.findIndex((slot) => slot.some((t) => norm(t) === norm(trait)));
}

/**
 * `TARGET_TRAITS` traits from consecutive slots, starting wherever this pet's
 * id lands — or at `startAt`, to build around a trait the pet already has.
 */
function windowFor(id, startAt = null) {
  const h = hashOf(id);
  const start = startAt == null ? h % RING.length : startAt;
  const out = [];
  for (let i = 0; i < TARGET_TRAITS; i += 1) {
    const slot = RING[(start + i) % RING.length];
    // A second hash varies which trait fills the slot, so two pets on the same
    // window are not always character-for-character identical.
    out.push(slot[(h + i * 7) % slot.length]);
  }
  return out;
}

/**
 * A pet's trait list, filled out to `TARGET_TRAITS`, or `null` if it already
 * needs no change.
 *
 * A pet that already has traits keeps them and is extended from the window that
 * starts at its first recognised trait, so a pet marked Shy stays reserved
 * rather than being handed Playful. Under `--all` every pet is rebuilt, keeping
 * only what we have no business inventing — 'Aggressive' being the one that
 * matters.
 */
export function topUp(existing = [], id = '', reseedAll = RESEED_ALL) {
  const current = (existing || []).map((t) => String(t).trim()).filter(Boolean);
  const keep = reseedAll ? current.filter((t) => norm(t) === 'aggressive') : current;

  if (!reseedAll && current.length >= MIN_TRAITS) return null;

  // Anchor the window on something the pet already is, when it is anything.
  const anchor = keep.map(slotOf).find((s) => s >= 0);
  const out = [...keep];
  const have = new Set(out.map(norm));
  /*
   * Traits the ring does not carry — 'Aggressive' — do not count toward the
   * target. Letting one take a slot leaves a three-slot window, and two of
   * those on a ring of seven CAN miss each other, which is the whole thing
   * the ring exists to prevent. Such a pet simply gets one trait more.
   */
  const target = TARGET_TRAITS + keep.filter((t) => slotOf(t) < 0).length;
  for (const trait of windowFor(id, anchor ?? null)) {
    if (out.length >= target) break;
    if (have.has(norm(trait))) continue;
    have.add(norm(trait));
    out.push(trait);
  }

  return JSON.stringify(out) === JSON.stringify(current) ? null : out;
}

async function seedCollection(Model, label, { skipLinked = false } = {}) {
  const filter = skipLinked ? { $or: [{ petId: null }, { petId: { $exists: false } }] } : {};
  const docs = await Model.find(filter).select('name temperament').lean();

  let changed = 0;
  const backup = [];

  console.log(`\n${label}`);
  for (const doc of docs) {
    const next = topUp(doc.temperament, doc._id);
    if (!next) continue;
    changed += 1;
    backup.push({ _id: String(doc._id), before: doc.temperament || [], after: next });
    console.log(`  ${(doc.name || '?').padEnd(13)} [${(doc.temperament || []).join(', ')}]  ->  [${next.join(', ')}]`);
    if (!DRY_RUN) await Model.updateOne({ _id: doc._id }, { $set: { temperament: next } });
  }
  if (!changed) console.log('  (nothing to top up)');
  console.log(`  scanned ${docs.length}, ${DRY_RUN ? 'would top up' : 'topped up'} ${changed}`);
  return { scanned: docs.length, changed, backup };
}

/**
 * Push each pet's list onto its own deck profile.
 *
 * `MatchProfile` is what the deck actually scores, so a pet topped up here and
 * not mirrored there would look correct on the profile screen and unchanged in
 * matching — the exact split that makes this hard to test.
 */
async function mirrorPetsToProfiles() {
  const pets = await Pet.find({ deletedAt: null }).select('temperament').lean();
  let mirrored = 0;
  for (const pet of pets) {
    const res = await MatchProfile.updateOne(
      { petId: pet._id, temperament: { $ne: pet.temperament || [] } },
      { $set: { temperament: pet.temperament || [] } }
    );
    if (res.matchedCount) mirrored += 1;
  }
  return mirrored;
}

function writeBackup(sections) {
  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `temperament-seed-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(sections, null, 2));
  return file;
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(
    `${DRY_RUN ? 'DRY RUN - no writes' : 'Applying'}  •  ${
      RESEED_ALL ? `rebuilding EVERY pet to ${TARGET_TRAITS} blended traits` : `topping up below ${MIN_TRAITS} traits to ${TARGET_TRAITS}`
    }`
  );

  const pets = await seedCollection(Pet, 'Pet.temperament');
  // Only the standalone demo profiles: the pet-linked ones are mirrored below,
  // so topping them up separately would let the two drift apart.
  const profiles = await seedCollection(MatchProfile, 'MatchProfile.temperament (demo, no linked pet)', {
    skipLinked: true,
  });

  const mirrored = DRY_RUN ? '(skipped in dry run)' : await mirrorPetsToProfiles();

  console.log(`\n${'='.repeat(56)}`);
  console.log(DRY_RUN ? 'Dry run complete - nothing written' : 'Temperament seeding complete');
  console.log('='.repeat(56));
  console.log(`  pets topped up      : ${pets.changed}/${pets.scanned}`);
  console.log(`  demo profiles       : ${profiles.changed}/${profiles.scanned}`);
  console.log(`  pets -> deck mirror : ${mirrored}`);
  if (!DRY_RUN && (pets.changed || profiles.changed)) {
    console.log(`  backup              : ${writeBackup({ pets: pets.backup, matchProfiles: profiles.backup })}`);
  }
  console.log(`${'='.repeat(56)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

// Guarded so `import { topUp }` does not open a database connection.
if (process.argv[1]?.includes('seed-temperaments')) {
  main().catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  });
}
