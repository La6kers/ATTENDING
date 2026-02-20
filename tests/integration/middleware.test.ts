// ============================================================
// ATTENDING AI - Middleware Integration Tests
// tests/integration/middleware.test.ts
//
// Tests the composable middleware stack:
//   withRateLimit → withValidation → withCors → requireAuth → handler
//
// These tests verify that middleware layers work correctly
// when composed together, which is the primary integration gap.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withRateLimit, RATE_LIMIT_TIERS } from '../../apps/shared/lib/rateLimits';
import { withValidation, PaginationSchema } from '../../apps/shared/lib/withValidation';
import { cors, withCors } from '../../apps/shared/lib/cors';
import { ApiError, sendSuccess, sendError, withErrorHandler } from '../../apps/shared/lib/apiErrors';
import { z } from 'zod';

// ============================================================
// HELPERS
// ============================================================

function createReqRes(
  method: string = 'GET',
  options: { body?: any; query?: any; headers?: any } = {}
) {
  return createMocks<NextApiRequest, NextApiResponse>({
    method: method as any,
    body: options.body,
    query: options.query,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
}

// ============================================================
// RATE LIMITING TESTS
// ============================================================

describe('withRateLimit', () => {
  it('allows requests under the limit', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ ok: true }));
    const wrapped = withRateLimit('read', handler);

    const { req, res } = createReqRes();
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(handler).toHaveBeenCalled();
    expect(res._getHeaders()['x-ratelimit-tier']).toBe('read');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ ok: true }));
    // Use auth tier (10 req / 15 min) to make it easy to exceed
    const wrapped = withRateLimit('auth', handler);

    // Exhaust the limit
    for (let i = 0; i < 11; i++) {
      const { req, res } = createReqRes('POST', {
        headers: { 'x-forwarded-for': '10.0.0.99' },
      });
      await wrapped(req, res);

      if (i >= 10) {
        expect(res._getStatusCode()).toBe(429);
        const data = JSON.parse(res._getData());
        expect(data.error.code).toBe('RATE_LIMITED');
      }
    }
  });

  it('auto-detects tier from path', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ ok: true }));
    const wrapped = withRateLimit('auto', handler);

    const { req, res } = createReqRes('POST');
    req.url = '/api/ai/differential';
    await wrapped(req, res);

    expect(res._getHeaders()['x-ratelimit-tier']).toBe('ai');
  });

  it('sets rate limit headers on every response', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ ok: true }));
    const wrapped = withRateLimit('default', handler);

    const { req, res } = createReqRes();
    await wrapped(req, res);

    const headers = res._getHeaders();
    expect(headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['x-ratelimit-remaining']).toBeDefined();
    expect(headers['x-ratelimit-reset']).toBeDefined();
  });
});

// ============================================================
// VALIDATION MIDDLEWARE TESTS
// ============================================================

