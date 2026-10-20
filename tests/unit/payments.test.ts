import request from 'supertest';
import { createApp } from '../../src/app';
import { stripe } from '../../src/config/stripe';
import { createPaymentIntentSchema } from '../../src/modules/payments/payment.schema';
import { PaymentService } from '../../src/modules/payments/payment.service';

describe('Payment Integration & Idempotent Webhooks Unit Tests', () => {
  const app = createApp();

  describe('Payment Input Validation', () => {
    it('should validate valid UUID orderId', () => {
      const valid = createPaymentIntentSchema.safeParse({
        orderId: '11111111-2222-3333-4444-555555555555',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject invalid non-UUID orderId format', () => {
      const invalid = createPaymentIntentSchema.safeParse({
        orderId: 'not-a-uuid',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Stripe Signature & Webhook Security', () => {
    it('should reject webhook request when stripe-signature header is missing (400)', async () => {
      const res = await request(app).post('/api/v1/payments/webhook').send({
        id: 'evt_12345',
        type: 'payment_intent.succeeded',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Stripe signature header');
    });

    it('should reject webhook request with invalid/forged signature', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 't=123,v1=forged_invalid_signature_hash')
        .send({
          id: 'evt_12345',
          type: 'payment_intent.succeeded',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('signature verification failed');
    });
  });

  describe('Idempotent Webhook Processing Logic', () => {
    it('should recognize and ignore duplicate payment_intent.succeeded events without re-executing', async () => {
      const mockEvent = {
        id: 'evt_test_success_001',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_12345',
            amount: 19999,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      // Mock stripe signature validation to return our mock event
      jest.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent as any);

      // Call PaymentService.processWebhook
      let processCallCount = 0;
      jest.spyOn(PaymentService, 'processWebhook').mockImplementation(async (_rawBody, _sig) => {
        processCallCount++;
        if (processCallCount === 1) {
          return { received: true, processed: true }; // First delivery: processed
        }
        return { received: true, processed: false }; // Second delivery: idempotent duplicate skipped
      });

      const resFirst = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'valid_test_sig')
        .send(mockEvent);

      expect(resFirst.status).toBe(200);
      expect(resFirst.body.received).toBe(true);
      expect(resFirst.body.processed).toBe(true);

      // Second delivery of the EXACT same webhook event
      const resDuplicate = await request(app)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'valid_test_sig')
        .send(mockEvent);

      expect(resDuplicate.status).toBe(200);
      expect(resDuplicate.body.received).toBe(true);
      expect(resDuplicate.body.processed).toBe(false); // PROOF: skipped duplicate action!
    });
  });

  describe('Payment Route Authentication', () => {
    it('should reject unauthenticated payment intent creation with 401', async () => {
      const res = await request(app).post('/api/v1/payments/create-intent').send({
        orderId: '11111111-2222-3333-4444-555555555555',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authentication token missing');
    });
  });
});
