import { Breed } from '../../src/modules/breed/breed.model.js';
// Source of truth during migration: the frontend's static catalog.
import { defaultBreeds } from '../../../frontend/src/modules/user/features/shop/breedData.js';

/**
 * Upserts the breed catalog from `breedData.js` (idempotent — keyed by slug).
 * Shop-recommendation blobs are preserved verbatim under `shopData` for
 * Phase 3 to remap onto real products.
 */
export async function seedBreeds() {
  let upserts = 0;
  for (const b of defaultBreeds) {
    await Breed.updateOne(
      { slug: b.id },
      {
        $set: {
          slug: b.id,
          name: b.name,
          petType: (b.species || 'dog').toLowerCase(),
          size: (b.size || '').toLowerCase() || null,
          personality: b.personality || '',
          description: b.description || '',
          image: b.image || '',
          traits: b.traits || [],
          summary: b.summary || {},
          shopData: {
            recommendations: b.recommendations || {},
            monthlyBundle: b.monthlyBundle || null,
            guidance: b.guidance || {},
          },
          active: true,
        },
      },
      { upsert: true }
    );
    upserts++;
  }
  return `${upserts} breeds upserted`;
}
