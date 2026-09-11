import bcrypt from 'bcryptjs';
import { User } from '../../src/modules/user/user.model.js';
import { Banner, PlatformSetting } from '../../src/modules/admin/admin.models.js';

/**
 * Super-admin bootstrap + platform config. Credentials are env-driven
 * (ADMIN_EMAIL / ADMIN_PASSWORD) with demo defaults. Banners back the user-app
 * Home rails (public `GET /banners`); settings hold commission/tax/meal-trial
 * defaults matching the admin panel's config views.
 */

const SETTINGS = [
  // Commission: one row per vendor category, plus the global fallback used by
  // any category without its own. Values are fractions -- 0.15 is 15%. A
  // vendor inherits its category unless its profile carries an override.
  { key: 'commission.default', value: 0.15, label: 'Default commission rate', group: 'commission' },
  // Guardrails on what any commission rate may be set to, as percentages.
  // A mistyped 2 instead of 20, or a 0 that hands a vendor the platform's
  // whole cut, is refused by the API rather than merely discouraged.
  { key: 'commission.minPercent', value: 5, label: 'Minimum commission (%)', group: 'commission' },
  { key: 'commission.maxPercent', value: 40, label: 'Maximum commission (%)', group: 'commission' },
  { key: 'commission.shop', value: 0.15, label: 'Shop Partner commission', group: 'commission' },
  // 0.15, not the 0.10 this row used to carry: that value was never read by
  // any calculation, so clinics have always been billed the 15% default.
  // Seeding 0.10 now would have handed every clinic a silent 5-point rate cut.
  { key: 'commission.clinic', value: 0.15, label: 'Veterinarian Partner commission', group: 'commission' },
  { key: 'commission.grooming', value: 0.15, label: 'Grooming Partner commission', group: 'commission' },
  { key: 'commission.daycare', value: 0.15, label: 'Day Care Partner commission', group: 'commission' },
  { key: 'commission.events', value: 0.15, label: 'Events Partner commission', group: 'commission' },
  { key: 'commission.memorial', value: 0.15, label: 'Last Ride Partner commission', group: 'commission' },
  { key: 'commission.meal_subscription', value: 0.15, label: 'Fresh Meals Partner commission', group: 'commission' },
  { key: 'commission.adoption', value: 0.15, label: 'Adoption Partner commission', group: 'commission' },
  { key: 'tax.gst', value: 0.05, label: 'GST rate', group: 'tax' },
  { key: 'delivery.fee', value: 40, label: 'Delivery fee (₹)', group: 'general' },
  { key: 'meal_trial.price', value: 250, label: 'Saturday trial price (₹)', group: 'meal_trial' },
  { key: 'meal_trial.limitOnePerClient', value: true, label: 'One free trial per client', group: 'meal_trial' },
  { key: 'meal_trial.saturdayRouting', value: true, label: 'Saturday dispatch routing', group: 'meal_trial' },
  { key: 'feature.communityEnabled', value: true, label: 'Community feed enabled', group: 'feature' },
];

// Verbatim Home-carousel banners (retire the hardcoded `banners` const in Home.jsx).
const BANNERS = [
  { key: 'home_health', title: 'Pet Health Insurance', btnText: 'Get Quote', image: '/assets/banners/banner_health.png', bg: 'from-[#F9D5CE] to-[#F9D5CE]', link: '/app/services', slot: 'Home Hero', sort: 1 },
  { key: 'home_grooming', title: 'Grooming at Home', btnText: 'Book Now', image: '/assets/banners/banner_grooming_home.png', bg: 'from-[#80C1BF] to-[#66B4B1]', link: '/app/services/grooming', slot: 'Home Hero', sort: 2 },
  { key: 'home_travel', title: 'Pet Travel Agent Services', btnText: 'Explore', image: '/assets/banners/banner_travel.png', bg: 'from-[#9FD1CF] to-[#BFE0DF]', link: '/app/services', slot: 'Home Hero', sort: 3 },
  // Home "Special Offers" rail (retires Home.jsx's hardcoded `specialOffers`
  // array). Colors/tags for these are computed client-side from index —
  // only real content (title/desc/badge/image/link) lives here.
  { key: 'offer_grooming', title: 'Premium Grooming', subtitle: 'Give your pet the best care they deserve.', badge: '20% OFF', btnText: 'Book Now', image: '/assets/offers/offer_grooming.png', link: '/app/services/grooming', slot: 'Home Offers', sort: 20 },
  { key: 'offer_meals', title: 'Fresh Meals', subtitle: 'Healthy, fresh meals delivered to your door.', badge: '30% OFF', btnText: 'Subscribe', image: '/assets/offers/offer_food.png', link: '/app/meals', slot: 'Home Offers', sort: 21 },
  { key: 'offer_vet', title: 'Vet Checkup', subtitle: 'First consultation is absolutely free.', badge: 'FREE', btnText: 'Claim Now', image: '/assets/offers/offer_vet.png', link: '/app/services/doctors', slot: 'Home Offers', sort: 22 },
  { key: 'offer_toys', title: 'Toys Clearance', subtitle: 'Huge discounts on premium toys & accessories.', badge: '50% OFF', btnText: 'Shop Now', image: '/assets/offers/offer_toys.png', link: '/app/shop', slot: 'Home Offers', sort: 23 },
  // Section-page promo banners (admin-managed via BannersContent → replaces the
  // fresh_food/adoption/daycare localStorage CMS read by 4 user screens).
  { key: 'fresh_food', title: 'Fresh Food', image: '', slot: 'Section', sort: 10 },
  { key: 'adoption', title: 'Adoption', image: '', slot: 'Section', sort: 11 },
  { key: 'daycare', title: 'Daycare', image: '', slot: 'Section', sort: 12 },
];

