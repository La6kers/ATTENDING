// =============================================================================
// Inbox AI Agent — Behavioral Health Context Tests
// apps/provider-portal/lib/services/__tests__/inboxAIAgent.test.ts
//
// Verifies that the inbox agent correctly:
//   1. Detects behavioral health terminology in patient messages
//   2. Pulls the BehavioralHealthSnapshot into the LLM prompt
//   3. Always pulls BH context when hasSuicideRisk=true regardless of message
//   4. Includes explicit SI reconciliation rules in the prompt
//
// These tests guard against the production incident where a patient denied
// SI in a screening but the AI still flagged the message as suicidal.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  prescanMessage,
  gatherChartContext,
  buildAgentPrompt,
  type BehavioralHealthSnapshot,
} from '../inboxAIAgent';

const MOCK_CHART = {
  conditions: ['Type 2 Diabetes', 'Hypertension'],
  medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
  recentLabs: [],
  allergies: ['Penicillin'],
  recentVitals: { bp: '128/82', hr: '74', temp: '98.6' },
  lastVisit: { date: '2026-03-15', reason: 'Annual physical', provider: 'Dr. Isbell' },
};

const NEGATIVE_BH_SNAPSHOT: BehavioralHealthSnapshot = {
  phq9: {
    completedAt: '2026-04-10',
    totalScore: 4,
    severity: 'mild',
    item9Score: 0,
    interpretation: 'Mild depressive symptoms; no suicidal ideation endorsed.',
  },
  cssrs: {
    completedAt: '2026-04-10',
    ideationLevel: 0,
    behaviorPresent: false,
    interpretation: 'No suicidal ideation, plan, intent, or behavior.',
  },
  hasSuicideRisk: false,
  safetyPlanOnFile: false,
  clinicianContextNote: 'Patient explicitly denied SI on 2026-04-10 C-SSRS.',
};

const POSITIVE_BH_SNAPSHOT: BehavioralHealthSnapshot = {
  phq9: {
    completedAt: '2026-04-12',
    totalScore: 19,
    severity: 'moderately-severe',
    item9Score: 2,
    interpretation: 'Moderately severe depression; positive item 9.',
  },
  cssrs: {
    completedAt: '2026-04-12',
    ideationLevel: 4,
    behaviorPresent: false,
    interpretation: 'Active SI with intent, no plan/behavior.',
  },
  hasSuicideRisk: true,
  recommendedAction: 'SafetyPlanRequired',
  safetyPlanOnFile: false,
};

describe('prescanMessage — behavioral health detection', () => {
  it('flags behavioralHealth when message mentions "depression"', () => {
    const sections = prescanMessage('I have been feeling depression for two weeks.');
    expect(sections.behavioralHealth).toBe(true);
  });

  it('flags behavioralHealth on "suicidal" even in negated form', () => {
    // Prescan is keyword-based; the negation logic lives in the LLM prompt
    // reconciliation rules, not in prescan. We always pull BH context if
    // the word appears.
    const sections = prescanMessage('I deny any suicidal thoughts');
    expect(sections.behavioralHealth).toBe(true);
  });

  it('flags behavioralHealth on antidepressant names', () => {
    expect(prescanMessage('refill my sertraline').behavioralHealth).toBe(true);
    expect(prescanMessage('sertraline side effects').behavioralHealth).toBe(true);
    expect(prescanMessage('zoloft causing nausea').behavioralHealth).toBe(true);
  });

  it('flags behavioralHealth on "anxiety" and "panic"', () => {
    expect(prescanMessage('having more anxiety lately').behavioralHealth).toBe(true);
    expect(prescanMessage('panic attack last night').behavioralHealth).toBe(true);
  });

  it('does NOT flag behavioralHealth for unrelated messages', () => {
    expect(prescanMessage('need to refill metformin').behavioralHealth).toBe(false);
    expect(prescanMessage('chest pain since this morning').behavioralHealth).toBe(false);
  });
});

