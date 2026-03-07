// =============================================================================
// ATTENDING AI - Visit/Diagnosis Selection Page
// apps/provider-portal/pages/visit/[id]/index.tsx
//
// Provider selects/deselects differential diagnoses with guidelines modal.
// Ambient listening integration: compares spoken terms against COMPASS data
// and updates diagnosis probabilities in real time.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  FileText,
  X,
  AlertCircle,
  Stethoscope,
  Activity,
  Heart,
  Pill,
  Mic,
  Pause,
  Square,
  Play,
  Timer,
} from 'lucide-react';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { CostAwareAIRouter } from '@attending/shared/services/CostAwareAIRouter';

// =============================================================================
// Types
// =============================================================================

interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  probability: number;
  category: 'primary' | 'secondary' | 'rule-out';
  supportingEvidence: string[];
  concerns: string[];
  selected: boolean;
  ambientMatches?: string[]; // terms matched from ambient listening
  guidelines?: {
    overview: string;
    diagnosticCriteria: string[];
    redFlags: string[];
    workup: string[];
    treatmentOptions: string[];
    references: string[];
  };
}

interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  hpiSummary: string;
  vitals: { bp: string; hr: number; temp: number; rr: number; spo2: number };
  allergies: string[];
  medications: string[];
  redFlags: string[];
}

// =============================================================================
// Ambient Listening Types & Logic
// =============================================================================

type AmbientState = 'off' | 'listening' | 'paused';

interface BatchIntervalOption {
  label: string;
  ms: number;
  costNote: string;
  description: string;
}

const BATCH_INTERVALS: BatchIntervalOption[] = [
  { label: '2.5 min', ms: 150_000,  costNote: '~$0.12/hr', description: 'High frequency — best for complex or unfamiliar cases' },
  { label: '5 min',   ms: 300_000,  costNote: '~$0.06/hr', description: 'Balanced — good default for most encounters' },
  { label: '10 min',  ms: 600_000,  costNote: '~$0.03/hr', description: 'Low frequency — routine follow-ups and simple cases' },
  { label: '15 min',  ms: 900_000,  costNote: '~$0.02/hr', description: 'Minimal — mostly local processing, occasional LLM check' },
];

const BATCH_INTERVAL_STORAGE_KEY = 'attending-ambient-batch-interval';

interface AmbientMatch {
  term: string;
  diagnosisId: string;
  delta: number; // probability adjustment
  timestamp: number;
}

// Terms that map to diagnoses - in production this would be an AI model
const DIAGNOSIS_TERM_MAP: Record<string, { diagnosisId: string; delta: number }[]> = {
  'worst headache': [{ diagnosisId: 'dx-2', delta: 0.15 }],
  'thunderclap': [{ diagnosisId: 'dx-2', delta: 0.20 }],
  'sudden onset': [{ diagnosisId: 'dx-2', delta: 0.10 }],
  'stiff neck': [{ diagnosisId: 'dx-2', delta: 0.10 }, { diagnosisId: 'dx-4', delta: 0.15 }],
  'neck stiffness': [{ diagnosisId: 'dx-2', delta: 0.10 }, { diagnosisId: 'dx-4', delta: 0.15 }],
  'confusion': [{ diagnosisId: 'dx-2', delta: 0.10 }, { diagnosisId: 'dx-4', delta: 0.10 }],
  'fever': [{ diagnosisId: 'dx-4', delta: 0.20 }, { diagnosisId: 'dx-1', delta: -0.05 }],
  'photophobia': [{ diagnosisId: 'dx-1', delta: 0.05 }, { diagnosisId: 'dx-4', delta: 0.05 }],
  'aura': [{ diagnosisId: 'dx-1', delta: 0.10 }],
  'visual changes': [{ diagnosisId: 'dx-1', delta: 0.08 }],
  'throbbing': [{ diagnosisId: 'dx-1', delta: 0.05 }],
  'nausea': [{ diagnosisId: 'dx-1', delta: 0.05 }],
  'vomiting': [{ diagnosisId: 'dx-1', delta: 0.03 }, { diagnosisId: 'dx-2', delta: 0.05 }],
  'bilateral': [{ diagnosisId: 'dx-3', delta: 0.10 }, { diagnosisId: 'dx-1', delta: -0.05 }],
  'band-like': [{ diagnosisId: 'dx-3', delta: 0.15 }],
  'stress': [{ diagnosisId: 'dx-3', delta: 0.08 }],
  'rash': [{ diagnosisId: 'dx-4', delta: 0.15 }],
  'seizure': [{ diagnosisId: 'dx-2', delta: 0.10 }, { diagnosisId: 'dx-4', delta: 0.10 }],
  'loss of consciousness': [{ diagnosisId: 'dx-2', delta: 0.15 }],
  'papilledema': [{ diagnosisId: 'dx-2', delta: 0.10 }],
};

