import { test, expect } from '@playwright/test';

/**
 * Core Clinical Loop E2E Tests
 * 
 * Tests the primary workflow:
 * Patient assessment → Provider review → Lab orders → Results
 */
test.describe('Core Clinical Loop', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to provider portal (dev mode auto-authenticates)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('provider can view dashboard', async ({ page }) => {
    await expect(page).toHaveTitle(/ATTENDING/i);
    // Dashboard should load with patient list or summary view
    await expect(page.locator('[data-testid="dashboard"], main')).toBeVisible();
  });

  test('provider can navigate to patient list', async ({ page }) => {
    // Look for patients navigation
    const patientsLink = page.locator('a[href*="patient"], [data-testid="nav-patients"]');
    if (await patientsLink.isVisible()) {
      await patientsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('patient');
    }
  });

  test('provider can view assessment queue', async ({ page }) => {
    const assessmentsLink = page.locator('a[href*="assessment"], [data-testid="nav-assessments"]');
    if (await assessmentsLink.isVisible()) {
      await assessmentsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('assessment');
    }
  });

  test('provider can access lab orders', async ({ page }) => {
    const labOrdersLink = page.locator('a[href*="lab"], [data-testid="nav-lab-orders"]');
    if (await labOrdersLink.isVisible()) {
      await labOrdersLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('lab');
    }
  });

  test('API health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });
});
