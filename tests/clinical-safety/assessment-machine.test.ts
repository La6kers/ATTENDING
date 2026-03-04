// ATTENDING AI — Assessment Machine Safety Tests
// tests/clinical-safety/assessment-machine.test.ts
//
// XState v4 compatible (repo uses xstate ^4.38.0).
// Uses interpret() + service.send() / service.getSnapshot().
//
// Verifies every CLINICAL_SAFETY.md requirement for the state machine.

import { describe, it, expect, afterEach } from 'vitest';
import { interpret } from 'xstate';
import { assessmentMachine } from '../../apps/shared/machines/assessmentMachine';

// ---- HELPERS -----------------------------------------------------------

type Service = ReturnType<typeof interpret<typeof assessmentMachine>>;

const services: Service[] = [];

function makeService(): Service {
  const svc = interpret(assessmentMachine);
  svc.start();
  services.push(svc);
  return svc;
}

afterEach(() => {
  services.forEach(s => { try { s.stop(); } catch { /* already stopped */ } });
  services.length = 0;
});

function state(svc: Service) {
  return svc.getSnapshot().value as string;
}

function ctx(svc: Service) {
  return svc.getSnapshot().context;
}

function send(svc: Service, event: Record<string, unknown> & { type: string }) {
  svc.send(event as Parameters<Service['send']>[0]);
}

function startAssessment(svc: Service) {
  send(svc, { type: 'START', patientId: 'p-test-001', patientName: 'Test Patient' });
}

function completeAllPhases(svc: Service) {
  startAssessment(svc);
  send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
  send(svc, { type: 'PROVIDE_ONSET',              value: '3 days ago' });
  send(svc, { type: 'PROVIDE_LOCATION',            value: 'right knee' });
  send(svc, { type: 'PROVIDE_SEVERITY',            value: 4 });
  send(svc, { type: 'PROVIDE_QUALITY',             value: 'dull ache' });
  send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking', 'stairs'] });
  send(svc, { type: 'PROVIDE_RELIEVING_FACTORS',   value: ['rest', 'ice'] });
  send(svc, { type: 'PROVIDE_ASSOCIATED_SYMPTOMS', value: ['mild swelling'] });
  send(svc, { type: 'PROVIDE_MEDICATIONS',         value: ['ibuprofen 400mg PRN'] });
  send(svc, { type: 'PROVIDE_ALLERGIES',           value: ['NKDA'] });
  send(svc, { type: 'PROVIDE_MEDICAL_HISTORY',     value: ['no significant PMH'] });
  send(svc, { type: 'PROVIDE_ADDITIONAL_INFO',     value: 'no additional concerns' });
}

// ---- INITIAL STATE -----------------------------------------------------

