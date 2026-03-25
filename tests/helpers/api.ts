// ============================================================
// ATTENDING AI - API Route Test Helpers
// tests/helpers/api.ts
//
// Utilities for testing Next.js API routes with Vitest.
// Wraps node-mocks-http with auth context, standard assertions,
// and typed response parsing.
//
// Usage:
//   import { apiTest, mockSession } from '../helpers';
//
//   it('creates a lab order', async () => {
//     const { res, json } = await apiTest(handler, {
//       method: 'POST',
//       body: { encounterId: '123', tests: [...] },
//       session: mockSession.provider(),
//     });
//     expect(res.statusCode).toBe(201);
//     expect(json.success).toBe(true);
//   });
// ============================================================

import { createMocks, RequestMethod } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { vi } from 'vitest';

// ============================================================
// TYPES
// ============================================================

export interface ApiTestOptions {
  method?: RequestMethod;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  /** Attach mock session (bypasses auth middleware) */
  session?: MockSession | null;
}

export interface ApiTestResult {
  req: NextApiRequest;
  res: NextApiResponse & {
    _getStatusCode(): number;
    _getData(): string;
    _getHeaders(): Record<string, string>;
    _getJSONData(): any;
  };
  /** Parsed JSON response body */
  json: any;
  /** HTTP status code */
  statusCode: number;
}

export interface MockSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  expires: string;
  sessionId: string;
}

// ============================================================
// MOCK SESSION FACTORIES
// ============================================================

export const mockSession = {
  /** Provider (physician) session */
  provider: (overrides?: Partial<MockSession['user']>): MockSession => ({
    user: {
      id: 'test-provider-001',
      name: 'Dr. Test Provider',
      email: 'provider@test.attending.ai',
      role: 'provider',
      ...overrides,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    sessionId: 'test-session-provider',
  }),

  /** Admin session */
  admin: (overrides?: Partial<MockSession['user']>): MockSession => ({
    user: {
      id: 'test-admin-001',
      name: 'Admin User',
      email: 'admin@test.attending.ai',
      role: 'admin',
      ...overrides,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    sessionId: 'test-session-admin',
  }),

  /** Nurse session */
  nurse: (overrides?: Partial<MockSession['user']>): MockSession => ({
    user: {
      id: 'test-nurse-001',
      name: 'Test Nurse',
      email: 'nurse@test.attending.ai',
      role: 'rn',
      ...overrides,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    sessionId: 'test-session-nurse',
  }),

  /** Staff session (limited permissions) */
  staff: (overrides?: Partial<MockSession['user']>): MockSession => ({
    user: {
      id: 'test-staff-001',
      name: 'Front Desk Staff',
      email: 'staff@test.attending.ai',
      role: 'staff',
      ...overrides,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    sessionId: 'test-session-staff',
  }),

  /** Expired session */
  expired: (): MockSession => ({
    user: {
      id: 'test-expired-001',
      name: 'Expired User',
      email: 'expired@test.attending.ai',
      role: 'provider',
    },
    expires: new Date(Date.now() - 1000).toISOString(),
    sessionId: 'test-session-expired',
  }),
};

// ============================================================
// AUTH MOCKING
// ============================================================

/**
 * Mock next-auth/next getServerSession to return the given session.
 * Call in beforeEach or at the top of a describe block.
 */
export function mockAuth(session: MockSession | null = null) {
  vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn().mockResolvedValue(session),
  }));

  // Also mock the provider-portal auth helpers
  vi.mock('@/lib/api/auth', async () => {
    const actual = await vi.importActual('@/lib/api/auth');
    return {
      ...(actual as any),
      requireAuth: (handler: any) => {
        return async (req: any, res: any) => {
          if (!session) {
            return res.status(401).json({
              success: false,
              error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
            });
          }
          return handler(req, res, session);
        };
      },
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    };
  });
}

// ============================================================
// API TEST RUNNER
// ============================================================

/**
 * Execute a Next.js API handler with mock request/response.
 *
 * @example
 * const { res, json, statusCode } = await apiTest(handler, {
 *   method: 'POST',
 *   body: { name: 'test' },
 *   session: mockSession.provider(),
 * });
 */
export async function apiTest(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: ApiTestOptions = {}
): Promise<ApiTestResult> {
  const { method = 'GET', body, query, headers = {}, cookies } = options;

  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    body,
    query,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    cookies,
  });

  await handler(req, res);

  let json: any = null;
  try {
    const data = res._getData();
    json = typeof data === 'string' && data ? JSON.parse(data) : data;
  } catch {
    json = res._getData();
  }

  return {
    req,
    res,
    json,
    statusCode: res._getStatusCode(),
  };
}

// ============================================================
// ASSERTION HELPERS
// ============================================================

/**
 * Assert a successful API response with data.
 */
export function expectSuccess(result: ApiTestResult, statusCode = 200) {
  const { json } = result;
  if (result.statusCode !== statusCode) {
    throw new Error(
      `Expected status ${statusCode}, got ${result.statusCode}. ` +
      `Body: ${JSON.stringify(json, null, 2)}`
    );
  }
  if (json?.success === false) {
    throw new Error(
      `Expected success but got error: ${JSON.stringify(json.error, null, 2)}`
    );
  }
}

/**
 * Assert an error API response.
 */
export function expectError(
  result: ApiTestResult,
  statusCode: number,
  errorCode?: string
) {
  const { json } = result;
  if (result.statusCode !== statusCode) {
    throw new Error(
      `Expected status ${statusCode}, got ${result.statusCode}. ` +
      `Body: ${JSON.stringify(json, null, 2)}`
    );
  }
  if (errorCode && json?.error?.code !== errorCode) {
    throw new Error(
      `Expected error code "${errorCode}", got "${json?.error?.code}"`
    );
  }
}

/**
 * Assert that the response contains rate limit headers.
 */
export function expectRateLimitHeaders(result: ApiTestResult) {
  const headers = result.res._getHeaders();
  if (!headers['x-ratelimit-limit']) {
    throw new Error('Missing X-RateLimit-Limit header');
  }
}