describe('withValidation', () => {
  const TestBodySchema = z.object({
    name: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high']),
    count: z.number().int().positive().optional(),
  });

  it('passes valid body to handler', async () => {
    const handler = vi.fn((req, res) => {
      res.status(200).json({ validated: (req as any).validatedBody });
    });
    const wrapped = withValidation({ body: TestBodySchema }, handler);

    const { req, res } = createReqRes('POST', {
      body: { name: 'test', priority: 'high' },
    });
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(handler).toHaveBeenCalled();
    const data = JSON.parse(res._getData());
    expect(data.validated.name).toBe('test');
  });

  it('rejects invalid body with 400', async () => {
    const handler = vi.fn();
    const wrapped = withValidation({ body: TestBodySchema }, handler);

    const { req, res } = createReqRes('POST', {
      body: { name: '', priority: 'invalid' },
    });
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    const data = JSON.parse(res._getData());
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.validationErrors.length).toBeGreaterThan(0);
  });

  it('validates query params with coercion', async () => {
    const handler = vi.fn((req, res) => {
      res.status(200).json({ query: (req as any).validatedQuery });
    });
    const wrapped = withValidation({ query: PaginationSchema }, handler);

    const { req, res } = createReqRes('GET', {
      query: { limit: '25', offset: '10' },
    });
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.query.limit).toBe(25);
    expect(data.query.offset).toBe(10);
  });

  it('returns all errors at once (body + query)', async () => {
    const handler = vi.fn();
    const wrapped = withValidation(
      { body: TestBodySchema, query: PaginationSchema },
      handler
    );

    const { req, res } = createReqRes('POST', {
      body: {},
      query: { limit: '-5' },
    });
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    const sources = data.error.validationErrors.map((e: any) => e.source);
    expect(sources).toContain('body');
    expect(sources).toContain('query');
  });

  it('skips body validation for GET requests', async () => {
    const handler = vi.fn((req, res) => res.status(200).end());
    const wrapped = withValidation({ body: TestBodySchema }, handler);

    const { req, res } = createReqRes('GET');
    await wrapped(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});

// ============================================================
// CORS MIDDLEWARE TESTS
// ============================================================

describe('cors', () => {
  it('sets CORS headers for allowed origin', () => {
    const { req, res } = createReqRes('GET', {
      headers: { origin: 'http://localhost:3001' },
    });

    const handled = cors(req, res, {
      origins: ['http://localhost:3000', 'http://localhost:3001'],
    });

    expect(handled).toBe(false); // Not a preflight
    expect(res._getHeaders()['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(res._getHeaders()['access-control-allow-credentials']).toBe('true');
  });

  it('handles OPTIONS preflight', () => {
    const { req, res } = createReqRes('OPTIONS', {
      headers: { origin: 'http://localhost:3000' },
    });

    const handled = cors(req, res, {
      origins: ['http://localhost:3000'],
    });

    expect(handled).toBe(true); // Preflight handled
    expect(res._getStatusCode()).toBe(204);
    expect(res._getHeaders()['access-control-allow-methods']).toBeDefined();
  });

  it('rejects disallowed origins on preflight', () => {
    const { req, res } = createReqRes('OPTIONS', {
      headers: { origin: 'https://evil.com' },
    });

    const handled = cors(req, res, {
      origins: ['http://localhost:3000'],
    });

    expect(handled).toBe(true);
    expect(res._getStatusCode()).toBe(403);
  });

  it('withCors wraps handler and handles preflight', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ ok: true }));
    const wrapped = withCors(handler, {
      origins: ['http://localhost:3000'],
    });

    // Preflight
    const { req: optReq, res: optRes } = createReqRes('OPTIONS', {
      headers: { origin: 'http://localhost:3000' },
    });
    await wrapped(optReq, optRes);
    expect(optRes._getStatusCode()).toBe(204);
    expect(handler).not.toHaveBeenCalled();

    // Actual request
    const { req, res } = createReqRes('GET', {
      headers: { origin: 'http://localhost:3000' },
    });
    await wrapped(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

describe('apiErrors', () => {
  it('sendSuccess formats response correctly', () => {
    const { req, res } = createReqRes();
    sendSuccess(res, { patients: [] }, 200, 'req-123');

    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.patients).toEqual([]);
    expect(data.meta.requestId).toBe('req-123');
    expect(data.meta.apiVersion).toBe('1.0.0');
  });

  it('sendError formats ApiError correctly', () => {
    const { req, res } = createReqRes();
    sendError(res, ApiError.notFound('Patient', 'abc-123'));

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.details.entity).toBe('Patient');
  });

  it('sendError hides details in production for unknown errors', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { req, res } = createReqRes();
    sendError(res, new Error('Database connection string leaked'));

    const data = JSON.parse(res._getData());
    expect(data.error.message).toBe('An unexpected error occurred');
    expect(data.error.message).not.toContain('Database');

    process.env.NODE_ENV = origEnv;
  });

  it('withErrorHandler catches thrown ApiErrors', async () => {
    const handler = withErrorHandler(async (req, res) => {
      throw ApiError.badRequest('Invalid patient ID');
    });

    const { req, res } = createReqRes();
    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.code).toBe('BAD_REQUEST');
  });

  it('ApiError factory methods produce correct status codes', () => {
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound('X').statusCode).toBe(404);
    expect(ApiError.conflict('dup').statusCode).toBe(409);
    expect(ApiError.rateLimited().statusCode).toBe(429);
    expect(ApiError.internal().statusCode).toBe(500);
    expect(ApiError.database().statusCode).toBe(500);
    expect(ApiError.aiService().statusCode).toBe(500);
  });

  it('ApiError.validation includes field-level errors', () => {
    const err = ApiError.validation([
      { field: 'email', message: 'Invalid email' },
      { field: 'name', message: 'Required' },
    ]);
    expect(err.statusCode).toBe(400);
    expect(err.validationErrors).toHaveLength(2);
  });
});

// ============================================================
// COMPOSED MIDDLEWARE STACK TESTS
// ============================================================

describe('Middleware composition', () => {
  it('rate limit → validation → handler works end-to-end', async () => {
    const innerHandler = vi.fn((req: NextApiRequest, res: NextApiResponse) => {
      sendSuccess(res, { created: true }, 201);
    });

    const BodySchema = z.object({
      name: z.string().min(1),
    });

    // Compose: rateLimit wraps validation wraps handler
    const composed = withRateLimit(
      'write',
      withValidation({ body: BodySchema }, innerHandler)
    );

    // Valid request
    const { req, res } = createReqRes('POST', {
      body: { name: 'Test Order' },
    });
    await composed(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(innerHandler).toHaveBeenCalled();
    expect(res._getHeaders()['x-ratelimit-tier']).toBe('write');

    // Invalid request (fails at validation layer)
    const { req: req2, res: res2 } = createReqRes('POST', { body: {} });
    await composed(req2, res2);

    expect(res2._getStatusCode()).toBe(400);
  });

  it('cors → rate limit → error handler catches thrown errors', async () => {
    const handler = withCors(
      withRateLimit('default',
        withErrorHandler(async (req, res) => {
          throw ApiError.notFound('Encounter', 'enc-404');
        })
      ),
      { origins: ['http://localhost:3000'] }
    );

    const { req, res } = createReqRes('POST', {
      headers: { origin: 'http://localhost:3000' },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error.code).toBe('NOT_FOUND');
    expect(res._getHeaders()['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res._getHeaders()['x-ratelimit-tier']).toBe('default');
  });
});