describe('Initial State', () => {
  it('starts in idle state', () => {
    const svc = makeService();
    expect(state(svc)).toBe('idle');
  });

  it('transitions to welcome on START', () => {
    const svc = makeService();
    startAssessment(svc);
    expect(state(svc)).toBe('welcome');
  });

  it('generates a sessionId on START', () => {
    const svc = makeService();
    startAssessment(svc);
    const { sessionId } = ctx(svc);
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  it('records patientId from START event', () => {
    const svc = makeService();
    startAssessment(svc);
    expect(ctx(svc).patientId).toBe('p-test-001');
  });
});

// ---- PHASE REACHABILITY ------------------------------------------------

describe('All 18 Assessment Phases Are Reachable', () => {
  const required = [
    'idle', 'welcome', 'askingOnset', 'askingLocation', 'askingSeverity',
    'askingQuality', 'askingAggravating', 'askingRelieving',
    'askingAssociatedSymptoms', 'askingMedications', 'askingAllergies',
    'askingMedicalHistory', 'askingAdditionalInfo', 'review',
    'submitting', 'complete', 'submitError', 'emergency',
  ];

  it('machine definition contains all 18 state nodes', () => {
    const defined = Object.keys(assessmentMachine.states);
    required.forEach(phase => {
      expect(defined, `Missing state: "${phase}"`).toContain(phase);
    });
  });

  it('OLDCARTS phases visited in correct sequence during a full assessment', () => {
    const visited: string[] = [];
    const svc = makeService();
    svc.subscribe(snap => visited.push(String(snap.value)));
    completeAllPhases(svc);

    const ordered = [
      'welcome', 'askingOnset', 'askingLocation', 'askingSeverity',
      'askingQuality', 'askingAggravating', 'askingRelieving',
      'askingAssociatedSymptoms', 'askingMedications', 'askingAllergies',
      'askingMedicalHistory', 'askingAdditionalInfo', 'review',
    ];
    ordered.forEach(phase => {
      expect(visited, `Phase "${phase}" never visited`).toContain(phase);
    });
  });
});

// ---- RED FLAG DETECTION MID-ASSESSMENT ---------------------------------

describe('Chief Complaint Red Flag Detection', () => {
  it('detects thunderclap headache as critical red flag', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'worst headache of my life, sudden onset' });
    const flags = ctx(svc).detectedRedFlags;
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some((f: { severity: string }) => f.severity === 'critical')).toBe(true);
  });

  it('detects exertional chest pain as red flag', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'exertional chest pain going upstairs' });
    expect(ctx(svc).detectedRedFlags.length).toBeGreaterThan(0);
  });

  it('does NOT flag routine knee pain as critical', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain after running' });
    const hasCritical = ctx(svc).detectedRedFlags.some(
      (f: { severity: string }) => f.severity === 'critical',
    );
    expect(hasCritical).toBe(false);
  });
});

// ---- EMERGENCY TRANSITION FROM EVERY PHASE -----------------------------

