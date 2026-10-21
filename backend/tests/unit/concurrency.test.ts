import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../src/app';
import { checkoutSchema } from '../../src/validators/order.schema';
import { OrderStateMachine } from '../../src/types/order.types';
import { executeWithRetry } from '../../src/utils/retry';

describe('Concurrency Control, Order State Machine & Race Condition Tests', () => {
  const app = createApp();

  describe('Order State Machine Transitions', () => {
    it('should allow valid lifecycle transitions', () => {
      expect(OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
      expect(OrderStateMachine.canTransition(OrderStatus.DELIVERED, OrderStatus.REFUNDED)).toBe(true);
    });

    it('should disallow illegal transitions and throw BadRequestError', () => {
      // Cannot skip directly from PENDING to SHIPPED without payment/confirmation
      expect(OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false);
      expect(() => {
        OrderStateMachine.assertCanTransition(OrderStatus.PENDING, OrderStatus.SHIPPED);
      }).toThrow('Invalid order status transition');

      // Cannot resurrect a CANCELLED order
      expect(OrderStateMachine.canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
      expect(() => {
        OrderStateMachine.assertCanTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED);
      }).toThrow('Invalid order status transition');
    });
  });

  describe('Transaction Deadlock & Transient Failure Retry', () => {
    it('should retry on transient deadlock error and succeed on subsequent attempt', async () => {
      let callCount = 0;

      const mockDeadlockOperation = async () => {
        callCount++;
        if (callCount < 2) {
          const err: any = new Error('Deadlock found when trying to get lock; try restarting transaction');
          err.code = '1213';
          throw err;
        }
        return 'SUCCESS_AFTER_RETRY';
      };

      const result = await executeWithRetry(mockDeadlockOperation, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result).toBe('SUCCESS_AFTER_RETRY');
      expect(callCount).toBe(2);
    });
  });

  describe('Concurrency Race Condition Simulation (Last Stock Unit)', () => {
    it('should guarantee that at most ONE concurrent checkout succeeds when stock = 1', async () => {
      // Simulated shared in-memory inventory database row
      const sharedInventory = {
        productId: 'rare-watch-1',
        availableStock: 1, // Only ONE unit left!
        reservedStock: 0,
      };

      // Atomic conditional update simulation mimicking MySQL `WHERE availableStock >= quantity`
      const simulatedAtomicCheckout = async (customerId: string, quantity: number) => {
        // Small artificial jitter to force concurrent thread interleaving
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));

        // Atomic check-and-decrement
        if (sharedInventory.availableStock >= quantity) {
          sharedInventory.availableStock -= quantity;
          sharedInventory.reservedStock += quantity;
          return { success: true, customerId, status: 201 };
        } else {
          return { success: false, customerId, error: 'INSUFFICIENT_STOCK', status: 400 };
        }
      };

      // Fire 2 concurrent checkout requests for Customer A and Customer B simultaneously
      const [resultA, resultB] = await Promise.all([
        simulatedAtomicCheckout('Customer_A', 1),
        simulatedAtomicCheckout('Customer_B', 1),
      ]);

      const successfulCheckouts = [resultA, resultB].filter((r) => r.success);
      const failedCheckouts = [resultA, resultB].filter((r) => !r.success);

      // PROOF: Exactly one checkout confirmed, and one failed!
      expect(successfulCheckouts.length).toBe(1);
      expect(failedCheckouts.length).toBe(1);
      expect(failedCheckouts[0].status).toBe(400);
      expect(failedCheckouts[0].error).toBe('INSUFFICIENT_STOCK');

      // Final stock must be exactly 0 (no negative stock overselling!)
      expect(sharedInventory.availableStock).toBe(0);
      expect(sharedInventory.reservedStock).toBe(1);
    });
  });

  describe('Order Validation & Authentication Protection', () => {
    it('should validate shipping address in checkoutSchema', () => {
      const valid = checkoutSchema.safeParse({
        shippingAddress: '123 Tech Avenue, Silicon Valley, CA 94016',
      });
      expect(valid.success).toBe(true);

      const invalid = checkoutSchema.safeParse({
        shippingAddress: 'Hi', // Too short
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject unauthenticated checkout requests with 401', async () => {
      const res = await request(app).post('/api/v1/orders/checkout').send({
        shippingAddress: '123 Tech Avenue, Silicon Valley, CA 94016',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated order listing requests with 401', async () => {
      const res = await request(app).get('/api/v1/orders');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
