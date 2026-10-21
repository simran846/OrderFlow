import request from 'supertest';
import { createApp } from '../../src/app';

describe('Health & Error Handling API Integration', () => {
  const app = createApp();

  it('GET /api/v1/health should return 200 and operational status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health/ready should return 200 and readiness status', async () => {
    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('READY');
  });

  it('GET /non-existent-route should return 404 with structured error', async () => {
    const res = await request(app).get('/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Cannot GET /non-existent-route');
    expect(res.body).toHaveProperty('requestId');
  });
});
