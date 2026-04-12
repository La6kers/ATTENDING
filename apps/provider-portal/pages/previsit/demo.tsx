// ============================================================
// Pre-Visit Demo Page
// apps/provider-portal/pages/previsit/demo.tsx
//
// Standalone demo showcasing the full clinical workflow:
// Phase 1: PreVisit Summary with AI diagnoses
// Phase 2: Active Encounter with ambient listening simulation
//
// All data is hardcoded - NO API dependencies.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import {
  Play,
  Mic,
  Activity,
  Heart,
  Thermometer,
  Wind,
  AlertTriangle,
  Brain,
  Zap,
  Timer,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Info,
} from 'lucide-react';
import type { PreVisitData, SuggestedDiagnosis } from '@/components/previsit';
import { PreVisitSummary } from '@/components/previsit';
import { ProviderShell } from '@/components/layout/ProviderShell';

// ============================================================
// Constants & Brand Colors
// ============================================================

const COLORS = {
  navy: '#0C3547',
  teal: '#1A8FA8',
  lightTeal: '#25B8A9',
  tealBg: '#E6F7F5',
  gold: '#c8a44e',
  coral: '#e07a5f',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  red500: '#ef4444',
  red600: '#dc2626',
  red50: '#fef2f2',
  red100: '#fee2e2',
  amber50: '#fffbeb',
  amber500: '#f59e0b',
  green50: '#f0fdf4',
  green500: '#22c55e',
  green600: '#16a34a',
};

// ============================================================
// Mock PreVisit Data
// ============================================================

