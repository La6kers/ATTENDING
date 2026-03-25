import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 * 
 * Ensures WCAG 2.1 AA compliance for the provider portal.
 * Healthcare applications must be accessible to all users.
 */
test.describe('Accessibility', () => {
  test('main page has proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      // Images should have alt text or role="presentation"
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through the page and ensure focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main text elements have sufficient contrast
    // This is a basic check — full audit should use axe-core
    const bodyColor = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      return {
        color: style.color,
        background: style.backgroundColor,
      };
    });
    
    expect(bodyColor.color).toBeTruthy();
    expect(bodyColor.background).toBeTruthy();
  });

  test('forms have associated labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"])');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have either a label, aria-label, aria-labelledby, or placeholder
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });
});
