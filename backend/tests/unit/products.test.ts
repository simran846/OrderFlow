import { Role } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../src/app';
import { CacheService } from '../../src/config/redis';
import { createProductSchema, queryProductSchema } from '../../src/validators/product.schema';
import { SecurityUtils } from '../../src/utils/security';

describe('Products & Redis Caching Unit Tests', () => {
  const app = createApp();

  describe('Product Validation Schemas', () => {
    it('should validate correct product input successfully', () => {
      const input = {
        name: 'Pro Wireless Mouse',
        description: 'Ultra-fast low-latency wireless gaming mouse',
        price: 79.99,
        categoryId: '33333333-4444-5555-6666-777777777777',
        stock: 25,
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject product input with negative price or stock', () => {
      const invalidInput = {
        name: 'Pro Wireless Mouse',
        description: 'Ultra-fast low-latency wireless gaming mouse',
        price: -10.0,
        categoryId: '33333333-4444-5555-6666-777777777777',
        stock: -5,
      };

      const result = createProductSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        expect(errorMessages).toContain('Price must be greater than 0');
        expect(errorMessages).toContain('Initial stock cannot be negative');
      }
    });

    it('should enforce pagination limits (max limit: 50, min page: 1)', () => {
      const parsed = queryProductSchema.parse({
        page: '-5',
        limit: '200',
      });

      expect(parsed.page).toBe(1); // Clamped from negative to 1
      expect(parsed.limit).toBe(50); // Clamped from 200 to max 50
    });
  });

  describe('Product RBAC Route Protection', () => {
    it('should reject product creation without authentication (401)', async () => {
      const res = await request(app).post('/api/v1/products').send({
        name: 'Unauthorized Product',
        description: 'Test description for unauthorized create',
        price: 49.99,
        categoryId: '33333333-4444-5555-6666-777777777777',
        stock: 10,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authentication token missing');
    });

    it('should reject product creation by a Customer with 403 Forbidden', async () => {
      const customerToken = SecurityUtils.generateAccessToken({
        userId: 'cust-uuid-1',
        role: Role.CUSTOMER,
        email: 'customer@orderflow.dev',
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Customer Created Product',
          description: 'This should be blocked',
          price: 49.99,
          categoryId: '33333333-4444-5555-6666-777777777777',
          stock: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('lacks permission');
    });

    it('should reject product deletion by a Customer with 403 Forbidden', async () => {
      const customerToken = SecurityUtils.generateAccessToken({
        userId: 'cust-uuid-1',
        role: Role.CUSTOMER,
        email: 'customer@orderflow.dev',
      });

      const res = await request(app)
        .delete('/api/v1/products/33333333-4444-5555-6666-777777777777')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('lacks permission');
    });
  });

  describe('CacheService Graceful Degradation', () => {
    it('should safely return null on cache get without throwing if Redis is offline', async () => {
      const result = await CacheService.get('products:test:nonexistent');
      expect(result).toBeNull();
    });

    it('should safely execute cache set and del without throwing if Redis is offline', async () => {
      await expect(CacheService.set('products:test:sample', { test: true })).resolves.not.toThrow();
      await expect(CacheService.del('products:test:sample')).resolves.not.toThrow();
      await expect(CacheService.delByPattern('products:test:*')).resolves.not.toThrow();
    });
  });
});
