import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env.js';
import { redis, isRedisReady, waitForRedisReady } from '../config/redis.js';

/**
 * Limiters use Redis when available so counts survive restarts and are
 * shared across instances. `passOnStoreError` keeps requests flowing
 * (unlimited) if Redis drops mid-flight rather than 500ing the API.
 */
function redisStore(prefix) {
  return new RedisStore({
    prefix,
    sendCommand: async (...args) => {
      // Store init runs at import time, before connectRedis() — wait for
      // the connection instead of failing the limiter permanently.
      if (!isRedisReady()) await waitForRedisReady();
      return redis.call(...args);
    },
  });
}

/** General-purpose API limiter, applied to the whole API. */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: redisStore('rl:api:'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Stricter limiter for auth/OTP endpoints to curb credential stuffing and OTP
 * pumping. Tunable via AUTH_RATE_LIMIT_MAX / AUTH_RATE_LIMIT_WINDOW_MS — it was
 * previously hardcoded, which meant hitting it during manual testing required a
 * code change.
 *
 * Keep this well below `apiLimiter` in production: it is the only thing
 * standing between an attacker and unlimited password/OTP guesses.
 */
export const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: redisStore('rl:auth:'),
  message: { success: false, message: 'Too many attempts, please try again later.' },
});
