// =============================================================================
// ATTENDING AI - IAL2 Verification Middleware Tests
// packages/identity/src/__tests__/ial2-verify.test.ts
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  checkIAL2,
  createIAL2ErrorResponse,
  requireIAL2,
  extractIdentityFromSession,
} from '../middleware/ial2-verify';
import type { VerifiedIdentity } from '../types';

// =============================================================================
// Fixtures
// =============================================================================

function makeIdentity(overrides: Partial<VerifiedIdentity> = {}): VerifiedIdentity {
  return {
    provider: 'idme',
    subject: 'idme-user-123',
    ialLevel: 'IAL2',
    verifiedAt: new Date('2026-01-15'),
    email: 'patient@example.com',
    emailVerified: true,
    givenName: 'Jane',
    familyName: 'Doe',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('checkIAL2', () => {
  it('should return verified: true for IAL2 identity', () => {
    const result = checkIAL2(makeIdentity({ ialLevel: 'IAL2' }));
    expect(result.isVerified).toBe(true);
    expect(result.ialLevel).toBe('IAL2');
    expect(result.provider).toBe('idme');
  });

  it('should return verified: true for IAL3 identity', () => {
    const result = checkIAL2(makeIdentity({ ialLevel: 'IAL3' }));
    expect(result.isVerified).toBe(true);
    expect(result.ialLevel).toBe('IAL3');
  });

  it('should return verified: false for IAL1 identity', () => {
    const result = checkIAL2(makeIdentity({ ialLevel: 'IAL1' }));
    expect(result.isVerified).toBe(false);
    expect(result.ialLevel).toBe('IAL1');
  });

  it('should return verified: false for null identity', () => {
    const result = checkIAL2(null);
    expect(result.isVerified).toBe(false);
    expect(result.identity).toBeNull();
    expect(result.ialLevel).toBeNull();
    expect(result.provider).toBeNull();
  });

  it('should return verified: false for expired identity', () => {
    const result = checkIAL2(makeIdentity({
      ialLevel: 'IAL2',
      expiresAt: new Date('2025-01-01'), // Past
    }));
    expect(result.isVerified).toBe(false);
  });

  it('should return verified: true for non-expired identity', () => {
    const result = checkIAL2(makeIdentity({
      ialLevel: 'IAL2',
      expiresAt: new Date('2028-01-01'), // Future
    }));
    expect(result.isVerified).toBe(true);
  });

  it('should return verified: true when expiresAt is undefined', () => {
    const result = checkIAL2(makeIdentity({ ialLevel: 'IAL2', expiresAt: undefined }));
    expect(result.isVerified).toBe(true);
  });
});

describe('createIAL2ErrorResponse', () => {
  it('should return 401 when no identity', () => {
    const context = checkIAL2(null);
    const error = createIAL2ErrorResponse(context);

    expect(error.status).toBe(401);
    expect(error.body.code).toBe('IAL2_REQUIRED');
    expect(error.body.current).toBeNull();
    expect(error.body.verificationUrl).toBe('/auth/verify-identity');
  });

  it('should return 403 when IAL insufficient', () => {
    const context = checkIAL2(makeIdentity({ ialLevel: 'IAL1' }));
    const error = createIAL2ErrorResponse(context);

    expect(error.status).toBe(403);
    expect(error.body.code).toBe('IAL_INSUFFICIENT');
    expect(error.body.current).toBe('IAL1');
    expect(error.body.required).toBe('IAL2');
  });
});

describe('requireIAL2', () => {
  it('should call handler when IAL2 verified', async () => {
    const identity = makeIdentity();
    const handler = vi.fn();
    const getIdentity = vi.fn(async () => identity);

    const wrapped = requireIAL2(handler, getIdentity);
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await wrapped(req, res as any);

    expect(handler).toHaveBeenCalledWith(req, res, identity);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no identity', async () => {
    const handler = vi.fn();
    const getIdentity = vi.fn(async () => null);

    const wrapped = requireIAL2(handler, getIdentity);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await wrapped({}, res as any);

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'IAL2_REQUIRED' }));
  });

  it('should return 403 when IAL insufficient', async () => {
    const handler = vi.fn();
    const getIdentity = vi.fn(async () => makeIdentity({ ialLevel: 'IAL1' }));

    const wrapped = requireIAL2(handler, getIdentity);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await wrapped({}, res as any);

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('extractIdentityFromSession', () => {
  it('should extract identity from session', () => {
    const identity = makeIdentity();
    const session = { user: { identityVerification: identity } };
    expect(extractIdentityFromSession(session)).toBe(identity);
  });

  it('should return null for null session', () => {
    expect(extractIdentityFromSession(null)).toBeNull();
  });

  it('should return null when no identity in session', () => {
    expect(extractIdentityFromSession({ user: {} })).toBeNull();
  });

  it('should return null when no user in session', () => {
    expect(extractIdentityFromSession({})).toBeNull();
  });
});