// COMPASS terms to watch for - these come from the patient's self-reported assessment
const COMPASS_WATCH_TERMS = [
  'worst headache', 'sudden onset', 'confusion', 'fever', 'stiff neck',
  'vision changes', 'nausea', 'vomiting', 'photophobia', 'seizure',
];

// =============================================================================
// Mock Data
// =============================================================================

const getMockPatientContext = (id: string): PatientContext => ({
  id,
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  mrn: '78932145',
  chiefComplaint: 'Severe headache for 3 days',
  hpiSummary: '32yo female with 3-day history of severe right-sided throbbing headache (9/10), associated with visual aura (zigzag lines), photophobia, phonophobia, nausea/vomiting, and episodes of confusion. Patient describes as "worst headache of my life" - different from usual migraines.',
  vitals: { bp: '138/88', hr: 96, temp: 98.6, rr: 18, spo2: 99 },
  allergies: ['Penicillin', 'Sulfa drugs', 'Codeine'],
  medications: ['Oral Contraceptive', 'Ibuprofen 400mg PRN'],
  redFlags: ['Worst headache of life', 'Confusion reported', 'Elevated BP', 'Different from usual pattern'],
});

const getMockDifferentialDiagnoses = (): Diagnosis[] => [
  {
    id: 'dx-1', name: 'Migraine with Aura', icdCode: 'G43.109', probability: 0.85,
    category: 'primary', supportingEvidence: ['Unilateral headache location', 'Visual aura (zigzag lines)', 'Photophobia and phonophobia', 'Nausea/vomiting', 'Throbbing quality', 'Family history of migraines'],
    concerns: ['Described as "worst headache of life" - atypical for routine migraine'], selected: true,
    guidelines: {
      overview: 'Migraine with aura is a primary headache disorder characterized by recurrent attacks of moderate to severe headache with associated neurological symptoms (aura) that typically precede the headache phase.',
      diagnosticCriteria: ['At least 2 attacks fulfilling criteria', 'One or more fully reversible aura symptoms (visual, sensory, speech)', 'At least 3 of: aura spreads gradually over >=5 min, 2+ symptoms in succession, each symptom lasts 5-60 min, at least one symptom unilateral, aura accompanied/followed by headache within 60 min', 'Not better accounted for by another ICHD-3 diagnosis'],
      redFlags: ['Thunderclap onset (peak within seconds)', '"Worst headache of life"', 'Fever with headache', 'New neurological deficits', 'Altered consciousness', 'Papilledema', 'Age >50 with new headache'],
      workup: ['Complete neurological examination', 'Consider CT head if red flags present', 'MRI brain if atypical features', 'Lumbar puncture if SAH suspected but CT negative'],
      treatmentOptions: ['Triptans (sumatriptan, rizatriptan) - first-line for acute treatment', 'NSAIDs (ibuprofen, naproxen)', 'Antiemetics (metoclopramide, ondansetron)', 'Preventive therapy if >=4 headache days/month'],
      references: ['ICHD-3 Diagnostic Criteria for Migraine with Aura', 'AAN Practice Guidelines: Migraine Treatment (2021)', 'American Headache Society Position Statement'],
    },
  },
  {
    id: 'dx-2', name: 'Subarachnoid Hemorrhage', icdCode: 'I60.9', probability: 0.30,
    category: 'rule-out', supportingEvidence: ['"Worst headache of life"', 'Sudden onset severe headache', 'Confusion reported', 'Elevated blood pressure'],
    concerns: ['Must rule out before treating as migraine', 'Mortality high if missed', 'Requires urgent imaging'], selected: false,
    guidelines: {
      overview: 'Subarachnoid hemorrhage (SAH) is bleeding into the subarachnoid space, most commonly from ruptured cerebral aneurysm. It presents as sudden-onset severe headache and is a neurological emergency.',
      diagnosticCriteria: ['Sudden severe headache ("thunderclap")', '"Worst headache of life"', 'May have neck stiffness, photophobia', 'Altered consciousness or focal deficits possible', 'Positive CT head (90-95% sensitivity in first 6 hours)', 'LP showing xanthochromia if CT negative'],
      redFlags: ['Thunderclap headache onset', 'Loss of consciousness', 'Neck stiffness', 'Focal neurological deficits', 'Seizure', 'Third nerve palsy'],
      workup: ['STAT non-contrast CT head', 'Lumbar puncture if CT negative but clinical suspicion high', 'CT angiography if SAH confirmed', 'Neurosurgery consultation'],
      treatmentOptions: ['Immediate neurosurgical consultation', 'Blood pressure management', 'Nimodipine for vasospasm prevention', 'ICU admission', 'Surgical or endovascular treatment of aneurysm'],
      references: ['AHA/ASA Guidelines for Management of Aneurysmal SAH (2023)', 'Ottawa SAH Rule for CT Decision-Making', 'Neurocritical Care Society Guidelines'],
    },
  },
  {
    id: 'dx-3', name: 'Tension-Type Headache', icdCode: 'G44.209', probability: 0.15,
    category: 'secondary', supportingEvidence: ['Prolonged duration', 'Stress may be contributing'],
    concerns: ['Less consistent with unilateral, throbbing presentation', 'Aura not typical for TTH'], selected: false,
    guidelines: {
      overview: 'Tension-type headache (TTH) is the most common primary headache disorder, characterized by bilateral, non-pulsating pain of mild to moderate intensity.',
      diagnosticCriteria: ['At least 10 episodes occurring <1 day/month on average', 'Headache lasting 30 minutes to 7 days', 'At least 2 of: bilateral location, non-pulsating quality, mild-moderate intensity, not aggravated by routine physical activity', 'Both: no nausea or vomiting, no more than one of photophobia or phonophobia'],
      redFlags: ['Features suggesting secondary cause', 'New headache pattern after age 50', 'Progressive headache over weeks'],
      workup: ['Usually clinical diagnosis', 'Neuroimaging if atypical features', 'Consider underlying triggers (stress, sleep, posture)'],
      treatmentOptions: ['Simple analgesics (acetaminophen, NSAIDs)', 'Lifestyle modifications', 'Stress management', 'Preventive: amitriptyline if frequent'],
      references: ['ICHD-3 Diagnostic Criteria', 'AAN Practice Guidelines'],
    },
  },
  {
    id: 'dx-4', name: 'Meningitis/Encephalitis', icdCode: 'G03.9', probability: 0.10,
    category: 'rule-out', supportingEvidence: ['Severe headache', 'Confusion reported', 'Photophobia present'],
    concerns: ['No fever documented', 'No neck stiffness mentioned', 'Requires assessment of meningeal signs'], selected: false,
    guidelines: {
      overview: 'Meningitis is inflammation of the meninges, which can be bacterial, viral, or other etiology. Encephalitis involves brain parenchyma. Both are medical emergencies.',
      diagnosticCriteria: ['Classic triad: fever, neck stiffness, altered mental status (present in <50%)', 'Headache (most common symptom)', 'Positive Kernig and Brudzinski signs', 'CSF pleocytosis on lumbar puncture'],
      redFlags: ['Rapid deterioration', 'Petechial rash (meningococcemia)', 'Seizures', 'Focal neurological deficits', 'Papilledema'],
      workup: ['Blood cultures before antibiotics', 'Lumbar puncture (unless contraindicated)', 'CT head before LP if altered consciousness or focal deficits', 'CSF analysis: cell count, protein, glucose, Gram stain, culture'],
      treatmentOptions: ['Empiric antibiotics immediately if bacterial suspected', 'Ceftriaxone + vancomycin + ampicillin (if >50yo)', 'Dexamethasone before or with first antibiotic dose', 'Acyclovir if HSV encephalitis suspected'],
      references: ['IDSA Guidelines for Bacterial Meningitis', 'AAN Practice Parameters'],
    },
  },
];

