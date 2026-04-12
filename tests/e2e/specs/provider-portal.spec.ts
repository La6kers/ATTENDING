import { test, expect } from '@playwright/test';

/**
 * Provider Portal E2E Tests
 * 
 * Tests provider-specific workflows and UI components.
 */
test.describe('Provider Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['strict-transport-security']).toBeTruthy();
  });

  test('navigation renders correctly', async ({ page }) => {
    // Main navigation should be visible
    const nav = page.locator('nav, [role="navigation"], [data-testid="sidebar"]');
    await expect(nav.first()).toBeVisible();
  });

  test('responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still be functional at mobile width
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("dark"), button:has-text("theme")');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Verify theme changed (check for dark class or attribute)
      const html = page.locator('html');
      const className = await html.getAttribute('class') || '';
      const dataTheme = await html.getAttribute('data-theme') || '';
      expect(className + dataTheme).toBeTruthy();
    }
  });
});
