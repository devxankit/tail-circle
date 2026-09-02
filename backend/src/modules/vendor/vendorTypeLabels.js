/**
 * Display names for vendor categories, for anything the API sends to a screen.
 *
 * Keys are the stored `vendorType` values — those are the identity of every
 * vendor row and must not change. Mirrors
 * `frontend/src/constants/vendorTypes.js`; if you rename a category, change
 * both.
 */
export const VENDOR_TYPE_LABEL = {
  grooming: 'Grooming Partner',
  daycare: 'Day Care Partner',
  clinic: 'Veterinarian Partner',
  shop: 'Shop Partner',
  events: 'Events Partner',
  memorial: 'Last Ride Partner',
  meal_subscription: 'Fresh Meals Partner',
  adoption: 'Adoption Partner',
};

/** Display name for a stored `vendorType`, safe for unknown values. */
export const vendorTypeLabel = (vendorType) => VENDOR_TYPE_LABEL[vendorType] || 'Partner';

export default VENDOR_TYPE_LABEL;
