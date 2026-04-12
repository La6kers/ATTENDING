// apps/patient-portal/playwright.config.ts
//
// Playwright E2E test configuration for the patient portal.
// Both portals must be running for cross-portal tests.
//
// Quick start:
//   npm run dev:full          # starts both portals + .NET backend
//   npx playwright test       # run all E2E tests
//   npx playwright test --ui  # interactive mode

import { defineConfig, devices } from '@playwright/test';

const PATIENT_PORTAL = process.env.PATIENT_PORTAL_URL ?? 'http://localhost:3001';
const PROVIDER_PORTAL = process.env.PROVIDER_PORTAL_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Retry once on CI to handle flaky AI timing
  retries: process.env.CI ? 1 : 0,

  // Run tests in parallel (safe — each test uses unique sessionIds)
  workers: process.env.CI ? 2 : 4,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: PATIENT_PORTAL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start both portals if not already running
  // Comment these out if you're managing dev servers externally (recommended)
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     url: PATIENT_PORTAL,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  //   {
  //     command: 'npm --prefix ../provider-portal run dev',
  //     url: PROVIDER_PORTAL,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  // ],
});
