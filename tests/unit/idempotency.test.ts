import express, { Request, Response } from 'express';
import request from 'supertest';
import { idempotency } from '../../src/middlewares/idempotency.middleware';
import { IdempotencyService } from '../../src/modules/idempotency/idempotency.service';

describe('Idempotency Engine & Request Fingerprinting Unit Tests', () => {
  describe('Deterministic Request Hashing (SHA-256)', () => {
    it('should generate identical hashes regardless of JSON property key ordering', () => {
      const hash1 = IdempotencyService.computeRequestHash('/api/v1/orders/checkout', 'POST', {
        shippingAddress: '123 Main St',
        customerNote: 'Leave at front door',
        nested: { b: 2, a: 1 },
      });

      const hash2 = IdempotencyService.computeRequestHash('/api/v1/orders/checkout', 'POST', {
        nested: { a: 1, b: 2 },
        customerNote: 'Leave at front door',
        shippingAddress: '123 Main St',
      });

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // Valid SHA-256 hex length
    });

    it('should generate different hashes when request payload differs', () => {
      const hashOriginal = IdempotencyService.computeRequestHash('/api/v1/orders/checkout', 'POST', {
        shippingAddress: '123 Main St',
      });

      const hashModified = IdempotencyService.computeRequestHash('/api/v1/orders/checkout', 'POST', {
        shippingAddress: '456 Alternate Blvd', // Changed address!
      });

      expect(hashOriginal).not.toBe(hashModified);
    });
  });

  describe('Idempotency Middleware Behavior', () => {
    let executionCount = 0;
    const inMemoryRecords = new Map<string, any>();
    let testApp: express.Express;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      // Mock authentication middleware to attach req.user
      testApp.use((req: any, _res, next) => {
        req.user = { id: 'test-user-id-123', email: 'test@orderflow.dev', role: 'CUSTOMER' };
        next();
      });

      // Mock IdempotencyService storage for isolated unit testing
      jest.spyOn(IdempotencyService, 'claimKey').mockImplementation(async (key, userId, _endpoint, requestHash) => {
        const compositeKey = `${userId}:${key}`;
        const existing = inMemoryRecords.get(compositeKey);

        if (existing) {
          if (existing.responseStatus === null) {
            return { status: 'IN_PROGRESS' };
          }
          if (existing.requestHash !== requestHash) {
            return { status: 'MISMATCH' };
          }
          return {
            status: 'COMPLETED',
            responseStatus: existing.responseStatus,
            responseBody: existing.responseBody,
          };
        }

        inMemoryRecords.set(compositeKey, {
          requestHash,
          responseStatus: null,
          responseBody: null,
        });

        return { status: 'CLAIMED', recordId: compositeKey };
      });

      jest.spyOn(IdempotencyService, 'recordOutcome').mockImplementation(async (recordId, responseStatus, responseBody) => {
        const existing = inMemoryRecords.get(recordId);
        if (existing) {
          existing.responseStatus = responseStatus;
          existing.responseBody = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
        }
      });

      // Mount route with idempotency middleware
      testApp.post('/test/idempotent-action', idempotency(), (req: Request, res: Response) => {
        executionCount++;
        res.status(201).json({
          success: true,
          data: {
            orderId: 'mock-order-uuid',
            address: req.body.shippingAddress,
            executionIndex: executionCount,
          },
        });
      });

      // Global error handler
      testApp.use((err: any, _req: Request, res: Response, _next: any) => {
        res.status(err.statusCode || 500).json({
          success: false,
          error: { message: err.message, statusCode: err.statusCode },
        });
      });
    });

    it('should execute the endpoint on first request and record outcome', async () => {
      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('Idempotency-Key', 'unique-key-001')
        .send({ shippingAddress: '789 Market Street' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.executionIndex).toBe(1);
      expect(res.headers['idempotent-replay']).toBeUndefined();
    });

    it('should replay the cached outcome with Idempotent-Replay header on identical retry', async () => {
      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('Idempotency-Key', 'unique-key-001') // Same key!
        .send({ shippingAddress: '789 Market Street' }); // Same body!

      expect(res.status).toBe(201);
      expect(res.headers['idempotent-replay']).toBe('true');
      expect(res.body.data.executionIndex).toBe(1); // Handler was NOT executed again!
      expect(executionCount).toBe(1);
    });

    it('should reject reuse of same key with a different payload (422 Unprocessable Entity)', async () => {
      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('Idempotency-Key', 'unique-key-001') // Same key!
        .send({ shippingAddress: '999 Completely Different Address' }); // Tampered body!

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('different request payload');
    });

    it('should reject simultaneous in-progress requests using the same key with 409 Conflict', async () => {
      // Pre-seed a pending record
      inMemoryRecords.set('test-user-id-123:pending-key-002', {
        requestHash: 'some-hash',
        responseStatus: null, // Still in flight!
      });

      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('Idempotency-Key', 'pending-key-002')
        .send({ shippingAddress: '789 Market Street' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('currently in progress');
    });

    it('should reject invalid idempotency keys shorter than 8 characters (400)', async () => {
      const res = await request(testApp)
        .post('/test/idempotent-action')
        .set('Idempotency-Key', 'short') // Only 5 characters!
        .send({ shippingAddress: '789 Market Street' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('between 8 and 128 characters');
    });
  });
});
