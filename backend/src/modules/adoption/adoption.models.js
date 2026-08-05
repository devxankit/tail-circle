import mongoose from 'mongoose';

/**
 * Adoption domain + pet Marketplace. Display fields mirror the mock shapes
 * verbatim (`mockAdoptApi.js` pets, `Marketplace.jsx` listings).
 */

const adoptionListingSchema = new mongoose.Schema(
  {
    legacyId: { type: String, unique: true }, // ADOPT-101 …
    name: { type: String, required: true },
    type: { type: String, default: 'Dog' },
    breed: { type: String, required: true, index: true },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    price: { type: Number, default: 0 }, // rupees, 0 = free
    distance: { type: String, default: '' },
    weight: { type: String, default: '' },
    location: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Available', 'Pending', 'Adopted', 'Withdrawn'],
      default: 'Available',
      index: true,
    },
    vaccinated: { type: Boolean, default: false },
    dewormed: { type: Boolean, default: false },
    neutered: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    about: { type: String, default: '' },
    traits: { type: [String], default: [] },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    shelter: {
      name: { type: String, default: '' },
      verified: { type: Boolean, default: false },
      image: { type: String, default: '' },
    },
  },
  { timestamps: true }
);
export const AdoptionListing = mongoose.model('AdoptionListing', adoptionListingSchema);

/** Breed rail cards on AdoptHome (name/image/count/size/traits). */
const adoptionBreedSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    image: { type: String, default: '' },
    size: { type: String, default: '' },
    traits: { type: String, default: '' },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const AdoptionBreed = mongoose.model('AdoptionBreed', adoptionBreedSchema);

export const APPLICATION_STEPS = [
  'submitted',
  'home_check_scheduled',
  'approved',
  'meet_scheduled',
  'agreement_signed',
  'completed',
];

const adoptionApplicationSchema = new mongoose.Schema(
  {
    applicationNo: { type: String, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdoptionListing',
      required: true,
    },
    form: { type: Object, default: {} }, // application questionnaire
    homeCheck: { scheduledAt: { type: String, default: null }, notes: { type: String, default: '' } },
    meet: { scheduledAt: { type: String, default: null } },
    agreementAcceptedAt: { type: Date, default: null },
    feePaise: { type: Number, default: 0 },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: {
      type: String,
      enum: [...APPLICATION_STEPS, 'rejected', 'cancelled'],
      default: 'submitted',
      index: true,
    },
    timeline: [
      {
        _id: false,
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);
adoptionApplicationSchema.index(
  { userId: 1, listingId: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: ['rejected', 'cancelled'] } } }
);
adoptionApplicationSchema.pre('save', function assignNo() {
  if (!this.applicationNo) {
    const d = new Date();
    this.applicationNo = `ADP${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${Math.floor(Math.random() * 90 + 10)}`;
  }
});
export const AdoptionApplication = mongoose.model('AdoptionApplication', adoptionApplicationSchema);

/** Marketplace buy/sell listings (user-created via the Sell tab). */
const marketplaceListingSchema = new mongoose.Schema(
  {
    legacyId: { type: String, unique: true, sparse: true }, // m1..m4 seeds
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    seller: { type: String, default: '' }, // display name
    name: { type: String, required: true },
    species: { type: String, default: 'Dog' },
    breed: { type: String, default: '' },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    price: { type: String, default: '0' }, // display string in the mock
    vaccinated: { type: String, default: 'Not Vaccinated' },
    img: { type: String, default: '' },
    location: { type: String, default: '' },
    verification: { type: Boolean, default: false },
    cert: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'booked', 'sold', 'removed'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);
export const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);