const MOCK_PREVISIT_DATA: PreVisitData = {
  patient: {
    id: 'demo-patient-001',
    firstName: 'Sarah',
    lastName: 'Chen',
    age: 34,
    gender: 'Female',
    mrn: 'MRN-2024-0847',
    dob: '06/15/1991',
  },
  appointment: {
    time: '10:30 AM',
    type: 'COMPASS Pre-Visit Assessment',
  },
  chiefComplaint: {
    summary: 'Severe headache that started suddenly 3 days ago, worst headache of my life',
    patientQuote: 'Severe headache that started suddenly 3 days ago, worst headache of my life',
    patientEmphasis: 'Red flags detected: "Worst headache of life", Sudden onset, Elevated blood pressure',
    details:
      'Patient reports sudden onset of severe headache 3 days ago while sitting at her desk. Describes pain as 9/10, the worst headache she has ever experienced. Reports associated nausea, neck stiffness, and photophobia. No prior history of similar headaches. Has been self-medicating with ibuprofen 400mg PRN with minimal relief. Currently taking oral contraceptives daily. Denies recent trauma, fever, or vision loss. Bright lights worsen symptoms.',
  },
  vitals: {
    bloodPressure: { systolic: 142, diastolic: 88, status: 'elevated' },
    heartRate: { value: 92, status: 'normal' },
    temperature: { value: 99.1, unit: 'F', status: 'elevated' },
    respRate: { value: 18, status: 'normal' },
    oxygenSat: { value: 98, status: 'normal' },
  },
  medications: [
    { id: 'med-1', name: 'Ibuprofen 400mg', dosage: '400mg', frequency: 'As needed', status: 'prn' },
    { id: 'med-2', name: 'Oral Contraceptive', dosage: 'Standard dose', frequency: 'Daily', status: 'active' },
  ],
  allergies: [
    { id: 'allergy-1', allergen: 'Sulfa drugs', reaction: 'Rash', severity: 'moderate' },
    { id: 'allergy-2', allergen: 'Codeine', reaction: 'Nausea', severity: 'mild' },
  ],
  riskAssessment: {
    level: 'high',
    summary: 'Urgent Evaluation Required',
    factors: [
      { id: 'rf-1', description: '"Worst headache of life" - thunderclap pattern' },
      { id: 'rf-2', description: 'Sudden onset without prodrome' },
      { id: 'rf-3', description: 'Elevated blood pressure (142/88)' },
    ],
  },
  actionItems: [
    { id: 'action-1', description: 'Evaluate: "Worst headache of life" - rule out SAH', priority: 'urgent' },
    { id: 'action-2', description: 'Evaluate: Sudden onset headache', priority: 'urgent' },
    { id: 'action-3', description: 'Evaluate: Elevated blood pressure', priority: 'high' },
    { id: 'action-4', description: 'Assess meningeal signs (Kernig, Brudzinski)', priority: 'urgent' },
  ],
  criticalAlert: {
    message: '"Worst headache of life" with sudden onset - Urgent Evaluation Required',
    type: 'sah',
  },
  suggestedDiagnoses: [
    {
      id: 'dx-sah',
      name: 'Subarachnoid Hemorrhage (SAH)',
      icdCode: 'I60.9',
      confidence: 0.35,
      category: 'rule-out',
      rationale:
        'Must be ruled out given "worst headache of life" with sudden onset. Elevated BP and no prior headache history increase suspicion. Mortality high if missed.',
      supportingEvidence: [
        '"Worst headache of life" pattern',
        'Sudden onset (thunderclap)',
        'Elevated blood pressure (142/88)',
        'No prior headache history',
      ],
      concerns: [
        'Mortality 40-50% if missed',
        'Requires urgent CT head within 6 hours of onset',
        'LP required if CT negative but suspicion remains',
      ],
      diagnosticCriteria: [
        'Sudden severe headache ("thunderclap")',
        '"Worst headache of life"',
        'CT head 90-95% sensitive in first 6 hours',
        'LP showing xanthochromia if CT negative',
        'May have neck stiffness, altered consciousness, focal deficits',
      ],
      physicalExamInstructions: [
        'Assess level of consciousness (GCS)',
        'Check for neck stiffness/rigidity',
        'Kernig and Brudzinski signs',
        'Complete neurological exam for focal deficits',
        'Fundoscopic exam for subhyaloid hemorrhage',
        'Third nerve palsy check (pupil asymmetry)',
      ],
    },
    {
      id: 'dx-migraine',
      name: 'Migraine with Aura',
      icdCode: 'G43.109',
      confidence: 0.30,
      category: 'primary',
      rationale:
        'Photophobia, nausea, and severe unilateral headache are consistent with migraine. However, "worst headache of life" and sudden onset are atypical for migraine and require SAH exclusion first.',
      supportingEvidence: [
        'Photophobia reported',
        'Nausea present',
        'Severe headache (9/10)',
        'Female, age 34 (peak migraine prevalence)',
      ],
      concerns: [
        '"Worst headache of life" is atypical for migraine',
        'Must rule out SAH before treating as migraine',
      ],
      diagnosticCriteria: [
        'At least 2 attacks fulfilling criteria',
        'Fully reversible aura symptoms (visual, sensory, speech)',
        'At least 3 of: gradual spread >=5 min, 2+ symptoms in succession, each lasts 5-60 min, unilateral, followed by headache within 60 min',
        'Not better accounted for by another ICHD-3 diagnosis',
      ],
      physicalExamInstructions: [
        'Complete neurological exam including CN II-XII',
        'Fundoscopic exam to rule out papilledema',
        'Assess for neck stiffness (meningeal signs)',
        'Check visual fields and pupil responses',
      ],
    },
    {
      id: 'dx-tension',
      name: 'Tension-type Headache',
      icdCode: 'G44.209',
      confidence: 0.20,
      category: 'secondary',
      rationale:
        'Common headache type but less likely given sudden onset, severity (9/10), and associated nausea/photophobia which are atypical for TTH.',
      supportingEvidence: ['Prolonged headache duration (3 days)', 'Stress may be contributing'],
      concerns: ['Severity and associated symptoms inconsistent with TTH', 'Sudden onset atypical'],
      diagnosticCriteria: [
        'Bilateral, non-pulsating pain',
        'Mild to moderate intensity',
        'Not aggravated by routine physical activity',
        'No nausea/vomiting, at most one of photophobia or phonophobia',
      ],
      physicalExamInstructions: [
        'Palpate pericranial muscles for tenderness',
        'Assess cervical range of motion',
        'Check for trigger points',
        'Brief neurological screen',
      ],
    },
    {
      id: 'dx-htn',
      name: 'Hypertensive Headache',
      icdCode: 'I10',
      confidence: 0.10,
      category: 'secondary',
      rationale: 'Elevated BP (142/88) noted. However, BP is not severely elevated and headache preceded the BP reading.',
      supportingEvidence: ['Elevated blood pressure (142/88)', 'Headache may raise BP reactively'],
      concerns: ['BP not in hypertensive emergency range (>180/120)', 'More likely reactive than causative'],
      diagnosticCriteria: [
        'Headache attributed to hypertensive crisis (BP typically >180/120)',
        'Resolves with BP normalization',
        'No other cause identified',
      ],
      physicalExamInstructions: [
        'Repeat BP in both arms',
        'Fundoscopic exam for hypertensive retinopathy',
        'Check for signs of end-organ damage',
      ],
    },
    {
      id: 'dx-meningitis',
      name: 'Meningitis',
      icdCode: 'G03.9',
      confidence: 0.05,
      category: 'rule-out',
      rationale:
        'Low-grade fever (99.1F) with headache and neck stiffness warrants consideration. Kernig/Brudzinski testing needed.',
      supportingEvidence: ['Headache with neck stiffness', 'Low-grade fever (99.1F)', 'Photophobia'],
      concerns: ['Classic triad present in <50% of cases', 'LP may be needed to exclude'],
      diagnosticCriteria: [
        'Classic triad: fever, neck stiffness, altered mental status (present in <50%)',
        'Headache (most common symptom)',
        'Positive Kernig and Brudzinski signs',
        'CSF pleocytosis on lumbar puncture',
      ],
      physicalExamInstructions: [
        'Assess for meningeal signs (neck stiffness)',
        'Kernig sign: resistance/pain with knee extension',
        'Brudzinski sign: neck flexion causes hip/knee flexion',
        'Check for petechial rash (meningococcemia)',
        'Fundoscopic exam before LP',
      ],
    },
  ],
};

