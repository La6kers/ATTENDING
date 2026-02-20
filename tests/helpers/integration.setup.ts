// ============================================================
// Integration Test Setup
// tests/helpers/integration.setup.ts
//
// Global setup for API integration tests.
// Mocks external dependencies (Prisma, Redis, NextAuth)
// while testing real handler logic.
// ============================================================

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ============================================================
// Mock NextAuth (prevents real auth checks)
// ============================================================

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// ============================================================
// Mock Prisma (use in-memory mock, not real DB)
// ============================================================

vi.mock('@attending/shared/lib/prisma', () => {
  const { mockPrisma } = require('./mockPrisma');
  return {
    prisma: mockPrisma,
    default: mockPrisma,
    softDelete: vi.fn(),
    restoreSoftDeleted: vi.fn(),
    hardDelete: vi.fn(),
  };
});

// Also mock the provider-portal's local prisma import
vi.mock('@/lib/api/prisma', () => {
  const { mockPrisma } = require('./mockPrisma');
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// ============================================================
// Mock Redis
// ============================================================

vi.mock('@attending/shared/lib/redis/client', () => ({
  redis: null,
  initializeRedis: vi.fn(),
  checkRedisHealth: vi.fn().mockResolvedValue({ healthy: true, latencyMs: 1, mode: 'mock' }),
}));

// ============================================================
// Mock clinical-services (AI/ML — don't call real models in tests)
// ============================================================

vi.mock('@attending/clinical-services', () => ({
  labRecommender: {
    getRecommendations: vi.fn().mockReturnValue([]),
  },
  redFlagEvaluator: {
    evaluate: vi.fn().mockReturnValue({
      isEmergency: false,
      redFlags: [],
      severity: 'none',
    }),
  },
  differentialEngine: {
    analyze: vi.fn().mockResolvedValue({ differentials: [] }),
  },
}));

// ============================================================
// Environment
// ============================================================

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret-32-characters-long!!';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});
