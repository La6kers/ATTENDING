// ============================================================
// Pre-Visit Summary Page
// apps/provider-portal/pages/previsit/[id].tsx
//
// Loads real assessment data from /api/assessments/[id].
// When provider is connected to Epic/Cerner, EHR data
// (medications, allergies, vitals, conditions) enriches
// the view — EHR is authoritative, assessment is fallback.
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import type { PreVisitData, PatientVitals, SuggestedDiagnosis } from '@/components/previsit';
import { PreVisitSummary } from '@/components/previsit';
import { CostAwareAIRouter } from '@attending/shared/services/CostAwareAIRouter';
import { usePatientFhirEnrichment } from '@/hooks/usePatientFhirEnrichment';

// ============================================================
// Vitals Status Helpers
// ============================================================

function bpStatus(systolic: number): PatientVitals['bloodPressure']['status'] {
  if (systolic >= 180) return 'critical';
  if (systolic >= 140) return 'high';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}
function hrStatus(hr: number): PatientVitals['heartRate']['status'] {
  if (hr >= 150) return 'critical';
  if (hr > 100) return 'tachycardia';
  if (hr < 40) return 'critical';
  if (hr < 60) return 'bradycardia';
  return 'normal';
}
function tempStatus(temp: number): PatientVitals['temperature']['status'] {
  if (temp >= 103) return 'fever';
  if (temp >= 99.5) return 'elevated';
  if (temp < 96) return 'low';
  return 'normal';
}
function respStatus(rr: number): PatientVitals['respRate']['status'] {
  if (rr > 20) return 'elevated';
  if (rr < 12) return 'low';
  return 'normal';
}
function o2Status(sat: number): PatientVitals['oxygenSat']['status'] {
  if (sat < 90) return 'critical';
  if (sat < 95) return 'low';
  return 'normal';
}

// ============================================================
// API → PreVisitData Mapper  (unchanged from original)
// ============================================================

