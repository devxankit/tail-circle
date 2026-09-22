import { Breed } from '../../src/modules/breed/breed.model.js';
import { invalidate } from '../../src/services/cache.service.js';
import { dogBreeds } from './data/breeds.dogs.js';
import { catBreeds } from './data/breeds.cats.js';

/**
 * Rebuilds the dog and cat breed catalog from `data/breeds.{dogs,cats}.js`.
 *
 * Reference content (name, size, personality, description, image, traits,
 * summary) is owned by those files and overwritten on every run. The shop side
 * of a breed — `shopData.recommendations`, `monthlyBundle`, `guidance` — is
 * owned by admins through Breed Management and is read back off the existing
 * document, so re-seeding never wipes curation.
 *
 * Dog and cat breeds absent from the catalog are deleted. Other pet types are
 * left alone entirely.
 */

/**
 * Slugs changed when the catalog was rebuilt, so shopData has to follow the
 * breed to its new id. Old slug → new slug. Once a run has completed these old
 * slugs no longer exist; the map is kept because the seeder must stay correct
 * against any database still on the previous catalog.
 */
const RENAMED_SLUGS = {
  dog_labrador: 'dog_labrador_retriever',
  dog_husky: 'dog_siberian_husky',
  dog_doberman: 'dog_doberman_pinscher',
  dog_indie: 'dog_indie_indian_pariah',
  // cat_persian, dog_beagle, dog_pug and the rest kept their slug.
};

const hasKeys = (o) => o && typeof o === 'object' && Object.keys(o).length > 0;

export async function seedBreeds({ logger } = {}) {
  const catalog = [
    ...dogBreeds.map((b) => ({ ...b, petType: 'dog' })),
    ...catBreeds.map((b) => ({ ...b, petType: 'cat' })),
  ];

  const wantedSlugs = new Set(catalog.map((b) => b.id));

  // Curation currently in the database, keyed by the slug it will live under
  // after this run. Later writes win, so an already-migrated document beats a
  // stale pre-rename one and the seeder stays idempotent.
  const existing = await Breed.find({ petType: { $in: ['dog', 'cat'] } })
    .select('slug shopData popularity')
    .lean();

  const preserved = new Map();
  for (const doc of existing) {
    const target = RENAMED_SLUGS[doc.slug] || doc.slug;
    if (!wantedSlugs.has(target)) continue;
    const carried = {
      shopData: hasKeys(doc.shopData) ? doc.shopData : null,
      popularity: doc.popularity || 0,
    };
    const prior = preserved.get(target);
    // Prefer whichever record actually carries shop data.
    if (!prior || (!prior.shopData && carried.shopData)) preserved.set(target, carried);
  }

  // Retire anything the catalog no longer lists — the old 15-breed set, and
  // each renamed breed's original document. This has to happen before the
  // upserts and after the read above: `{ name, petType }` is a unique index,
  // so leaving `dog_labrador` in place while inserting `dog_labrador_retriever`
  // is a duplicate-key error, and deleting any earlier would lose the shopData
  // the rename is meant to carry across.
  const { deletedCount } = await Breed.deleteMany({
    petType: { $in: ['dog', 'cat'] },
    slug: { $nin: [...wantedSlugs] },
  });

  let carriedCount = 0;
  for (const b of catalog) {
    const carry = preserved.get(b.id);
    const set = {
      slug: b.id,
      name: b.name,
      petType: b.petType,
      size: (b.size || '').toLowerCase() || null,
      personality: b.personality || '',
      description: b.description || '',
      image: b.image || '',
      traits: b.traits || [],
      summary: b.summary || {},
      popularity: carry?.popularity || 0,
      active: true,
    };
    if (carry?.shopData) {
      set.shopData = carry.shopData;
      carriedCount++;
    }

    // `shopData` goes in exactly one operator — naming it in both $set and
    // $setOnInsert is a conflicting-path error, not a merge.
    const update = { $set: set };
    if (!set.shopData) {
      update.$setOnInsert = { shopData: { recommendations: {}, monthlyBundle: null, guidance: {} } };
    }

    await Breed.updateOne({ slug: b.id }, update, { upsert: true });
  }

  // `GET /breeds` is cached for 5 minutes, so without this a re-seed appears
  // to have done nothing until the entry expires. Requires the seed runner to
  // have connected Redis; no-ops when it is unavailable.
  let busted = 0;
  try { busted = await invalidate('breeds:resp:*'); } catch { /* best-effort */ }

  logger?.info?.(
    `breeds: ${dogBreeds.length} dogs + ${catBreeds.length} cats upserted, ` +
      `${carriedCount} kept their curated shop data, ${deletedCount} retired, ` +
      `${busted} cached response(s) cleared`
  );
  return `${catalog.length} breeds upserted (${carriedCount} shopData preserved, ${deletedCount} removed)`;
}
