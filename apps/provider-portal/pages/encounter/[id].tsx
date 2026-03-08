// ============================================================
// ATTENDING AI - Unified Encounter Page
// apps/provider-portal/pages/encounter/[id].tsx
//
// Unified encounter page combining PreVisit and Visit phases.
// Starting the visit activates ambient listening — same page.
//
// 5 Tabs: Pre-Visit Summary | AI Differential | Treatment Options
//         | Documentation | Patient History
//
// Created: March 7, 2026
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProviderShell from '../../components/layout/ProviderShell';
import { GuidelinesModal } from '../../components/encounter/GuidelinesModal';
import {
  Play,
  Pause,
  Square,
  Mic,
  Minimize2,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  BookOpen,
  Pill,
  FileText,
  Clock,
  Calendar,
  User,
  ShoppingCart,
  Package,
  PackageX,
  RefreshCw,
  Stethoscope,
  ClipboardList,
  ExternalLink,
  SlidersHorizontal,
  Check,
  Search,
  FolderOpen,
  TrendingUp,
  Zap,
  AlertOctagon,
  Info,
  Maximize2,
  Shield,
  TestTube,
} from 'lucide-react';

// ============================================================
// Brand Colors
// ============================================================
const COLORS = {
  deepNavy: '#0C3547',
  headerDark: '#0C4C5E',
  midTeal: '#0F5F76',
  primaryTeal: '#1A8FA8',
  lightTeal: '#25B8A9',
  paleMint: '#E6F7F5',
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
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  amber50: '#fffbeb',
  amber500: '#f59e0b',
  green50: '#f0fdf4',
  green500: '#22c55e',
  green600: '#16a34a',
  blue50: '#eff6ff',
  blue500: '#3b82f6',
};

// ============================================================
// Types
// ============================================================
type TabId = 'previsit' | 'differential' | 'treatment' | 'documentation' | 'history';
type FindingState = 'present' | 'absent' | 'unknown';

interface Finding {
  name: string;
  state: FindingState;
}

interface Diagnosis {
  name: string;
  icdCode: string;
  probability: number;
  findings: Finding[];
  evidence: string;
  category: string;
}

interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  inStock: boolean;
  quantity?: number;
  alternative?: string;
}

interface TreatmentPlan {
  diagnosis: string;
  medications: Medication[];
  nonPharm: string[];
  ordered: boolean[];
}

// ============================================================
// Tab Definitions
// ============================================================
const TABS: { id: TabId; label: string; icon: React.FC<{ style?: React.CSSProperties }> }[] = [
  { id: 'previsit', label: 'Pre-Visit Summary', icon: ClipboardList },
  { id: 'differential', label: 'AI Differential', icon: Brain },
  { id: 'treatment', label: 'Treatment Options', icon: Pill },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'history', label: 'Patient History', icon: Clock },
];

// ============================================================
// Mock Data
// ============================================================
const PATIENT = {
  name: 'Sarah Chen',
  initials: 'SC',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-0847',
  dob: '06/15/1991',
  appointmentTime: '10:30 AM',
  appointmentDate: 'March 7, 2026',
  insurance: 'Blue Cross PPO',
  primaryCare: 'Dr. Thomas Reed',
};

const VITALS = [
  { label: 'BP', value: '142/88', unit: 'mmHg', icon: Heart, status: 'high' as const },
  { label: 'HR', value: '92', unit: 'bpm', icon: Activity, status: 'elevated' as const },
  { label: 'Temp', value: '99.1', unit: '\u00B0F', icon: Thermometer, status: 'elevated' as const },
  { label: 'RR', value: '18', unit: '/min', icon: Wind, status: 'normal' as const },
  { label: 'SpO2', value: '98', unit: '%', icon: Droplets, status: 'normal' as const },
];

const CURRENT_MEDICATIONS = [
  { name: 'Ibuprofen 400mg', frequency: 'PRN for headache', duration: 'Since 2023' },
  { name: 'Oral Contraceptive', frequency: 'Daily', duration: 'Since 2018' },
];

const INITIAL_DIAGNOSES: Diagnosis[] = [
  {
    name: 'Migraine without aura',
    icdCode: 'G43.009',
    probability: 0.65,
    category: 'Headache',
    evidence: 'Patient reports pulsating unilateral headache with nausea and photophobia. History of similar episodes. OCP use may increase frequency.',
    findings: [
      { name: 'Unilateral location', state: 'present' },
      { name: 'Pulsating quality', state: 'present' },
      { name: 'Nausea/vomiting', state: 'present' },
      { name: 'Photophobia', state: 'present' },
      { name: 'Duration 4-72 hours', state: 'unknown' },
      { name: 'Aggravated by activity', state: 'unknown' },
    ],
  },
  {
    name: 'Tension-type headache',
    icdCode: 'G44.209',
    probability: 0.45,
    category: 'Headache',
    evidence: 'Bilateral pressing headache quality reported. Elevated BP and stress factors noted. No aura symptoms.',
    findings: [
      { name: 'Bilateral location', state: 'present' },
      { name: 'Pressing/tightening quality', state: 'present' },
      { name: 'Mild-moderate intensity', state: 'absent' },
      { name: 'No nausea or vomiting', state: 'absent' },
      { name: 'Not aggravated by activity', state: 'unknown' },
      { name: 'Pericranial tenderness', state: 'unknown' },
    ],
  },
  {
    name: 'Subarachnoid hemorrhage',
    icdCode: 'I60.9',
    probability: 0.25,
    category: 'Headache',
    evidence: 'Thunderclap onset described as "worst headache of my life". Elevated BP. Requires urgent CT and possibly lumbar puncture to rule out.',
    findings: [
      { name: 'Thunderclap onset', state: 'present' },
      { name: '"Worst headache of life"', state: 'present' },
      { name: 'Neck stiffness', state: 'unknown' },
      { name: 'Loss of consciousness', state: 'absent' },
      { name: 'Focal neurological deficit', state: 'unknown' },
      { name: 'Elevated BP', state: 'present' },
    ],
  },
  {
    name: 'Medication overuse headache',
    icdCode: 'G44.40',
    probability: 0.20,
    category: 'Headache',
    evidence: 'Patient uses ibuprofen PRN for headaches. If frequency exceeds 15 days/month for >3 months, MOH should be considered.',
    findings: [
      { name: 'Regular analgesic use', state: 'present' },
      { name: 'Headache >15 days/month', state: 'unknown' },
      { name: 'Worsening despite treatment', state: 'unknown' },
      { name: '>3 months overuse', state: 'unknown' },
    ],
  },
  {
    name: 'Cluster headache',
    icdCode: 'G44.009',
    probability: 0.15,
    category: 'Headache',
    evidence: 'Severe unilateral headache reported. However, patient demographics (34F) atypical for cluster headache (more common in males).',
    findings: [
      { name: 'Severe unilateral pain', state: 'present' },
      { name: 'Orbital/temporal location', state: 'unknown' },
      { name: 'Lacrimation/rhinorrhea', state: 'absent' },
      { name: 'Restlessness', state: 'unknown' },
      { name: 'Duration 15-180 min', state: 'unknown' },
      { name: 'Circadian pattern', state: 'absent' },
    ],
  },
];

const TREATMENT_PLANS: TreatmentPlan[] = [
  {
    diagnosis: 'Migraine without aura',
    medications: [
      { name: 'Sumatriptan', dose: '50mg', route: 'PO', frequency: 'PRN at onset, max 200mg/day', inStock: true, quantity: 120 },
      { name: 'Ondansetron', dose: '4mg', route: 'ODT', frequency: 'PRN for nausea', inStock: true, quantity: 60 },
      { name: 'Metoclopramide', dose: '10mg', route: 'PO', frequency: 'PRN', inStock: true, quantity: 45 },
    ],
    nonPharm: ['Dark quiet room during attacks', 'Cold compress to forehead', 'Migraine diary to track triggers'],
    ordered: [false, false, false],
  },
  {
    diagnosis: 'Tension-type headache',
    medications: [
      { name: 'Acetaminophen', dose: '1000mg', route: 'PO', frequency: 'PRN, max 3g/day', inStock: true, quantity: 500 },
      { name: 'Amitriptyline', dose: '10mg', route: 'PO', frequency: 'QHS (preventive)', inStock: true, quantity: 90 },
    ],
    nonPharm: ['Stress management techniques', 'Physical therapy for cervical muscles', 'Regular sleep schedule'],
    ordered: [false, false],
  },
  {
    diagnosis: 'Subarachnoid hemorrhage',
    medications: [
      { name: 'Nimodipine', dose: '60mg', route: 'PO', frequency: 'Q4H x 21 days', inStock: false, alternative: 'Available via pharmacy order (24h)' },
      { name: 'Levetiracetam', dose: '500mg', route: 'IV', frequency: 'BID (seizure prophylaxis)', inStock: true, quantity: 30 },
    ],
    nonPharm: ['STAT non-contrast CT head', 'Lumbar puncture if CT negative', 'Neurosurgery consult', 'ICU admission if confirmed'],
    ordered: [false, false],
  },
];

const PHARMACY_INVENTORY = [
  { name: 'Sumatriptan 50mg', inStock: true, quantity: 120 },
  { name: 'Ondansetron 4mg ODT', inStock: true, quantity: 60 },
  { name: 'Metoclopramide 10mg', inStock: true, quantity: 45 },
  { name: 'Acetaminophen 500mg', inStock: true, quantity: 500 },
  { name: 'Amitriptyline 10mg', inStock: true, quantity: 90 },
  { name: 'Levetiracetam 500mg', inStock: true, quantity: 30 },
  { name: 'Nimodipine 60mg', inStock: false, quantity: 0 },
  { name: 'Ketorolac 30mg', inStock: true, quantity: 24 },
];

const SOAP_NOTE = {
  subjective: `34-year-old female presents with chief complaint of "worst headache of my life" with sudden onset 3 days ago. Patient describes the pain as pulsating, primarily unilateral (right temporal/frontal), rated 9/10 in severity. Associated symptoms include nausea (no vomiting), photophobia, and phonophobia. Patient reports the headache began suddenly while at work. She has tried ibuprofen 400mg without significant relief. No recent head trauma, fever, neck stiffness, or visual changes reported. Past medical history significant for occasional headaches managed with OTC analgesics.

Current medications: Ibuprofen 400mg PRN, oral contraceptive daily.
Allergies: Sulfa drugs (rash), Codeine (nausea).`,

  objective: `Vitals: BP 142/88 mmHg, HR 92 bpm, Temp 99.1\u00B0F, RR 18/min, SpO2 98%

General: Alert, oriented x4, appears uncomfortable, holding head
HEENT: No papilledema on fundoscopic exam, PERRLA, no scleral icterus
Neck: Supple, no meningismus, no lymphadenopathy
Neuro: CN II-XII intact, 5/5 strength all extremities, DTRs 2+ symmetric, no pronator drift, finger-to-nose intact, negative Kernig and Brudzinski signs
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally`,

  assessment: `1. Severe headache - differential includes migraine without aura (most likely, 65%), tension-type headache, and SAH (low probability but must rule out given "worst headache" presentation)
2. Elevated blood pressure - likely pain-related, monitor
3. Low-grade temperature - monitor, likely not infectious`,

  plan: `1. STAT non-contrast CT head to rule out subarachnoid hemorrhage
2. If CT negative and clinical suspicion persists, consider lumbar puncture
3. Sumatriptan 50mg PO x1 for acute migraine treatment (after CT results)
4. Ondansetron 4mg ODT PRN for nausea
5. IV normal saline for hydration
6. Recheck vitals in 1 hour
7. Migraine education and trigger diary
8. Follow-up in 1 week or sooner if worsening
9. Return precautions discussed: sudden worsening, vision changes, weakness, fever`,
};

const BILLING_CODES = [
  { code: '99214', description: 'Office visit, established patient, moderate complexity', selected: true },
  { code: 'G43.009', description: 'Migraine without aura, not intractable', selected: true },
  { code: '70450', description: 'CT head without contrast', selected: false },
  { code: 'R51.9', description: 'Headache, unspecified', selected: false },
];

