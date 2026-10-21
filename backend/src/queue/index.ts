import { Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NotificationProducer } from './producers/notification.producer';
import { createMaintenanceWorker } from './workers/maintenance.worker';
import { createNotificationWorker } from './workers/notification.worker';

let notificationWorker: Worker | null = null;
let maintenanceWorker: Worker | null = null;

export const startQueueWorkers = (): void => {
  if (env.NODE_ENV === 'production' && !env.REDIS_URL && env.REDIS_HOST === 'localhost') {
    logger.info(
      'ℹ️ Redis URL not configured in production. BullMQ operating in worker-bypass mode.'
    );
    return;
  }

  try {
    notificationWorker = createNotificationWorker();
    maintenanceWorker = createMaintenanceWorker();
    logger.info(' BullMQ background workers initialized and listening');
  } catch (error: any) {
    logger.warn(
      { err: error.message },
      '⚠️ Failed to start BullMQ workers (Redis offline). App running in worker-bypass mode.'
    );
  }
};

export const stopQueueWorkers = async (): Promise<void> => {
  logger.info('Shutting down BullMQ workers and producers...');
  await Promise.allSettled([
    notificationWorker ? notificationWorker.close() : Promise.resolve(),
    maintenanceWorker ? maintenanceWorker.close() : Promise.resolve(),
    NotificationProducer.close(),
  ]);
  logger.info('BullMQ workers and producers cleanly stopped.');
};
