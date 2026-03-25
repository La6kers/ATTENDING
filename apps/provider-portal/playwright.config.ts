// =============================================================================
// ATTENDING AI - Playwright Configuration
// apps/provider-portal/playwright.config.ts
//
// FIXED: Updated port to 3002 and increased timeout for server startup
// =============================================================================

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Increased timeout for individual tests
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'], // Add list reporter for console output
  ],
  
  use: {
    // FIXED: Provider portal runs on port 3002
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Add action timeout
    actionTimeout: 15 * 1000,
  },
  
  projects: [
    // Run Chromium first (most common)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Skip other browsers in development for faster testing
    // Uncomment for full cross-browser testing in CI
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
    // {
    //   name: 'Tablet',
    //   use: { ...devices['iPad (gen 7)'] },
    // },
  ],
  
  webServer: {
    command: 'npm run dev',
    // FIXED: Provider portal runs on port 3002
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    // FIXED: Increased timeout to 180 seconds for slower machines
    timeout: 180 * 1000,
    // Add stdout/stderr for debugging
    stdout: 'pipe',
    stderr: 'pipe',
    // Enable auth enforcement so E2E tests get correct 401/redirect
    // responses instead of dev-bypass passthrough.
    env: {
      ...process.env,
      NEXTAUTH_ENFORCE: 'true',
    },
  },
});
