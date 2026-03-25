// =============================================================================
// ATTENDING AI - Clinical API Route Tests
// apps/provider-portal/__tests__/api/clinical.test.ts
//
// Integration tests for clinical API endpoints.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// Import handlers
import triageHandler from '../../pages/api/clinical/triage';
import labsHandler from '../../pages/api/clinical/labs';
import redFlagsHandler from '../../pages/api/clinical/red-flags';
import protocolsHandler from '../../pages/api/clinical/protocols';
import drugCheckHandler from '../../pages/api/clinical/drug-check';

// Helper to create mock request/response
function createMockReqRes(method: string, body?: any, query?: any) {
  return createMocks<NextApiRequest, NextApiResponse>({
    method,
    body,
    query,
  });
}

// =============================================================================
// TRIAGE API TESTS
// =============================================================================
describe('/api/clinical/triage', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMockReqRes('GET');
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 for missing chiefComplaint', async () => {
    const { req, res } = createMockReqRes('POST', {});
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('chiefComplaint');
  });

  it('should classify chest pain as high acuity', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'chest pain',
      symptoms: ['crushing pressure', 'shortness of breath'],
    });
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.esiLevel).toBeLessThanOrEqual(2);
  });

  it('should classify minor symptoms as lower acuity', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'runny nose for 3 days',
      symptoms: ['congestion', 'mild cough'],
    });
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.esiLevel).toBeGreaterThanOrEqual(4);
  });

  it('should handle vital signs in classification', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'weakness',
      vitalSigns: {
        heartRate: 130,
        systolicBP: 80,
        oxygenSaturation: 88,
      },
    });
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.esiLevel).toBeLessThanOrEqual(2);
  });

  it('should validate vital sign ranges', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'feeling unwell',
      vitalSigns: {
        heartRate: 500, // Invalid
        oxygenSaturation: 150, // Invalid
      },
    });
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
  });
});

// =============================================================================
// LABS API TESTS
// =============================================================================
describe('/api/clinical/labs', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMockReqRes('GET');
    
    await labsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 for missing chiefComplaint', async () => {
    const { req, res } = createMockReqRes('POST', {});
    
    await labsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
  });

  it('should recommend cardiac labs for chest pain', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'chest pain',
      symptoms: ['pressure', 'diaphoresis'],
    });
    
    await labsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.recommendations.length).toBeGreaterThan(0);
  });

  it('should categorize recommendations', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'fever and confusion',
      workingDiagnosis: 'sepsis',
    });
    
    await labsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.criticalCount).toBeGreaterThanOrEqual(0);
    expect(data.data.recommendedCount).toBeGreaterThanOrEqual(0);
  });

  it('should include clinical context', async () => {
    const { req, res } = createMockReqRes('POST', {
      chiefComplaint: 'abdominal pain',
      redFlags: ['severe pain'],
    });
    
    await labsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.clinicalContext).toBeDefined();
  });
});

// =============================================================================
// RED FLAGS API TESTS (CRITICAL SAFETY)
// =============================================================================
describe('/api/clinical/red-flags', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMockReqRes('GET');
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 when no symptoms provided', async () => {
    const { req, res } = createMockReqRes('POST', {});
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
  });

  it('should detect cardiac red flags', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.hasRedFlags).toBe(true);
    expect(data.data.urgencyLevel).toBe('critical');
    expect(data.data.escalationRequired).toBe(true);
  });

  it('should detect stroke red flags', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['facial droop', 'arm weakness', 'slurred speech'],
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.hasRedFlags).toBe(true);
    expect(data.data.urgencyLevel).toBe('critical');
  });

  it('should detect psychiatric red flags', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['suicidal thoughts', 'wants to end life'],
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.hasRedFlags).toBe(true);
    expect(data.data.urgencyLevel).toBe('critical');
    expect(data.data.immediateActions.length).toBeGreaterThan(0);
  });

  it('should provide immediate actions for critical findings', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['chest pain radiating to jaw'],
      chiefComplaint: 'crushing chest pressure',
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.immediateActions.length).toBeGreaterThan(0);
    expect(data.data.disposition).toBeDefined();
  });

  it('should return no red flags for routine symptoms', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['mild headache', 'runny nose'],
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.escalationRequired).toBe(false);
  });

  it('should include emergency protocol when applicable', async () => {
    const { req, res } = createMockReqRes('POST', {
      symptoms: ['sudden weakness on one side', 'speech difficulty'],
      chiefComplaint: 'stroke symptoms',
    });
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.emergencyProtocol).toBeDefined();
  });
});

// =============================================================================
// PROTOCOLS API TESTS
// =============================================================================
describe('/api/clinical/protocols', () => {
  it('should return protocol for stroke', async () => {
    const { req, res } = createMockReqRes('POST', {
      condition: 'stroke',
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.protocol).toBeDefined();
  });

  it('should return protocol for ACS', async () => {
    const { req, res } = createMockReqRes('POST', {
      condition: 'acute coronary syndrome',
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });

  it('should return protocol for sepsis', async () => {
    const { req, res } = createMockReqRes('POST', {
      condition: 'sepsis',
      severity: 'severe',
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.protocol).toBeDefined();
  });

  it('should handle condition aliases', async () => {
    const { req, res } = createMockReqRes('POST', {
      condition: 'heart attack', // Alias for ACS
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });

  it('should return 404 for unknown conditions', async () => {
    const { req, res } = createMockReqRes('POST', {
      condition: 'unknown_condition_xyz',
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(404);
  });

  it('should support GET requests with query params', async () => {
    const { req, res } = createMockReqRes('GET', undefined, {
      condition: 'stroke',
    });
    
    await protocolsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });
});

// =============================================================================
// DRUG CHECK API TESTS
// =============================================================================
describe('/api/clinical/drug-check', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMockReqRes('GET');
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 for missing required fields', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'aspirin' },
      // Missing currentMedications and allergies
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
  });

  it('should detect warfarin + NSAID interaction', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'ibuprofen' },
      currentMedications: [{ name: 'warfarin' }],
      allergies: [],
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.interactions.length).toBeGreaterThan(0);
    expect(data.data.overallRiskLevel).not.toBe('low');
  });

  it('should detect penicillin allergy cross-reactivity', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'amoxicillin' },
      currentMedications: [],
      allergies: [{ allergen: 'penicillin', severity: 'severe' }],
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.allergyAlerts.length).toBeGreaterThan(0);
  });

  it('should allow safe medications', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'acetaminophen' },
      currentMedications: [{ name: 'lisinopril' }],
      allergies: [],
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.safeToAdminister).toBe(true);
    expect(data.data.overallRiskLevel).toBe('low');
  });

  it('should flag pregnancy contraindications', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'warfarin' },
      currentMedications: [],
      allergies: [],
      pregnancyStatus: 'pregnant',
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.contraindications.length).toBeGreaterThan(0);
  });

  it('should provide clinical guidance', async () => {
    const { req, res } = createMockReqRes('POST', {
      proposedMedication: { name: 'metformin' },
      currentMedications: [],
      allergies: [],
      renalFunction: 'moderate-impairment',
    });
    
    await drugCheckHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.data.clinicalGuidance).toBeDefined();
  });
});

// =============================================================================
// CORS AND OPTIONS TESTS
// =============================================================================
describe('CORS and OPTIONS handling', () => {
  it('should handle OPTIONS request for triage', async () => {
    const { req, res } = createMockReqRes('OPTIONS');
    
    await triageHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });

  it('should handle OPTIONS request for red-flags', async () => {
    const { req, res } = createMockReqRes('OPTIONS');
    
    await redFlagsHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });
});
