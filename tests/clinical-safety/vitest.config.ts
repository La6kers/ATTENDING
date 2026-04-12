/// <reference types="vitest" />
// tests/clinical-safety/vitest.config.ts
//
// Standalone vitest config for clinical safety tests.
// Run from repo root:
//   npx vitest run --config tests/clinical-safety/vitest.config.ts
//
// Or via package.json script:
//   npm run test:clinical-safety
//
// These tests import from apps/shared — path aliases resolve via the
// alias block below.  XState is imported directly; no jsdom needed.

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include: [
      'tests/clinical-safety/**/*.test.ts',
    ],
    testTimeout: 15_000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'apps/shared/catalogs/medications.ts',
        'apps/shared/lib/clinical-ai/redFlagDetection.ts',
        'apps/shared/machines/assessmentMachine.ts',
      ],
      exclude: ['node_modules/', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@attending/shared': path.resolve(__dirname, '../../apps/shared'),
      '@':                 path.resolve(__dirname, '../../apps/shared'),
    },
  },
  // Ensure xstate resolves from the workspace root node_modules (v4)
  optimizeDeps: {
    include: ['xstate'],
  },
});
