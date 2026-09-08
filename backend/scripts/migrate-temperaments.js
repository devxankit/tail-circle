/**
 * Move every pet onto the sixteen-temperament list.
 *
 *   node scripts/migrate-temperaments.js            # apply
 *   node scripts/migrate-temperaments.js --dry-run  # report only
 *
 * Compatibility is temperament alone now, so a pet still carrying a word the
 * taxonomy no longer knows scores against nothing and quietly reads as a poor
 * match for everyone. Every stored value is therefore remapped to its nearest
 * equivalent on the new list, and anything with no temperament meaning at all
 * is dropped rather than forced into one.
 *
 * "Likes water" / "Avoids water" are dropped: they are preferences, not
 * temperaments, and nothing on the new list means the same thing.
 *
 * "Aggressive" is preserved as itself. It is on the new list precisely because
 * `isReactive()` keys on it, and remapping it to a personality word would
 * quietly stop pets flagging as needing a handler at an event.
 *
 * Idempotent: a pet already holding only new-list values is left untouched, so
 * re-running after a partial failure is safe. An applying run writes every
 * value it is about to overwrite to `backups/temperament-<timestamp>.json`
 * first, because the old value is otherwise gone — the remap is a judgement
 * call, and a judgement call against live data should be undoable.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Pet } from '../src/modules/pet/pet.model.js';
import { MatchProfile } from '../src/modules/social/social.models.js';
import { BEHAVIOUR_OPTIONS } from '../src/modules/social/behaviour.service.js';

const DRY_RUN = process.argv.includes('--dry-run');

const norm = (v) => String(v || '').trim().toLowerCase();

/** Every new-list value, so an already-migrated trait maps to itself. */
const CANONICAL = new Map(BEHAVIOUR_OPTIONS.map((t) => [norm(t), t]));

/*
 * Old value → nearest new value. Covers both the chips the app used to offer
 * and the synonyms the previous scorer recognised, since free-text and seed
 * data put those in the database too. `null` means "no temperament meaning —
 * drop it".
 */
const REMAP = {
  // Retired chips.
  social: 'Friendly',
  outgoing: 'Friendly',
  cuddly: 'Affectionate',
  loving: 'Affectionate',
  active: 'Energetic',
  hyper: 'Excitable',
  lazy: 'Calm',
  relaxed: 'Calm',
  mellow: 'Calm',
  chill: 'Calm',
  anxious: 'Sensitive',
  nervous: 'Sensitive',
  timid: 'Shy',
  introvert: 'Reserved',
  protective: 'Confident',
  loyal: 'Affectionate',
  alert: 'Cautious',
  watchful: 'Cautious',
  alpha: 'Confident',
  dominant: 'Confident',
  stubborn: 'Independent',
  bossy: 'Confident',
  territorial: 'Cautious',
  adventurous: 'Curious',
  smart: 'Curious',
  trained: 'Adaptable',
  obedient: 'Adaptable',
  reactive: 'Aggressive',
  // Spelling variants of new-list values.
  easygoing: 'Easy-going',
  'easy going': 'Easy-going',
  'good with kids': 'Friendly',
  'house trained': 'Adaptable',
  intelligent: 'Curious',

  // Preferences, not temperaments.
  'likes water': null,
  'avoids water': null,
  'dislikes water': null,
};

/**
 * A stored trait list, rewritten onto the new taxonomy.
 *
 * Returns `null` when nothing needs to change, so the caller can skip the
 * write and report an honest count.
 */
export function migrate(list) {
  const out = [];
  const seen = new Set();
  let changed = false;

  for (const raw of list || []) {
    const key = norm(raw);
    if (!key) {
      changed = true;
      continue;
    }

    let next;
    if (CANONICAL.has(key)) {
      next = CANONICAL.get(key); // already on the list (or differs only in case)
    } else if (key in REMAP) {
      next = REMAP[key];
    } else {
      next = null; // unrecognised free text — it matches nothing, so it goes
    }

    if (next === null) {
      changed = true;
      continue;
    }
    if (next !== String(raw).trim()) changed = true;
    if (seen.has(next)) {
      changed = true; // two old traits collapsed onto one new one
      continue;
    }
    seen.add(next);
    out.push(next);
  }

  return changed ? out : null;
}

async function migrateCollection(Model, label) {
  const docs = await Model.find({ temperament: { $exists: true, $ne: [] } })
    .select('temperament')
    .lean();

  let changed = 0;
  let emptied = 0;
  const samples = [];
  const backup = [];

  for (const doc of docs) {
    const next = migrate(doc.temperament);
    if (!next) continue;
    changed += 1;
    if (!next.length) emptied += 1;
    if (samples.length < 8) samples.push(`${doc.temperament.join(', ')}  →  ${next.join(', ') || '(none)'}`);
    backup.push({ _id: String(doc._id), before: doc.temperament, after: next });
    if (!DRY_RUN) await Model.updateOne({ _id: doc._id }, { $set: { temperament: next } });
  }

  console.log(`\n${label}`);
  console.log(`  scanned  : ${docs.length}`);
  console.log(`  ${DRY_RUN ? 'would change' : 'changed     '} : ${changed}`);
  console.log(`  left empty  : ${emptied} (owner must re-pick)`);
  for (const s of samples) console.log(`    ${s}`);
  return { scanned: docs.length, changed, emptied, backup };
}

/** Every overwritten value, keyed by collection, so a bad remap can be undone. */
function writeBackup(sections) {
  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `temperament-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(sections, null, 2));
  return file;
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log(`${DRY_RUN ? '🔍 DRY RUN — no writes' : '✍️  Applying'}  •  ${BEHAVIOUR_OPTIONS.length} temperaments`);

  const pets = await migrateCollection(Pet, 'Pet.temperament');
  // The deck scores against MatchProfile, not Pet, so leaving this behind
  // would migrate the profile screen and none of the actual matching.
  const profiles = await migrateCollection(MatchProfile, 'MatchProfile.temperament');

  console.log(`\n${'='.repeat(52)}`);
  console.log(DRY_RUN ? '🔍 Dry run complete — nothing written' : '✅ Temperament migration complete');
  console.log('='.repeat(52));
  console.log(`  pets           : ${pets.changed}/${pets.scanned} changed, ${pets.emptied} emptied`);
  console.log(`  match profiles : ${profiles.changed}/${profiles.scanned} changed, ${profiles.emptied} emptied`);
  if (!DRY_RUN && (pets.changed || profiles.changed)) {
    console.log(`  backup         : ${writeBackup({ pets: pets.backup, matchProfiles: profiles.backup })}`);
  }
  console.log(`${'='.repeat(52)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

// Guarded so `import { migrate }` does not open a database connection.
if (process.argv[1]?.includes('migrate-temperaments')) {
  main().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
}
