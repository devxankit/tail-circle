import mongoose from 'mongoose';

/**
 * Breed catalog — public read, admin-managed (Phase 11). Seeded from the
 * frontend's `breedData.js`. The shop-recommendation blobs (product ids,
 * bundles, guidance) ride along in `shopData` untouched; Phase 3 maps the
 * numeric ids to real products.
 */
const breedSchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, unique: true }, // e.g. dog_golden_retriever
    name: { type: String, trim: true, required: true },
    petType: { type: String, trim: true, lowercase: true, required: true }, // dog | cat | …
    size: { type: String, enum: ['small', 'medium', 'large', null], default: null },
    personality: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
    traits: { type: [String], default: [] },
    summary: { type: Object, default: {} }, // weightRange, energyLevel, lifeSpan, …
    shopData: { type: Object, default: {} }, // recommendations, monthlyBundle, guidance
    popularity: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

breedSchema.index({ name: 1, petType: 1 }, { unique: true });

export const Breed = mongoose.model('Breed', breedSchema);
export default Breed;