// =============================================================================
// Guidelines Modal Component
// =============================================================================

interface GuidelinesModalProps {
  diagnosis: Diagnosis;
  onClose: () => void;
}

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ diagnosis, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'criteria' | 'workup' | 'treatment'>('overview');
  if (!diagnosis.guidelines) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b" style={{ background: theme.gradient }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><BookOpen className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">{diagnosis.name}</h2>
                <p className="text-teal-200 text-sm">Clinical Guidelines - ICD-10: {diagnosis.icdCode}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex border-b bg-gray-50">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'criteria', label: 'Diagnostic Criteria' },
            { id: 'workup', label: 'Workup' },
            { id: 'treatment', label: 'Treatment' },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-teal-700 border-b-2 border-teal-700 bg-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-4 bg-teal-50 rounded-xl"><p className="text-gray-700 leading-relaxed">{diagnosis.guidelines.overview}</p></div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Red Flags to Watch For</h4>
                <ul className="space-y-2">{diagnosis.guidelines.redFlags.map((flag, i) => (
                  <li key={i} className="text-red-700 text-sm flex items-start gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />{flag}</li>
                ))}</ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">References</h4>
                <ul className="space-y-1">{diagnosis.guidelines.references.map((ref, i) => (
                  <li key={i} className="text-gray-600 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-teal-500" />{ref}</li>
                ))}</ul>
              </div>
            </div>
          )}
          {activeTab === 'criteria' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Diagnostic Criteria</h4>
              <div className="space-y-3">{diagnosis.guidelines.diagnosticCriteria.map((criterion, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">{i + 1}</span>
                  <p className="text-gray-700">{criterion}</p>
                </div>
              ))}</div>
            </div>
          )}
          {activeTab === 'workup' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Recommended Workup</h4>
              <div className="space-y-3">{diagnosis.guidelines.workup.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}</div>
            </div>
          )}
          {activeTab === 'treatment' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Treatment Options</h4>
              <div className="space-y-3">{diagnosis.guidelines.treatmentOptions.map((option, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                  <Pill className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{option}</p>
                </div>
              ))}</div>
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">Close Guidelines</button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Ambient Listening Bar Component
// =============================================================================

const AmbientListeningBar: React.FC<{
  state: AmbientState;
  duration: number;
  recentMatches: AmbientMatch[];
  encounterCost: number;
  batchInterval: BatchIntervalOption;
  onBatchIntervalChange: (interval: BatchIntervalOption) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}> = ({ state, duration, recentMatches, encounterCost, batchInterval, onBatchIntervalChange, onStart, onPause, onResume, onStop }) => {
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Interval picker (shared between off and active states)
  const IntervalPicker = () => (
    <div className="absolute right-0 top-full mt-2 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-teal-600" />
          <h4 className="font-semibold text-gray-900 text-sm">AI Analysis Frequency</h4>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          More frequent = better accuracy for complex cases, higher cost
        </p>
      </div>
      <div className="p-2">
        {BATCH_INTERVALS.map((opt) => (
          <button
            key={opt.ms}
            onClick={() => { onBatchIntervalChange(opt); setShowIntervalPicker(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              batchInterval.ms === opt.ms
                ? 'bg-teal-50 border border-teal-200'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold text-sm ${batchInterval.ms === opt.ms ? 'text-teal-700' : 'text-gray-900'}`}>
                Every {opt.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                batchInterval.ms === opt.ms ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {opt.costNote}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (state === 'off') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Ambient Clinical Intelligence</h3>
            <p className="text-sm text-gray-500">Start listening to update diagnoses in real time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Interval selector */}
          <div className="relative">
            <button
              onClick={() => setShowIntervalPicker(!showIntervalPicker)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Timer className="w-4 h-4" />
              {batchInterval.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showIntervalPicker && <IntervalPicker />}
          </div>
          <button onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg">
            <Mic className="w-4 h-4" />Start Listening
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-lg p-4 ${state === 'listening' ? 'bg-red-50 border-2 border-red-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {state === 'listening' && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          {state === 'paused' && <Pause className="w-4 h-4 text-amber-600" />}
          <span className={`font-semibold ${state === 'listening' ? 'text-red-700' : 'text-amber-700'}`}>
            {state === 'listening' ? 'Listening' : 'Paused'} - {formatDuration(duration)}
          </span>
          <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
            COMPASS comparison
          </span>
          {/* Active interval badge */}
          <div className="relative">
            <button
              onClick={() => setShowIntervalPicker(!showIntervalPicker)}
              className="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded-full font-medium flex items-center gap-1 hover:bg-gray-50 transition-colors"
            >
              <Timer className="w-3 h-3" />
              AI check: {batchInterval.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showIntervalPicker && <IntervalPicker />}
          </div>
          {encounterCost > 0 ? (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
              Cost: ${encounterCost.toFixed(4)}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
              Local (free)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state === 'listening' ? (
            <button onClick={onPause} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
              <Pause className="w-3.5 h-3.5" />Pause
            </button>
          ) : (
            <button onClick={onResume} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
              <Play className="w-3.5 h-3.5" />Resume
            </button>
          )}
          <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            <Square className="w-3.5 h-3.5" />Stop
          </button>
        </div>
      </div>

      {/* Recent matches ticker */}
      {recentMatches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Detected:</span>
          {recentMatches.slice(-5).map((m, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.delta > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              "{m.term}" {m.delta > 0 ? '↑' : '↓'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function VisitDiagnosisPage() {
  const router = useRouter();
  const { id } = router.query;
  const [patient, setPatient] = useState<PatientContext | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [guidelinesModal, setGuidelinesModal] = useState<Diagnosis | null>(null);
  const [expandedDx, setExpandedDx] = useState<string | null>(null);

  // Cost-aware AI router
  const [aiRouter] = useState(() => new CostAwareAIRouter('org-default'));
  const [encounterCost, setEncounterCost] = useState(0);

  // Batch interval - persisted in localStorage
  const [batchInterval, setBatchInterval] = useState<BatchIntervalOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(BATCH_INTERVAL_STORAGE_KEY);
      if (saved) {
        const found = BATCH_INTERVALS.find(b => b.ms === parseInt(saved));
        if (found) return found;
      }
    }
    return BATCH_INTERVALS[1]; // Default: 5 min
  });

  const handleBatchIntervalChange = useCallback((interval: BatchIntervalOption) => {
    setBatchInterval(interval);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BATCH_INTERVAL_STORAGE_KEY, interval.ms.toString());
    }
  }, []);

  // Ambient listening state
  const [ambientState, setAmbientState] = useState<AmbientState>('off');
  const [ambientDuration, setAmbientDuration] = useState(0);
  const [ambientMatches, setAmbientMatches] = useState<AmbientMatch[]>([]);
  const [matchedTerms, setMatchedTerms] = useState<Set<string>>(new Set());
  const [ambientTermBuffer, setAmbientTermBuffer] = useState<Array<{ term: string; timestamp: number }>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simRef = useRef<NodeJS.Timeout | null>(null);
  const batchRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      setTimeout(() => {
        setPatient(getMockPatientContext(id as string));
        setDiagnoses(getMockDifferentialDiagnoses());
        setLoading(false);
      }, 300);
    }
  }, [id]);

  // Ambient timer
  useEffect(() => {
    if (ambientState === 'listening') {
      timerRef.current = setInterval(() => setAmbientDuration(p => p + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ambientState]);

  // Batch-process ambient terms through cost-aware router
  // Runs every 30 seconds instead of per-term (saves 80%+ on LLM calls)
  const flushAmbientBatch = useCallback(() => {
    if (ambientTermBuffer.length === 0) return;

    const currentDx = diagnoses.map(d => ({ id: d.id, name: d.name, probability: d.probability }));
    const result = aiRouter.processAmbientBatch(ambientTermBuffer, 'headache', currentDx);

    // Apply probability updates
    if (result.diagnosisUpdates.length > 0) {
      setDiagnoses(prev => prev.map(dx => {
        const update = result.diagnosisUpdates.find(u => u.diagnosisId === dx.id);
        if (!update) return dx;
        const newProb = Math.max(0.01, Math.min(0.99, dx.probability + update.probabilityDelta));
        return {
          ...dx,
          probability: newProb,
          ambientMatches: [...(dx.ambientMatches || []), ...update.matchedTerms],
        };
      }));

      // Record matches for the ticker
      result.diagnosisUpdates.forEach(u => {
        u.matchedTerms.forEach(term => {
          setAmbientMatches(prev => [...prev, {
            term, diagnosisId: u.diagnosisId, delta: u.probabilityDelta, timestamp: Date.now(),
          }]);
        });
      });
    }

    // Track cost
    if (result.cost > 0) {
      aiRouter.recordInference('ai.ambient_batch', result.cost);
      setEncounterCost(aiRouter.getEncounterCost());
    }

    setAmbientTermBuffer([]);
  }, [ambientTermBuffer, diagnoses, aiRouter]);

  // Batch flush timer - uses configurable interval
  useEffect(() => {
    if (ambientState === 'listening') {
      if (batchRef.current) clearInterval(batchRef.current);
      batchRef.current = setInterval(flushAmbientBatch, batchInterval.ms);
    } else {
      if (batchRef.current) clearInterval(batchRef.current);
      // Flush remaining on pause/stop
      if (ambientTermBuffer.length > 0) flushAmbientBatch();
    }
    return () => { if (batchRef.current) clearInterval(batchRef.current); };
  }, [ambientState, flushAmbientBatch, ambientTermBuffer.length, batchInterval.ms]);

  // Simulated ambient listening - buffers terms instead of processing immediately
  // In production: Web Speech API -> NLP entity extraction -> buffer
  useEffect(() => {
    if (ambientState !== 'listening') {
      if (simRef.current) clearInterval(simRef.current);
      return;
    }

    const simTerms = ['photophobia', 'worst headache', 'aura', 'nausea', 'confusion', 'throbbing', 'visual changes'];
    let idx = 0;

    simRef.current = setInterval(() => {
      if (idx < simTerms.length) {
        const term = simTerms[idx];
        if (!matchedTerms.has(term)) {
          setAmbientTermBuffer(prev => [...prev, { term, timestamp: Date.now() }]);
          setMatchedTerms(prev => new Set([...prev, term]));
        }
        idx++;
      }
    }, 4000);

    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [ambientState, matchedTerms]);

  const handleStartAmbient = () => {
    setAmbientState('listening');
    setAmbientDuration(0);
    setAmbientMatches([]);
    setMatchedTerms(new Set());
  };

  const toggleDiagnosis = (dxId: string) => {
    setDiagnoses(prev => prev.map(dx => dx.id === dxId ? { ...dx, selected: !dx.selected } : dx));
  };

  const selectedDiagnoses = diagnoses.filter(dx => dx.selected);
  const canProceed = selectedDiagnoses.length > 0;

  const handleProceedToTreatment = () => {
    sessionStorage.setItem('selectedDiagnoses', JSON.stringify(selectedDiagnoses));
    sessionStorage.setItem('patientContext', JSON.stringify(patient));
    router.push(`/visit/${id}/treatment`);
  };

  if (loading || !patient) {
    return (
      <ProviderShell currentPage="" activePatient={{ name: 'Loading...' }}>
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 100px)' }}>
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p>Loading visit data...</p>
          </div>
        </div>
      </ProviderShell>
    );
  }

  // Sort diagnoses by probability (highest first) for display
  const sortedDiagnoses = [...diagnoses].sort((a, b) => b.probability - a.probability);

  return (
    <>
      <Head>
        <title>Diagnosis Selection - {patient.name} | ATTENDING AI</title>
      </Head>

      <ProviderShell
        currentPage=""
        activePatient={{ name: patient.name, id: patient.id }}
        contextBadge="Encounter Active"
      >
        <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto' }} className="px-4 pt-3 pb-3">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-full">STEP 1 OF 3</span>
              <h1 className="text-lg font-bold text-white">Diagnosis Selection</h1>
              <span className="text-teal-200 text-sm">
                {patient.name} - {patient.age}yo {patient.gender} - {patient.mrn}
              </span>
              <div className="ml-auto text-right text-teal-200 text-sm">
                <p className="font-medium text-white">{selectedDiagnoses.length} diagnosis selected</p>
              </div>
            </div>

            {/* Ambient Listening Bar */}
            <AmbientListeningBar
              state={ambientState}
              duration={ambientDuration}
              recentMatches={ambientMatches}
              encounterCost={encounterCost}
              batchInterval={batchInterval}
              onBatchIntervalChange={handleBatchIntervalChange}
              onStart={handleStartAmbient}
              onPause={() => setAmbientState('paused')}
              onResume={() => setAmbientState('listening')}
              onStop={() => setAmbientState('off')}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Patient Context */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />Chief Complaint
                  </h3>
                  <p className="text-lg font-medium text-gray-800">{patient.chiefComplaint}</p>
                </div>

                {patient.redFlags.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />Red Flags ({patient.redFlags.length})
                    </h3>
                    <ul className="space-y-1.5">
                      {patient.redFlags.map((flag, i) => (
                        <li key={i} className="text-red-700 text-sm flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />HPI Summary
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{patient.hpiSummary}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-teal-600" />Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-amber-50 rounded-lg"><span className="text-gray-500">BP:</span><span className="font-semibold text-amber-700 ml-1">{patient.vitals.bp} ↑</span></div>
                    <div className="p-2 bg-amber-50 rounded-lg"><span className="text-gray-500">HR:</span><span className="font-semibold text-amber-700 ml-1">{patient.vitals.hr} ↑</span></div>
                    <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-500">Temp:</span><span className="font-semibold ml-1">{patient.vitals.temp}°F</span></div>
                    <div className="p-2 bg-gray-50 rounded-lg"><span className="text-gray-500">SpO2:</span><span className="font-semibold ml-1">{patient.vitals.spo2}%</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Allergies</h3>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Differential Diagnosis Selection */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-5 border-b bg-gradient-to-r from-teal-50 to-teal-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-xl"><Brain className="w-6 h-6 text-teal-600" /></div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">AI Differential Diagnosis</h2>
                          <p className="text-gray-600 text-sm">
                            Select diagnoses to include in treatment plan
                            {ambientState === 'listening' && <span className="text-red-600 ml-2 font-medium">- Updating live</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-100 rounded-full">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span className="text-teal-700 text-sm font-medium">AI-Assisted</span>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y">
                    {sortedDiagnoses.map((dx) => (
                      <div key={dx.id} className={`transition-all duration-500 ${dx.selected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <button onClick={() => toggleDiagnosis(dx.id)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                                dx.selected ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 hover:border-teal-400'
                              }`}>
                              {dx.selected && <CheckCircle className="w-4 h-4" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">{dx.name}</h3>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{dx.icdCode}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  dx.category === 'primary' ? 'bg-green-100 text-green-700' :
                                  dx.category === 'rule-out' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {dx.category === 'primary' ? 'PRIMARY' : dx.category === 'rule-out' ? 'RULE OUT' : 'SECONDARY'}
                                </span>
                                {/* Ambient match indicators */}
                                {dx.ambientMatches && dx.ambientMatches.length > 0 && (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium flex items-center gap-1">
                                    <Mic className="w-3 h-3" />{dx.ambientMatches.length} ambient match{dx.ambientMatches.length > 1 ? 'es' : ''}
                                  </span>
                                )}
                              </div>

                              {/* Probability Bar - animated */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                      dx.probability >= 0.7 ? 'bg-teal-600' : dx.probability >= 0.4 ? 'bg-amber-500' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${dx.probability * 100}%` }}
                                  />
                                </div>
                                <span className={`text-sm font-bold min-w-[3rem] text-right transition-colors duration-500 ${
                                  dx.ambientMatches && dx.ambientMatches.length > 0 ? 'text-red-600' : 'text-teal-700'
                                }`}>
                                  {Math.round(dx.probability * 100)}%
                                </span>
                              </div>

                              <button onClick={() => setExpandedDx(expandedDx === dx.id ? null : dx.id)}
                                className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1">
                                {expandedDx === dx.id
                                  ? <><ChevronUp className="w-4 h-4" />Hide Details</>
                                  : <><ChevronDown className="w-4 h-4" />Show Details</>
                                }
                              </button>

                              {expandedDx === dx.id && (
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Supporting Evidence</h4>
                                    <ul className="space-y-1">
                                      {dx.supportingEvidence.map((evidence, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                          <CheckCircle className="w-3 h-3 text-green-500" />{evidence}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  {dx.concerns.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-amber-700 mb-2">Clinical Concerns</h4>
                                      <ul className="space-y-1">
                                        {dx.concerns.map((concern, i) => (
                                          <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3" />{concern}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {/* Ambient matches detail */}
                                  {dx.ambientMatches && dx.ambientMatches.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                                        <Mic className="w-4 h-4" />Ambient Listening Matches
                                      </h4>
                                      <div className="flex flex-wrap gap-1.5">
                                        {dx.ambientMatches.map((term, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                            "{term}"
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <button onClick={() => setGuidelinesModal(dx)}
                              className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-200 transition-colors flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />Guidelines
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <button onClick={handleProceedToTreatment} disabled={!canProceed}
                    className={`px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all ${
                      canProceed ? 'bg-white text-teal-700 hover:bg-teal-50 shadow-lg hover:shadow-xl' : 'bg-white/30 text-white/60 cursor-not-allowed'
                    }`}>
                    Select Diagnosis & Move to Treatment
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProviderShell>

      {guidelinesModal && (
        <GuidelinesModal diagnosis={guidelinesModal} onClose={() => setGuidelinesModal(null)} />
      )}
    </>
  );
}