const PAST_VISITS = [
  { date: '01/15/2026', complaint: 'Annual physical', provider: 'Dr. Thomas Reed', diagnosis: 'Routine exam - no acute findings', notes: 'Labs ordered: CBC, BMP, Lipid Panel. All normal except LDL 142 (elevated).' },
  { date: '11/02/2025', complaint: 'Migraine follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'Migraine stable on current regimen', notes: 'Frequency decreased to 2x/month. Continue current management.' },
  { date: '08/20/2025', complaint: 'BP check', provider: 'NP Wilson', diagnosis: 'Hypertension - controlled', notes: 'BP 128/82. Continue monitoring. Lifestyle modifications discussed.' },
  { date: '05/10/2025', complaint: 'Allergy consult', provider: 'Dr. Kim', diagnosis: 'Seasonal allergic rhinitis', notes: 'Started on loratadine 10mg daily. Nasal saline irrigation recommended.' },
  { date: '02/12/2025', complaint: 'Sinus infection', provider: 'Dr. Thomas Reed', diagnosis: 'Acute sinusitis', notes: 'Amoxicillin 500mg TID x 10 days. Resolved without complications.' },
];

const CHRONIC_CONDITIONS = [
  { name: 'Migraine with aura', since: '2019', status: 'Active' },
  { name: 'Hypertension, Stage 1', since: '2023', status: 'Active' },
  { name: 'Seasonal allergic rhinitis', since: '2015', status: 'Active' },
];

const SURGICAL_HISTORY = [
  { procedure: 'Appendectomy', date: '2012', notes: 'Uncomplicated, laparoscopic' },
  { procedure: 'Wisdom teeth extraction', date: '2010', notes: 'All four removed under general anesthesia' },
];

const FAMILY_HISTORY = [
  { relation: 'Mother', conditions: 'Migraine, Hypertension, Type 2 Diabetes' },
  { relation: 'Father', conditions: 'Coronary artery disease, Hyperlipidemia' },
  { relation: 'Maternal grandmother', conditions: 'Stroke at age 72' },
];

const SOCIAL_HISTORY = {
  occupation: 'Software Engineer',
  tobacco: 'Never smoker',
  alcohol: 'Social, 2-3 drinks/week',
  exercise: '3x/week (yoga, running)',
  diet: 'Generally healthy, vegetarian',
  stress: 'High - work deadlines',
  sleep: '6-7 hours/night, irregular schedule',
};

// ============================================================
// AI-Mined Prior Visit Insights (related to current complaint)
// ============================================================
const AI_PRIOR_VISIT_INSIGHTS = [
  {
    type: 'prior_visit' as const,
    title: 'Migraine Follow-up — 11/02/2025',
    detail: 'Frequency was 2x/month, stable on sumatriptan. Patient reported stress as primary trigger. No aura at that visit.',
    relevance: 'high' as const,
    aiNote: 'Current presentation differs: "worst headache of life" + thunderclap onset suggests this is NOT typical migraine pattern.',
  },
  {
    type: 'prior_visit' as const,
    title: 'Annual Physical — 01/15/2026',
    detail: 'BP was 132/84 (borderline). LDL 142 (elevated). No headache complaints at that visit.',
    relevance: 'medium' as const,
    aiNote: 'BP trending upward: 124/78 → 128/82 → 132/84 → 142/88 today. Consider secondary hypertension workup.',
  },
  {
    type: 'medication' as const,
    title: 'Ibuprofen Use Pattern',
    detail: 'PRN since 2023. Patient mentioned using "a few times a week" at 11/02/2025 visit.',
    relevance: 'medium' as const,
    aiNote: 'Frequent NSAID use + OCP combination increases cardiovascular risk. If >15 days/month, consider medication overuse headache.',
  },
  {
    type: 'family' as const,
    title: 'Family History: Stroke Risk',
    detail: 'Maternal grandmother had stroke at age 72. Mother has migraine + HTN + DM2. Father has CAD.',
    relevance: 'high' as const,
    aiNote: 'Strong family history of cerebrovascular disease. Combined with OCP use, elevated BP, and thunderclap headache — lowers threshold for SAH workup.',
  },
];

const AI_DRUG_INTERACTIONS = [
  {
    severity: 'warning' as const,
    drugs: ['Ibuprofen', 'Oral Contraceptive'],
    detail: 'NSAIDs may reduce efficacy of hormonal contraceptives. Additionally, both increase cardiovascular risk.',
  },
  {
    severity: 'caution' as const,
    drugs: ['Sumatriptan', 'OCP'],
    detail: 'Triptans are generally safe with OCPs, but monitor for vascular events in patients with aura. Current presentation has no aura.',
  },
  {
    severity: 'info' as const,
    drugs: ['Ibuprofen', 'Sumatriptan'],
    detail: 'Can be used together. Some evidence supports NSAID + triptan combination for refractory migraine.',
  },
];

const AI_VITALS_TREND = [
  { date: '05/2025', bp: '124/78', label: 'Normal' },
  { date: '08/2025', bp: '128/82', label: 'Normal' },
  { date: '11/2025', bp: '132/84', label: 'Elevated' },
  { date: '01/2026', bp: '132/84', label: 'Elevated' },
  { date: 'Today', bp: '142/88', label: 'Stage 1 HTN' },
];

const FULL_MEDICATION_LIST = [
  { name: 'Sumatriptan 100mg', route: 'PO', frequency: 'PRN', purpose: 'Migraine', prescriber: 'Dr. Reed', since: '03/2019', status: 'Active' },
  { name: 'Lisinopril 10mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '06/2023', status: 'Active' },
  { name: 'Loratadine 10mg', route: 'PO', frequency: 'Daily', purpose: 'Allergies', prescriber: 'Dr. Reed', since: '04/2015', status: 'Active' },
  { name: 'Oral Contraceptive', route: 'PO', frequency: 'Daily', purpose: 'Contraception', prescriber: 'Dr. Patel', since: '01/2018', status: 'Active' },
  { name: 'Ibuprofen 400mg', route: 'PO', frequency: 'PRN', purpose: 'Headache', prescriber: 'OTC', since: '2023', status: 'Active' },
];

const ALLERGIES = [
  { substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' },
  { substance: 'Codeine', reaction: 'Nausea/vomiting', severity: 'Mild' },
];

const RECENT_LABS = [
  { date: '01/15/2026', test: 'CBC', result: 'WNL', flag: '' },
  { date: '01/15/2026', test: 'BMP', result: 'WNL', flag: '' },
  { date: '01/15/2026', test: 'Lipid Panel', result: 'LDL 142 mg/dL', flag: 'High' },
  { date: '01/15/2026', test: 'TSH', result: '2.1 mIU/L', flag: '' },
  { date: '01/15/2026', test: 'HbA1c', result: '5.4%', flag: '' },
];

const AMBIENT_TRANSCRIPT_LINES = [
  { time: '0:00', speaker: 'Dr. Reed', text: 'Good morning, Sarah. I see you\'re here for a severe headache. Can you tell me more about when it started?' },
  { time: '0:15', speaker: 'Patient', text: 'It started about three days ago. I was at work and suddenly this terrible headache hit me. It\'s the worst headache I\'ve ever had.' },
  { time: '0:32', speaker: 'Dr. Reed', text: 'And the pain -- can you describe the quality? Is it throbbing, sharp, pressure-like?' },
  { time: '0:40', speaker: 'Patient', text: 'It\'s pulsating, mainly on the right side of my head, around my temple and behind my eye.' },
  { time: '0:52', speaker: 'Dr. Reed', text: 'Any nausea, vomiting, or sensitivity to light or sound?' },
  { time: '0:58', speaker: 'Patient', text: 'Yes, definitely nauseous, and lights really bother me. I\'ve been staying in a dark room mostly.' },
  { time: '1:10', speaker: 'Dr. Reed', text: 'Have you tried anything for the pain?' },
  { time: '1:15', speaker: 'Patient', text: 'I took some ibuprofen but it barely touched it.' },
];

const EXTRACTED_ENTITIES = [
  { type: 'Symptom', text: 'Severe headache', time: '0:15' },
  { type: 'Symptom', text: 'Pulsating quality', time: '0:40' },
  { type: 'Location', text: 'Right temporal/retro-orbital', time: '0:40' },
  { type: 'Symptom', text: 'Nausea', time: '0:58' },
  { type: 'Symptom', text: 'Photophobia', time: '0:58' },
  { type: 'Medication', text: 'Ibuprofen (ineffective)', time: '1:15' },
];

// ============================================================
// Scenario 2: James Rodriguez (Chest Pain)
// ============================================================
const PATIENT_2 = {
  name: 'James Rodriguez',
  initials: 'JR',
  age: 62,
  gender: 'Male',
  mrn: 'MRN-2024-0892',
  dob: '09/03/1963',
  appointmentTime: '2:15 PM',
  appointmentDate: 'March 7, 2026',
  insurance: 'Medicare Advantage',
  primaryCare: 'Dr. Thomas Reed',
};

const VITALS_2 = [
  { label: 'BP', value: '158/94', unit: 'mmHg', icon: Heart, status: 'high' as const },
  { label: 'HR', value: '96', unit: 'bpm', icon: Activity, status: 'elevated' as const },
  { label: 'Temp', value: '98.4', unit: '\u00B0F', icon: Thermometer, status: 'normal' as const },
  { label: 'RR', value: '22', unit: '/min', icon: Wind, status: 'elevated' as const },
  { label: 'SpO2', value: '94', unit: '%', icon: Droplets, status: 'high' as const },
  { label: 'Pain', value: '7', unit: '/10', icon: AlertTriangle, status: 'high' as const },
];

const CURRENT_MEDICATIONS_2 = [
  { name: 'Metformin 1000mg', frequency: 'BID', duration: 'Since 2015' },
  { name: 'Aspirin 81mg', frequency: 'Daily', duration: 'Since 2012' },
  { name: 'Metoprolol 50mg', frequency: 'BID', duration: 'Since 2018' },
  { name: 'Atorvastatin 40mg', frequency: 'Daily', duration: 'Since 2012' },
  { name: 'Lisinopril 20mg', frequency: 'Daily', duration: 'Since 2010' },
];

const INITIAL_DIAGNOSES_2: Diagnosis[] = [
  {
    name: 'Acute Coronary Syndrome',
    icdCode: 'I21.9',
    probability: 0.65,
    category: 'Chest Pain',
    evidence: 'Patient presents with substernal chest pressure radiating to left arm, diaphoresis, and exertional worsening. Multiple cardiac risk factors including DM2, hyperlipidemia, HTN, and significant smoking history. Family history of early MI.',
    findings: [
      { name: 'Substernal pressure', state: 'present' },
      { name: 'Radiation to left arm', state: 'present' },
      { name: 'Diaphoresis', state: 'present' },
      { name: 'Exertional component', state: 'present' },
      { name: 'Cardiac risk factors', state: 'present' },
      { name: 'Troponin elevation', state: 'unknown' },
    ],
  },
  {
    name: 'Pulmonary Embolism',
    icdCode: 'I26.99',
    probability: 0.15,
    category: 'Chest Pain',
    evidence: 'Dyspnea, tachycardia, and hypoxia (SpO2 94%) present. Chest pain could be pleuritic. However, radiation pattern and diaphoresis favor cardiac etiology.',
    findings: [
      { name: 'Dyspnea', state: 'present' },
      { name: 'Tachycardia', state: 'present' },
      { name: 'Hypoxia', state: 'present' },
      { name: 'Chest pain', state: 'present' },
      { name: 'Unilateral leg swelling', state: 'unknown' },
      { name: 'Pleuritic quality', state: 'absent' },
    ],
  },
  {
    name: 'Unstable Angina',
    icdCode: 'I20.0',
    probability: 0.12,
    category: 'Chest Pain',
    evidence: 'Exertional chest pain with multiple risk factors and reproducible pattern. May represent crescendo angina if prior episodes occurred. Differentiation from ACS requires troponin and ECG.',
    findings: [
      { name: 'Exertional chest pain', state: 'present' },
      { name: 'Risk factors present', state: 'present' },
      { name: 'Reproducible pattern', state: 'unknown' },
      { name: 'Prior angina episodes', state: 'unknown' },
      { name: 'Relief with rest', state: 'unknown' },
    ],
  },
  {
    name: 'Aortic Dissection',
    icdCode: 'I71.01',
    probability: 0.05,
    category: 'Chest Pain',
    evidence: 'Severe chest pain with hypertension present. However, pain described as pressure rather than tearing, and no pulse deficit or mediastinal widening noted.',
    findings: [
      { name: 'Severe chest pain', state: 'present' },
      { name: 'Hypertension', state: 'present' },
      { name: 'Tearing quality', state: 'absent' },
      { name: 'Pulse deficit', state: 'unknown' },
      { name: 'Back pain radiation', state: 'absent' },
    ],
  },
  {
    name: 'Musculoskeletal',
    icdCode: 'M79.3',
    probability: 0.03,
    category: 'Chest Pain',
    evidence: 'Chest wall tenderness would support this diagnosis. However, associated symptoms (diaphoresis, dyspnea, radiation) and risk factor profile make this unlikely.',
    findings: [
      { name: 'Chest wall tenderness', state: 'unknown' },
      { name: 'Reproducible with palpation', state: 'unknown' },
      { name: 'No associated symptoms', state: 'absent' },
      { name: 'Recent physical exertion', state: 'unknown' },
    ],
  },
];

const TREATMENT_PLANS_2: TreatmentPlan[] = [
  {
    diagnosis: 'Acute Coronary Syndrome',
    medications: [
      { name: 'Heparin', dose: '60 units/kg bolus then 12 units/kg/hr', route: 'IV', frequency: 'Continuous drip', inStock: true, quantity: 50 },
      { name: 'Nitroglycerin', dose: '0.4mg', route: 'SL', frequency: 'Q5min x3 PRN chest pain', inStock: true, quantity: 100 },
      { name: 'Morphine', dose: '2-4mg', route: 'IV', frequency: 'Q5-15min PRN severe pain', inStock: true, quantity: 30 },
      { name: 'Clopidogrel', dose: '300mg loading then 75mg', route: 'PO', frequency: 'Daily', inStock: true, quantity: 90 },
      { name: 'Atorvastatin', dose: '80mg', route: 'PO', frequency: 'Daily (high-intensity)', inStock: true, quantity: 90 },
    ],
    nonPharm: ['STAT 12-lead ECG', 'Serial troponins Q3H x3', 'Continuous telemetry', 'Cardiology consult', 'NPO for possible cath lab'],
    ordered: [false, false, false, false, false],
  },
  {
    diagnosis: 'Pulmonary Embolism',
    medications: [
      { name: 'Enoxaparin', dose: '1mg/kg', route: 'SQ', frequency: 'BID', inStock: true, quantity: 40 },
      { name: 'Alteplase', dose: '100mg', route: 'IV', frequency: 'Over 2 hours (if massive PE)', inStock: false, alternative: 'Available via pharmacy order (2h)' },
    ],
    nonPharm: ['CT Pulmonary Angiography', 'D-dimer if low clinical suspicion', 'Lower extremity doppler', 'Supplemental O2 to maintain SpO2 >94%'],
    ordered: [false, false],
  },
  {
    diagnosis: 'Aortic Dissection',
    medications: [
      { name: 'Esmolol', dose: '500mcg/kg bolus then 50-200mcg/kg/min', route: 'IV', frequency: 'Continuous', inStock: true, quantity: 10 },
      { name: 'Nicardipine', dose: '5-15mg/hr', route: 'IV', frequency: 'Continuous (target SBP <120)', inStock: true, quantity: 15 },
    ],
    nonPharm: ['STAT CT Angiography chest/abdomen/pelvis', 'Cardiothoracic surgery consult', 'Type and screen 6 units pRBC', 'Bilateral arm BPs'],
    ordered: [false, false],
  },
];

const PHARMACY_INVENTORY_2 = [
  { name: 'Heparin drip', inStock: true, quantity: 50 },
  { name: 'Nitroglycerin 0.4mg SL', inStock: true, quantity: 100 },
  { name: 'Morphine 4mg/mL', inStock: true, quantity: 30 },
  { name: 'Clopidogrel 75mg', inStock: true, quantity: 90 },
  { name: 'Atorvastatin 80mg', inStock: true, quantity: 90 },
  { name: 'Enoxaparin 80mg', inStock: true, quantity: 40 },
  { name: 'Esmolol drip', inStock: true, quantity: 10 },
  { name: 'Alteplase 100mg', inStock: false, quantity: 0 },
];

const SOAP_NOTE_2 = {
  subjective: `62-year-old male presents with chief complaint of "chest pain and shortness of breath for 2 days." Patient describes substernal chest pressure radiating to the left arm, worse with exertion, associated with dyspnea and diaphoresis. Pain rated 7/10, intermittent but increasing in frequency. No relief with rest. Denies palpitations, syncope, or leg swelling. History of type 2 diabetes (since 2015), hyperlipidemia (2012), hypertension (2010), GERD, peripheral neuropathy, and depression. 30-pack-year smoking history, quit 2 years ago. Father died of MI at age 58.

Current medications: Metformin 1000mg BID, Glipizide 10mg daily, Atorvastatin 40mg daily, Lisinopril 20mg daily, Aspirin 81mg daily, Metoprolol 50mg BID, Omeprazole 20mg daily, Gabapentin 300mg TID, Duloxetine 60mg daily, Amlodipine 5mg daily, Jardiance 10mg daily, Fish Oil 1000mg daily.
Allergies: Sulfa drugs (rash), Codeine (nausea/vomiting), Latex (contact dermatitis).`,

  objective: `Vitals: BP 158/94 mmHg, HR 96 bpm, Temp 98.4\u00B0F, RR 22/min, SpO2 94% on RA, Pain 7/10

General: Alert, oriented x4, appears anxious, mild diaphoresis noted
HEENT: Atraumatic, no JVD at 30 degrees
Neck: No carotid bruits, no lymphadenopathy
Cardiovascular: Regular rate and rhythm, S1/S2 present, no S3/S4, no murmurs, no rubs; bilateral radial pulses 2+ symmetric
Respiratory: Tachypneic, clear to auscultation bilaterally, no wheezes/crackles
Abdomen: Soft, non-tender, no organomegaly
Extremities: No edema, no calf tenderness, pedal pulses intact bilaterally
Neuro: Alert, oriented x4, no focal deficits`,

  assessment: `1. Acute chest pain -- differential includes ACS (most likely, 65%), pulmonary embolism (15%), unstable angina (12%), aortic dissection (5% but must rule out)
2. Hypertension -- acutely elevated, likely pain/stress related but requires urgent management
3. Hypoxia -- SpO2 94%, concerning in setting of chest pain; needs supplemental O2
4. Multiple cardiac risk factors -- DM2, HLD, HTN, former smoker, FHx early MI`,

  plan: `1. STAT 12-lead ECG
2. Serial troponins Q3H x3
3. Continuous telemetry monitoring
4. Aspirin 325mg PO x1 (already on 81mg daily)
5. Nitroglycerin 0.4mg SL PRN chest pain
6. Heparin drip per ACS protocol if troponin elevated
7. Supplemental O2 via NC to maintain SpO2 >95%
8. Cardiology consult for possible cardiac catheterization
9. Hold Metformin (contrast risk)
10. BMP, CBC, Coag panel, BNP, lipid panel
11. CXR portable
12. Return precautions: worsening pain, dyspnea, syncope, diaphoresis`,
};

const BILLING_CODES_2 = [
  { code: '99215', description: 'Office visit, established patient, high complexity', selected: true },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', selected: true },
  { code: '93000', description: '12-lead ECG with interpretation', selected: true },
  { code: 'R07.9', description: 'Chest pain, unspecified', selected: false },
  { code: 'I10', description: 'Essential hypertension', selected: false },
];

const PAST_VISITS_2 = [
  { date: '01/08/2026', complaint: 'Diabetes follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'DM2 controlled, A1c 7.2%', notes: 'Adjusted Glipizide from 5mg to 10mg. Added Jardiance 10mg for cardiovascular benefit. Foot exam normal.' },
  { date: '10/15/2025', complaint: 'HTN follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'Hypertension - suboptimal control', notes: 'BP 148/90. Added Amlodipine 5mg to regimen. Dietary counseling provided.' },
  { date: '07/22/2025', complaint: 'Peripheral neuropathy', provider: 'Dr. Thomas Reed', diagnosis: 'Diabetic peripheral neuropathy', notes: 'Started Gabapentin 300mg TID. Nerve conduction study ordered.' },
  { date: '04/10/2025', complaint: 'Depression screening', provider: 'Dr. Thomas Reed', diagnosis: 'Major depressive disorder, moderate', notes: 'PHQ-9 score 14. Started Duloxetine 60mg daily. Referral to counseling.' },
  { date: '01/20/2025', complaint: 'Annual physical', provider: 'Dr. Thomas Reed', diagnosis: 'Routine exam - multiple chronic conditions', notes: 'A1c 7.8%, LDL 128, BP 144/88. Smoking cessation counseling, quit date set. Cardiac stress test recommended.' },
];

const CHRONIC_CONDITIONS_2 = [
  { name: 'Type 2 Diabetes Mellitus', since: '2015', status: 'Active' },
  { name: 'Hyperlipidemia', since: '2012', status: 'Active' },
  { name: 'Essential Hypertension', since: '2010', status: 'Active' },
  { name: 'GERD', since: '2018', status: 'Active' },
  { name: 'Diabetic Peripheral Neuropathy', since: '2025', status: 'Active' },
  { name: 'Major Depressive Disorder', since: '2025', status: 'Active' },
];

const SURGICAL_HISTORY_2 = [
  { procedure: 'Right inguinal hernia repair', date: '2008', notes: 'Open repair, uncomplicated' },
  { procedure: 'Cholecystectomy', date: '2016', notes: 'Laparoscopic, symptomatic gallstones' },
];

const FAMILY_HISTORY_2 = [
  { relation: 'Father', conditions: 'MI at age 58 (deceased), Hypertension, Hyperlipidemia' },
  { relation: 'Mother', conditions: 'Type 2 Diabetes, Hypertension, alive age 84' },
  { relation: 'Brother', conditions: 'CABG at age 59, Type 2 Diabetes' },
];

const SOCIAL_HISTORY_2 = {
  occupation: 'Retired construction worker',
  tobacco: '30-pack-year history, quit 2 years ago',
  alcohol: 'Occasional, 1-2 beers/week',
  exercise: 'Limited — walks 10 min/day',
  diet: 'High sodium, working on changes',
  stress: 'Moderate — adjusting to retirement',
  sleep: '5-6 hours/night, snores (no formal OSA eval)',
};

const AI_PRIOR_VISIT_INSIGHTS_2 = [
  {
    type: 'prior_visit' as const,
    title: 'Diabetes Follow-up — 01/08/2026',
    detail: 'A1c 7.2%, Jardiance added for CV benefit. No cardiac complaints at that visit.',
    relevance: 'high' as const,
    aiNote: 'Jardiance was added for cardiovascular risk reduction — prescient given today\'s presentation. A1c well-controlled. Metformin should be held if contrast studies needed.',
  },
  {
    type: 'prior_visit' as const,
    title: 'HTN Follow-up — 10/15/2025',
    detail: 'BP was 148/90, Amlodipine added. Patient reported occasional exertional dyspnea at that visit.',
    relevance: 'high' as const,
    aiNote: 'Exertional dyspnea was documented 5 months ago — may have been early anginal equivalent. BP remains suboptimally controlled today at 158/94.',
  },
  {
    type: 'medication' as const,
    title: 'Polypharmacy Review — 12 Active Medications',
    detail: 'Patient is on 12 medications across 6 conditions. Multiple drug interactions possible.',
    relevance: 'medium' as const,
    aiNote: 'Key interactions: Metformin hold if contrast planned. Aspirin already on board (good). Metoprolol may mask tachycardia as a sign of deterioration. Duloxetine + cardiac meds need monitoring.',
  },
  {
    type: 'family' as const,
    title: 'Family History: Premature CAD',
    detail: 'Father died of MI at 58. Brother had CABG at 59. Mother has DM2 and HTN.',
    relevance: 'high' as const,
    aiNote: 'Strong family history of premature coronary artery disease. Combined with patient\'s own risk factors (DM2, HTN, HLD, smoking hx), this patient has extremely high pre-test probability for ACS.',
  },
];

const AI_DRUG_INTERACTIONS_2 = [
  {
    severity: 'warning' as const,
    drugs: ['Metformin', 'IV Contrast'],
    detail: 'Hold Metformin 48 hours before and after contrast administration. Risk of lactic acidosis, especially with renal impairment.',
  },
  {
    severity: 'warning' as const,
    drugs: ['Heparin', 'Aspirin'],
    detail: 'Increased bleeding risk. Monitor closely. Necessary in ACS protocol but watch for signs of hemorrhage.',
  },
  {
    severity: 'caution' as const,
    drugs: ['Metoprolol', 'Amlodipine'],
    detail: 'Additive hypotensive and bradycardic effects. Monitor HR and BP closely during acute management.',
  },
  {
    severity: 'info' as const,
    drugs: ['Duloxetine', 'Morphine'],
    detail: 'Serotonergic and CNS depressant interaction. Use lowest effective morphine dose. Monitor for serotonin syndrome signs.',
  },
];

const AI_VITALS_TREND_2 = [
  { date: '01/2025', bp: '144/88', label: 'Stage 1 HTN' },
  { date: '04/2025', bp: '140/86', label: 'Stage 1 HTN' },
  { date: '07/2025', bp: '146/90', label: 'Stage 2 HTN' },
  { date: '10/2025', bp: '148/90', label: 'Stage 2 HTN' },
  { date: 'Today', bp: '158/94', label: 'Stage 2 HTN' },
];

const FULL_MEDICATION_LIST_2 = [
  { name: 'Metformin 1000mg', route: 'PO', frequency: 'BID', purpose: 'Type 2 Diabetes', prescriber: 'Dr. Reed', since: '03/2015', status: 'Active' },
  { name: 'Glipizide 10mg', route: 'PO', frequency: 'Daily', purpose: 'Type 2 Diabetes', prescriber: 'Dr. Reed', since: '01/2026', status: 'Active' },
  { name: 'Atorvastatin 40mg', route: 'PO', frequency: 'Daily', purpose: 'Hyperlipidemia', prescriber: 'Dr. Reed', since: '06/2012', status: 'Active' },
  { name: 'Lisinopril 20mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '09/2010', status: 'Active' },
  { name: 'Aspirin 81mg', route: 'PO', frequency: 'Daily', purpose: 'Cardiac prophylaxis', prescriber: 'Dr. Reed', since: '06/2012', status: 'Active' },
  { name: 'Metoprolol 50mg', route: 'PO', frequency: 'BID', purpose: 'Hypertension / Rate control', prescriber: 'Dr. Reed', since: '03/2018', status: 'Active' },
  { name: 'Omeprazole 20mg', route: 'PO', frequency: 'Daily', purpose: 'GERD', prescriber: 'Dr. Reed', since: '05/2018', status: 'Active' },
  { name: 'Gabapentin 300mg', route: 'PO', frequency: 'TID', purpose: 'Peripheral neuropathy', prescriber: 'Dr. Reed', since: '07/2025', status: 'Active' },
  { name: 'Duloxetine 60mg', route: 'PO', frequency: 'Daily', purpose: 'Depression / Neuropathy', prescriber: 'Dr. Reed', since: '04/2025', status: 'Active' },
  { name: 'Amlodipine 5mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '10/2025', status: 'Active' },
  { name: 'Jardiance 10mg', route: 'PO', frequency: 'Daily', purpose: 'DM2 / CV risk reduction', prescriber: 'Dr. Reed', since: '01/2026', status: 'Active' },
  { name: 'Fish Oil 1000mg', route: 'PO', frequency: 'Daily', purpose: 'Lipid support', prescriber: 'OTC', since: '2020', status: 'Active' },
];

const ALLERGIES_2 = [
  { substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' },
  { substance: 'Codeine', reaction: 'Nausea/vomiting', severity: 'Mild' },
  { substance: 'Latex', reaction: 'Contact dermatitis', severity: 'Moderate' },
];

const RECENT_LABS_2 = [
  { date: '01/08/2026', test: 'HbA1c', result: '7.2%', flag: 'High' },
  { date: '01/08/2026', test: 'BMP', result: 'Creatinine 1.3', flag: 'High' },
  { date: '01/08/2026', test: 'Lipid Panel', result: 'LDL 98 mg/dL', flag: '' },
  { date: '01/08/2026', test: 'CBC', result: 'WNL', flag: '' },
  { date: '01/08/2026', test: 'eGFR', result: '58 mL/min', flag: 'Low' },
  { date: '01/08/2026', test: 'BNP', result: '89 pg/mL', flag: '' },
];

const AMBIENT_TRANSCRIPT_LINES_2 = [
  { time: '0:00', speaker: 'Dr. Reed', text: 'Good afternoon, James. I understand you\'ve been having chest pain. Tell me about it.' },
  { time: '0:18', speaker: 'Patient', text: 'It started two days ago. This pressure right in the center of my chest. It\'s been coming and going but getting worse.' },
  { time: '0:35', speaker: 'Dr. Reed', text: 'Does the pain go anywhere else? To your arm, jaw, or back?' },
  { time: '0:42', speaker: 'Patient', text: 'Yeah, it goes down my left arm. And I\'ve been sweating a lot, even when I\'m not doing anything.' },
  { time: '0:55', speaker: 'Dr. Reed', text: 'Any shortness of breath, dizziness, or nausea?' },
  { time: '1:02', speaker: 'Patient', text: 'Shortness of breath for sure. I couldn\'t even walk to the mailbox yesterday without getting winded.' },
  { time: '1:15', speaker: 'Dr. Reed', text: 'And you have a history of diabetes and high blood pressure, correct? Your father had a heart attack at 58?' },
  { time: '1:25', speaker: 'Patient', text: 'Yes, he passed from it. My brother had bypass surgery two years ago too.' },
];

const EXTRACTED_ENTITIES_2 = [
  { type: 'Symptom', text: 'Substernal chest pressure', time: '0:18' },
  { type: 'Symptom', text: 'Progressive worsening', time: '0:18' },
  { type: 'Symptom', text: 'Left arm radiation', time: '0:42' },
  { type: 'Symptom', text: 'Diaphoresis', time: '0:42' },
  { type: 'Symptom', text: 'Dyspnea on exertion', time: '1:02' },
  { type: 'Family', text: 'Father MI at 58', time: '1:25' },
  { type: 'Family', text: 'Brother CABG', time: '1:25' },
];

// ============================================================
// PATIENT_SCENARIOS — wrapper for both demo patients
// ============================================================
const PATIENT_SCENARIOS = {
  sarahChen: {
    label: 'Sarah Chen — Headache',
    patient: PATIENT,
    vitals: VITALS,
    currentMedications: CURRENT_MEDICATIONS,
    initialDiagnoses: INITIAL_DIAGNOSES,
    treatmentPlans: TREATMENT_PLANS,
    pharmacyInventory: PHARMACY_INVENTORY,
    soapNote: SOAP_NOTE,
    billingCodes: BILLING_CODES,
    pastVisits: PAST_VISITS,
    chronicConditions: CHRONIC_CONDITIONS,
    surgicalHistory: SURGICAL_HISTORY,
    familyHistory: FAMILY_HISTORY,
    socialHistory: SOCIAL_HISTORY,
    aiPriorVisitInsights: AI_PRIOR_VISIT_INSIGHTS,
    aiDrugInteractions: AI_DRUG_INTERACTIONS,
    aiVitalsTrend: AI_VITALS_TREND,
    fullMedicationList: FULL_MEDICATION_LIST,
    allergies: ALLERGIES,
    recentLabs: RECENT_LABS,
    ambientTranscriptLines: AMBIENT_TRANSCRIPT_LINES,
    extractedEntities: EXTRACTED_ENTITIES,
    presentationNarrative: '38-year-old female presenting with \u201cthe worst headache of my life,\u201d sudden onset 3 days ago while at work. Pain is right temporal/frontal, pulsating, continuous, rated 9/10. Associated with nausea, photophobia, and phonophobia. Ibuprofen 400mg provided no relief. Patient has a history of migraine with aura (diagnosed 2019) and stage 1 hypertension (2023). Family history significant for maternal migraine, HTN, and DM2; paternal CAD; grandmother with stroke at 72. Non-smoker, moderate alcohol use. Currently on Lisinopril 10mg daily and Sumatriptan 50mg PRN.',
    redFlags: ['Thunderclap onset', '"Worst headache"', 'Elevated BP', 'FHx stroke'],
    complaintCategories: ['Headache', 'Hypertension'],
    differentialHistory: '<div style="margin-bottom: 6px"><strong style="color: #0C3547">PMH:</strong> Migraine w/ aura (2019), HTN Stage 1 (2023)</div><div style="margin-bottom: 6px"><strong style="color: #0C3547">FHx:</strong> Mother \u2014 migraine, HTN, DM2; Father \u2014 CAD; Grandmother \u2014 stroke @ 72</div><div><strong style="color: #0C3547">Social:</strong> Software eng, non-smoker, high stress, 6-7hr sleep</div>',
  },
  jamesRodriguez: {
    label: 'James Rodriguez — Chest Pain',
    patient: PATIENT_2,
    vitals: VITALS_2,
    currentMedications: CURRENT_MEDICATIONS_2,
    initialDiagnoses: INITIAL_DIAGNOSES_2,
    treatmentPlans: TREATMENT_PLANS_2,
    pharmacyInventory: PHARMACY_INVENTORY_2,
    soapNote: SOAP_NOTE_2,
    billingCodes: BILLING_CODES_2,
    pastVisits: PAST_VISITS_2,
    chronicConditions: CHRONIC_CONDITIONS_2,
    surgicalHistory: SURGICAL_HISTORY_2,
    familyHistory: FAMILY_HISTORY_2,
    socialHistory: SOCIAL_HISTORY_2,
    aiPriorVisitInsights: AI_PRIOR_VISIT_INSIGHTS_2,
    aiDrugInteractions: AI_DRUG_INTERACTIONS_2,
    aiVitalsTrend: AI_VITALS_TREND_2,
    fullMedicationList: FULL_MEDICATION_LIST_2,
    allergies: ALLERGIES_2,
    recentLabs: RECENT_LABS_2,
    ambientTranscriptLines: AMBIENT_TRANSCRIPT_LINES_2,
    extractedEntities: EXTRACTED_ENTITIES_2,
    presentationNarrative: '62-year-old male with 2-day history of substernal chest pressure radiating to left arm, worse with exertion, associated with dyspnea and diaphoresis. Pain rated 7/10, intermittent but increasing in frequency and severity. No relief with rest or position change. History of type 2 diabetes (A1c 7.2%), hyperlipidemia on statin therapy, hypertension on triple-agent regimen, and 30-pack-year smoking history (quit 2 years ago). Father died of MI at 58, brother had CABG at 59. Currently on 12 medications including Metformin, Glipizide, Atorvastatin, Lisinopril, Aspirin, Metoprolol, Amlodipine, Jardiance, Omeprazole, Gabapentin, Duloxetine, and Fish Oil. SpO2 94% on room air is concerning for acute cardiopulmonary process.',
    redFlags: ['Substernal chest pain', 'Radiation to arm', 'Diaphoresis', 'FHx MI <60', 'Smoking history'],
    complaintCategories: ['Chest Pain'],
    differentialHistory: '<div style="margin-bottom: 6px"><strong style="color: #0C3547">PMH:</strong> DM2 (2015), HLD (2012), HTN (2010), GERD, Peripheral neuropathy, Depression</div><div style="margin-bottom: 6px"><strong style="color: #0C3547">FHx:</strong> Father \u2014 MI at 58 (deceased); Mother \u2014 DM2, HTN; Brother \u2014 CABG at 59</div><div><strong style="color: #0C3547">Social:</strong> Retired construction, 30-pk-yr smoker (quit 2y), occasional alcohol</div>',
  },
};

type ScenarioKey = keyof typeof PATIENT_SCENARIOS;

// ============================================================
// Shared Styles
// ============================================================
const cardStyle: React.CSSProperties = {
  background: COLORS.white,
  borderRadius: 12,
  border: `1px solid ${COLORS.gray200}`,
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: `1px solid ${COLORS.gray200}`,
  fontWeight: 700,
  fontSize: 14,
  color: COLORS.deepNavy,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardBodyStyle: React.CSSProperties = {
  padding: '16px 20px',
};

// ============================================================
// Component
// ============================================================
const EncounterPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const patientId = (id as string) || 'enc-001';

  // --- State ---
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('sarahChen');
  const [activeTab, setActiveTab] = useState<TabId>('previsit');
  const [visitActive, setVisitActive] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [ambientMinimized, setAmbientMinimized] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(INITIAL_DIAGNOSES);
  const [complaintFilter, setComplaintFilter] = useState('Headache');
  const [sortBy, setSortBy] = useState<'probability' | 'name'>('probability');
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [guidelinesDiag, setGuidelinesDiag] = useState({ name: '', icdCode: '', probability: 0 });
  const [treatmentOrders, setTreatmentOrders] = useState<boolean[][]>(TREATMENT_PLANS.map(tp => tp.ordered));
  const [soapNote, setSoapNote] = useState(SOAP_NOTE);
  const [billingCodes, setBillingCodes] = useState(BILLING_CODES);
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);
  const [chartDrawerOpen, setChartDrawerOpen] = useState(false);
  const [chartDrawerTab, setChartDrawerTab] = useState<'meds' | 'allergies' | 'labs' | 'history'>('meds');
  const [priorInsightsExpanded, setPriorInsightsExpanded] = useState<number | null>(0);
  const [transcriptIdx, setTranscriptIdx] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // --- Derive active scenario data ---
  const scenario = PATIENT_SCENARIOS[activeScenario];
  const S_PATIENT = scenario.patient;
  const S_VITALS = scenario.vitals;
  const S_CURRENT_MEDICATIONS = scenario.currentMedications;
  const S_TREATMENT_PLANS = scenario.treatmentPlans;
  const S_PHARMACY_INVENTORY = scenario.pharmacyInventory;
  const S_PAST_VISITS = scenario.pastVisits;
  const S_CHRONIC_CONDITIONS = scenario.chronicConditions;
  const S_SURGICAL_HISTORY = scenario.surgicalHistory;
  const S_FAMILY_HISTORY = scenario.familyHistory;
  const S_SOCIAL_HISTORY = scenario.socialHistory;
  const S_AI_PRIOR_VISIT_INSIGHTS = scenario.aiPriorVisitInsights;
  const S_AI_DRUG_INTERACTIONS = scenario.aiDrugInteractions;
  const S_AI_VITALS_TREND = scenario.aiVitalsTrend;
  const S_FULL_MEDICATION_LIST = scenario.fullMedicationList;
  const S_ALLERGIES = scenario.allergies;
  const S_RECENT_LABS = scenario.recentLabs;
  const S_AMBIENT_TRANSCRIPT_LINES = scenario.ambientTranscriptLines;
  const S_EXTRACTED_ENTITIES = scenario.extractedEntities;

  // --- Switch scenario handler ---
  const switchScenario = (key: ScenarioKey) => {
    if (key === activeScenario) return;
    const s = PATIENT_SCENARIOS[key];
    setActiveScenario(key);
    setDiagnoses([...s.initialDiagnoses]);
    setComplaintFilter(s.complaintCategories[0]);
    setTreatmentOrders(s.treatmentPlans.map(tp => [...tp.ordered]));
    setSoapNote({ ...s.soapNote });
    setBillingCodes([...s.billingCodes]);
    setExpandedVisit(null);
    setPriorInsightsExpanded(0);
    setTranscriptIdx(0);
    setVisitActive(false);
    setAmbientPaused(false);
    setChartDrawerOpen(false);
  };

  // Simulate ambient transcript appearing over time
  useEffect(() => {
    if (!visitActive || ambientPaused || transcriptIdx >= S_AMBIENT_TRANSCRIPT_LINES.length) return;
    const timer = setTimeout(() => {
      setTranscriptIdx(prev => prev + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [visitActive, ambientPaused, transcriptIdx, S_AMBIENT_TRANSCRIPT_LINES.length]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptIdx]);

  // --- Finding toggle (updates probabilities reactively) ---
  const toggleFinding = (diagIdx: number, findIdx: number) => {
    setDiagnoses(prev => {
      const updated = prev.map((diag, dIdx) => {
        if (dIdx !== diagIdx) return diag;
        const finding = { ...diag.findings[findIdx] };
        const cycle: FindingState[] = ['unknown', 'present', 'absent'];
        const currentIndex = cycle.indexOf(finding.state);
        const oldState = finding.state;
        finding.state = cycle[(currentIndex + 1) % 3];
        const newState = finding.state;

        const newFindings = diag.findings.map((f, i) => (i === findIdx ? finding : f));

        // Compute probability delta based on finding state change
        // Each key finding: present adds ~7%, absent subtracts ~7%, returning to unknown reverses
        let delta = 0;
        if (oldState === 'unknown' && newState === 'present') delta = 0.07;
        else if (oldState === 'present' && newState === 'absent') delta = -0.14; // undo +7, then -7
        else if (oldState === 'absent' && newState === 'unknown') delta = 0.07; // undo the -7
        else if (oldState === 'unknown' && newState === 'absent') delta = -0.07;
        else if (oldState === 'present' && newState === 'unknown') delta = -0.07;
        else if (oldState === 'absent' && newState === 'present') delta = 0.14;

        let newProb = diag.probability + delta;
        // Clamp probability to [0.02, 0.95]
        newProb = Math.max(0.02, Math.min(0.95, newProb));

        return { ...diag, findings: newFindings, probability: Math.round(newProb * 100) / 100 };
      });

      return updated;
    });
  };

  // --- Order toggle ---
  const toggleOrder = (planIdx: number, medIdx: number) => {
    setTreatmentOrders(prev => {
      const next = prev.map(arr => [...arr]);
      next[planIdx][medIdx] = !next[planIdx][medIdx];
      return next;
    });
  };

  // --- Billing code toggle ---
  const toggleBillingCode = (idx: number) => {
    setBillingCodes(prev => prev.map((bc, i) => (i === idx ? { ...bc, selected: !bc.selected } : bc)));
  };

  // --- Open guidelines ---
  const openGuidelines = (diag: Diagnosis) => {
    setGuidelinesDiag({ name: diag.name, icdCode: diag.icdCode, probability: diag.probability });
    setGuidelinesOpen(true);
  };

  // --- Start / End visit ---
  const startVisit = () => {
    setVisitActive(true);
    setAmbientPaused(false);
    setAmbientMinimized(false);
    setTranscriptIdx(0);
  };

  const endVisit = () => {
    setVisitActive(false);
    setAmbientPaused(false);
  };

  // --- Probability bar color ---
  const probColor = (p: number) => {
    if (p >= 0.6) return COLORS.green500;
    if (p >= 0.4) return COLORS.gold;
    if (p >= 0.2) return COLORS.coral;
    return COLORS.gray500;
  };

  // --- Vital status color ---
  const vitalStatusColor = (status: string) => {
    if (status === 'high') return COLORS.red500;
    if (status === 'elevated') return COLORS.coral;
    return COLORS.green500;
  };

  const vitalStatusLabel = (status: string) => {
    if (status === 'high') return 'HIGH';
    if (status === 'elevated') return 'ELEVATED';
    return 'NORMAL';
  };

  // --- Finding icon ---
  const findingIcon = (state: FindingState) => {
    if (state === 'present') return <CheckCircle style={{ width: 16, height: 16, color: COLORS.green500 }} />;
    if (state === 'absent') return <XCircle style={{ width: 16, height: 16, color: COLORS.red500 }} />;
    return <HelpCircle style={{ width: 16, height: 16, color: COLORS.gray500 }} />;
  };

  // --- Sorted & filtered diagnoses ---
  const filteredDiagnoses = diagnoses
    .filter(d => d.category === complaintFilter)
    .sort((a, b) => sortBy === 'probability' ? b.probability - a.probability : a.name.localeCompare(b.name));

  // ============================================================
  // TAB 1 -- PRE-VISIT SUMMARY
  // ============================================================
  const renderPreVisit = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Patient Header Banner */}
      <div
        style={{
          background: COLORS.white,
          borderRadius: 14,
          border: `1px solid ${COLORS.gray200}`,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.lightTeal} 0%, ${COLORS.primaryTeal} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.white,
              fontSize: 20,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {S_PATIENT.initials}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.deepNavy }}>{S_PATIENT.name}</div>
            <div style={{ fontSize: 13, color: COLORS.gray500, marginTop: 2 }}>
              {S_PATIENT.age}{S_PATIENT.gender === 'Female' ? 'F' : 'M'} &middot; DOB: {S_PATIENT.dob} &middot; {S_PATIENT.mrn}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Appointment', `${S_PATIENT.appointmentTime}`],
            ['Insurance', S_PATIENT.insurance],
            ['PCP', S_PATIENT.primaryCare],
          ].map(([label, value]) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                background: COLORS.paleMint,
                color: COLORS.deepNavy,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ color: COLORS.primaryTeal, fontSize: 11, fontWeight: 500 }}>{label}</span>
              {value}
            </span>
          ))}
        </div>
      </div>

      {/* Patient Presentation */}
      <div style={{ ...cardStyle, borderLeft: `3px solid ${COLORS.gold}` }}>
        <div style={{ ...cardHeaderStyle, background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
          <Sparkles style={{ width: 16, height: 16, color: COLORS.gold }} />
          <span style={{ color: COLORS.deepNavy }}>Patient Presentation</span>
        </div>
        <div style={cardBodyStyle}>
          <p style={{ margin: 0, fontSize: 15, color: COLORS.gray600, lineHeight: 1.8 }}>
            {scenario.presentationNarrative}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {scenario.redFlags.map(flag => (
              <span
                key={flag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: COLORS.red100,
                  color: COLORS.red600,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <AlertTriangle style={{ width: 12, height: 12 }} />
                {flag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Prior Visit Insights — mined from chart history */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.gold}` }}>
        <div style={{ ...cardHeaderStyle, background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
          <Search style={{ width: 16, height: 16, color: COLORS.gold }} />
          <span style={{ color: COLORS.deepNavy }}>AI Chart Analysis — Related to Current Complaint</span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
            background: 'rgba(200, 164, 78, 0.2)', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {S_AI_PRIOR_VISIT_INSIGHTS.length} Findings
          </span>
        </div>
        <div style={{ padding: 0 }}>
          {S_AI_PRIOR_VISIT_INSIGHTS.map((insight, i) => (
            <div
              key={i}
              style={{
                borderBottom: i < S_AI_PRIOR_VISIT_INSIGHTS.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
              }}
            >
              <div
                onClick={() => setPriorInsightsExpanded(priorInsightsExpanded === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', cursor: 'pointer',
                  background: priorInsightsExpanded === i ? COLORS.gray50 : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: insight.type === 'prior_visit' ? COLORS.paleMint
                    : insight.type === 'medication' ? COLORS.blue50
                    : insight.type === 'family' ? COLORS.red50 : COLORS.gray50,
                }}>
                  {insight.type === 'prior_visit' && <Clock style={{ width: 14, height: 14, color: COLORS.primaryTeal }} />}
                  {insight.type === 'medication' && <Pill style={{ width: 14, height: 14, color: COLORS.blue500 }} />}
                  {insight.type === 'family' && <User style={{ width: 14, height: 14, color: COLORS.coral }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.deepNavy }}>{insight.title}</span>
                    {insight.relevance === 'high' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 6, background: COLORS.red100, color: COLORS.red600 }}>
                        HIGH RELEVANCE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.gray600, marginTop: 3, lineHeight: 1.5 }}>{insight.detail}</div>
                </div>
                {priorInsightsExpanded === i
                  ? <ChevronDown style={{ width: 14, height: 14, color: COLORS.gray500, marginTop: 4, flexShrink: 0 }} />
                  : <ChevronRight style={{ width: 14, height: 14, color: COLORS.gray500, marginTop: 4, flexShrink: 0 }} />}
              </div>
              {priorInsightsExpanded === i && (
                <div style={{
                  padding: '0 20px 14px 60px',
                }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'linear-gradient(135deg, rgba(26,143,168,0.08), rgba(37,184,169,0.08))',
                    border: `1px solid rgba(26,143,168,0.15)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Sparkles style={{ width: 12, height: 12, color: COLORS.gold }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primaryTeal, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        AI Analysis
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.deepNavy, lineHeight: 1.6 }}>{insight.aiNote}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Clinical Context Row — Drug Interactions + Vitals Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="encounter-grid-2col">
        {/* Drug Interactions */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <AlertOctagon style={{ width: 16, height: 16, color: COLORS.coral }} />
            Drug Interaction Check
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 12, background: COLORS.paleMint, color: COLORS.primaryTeal }}>
              AI
            </span>
          </div>
          <div style={cardBodyStyle}>
            {S_AI_DRUG_INTERACTIONS.map((interaction, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
                  borderBottom: i < S_AI_DRUG_INTERACTIONS.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  background: interaction.severity === 'warning' ? COLORS.coral
                    : interaction.severity === 'caution' ? COLORS.amber500
                    : COLORS.primaryTeal,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.deepNavy }}>
                    {interaction.drugs.join(' + ')}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 2, lineHeight: 1.5 }}>{interaction.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BP Trend */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <TrendingUp style={{ width: 16, height: 16, color: COLORS.coral }} />
            Blood Pressure Trend
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 12, background: COLORS.red50, color: COLORS.red600 }}>
              TRENDING UP
            </span>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, marginBottom: 8 }}>
              {S_AI_VITALS_TREND.map((v, i) => {
                const systolic = parseInt(v.bp.split('/')[0]);
                const barHeight = ((systolic - 110) / 40) * 100; // normalize 110-150 range
                const isToday = v.date === 'Today';
                const isHigh = systolic >= 130;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isHigh ? COLORS.red600 : COLORS.green600 }}>{v.bp}</span>
                    <div style={{
                      width: '100%', maxWidth: 40, borderRadius: '4px 4px 0 0',
                      height: `${Math.max(barHeight, 15)}%`,
                      background: isToday
                        ? `linear-gradient(180deg, ${COLORS.red500}, ${COLORS.coral})`
                        : isHigh
                          ? `linear-gradient(180deg, ${COLORS.coral}, ${COLORS.amber500})`
                          : `linear-gradient(180deg, ${COLORS.lightTeal}, ${COLORS.primaryTeal})`,
                      transition: 'height 0.5s ease',
                    }} />
                    <span style={{ fontSize: 9, color: isToday ? COLORS.red600 : COLORS.gray500, fontWeight: isToday ? 700 : 500 }}>
                      {v.date}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 8, background: COLORS.red50, border: `1px solid ${COLORS.red100}`,
              fontSize: 12, color: COLORS.red600, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              <span>BP has increased 18/10 mmHg over 10 months. Today's reading (142/88) is Stage 1 HTN. Consider if pain-related or requires workup.</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="encounter-grid-2col">
        {/* Vitals Grid */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Activity style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Vitals
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="vitals-grid">
              {S_VITALS.map(v => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.label}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: `1px solid ${v.status !== 'normal' ? COLORS.red100 : COLORS.gray200}`,
                      background: v.status !== 'normal' ? COLORS.red50 : COLORS.gray50,
                      textAlign: 'center',
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: vitalStatusColor(v.status), margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.deepNavy }}>{v.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.gray500, marginTop: 2 }}>{v.unit}</div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: vitalStatusColor(v.status),
                        marginTop: 4,
                        letterSpacing: 0.5,
                      }}
                    >
                      {vitalStatusLabel(v.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Medications + Relevant History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Pill style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
              Current Medications
            </div>
            <div style={cardBodyStyle}>
              {S_CURRENT_MEDICATIONS.map((med, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom: i < S_CURRENT_MEDICATIONS.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>{med.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
                    {med.frequency} &middot; {med.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <FileText style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
              Relevant History
              <button
                onClick={() => setChartDrawerOpen(true)}
                style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6, border: `1px solid ${COLORS.primaryTeal}`,
                  background: 'transparent', color: COLORS.primaryTeal, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <FolderOpen style={{ width: 12, height: 12 }} /> Open Chart
              </button>
            </div>
            <div style={cardBodyStyle}>
              <div style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6, marginBottom: 12 }}>
                <strong style={{ color: COLORS.deepNavy }}>PMH:</strong> {S_CHRONIC_CONDITIONS.map(c => `${c.name} (${c.since})`).join(', ')}<br />
                <strong style={{ color: COLORS.deepNavy }}>FHx:</strong> {S_FAMILY_HISTORY.map(f => `${f.relation} - ${f.conditions}`).join('; ')}<br />
                <strong style={{ color: COLORS.deepNavy }}>Allergies:</strong>{' '}
                {S_ALLERGIES.map((a, i) => (
                  <span key={i}>
                    <span style={{ color: COLORS.red600, fontWeight: 600 }}>{a.substance}</span> ({a.reaction})
                    {i < S_ALLERGIES.length - 1 ? ', ' : ''}
                  </span>
                ))}<br />
                <strong style={{ color: COLORS.deepNavy }}>Social:</strong> {S_SOCIAL_HISTORY.occupation}, {S_SOCIAL_HISTORY.tobacco}, {S_SOCIAL_HISTORY.alcohol}
              </div>
              {/* All active medications */}
              <div style={{ borderTop: `1px solid ${COLORS.gray100}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  All Active Medications ({S_FULL_MEDICATION_LIST.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {S_FULL_MEDICATION_LIST.map((med, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
                      background: COLORS.paleMint, color: COLORS.deepNavy,
                    }}>
                      {med.name} <span style={{ color: COLORS.gray500 }}>({med.frequency})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Confidence Summary */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Sparkles style={{ width: 16, height: 16, color: COLORS.gold }} />
          <span>AI Confidence Summary</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.gray500, marginLeft: 'auto' }}>
            Top 3 Diagnoses
          </span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...diagnoses].sort((a, b) => b.probability - a.probability).slice(0, 3).map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ minWidth: 200, fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>
                  {d.name}
                </div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: COLORS.gray100, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${d.probability * 100}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: probColor(d.probability),
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <div style={{ minWidth: 45, textAlign: 'right', fontWeight: 700, fontSize: 14, color: probColor(d.probability) }}>
                  {Math.round(d.probability * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Visit / Ambient Listening */}
      {!visitActive ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '40px 24px',
          background: `linear-gradient(135deg, ${COLORS.deepNavy}, ${COLORS.midTeal})`,
          border: 'none',
        }}>
          <Mic style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, marginBottom: 8 }}>
            Ready to Begin Encounter
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
            Start the visit to activate ambient listening. AI will transcribe and extract clinical entities in real time.
          </div>
          <button
            onClick={startVisit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '18px 56px',
              borderRadius: 14,
              border: 'none',
              background: `linear-gradient(135deg, ${COLORS.lightTeal}, ${COLORS.primaryTeal})`,
              color: COLORS.white,
              fontSize: 18,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(37, 184, 169, 0.4)',
              letterSpacing: 0.3,
            }}
          >
            <Play style={{ width: 24, height: 24 }} />
            Start Visit
          </button>
        </div>
      ) : (
        <div style={{
          ...cardStyle,
          overflow: 'hidden',
          border: `1px solid ${ambientPaused ? COLORS.gray200 : 'rgba(37, 184, 169, 0.3)'}`,
        }}>
          {/* Ambient Listening Header */}
          <div style={{
            padding: '14px 20px',
            background: `linear-gradient(135deg, ${COLORS.deepNavy}, ${COLORS.midTeal})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Mic style={{ width: 20, height: 20, color: ambientPaused ? COLORS.gray500 : '#4ade80' }} />
                {!ambientPaused && (
                  <div style={{
                    position: 'absolute', top: -3, right: -3, width: 8, height: 8,
                    borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 1.5s infinite',
                  }} />
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>
                {ambientPaused ? 'Listening Paused' : 'Ambient Listening Active'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setAmbientPaused(!ambientPaused)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: COLORS.white,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {ambientPaused ? <Play style={{ width: 14, height: 14 }} /> : <Pause style={{ width: 14, height: 14 }} />}
                {ambientPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={endVisit}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Square style={{ width: 12, height: 12 }} />
                End Visit
              </button>
            </div>
          </div>

          {/* Live Transcript */}
          <div style={{ padding: '16px 20px', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Live Transcript
            </div>
            {transcriptIdx === 0 ? (
              <div style={{ fontSize: 14, color: COLORS.gray400, fontStyle: 'italic' }}>Waiting for speech...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {S_AMBIENT_TRANSCRIPT_LINES.slice(0, transcriptIdx).map((line, i) => (
                  <div key={i} style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: COLORS.deepNavy }}>{line.speaker}: </span>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Entities */}
          {(() => {
            const visibleEntities = S_EXTRACTED_ENTITIES.filter(entity => {
              const lineTimeIdx = S_AMBIENT_TRANSCRIPT_LINES.findIndex(l => l.time === entity.time);
              return lineTimeIdx < transcriptIdx;
            });
            if (visibleEntities.length === 0) return null;
            return (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${COLORS.gray100}`, background: COLORS.gray50 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Extracted Entities
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {visibleEntities.map((e, i) => (
                    <span key={i} style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                      background: e.type === 'Symptom' ? COLORS.paleMint
                        : e.type === 'Medication' ? COLORS.blue50
                        : e.type === 'Location' ? 'rgba(200, 164, 78, 0.15)'
                        : COLORS.gray100,
                      color: e.type === 'Symptom' ? COLORS.primaryTeal
                        : e.type === 'Medication' ? COLORS.blue500
                        : e.type === 'Location' ? COLORS.gold
                        : COLORS.gray600,
                    }}>
                      {e.text}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 2 -- AI DIFFERENTIAL
  // ============================================================
  const renderDifferential = () => (
    <div style={{ display: 'flex', gap: 20 }} className="differential-flex-container">
      {/* Left Panel — Clinical Context (40% width, separate cards) */}
      <div style={{ flex: '0 0 40%', minWidth: 0 }} className="differential-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Patient Presentation */}
          <div style={{ ...cardStyle, borderLeft: `3px solid ${COLORS.gold}` }}>
            <div style={{ ...cardHeaderStyle, padding: '10px 16px', fontSize: 14 }}>
              <Sparkles style={{ width: 16, height: 16, color: COLORS.gold }} />
              <span>Patient Presentation</span>
            </div>
            <div style={{ padding: '12px 16px', fontSize: 14, color: COLORS.gray600, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                {scenario.presentationNarrative}
              </p>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scenario.redFlags.map(flag => (
                  <span key={flag} style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: COLORS.red100, color: COLORS.red600,
                  }}>
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Vitals + Allergies side by side */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...cardStyle, flex: 1 }}>
              <div style={{ ...cardHeaderStyle, padding: '10px 16px', fontSize: 14 }}>
                <Activity style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
                Vitals
              </div>
              <div style={{ padding: '6px 16px' }}>
                {S_VITALS.map((v, i) => (
                  <div key={v.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 0', borderBottom: i < S_VITALS.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: COLORS.gray500 }}>{v.label}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: v.status === 'normal' ? COLORS.deepNavy : v.status === 'high' ? COLORS.red500 : COLORS.coral,
                    }}>
                      {v.value} <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.gray500 }}>{v.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, flex: 1, borderLeft: `3px solid ${COLORS.coral}` }}>
              <div style={{ ...cardHeaderStyle, padding: '10px 16px', fontSize: 14 }}>
                <AlertTriangle style={{ width: 16, height: 16, color: COLORS.coral }} />
                Allergies
              </div>
              <div style={{ padding: '6px 16px' }}>
                {S_ALLERGIES.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 0',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.red600 }}>{a.substance}</span>
                    <span style={{ fontSize: 12, color: COLORS.gray500 }}>{a.reaction}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medications + History side by side */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...cardStyle, flex: 1 }}>
              <div style={{ ...cardHeaderStyle, padding: '10px 16px', fontSize: 14 }}>
                <Pill style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
                Medications ({S_FULL_MEDICATION_LIST.length})
              </div>
              <div style={{ padding: '6px 16px' }}>
                {S_FULL_MEDICATION_LIST.map((med, i) => (
                  <div key={i} style={{
                    padding: '4px 0',
                    borderBottom: i < S_FULL_MEDICATION_LIST.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.deepNavy }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray500 }}>
                      {med.route} · {med.frequency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, flex: 1 }}>
              <div style={{ ...cardHeaderStyle, padding: '10px 16px', fontSize: 14 }}>
                <FileText style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
                Key History
              </div>
              <div style={{ padding: '10px 16px', fontSize: 13, color: COLORS.gray600, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: scenario.differentialHistory }} />
            </div>
          </div>

        </div>
      </div>

      {/* Main — Diagnosis Cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      {/* Complaint filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {scenario.complaintCategories.map(complaint => (
            <button
              key={complaint}
              onClick={() => setComplaintFilter(complaint)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: complaintFilter === complaint ? 'none' : `1px solid ${COLORS.gray200}`,
                background: complaintFilter === complaint ? COLORS.deepNavy : COLORS.white,
                color: complaintFilter === complaint ? COLORS.white : COLORS.gray600,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {complaint}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal style={{ width: 14, height: 14, color: COLORS.gray500 }} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'probability' | 'name')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.gray200}`,
              fontSize: 13,
              color: COLORS.deepNavy,
              background: COLORS.white,
              cursor: 'pointer',
            }}
          >
            <option value="probability">Sort by Probability</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Diagnosis Cards */}
      {filteredDiagnoses.map((diag) => {
        const realIdx = diagnoses.findIndex(d => d.icdCode === diag.icdCode);
        return (
          <div key={diag.icdCode} style={{ ...cardStyle, borderLeft: `4px solid ${probColor(diag.probability)}` }}>
            {/* Diagnosis Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.deepNavy }}>{diag.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: 6,
                      background: COLORS.paleMint,
                      color: COLORS.primaryTeal,
                    }}
                  >
                    {diag.icdCode}
                  </span>
                </div>
                {/* Probability bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, maxWidth: 200, height: 8, borderRadius: 4, background: COLORS.gray100, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${diag.probability * 100}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: probColor(diag.probability),
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: probColor(diag.probability) }}>
                    {Math.round(diag.probability * 100)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => openGuidelines(diag)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: `linear-gradient(135deg, ${COLORS.gold}, #d4a843)`,
                  color: COLORS.white,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(200, 164, 78, 0.3)',
                }}
              >
                <BookOpen style={{ width: 14, height: 14 }} />
                Guidelines
              </button>
            </div>

            {/* Key Findings */}
            <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${COLORS.gray100}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gray500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Key Findings
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {diag.findings.map((f, fIdx) => (
                  <button
                    key={fIdx}
                    onClick={() => toggleFinding(realIdx, fIdx)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${
                        f.state === 'present' ? '#bbf7d0' : f.state === 'absent' ? COLORS.red100 : COLORS.gray200
                      }`,
                      background: f.state === 'present' ? COLORS.green50 : f.state === 'absent' ? COLORS.red50 : COLORS.gray50,
                      color: f.state === 'present' ? COLORS.green600 : f.state === 'absent' ? COLORS.red600 : COLORS.gray600,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    title="Click to toggle: Present / Absent / Unknown"
                  >
                    {findingIcon(f.state)}
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Supporting Evidence */}
            <div style={{ padding: '12px 20px', background: COLORS.gray50 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gray500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Supporting Evidence
              </div>
              <div style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6 }}>{diag.evidence}</div>
            </div>
          </div>
        );
      })}

      {filteredDiagnoses.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: COLORS.gray500, fontSize: 14 }}>
          No diagnoses found for &ldquo;{complaintFilter}&rdquo;. Try a different complaint category.
        </div>
      )}
      </div>

    </div>
  );

  // ============================================================
  // TAB 3 -- TREATMENT OPTIONS
  // ============================================================
  const renderTreatment = () => (
    <div style={{ display: 'flex', gap: 20 }} className="treatment-flex-container">
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {S_TREATMENT_PLANS.map((plan, planIdx) => (
          <div key={plan.diagnosis} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Stethoscope style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
              Treatment: {plan.diagnosis}
            </div>
            <div style={cardBodyStyle}>
              {/* Medications */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gray500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Medication Recommendations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {plan.medications.map((med, medIdx) => (
                  <div
                    key={medIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: `1px solid ${treatmentOrders[planIdx]?.[medIdx] ? '#bbf7d0' : COLORS.gray200}`,
                      background: treatmentOrders[planIdx]?.[medIdx] ? COLORS.green50 : COLORS.white,
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>
                        {med.name} {med.dose} {med.route}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>{med.frequency}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {med.inStock ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.green600, padding: '2px 8px', borderRadius: 6, background: COLORS.green50 }}>
                          In Stock ({med.quantity})
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.coral, padding: '2px 8px', borderRadius: 6, background: '#fef2e8' }}>
                          Out of Stock
                        </span>
                      )}
                      <button
                        onClick={() => toggleOrder(planIdx, medIdx)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: treatmentOrders[planIdx]?.[medIdx]
                            ? COLORS.green500
                            : COLORS.primaryTeal,
                          color: COLORS.white,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {treatmentOrders[planIdx]?.[medIdx] ? (
                          <>
                            <Check style={{ width: 14, height: 14 }} /> Ordered
                          </>
                        ) : (
                          <>
                            <ShoppingCart style={{ width: 14, height: 14 }} /> Order
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Non-pharmacological */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gray500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Non-Pharmacological
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.nonPharm.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: COLORS.gray600 }}>
                    <CheckCircle style={{ width: 14, height: 14, color: COLORS.lightTeal, flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pharmacy Sidebar */}
      <div style={{ width: 280, flexShrink: 0 }} className="pharmacy-sidebar">
        <div style={{ ...cardStyle, position: 'sticky', top: 80 }}>
          <div style={{ ...cardHeaderStyle, background: COLORS.paleMint }}>
            <Package style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            <span style={{ color: COLORS.deepNavy }}>Pharmacy Inventory</span>
          </div>
          <div style={{ padding: 12 }}>
            {S_PHARMACY_INVENTORY.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 8px',
                  borderBottom: i < S_PHARMACY_INVENTORY.length - 1 ? `1px solid ${COLORS.gray100}` : 'none',
                }}
              >
                <div style={{ fontSize: 12, color: COLORS.deepNavy, fontWeight: 500, flex: 1 }}>{item.name}</div>
                {item.inStock ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.green600 }}>{item.quantity}</span>
                ) : (
                  <PackageX style={{ width: 14, height: 14, color: COLORS.coral }} />
                )}
              </div>
            ))}
            {S_PHARMACY_INVENTORY.filter(item => !item.inStock).map((item, i) => (
              <div key={i} style={{ marginTop: 12, padding: '10px 8px', background: COLORS.amber50, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>OUT OF STOCK</div>
                <div style={{ fontSize: 12, color: '#78350f' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: COLORS.gray500, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw style={{ width: 12, height: 12 }} />
                  Available via pharmacy order
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // TAB 4 -- DOCUMENTATION
  // ============================================================
  const renderDocumentation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <FileText style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          SOAP Note -- Auto-Generated
          <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray500, fontWeight: 500 }}>
            Last updated: {S_PATIENT.appointmentDate} {S_PATIENT.appointmentTime}
          </span>
        </div>
        <div style={cardBodyStyle}>
          {(
            [
              { key: 'subjective' as const, label: 'Subjective', color: COLORS.primaryTeal },
              { key: 'objective' as const, label: 'Objective', color: COLORS.lightTeal },
              { key: 'assessment' as const, label: 'Assessment', color: COLORS.gold },
              { key: 'plan' as const, label: 'Plan', color: COLORS.coral },
            ] as const
          ).map(section => (
            <div key={section.key} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: section.color,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div style={{ width: 4, height: 16, borderRadius: 2, background: section.color }} />
                {section.label}
              </div>
              <textarea
                value={soapNote[section.key]}
                onChange={e => setSoapNote(prev => ({ ...prev, [section.key]: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: section.key === 'plan' ? 180 : 120,
                  border: `1px solid ${COLORS.gray200}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                  color: COLORS.deepNavy,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Billing Codes */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <ClipboardList style={{ width: 16, height: 16, color: COLORS.gold }} />
          Suggested Billing Codes
        </div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {billingCodes.map((bc, i) => (
              <div
                key={i}
                onClick={() => toggleBillingCode(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${bc.selected ? '#bbf7d0' : COLORS.gray200}`,
                  background: bc.selected ? COLORS.green50 : COLORS.white,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `2px solid ${bc.selected ? COLORS.green500 : COLORS.gray300}`,
                    background: bc.selected ? COLORS.green500 : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {bc.selected && <Check style={{ width: 12, height: 12, color: COLORS.white }} />}
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.deepNavy, minWidth: 70 }}>{bc.code}</span>
                <span style={{ fontSize: 13, color: COLORS.gray600 }}>{bc.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Finalize */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 40px',
            borderRadius: 12,
            border: 'none',
            background: `linear-gradient(135deg, ${COLORS.primaryTeal}, ${COLORS.lightTeal})`,
            color: COLORS.white,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26, 143, 168, 0.3)',
          }}
        >
          <CheckCircle style={{ width: 20, height: 20 }} />
          Finalize &amp; Sign Note
        </button>
      </div>
    </div>
  );

  // ============================================================
  // TAB 5 -- PATIENT HISTORY
  // ============================================================
  const renderHistory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Past Visits Timeline */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Clock style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          Past Visits
        </div>
        <div>
          {S_PAST_VISITS.map((visit, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
              <div
                onClick={() => setExpandedVisit(expandedVisit === i ? null : i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: COLORS.primaryTeal,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.gray500, minWidth: 90 }}>{visit.date}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.deepNavy }}>{visit.complaint}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: COLORS.gray500 }}>{visit.provider}</span>
                  {expandedVisit === i
                    ? <ChevronDown style={{ width: 14, height: 14, color: COLORS.gray500 }} />
                    : <ChevronRight style={{ width: 14, height: 14, color: COLORS.gray500 }} />}
                </div>
              </div>
              {expandedVisit === i && (
                <div style={{ padding: '0 20px 16px 56px' }}>
                  <div style={{ padding: 14, borderRadius: 8, background: COLORS.gray50, border: `1px solid ${COLORS.gray200}` }}>
                    <div style={{ fontSize: 13, color: COLORS.gray600, lineHeight: 1.6 }}>
                      <strong style={{ color: COLORS.deepNavy }}>Diagnosis:</strong> {visit.diagnosis}<br />
                      <strong style={{ color: COLORS.deepNavy }}>Notes:</strong> {visit.notes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="encounter-grid-2col">
        {/* Chronic Conditions */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Heart style={{ width: 16, height: 16, color: COLORS.coral }} />
            Chronic Conditions
          </div>
          <div style={cardBodyStyle}>
            {S_CHRONIC_CONDITIONS.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < S_CHRONIC_CONDITIONS.length - 1 ? `1px solid ${COLORS.gray100}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>Since {c.since}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryTeal, padding: '3px 10px', borderRadius: 12, background: COLORS.paleMint }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Surgical History */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Stethoscope style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Surgical History
          </div>
          <div style={cardBodyStyle}>
            {S_SURGICAL_HISTORY.map((s, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < S_SURGICAL_HISTORY.length - 1 ? `1px solid ${COLORS.gray100}` : 'none' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>{s.procedure}</div>
                <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>{s.date} &middot; {s.notes}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Family History */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <User style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Family History
          </div>
          <div style={cardBodyStyle}>
            {S_FAMILY_HISTORY.map((f, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < S_FAMILY_HISTORY.length - 1 ? `1px solid ${COLORS.gray100}` : 'none' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>{f.relation}</div>
                <div style={{ fontSize: 13, color: COLORS.gray600, marginTop: 2 }}>{f.conditions}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Social History */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Calendar style={{ width: 16, height: 16, color: COLORS.gold }} />
            Social History
          </div>
          <div style={cardBodyStyle}>
            {Object.entries(S_SOCIAL_HISTORY).map(([key, value], i) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Object.entries(S_SOCIAL_HISTORY).length - 1 ? `1px solid ${COLORS.gray100}` : 'none' }}>
                <span style={{ fontSize: 13, color: COLORS.gray500, textTransform: 'capitalize' }}>{key}</span>
                <span style={{ fontSize: 13, color: COLORS.deepNavy, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Link to Full Chart */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <Link
          href={`/patient/${patientId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: 10,
            border: `1px solid ${COLORS.primaryTeal}`,
            background: 'transparent',
            color: COLORS.primaryTeal,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ExternalLink style={{ width: 16, height: 16 }} />
          View Full Patient Chart
        </Link>
      </div>
    </div>
  );

  // ============================================================
  // Tab Content Router
  // ============================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'previsit': return renderPreVisit();
      case 'differential': return renderDifferential();
      case 'treatment': return renderTreatment();
      case 'documentation': return renderDocumentation();
      case 'history': return renderHistory();
      default: return renderPreVisit();
    }
  };

  // ============================================================
  // AMBIENT LISTENING SIDEBAR
  // ============================================================
  const renderAmbientSidebar = () => {
    if (!visitActive) return null;

    if (ambientMinimized) {
      return (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 100,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.primaryTeal}, ${COLORS.lightTeal})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(26, 143, 168, 0.4)',
          }}
          onClick={() => setAmbientMinimized(false)}
        >
          <Mic style={{ width: 24, height: 24, color: COLORS.white }} />
          {!ambientPaused && (
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: `2px solid ${COLORS.primaryTeal}`,
                animation: 'pulse-ring 2s infinite',
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 100,
          width: 280,
          maxHeight: 'calc(100vh - 104px)',
          borderRadius: 16,
          background: COLORS.white,
          border: `1px solid ${COLORS.gray200}`,
          boxShadow: '0 8px 32px rgba(12, 53, 71, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            background: `linear-gradient(135deg, ${COLORS.deepNavy}, ${COLORS.midTeal})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Mic style={{ width: 18, height: 18, color: ambientPaused ? COLORS.gray500 : '#4ade80' }} />
              {!ambientPaused && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    animation: 'pulse-dot 1.5s infinite',
                  }}
                />
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.white }}>
              {ambientPaused ? 'Paused' : 'Listening...'}
            </span>
          </div>
          <button
            onClick={() => setAmbientMinimized(true)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              padding: 4,
            }}
            aria-label="Minimize ambient listening"
          >
            <Minimize2 style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            maxHeight: 260,
          }}
        >
          {S_AMBIENT_TRANSCRIPT_LINES.slice(0, transcriptIdx).map((line, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: COLORS.gray500 }}>{line.time}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: line.speaker === 'Patient' ? COLORS.coral : COLORS.primaryTeal,
                  }}
                >
                  {line.speaker}
                </span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray700, lineHeight: 1.5 }}>{line.text}</div>
            </div>
          ))}
          {transcriptIdx === 0 && !ambientPaused && (
            <div style={{ textAlign: 'center', padding: 16, color: COLORS.gray500, fontSize: 12 }}>
              Waiting for audio...
            </div>
          )}
        </div>

        {/* Extracted Entities */}
        {transcriptIdx > 0 && (
          <div style={{ borderTop: `1px solid ${COLORS.gray200}`, padding: '10px 14px', maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Extracted Entities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {S_EXTRACTED_ENTITIES.filter(entity => {
                const lineTimeIdx = S_AMBIENT_TRANSCRIPT_LINES.findIndex(l => l.time === entity.time);
                return lineTimeIdx < transcriptIdx;
              }).map((entity, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: entity.type === 'Symptom' ? COLORS.red50
                      : entity.type === 'Medication' ? COLORS.blue50
                      : COLORS.paleMint,
                    color: entity.type === 'Symptom' ? COLORS.red600
                      : entity.type === 'Medication' ? COLORS.blue500
                      : COLORS.primaryTeal,
                  }}
                >
                  {entity.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: `1px solid ${COLORS.gray200}`,
            display: 'flex',
            gap: 6,
          }}
        >
          <button
            onClick={() => setAmbientPaused(!ambientPaused)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '8px 0',
              borderRadius: 8,
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.white,
              color: COLORS.deepNavy,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ambientPaused ? (
              <>
                <Play style={{ width: 14, height: 14 }} /> Resume
              </>
            ) : (
              <>
                <Pause style={{ width: 14, height: 14 }} /> Pause
              </>
            )}
          </button>
          <button
            onClick={endVisit}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: COLORS.coral,
              color: COLORS.white,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Square style={{ width: 14, height: 14 }} /> End Visit
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <ProviderShell contextBadge="Encounter" showNav={false}>
      <Head>
        <title>Encounter - {S_PATIENT.name} | ATTENDING AI</title>
      </Head>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .encounter-grid-2col {
          grid-template-columns: 1fr 1fr;
        }
        .vitals-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .pharmacy-sidebar {
          width: 280px;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .encounter-grid-2col {
            grid-template-columns: 1fr !important;
          }
          .differential-flex-container {
            flex-direction: column !important;
          }
          .differential-sidebar {
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .treatment-flex-container {
            flex-direction: column !important;
          }
          .pharmacy-sidebar {
            width: 100% !important;
            flex-shrink: 1 !important;
          }
          button, [role="button"] {
            min-height: 44px;
            min-width: 44px;
          }
        }
        @media (max-width: 768px) {
          .vitals-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </button>

        {/* Patient Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.lightTeal}, ${COLORS.primaryTeal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.white, fontSize: 16, fontWeight: 800, flexShrink: 0,
            }}>
              {S_PATIENT.initials}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.white }}>{S_PATIENT.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                {S_PATIENT.age}{S_PATIENT.gender === 'Female' ? 'F' : 'M'} &middot; {S_PATIENT.mrn} &middot; {S_PATIENT.insurance}
              </div>
            </div>
          </div>
          <button
            onClick={() => setChartDrawerOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)', color: COLORS.white,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <FolderOpen style={{ width: 16, height: 16 }} />
            Patient Chart
          </button>
        </div>

        {/* Scenario Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Demo Patient:
          </span>
          {(Object.keys(PATIENT_SCENARIOS) as ScenarioKey[]).map(key => (
            <button
              key={key}
              onClick={() => switchScenario(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: activeScenario === key ? 'none' : '1px solid rgba(255,255,255,0.25)',
                background: activeScenario === key
                  ? `linear-gradient(135deg, ${COLORS.gold}, #d4a843)`
                  : 'rgba(255,255,255,0.08)',
                color: activeScenario === key ? COLORS.white : 'rgba(255,255,255,0.7)',
                fontSize: 12,
                fontWeight: activeScenario === key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeScenario === key ? '0 2px 8px rgba(200, 164, 78, 0.3)' : 'none',
              }}
            >
              {PATIENT_SCENARIOS[key].label}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            borderBottom: '2px solid rgba(255,255,255,0.15)',
            marginBottom: 24,
            overflowX: 'auto',
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? COLORS.white : 'rgba(255,255,255,0.55)',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `3px solid ${COLORS.gold}` : '3px solid transparent',
                  marginBottom: -2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon style={{ width: 15, height: 15, color: active ? COLORS.gold : 'rgba(255,255,255,0.4)' }} />
                {tab.label}
              </button>
            );
          })}

          {/* Visit status indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8 }}>
            {visitActive && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: ambientPaused ? 'rgba(255,255,255,0.1)' : 'rgba(74, 222, 128, 0.2)',
                  color: ambientPaused ? 'rgba(255,255,255,0.6)' : '#4ade80',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: ambientPaused ? 'rgba(255,255,255,0.4)' : '#4ade80',
                    animation: ambientPaused ? 'none' : 'pulse-dot 1.5s infinite',
                  }}
                />
                {ambientPaused ? 'Visit Paused' : 'Visit Active'}
              </span>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ paddingRight: visitActive && !ambientMinimized ? 300 : 0, transition: 'padding-right 0.3s ease' }}>
          {renderTabContent()}
        </div>
      </div>

      {/* Quick Chart Drawer — accessible from ANY tab */}
      {chartDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setChartDrawerOpen(false)}
            style={{ flex: 1, background: 'rgba(12, 53, 71, 0.3)', backdropFilter: 'blur(2px)' }}
          />
          {/* Drawer */}
          <div
            style={{
              width: 420,
              background: COLORS.white,
              boxShadow: '-8px 0 32px rgba(12, 53, 71, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '16px 20px',
              background: `linear-gradient(135deg, ${COLORS.deepNavy}, ${COLORS.midTeal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen style={{ width: 18, height: 18, color: COLORS.lightTeal }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>Quick Chart</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{S_PATIENT.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link
                  href={`/patient/${patientId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Maximize2 style={{ width: 12, height: 12 }} /> Full Chart
                </Link>
                <button
                  onClick={() => setChartDrawerOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }}
                  aria-label="Close patient chart drawer"
                >
                  <XCircle style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.gray200}` }}>
              {([
                { id: 'meds' as const, label: 'Medications', icon: Pill },
                { id: 'allergies' as const, label: 'Allergies', icon: Shield },
                { id: 'labs' as const, label: 'Labs', icon: TestTube },
                { id: 'history' as const, label: 'Visits', icon: Clock },
              ]).map(tab => {
                const Icon = tab.icon;
                const active = chartDrawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setChartDrawerTab(tab.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '10px 0', fontSize: 12, fontWeight: active ? 700 : 500,
                      color: active ? COLORS.primaryTeal : COLORS.gray500,
                      borderBottom: active ? `2px solid ${COLORS.primaryTeal}` : '2px solid transparent',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <Icon style={{ width: 13, height: 13 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {chartDrawerTab === 'meds' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Active Medications ({S_FULL_MEDICATION_LIST.length})
                  </div>
                  {S_FULL_MEDICATION_LIST.map((med, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                      border: `1px solid ${COLORS.gray200}`, background: COLORS.gray50,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.deepNavy }}>{med.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: COLORS.paleMint, color: COLORS.primaryTeal }}>
                          {med.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 4 }}>
                        {med.route} · {med.frequency} · {med.purpose}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.gray500, marginTop: 2 }}>
                        Rx by {med.prescriber} · Since {med.since}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {chartDrawerTab === 'allergies' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Known Allergies ({S_ALLERGIES.length})
                  </div>
                  {S_ALLERGIES.map((allergy, i) => (
                    <div key={i} style={{
                      padding: '14px 16px', marginBottom: 8, borderRadius: 10,
                      border: `1px solid ${COLORS.red100}`, background: COLORS.red50,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.red600 }}>{allergy.substance}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
                          background: allergy.severity === 'Moderate' ? COLORS.red100 : '#fef3c7',
                          color: allergy.severity === 'Moderate' ? COLORS.red600 : '#92400e',
                        }}>
                          {allergy.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.red600, marginTop: 4 }}>
                        Reaction: {allergy.reaction}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    padding: '12px', borderRadius: 8, background: COLORS.amber50,
                    border: '1px solid #fde68a', marginTop: 12,
                    fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <Info style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                    Verify allergies with patient at each visit. Last confirmed: 01/15/2026
                  </div>
                </div>
              )}

              {chartDrawerTab === 'labs' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Recent Lab Results — 01/15/2026
                  </div>
                  {S_RECENT_LABS.map((lab, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', marginBottom: 6, borderRadius: 8,
                      border: `1px solid ${lab.flag ? COLORS.red100 : COLORS.gray200}`,
                      background: lab.flag ? COLORS.red50 : COLORS.white,
                    }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.deepNavy }}>{lab.test}</span>
                        <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>{lab.date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: lab.flag ? COLORS.red600 : COLORS.deepNavy }}>
                          {lab.result}
                        </span>
                        {lab.flag && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.red600, marginTop: 1 }}>
                            {lab.flag}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {chartDrawerTab === 'history' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Recent Visits
                  </div>
                  {S_PAST_VISITS.map((visit, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                      border: `1px solid ${COLORS.gray200}`, background: COLORS.gray50,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.deepNavy }}>{visit.complaint}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray500 }}>{visit.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.gray500, marginTop: 4 }}>
                        {visit.provider} — {visit.diagnosis}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4, lineHeight: 1.5 }}>
                        {visit.notes}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Ambient Listening Sidebar */}
      {renderAmbientSidebar()}

      {/* Guidelines Modal */}
      <GuidelinesModal
        isOpen={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        diagnosis={guidelinesDiag}
      />
    </ProviderShell>
  );
};

export default EncounterPage;