function mapApiToPreVisitData(api: any): PreVisitData {
  const p = api.patient || {};
  const record = api.patientRecord || {};
  const vitalsRaw = record.recentVitals;

  const vitals: PatientVitals = vitalsRaw
    ? {
        bloodPressure: { systolic: vitalsRaw.bloodPressureSystolic ?? 120, diastolic: vitalsRaw.bloodPressureDiastolic ?? 80, status: bpStatus(vitalsRaw.bloodPressureSystolic ?? 120) },
        heartRate: { value: vitalsRaw.heartRate ?? 75, status: hrStatus(vitalsRaw.heartRate ?? 75) },
        temperature: { value: vitalsRaw.temperature ?? 98.6, unit: 'F', status: tempStatus(vitalsRaw.temperature ?? 98.6) },
        respRate: { value: vitalsRaw.respiratoryRate ?? 16, status: respStatus(vitalsRaw.respiratoryRate ?? 16) },
        oxygenSat: { value: vitalsRaw.oxygenSaturation ?? 98, status: o2Status(vitalsRaw.oxygenSaturation ?? 98) },
      }
    : {
        bloodPressure: { systolic: 0, diastolic: 0, status: 'normal' },
        heartRate: { value: 0, status: 'normal' },
        temperature: { value: 0, unit: 'F', status: 'normal' },
        respRate: { value: 0, status: 'normal' },
        oxygenSat: { value: 0, status: 'normal' },
      };

  const medications: PreVisitData['medications'] =
    record.medications?.length > 0
      ? record.medications.map((m: any) => ({ id: m.id, name: m.name, dosage: m.dose || 'See chart', frequency: m.frequency || '', status: (m.status?.toLowerCase() || 'active') as any }))
      : (api.medications as string[] || []).map((name: string, i: number) => ({ id: `asm-med-${i}`, name, dosage: '', frequency: '', status: 'active' as const }));

  const allergies: PreVisitData['allergies'] =
    record.allergies?.length > 0
      ? record.allergies.map((a: any) => ({ id: a.id, allergen: a.allergen, reaction: a.reaction || 'Unknown reaction', severity: (a.severity?.toLowerCase() || 'moderate') as any }))
      : (api.allergies as string[] || []).map((name: string, i: number) => ({ id: `asm-allergy-${i}`, allergen: name, reaction: 'See chart', severity: 'moderate' as const }));

  const redFlags: string[] = Array.isArray(api.redFlags) ? api.redFlags : [];
  const triageLevel: string = api.triageLevel || 'ROUTINE';
  const riskLevel: PreVisitData['riskAssessment']['level'] =
    triageLevel === 'EMERGENCY' ? 'critical' : triageLevel === 'URGENT' ? 'high' : triageLevel === 'MODERATE' ? 'moderate' : 'low';
  const riskSummary = riskLevel === 'critical' ? 'Emergency Evaluation Required' : riskLevel === 'high' ? 'Urgent Evaluation Required' : riskLevel === 'moderate' ? 'Requires Prompt Attention' : 'Routine Evaluation';

  const actionItems: PreVisitData['actionItems'] = redFlags.length > 0
    ? redFlags.map((flag: string, i: number) => ({ id: `rf-action-${i}`, description: `Evaluate: ${flag}`, priority: riskLevel === 'critical' || riskLevel === 'high' ? 'urgent' : 'high' }))
    : [{ id: 'action-default', description: 'Review patient history', priority: 'normal' }, { id: 'action-vitals', description: 'Obtain vital signs', priority: 'normal' }];

  const cc = api.chiefComplaint || 'Not specified';
  const hpi = api.hpiNarrative || cc;
  const symptoms: string[] = Array.isArray(api.symptoms) ? api.symptoms : [];
  const symptomsText = symptoms.length > 0 ? `\n\nAssociated symptoms: ${symptoms.join(', ')}.` : '';
  const dob = p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Unknown';
  const criticalAlert: PreVisitData['criticalAlert'] | undefined =
    (riskLevel === 'critical' || (riskLevel === 'high' && redFlags.length > 0))
      ? { message: redFlags.length > 0 ? `${redFlags[0]} — ${riskSummary}` : riskSummary, type: 'other' }
      : undefined;

  return {
    patient: { id: p.id || api.id, firstName: p.firstName || 'Unknown', lastName: p.lastName || 'Patient', age: p.age || 0, gender: p.gender || 'Unknown', mrn: p.mrn || '', dob, phone: p.phone || undefined },
    appointment: { time: api.completedAt ? new Date(api.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Pending', type: 'COMPASS Pre-Visit Assessment' },
    chiefComplaint: { summary: cc, patientQuote: cc, patientEmphasis: redFlags.length > 0 ? `Red flags detected: ${redFlags.slice(0, 3).join(', ')}` : undefined, details: hpi + symptomsText },
    vitals,
    medications,
    allergies,
    riskAssessment: { level: riskLevel, summary: riskSummary, factors: redFlags.map((flag, i) => ({ id: `rf-${i}`, description: flag })) },
    actionItems,
    criticalAlert,
  };
}

// ============================================================
// Knowledge Base Lookups (static, cacheable, zero LLM cost)
// ============================================================

function getDiagnosticCriteria(diagnosisName: string): string[] {
  const criteria: Record<string, string[]> = {
    'Migraine with Aura': [
      'At least 2 attacks fulfilling criteria',
      'Fully reversible aura symptoms (visual, sensory, speech)',
      'At least 3 of: gradual spread >=5 min, 2+ symptoms in succession, each lasts 5-60 min, unilateral, followed by headache within 60 min',
      'Not better accounted for by another ICHD-3 diagnosis',
    ],
    'Subarachnoid Hemorrhage': [
      'Sudden severe headache ("thunderclap")',
      '"Worst headache of life"',
      'CT head 90-95% sensitive in first 6 hours',
      'LP showing xanthochromia if CT negative',
      'May have neck stiffness, altered consciousness, focal deficits',
    ],
    'Tension-Type Headache': [
      'Bilateral, non-pulsating pain',
      'Mild to moderate intensity',
      'Not aggravated by routine physical activity',
      'No nausea/vomiting, at most one of photophobia or phonophobia',
    ],
    'Meningitis': [
      'Classic triad: fever, neck stiffness, altered mental status (present in <50%)',
      'Headache (most common symptom)',
      'Positive Kernig and Brudzinski signs',
      'CSF pleocytosis on lumbar puncture',
    ],
    'Acute Coronary Syndrome': [
      'Ischemic chest pain >20 minutes',
      'ECG changes (ST elevation/depression, T wave inversion)',
      'Elevated cardiac biomarkers (troponin)',
      'Risk stratification: HEART score or TIMI score',
    ],
    'GERD': [
      'Burning substernal chest pain',
      'Worsened by meals, lying down',
      'Relief with antacids',
      'Absence of alarm symptoms (dysphagia, weight loss, GI bleeding)',
    ],
    'Acute Gastritis': [
      'Epigastric pain or discomfort',
      'Nausea, early satiety',
      'Temporal relationship with NSAIDs, alcohol, or dietary triggers',
      'May have associated vomiting',
    ],
  };
  return criteria[diagnosisName] || [];
}

function getPEInstructions(diagnosisName: string): string[] {
  const instructions: Record<string, string[]> = {
    'Migraine with Aura': [
      'Complete neurological exam including CN II-XII',
      'Fundoscopic exam to rule out papilledema',
      'Assess for neck stiffness (meningeal signs)',
      'Check visual fields and pupil responses',
      'Palpate temporal arteries if age >50',
    ],
    'Subarachnoid Hemorrhage': [
      'Assess level of consciousness (GCS)',
      'Check for neck stiffness/rigidity',
      'Kernig and Brudzinski signs',
      'Complete neurological exam for focal deficits',
      'Fundoscopic exam for subhyaloid hemorrhage',
      'Third nerve palsy check (pupil asymmetry)',
    ],
    'Tension-Type Headache': [
      'Palpate pericranial muscles for tenderness',
      'Assess cervical range of motion',
      'Check for trigger points',
      'Brief neurological screen',
    ],
    'Meningitis': [
      'Assess for meningeal signs (neck stiffness)',
      'Kernig sign: resistance/pain with knee extension',
      'Brudzinski sign: neck flexion causes hip/knee flexion',
      'Check for petechial rash (meningococcemia)',
      'Fundoscopic exam before LP',
    ],
    'Acute Coronary Syndrome': [
      'Auscultate heart for murmurs, S3/S4, rubs',
      'Check bilateral arm blood pressures',
      'Assess for signs of heart failure (JVD, edema, crackles)',
      'Palpate chest wall to rule out MSK cause',
      'Check peripheral pulses',
    ],
    'GERD': [
      'Abdominal exam for epigastric tenderness',
      'Assess for signs of GI bleeding',
      'Cardiac exam to rule out cardiac cause',
    ],
    'Acute Gastritis': [
      'Systematic abdominal exam: inspection, auscultation, percussion, palpation',
      'Check for rebound tenderness and guarding',
      'Murphy sign if RUQ pain',
      'McBurney point if RLQ pain',
    ],
  };
  return instructions[diagnosisName] || [];
}

// ============================================================
// AI Diagnosis Generator (cost-optimized)
// ============================================================

function generateAIDiagnoses(api: any): SuggestedDiagnosis[] {
  const cc = (api.chiefComplaint || '').toLowerCase();
  const symptoms: string[] = (api.symptoms || []).map((s: string) => s.toLowerCase());
  const redFlags: string[] = api.redFlags || [];
  const allTerms = [cc, ...symptoms].join(' ');

  // Cost optimization: Try the router's local pattern matching first (zero cost)
  const router = new CostAwareAIRouter('org-default');
  const localResults = router.matchLocalPatterns(api.chiefComplaint || '', api.symptoms || []);
  if (localResults.length > 0) {
    console.log(`[COST] Differential resolved locally (0 LLM calls). Saved ~$0.01`);
    return localResults.map((r, i) => ({
      id: `dx-local-${i}`,
      name: r.name,
      icdCode: r.icdCode,
      confidence: r.probability,
      category: r.category,
      supportingEvidence: r.supportingEvidence,
      concerns: redFlags.length > 0 && r.category === 'rule-out'
        ? [`Red flags present: ${redFlags.slice(0, 2).join(', ')}`]
        : [],
      rationale: r.rationale,
      // These would come from a knowledge base lookup (also cacheable)
      diagnosticCriteria: getDiagnosticCriteria(r.name),
      physicalExamInstructions: getPEInstructions(r.name),
    }));
  }

  // Fallback: hardcoded pattern matching for demo
  console.log(`[COST] No local match, would call LLM (~$0.01). Using fallback patterns.`);

  const diagnoses: SuggestedDiagnosis[] = [];

  // Headache-related
  if (allTerms.includes('headache') || allTerms.includes('head pain')) {
    diagnoses.push({
      id: 'dx-migraine', name: 'Migraine with Aura', icdCode: 'G43.109', confidence: 0.75,
      category: 'primary',
      rationale: 'Presentation consistent with migraine: unilateral headache, visual symptoms, photophobia, and nausea reported in COMPASS assessment.',
      supportingEvidence: ['Headache reported as chief complaint', 'Associated visual changes', 'Nausea/photophobia pattern', 'Throbbing quality described'],
      concerns: redFlags.length > 0 ? [`Red flags present: ${redFlags.slice(0, 2).join(', ')}`] : [],
      diagnosticCriteria: ['At least 2 attacks fulfilling criteria', 'Fully reversible aura symptoms (visual, sensory, speech)', 'Aura spreads gradually over >=5 min', 'Each symptom lasts 5-60 min', 'Aura accompanied/followed by headache within 60 min'],
      physicalExamInstructions: ['Complete neurological exam including CN II-XII', 'Fundoscopic exam to rule out papilledema', 'Assess for neck stiffness (meningeal signs)', 'Check visual fields and pupil responses', 'Palpate temporal arteries if age >50'],
    });
    if (redFlags.some(f => f.toLowerCase().includes('worst') || f.toLowerCase().includes('sudden') || f.toLowerCase().includes('confusion'))) {
      diagnoses.push({
        id: 'dx-sah', name: 'Subarachnoid Hemorrhage', icdCode: 'I60.9', confidence: 0.30,
        category: 'rule-out',
        rationale: 'Must be ruled out given red flag presentation. "Worst headache" and acute onset with confusion warrant urgent imaging.',
        supportingEvidence: ['"Worst headache" pattern', 'Acute onset', 'Confusion reported', 'Elevated blood pressure'],
        concerns: ['Mortality high if missed', 'Requires urgent CT head', 'LP if CT negative but suspicion remains'],
        diagnosticCriteria: ['Sudden severe headache (thunderclap)', '"Worst headache of life"', 'May have neck stiffness, photophobia', 'CT head 90-95% sensitive in first 6 hours', 'LP showing xanthochromia if CT negative'],
        physicalExamInstructions: ['Assess level of consciousness (GCS)', 'Check for neck stiffness/rigidity', 'Kernig and Brudzinski signs', 'Complete neurological exam for focal deficits', 'Fundoscopic exam for subhyaloid hemorrhage', 'Third nerve palsy check (pupil asymmetry)'],
      });
    }
    diagnoses.push({
      id: 'dx-tth', name: 'Tension-Type Headache', icdCode: 'G44.209', confidence: 0.20,
      category: 'secondary',
      rationale: 'Common differential for headache presentations. Less likely given unilateral and throbbing features.',
      supportingEvidence: ['Prolonged headache duration', 'Stress may be contributing'],
      concerns: ['Aura not typical for TTH', 'Throbbing quality less consistent'],
      diagnosticCriteria: ['Bilateral, non-pulsating pain', 'Mild to moderate intensity', 'Not aggravated by routine physical activity', 'No nausea/vomiting'],
      physicalExamInstructions: ['Palpate pericranial muscles for tenderness', 'Assess cervical range of motion', 'Check for trigger points'],
    });
  }

  // Chest pain related
  if (allTerms.includes('chest') || allTerms.includes('chest pain')) {
    diagnoses.push(
      { id: 'dx-acs', name: 'Acute Coronary Syndrome', icdCode: 'I21.9', confidence: 0.60, category: 'primary',
        rationale: 'Chest pain requires cardiac evaluation. Risk factors and symptom pattern suggest ACS workup.',
        supportingEvidence: ['Chest pain as chief complaint', 'Risk factors may include age, HTN, DM', 'Associated symptoms suggest cardiac origin'],
        concerns: ['Time-sensitive diagnosis', 'ECG and troponin needed urgently'],
        diagnosticCriteria: ['Ischemic chest pain >20 minutes', 'ECG changes (ST elevation/depression, T wave inversion)', 'Elevated cardiac biomarkers (troponin)'],
        physicalExamInstructions: ['Auscultate heart for murmurs, S3/S4', 'Check bilateral arm blood pressures', 'Assess for signs of heart failure (JVD, edema, crackles)', 'Palpate chest wall to rule out MSK cause'] },
      { id: 'dx-gerd', name: 'Gastroesophageal Reflux', icdCode: 'K21.0', confidence: 0.25, category: 'secondary',
        rationale: 'Common cause of chest pain. Must be considered after cardiac causes excluded.',
        supportingEvidence: ['Chest pain/discomfort', 'Possible postprandial pattern'],
        concerns: ['Must rule out cardiac causes first'],
        diagnosticCriteria: ['Burning substernal chest pain', 'Worsened by meals, lying down', 'Relief with antacids'],
        physicalExamInstructions: ['Abdominal exam for epigastric tenderness', 'Assess for signs of GI bleeding'] },
    );
  }

  // Abdominal pain
  if (allTerms.includes('abdominal') || allTerms.includes('stomach') || allTerms.includes('belly')) {
    diagnoses.push(
      { id: 'dx-gastritis', name: 'Acute Gastritis', icdCode: 'K29.70', confidence: 0.50, category: 'primary',
        rationale: 'Abdominal pain with associated GI symptoms suggests gastritis as primary differential.',
        supportingEvidence: ['Abdominal pain reported', 'GI symptoms present'],
        concerns: ['Rule out appendicitis if RLQ', 'Consider biliary if RUQ'],
        diagnosticCriteria: ['Epigastric pain/discomfort', 'Nausea, early satiety', 'May have associated vomiting'],
        physicalExamInstructions: ['Systematic abdominal exam: inspection, auscultation, percussion, palpation', 'Check for rebound tenderness', 'Murphy sign if RUQ', 'McBurney point if RLQ', 'Assess for guarding and rigidity'] },
    );
  }

  // Fallback if no specific patterns matched
  if (diagnoses.length === 0) {
    diagnoses.push({
      id: 'dx-eval', name: 'General Evaluation', icdCode: 'Z00.00', confidence: 0.50, category: 'primary',
      rationale: 'Further assessment needed to determine differential diagnoses. COMPASS data will be reviewed with clinical findings.',
      supportingEvidence: ['Chief complaint documented', 'Patient history available'],
      concerns: ['Requires clinical correlation'],
      diagnosticCriteria: ['Clinical evaluation in progress'],
      physicalExamInstructions: ['Complete review of systems', 'Focused physical exam based on chief complaint'],
    });
  }

  return diagnoses;
}

// ============================================================
// EHR Source Badge
// ============================================================

function EhrBadge({ source }: { source: 'epic' | 'cerner' | 'ehr' }) {
  const label = source === 'epic' ? '⚡ Epic EHR' : source === 'cerner' ? '⚡ Oracle Health' : '⚡ EHR';
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
      {label}
      <span className="font-normal">data loaded</span>
    </div>
  );
}

// ============================================================
// Fetch Assessment from API
// ============================================================

async function fetchAssessment(id: string): Promise<any> {
  const res = await fetch(`/api/assessments/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load assessment (HTTP ${res.status})`);
  }
  return res.json();
}

