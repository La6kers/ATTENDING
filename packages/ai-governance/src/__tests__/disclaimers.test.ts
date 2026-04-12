// =============================================================================
// ATTENDING AI - Disclaimer Templates Tests
// packages/ai-governance/src/__tests__/disclaimers.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  DISCLAIMERS,
  getDisclaimer,
  attachDisclaimer,
} from '../disclaimers/templates';

describe('DISCLAIMERS', () => {
  it('should have all 6 required disclaimer templates', () => {
    expect(DISCLAIMERS.STANDARD_AI).toBeDefined();
    expect(DISCLAIMERS.CLINICAL_GUIDANCE).toBeDefined();
    expect(DISCLAIMERS.EDUCATIONAL).toBeDefined();
    expect(DISCLAIMERS.EMERGENCY).toBeDefined();
    expect(DISCLAIMERS.FHIR_DATA_ANALYSIS).toBeDefined();
    expect(DISCLAIMERS.DIFFERENTIAL_DIAGNOSIS).toBeDefined();
  });

  it('should have machine-readable metadata on each disclaimer', () => {
    for (const [, disclaimer] of Object.entries(DISCLAIMERS)) {
      expect(disclaimer.machineReadable).toBeDefined();
      expect(disclaimer.machineReadable.aiGenerated).toBe(true);
      expect(typeof disclaimer.machineReadable.requiresClinicianReview).toBe('boolean');
      expect(disclaimer.machineReadable.contentType).toBeDefined();
    }
  });

  it('should require clinician review for clinical disclaimers', () => {
    expect(DISCLAIMERS.CLINICAL_GUIDANCE.machineReadable.requiresClinicianReview).toBe(true);
    expect(DISCLAIMERS.EMERGENCY.machineReadable.requiresClinicianReview).toBe(true);
    expect(DISCLAIMERS.FHIR_DATA_ANALYSIS.machineReadable.requiresClinicianReview).toBe(true);
    expect(DISCLAIMERS.DIFFERENTIAL_DIAGNOSIS.machineReadable.requiresClinicianReview).toBe(true);
  });

  it('should not require clinician review for educational/standard disclaimers', () => {
    expect(DISCLAIMERS.STANDARD_AI.machineReadable.requiresClinicianReview).toBe(false);
    expect(DISCLAIMERS.EDUCATIONAL.machineReadable.requiresClinicianReview).toBe(false);
  });

  it('should have unique IDs for each disclaimer', () => {
    const ids = Object.values(DISCLAIMERS).map(d => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('should have both full text and short text', () => {
    for (const [, disclaimer] of Object.entries(DISCLAIMERS)) {
      expect(disclaimer.text.length).toBeGreaterThan(0);
      expect(disclaimer.shortText.length).toBeGreaterThan(0);
      expect(disclaimer.shortText.length).toBeLessThan(disclaimer.text.length);
    }
  });
});

describe('getDisclaimer', () => {
  it('should return CLINICAL_GUIDANCE for clinical-guidance', () => {
    const d = getDisclaimer('clinical-guidance');
    expect(d.id).toBe('clinical-guidance');
  });

  it('should return EDUCATIONAL for educational', () => {
    const d = getDisclaimer('educational');
    expect(d.id).toBe('educational');
  });

  it('should return EMERGENCY for emergency', () => {
    const d = getDisclaimer('emergency');
    expect(d.id).toBe('emergency');
  });

  it('should return FHIR_DATA_ANALYSIS for fhir-analysis', () => {
    const d = getDisclaimer('fhir-analysis');
    expect(d.id).toBe('fhir-data-analysis');
  });

  it('should return DIFFERENTIAL_DIAGNOSIS for differential', () => {
    const d = getDisclaimer('differential');
    expect(d.id).toBe('differential-diagnosis');
  });

  it('should return STANDARD_AI as default', () => {
    const d = getDisclaimer('unknown-type');
    expect(d.id).toBe('standard-ai');
  });
});

describe('attachDisclaimer', () => {
  it('should attach disclaimer to output', () => {
    const output = { message: 'Test output', data: [1, 2, 3] };
    const result = attachDisclaimer(output, 'STANDARD_AI');

    expect(result.message).toBe('Test output');
    expect(result.data).toEqual([1, 2, 3]);
    expect(result._disclaimer).toBeDefined();
    expect(result._disclaimer.id).toBe('standard-ai');
  });

  it('should fall back to STANDARD_AI for unknown disclaimer ID', () => {
    const result = attachDisclaimer({}, 'NONEXISTENT');
    expect(result._disclaimer.id).toBe('standard-ai');
  });

  it('should enrich machine-readable with model version and confidence', () => {
    const result = attachDisclaimer({}, 'CLINICAL_GUIDANCE', 'claude-sonnet-4-20250514', 0.85);

    expect(result._disclaimer.machineReadable.modelVersion).toBe('claude-sonnet-4-20250514');
    expect(result._disclaimer.machineReadable.confidenceScore).toBe(0.85);
  });

  it('should preserve original disclaimer metadata', () => {
    const result = attachDisclaimer({}, 'EMERGENCY');

    expect(result._disclaimer.level).toBe('emergency');
    expect(result._disclaimer.machineReadable.requiresClinicianReview).toBe(true);
    expect(result._disclaimer.machineReadable.aiGenerated).toBe(true);
  });
});
