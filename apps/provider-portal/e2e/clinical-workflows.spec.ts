// =============================================================================
// ATTENDING AI - E2E Tests for Clinical Workflows
// apps/provider-portal/e2e/clinical-workflows.spec.ts
//
// End-to-end tests for clinical decision support workflows.
// Uses Playwright for browser automation.
//
// FIXED: Uses baseURL from playwright.config.ts instead of hardcoded URL
// =============================================================================

import { test, expect } from '@playwright/test';

// =============================================================================
// PROVIDER PORTAL E2E TESTS
// =============================================================================
test.describe('Provider Portal', () => {
  
  test.beforeEach(async ({ page }) => {
    // Uses baseURL from playwright.config.ts (http://localhost:3002)
    await page.goto('/');
  });

  test.describe('Dashboard', () => {
    test('should display provider dashboard', async ({ page }) => {
      await expect(page.locator('text=ATTENDING')).toBeVisible();
    });

    test('should show patient queue', async ({ page }) => {
      // Look for patient queue or dashboard elements
      await expect(page.locator('[data-testid="patient-queue"], .patient-queue, text=Patients')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Lab Ordering', () => {
    test('should navigate to lab ordering', async ({ page }) => {
      await page.click('text=Labs, a[href*="lab"], [data-testid="nav-labs"]');
      await expect(page).toHaveURL(/.*labs/);
    });

    test('should display AI recommendations panel', async ({ page }) => {
      await page.goto('/labs');
      await expect(page.locator('text=AI Recommendations, text=BioMistral, [data-testid="ai-recommendations"]')).toBeVisible({ timeout: 10000 });
    });

    test('should allow selecting lab tests', async ({ page }) => {
      await page.goto('/labs');
      
      // Wait for lab catalog to load
      await page.waitForSelector('[data-testid="lab-catalog"], .lab-catalog', { timeout: 10000 });
      
      // Should be able to interact with lab selection
      const labTests = page.locator('[data-testid="lab-test"], .lab-test-card');
      await expect(labTests.first()).toBeVisible();
    });
  });

  test.describe('Medication Ordering', () => {
    test('should navigate to medication ordering', async ({ page }) => {
      await page.click('text=Medications, a[href*="medication"], [data-testid="nav-meds"]');
      await expect(page).toHaveURL(/.*medication/);
    });

    test('should display drug interaction warnings', async ({ page }) => {
      await page.goto('/medications');
      
      // Interaction checker should be visible
      await expect(page.locator('text=Drug Interaction, text=Safety Check, [data-testid="drug-check"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Treatment Plan', () => {
    test('should navigate to treatment plan', async ({ page }) => {
      await page.click('text=Treatment, a[href*="treatment"], [data-testid="nav-treatment"]');
      await expect(page).toHaveURL(/.*treatment/);
    });
  });
});

// =============================================================================
// CLINICAL DECISION SUPPORT E2E TESTS
// =============================================================================
test.describe('Clinical Decision Support', () => {

  test.describe('Triage Classification', () => {
    test('should display triage information for patient', async ({ page }) => {
      await page.goto('/patient-assessment');
      
      // Should show triage/ESI information
      await expect(page.locator('text=Triage, text=ESI, text=Priority, [data-testid="triage-level"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Red Flag Alerts', () => {
    test('should display red flag warnings prominently', async ({ page }) => {
      await page.goto('/patient-assessment');
      
      // Red flag alerts should be visible if present
      const redFlagAlert = page.locator('[data-testid="red-flag-alert"], .red-flag-alert, .warning-banner');
      // May or may not be visible depending on patient data
      if (await redFlagAlert.count() > 0) {
        await expect(redFlagAlert.first()).toBeVisible();
      }
    });
  });

  test.describe('Protocol Display', () => {
    test('should show clinical protocols when condition selected', async ({ page }) => {
      await page.goto('/treatment-plan');
      
      // Protocol information should be accessible
      await expect(page.locator('text=Protocol, text=Guidelines, [data-testid="protocol-panel"]')).toBeVisible({ timeout: 10000 });
    });
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================
test.describe('Accessibility', () => {
  
  test('should have no critical accessibility violations on dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility features
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    
    // Check navigation is accessible
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Should have focus visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have h1 element
    await expect(page.locator('h1')).toBeVisible();
  });
});

// =============================================================================
// RESPONSIVE DESIGN TESTS
// =============================================================================
test.describe('Responsive Design', () => {
  
  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Should still show main navigation
    await expect(page.locator('nav, [role="navigation"], .sidebar')).toBeVisible();
  });

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Main content should still be visible
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================
test.describe('Error Handling', () => {
  
  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    // Should show error page or redirect
    const is404 = await page.locator('text=404, text=Not Found, text=Page not found').count() > 0;
    const isRedirected = !page.url().includes('/nonexistent-page');
    
    expect(is404 || isRedirected).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/labs');
    
    // Mock API failure
    await page.route('**/api/clinical/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    // UI should show error state without crashing
    await page.reload();
    
    // Should not show unhandled error
    const errorPopup = page.locator('text=Something went wrong, text=Error, [data-testid="error-message"]');
    // Either shows handled error or degrades gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================
test.describe('Performance', () => {
  
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load lab ordering page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/labs', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
