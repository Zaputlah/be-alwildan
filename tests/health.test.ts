import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

describe('health endpoint', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
  });

  it('reports that the API is available without exposing implementation details', async () => {
    const { createApp } = await import('../src/app.js');
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'integration-system-api' });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
