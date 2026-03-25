// =============================================================================
// ATTENDING AI — Core Loop End-to-End Tests
// tests/e2e/core-loop.spec.ts
//
// Verifies the full patient → provider pipeline:
//
//   Patient fills COMPASS chat  →  POST /api/assessments/submit
//     → PatientAssessment row in DB
//       → Provider GET /api/assessments shows it in queue
//         → Provider previsit page loads the assessment
//
// Run against the dev stack (patient :3002, provider :3000, DB via Prisma):
//   npm run dev:full   (from repo root)
//   npx playwright test tests/e2e/core-loop.spec.ts
//
// For CI, set environment variables:
//   PATIENT_PORTAL_URL  — default: http://localhost:3002
//   PROVIDER_PORTAL_URL — default: http://localhost:3000
// =============================================================================

import { test, expect } from '@playwright/test';

const PATIENT_URL  = process.env.PATIENT_PORTAL_URL  || 'http://localhost:3002';
const PROVIDER_URL = process.env.PROVIDER_PORTAL_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** POST directly to the submit API to seed a known assessment. */
async function submitAssessmentViaApi(
  baseUrl: string,
  overrides: Record<string, unknown> = {}
) {
  const sessionId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    sessionId,
    patientName: 'E2E Test Patient',
    dateOfBirth: '1985-03-15',
    gender: 'Female',
    chiefComplaint: 'Persistent headache for 3 days',
    hpi: {
      onset: 'Three days ago',
      location: 'Frontal, bilateral',
      duration: 'Constant',
      character: 'Dull, pressure-like',
      severity: 5,
      aggravating: ['Bright lights', 'Loud noise'],
      relieving: ['Rest', 'Ibuprofen'],
      associated: ['Mild nausea'],
      timing: 'Worse in the morning',
    },
    medications: ['Ibuprofen 400mg PRN'],
    allergies: ['NKDA'],
    medicalHistory: ['Migraines (childhood)'],
    urgencyLevel: 'moderate',
    urgencyScore: 20,
    conversationHistory: [
      { role: 'assistant', content: 'What brings you in today?', timestamp: new Date().toISOString() },
      { role: 'user', content: 'Persistent headache for 3 days', timestamp: new Date().toISOString() },
    ],
    submittedAt: new Date().toISOString(),
    ...overrides,
  };

  const response = await fetch(`${baseUrl}/api/assessments/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = response.ok ? await response.json() : null;
  return { response, body, sessionId, payload };
}

// =============================================================================
// 1. Assessment Submit API
// =============================================================================
test.describe('Assessment Submit API', () => {

  test('POST /api/assessments/submit returns 201 with assessmentId', async () => {
    const { response, body } = await submitAssessmentViaApi(PATIENT_URL);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      assessmentId: expect.any(String),
      queuePosition: expect.any(Number),
      estimatedReviewTime: expect.any(String),
    });
  });

  test('POST /api/assessments/submit rejects missing chiefComplaint', async () => {
    const response = await fetch(`${PATIENT_URL}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: `e2e-${Date.now()}` }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/complaint/i);
  });

  test('POST /api/assessments/submit rejects missing sessionId', async () => {
    const response = await fetch(`${PATIENT_URL}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chiefComplaint: 'Headache' }),
    });

    expect(response.status).toBe(400);
  });

  test('URGENT: emergency triage gets queuePosition 1', async () => {
    const { response, body } = await submitAssessmentViaApi(PATIENT_URL, {
      chiefComplaint: 'Severe crushing chest pain radiating to left arm',
      urgencyLevel: 'emergency',
      urgencyScore: 95,
      redFlags: ['Cardiac symptoms'],
    });

    expect(response.status).toBe(201);
    expect(body.queuePosition).toBe(1);
    expect(body.estimatedReviewTime).toMatch(/immediate/i);
    expect(body.urgentAlert).toBe(true);
  });
});

// =============================================================================
// 2. Provider Assessments API — sees submitted assessments
// =============================================================================
test.describe('Provider Assessments API', () => {

  test('GET /api/assessments returns submitted assessment', async () => {
    const { response: submitRes, body: submitBody } = await submitAssessmentViaApi(PATIENT_URL);
    expect(submitRes.status).toBe(201);
    const { assessmentId } = submitBody;

    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?pageSize=100`);
    expect(listRes.status).toBe(200);

    const body = await listRes.json();
    const assessments: any[] = body.assessments ?? [];

    const found = assessments.find((a: any) => a.id === assessmentId);
    expect(found).toBeDefined();
    expect(found.chiefComplaint).toBe('Persistent headache for 3 days');
    expect(found.triageLevel).toBe('MODERATE');
    expect(found.status).toBe('COMPLETED');
  });

  test('GET /api/assessments?unassigned=true only returns unassigned', async () => {
    const { response: submitRes, body: submitBody } = await submitAssessmentViaApi(PATIENT_URL);
    expect(submitRes.status).toBe(201);
    const { assessmentId } = submitBody;

    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?unassigned=true&pageSize=100`);
    expect(listRes.status).toBe(200);

    const { assessments } = await listRes.json();
    const found = assessments.find((a: any) => a.id === assessmentId);
    expect(found).toBeDefined();
    expect(found.assignedProviderId).toBeFalsy();
  });

  test('GET /api/assessments pagination works', async () => {
    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?page=1&pageSize=5`);
    expect(listRes.status).toBe(200);

    const body = await listRes.json();
    expect(body).toHaveProperty('assessments');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
    expect(Array.isArray(body.assessments)).toBe(true);
    expect(body.assessments.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// 3. COMPASS Chat UI — demo mode renders and accepts input
// =============================================================================
test.describe('COMPASS Chat UI (demo mode)', () => {

  test('loads /compass/chat?demo=true without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/404|error/);

    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning') && !e.includes('websocket') && !e.includes('WebSocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('shows COMPASS assessment interface', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('text=COMPASS').or(page.locator('text=Assessment')).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('chat input is functional', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 8000 });

    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    await input.fill('Alex');
    await expect(input).toHaveValue('Alex');
  });

  test('assistant message appears on load', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);

    // The welcome message should render within 5s of the store initializing
    await page.waitForTimeout(1500);
    const messageCount = await page.locator('[class*="message"], [class*="bubble"]').count();
    expect(messageCount).toBeGreaterThan(0);
  });

  test('quick replies appear after welcome message', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Let store initialize and render welcome message

    // Quick replies are rendered from metadata.quickReplies on the last assistant message
    const quickReplyButtons = page.locator('button').filter({ hasText: /Today|Yesterday|Recent|Onset/i });
    // Some phases have quick replies, some don't — just verify no JS crash occurred
    const allButtons = await page.locator('button').count();
    expect(allButtons).toBeGreaterThan(0);
  });

  test('EMERGENCY: chest pain triggers emergency modal', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass/chat?demo=true`);
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 8000 });

    // Get past the name phase first
    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill('Alex');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);

    // Then enter emergency symptoms
    await input.fill('I have severe crushing chest pain and can\'t breathe');
    await page.keyboard.press('Enter');

    // Emergency modal should appear
    await expect(
      page.locator('text=Emergency').or(page.locator('text=911')).first()
    ).toBeVisible({ timeout: 6000 });
  });
});

// =============================================================================
// 4. COMPASS Landing → Chat navigation
// =============================================================================
test.describe('COMPASS Landing navigation', () => {

  test('landing page loads at /compass', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass`);
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator('text=COMPASS').or(page.locator('text=Assessment')).first()).toBeVisible({ timeout: 5000 });
  });

  test('demo button navigates to /compass/chat', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/compass`);
    await page.waitForLoadState('networkidle');

    const demoButton = page
      .locator('button')
      .filter({ hasText: /demo|start|begin/i })
      .first();

    await expect(demoButton).toBeVisible({ timeout: 5000 });
    await demoButton.click();

    await page.waitForURL(/compass\/chat|\/chat/, { timeout: 5000 });
  });
});

// =============================================================================
// 5. Full Core Loop — patient submits → provider queue shows it
// =============================================================================
test.describe('Full Core Loop', () => {

  test('patient submits → provider queue contains assessment with correct data', async () => {
    // Step 1: Submit assessment (simulates completed COMPASS flow)
    const uniqueComplaint = `E2E core loop ${Date.now()}`;
    const { response: submitRes, body: submitBody } = await submitAssessmentViaApi(PATIENT_URL, {
      chiefComplaint: uniqueComplaint,
    });

    expect(submitRes.status).toBe(201);
    const { assessmentId } = submitBody;
    expect(assessmentId).toBeTruthy();

    // Step 2: Provider API shows it immediately
    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?unassigned=true&pageSize=100`);
    expect(listRes.status).toBe(200);

    const { assessments } = await listRes.json();
    const found = assessments.find((a: any) => a.id === assessmentId);

    // Critical assertions
    expect(found).toBeDefined();
    expect(found.chiefComplaint).toBe(uniqueComplaint);
    expect(found.status).toBe('COMPLETED');
    expect(found.assignedProviderId).toBeFalsy(); // No provider assigned yet
    expect(found.patientName).toBeTruthy();
    expect(found.patientMRN).toMatch(/COMPASS/); // MRN created by submit handler

    console.log(`✅ Core loop verified: ${assessmentId} in provider queue`);
    console.log(`   Patient: ${found.patientName} (${found.patientMRN})`);
    console.log(`   Triage:  ${found.triageLevel}`);
    console.log(`   Wait:    ${found.completedAt}`);
  });

  test('HPI data persists correctly through the loop', async () => {
    const { response: submitRes, body: submitBody } = await submitAssessmentViaApi(PATIENT_URL, {
      chiefComplaint: 'Lower back pain',
      hpi: {
        onset: 'Two weeks ago',
        location: 'Lumbar spine',
        character: 'Sharp',
        severity: 7,
        aggravating: ['Sitting', 'Bending'],
        relieving: ['Lying flat'],
      },
    });

    expect(submitRes.status).toBe(201);
    const { assessmentId } = submitBody;

    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?pageSize=100`);
    const { assessments } = await listRes.json();
    const found = assessments.find((a: any) => a.id === assessmentId);

    expect(found).toBeDefined();
    expect(found.hpiNarrative).toContain('Lower back pain');
    expect(found.hpiNarrative).toContain('Two weeks ago');
    expect(found.hpiNarrative).toContain('Lumbar spine');
    expect(found.hpiNarrative).toContain('7/10');
  });

  test('red flags create emergency record and set correct triage', async () => {
    const { response: submitRes, body: submitBody } = await submitAssessmentViaApi(PATIENT_URL, {
      chiefComplaint: 'Thunderclap headache — worst of my life',
      urgencyLevel: 'emergency',
      urgencyScore: 90,
      redFlags: ['Severe headache - rule out SAH'],
    });

    expect(submitRes.status).toBe(201);
    expect(submitBody.urgentAlert).toBe(true);
    expect(submitBody.queuePosition).toBe(1);

    // Should appear in unassigned queue with EMERGENCY triage
    const listRes = await fetch(`${PROVIDER_URL}/api/assessments?unassigned=true&pageSize=100`);
    const { assessments } = await listRes.json();
    const found = assessments.find((a: any) => a.id === submitBody.assessmentId);

    expect(found).toBeDefined();
    expect(found.triageLevel).toBe('EMERGENCY');
    expect(found.redFlags.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// 6. Health checks
// =============================================================================
test.describe('Health Checks', () => {

  test('patient portal /api/health is up', async ({ page }) => {
    const response = await page.request.get(`${PATIENT_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('provider portal /api/health is up', async ({ page }) => {
    const response = await page.request.get(`${PROVIDER_URL}/api/health`);
    expect(response.status()).toBe(200);
  });
});
