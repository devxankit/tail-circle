/**
 * The one place a vendor category's display name is written.
 *
 * Keys are the `vendorType` values stored on User/VendorProfile — never change
 * those, every existing vendor row is keyed on them. Only the labels here are
 * user-facing, so a rename is a one-line edit rather than a hunt through the
 * admin tables, the signup form, the sidebars and each portal header, which is
 * how the previous labels drifted out of sync (several maps were missing
 * grooming, daycare and adoption entirely).
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

/**
 * Signup/login categories, in the order both forms show them.
 *
 * `slug` is what the registration API expects — `resolveVendorType()` maps it
 * to the `vendorType` above. Keep it in step with TYPE_MAP in
 * vendor.auth.service.js.
 */
export const VENDOR_CATEGORIES = [
  { slug: 'grooming', vendorType: 'grooming' },
  { slug: 'daycare', vendorType: 'daycare' },
  { slug: 'doctor', vendorType: 'clinic' },
  { slug: 'shop', vendorType: 'shop' },
  { slug: 'event', vendorType: 'events' },
  { slug: 'memorial', vendorType: 'memorial' },
  { slug: 'meal', vendorType: 'meal_subscription' },
  { slug: 'adopt', vendorType: 'adoption' },
].map((c) => ({ ...c, label: VENDOR_TYPE_LABEL[c.vendorType] }));

/** Display name for a signup slug ('doctor' → 'Veterinarian Partner'). */
export const slugLabel = (slug) =>
  VENDOR_CATEGORIES.find((c) => c.slug === slug)?.label || 'Select your category';

/**
 * Stored `vendorType` → the portal that business line is run from.
 *
 * The one place this mapping is written. It was duplicated across App.jsx and
 * VendorAuth.jsx, which is how a vendor could be sent to a route that no longer
 * existed after one copy was updated and the other was not.
 */
export const VENDOR_HOME = {
  shop: '/vendor/shop-provider',
  clinic: '/vendor/doctor/consultations',
  meal_subscription: '/vendor/meal-provider/dashboard',
  events: '/vendor/events-organizer',
  memorial: '/vendor/memorial-provider',
  grooming: '/vendor/grooming-provider',
  daycare: '/vendor/daycare-provider',
  adoption: '/vendor/adoption-partner',
};

/** Where a vendor's panel for one business line opens. */
export const vendorHome = (vendorType) => VENDOR_HOME[vendorType] || '/vendor/login';

/**
 * Where to send a vendor after login.
 *
 * One business line goes straight to its panel, exactly as before. Several go
 * to the hub to choose — opening one of them arbitrarily would drop a vendor
 * into whichever business the code happened to list first.
 */
export const postLoginPath = (vendorTypes = []) =>
  vendorTypes.length === 1 ? vendorHome(vendorTypes[0]) : vendorTypes.length ? '/vendor/hub' : '/vendor/login';

export default VENDOR_TYPE_LABEL;
