import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';

describe('OpenAPI / Swagger Documentation Unit Tests', () => {
  const app = createApp();

  it('GET /api/v1/docs/json should return valid OpenAPI 3.0 JSON specification', async () => {
    const res = await request(app).get(`${env.API_PREFIX}/docs/json`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('OrderFlow Backend API');
    expect(res.body.paths).toHaveProperty('/orders/checkout');
    expect(res.body.paths).toHaveProperty('/products');
    expect(res.body.paths).toHaveProperty('/payments/webhook');
    expect(res.body.components.securitySchemes).toHaveProperty('BearerAuth');
    expect(res.body.components.securitySchemes).toHaveProperty('IdempotencyHeader');
  });

  it('GET /api/v1/docs/ should serve interactive Swagger UI HTML page', async () => {
    const res = await request(app).get(`${env.API_PREFIX}/docs/`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger-ui');
  });

  it('GET / (Root API endpoint) should link to the documentation URL', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.documentation).toBe(`${env.API_PREFIX}/docs`);
    expect(res.body.status).toBe('active');
  });
});
