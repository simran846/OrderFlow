import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let isRedisConnected = false;

// Create Redis client instance with retry strategy
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    // Reconnect with backoff up to 3 seconds
    if (times > 5) {
      logger.warn('⚠️ Redis reconnection attempts exceeded limit. Operating in cache-bypass mode.');
      return null; // Stop reconnecting after 5 attempts
    }
    return Math.min(times * 200, 3000);
  },
});

redis.on('connect', () => {
  isRedisConnected = true;
  logger.info(' Connected to Redis cache broker');
});

redis.on('error', (err) => {
  isRedisConnected = false;
  logger.warn({ err: err.message }, '⚠️ Redis connection error. Cache operations will safely fall back to DB.');
});

redis.on('close', () => {
  isRedisConnected = false;
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
  } catch (error) {
    logger.warn({ err: error }, '⚠️ Initial Redis connection failed. Application will operate with DB fallback.');
  }
};

/**
 * Cache Helper with Safe Fallback:
 * If Redis is down or encounters an error, these methods catch exceptions
 * and return null / no-op so the application NEVER crashes on cache errors.
 */
export class CacheService {
  public static async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected) return null;
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn({ key, err: error }, '⚠️ Failed to read from Redis cache. Falling back to DB.');
      return null;
    }
  }

  public static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!isRedisConnected) return;
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      logger.warn({ key, err: error }, '⚠️ Failed to write to Redis cache.');
    }
  }

  public static async del(key: string): Promise<void> {
    if (!isRedisConnected) return;
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn({ key, err: error }, '⚠️ Failed to delete Redis key.');
    }
  }

  public static async delByPattern(pattern: string): Promise<void> {
    if (!isRedisConnected) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn({ pattern, err: error }, '⚠️ Failed to delete Redis keys by pattern.');
    }
  }
}
