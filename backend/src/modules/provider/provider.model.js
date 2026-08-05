import mongoose from 'mongoose';

export const PROVIDER_TYPES = ['daycare', 'grooming', 'clinic', 'events_organizer', 'memorial'];

/**
 * Unified service provider powering all five verticals. Common queryable
 * fields are modeled; vertical-specific display blobs (host card, stats,
 * activities, facilities, service menus…) live under `details` verbatim from
 * the mock data so each screen renders identically. `legacyId` preserves the
 * mock ids ('dc_1', 'gshop_2', …).
 */
const providerSchema = new mongoose.Schema(
  {
    legacyId: { type: String, unique: true, sparse: true },
    vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: PROVIDER_TYPES, required: true, index: true },
    name: { type: String, trim: true, required: true },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    image: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    about: { type: String, default: '' },
    badge: { type: String, default: null },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '' },
    closeTime: { type: String, default: '' },
    startingPrice: { type: Number, default: 0 }, // rupees
    supportedPets: { type: [String], default: [] },
    visitTypes: { type: [String], default: [] }, // grooming: Salon Visit / Home Visit
    distanceText: { type: String, default: '' }, // display until real geo lands
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    // Vertical-specific verbatim blobs: facilities, rules, host, stats,
    // activities, pricePerDay/Week/Month, servicesList, hygiene, experience,
    // cancellation, availability text, slotTemplate…
    details: { type: Object, default: {} },
    cancellationPolicy: {
      freeBeforeHours: { type: Number, default: 4 },
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'approved',
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

providerSchema.index({ location: '2dsphere' }, { sparse: true });
providerSchema.index({ type: 1, active: 1, rating: -1 });

export const Provider = mongoose.model('Provider', providerSchema);
export default Provider;
