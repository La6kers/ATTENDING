/// <reference types="vitest" />
// ============================================================
// Vitest Integration Test Config
// vitest.integration.config.ts
//
// Separate config for API/backend integration tests.
// Uses 'node' environment (not jsdom) since these test
// API handlers, middleware, and database interactions.
//
// Run with: npm run test:integration
// ============================================================

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/integration.setup.ts'],
    include: [
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
    ],
    // Integration tests may be slower
    testTimeout: 15000,
    hookTimeout: 10000,
    // Run serially to avoid DB/Redis contention
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: [
        'apps/provider-portal/pages/api/**',
        'apps/patient-portal/pages/api/**',
        'apps/shared/lib/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@attending/shared': path.resolve(__dirname, 'apps/shared'),
      '@attending/clinical-services': path.resolve(__dirname, 'packages/clinical-services'),
      '@attending/clinical-types': path.resolve(__dirname, 'packages/clinical-types'),
      '@': path.resolve(__dirname, 'apps/provider-portal'),
      '@patient': path.resolve(__dirname, 'apps/patient-portal'),
    },
  },
});
