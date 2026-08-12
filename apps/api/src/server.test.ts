import { describe, expect, it } from 'vitest';
import { buildApp } from './server.js';

describe('API health route', () => {
  it('returns the service health payload', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'api',
    });
  });
});