/**
 * Home service artwork -- the wide Meet & Match card and the eight tiles below
 * it. These carry the images the app shipped with, so the admin panel opens on
 * the live artwork and an operator replaces it rather than starting from empty
 * slots. Keys must match `frontend/src/constants/homeServiceCards.js`; the
 * user app folds these rows over the same defaults field by field.
 */
const HOME_SERVICE_BANNERS = [
  { key: 'home_meet_match', title: 'Meet & Match', subtitle: 'Find playdates, friends & mates near you', image: '/assets/banners/pet_matches_love.png', link: '/app/matches', slot: 'Home Feature', sort: 30 },
  { key: 'home_service_grooming', title: 'Grooming', badge: 'SPA', subtitle: 'Spa & salon', image: '/assets/quick_links/grooming.jpeg', link: '/app/services/grooming', slot: 'Home Services', sort: 41 },
  { key: 'home_service_daycare', title: 'Daycare', badge: 'STAY', subtitle: 'Safe & fun boarding', image: '/assets/quick_links/daycare_stay.png', link: '/app/services/daycare', slot: 'Home Services', sort: 42 },
  { key: 'home_service_shop', title: 'Shop', badge: 'SHOP', subtitle: 'Toys & Treats', image: '/assets/quick_links/shop_box.png', link: '/app/shop', slot: 'Home Services', sort: 43 },
  { key: 'home_service_vets', title: 'Find Vets', badge: 'VETS', subtitle: 'Book 60 sec', image: '/assets/quick_links/vet.jpeg', link: '/app/services/doctors', slot: 'Home Services', sort: 44 },
  { key: 'home_service_events', title: 'Events', badge: 'EVENTS', subtitle: 'Parties & shows', image: '/assets/quick_links/events_party.png', link: '/app/services/events', slot: 'Home Services', sort: 45 },
  { key: 'home_service_meals', title: 'Meals', badge: 'DIET', subtitle: 'Fresh & healthy diet', image: '/assets/quick_links/meals_fresh.png', link: '/app/meals', slot: 'Home Services', sort: 46 },
  { key: 'home_service_community', title: 'Community', badge: 'SOCIAL', subtitle: 'Connect & share', image: '/assets/quick_links/community.jpeg', link: '/app/community', slot: 'Home Services', sort: 47 },
  { key: 'home_service_adopt', title: 'Adopt', badge: 'ADOPT', subtitle: 'Find a companion', image: '/assets/quick_links/adopt_pet.png', link: '/app/adopt', slot: 'Home Services', sort: 48 },
];

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'Contact@tailcircle.in').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: 'System Admin',
        role: 'admin',
        adminRole: 'super',
        permissions: ['*'],
        passwordHash,
        isPhoneVerified: true,
      },
    },
    { upsert: true }
  );

  await seedPlatformSettings();

  for (const b of BANNERS) {
    await Banner.updateOne(
      { seedKey: `banner:${b.key}` },
      { $set: { ...b, active: true, seedKey: `banner:${b.key}` } },
      { upsert: true }
    );
  }

  await seedHomeServiceBanners();

  return `super-admin ${email} ready (pw: ${password}), ${SETTINGS.length} settings, ${BANNERS.length + HOME_SERVICE_BANNERS.length} banners`;
}

/**
 * Home service artwork, seedable on its own.
 *
 * Registered separately as the `home-services` seeder so an operator can put
 * the shipped tile images into a live database without also running the
 * super-admin bootstrap above, which rewrites the admin account's password
 * hash from the environment.
 *
 * Content fields use $setOnInsert, not $set: these rows are what the admin
 * panel's Home Service Images screen writes to, so a re-run must not roll an
 * uploaded image back to the shipped asset. Only the structural fields --
 * slot and sort -- are refreshed every time.
 */
export async function seedHomeServiceBanners() {
  for (const b of HOME_SERVICE_BANNERS) {
    const { key, slot, sort, ...content } = b;
    await Banner.updateOne(
      { seedKey: `banner:${key}` },
      {
        $set: { key, slot, sort, seedKey: `banner:${key}` },
        $setOnInsert: { ...content, active: true },
      },
      { upsert: true }
    );
  }
  return `${HOME_SERVICE_BANNERS.length} Home service banners ready`;
}

/**
 * Platform settings, seedable on its own.
 *
 * Registered separately as the `settings` seeder so new commission categories
 * can be added to a live database without also running the super-admin
 * bootstrap, which rewrites the admin account's password hash from the
 * environment.
 *
 * Values use $setOnInsert: a re-run adds rows that did not exist and refreshes
 * labels, but never resets a rate an operator has tuned.
 */
export async function seedPlatformSettings() {
  for (const s of SETTINGS) {
    await PlatformSetting.updateOne(
      { key: s.key },
      { $set: { label: s.label, group: s.group }, $setOnInsert: { value: s.value } },
      { upsert: true }
    );
  }
  return `${SETTINGS.length} platform settings ready`;
}
