import { NotificationProducer } from '../../src/queue/producers/notification.producer';
import { defaultJobOptions, QUEUE_NAMES } from '../../src/queue/queue.config';
import { startQueueWorkers, stopQueueWorkers } from '../../src/queue';

describe('BullMQ Background Jobs & Queue Architecture Unit Tests', () => {
  afterAll(async () => {
    await NotificationProducer.close();
    await stopQueueWorkers();
  });

  describe('Queue Job Configurations', () => {
    it('should have standard retry policies with exponential backoff', () => {
      expect(defaultJobOptions.attempts).toBe(3);
      expect(defaultJobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
    });

    it('should have sensible job retention limits to prevent memory bloat', () => {
      expect(defaultJobOptions.removeOnComplete).toBeDefined();
      expect(defaultJobOptions.removeOnFail).toBeDefined();
    });

    it('should define distinct queue names for domain segregation', () => {
      expect(QUEUE_NAMES.ORDER_NOTIFICATIONS).toBe('order-notifications');
      expect(QUEUE_NAMES.SYSTEM_MAINTENANCE).toBe('system-maintenance');
    });
  });

  describe('NotificationProducer Safe Fail-Open Execution', () => {
    it('should handle enqueue failure gracefully without throwing an exception', async () => {
      const mockOrderData = {
        orderId: 'mock-order-uuid-999',
        orderNumber: 'ORD-TEST-999',
        userEmail: 'shopper@orderflow.dev',
        totalAmount: 149.99,
      };

      await expect(NotificationProducer.sendOrderConfirmation(mockOrderData)).resolves.not.toThrow();
    });
  });

  describe('Worker Lifecycle & Shutdown', () => {
    it('should start and stop workers cleanly without unhandled rejections', async () => {
      expect(() => startQueueWorkers()).not.toThrow();
      await expect(stopQueueWorkers()).resolves.not.toThrow();
    });
  });
});
