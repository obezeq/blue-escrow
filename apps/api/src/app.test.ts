import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('GET /health', () => {
  it('returns 200 with the success envelope { data: { status: ok }, error: null }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null });
  });

  it('echoes a caller-provided x-request-id header', async () => {
    const res = await request(app)
      .get('/health')
      .set('x-request-id', 'caller-supplied-id-1234');
    expect(res.headers['x-request-id']).toBe('caller-supplied-id-1234');
  });

  it('mints a ULID x-request-id when none is provided', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });
});

describe('routes that fall through to pino-http and the default 404', () => {
  it('returns 404 for an unknown route while still echoing x-request-id', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
