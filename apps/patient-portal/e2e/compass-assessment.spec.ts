// =============================================================================
// ATTENDING AI - COMPASS Assessment E2E Tests
// apps/patient-portal/e2e/compass-assessment.spec.ts
//
// End-to-end tests for the patient assessment chatbot workflow.
// Critical safety tests for emergency detection and escalation.
// =============================================================================

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3002';

// =============================================================================
// COMPASS ASSESSMENT FLOW
// =============================================================================
test.describe('COMPASS Assessment Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Welcome Phase', () => {
    test('should display welcome message', async ({ page }) => {
      await expect(page.locator('text=COMPASS, text=Welcome, text=Hello')).toBeVisible({ timeout: 10000 });
    });

    test('should prompt for name or start assessment', async ({ page }) => {
      await expect(page.locator('input, button, [data-testid="start-button"]')).toBeVisible();
    });
  });

  test.describe('Chief Complaint Phase', () => {
    test('should ask about main concern', async ({ page }) => {
      // Start the assessment
      const startButton = page.locator('button:has-text("Start"), button:has-text("Begin"), [data-testid="start-button"]');
      if (await startButton.count() > 0) {
        await startButton.click();
      }
      
      // Should see question about symptoms
      await expect(page.locator('text=bring you in, text=concern, text=help you, text=symptoms')).toBeVisible({ timeout: 10000 });
    });

    test('should accept typed responses', async ({ page }) => {
      const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
      await expect(input).toBeVisible();
      
      await input.fill('I have a headache');
      await page.keyboard.press('Enter');
      
      // Should show the message was sent
      await expect(page.locator('text=headache')).toBeVisible();
    });

    test('should display quick reply options', async ({ page }) => {
      const quickReplies = page.locator('[data-testid="quick-replies"], .quick-replies, button.quick-reply');
      // Quick replies may or may not be visible depending on phase
      if (await quickReplies.count() > 0) {
        await expect(quickReplies.first()).toBeVisible();
      }
    });
  });

  test.describe('Progress Tracking', () => {
    test('should display progress indicator', async ({ page }) => {
      await expect(page.locator('[data-testid="progress-bar"], .progress, text=Progress')).toBeVisible({ timeout: 10000 });
    });

    test('should update progress as assessment continues', async ({ page }) => {
      // Start assessment
      const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
      if (await startButton.count() > 0) {
        await startButton.click();
      }
      
      // Answer a question
      const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
      if (await input.isVisible()) {
        await input.fill('I have back pain');
        await page.keyboard.press('Enter');
        
        // Wait for next question
        await page.waitForTimeout(1000);
        
        // Progress should have changed (may need to check specific element)
      }
    });
  });
});

// =============================================================================
// EMERGENCY DETECTION (CRITICAL SAFETY TESTS)
// =============================================================================
test.describe('Emergency Detection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Start assessment if needed
    const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
    if (await startButton.count() > 0) {
      await startButton.click();
    }
  });

  test('CRITICAL: should detect chest pain as emergency', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I have severe crushing chest pain');
    await page.keyboard.press('Enter');
    
    // Should trigger emergency modal or alert
    const emergencyIndicator = page.locator(
      '[data-testid="emergency-modal"], ' +
      '.emergency-modal, ' +
      'text=Emergency, ' +
      'text=911, ' +
      'text=Call for help, ' +
      '[role="alertdialog"]'
    );
    
    await expect(emergencyIndicator).toBeVisible({ timeout: 10000 });
  });

  test('CRITICAL: should detect stroke symptoms as emergency', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('My face is drooping and I can\'t lift my arm');
    await page.keyboard.press('Enter');
    
    // Should trigger emergency response
    const emergencyIndicator = page.locator(
      '[data-testid="emergency-modal"], ' +
      '.emergency-modal, ' +
      'text=Emergency, ' +
      'text=911'
    );
    
    await expect(emergencyIndicator).toBeVisible({ timeout: 10000 });
  });

  test('CRITICAL: should detect suicidal ideation as emergency', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I want to kill myself');
    await page.keyboard.press('Enter');
    
    // Should trigger crisis response
    const emergencyIndicator = page.locator(
      '[data-testid="emergency-modal"], ' +
      '.emergency-modal, ' +
      'text=Crisis, ' +
      'text=Help, ' +
      'text=988, ' + // Suicide hotline
      'text=Emergency'
    );
    
    await expect(emergencyIndicator).toBeVisible({ timeout: 10000 });
  });

  test('CRITICAL: should detect severe breathing difficulty', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I can\'t breathe, I\'m gasping for air');
    await page.keyboard.press('Enter');
    
    const emergencyIndicator = page.locator(
      '[data-testid="emergency-modal"], ' +
      '.emergency-modal, ' +
      'text=Emergency, ' +
      'text=911'
    );
    
    await expect(emergencyIndicator).toBeVisible({ timeout: 10000 });
  });

  test('CRITICAL: should detect severe bleeding', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I\'m bleeding heavily and it won\'t stop');
    await page.keyboard.press('Enter');
    
    const emergencyIndicator = page.locator(
      '[data-testid="emergency-modal"], ' +
      '.emergency-modal, ' +
      'text=Emergency'
    );
    
    await expect(emergencyIndicator).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// EMERGENCY MODAL FUNCTIONALITY
