import { ConnectionOptions, DefaultJobOptions } from 'bullmq';
import { env } from '../config/env';

export const QUEUE_NAMES = {
  ORDER_NOTIFICATIONS: 'order-notifications',
  SYSTEM_MAINTENANCE: 'system-maintenance',
} as const;

const parseRedisConnection = (): ConnectionOptions => {
  if (env.REDIS_URL) {
    try {
      const u = new URL(env.REDIS_URL);
      const isTls = u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: u.port ? parseInt(u.port, 10) : 6379,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        username:
          u.username && u.username !== 'default' ? decodeURIComponent(u.username) : undefined,
        maxRetriesPerRequest: null,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
      };
    } catch {
      // Fallback to standard host/port
    }
  }
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
};

export const redisConnectionOptions: ConnectionOptions = parseRedisConnection();

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: {
    count: 1000, // Keep last 1,000 completed jobs for audit
    age: 24 * 3600, // Keep for 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5,000 failed jobs for Dead-Letter inspection
  },
};
