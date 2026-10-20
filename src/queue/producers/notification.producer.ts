import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { defaultJobOptions, QUEUE_NAMES, redisConnectionOptions } from '../queue.config';

export interface OrderConfirmationJobData {
  orderId: string;
  orderNumber: string;
  userEmail: string;
  totalAmount: number;
}

export class NotificationProducer {
  private static orderQueue: Queue | null = null;
  private static maintenanceQueue: Queue | null = null;

  public static getOrderQueue(): Queue {
    if (!this.orderQueue) {
      this.orderQueue = new Queue(QUEUE_NAMES.ORDER_NOTIFICATIONS, {
        connection: redisConnectionOptions,
        defaultJobOptions,
      });
    }
    return this.orderQueue;
  }

  public static getMaintenanceQueue(): Queue {
    if (!this.maintenanceQueue) {
      this.maintenanceQueue = new Queue(QUEUE_NAMES.SYSTEM_MAINTENANCE, {
        connection: redisConnectionOptions,
        defaultJobOptions,
      });
    }
    return this.maintenanceQueue;
  }

  /**
   * Enqueues an order confirmation notification.
   * Safe fail-open behavior: Even if Redis is temporarily unreachable,
   * the primary database transaction and HTTP response remain intact.
   */
  public static async sendOrderConfirmation(data: OrderConfirmationJobData): Promise<void> {
    if (env.NODE_ENV === 'test') {
      logger.info(
        { orderId: data.orderId },
        '[Test Mode] Simulated order confirmation background job'
      );
      return;
    }

    try {
      const queue = this.getOrderQueue();
      const jobId = `order-confirm-${data.orderId}`;
      await queue.add('send-order-confirmation', data, {
        jobId, // Built-in job deduplication
      });
      logger.info({ orderId: data.orderId, jobId }, 'Enqueued order confirmation background job');
    } catch (error: any) {
      logger.warn(
        { orderId: data.orderId, err: error.message },
        '⚠️ Failed to enqueue order confirmation to Redis. Core order transaction was preserved.'
      );
    }
  }

  public static async triggerMaintenanceCleanup(): Promise<void> {
    if (env.NODE_ENV === 'test') {
      return;
    }

    try {
      const queue = this.getMaintenanceQueue();
      await queue.add(
        'cleanup-expired-idempotency',
        {},
        {
          jobId: `cleanup-${new Date().toISOString().slice(0, 13)}`, // Run at most once per hour
        }
      );
      logger.info('Enqueued idempotency records cleanup job');
    } catch (error: any) {
      logger.warn({ err: error.message }, '⚠️ Failed to enqueue maintenance cleanup job');
    }
  }

  public static async close(): Promise<void> {
    const promises: Promise<void>[] = [];
    if (this.orderQueue) {
      promises.push(this.orderQueue.close());
      this.orderQueue = null;
    }
    if (this.maintenanceQueue) {
      promises.push(this.maintenanceQueue.close());
      this.maintenanceQueue = null;
    }
    await Promise.all(promises);
  }
}
