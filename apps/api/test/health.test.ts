import { API_PREFIX } from '@sh/shared';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';

// Smoke tests for the M0 skeleton. Requires the test database (docker compose up -d).
const app = createApp();

afterAll(async () => {
  await db.$disconnect();
});

describe('API skeleton', () => {
  it('reports healthy when the database is reachable', async () => {
    const res = await request(app).get(`${API_PREFIX}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns the standard error envelope for unknown routes', async () => {
    const res = await request(app).get(`${API_PREFIX}/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Not found.', fields: null },
    });
  });
});