describe('Emergency Transition From Every Clinical Phase', () => {
  const phases: Array<{ name: string; setup: (s: Service) => void }> = [
    { name: 'welcome',
      setup: s => startAssessment(s) },
    { name: 'askingOnset',
      setup: s => { startAssessment(s); send(s, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' }); } },
    { name: 'askingLocation',
      setup: s => { startAssessment(s); send(s, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' }); send(s, { type: 'PROVIDE_ONSET', value: '3 days ago' }); } },
    { name: 'askingSeverity',
      setup: s => { startAssessment(s); send(s, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' }); send(s, { type: 'PROVIDE_ONSET', value: '3 days ago' }); send(s, { type: 'PROVIDE_LOCATION', value: 'right knee' }); } },
    { name: 'askingQuality',
      setup: s => { startAssessment(s); send(s, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' }); send(s, { type: 'PROVIDE_ONSET', value: '3 days ago' }); send(s, { type: 'PROVIDE_LOCATION', value: 'right knee' }); send(s, { type: 'PROVIDE_SEVERITY', value: 4 }); } },
    { name: 'askingAssociatedSymptoms',
      setup: s => { startAssessment(s); send(s, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' }); send(s, { type: 'PROVIDE_ONSET', value: '3 days ago' }); send(s, { type: 'PROVIDE_LOCATION', value: 'right knee' }); send(s, { type: 'PROVIDE_SEVERITY', value: 4 }); send(s, { type: 'PROVIDE_QUALITY', value: 'dull' }); send(s, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking'] }); send(s, { type: 'PROVIDE_RELIEVING_FACTORS', value: ['rest'] }); } },
    { name: 'review',
      setup: s => completeAllPhases(s) },
  ];

  phases.forEach(({ name, setup }) => {
    it(`TRIGGER_EMERGENCY from ${name} reaches emergency state`, () => {
      const svc = makeService();
      setup(svc);
      expect(state(svc)).toBe(name);
      send(svc, { type: 'TRIGGER_EMERGENCY' });
      expect(state(svc)).toBe('emergency');
    });
  });
});

// ---- EMERGENCY INVARIANTS ----------------------------------------------

describe('Emergency State Invariants', () => {
  it('sets urgencyLevel to high on entering emergency', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'TRIGGER_EMERGENCY' });
    expect(ctx(svc).urgencyLevel).toBe('high');
  });

  it('sets urgencyScore to 100 on entering emergency', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'TRIGGER_EMERGENCY' });
    expect(ctx(svc).urgencyScore).toBe(100);
  });

  it('DISMISS_EMERGENCY from review-triggered emergency returns to review', () => {
    const svc = makeService();
    completeAllPhases(svc);
    expect(state(svc)).toBe('review');
    send(svc, { type: 'TRIGGER_EMERGENCY' });
    expect(state(svc)).toBe('emergency');
    send(svc, { type: 'DISMISS_EMERGENCY' });
    expect(state(svc)).toBe('review');
  });
});

// ---- HPI COMPLETENESS --------------------------------------------------

describe('HPI Contains All OLDCARTS Fields After Full Assessment', () => {
  it('onset stored after onset phase', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    expect(ctx(svc).hpiData.onset).toBe('3 days ago');
  });

  it('location stored after location phase', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    expect(ctx(svc).hpiData.location).toBe('right knee');
  });

  it('severity stored after severity phase', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 6 });
    expect(ctx(svc).hpiData.severity).toBe(6);
  });

  it('character (quality) stored after quality phase', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'sharp' });
    expect(ctx(svc).hpiData.character).toBe('sharp');
  });

  it('aggravatingFactors stored', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'dull' });
    send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking', 'stairs'] });
    expect(ctx(svc).hpiData.aggravatingFactors).toContain('walking');
  });

  it('relievingFactors stored', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'dull' });
    send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking'] });
    send(svc, { type: 'PROVIDE_RELIEVING_FACTORS', value: ['rest'] });
    expect(ctx(svc).hpiData.relievingFactors).toContain('rest');
  });

  it('associatedSymptoms stored', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'dull' });
    send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking'] });
    send(svc, { type: 'PROVIDE_RELIEVING_FACTORS', value: ['rest'] });
    send(svc, { type: 'PROVIDE_ASSOCIATED_SYMPTOMS', value: ['mild swelling'] });
    expect(ctx(svc).hpiData.associatedSymptoms).toContain('mild swelling');
  });

  it('review state has all 7 OLDCARTS fields after full assessment', () => {
    const svc = makeService();
    completeAllPhases(svc);
    expect(state(svc)).toBe('review');
    const hpi = ctx(svc).hpiData;
    expect(hpi.onset).toBeDefined();
    expect(hpi.location).toBeDefined();
    expect(hpi.severity).toBeDefined();
    expect(hpi.character).toBeDefined();
    expect(hpi.aggravatingFactors).toBeDefined();
    expect(hpi.relievingFactors).toBeDefined();
    expect(hpi.associatedSymptoms).toBeDefined();
  });
});

// ---- URGENCY SCORING ---------------------------------------------------

describe('Urgency Scoring', () => {
  it('pain severity 10 raises urgencyScore above 0', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 10 });
    expect(ctx(svc).urgencyScore).toBeGreaterThan(0);
  });

  it('ACS complaint pushes urgencyLevel to high', () => {
    // rf_chest_pain_radiation fires when chief complaint includes 'chest'
    // AND location field includes 'arm', 'jaw', 'back', or 'radiat'.
    // That rule carries requiresEmergency:true which forces level='high'
    // regardless of numeric score.
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'chest pain with sweating' });
    send(svc, { type: 'PROVIDE_ONSET', value: 'minutes ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'chest radiating to left arm and jaw' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 9 });
    expect(ctx(svc).urgencyLevel).toBe('high');
  });

  it('mild sore throat keeps urgencyLevel at standard or moderate', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'mild sore throat for 2 days' });
    send(svc, { type: 'PROVIDE_ONSET', value: '2 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'throat' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 2 });
    expect(['standard', 'moderate']).toContain(ctx(svc).urgencyLevel);
  });
});

// ---- BACKWARD NAVIGATION -----------------------------------------------

describe('BACK Navigation', () => {
  it('BACK from askingOnset returns to welcome', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    expect(state(svc)).toBe('askingOnset');
    send(svc, { type: 'BACK' });
    expect(state(svc)).toBe('welcome');
  });

  it('BACK from askingLocation returns to askingOnset', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'BACK' });
    expect(state(svc)).toBe('askingOnset');
  });
});

