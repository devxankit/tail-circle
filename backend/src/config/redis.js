import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Shared Redis connection (cache, rate limits, OTP cooldowns, idempotency).
 * The API must keep working when Redis is down: every consumer checks
 * `isRedisReady()` and falls through to the database on a miss.
 */
let ready = false;
let errorLogged = false;

export const redis = new Redis(env.redis.url, {
  keyPrefix: env.redis.keyPrefix,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy(times) {
    // Capped backoff: 1s → 30s, retry forever so it recovers on its own.
    return Math.min(times * 1000, 30_000);
  },
});

redis.on('ready', () => {
  ready = true;
  errorLogged = false;
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  ready = false;
  if (!errorLogged) {
    logger.warn(`Redis unavailable (${err.code || err.message}) — running without cache`);
    errorLogged = true;
  }
});

redis.on('close', () => {
  ready = false;
});

export function isRedisReady() {
  return ready;
}

/**
 * Resolve once Redis is ready, or reject after `timeoutMs`. Lets consumers
 * that initialize at import time (e.g. rate-limit stores) tolerate the small
 * window between module load and connectRedis() finishing.
 */
export function waitForRedisReady(timeoutMs = 3000) {
  if (ready) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      redis.off('ready', onReady);
      reject(new Error('Redis not ready'));
    }, timeoutMs);
    const onReady = () => {
      clearTimeout(timer);
      resolve();
    };
    redis.once('ready', onReady);
  });
}

/** Connect without throwing — server boot never depends on Redis. */
export async function connectRedis() {
  try {
    await redis.connect();
  } catch {
    // 'error' handler already logged; retryStrategy keeps trying.
  }
}

export async function disconnectRedis() {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}