// ============================================================
// Transcript Lines for Ambient Simulation
// ============================================================

interface TranscriptLine {
  speaker: 'Doctor' | 'Patient';
  text: string;
  /** After this line renders, apply these diagnosis probability overrides */
  diagnosisUpdates?: { id: string; probability: number }[];
  /** Terms that triggered the update (shown as badges) */
  matchTerms?: string[];
}

const TRANSCRIPT_LINES: TranscriptLine[] = [
  {
    speaker: 'Doctor',
    text: 'Sarah, tell me about this headache.',
  },
  {
    speaker: 'Patient',
    text: 'It started three days ago, very sudden. I was just sitting at my desk.',
  },
  {
    speaker: 'Doctor',
    text: 'How would you rate the pain?',
  },
  {
    speaker: 'Patient',
    text: "It's the worst headache I've ever had. Maybe 9 out of 10.",
    diagnosisUpdates: [
      { id: 'dx-sah', probability: 0.50 },
      { id: 'dx-migraine', probability: 0.25 },
      { id: 'dx-tension', probability: 0.10 },
      { id: 'dx-htn', probability: 0.10 },
      { id: 'dx-meningitis', probability: 0.05 },
    ],
    matchTerms: ['worst headache', '9 out of 10'],
  },
  {
    speaker: 'Doctor',
    text: 'Any nausea, vomiting, or neck stiffness?',
  },
  {
    speaker: 'Patient',
    text: "Yes, I've had some nausea and my neck feels stiff.",
    diagnosisUpdates: [
      { id: 'dx-sah', probability: 0.65 },
      { id: 'dx-migraine', probability: 0.20 },
      { id: 'dx-tension', probability: 0.05 },
      { id: 'dx-htn', probability: 0.05 },
      { id: 'dx-meningitis', probability: 0.15 },
    ],
    matchTerms: ['nausea', 'neck stiffness'],
  },
  {
    speaker: 'Doctor',
    text: 'Any vision changes or light sensitivity?',
  },
  {
    speaker: 'Patient',
    text: "Bright lights make it worse. I've been staying in dark rooms.",
    diagnosisUpdates: [
      { id: 'dx-sah', probability: 0.60 },
      { id: 'dx-migraine', probability: 0.25 },
      { id: 'dx-tension', probability: 0.03 },
      { id: 'dx-htn', probability: 0.04 },
      { id: 'dx-meningitis', probability: 0.20 },
    ],
    matchTerms: ['photophobia'],
  },
  {
    speaker: 'Doctor',
    text: 'Any recent trauma or similar episodes?',
  },
  {
    speaker: 'Patient',
    text: 'No, nothing like this before. It came out of nowhere.',
  },
  {
    speaker: 'Doctor',
    text: "I'm going to check your pupils and reflexes.",
  },
  {
    speaker: 'Doctor',
    text: 'Neck stiffness confirmed on exam. Kernig sign positive.',
    diagnosisUpdates: [
      { id: 'dx-sah', probability: 0.75 },
      { id: 'dx-migraine', probability: 0.10 },
      { id: 'dx-tension', probability: 0.02 },
      { id: 'dx-htn', probability: 0.03 },
      { id: 'dx-meningitis', probability: 0.25 },
    ],
    matchTerms: ['neck stiffness confirmed', 'Kernig sign positive'],
  },
];

