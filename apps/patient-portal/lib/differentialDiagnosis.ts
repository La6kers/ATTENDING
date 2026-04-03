// =============================================================================
// ATTENDING AI — Differential Diagnosis (Patient Portal Adapter)
// apps/patient-portal/lib/differentialDiagnosis.ts
//
// Wraps the shared Bayesian diagnosis engine for the patient-portal's
// AssessmentResultView component. Keeps the DifferentialDx interface for
// backward compatibility while using the full Bayesian pipeline underneath.
// =============================================================================
//
// TODO(SECURITY): This adapter (and the full shared Bayesian pipeline it
// imports) is currently executed client-side in the patient browser bundle.
// The differential diagnosis algorithm — including scoring weights, ICD-10
// mappings, and likelihood ratios — is therefore fully visible in DevTools.
//
// Recommended migration:
//   1. Move computation to pages/api/clinical/differential.ts (or .NET backend)
//   2. Replace this client-side call with a fetch() to that API endpoint
//   3. Return only the DifferentialDx[] result array to the browser
//
// This also ensures that PHI flowing through the algorithm (symptoms, vitals,
// medications) is processed server-side under HIPAA-compliant logging controls.
// =============================================================================

import {
  DifferentialDiagnosisService,
  type PatientPresentation,
} from '@attending/shared/lib/ai/differentialDiagnosis';

// Legacy interface — kept for AssessmentResultView compatibility
export interface DifferentialDx {
  name: string;
  probability: number;
  icd10Code: string;
  supportingEvidence: string[];
  category: string;
}

interface HPIInput {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  timing?: string;
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
}

// Category inference from diagnosis name
function inferCategory(diagnosis: string, urgency: string): string {
  if (urgency === 'emergent') return 'Emergency';
  const d = diagnosis.toLowerCase();
  if (d.includes('coronary') || d.includes('heart') || d.includes('aortic') || d.includes('pericarditis') || d.includes('arrhythmia')) return 'Cardiovascular';
  if (d.includes('pneumonia') || d.includes('copd') || d.includes('asthma') || d.includes('embolism') || d.includes('pneumothorax') || d.includes('bronchitis')) return 'Pulmonary';
  if (d.includes('stroke') || d.includes('migraine') || d.includes('tension') || d.includes('headache') || d.includes('hemorrhage') || d.includes('meningitis') || d.includes('cluster')) return 'Neurological';
  if (d.includes('appendicitis') || d.includes('cholecystitis') || d.includes('pancreatitis') || d.includes('gerd') || d.includes('ulcer') || d.includes('diverticulitis') || d.includes('gastro') || d.includes('bowel')) return 'Gastrointestinal';
  if (d.includes('meniscal') || d.includes('acl') || d.includes('mcl') || d.includes('patello') || d.includes('osteoarthritis') || d.includes('fracture') || d.includes('strain') || d.includes('musculoskeletal') || d.includes('disc') || d.includes('stenosis') || d.includes('band')) return 'Musculoskeletal';
  if (d.includes('uti') || d.includes('pyelonephritis') || d.includes('kidney') || d.includes('prostatitis') || d.includes('urethritis')) return 'Urological';
  if (d.includes('pharyngitis') || d.includes('abscess') || d.includes('epiglottitis') || d.includes('mononucleosis')) return 'ENT';
  if (d.includes('depressive') || d.includes('anxiety') || d.includes('panic') || d.includes('bipolar') || d.includes('adjustment')) return 'Psychiatric';
  if (d.includes('anemia') || d.includes('hypothyroid') || d.includes('hyperthyroid')) return 'Systemic';
  return 'General';
}

/**
 * Generate differential diagnosis using the shared Bayesian engine.
 * Returns legacy DifferentialDx[] format for AssessmentResultView compatibility.
 */
export function generateDifferentialDiagnosis(
  chiefComplaint: string,
  hpi: HPIInput,
  redFlags: Array<{ symptom: string }>,
): DifferentialDx[] {
  if (!chiefComplaint) {
    return [{
      name: 'Clinical evaluation required',
      probability: 50,
      icd10Code: 'R69',
      supportingEvidence: ['No chief complaint provided'],
      category: 'General',
    }];
  }

  // Build PatientPresentation for the shared engine
  const presentation: PatientPresentation = {
    chiefComplaint,
    duration: hpi.duration,
    symptoms: [
      {
        name: chiefComplaint,
        severity: hpi.severity && hpi.severity >= 7 ? 'severe' : hpi.severity && hpi.severity >= 4 ? 'moderate' : 'mild',
        onset: hpi.onset,
        location: hpi.location,
        character: hpi.character,
        timing: hpi.timing,
        aggravatingFactors: hpi.aggravating,
        alleviatingFactors: hpi.relieving,
      },
      ...(hpi.associated || [])
        .filter(s => s && s.toLowerCase() !== 'no associated symptoms')
        .map(s => ({ name: s })),
    ],
    demographics: {
      age: 40, // Default — patient-portal doesn't always pass DOB
      gender: 'other',
    },
    redFlags: redFlags.map(rf => rf.symptom),
  };

  // Run the Bayesian engine synchronously (local provider)
  const service = new DifferentialDiagnosisService({ provider: 'local' });

  // generateDifferentials is async but local logic is sync internally
  // Use the private method directly via a sync wrapper
  const differentials = (service as any).generateWithLocalLogic(presentation);
  const emergent = (service as any).checkEmergentConditions(presentation);
  const merged = (service as any).mergeEmergentConditions(differentials, emergent);
  merged.sort((a: any, b: any) => b.confidence - a.confidence);

  // Convert to legacy DifferentialDx format
  const results: DifferentialDx[] = merged.slice(0, 10).map((dx: any) => ({
    name: dx.diagnosis,
    probability: dx.confidence,
    icd10Code: dx.icdCode || '',
    supportingEvidence: dx.supportingFindings || ['Based on clinical assessment'],
    category: inferCategory(dx.diagnosis, dx.urgency),
  }));

  if (results.length === 0) {
    return [{
      name: 'Clinical evaluation required',
      probability: 50,
      icd10Code: 'R69',
      supportingEvidence: ['Assessment data insufficient for differential — clinical evaluation recommended'],
      category: 'General',
    }];
  }

  return results;
}
