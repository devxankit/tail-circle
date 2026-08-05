import mongoose from 'mongoose';

export const OFFERING_KINDS = ['plan', 'package', 'addon', 'menu_item'];

/**
 * Everything purchasable at a provider: daycare plans, grooming packages,
 * addons and à-la-carte menu items. Bookings price against THIS collection —
 * never against client-sent numbers. `providerId` null = platform-wide
 * (e.g. shared grooming/daycare addon lists in the mock data).
 */
const serviceOfferingSchema = new mongoose.Schema(
  {
    legacyId: { type: String, index: true }, // 'plan_day', 'pkg_2', 'addon_1', 'm4'
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
      index: true,
    },
    providerType: { type: String, required: true }, // daycare | grooming | …
    kind: { type: String, enum: OFFERING_KINDS, required: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // rupees
    unit: { type: String, default: null }, // day | week | month (daycare)
    includes: { type: [String], default: [] },
    category: { type: String, default: null }, // addon category / menu section
    isPopular: { type: Boolean, default: false },
    badge: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceOfferingSchema.index({ providerType: 1, kind: 1, active: 1 });
serviceOfferingSchema.index({ providerId: 1, legacyId: 1 });

export const ServiceOffering = mongoose.model('ServiceOffering', serviceOfferingSchema);
export default ServiceOffering;