// ============================================================
// Batch Interval Options
// ============================================================

interface BatchOption {
  label: string;
  minutes: number;
}

const BATCH_OPTIONS: BatchOption[] = [
  { label: '2.5 min', minutes: 2.5 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
];

// ============================================================
// Ambient Diagnosis Card (Phase 2)
// ============================================================

interface AmbientDiagnosis {
  id: string;
  name: string;
  icdCode: string;
  probability: number;
  category: 'primary' | 'secondary' | 'rule-out';
  matchTerms: string[];
}

const AmbientDiagnosisCard: React.FC<{ dx: AmbientDiagnosis; isHighest: boolean }> = ({ dx, isHighest }) => {
  const pct = Math.round(dx.probability * 100);
  const isRuleOutHigh = dx.category === 'rule-out' && pct > 50;

  const barColor = isRuleOutHigh
    ? COLORS.red500
    : dx.category === 'primary'
      ? COLORS.teal
      : pct < 10
        ? COLORS.gray300
        : COLORS.gold;

  const categoryLabel = dx.category === 'rule-out' ? 'RULE OUT' : dx.category === 'primary' ? 'PRIMARY' : 'SECONDARY';
  const categoryBg =
    dx.category === 'rule-out' ? COLORS.red100 : dx.category === 'primary' ? COLORS.tealBg : COLORS.gray100;
  const categoryColor =
    dx.category === 'rule-out' ? COLORS.red600 : dx.category === 'primary' ? COLORS.teal : COLORS.gray600;

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${isHighest ? barColor : COLORS.gray200}`,
        borderRadius: 12,
        padding: 16,
        transition: 'all 0.5s ease',
        boxShadow: isHighest ? `0 0 0 2px ${barColor}22` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.gray900 }}>{dx.name}</span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              background: COLORS.gray100,
              color: COLORS.gray600,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {dx.icdCode}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: categoryBg,
              color: categoryColor,
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            {categoryLabel}
          </span>
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: 22,
            color: barColor,
            transition: 'color 0.5s ease',
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Confidence bar */}
      <div
        style={{
          width: '100%',
          height: 8,
          background: COLORS.gray100,
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: barColor,
            borderRadius: 4,
            transition: 'width 0.8s ease, background 0.5s ease',
          }}
        />
      </div>

      {/* Ambient match badges */}
      {dx.matchTerms.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {dx.matchTerms.map((term, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: '#dbeafe',
                color: '#1e40af',
                fontWeight: 500,
              }}
            >
              <Sparkles style={{ width: 10, height: 10, display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Demo Page Component
// ============================================================

export default function PreVisitDemoPage() {
  const [phase, setPhase] = useState<'previsit' | 'encounter'>('previsit');
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [batchInterval, setBatchInterval] = useState(1); // index into BATCH_OPTIONS, default 5 min
  const [showBatchResults, setShowBatchResults] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current diagnosis probabilities (updated by transcript)
  const [diagnoses, setDiagnoses] = useState<AmbientDiagnosis[]>([
    { id: 'dx-sah', name: 'Subarachnoid Hemorrhage (SAH)', icdCode: 'I60.9', probability: 0.35, category: 'rule-out', matchTerms: [] },
    { id: 'dx-migraine', name: 'Migraine with Aura', icdCode: 'G43.109', probability: 0.30, category: 'primary', matchTerms: [] },
    { id: 'dx-tension', name: 'Tension-type Headache', icdCode: 'G44.209', probability: 0.20, category: 'secondary', matchTerms: [] },
    { id: 'dx-htn', name: 'Hypertensive Headache', icdCode: 'I10', probability: 0.10, category: 'secondary', matchTerms: [] },
    { id: 'dx-meningitis', name: 'Meningitis', icdCode: 'G03.9', probability: 0.05, category: 'rule-out', matchTerms: [] },
  ]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptIndex]);

  // Advance transcript lines when listening
  useEffect(() => {
    if (!isListening || transcriptIndex >= TRANSCRIPT_LINES.length) {
      if (transcriptIndex >= TRANSCRIPT_LINES.length && isListening) {
        setIsListening(false);
        setShowBatchResults(true);
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      const line = TRANSCRIPT_LINES[transcriptIndex];

      // Apply diagnosis updates if present
      if (line.diagnosisUpdates) {
        setDiagnoses((prev) =>
          prev.map((dx) => {
            const update = line.diagnosisUpdates!.find((u) => u.id === dx.id);
            if (update) {
              const newTerms = line.matchTerms || [];
              return {
                ...dx,
                probability: update.probability,
                matchTerms: [...new Set([...dx.matchTerms, ...newTerms])],
              };
            }
            return dx;
          }),
        );
      }

      setTranscriptIndex((prev) => prev + 1);
    }, 3500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isListening, transcriptIndex]);

  const handleStartEncounter = useCallback(() => {
    setPhase('encounter');
    // Auto-start listening after a brief delay
    setTimeout(() => setIsListening(true), 1500);
  }, []);

  const handleBackToPrevisit = useCallback(() => {
    setPhase('previsit');
    setTranscriptIndex(0);
    setIsListening(false);
    setShowBatchResults(false);
    setDiagnoses([
      { id: 'dx-sah', name: 'Subarachnoid Hemorrhage (SAH)', icdCode: 'I60.9', probability: 0.35, category: 'rule-out', matchTerms: [] },
      { id: 'dx-migraine', name: 'Migraine with Aura', icdCode: 'G43.109', probability: 0.30, category: 'primary', matchTerms: [] },
      { id: 'dx-tension', name: 'Tension-type Headache', icdCode: 'G44.209', probability: 0.20, category: 'secondary', matchTerms: [] },
      { id: 'dx-htn', name: 'Hypertensive Headache', icdCode: 'I10', probability: 0.10, category: 'secondary', matchTerms: [] },
      { id: 'dx-meningitis', name: 'Meningitis', icdCode: 'G03.9', probability: 0.05, category: 'rule-out', matchTerms: [] },
    ]);
  }, []);

  // Sort diagnoses by probability (highest first)
  const sortedDiagnoses = [...diagnoses].sort((a, b) => b.probability - a.probability);
  const visibleTranscript = TRANSCRIPT_LINES.slice(0, transcriptIndex);

  // ============================================================
  // PHASE 1: PreVisit Summary
  // ============================================================
  if (phase === 'previsit') {
    return (
      <>
        <Head>
          <title>Demo: Pre-Visit Summary | ATTENDING AI</title>
        </Head>

        {/* Demo banner */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.coral} 100%)`,
            color: COLORS.white,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <Info style={{ width: 18, height: 18 }} />
          DEMO: This shows the previsit summary with AI diagnoses. Click "Start Encounter" at the bottom to see the
          ambient listening workflow.
        </div>

        {/* Spacer for fixed banner */}
        <div style={{ height: 42 }} />

        <PreVisitSummary
          data={MOCK_PREVISIT_DATA}
          onStartEncounter={handleStartEncounter}
          onOrderLabs={() => alert('Demo: Order Labs clicked')}
          onOrderImaging={() => alert('Demo: Order Imaging clicked')}
          onPrescribe={() => alert('Demo: E-Prescribe clicked')}
          onRefer={() => alert('Demo: Refer Specialist clicked')}
          onScheduleFollowup={() => alert('Demo: Schedule Follow-up clicked')}
          onEmergencyProtocol={() => alert('Demo: Emergency Protocol activated')}
          onReviewChart={() => alert('Demo: Review Chart clicked')}
          onNavigatePatient={() => alert('Demo: Navigate Patient clicked')}
        />
      </>
    );
  }

  // ============================================================
  // PHASE 2: Active Encounter with Ambient Listening
  // ============================================================
  return (
    <>
      <Head>
        <title>Demo: Active Encounter | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Active Encounter (Demo)" currentPage="">
        {/* Demo banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.coral} 100%)`,
            color: COLORS.white,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Info style={{ width: 18, height: 18 }} />
          DEMO: Ambient listening simulation - transcript auto-populates. Watch the diagnoses update in real time.
        </div>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px', paddingBottom: 80 }}>
          {/* Back button + Compact Patient Header */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={handleBackToPrevisit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: COLORS.teal,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                padding: '4px 0',
                marginBottom: 12,
              }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back to Pre-Visit Summary
            </button>

            <div
              style={{
                background: COLORS.white,
                borderRadius: 16,
                padding: '16px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.navy})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.white,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  SC
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.gray900 }}>Sarah Chen</div>
                  <div style={{ fontSize: 13, color: COLORS.gray500 }}>
                    34F &bull; MRN: MRN-2024-0847 &bull; Severe headache - worst of life
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <VitalPill label="BP" value="142/88" status="elevated" />
                <VitalPill label="HR" value="92" status="normal" />
                <VitalPill label="Temp" value="99.1F" status="elevated" />
                <VitalPill label="RR" value="18" status="normal" />
                <VitalPill label="SpO2" value="98%" status="normal" />
              </div>
            </div>
          </div>

          {/* Main 2-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
            {/* Left: Ambient Listening Panel */}
            <div
              style={{
                background: COLORS.white,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.teal} 100%)`,
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Brain style={{ width: 24, height: 24, color: COLORS.white }} />
                  <div>
                    <div style={{ color: COLORS.white, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Ambient Clinical Intelligence
                      {isListening && (
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: COLORS.lightTeal,
                            display: 'inline-block',
                            animation: 'ambientPulse 1.5s ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                      {isListening
                        ? 'Listening and analyzing conversation...'
                        : showBatchResults
                          ? 'Encounter analysis complete'
                          : 'Ready to begin listening'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isListening && (
                    <Mic style={{ width: 20, height: 20, color: COLORS.lightTeal, animation: 'ambientPulse 1.5s ease-in-out infinite' }} />
                  )}
                </div>
              </div>

              {/* Batch interval selector */}
              <div
                style={{
                  padding: '12px 24px',
                  borderBottom: `1px solid ${COLORS.gray200}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: COLORS.gray50,
                }}
              >
                <Timer style={{ width: 16, height: 16, color: COLORS.gray500 }} />
                <span style={{ fontSize: 13, color: COLORS.gray600, fontWeight: 500 }}>Batch Interval:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {BATCH_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.label}
                      onClick={() => setBatchInterval(i)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 8,
                        border: `1px solid ${i === batchInterval ? COLORS.teal : COLORS.gray200}`,
                        background: i === batchInterval ? COLORS.tealBg : COLORS.white,
                        color: i === batchInterval ? COLORS.teal : COLORS.gray600,
                        fontSize: 12,
                        fontWeight: i === batchInterval ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transcript area */}
              <div
                style={{
                  padding: 24,
                  minHeight: 400,
                  maxHeight: 500,
                  overflowY: 'auto',
                  background: COLORS.white,
                }}
              >
                {visibleTranscript.length === 0 && !isListening && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 300,
                      color: COLORS.gray500,
                      textAlign: 'center',
                    }}
                  >
                    <Mic style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.3 }} />
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Waiting to begin...</div>
                    <div style={{ fontSize: 13 }}>Ambient listening will start automatically</div>
                  </div>
                )}

                {visibleTranscript.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginBottom: 16,
                      animation: 'fadeSlideIn 0.4s ease-out',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: COLORS.white,
                        background:
                          line.speaker === 'Doctor'
                            ? `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.teal})`
                            : `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.gold})`,
                      }}
                    >
                      {line.speaker === 'Doctor' ? 'Dr' : 'Pt'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: line.speaker === 'Doctor' ? COLORS.teal : COLORS.coral,
                          marginBottom: 2,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {line.speaker === 'Doctor' ? 'Dr. Reed' : 'Patient (Sarah Chen)'}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: COLORS.gray800,
                          lineHeight: 1.5,
                          background: line.speaker === 'Doctor' ? COLORS.tealBg : COLORS.gray50,
                          padding: '8px 12px',
                          borderRadius: 10,
                          borderTopLeftRadius: 2,
                        }}
                      >
                        {line.text}
                      </div>
                      {line.matchTerms && line.matchTerms.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          <Zap style={{ width: 12, height: 12, color: COLORS.gold, marginTop: 2 }} />
                          {line.matchTerms.map((term, j) => (
                            <span
                              key={j}
                              style={{
                                fontSize: 10,
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '1px 6px',
                                borderRadius: 8,
                                fontWeight: 600,
                              }}
                            >
                              {term}
                            </span>
                          ))}
                          <span style={{ fontSize: 10, color: COLORS.gray500, fontStyle: 'italic', marginLeft: 4 }}>
                            diagnosis updated
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Listening indicator */}
                {isListening && transcriptIndex < TRANSCRIPT_LINES.length && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: 0.5, marginTop: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: COLORS.gray200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: COLORS.teal,
                          animation: 'ambientPulse 1.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 13, color: COLORS.gray500, fontStyle: 'italic' }}>Listening...</span>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>

              {/* Batch Results Summary (after transcript completes) */}
              {showBatchResults && (
                <div
                  style={{
                    margin: '0 24px 24px',
                    background: `linear-gradient(135deg, ${COLORS.navy}08, ${COLORS.teal}12)`,
                    border: `2px solid ${COLORS.teal}`,
                    borderRadius: 16,
                    padding: 24,
                    animation: 'fadeSlideIn 0.5s ease-out',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.lightTeal})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle style={{ width: 22, height: 22, color: COLORS.white }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.navy }}>Batch Analysis Results</div>
                      <div style={{ fontSize: 12, color: COLORS.gray500 }}>
                        Encounter analysis complete &bull; {TRANSCRIPT_LINES.length} exchanges analyzed
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: COLORS.red50,
                      border: `1px solid ${COLORS.red100}`,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AlertTriangle style={{ width: 18, height: 18, color: COLORS.red500 }} />
                      <span style={{ fontWeight: 700, color: COLORS.red600, fontSize: 14 }}>
                        SAH probability increased to 75%
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.gray700, lineHeight: 1.6 }}>
                      Based on: <strong>thunderclap onset</strong>, <strong>worst headache of life</strong>,{' '}
                      <strong>neck stiffness</strong>, <strong>Kernig sign positive</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      background: COLORS.amber50,
                      border: `1px solid #fde68a`,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 6 }}>
                      Recommended Next Steps
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: COLORS.gray700, lineHeight: 1.8 }}>
                      <li>
                        <strong>Stat CT Head</strong> (non-contrast) - 90-95% sensitivity within 6 hours of onset
                      </li>
                      <li>
                        If CT negative: <strong>Lumbar Puncture</strong> to assess for xanthochromia
                      </li>
                      <li>
                        <strong>CT Angiography</strong> if SAH confirmed
                      </li>
                      <li>Neurosurgery consultation on standby</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => alert('Demo: Proceeding to Treatment Plan')}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.navy})`,
                      color: COLORS.white,
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    Proceed to Treatment Plan
                    <ChevronRight style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              )}

              {/* Cost indicator */}
              <div
                style={{
                  padding: '10px 24px',
                  borderTop: `1px solid ${COLORS.gray200}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: COLORS.gray50,
                  fontSize: 12,
                  color: COLORS.gray500,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap style={{ width: 14, height: 14, color: COLORS.green500 }} />
                  <span>
                    Cost: <strong style={{ color: COLORS.green600 }}>$0.00</strong> (local pattern matching)
                  </span>
                </div>
                <span>Simulated encounter &bull; No microphone access needed</span>
              </div>
            </div>

            {/* Right: Real-time Diagnosis Cards */}
            <div style={{ position: 'sticky', top: 100 }}>
              <div
                style={{
                  background: COLORS.white,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.teal} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Activity style={{ width: 20, height: 20, color: COLORS.white }} />
                  <div>
                    <div style={{ color: COLORS.white, fontWeight: 700, fontSize: 14 }}>Live Differential</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                      Updated by ambient analysis
                    </div>
                  </div>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedDiagnoses.map((dx, i) => (
                    <AmbientDiagnosisCard key={dx.id} dx={dx} isHighest={i === 0} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS animations */}
        <style jsx global>{`
          @keyframes ambientPulse {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.4;
              transform: scale(1.2);
            }
          }
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </ProviderShell>
    </>
  );
}

// ============================================================
// Vital Pill (compact vital display for Phase 2 header)
// ============================================================

function VitalPill({ label, value, status }: { label: string; value: string; status: 'normal' | 'elevated' | 'critical' }) {
  const bg = status === 'normal' ? COLORS.green50 : status === 'elevated' ? COLORS.amber50 : COLORS.red50;
  const color = status === 'normal' ? COLORS.green600 : status === 'elevated' ? '#d97706' : COLORS.red600;
  const borderColor = status === 'normal' ? '#bbf7d0' : status === 'elevated' ? '#fde68a' : '#fecaca';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        background: bg,
        border: `1px solid ${borderColor}`,
        fontSize: 12,
        fontWeight: 600,
        color,
      }}
    >
      <span style={{ color: COLORS.gray500, fontWeight: 500 }}>{label}:</span>
      {value}
    </div>
  );
}
