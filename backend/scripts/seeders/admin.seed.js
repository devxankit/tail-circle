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
  { key: 'commission.default', value: 0.15, label: 'Default commission rate', group: 'commission' },
  { key: 'commission.shop', value: 0.15, label: 'Shop commission', group: 'commission' },
  { key: 'commission.clinic', value: 0.1, label: 'Clinic commission', group: 'commission' },
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

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@tailcircle.com').toLowerCase();
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

  for (const s of SETTINGS) {
    await PlatformSetting.updateOne(
      { key: s.key },
      { $set: { label: s.label, group: s.group }, $setOnInsert: { value: s.value } },
      { upsert: true }
    );
  }

  for (const b of BANNERS) {
    await Banner.updateOne(
      { seedKey: `banner:${b.key}` },
      { $set: { ...b, active: true, seedKey: `banner:${b.key}` } },
      { upsert: true }
    );
  }

  return `super-admin ${email} ready (pw: ${password}), ${SETTINGS.length} settings, ${BANNERS.length} banners`;
}
