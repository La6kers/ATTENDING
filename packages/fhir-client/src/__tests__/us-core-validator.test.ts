// =============================================================================
// ATTENDING AI - US Core Validator Tests
// packages/fhir-client/src/__tests__/us-core-validator.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest';
import { FHIR_CATEGORY_RESOURCE_MAP } from '../types';

// =============================================================================
// Tests
// =============================================================================

describe('FHIR_CATEGORY_RESOURCE_MAP', () => {
  it('should map all 12 data categories', () => {
    const categories = Object.keys(FHIR_CATEGORY_RESOURCE_MAP);
    expect(categories).toHaveLength(12);
    expect(categories).toContain('demographics');
    expect(categories).toContain('conditions');
    expect(categories).toContain('medications');
    expect(categories).toContain('allergies');
    expect(categories).toContain('labs');
    expect(categories).toContain('vitals');
    expect(categories).toContain('encounters');
    expect(categories).toContain('procedures');
    expect(categories).toContain('immunizations');
    expect(categories).toContain('documents');
    expect(categories).toContain('claims');
    expect(categories).toContain('imaging');
  });

  it('should map demographics to Patient', () => {
    expect(FHIR_CATEGORY_RESOURCE_MAP.demographics).toEqual(['Patient']);
  });

  it('should map medications to both MedicationRequest and MedicationStatement', () => {
    expect(FHIR_CATEGORY_RESOURCE_MAP.medications).toContain('MedicationRequest');
    expect(FHIR_CATEGORY_RESOURCE_MAP.medications).toContain('MedicationStatement');
  });

  it('should map labs and vitals both to Observation', () => {
    expect(FHIR_CATEGORY_RESOURCE_MAP.labs).toContain('Observation');
    expect(FHIR_CATEGORY_RESOURCE_MAP.vitals).toContain('Observation');
  });

  it('should map claims to ExplanationOfBenefit, Claim, and ClaimResponse', () => {
    expect(FHIR_CATEGORY_RESOURCE_MAP.claims).toContain('ExplanationOfBenefit');
    expect(FHIR_CATEGORY_RESOURCE_MAP.claims).toContain('Claim');
    expect(FHIR_CATEGORY_RESOURCE_MAP.claims).toContain('ClaimResponse');
  });

  it('should map imaging to ImagingStudy and DiagnosticReport', () => {
    expect(FHIR_CATEGORY_RESOURCE_MAP.imaging).toContain('ImagingStudy');
    expect(FHIR_CATEGORY_RESOURCE_MAP.imaging).toContain('DiagnosticReport');
  });

  it('should have no empty arrays', () => {
    for (const [category, resources] of Object.entries(FHIR_CATEGORY_RESOURCE_MAP)) {
      expect(resources.length, `${category} should have at least one resource`).toBeGreaterThan(0);
    }
  });
});
