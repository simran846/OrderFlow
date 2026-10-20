import { Worker } from 'bullmq';
import { IdempotencyService } from '../../modules/idempotency/idempotency.service';
import { logger } from '../../utils/logger';
import { QUEUE_NAMES, redisConnectionOptions } from '../queue.config';

export const createMaintenanceWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAMES.SYSTEM_MAINTENANCE,
    async (job) => {
      logger.info(
        { jobId: job.id },
        '🧹 [Maintenance Worker] Running scheduled idempotency records cleanup...'
      );
      const cleanedCount = await IdempotencyService.cleanupExpiredRecords();
      logger.info({ cleanedCount }, '✅ [Maintenance Worker] Purged expired idempotency records');
      return { cleanedCount };
    },
    {
      connection: redisConnectionOptions,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Maintenance job encountered failure');
  });

  return worker;
};