// ============================================================
// Page Component
// ============================================================

export default function PreVisitPage() {
  const router = useRouter();
  const { id } = router.query;
  const [baseData, setBaseData] = useState<PreVisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawAssessment, setRawAssessment] = useState<any>(null);

  // Grab the FHIR patient ID from the assessment once loaded
  // Epic patient IDs are stored in the assessment's fhirPatientId field when available
  const fhirPatientId: string | null = rawAssessment?.fhirPatientId || rawAssessment?.patient?.fhirId || null;

  // EHR enrichment — runs in parallel with page load, non-blocking
  const ehr = usePatientFhirEnrichment(fhirPatientId);

  // Fetch real assessment data
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    setError(null);
    fetchAssessment(id)
      .then((data) => {
        setRawAssessment(data);
        const mapped = mapApiToPreVisitData(data);
        mapped.suggestedDiagnoses = generateAIDiagnoses(data);
        setBaseData(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PreVisit] Failed to load assessment:', err);
        setError(err.message || 'Failed to load assessment');
        setLoading(false);
      });
  }, [id]);

  // Merge EHR enrichment over assessment base data
  // EHR wins on medications, allergies, and vitals when available
  const preVisitData: PreVisitData | null = useMemo(() => {
    if (!baseData) return null;
    if (!ehr.isConnected || ehr.isLoading) return baseData;

    return {
      ...baseData,

      // EHR medications override assessment medications when available
      medications: ehr.medications
        ? ehr.medications.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            status: (['active', 'self-medicating', 'discontinued', 'prn'].includes(m.status) ? m.status : 'active') as 'active' | 'self-medicating' | 'discontinued' | 'prn',
          }))
        : baseData.medications,

      // EHR allergies override assessment allergies when available
      allergies: ehr.allergies
        ? ehr.allergies.map((a) => ({
            id: a.id,
            allergen: a.allergen,
            reaction: a.reaction,
            severity: a.severity === 'unknown' ? ('moderate' as const) : a.severity,
          }))
        : baseData.allergies,

      // EHR vitals override if all key values are present
      vitals: ehr.vitals?.bloodPressure && ehr.vitals.bloodPressure.systolic > 0
        ? {
            bloodPressure: {
              systolic: ehr.vitals.bloodPressure.systolic,
              diastolic: ehr.vitals.bloodPressure.diastolic,
              status: bpStatus(ehr.vitals.bloodPressure.systolic),
            },
            heartRate: ehr.vitals.heartRate
              ? { value: ehr.vitals.heartRate, status: hrStatus(ehr.vitals.heartRate) }
              : baseData.vitals.heartRate,
            temperature: ehr.vitals.temperature
              ? { value: ehr.vitals.temperature, unit: 'F' as const, status: tempStatus(ehr.vitals.temperature) }
              : baseData.vitals.temperature,
            respRate: ehr.vitals.respiratoryRate
              ? { value: ehr.vitals.respiratoryRate, status: respStatus(ehr.vitals.respiratoryRate) }
              : baseData.vitals.respRate,
            oxygenSat: ehr.vitals.oxygenSaturation
              ? { value: ehr.vitals.oxygenSaturation, status: o2Status(ehr.vitals.oxygenSaturation) }
              : baseData.vitals.oxygenSat,
          }
        : baseData.vitals,
    };
  }, [baseData, ehr]);

  // Navigation
  const handleNavigatePatient = async (direction: 'prev' | 'next') => {
    try {
      const res = await fetch('/api/assessments?pageSize=50');
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = (data.assessments || []).map((a: any) => a.id);
      const currentIndex = ids.indexOf(id as string);
      if (currentIndex === -1) return;
      const newIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(ids.length - 1, currentIndex + 1);
      if (newIndex !== currentIndex) router.push(`/previsit/${ids[newIndex]}`);
    } catch { /* non-critical */ }
  };

  const handleStartEncounter = () => router.push(`/visit/${id}`);

  const handleEmergencyProtocol = () => {
    if (preVisitData) {
      try {
        sessionStorage.setItem('emergencyPatient', JSON.stringify({
          id, name: `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`,
          mrn: preVisitData.patient.mrn, chiefComplaint: preVisitData.chiefComplaint.summary,
          redFlags: preVisitData.riskAssessment.factors.map((f) => f.description),
        }));
      } catch { /* sessionStorage unavailable */ }
    }
    router.push(`/visit/${id}?emergency=true`);
  };

  const handleReviewChart = () => {
    const patientId = rawAssessment?.patient?.id;
    router.push(patientId ? `/patient/${patientId}` : `/patient`);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading pre-visit summary…</p>
          <p className="text-teal-200 text-sm mt-1">Pulling assessment data from database</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !preVisitData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This assessment could not be loaded.'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Go Back</button>
            <button onClick={() => router.push('/assessments')} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">All Assessments</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* EHR source badge — only shown when connected */}
      {ehr.isConnected && ehr.source && (
        <div className="fixed bottom-4 right-4 z-50">
          <EhrBadge source={ehr.source} />
        </div>
      )}
      <PreVisitSummary
        data={preVisitData}
        onStartEncounter={handleStartEncounter}
        onOrderLabs={() => {
          const pid = rawAssessment?.patient?.id || id;
          const cc = encodeURIComponent(rawAssessment?.chiefComplaint || '');
          router.push(`/labs?patientId=${pid}&assessmentId=${id}&chiefComplaint=${cc}`);
        }}
        onOrderImaging={() => router.push(`/imaging?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onPrescribe={() => router.push(`/medications?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onRefer={() => router.push(`/referrals?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onScheduleFollowup={() => {
          const name = `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`;
          router.push(`/schedule?action=new&patientId=${rawAssessment?.patient?.id || id}&patientName=${encodeURIComponent(name)}&type=followup`);
        }}
        onEmergencyProtocol={handleEmergencyProtocol}
        onReviewChart={handleReviewChart}
        onNavigatePatient={handleNavigatePatient}
      />
    </div>
  );
}
