/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // FIXED: Only include .test files, exclude .spec files (Playwright E2E)
    include: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.spec.ts',       // Exclude Playwright E2E tests
      '**/*.spec.tsx',      // Exclude Playwright E2E tests
      '**/e2e/**',          // Exclude e2e directory
      '**/playwright/**',   // Exclude playwright directories
    ],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.*',
        '.next/',
        '**/e2e/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@attending/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
