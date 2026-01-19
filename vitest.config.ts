/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // FIXED: Only include .test files, exclude .spec files (Playwright E2E)
    include: [
      '**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.spec.ts',      // Exclude Playwright E2E tests
      '**/*.spec.tsx',     // Exclude Playwright E2E tests
      '**/e2e/**',         // Exclude e2e directories
      '**/playwright/**',  // Exclude playwright directories
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.spec.ts',
        '**/e2e/**',
      ],
    },
    // Increase timeout for tests that call APIs
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@attending/ui-primitives': path.resolve(__dirname, 'packages/ui-primitives'),
      '@attending/shared': path.resolve(__dirname, 'apps/shared'),
      '@attending/clinical-types': path.resolve(__dirname, 'packages/clinical-types'),
      '@attending/clinical-services': path.resolve(__dirname, 'packages/clinical-services'),
    },
  },
});