describe('gatherChartContext — behavioral health pull', () => {
  it('includes BH snapshot when prescan flags behavioralHealth', () => {
    const sections = prescanMessage('feeling depressed');
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: NEGATIVE_BH_SNAPSHOT },
      sections,
    );
    expect(ctx.behavioralHealth).toBeDefined();
    expect(ctx.behavioralHealth?.hasSuicideRisk).toBe(false);
  });

  it('ALWAYS includes BH snapshot when hasSuicideRisk=true, even if message is unrelated', () => {
    const sections = prescanMessage('need a medication refill');
    expect(sections.behavioralHealth).toBe(false);
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: POSITIVE_BH_SNAPSHOT },
      sections,
    );
    expect(ctx.behavioralHealth).toBeDefined();
    expect(ctx.behavioralHealth?.hasSuicideRisk).toBe(true);
  });

  it('does NOT include BH snapshot when message is unrelated and patient has no risk', () => {
    const sections = prescanMessage('need a medication refill');
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: NEGATIVE_BH_SNAPSHOT },
      sections,
    );
    expect(ctx.behavioralHealth).toBeUndefined();
  });

  it('handles patients with no BH data on file', () => {
    const sections = prescanMessage('feeling depressed');
    const ctx = gatherChartContext(MOCK_CHART, sections);
    expect(ctx.behavioralHealth).toBeUndefined();
  });
});

describe('buildAgentPrompt — SI reconciliation rules', () => {
  const baseMessage = {
    from: 'Jane Doe',
    subject: 'Following up',
    content: 'I have been feeling really down and sometimes I deny suicidal thoughts but it is hard.',
    category: 'general',
  };

  it('includes structured BH status block when snapshot is present', () => {
    const sections = prescanMessage(baseMessage.content);
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: NEGATIVE_BH_SNAPSHOT },
      sections,
    );
    const prompt = buildAgentPrompt(baseMessage, ctx, 'Dr. Isbell');

    expect(prompt).toContain('BEHAVIORAL HEALTH STATUS (STRUCTURED — TREAT AS GROUND TRUTH)');
    expect(prompt).toContain('item 9 (SI) = 0/3');
    expect(prompt).toContain('ideationLevel=0/5');
    expect(prompt).toContain('hasSuicideRisk: false');
    expect(prompt).toContain('Patient explicitly denied SI on 2026-04-10');
  });

  it('includes the explicit reconciliation rules', () => {
    const sections = prescanMessage(baseMessage.content);
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: NEGATIVE_BH_SNAPSHOT },
      sections,
    );
    const prompt = buildAgentPrompt(baseMessage, ctx, 'Dr. Isbell');

    expect(prompt).toContain('CRITICAL SI RECONCILIATION RULES');
    expect(prompt).toContain('AUTHORITATIVE record');
    expect(prompt).toContain('988');
    expect(prompt).toContain('NEGATED or HISTORICAL context');
  });

  it('escalation rules are present when hasSuicideRisk=true', () => {
    const sections = prescanMessage('checking in about my new prescription');
    const ctx = gatherChartContext(
      { ...MOCK_CHART, behavioralHealth: POSITIVE_BH_SNAPSHOT },
      sections,
    );
    const prompt = buildAgentPrompt(
      { ...baseMessage, content: 'checking in about my new prescription' },
      ctx,
      'Dr. Isbell',
    );

    expect(prompt).toContain('hasSuicideRisk: true');
    expect(prompt).toContain('safetyPlanOnFile: false');
    expect(prompt).toContain('recommendedAction: SafetyPlanRequired');
    // The reconciliation rules instruct the LLM to escalate
    expect(prompt).toContain('severity="emergent"');
  });

  it('omits BH block entirely when no snapshot is provided', () => {
    const sections = prescanMessage('routine refill request');
    const ctx = gatherChartContext(MOCK_CHART, sections);
    const prompt = buildAgentPrompt(
      { ...baseMessage, content: 'routine refill request', category: 'refills' },
      ctx,
      'Dr. Isbell',
    );

    expect(prompt).not.toContain('BEHAVIORAL HEALTH STATUS');
    expect(prompt).not.toContain('CRITICAL SI RECONCILIATION');
  });
});
