import { Role } from '@prisma/client';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { authenticate, authorize } from '../../src/middleware/auth.middleware';
import { SecurityUtils } from '../../src/utils/security';

describe('Auth & RBAC Middleware Unit Tests', () => {
  describe('SecurityUtils (Password Hashing & JWT)', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await SecurityUtils.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isMatch = await SecurityUtils.comparePassword(password, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await SecurityUtils.comparePassword('WrongPassword123!', hash);
      expect(isWrongMatch).toBe(false);
    });

    it('should generate and verify a valid JWT access token', () => {
      const payload = {
        userId: '11111111-2222-3333-4444-555555555555',
        role: Role.CUSTOMER,
        email: 'customer@orderflow.dev',
      };

      const token = SecurityUtils.generateAccessToken(payload);
      expect(typeof token).toBe('string');

      const decoded = SecurityUtils.verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(Role.CUSTOMER);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw an UnauthorizedError when verifying an invalid token', () => {
      expect(() => {
        SecurityUtils.verifyAccessToken('invalid.garbage.token');
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('RBAC Middleware Execution', () => {
    const testApp = express();
    testApp.use(express.json());

    // Protected customer-only route
    testApp.get('/test/customer-only', authenticate, authorize(Role.CUSTOMER), (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Welcome customer' });
    });

    // Protected admin-only route
    testApp.get('/test/admin-only', authenticate, authorize(Role.ADMIN), (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Welcome admin' });
    });

    // Attach global error handler to handle AppError exceptions
    testApp.use((err: any, _req: Request, res: Response, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: { message: err.message, statusCode: err.statusCode },
      });
    });

    it('should reject request when Authorization header is missing', async () => {
      const res = await request(testApp).get('/test/admin-only');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authentication token missing');
    });

    it('should reject request when token is malformed', async () => {
      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or expired access token');
    });

    it('should allow customer to access customer-only route', async () => {
      const customerToken = SecurityUtils.generateAccessToken({
        userId: 'user-cust-1',
        role: Role.CUSTOMER,
        email: 'customer@test.com',
      });

      const res = await request(testApp)
        .get('/test/customer-only')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome customer');
    });

    it('should block customer from accessing admin-only route with 403 Forbidden', async () => {
      const customerToken = SecurityUtils.generateAccessToken({
        userId: 'user-cust-1',
        role: Role.CUSTOMER,
        email: 'customer@test.com',
      });

      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('lacks permission');
    });

    it('should allow admin to access admin-only route', async () => {
      const adminToken = SecurityUtils.generateAccessToken({
        userId: 'user-admin-1',
        role: Role.ADMIN,
        email: 'admin@test.com',
      });

      const res = await request(testApp)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome admin');
    });
  });

  describe('Validation Schemas (Register & Login)', () => {
    const app = createApp();

    it('should reject registration with weak password (missing uppercase or number)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@orderflow.dev',
        password: 'weakpassword',
        firstName: 'New',
        lastName: 'User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Validation failed');
      expect(JSON.stringify(res.body.error.details)).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'not-an-email',
        password: 'ValidPassword123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error.details)).toContain('Invalid email address format');
    });
  });
});
