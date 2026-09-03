import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { redis, isRedisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Redis-backed cache helpers. Every function degrades gracefully:
 * if Redis is down the loader/database path runs as if there were no cache.
 *
 * Key convention: `<module>:<what>:<hash>` — the client adds the global
 * `tc:` prefix (env.redis.keyPrefix) automatically.
 */

export function hashKey(input) {
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

/** Read-through cache: returns cached JSON or runs `loader` and stores it. */
export async function getOrSet(key, ttlSeconds, loader) {
  if (isRedisReady()) {
    try {
      const hit = await redis.get(key);
      if (hit !== null) return JSON.parse(hit);
    } catch (err) {
      logger.warn(`cache get failed for ${key}: ${err.message}`);
    }
  }

  const value = await loader();

  if (isRedisReady() && value !== undefined) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn(`cache set failed for ${key}: ${err.message}`);
    }
  }
  return value;
}

/**
 * Delete all keys matching a pattern or namespace, e.g. `invalidate('shop')` or `invalidate('shop:*')`.
 * First attempts O(1) tracking-set invalidation (`cache_set:<namespace>`); falls back to SCAN if needed.
 */
export async function invalidate(pattern) {
  if (!isRedisReady()) return 0;

  // Extract namespace, e.g. "community:*" -> "community", "shop" -> "shop"
  const namespace = pattern.replace(/:\*$/, '').replace(/:resp.*$/, '');
  const setKey = `cache_set:${namespace}`;

  try {
    const keys = await redis.smembers(setKey);
    if (keys && keys.length > 0) {
      await redis.del(...keys, setKey);
      return keys.length;
    }
  } catch (err) {
    logger.warn(`cache set-based invalidate failed for ${namespace}: ${err.message}`);
  }

  // Fallback scan for dynamic pattern keys if tracking set was empty
  const prefix = env.redis.keyPrefix;
  let cursor = '0';
  let deleted = 0;
  try {
    const scanPattern = pattern.includes('*') ? pattern : `${pattern}:*`;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}${scanPattern}`, 'COUNT', 500);
      cursor = next;
      if (keys.length) {
        await redis.del(...keys.map((k) => k.slice(prefix.length)));
        deleted += keys.length;
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn(`cache invalidate failed for ${pattern}: ${err.message}`);
  }
  return deleted;
}

/**
 * Route middleware caching full JSON responses of public GET endpoints.
 * Only for catalog-style data — never mount on user-specific routes.
 *
 *   router.get('/products', cacheResponse('shop', 120), listProducts);
 */
export function cacheResponse(namespace, ttlSeconds) {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !isRedisReady()) return next();

    const key = `${namespace}:resp:${hashKey(req.originalUrl)}`;
    try {
      const hit = await redis.get(key);
      if (hit !== null) {
        res.set('X-Cache', 'HIT');
        return res.type('application/json').send(hit);
      }
    } catch (err) {
      logger.warn(`cacheResponse get failed: ${err.message}`);
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && isRedisReady()) {
        const setKey = `cache_set:${namespace}`;
        redis
          .multi()
          .set(key, JSON.stringify(body), 'EX', ttlSeconds)
          .sadd(setKey, key)
          .expire(setKey, ttlSeconds * 2)
          .exec()
          .catch((err) => logger.warn(`cacheResponse set failed: ${err.message}`));
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}
