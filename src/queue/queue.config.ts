import { ConnectionOptions, DefaultJobOptions } from 'bullmq';
import { env } from '../config/env';

export const QUEUE_NAMES = {
  ORDER_NOTIFICATIONS: 'order-notifications',
  SYSTEM_MAINTENANCE: 'system-maintenance',
} as const;

export const redisConnectionOptions: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

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