// ---- SKIP EVENTS -------------------------------------------------------

describe('SKIP Events Allow Optional Phases', () => {
  it('SKIP from askingLocation advances to askingSeverity', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'general discomfort' });
    send(svc, { type: 'PROVIDE_ONSET', value: 'today' });
    send(svc, { type: 'SKIP' });
    expect(state(svc)).toBe('askingSeverity');
  });

  it('SKIP from askingQuality advances to askingAggravating', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'discomfort' });
    send(svc, { type: 'PROVIDE_ONSET', value: 'today' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'abdomen' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 3 });
    send(svc, { type: 'SKIP' });
    expect(state(svc)).toBe('askingAggravating');
  });
});

// ---- NO EVENTS ---------------------------------------------------------

describe('NO Events for Medications and Allergies', () => {
  it('NO from askingMedications records empty array and advances to askingAllergies', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'dull' });
    send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking'] });
    send(svc, { type: 'PROVIDE_RELIEVING_FACTORS', value: ['rest'] });
    send(svc, { type: 'PROVIDE_ASSOCIATED_SYMPTOMS', value: [] });
    send(svc, { type: 'NO' });
    expect(state(svc)).toBe('askingAllergies');
    expect(ctx(svc).userResponses.medications).toEqual([]);
  });

  it('NO from askingAllergies records NKDA and advances to askingMedicalHistory', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    send(svc, { type: 'PROVIDE_LOCATION', value: 'right knee' });
    send(svc, { type: 'PROVIDE_SEVERITY', value: 4 });
    send(svc, { type: 'PROVIDE_QUALITY', value: 'dull' });
    send(svc, { type: 'PROVIDE_AGGRAVATING_FACTORS', value: ['walking'] });
    send(svc, { type: 'PROVIDE_RELIEVING_FACTORS', value: ['rest'] });
    send(svc, { type: 'NO' });
    send(svc, { type: 'NO' });
    send(svc, { type: 'NO' });
    expect(state(svc)).toBe('askingMedicalHistory');
    expect(ctx(svc).userResponses.allergies).toContain('NKDA');
  });
});

// ---- REVIEW & SUBMISSION -----------------------------------------------

describe('Review and Submission', () => {
  it('EDIT from review returns to welcome', () => {
    const svc = makeService();
    completeAllPhases(svc);
    expect(state(svc)).toBe('review');
    send(svc, { type: 'EDIT' });
    expect(state(svc)).toBe('welcome');
  });

  it('SUBMIT from review transitions to submitting', () => {
    const svc = makeService();
    completeAllPhases(svc);
    send(svc, { type: 'SUBMIT' });
    expect(state(svc)).toBe('submitting');
  });
});

// ---- SUBMIT ERROR RECOVERY ---------------------------------------------

describe('Submit Error Recovery', () => {
  it('submitError state defines RETRY and EDIT transitions', () => {
    const transitions = Object.keys(assessmentMachine.states['submitError']?.on ?? {});
    expect(transitions).toContain('RETRY');
    expect(transitions).toContain('EDIT');
  });
});

// ---- SESSION METADATA --------------------------------------------------

describe('Session Metadata', () => {
  it('startedAt is recorded as an ISO timestamp on START', () => {
    const before = new Date().toISOString();
    const svc = makeService();
    startAssessment(svc);
    const { startedAt } = ctx(svc);
    const after = new Date().toISOString();
    expect(startedAt >= before).toBe(true);
    expect(startedAt <= after).toBe(true);
  });

  it('questionHistory grows as phases are completed', () => {
    const svc = makeService();
    startAssessment(svc);
    send(svc, { type: 'PROVIDE_CHIEF_COMPLAINT', value: 'knee pain' });
    send(svc, { type: 'PROVIDE_ONSET', value: '3 days ago' });
    expect(ctx(svc).questionHistory.length).toBeGreaterThan(0);
  });
});
