import mongoose from 'mongoose';

export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'small_pet', 'other'];

/**
 * A user's pet. Created in onboarding step 1 with basics, then patched with
 * media (step 2) and health details (step 3) — every field beyond the basics
 * is optional so staged creation works. Match-profile fields (Phase 7) live
 * here too so a pet IS the swipe card.
 */
const petSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true, maxlength: 40 },
    type: { type: String, enum: PET_TYPES, default: 'dog' },
    typeText: { type: String, trim: true, default: '' }, // free text when type = other
    breed: { type: String, trim: true, default: 'Mixed Breed' },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    dob: { type: Date, default: null },
    ageText: { type: String, trim: true, default: '' }, // "2 Years" when exact dob unknown
    weightKg: { type: Number, min: 0, max: 200, default: null },
    avatarUrl: { type: String, default: '' },
    photos: { type: [String], default: [] }, // gallery, max enforced in service
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    temperament: { type: [String], default: [] }, // Friendly, Playful, …
    diet: { type: String, trim: true, default: '' },
    mood: { type: String, trim: true, default: '' },

    health: {
      vaccinated: { type: Boolean, default: false },
      dewormed: { type: Boolean, default: false },
      neutered: { type: Boolean, default: false },
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
      lastVetVisit: { type: Date, default: null },
    },

    // Match/adoption surfacing (Phase 6/7)
    isMatchProfile: { type: Boolean, default: false },
    activityLevel: { type: String, enum: ['low', 'medium', 'high', null], default: null },
    size: { type: String, enum: ['small', 'medium', 'large', null], default: null },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

petSchema.index({ ownerId: 1, deletedAt: 1 });

export const Pet = mongoose.model('Pet', petSchema);
export default Pet;