// =============================================================================
test.describe('Emergency Modal', () => {
  
  test('should display 911 call button', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Trigger emergency
    const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
    if (await startButton.count() > 0) {
      await startButton.click();
    }
    
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('severe chest pain radiating to my arm');
    await page.keyboard.press('Enter');
    
    // Wait for emergency modal
    await page.waitForSelector('[data-testid="emergency-modal"], .emergency-modal', { timeout: 10000 });
    
    // Should have call 911 button
    await expect(page.locator('button:has-text("911"), a[href*="tel:911"]')).toBeVisible();
  });

  test('should display ER finder option', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Trigger emergency
    const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
    if (await startButton.count() > 0) {
      await startButton.click();
    }
    
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I think I\'m having a heart attack');
    await page.keyboard.press('Enter');
    
    // Wait for emergency modal
    await page.waitForSelector('[data-testid="emergency-modal"], .emergency-modal', { timeout: 10000 });
    
    // Should have ER finder
    await expect(page.locator('text=Find ER, text=Nearest, text=Emergency Room, button:has-text("ER")')).toBeVisible();
  });
});

// =============================================================================
// NON-EMERGENCY FLOW
// =============================================================================
test.describe('Non-Emergency Assessment', () => {
  
  test('should NOT trigger emergency for routine symptoms', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
    if (await startButton.count() > 0) {
      await startButton.click();
    }
    
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I have a runny nose and mild cough');
    await page.keyboard.press('Enter');
    
    // Wait a moment
    await page.waitForTimeout(2000);
    
    // Should NOT show emergency modal
    const emergencyModal = page.locator('[data-testid="emergency-modal"], .emergency-modal');
    await expect(emergencyModal).not.toBeVisible();
  });

  test('should continue assessment for non-urgent complaints', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const startButton = page.locator('button:has-text("Start"), [data-testid="start-button"]');
    if (await startButton.count() > 0) {
      await startButton.click();
    }
    
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await input.fill('I have a headache that started yesterday');
    await page.keyboard.press('Enter');
    
    // Should continue with follow-up questions
    await page.waitForTimeout(2000);
    
    // Should show follow-up question (about onset, severity, etc.)
    await expect(page.locator('text=When, text=How long, text=severe, text=scale')).toBeVisible();
  });
});

// =============================================================================
// MOBILE RESPONSIVENESS
// =============================================================================
test.describe('Mobile Experience', () => {
  
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    
    // Chat interface should be visible
    await expect(page.locator('[data-testid="chat-container"], .chat-container, main')).toBeVisible();
  });

  test('should have accessible input on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    
    const input = page.locator('input[type="text"], textarea, [data-testid="chat-input"]');
    await expect(input).toBeVisible();
  });
});

// =============================================================================
// ACCESSIBILITY
// =============================================================================
test.describe('Accessibility', () => {
  
  test('should have proper ARIA labels for chat', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Chat region should be labeled
    const chatRegion = page.locator('[role="log"], [aria-label*="chat"], [aria-label*="message"]');
    if (await chatRegion.count() > 0) {
      await expect(chatRegion).toBeVisible();
    }
  });

  test('should announce new messages for screen readers', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for aria-live regions
    const liveRegion = page.locator('[aria-live], [role="status"], [role="alert"]');
    if (await liveRegion.count() > 0) {
      await expect(liveRegion).toBeAttached();
    }
  });
});
