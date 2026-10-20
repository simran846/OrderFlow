import { Job, Worker } from 'bullmq';
import { logger } from '../../utils/logger';
import { OrderConfirmationJobData } from '../producers/notification.producer';
import { QUEUE_NAMES, redisConnectionOptions } from '../queue.config';

export const createNotificationWorker = (): Worker<OrderConfirmationJobData> => {
  const worker = new Worker<OrderConfirmationJobData>(
    QUEUE_NAMES.ORDER_NOTIFICATIONS,
    async (job: Job<OrderConfirmationJobData>) => {
      logger.info(
        { jobId: job.id, orderNumber: job.data.orderNumber, recipient: job.data.userEmail },
        '📨 [Notification Worker] Processing order confirmation notification...'
      );

      // Simulate sending transactional email / webhook notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info(
        { jobId: job.id, orderNumber: job.data.orderNumber, total: `$${job.data.totalAmount}` },
        '✅ [Notification Worker] Order confirmation email delivered successfully'
      );

      return { delivered: true, sentAt: new Date().toISOString() };
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5, // Process up to 5 notification jobs simultaneously
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        err: err.message,
      },
      '❌ [DLQ Alert] Background job failed after attempt'
    );
  });

  worker.on('error', (err) => {
    logger.warn({ err: err.message }, '⚠️ [Notification Worker] Redis connection issue (will retry)');
  });

  return worker;
};
