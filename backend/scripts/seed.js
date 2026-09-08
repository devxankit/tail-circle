/**
 * Idempotent seed runner. Each phase registers its seeder here; running the
 * script twice never duplicates data (seeders upsert by natural keys).
 *
 *   node scripts/seed.js            # run every registered seeder
 *   node scripts/seed.js products   # run only the named seeder(s)
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectRedis, disconnectRedis, waitForRedisReady } from '../src/config/redis.js';
import { logger } from '../src/utils/logger.js';

/** name → async ({ logger }) => summary string */
const seeders = new Map();

export function registerSeeder(name, fn) {
  seeders.set(name, fn);
}

// ── Register per-module seeders here as phases land ──────
import { seedDemoUser } from './seeders/demoUser.seed.js';
import { seedBreeds } from './seeders/breeds.seed.js';
import { seedShop } from './seeders/shop.seed.js';
import { seedProviders } from './seeders/providers.seed.js';
import { seedMeals } from './seeders/meals.seed.js';
import { seedAdoption } from './seeders/adoption.seed.js';
import { seedSocial } from './seeders/social.seed.js';
import { seedWallet } from './seeders/wallet.seed.js';
import { seedVendors } from './seeders/vendors.seed.js';
import { seedClinic } from './seeders/clinic.seed.js';
import { seedAdmin } from './seeders/admin.seed.js';
import { seedAdminConfig } from './seeders/adminConfig.seed.js';
registerSeeder('demo-user', seedDemoUser);
registerSeeder('breeds', seedBreeds);
registerSeeder('shop', seedShop);
registerSeeder('providers', seedProviders);
registerSeeder('meals', seedMeals);
registerSeeder('adoption', seedAdoption);
registerSeeder('social', seedSocial);
registerSeeder('wallet', seedWallet);
registerSeeder('vendors', seedVendors);
registerSeeder('clinic', seedClinic);
registerSeeder('admin', seedAdmin);
registerSeeder('admin-config', seedAdminConfig);

async function main() {
  const only = process.argv.slice(2);
  const toRun = only.length ? only : [...seeders.keys()];

  if (!toRun.length) {
    logger.info('No seeders registered yet — nothing to do.');
    return;
  }

  await mongoose.connect(env.mongoUri);
  logger.info(`Connected to ${mongoose.connection.name}`);

  // The Redis client is lazyConnect, so without this a seeder's cache
  // invalidation is a silent no-op and the API keeps serving the pre-seed
  // response until its TTL expires. Optional: seeding still works without it.
  await connectRedis();
  try {
    await waitForRedisReady(3000);
  } catch {
    logger.warn('Redis not ready — cached API responses will expire on their own TTL');
  }

  for (const name of toRun) {
    const fn = seeders.get(name);
    if (!fn) {
      logger.warn(`Unknown seeder "${name}" — registered: ${[...seeders.keys()].join(', ')}`);
      continue;
    }
    const summary = await fn({ logger });
    logger.info(`✅ ${name}: ${summary || 'done'}`);
  }

  await mongoose.disconnect();
  await disconnectRedis();
}

main().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
