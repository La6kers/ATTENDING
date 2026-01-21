// ============================================================
// ATTENDING AI - Evidence-Based Decision Support
// apps/provider-portal/components/decision-support/ClinicalDecisionSupport.tsx
//
// Phase 10A: Clinical calculators, drug info, and guidelines
// Evidence at the point of care
// ============================================================

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  Pill,
  BookOpen,
  Search,
  Star,
  Clock,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Activity,
  Thermometer,
  Droplet,
  Brain,
  Bone,
  Wind,
  Baby,
  User,
  Shield,
  Beaker,
  FileText,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type CalculatorCategory = 
  | 'cardiovascular' 
  | 'renal' 
  | 'pulmonary' 
  | 'neurology' 
  | 'gastro' 
  | 'endo' 
  | 'infectious' 
  | 'hematology'
  | 'pediatric'
  | 'obstetric'
  | 'general';

export interface ClinicalCalculator {
  id: string;
  name: string;
  shortName: string;
  category: CalculatorCategory;
  description: string;
  inputs: CalculatorInput[];
  formula: (values: Record<string, number | string>) => CalculatorResult;
  references: string[];
  isFavorite?: boolean;
  usageCount?: number;
}

export interface CalculatorInput {
  id: string;
  label: string;
  type: 'number' | 'select' | 'checkbox';
  unit?: string;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  default?: number | string;
  required?: boolean;
  hint?: string;
}

export interface CalculatorResult {
  value: number | string;
  interpretation: string;
  riskLevel?: 'low' | 'moderate' | 'high' | 'very-high';
  recommendations?: string[];
  details?: Record<string, string | number>;
}

export interface DrugInfo {
  id: string;
  genericName: string;
  brandNames: string[];
  drugClass: string;
  indications: string[];
  dosing: DosingInfo[];
  contraindications: string[];
  warnings: string[];
  interactions: DrugInteraction[];
  pregnancyCategory: string;
  lactationSafety: string;
  renalDosing?: string;
  hepaticDosing?: string;
  pediatricDosing?: string;
  monitoring: string[];
  adverseEffects: Array<{ effect: string; frequency: string }>;
}

export interface DosingInfo {
  indication: string;
  route: string;
  adultDose: string;
  frequency: string;
  maxDose?: string;
  notes?: string;
}

export interface DrugInteraction {
  drug: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  management: string;
}

export interface ClinicalGuideline {
  id: string;
  title: string;
  organization: string;
  year: number;
  category: string;
  summary: string;
  keyPoints: string[];
  recommendations: GuidelineRecommendation[];
  link?: string;
}

export interface GuidelineRecommendation {
  text: string;
  strength: 'strong' | 'moderate' | 'weak';
  evidence: 'high' | 'moderate' | 'low' | 'very-low';
}

// ============================================================
// CLINICAL CALCULATORS DATA
// ============================================================

const CALCULATORS: ClinicalCalculator[] = [
  {
    id: 'ckd-epi',
    name: 'CKD-EPI Creatinine Equation',
    shortName: 'eGFR (CKD-EPI)',
    category: 'renal',
    description: 'Estimates glomerular filtration rate based on serum creatinine, age, sex, and race',
    inputs: [
      { id: 'creatinine', label: 'Serum Creatinine', type: 'number', unit: 'mg/dL', min: 0.1, max: 20, required: true },
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120, required: true },
      { id: 'sex', label: 'Sex', type: 'select', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], required: true },
    ],
    formula: (values) => {
      const cr = values.creatinine as number;
      const age = values.age as number;
      const isFemale = values.sex === 'female';
      
      const kappa = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.241 : -0.302;
      const sexMultiplier = isFemale ? 1.012 : 1;
      
      const crKappa = cr / kappa;
      const minCrKappa = Math.min(crKappa, 1);
      const maxCrKappa = Math.max(crKappa, 1);
      
      const eGFR = 142 * Math.pow(minCrKappa, alpha) * Math.pow(maxCrKappa, -1.200) * Math.pow(0.9938, age) * sexMultiplier;
      const roundedGFR = Math.round(eGFR);
      
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
      
      if (roundedGFR >= 90) {
        interpretation = 'G1: Normal or high kidney function';
        riskLevel = 'low';
      } else if (roundedGFR >= 60) {
        interpretation = 'G2: Mildly decreased kidney function';
        riskLevel = 'low';
      } else if (roundedGFR >= 45) {
        interpretation = 'G3a: Mild to moderately decreased kidney function';
        riskLevel = 'moderate';
      } else if (roundedGFR >= 30) {
        interpretation = 'G3b: Moderate to severely decreased kidney function';
        riskLevel = 'high';
      } else if (roundedGFR >= 15) {
        interpretation = 'G4: Severely decreased kidney function';
        riskLevel = 'very-high';
      } else {
        interpretation = 'G5: Kidney failure';
        riskLevel = 'very-high';
      }
      
      return {
        value: roundedGFR,
        interpretation,
        riskLevel,
        recommendations: roundedGFR < 60 ? [
          'Consider nephrology referral',
          'Review medications for renal dosing',
          'Monitor for CKD complications',
        ] : [],
        details: {
          'CKD Stage': interpretation.split(':')[0],
        },
      };
    },
    references: ['Levey AS, et al. Ann Intern Med. 2021'],
  },
  {
    id: 'chads-vasc',
    name: 'CHA₂DS₂-VASc Score',
    shortName: 'CHA₂DS₂-VASc',
    category: 'cardiovascular',
    description: 'Stroke risk stratification in patients with atrial fibrillation',
    inputs: [
      { id: 'chf', label: 'Congestive Heart Failure', type: 'checkbox', hint: '+1 point' },
      { id: 'hypertension', label: 'Hypertension', type: 'checkbox', hint: '+1 point' },
      { id: 'age75', label: 'Age ≥75 years', type: 'checkbox', hint: '+2 points' },
      { id: 'diabetes', label: 'Diabetes Mellitus', type: 'checkbox', hint: '+1 point' },
      { id: 'stroke', label: 'Stroke/TIA/Thromboembolism', type: 'checkbox', hint: '+2 points' },
      { id: 'vascular', label: 'Vascular Disease', type: 'checkbox', hint: '+1 point' },
      { id: 'age65', label: 'Age 65-74 years', type: 'checkbox', hint: '+1 point' },
      { id: 'female', label: 'Female Sex', type: 'checkbox', hint: '+1 point' },
    ],
    formula: (values) => {
      let score = 0;
      if (values.chf) score += 1;
      if (values.hypertension) score += 1;
      if (values.age75) score += 2;
      if (values.diabetes) score += 1;
      if (values.stroke) score += 2;
      if (values.vascular) score += 1;
      if (values.age65 && !values.age75) score += 1;
      if (values.female) score += 1;
      
      const riskByScore: Record<number, string> = {
        0: '0.2%',
        1: '0.6%',
        2: '2.2%',
        3: '3.2%',
        4: '4.8%',
        5: '7.2%',
        6: '9.7%',
        7: '11.2%',
        8: '10.8%',
        9: '12.2%',
      };
      
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
      let recommendations: string[] = [];
      
      if (score === 0) {
        interpretation = 'Low risk - No anticoagulation recommended';
        riskLevel = 'low';
        recommendations = ['Consider aspirin or no antithrombotic therapy'];
      } else if (score === 1) {
        interpretation = 'Low-moderate risk - Consider anticoagulation';
        riskLevel = 'moderate';
        recommendations = ['Consider oral anticoagulation', 'Weigh bleeding risk with HAS-BLED'];
      } else {
        interpretation = 'Moderate-high risk - Anticoagulation recommended';
        riskLevel = score >= 4 ? 'very-high' : 'high';
        recommendations = ['Oral anticoagulation recommended', 'Calculate HAS-BLED score', 'Consider DOAC over warfarin'];
      }
      
      return {
        value: score,
        interpretation,
        riskLevel,
        recommendations,
        details: {
          'Annual Stroke Risk': riskByScore[Math.min(score, 9)] || '>12%',
        },
      };
    },
    references: ['Lip GY, et al. Chest. 2010'],
  },
  {
    id: 'wells-dvt',
    name: "Wells' Criteria for DVT",
    shortName: 'Wells DVT',
    category: 'cardiovascular',
    description: 'Clinical prediction rule for deep vein thrombosis probability',
    inputs: [
      { id: 'cancer', label: 'Active cancer', type: 'checkbox', hint: '+1 point' },
      { id: 'paralysis', label: 'Paralysis/immobilization of lower extremity', type: 'checkbox', hint: '+1 point' },
      { id: 'bedridden', label: 'Bedridden >3 days or major surgery <12 weeks', type: 'checkbox', hint: '+1 point' },
      { id: 'tenderness', label: 'Localized tenderness along deep venous system', type: 'checkbox', hint: '+1 point' },
      { id: 'swelling', label: 'Entire leg swollen', type: 'checkbox', hint: '+1 point' },
      { id: 'calf', label: 'Calf swelling >3cm compared to other leg', type: 'checkbox', hint: '+1 point' },
      { id: 'edema', label: 'Pitting edema in symptomatic leg', type: 'checkbox', hint: '+1 point' },
      { id: 'collateral', label: 'Collateral superficial veins', type: 'checkbox', hint: '+1 point' },
      { id: 'previous', label: 'Previously documented DVT', type: 'checkbox', hint: '+1 point' },
      { id: 'alternative', label: 'Alternative diagnosis as likely as DVT', type: 'checkbox', hint: '-2 points' },
    ],
    formula: (values) => {
      let score = 0;
      if (values.cancer) score += 1;
      if (values.paralysis) score += 1;
      if (values.bedridden) score += 1;
      if (values.tenderness) score += 1;
      if (values.swelling) score += 1;
      if (values.calf) score += 1;
      if (values.edema) score += 1;
      if (values.collateral) score += 1;
      if (values.previous) score += 1;
      if (values.alternative) score -= 2;
      
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
      let recommendations: string[] = [];
      
      if (score <= 0) {
        interpretation = 'Low probability (5% prevalence)';
        riskLevel = 'low';
        recommendations = ['Check D-dimer', 'If D-dimer negative, DVT unlikely', 'If D-dimer positive, order ultrasound'];
      } else if (score <= 2) {
        interpretation = 'Moderate probability (17% prevalence)';
        riskLevel = 'moderate';
        recommendations = ['Check D-dimer', 'Consider ultrasound', 'If both negative, DVT unlikely'];
      } else {
        interpretation = 'High probability (53% prevalence)';
        riskLevel = 'high';
        recommendations = ['Order compression ultrasound', 'Consider empiric anticoagulation while awaiting results'];
      }
      
      return {
        value: score,
        interpretation,
        riskLevel,
        recommendations,
      };
    },
    references: ['Wells PS, et al. Lancet. 1997'],
  },
  {
    id: 'meld',
    name: 'MELD Score',
    shortName: 'MELD',
    category: 'gastro',
    description: 'Model for End-Stage Liver Disease - predicts 3-month mortality in liver disease',
    inputs: [
      { id: 'creatinine', label: 'Creatinine', type: 'number', unit: 'mg/dL', min: 0.1, max: 15, required: true },
      { id: 'bilirubin', label: 'Bilirubin', type: 'number', unit: 'mg/dL', min: 0.1, max: 50, required: true },
      { id: 'inr', label: 'INR', type: 'number', min: 0.5, max: 10, required: true },
      { id: 'dialysis', label: 'Dialysis twice in past week', type: 'checkbox' },
    ],
    formula: (values) => {
      let cr = Math.max(1, Math.min(values.creatinine as number, 4));
      if (values.dialysis) cr = 4;
      const bili = Math.max(1, values.bilirubin as number);
      const inr = Math.max(1, values.inr as number);
      
      const meld = Math.round(
        10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.12 * Math.log(inr) + 0.643)
      );
      
      const clampedMeld = Math.max(6, Math.min(40, meld));
      
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
      
      if (clampedMeld < 10) {
        interpretation = '3-month mortality: 1.9%';
        riskLevel = 'low';
      } else if (clampedMeld < 20) {
        interpretation = '3-month mortality: 6.0%';
        riskLevel = 'moderate';
      } else if (clampedMeld < 30) {
        interpretation = '3-month mortality: 19.6%';
        riskLevel = 'high';
      } else {
        interpretation = '3-month mortality: 52.6%';
        riskLevel = 'very-high';
      }
      
      return {
        value: clampedMeld,
        interpretation,
        riskLevel,
        recommendations: clampedMeld >= 15 ? ['Consider hepatology referral', 'Evaluate for liver transplant candidacy'] : [],
      };
    },
    references: ['Kamath PS, et al. Hepatology. 2001'],
  },
  {
    id: 'curb65',
    name: 'CURB-65 Score',
    shortName: 'CURB-65',
    category: 'pulmonary',
    description: 'Severity assessment for community-acquired pneumonia',
    inputs: [
      { id: 'confusion', label: 'Confusion', type: 'checkbox', hint: '+1 point' },
      { id: 'bun', label: 'BUN >19 mg/dL (>7 mmol/L)', type: 'checkbox', hint: '+1 point' },
      { id: 'rr', label: 'Respiratory rate ≥30/min', type: 'checkbox', hint: '+1 point' },
      { id: 'bp', label: 'BP: Systolic <90 or Diastolic ≤60', type: 'checkbox', hint: '+1 point' },
      { id: 'age', label: 'Age ≥65 years', type: 'checkbox', hint: '+1 point' },
    ],
    formula: (values) => {
      let score = 0;
      if (values.confusion) score += 1;
      if (values.bun) score += 1;
      if (values.rr) score += 1;
      if (values.bp) score += 1;
      if (values.age) score += 1;
      
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
      let recommendations: string[] = [];
      
      if (score <= 1) {
        interpretation = 'Low severity - 30-day mortality <3%';
        riskLevel = 'low';
        recommendations = ['Consider outpatient treatment', 'Oral antibiotics appropriate'];
      } else if (score === 2) {
        interpretation = 'Moderate severity - 30-day mortality 9%';
        riskLevel = 'moderate';
        recommendations = ['Consider short hospital stay', 'Close outpatient follow-up if discharged'];
      } else {
        interpretation = 'Severe pneumonia - 30-day mortality 15-40%';
        riskLevel = score >= 4 ? 'very-high' : 'high';
        recommendations = ['Hospital admission required', 'Consider ICU if score ≥4', 'IV antibiotics'];
      }
      
      return {
        value: score,
        interpretation,
        riskLevel,
        recommendations,
      };
    },
    references: ['Lim WS, et al. Thorax. 2003'],
  },
];

// ============================================================
// DRUG DATABASE (SAMPLE)
// ============================================================

const DRUGS: DrugInfo[] = [
  {
    id: 'metformin',
    genericName: 'Metformin',
    brandNames: ['Glucophage', 'Glumetza', 'Fortamet', 'Riomet'],
    drugClass: 'Biguanide',
    indications: ['Type 2 Diabetes Mellitus', 'Prediabetes', 'PCOS'],
    dosing: [
      { indication: 'Type 2 Diabetes', route: 'Oral', adultDose: '500mg', frequency: 'BID with meals', maxDose: '2550mg/day', notes: 'Titrate slowly to reduce GI side effects' },
      { indication: 'Type 2 Diabetes (ER)', route: 'Oral', adultDose: '500-1000mg', frequency: 'Once daily with dinner', maxDose: '2000mg/day' },
    ],
    contraindications: ['eGFR <30 mL/min/1.73m²', 'Metabolic acidosis', 'Acute or chronic metabolic acidosis'],
    warnings: ['Lactic acidosis (rare but serious)', 'Hold before and 48h after iodinated contrast', 'Vitamin B12 deficiency with long-term use'],
    interactions: [
      { drug: 'Alcohol', severity: 'major', description: 'Increased risk of lactic acidosis', management: 'Limit alcohol intake' },
      { drug: 'Iodinated contrast', severity: 'major', description: 'Increased risk of contrast-induced nephropathy and lactic acidosis', management: 'Hold 48h before and after contrast' },
      { drug: 'Carbonic anhydrase inhibitors', severity: 'moderate', description: 'Increased risk of lactic acidosis', management: 'Monitor closely' },
    ],
    pregnancyCategory: 'B',
    lactationSafety: 'Compatible with breastfeeding',
    renalDosing: 'eGFR 30-45: Max 1000mg/day; eGFR <30: Contraindicated',
    hepaticDosing: 'Avoid in hepatic impairment',
    monitoring: ['Renal function annually', 'Vitamin B12 levels periodically', 'HbA1c every 3-6 months'],
    adverseEffects: [
      { effect: 'Diarrhea', frequency: '10-53%' },
      { effect: 'Nausea/vomiting', frequency: '7-26%' },
      { effect: 'Flatulence', frequency: '12%' },
      { effect: 'Abdominal discomfort', frequency: '6%' },
      { effect: 'Vitamin B12 deficiency', frequency: '7%' },
    ],
  },
  {
    id: 'lisinopril',
    genericName: 'Lisinopril',
    brandNames: ['Prinivil', 'Zestril', 'Qbrelis'],
    drugClass: 'ACE Inhibitor',
    indications: ['Hypertension', 'Heart Failure', 'Post-MI', 'Diabetic Nephropathy'],
    dosing: [
      { indication: 'Hypertension', route: 'Oral', adultDose: '10mg', frequency: 'Once daily', maxDose: '80mg/day', notes: 'Start 5mg if on diuretic' },
      { indication: 'Heart Failure', route: 'Oral', adultDose: '2.5-5mg', frequency: 'Once daily', maxDose: '40mg/day', notes: 'Titrate to target dose' },
    ],
    contraindications: ['Angioedema history with ACE inhibitor', 'Pregnancy', 'Bilateral renal artery stenosis'],
    warnings: ['Angioedema', 'Hyperkalemia', 'Hypotension (first dose)', 'Acute kidney injury', 'Cough'],
    interactions: [
      { drug: 'Potassium supplements', severity: 'major', description: 'Hyperkalemia risk', management: 'Monitor potassium closely' },
      { drug: 'NSAIDs', severity: 'moderate', description: 'Reduced antihypertensive effect, increased renal risk', management: 'Avoid long-term NSAID use' },
      { drug: 'Lithium', severity: 'major', description: 'Increased lithium levels', management: 'Monitor lithium levels closely' },
    ],
    pregnancyCategory: 'D',
    lactationSafety: 'Compatible with breastfeeding',
    renalDosing: 'CrCl 10-30: Start 2.5-5mg; CrCl <10: Start 2.5mg',
    monitoring: ['Blood pressure', 'Potassium', 'Creatinine', 'Watch for cough, angioedema'],
    adverseEffects: [
      { effect: 'Cough', frequency: '3-10%' },
      { effect: 'Hypotension', frequency: '1-5%' },
      { effect: 'Dizziness', frequency: '5-12%' },
      { effect: 'Hyperkalemia', frequency: '2-5%' },
      { effect: 'Angioedema', frequency: '<1%' },
    ],
  },
];

// ============================================================
// GUIDELINES (SAMPLE)
// ============================================================

const GUIDELINES: ClinicalGuideline[] = [
  {
    id: 'aha-htn-2017',
    title: 'Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults',
    organization: 'AHA/ACC',
    year: 2017,
    category: 'Cardiovascular',
    summary: 'Comprehensive guidelines for hypertension management with updated BP thresholds',
    keyPoints: [
      'Normal BP defined as <120/80 mmHg',
      'Elevated BP: 120-129/<80 mmHg',
      'Stage 1 HTN: 130-139/80-89 mmHg',
      'Stage 2 HTN: ≥140/≥90 mmHg',
      'BP goal <130/80 for most adults',
    ],
    recommendations: [
      { text: 'Recommend lifestyle modifications for all patients with elevated BP', strength: 'strong', evidence: 'high' },
      { text: 'Initiate antihypertensive medication for Stage 1 HTN with ASCVD or 10-year risk ≥10%', strength: 'strong', evidence: 'moderate' },
      { text: 'Recommend thiazide diuretics, CCBs, ACE inhibitors, or ARBs as first-line agents', strength: 'strong', evidence: 'high' },
      { text: 'Consider combination therapy for Stage 2 HTN (≥140/90) or BP >20/10 above goal', strength: 'moderate', evidence: 'moderate' },
    ],
    link: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
  },
  {
    id: 'ada-diabetes-2024',
    title: 'Standards of Care in Diabetes',
    organization: 'American Diabetes Association',
    year: 2024,
    category: 'Endocrinology',
    summary: 'Annual standards for comprehensive diabetes care and management',
    keyPoints: [
      'A1c goal <7% for most adults',
      'Individualize goals based on patient factors',
      'Metformin remains first-line therapy',
      'GLP-1 RA or SGLT2i for patients with ASCVD or CKD',
      'Regular screening for complications',
    ],
    recommendations: [
      { text: 'Recommend A1c testing at least twice yearly for patients meeting goals', strength: 'strong', evidence: 'high' },
      { text: 'Recommend GLP-1 RA or SGLT2i for patients with established ASCVD', strength: 'strong', evidence: 'high' },
      { text: 'Recommend SGLT2i for patients with heart failure or CKD', strength: 'strong', evidence: 'high' },
      { text: 'Consider CGM for patients on intensive insulin regimens', strength: 'moderate', evidence: 'moderate' },
    ],
    link: 'https://diabetesjournals.org/care',
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const CategoryIcon: React.FC<{ category: CalculatorCategory }> = ({ category }) => {
  const icons: Record<CalculatorCategory, React.ReactNode> = {
    cardiovascular: <Heart size={16} className="text-red-500" />,
    renal: <Droplet size={16} className="text-blue-500" />,
    pulmonary: <Wind size={16} className="text-cyan-500" />,
    neurology: <Brain size={16} className="text-purple-500" />,
    gastro: <Activity size={16} className="text-amber-500" />,
    endo: <Thermometer size={16} className="text-orange-500" />,
    infectious: <Shield size={16} className="text-green-500" />,
    hematology: <Beaker size={16} className="text-rose-500" />,
    pediatric: <Baby size={16} className="text-pink-500" />,
    obstetric: <User size={16} className="text-violet-500" />,
    general: <Calculator size={16} className="text-slate-500" />,
  };
  return icons[category] || icons.general;
};

const RiskBadge: React.FC<{ level: 'low' | 'moderate' | 'high' | 'very-high' }> = ({ level }) => {
  const config = {
    low: { color: 'bg-green-100 text-green-700', label: 'Low Risk' },
    moderate: { color: 'bg-amber-100 text-amber-700', label: 'Moderate Risk' },
    high: { color: 'bg-orange-100 text-orange-700', label: 'High Risk' },
    'very-high': { color: 'bg-red-100 text-red-700', label: 'Very High Risk' },
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[level].color}`}>
      {config[level].label}
    </span>
  );
};

const CalculatorCard: React.FC<{
  calculator: ClinicalCalculator;
  onSelect: (calc: ClinicalCalculator) => void;
}> = ({ calculator, onSelect }) => (
  <button
    onClick={() => onSelect(calculator)}
    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left w-full"
  >
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <CategoryIcon category={calculator.category} />
        <span className="text-xs text-slate-500 capitalize">{calculator.category}</span>
      </div>
      {calculator.isFavorite && <Star size={14} className="text-amber-500 fill-amber-500" />}
    </div>
    <h4 className="font-semibold text-slate-900 mb-1">{calculator.shortName}</h4>
    <p className="text-xs text-slate-500 line-clamp-2">{calculator.description}</p>
  </button>
);

const CalculatorPanel: React.FC<{
  calculator: ClinicalCalculator;
  onClose: () => void;
}> = ({ calculator, onClose }) => {
  const [values, setValues] = useState<Record<string, number | string | boolean>>({});
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCalculate = () => {
    const calcResult = calculator.formula(values as Record<string, number | string>);
    setResult(calcResult);
  };

  const handleCopy = () => {
    const text = `${calculator.name}: ${result?.value}\n${result?.interpretation}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={20} />
          <h3 className="font-semibold">{calculator.name}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <p className="text-sm text-slate-600">{calculator.description}</p>
        
        {/* Inputs */}
        <div className="space-y-3">
          {calculator.inputs.map(input => (
            <div key={input.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {input.label}
                {input.unit && <span className="text-slate-400 ml-1">({input.unit})</span>}
                {input.hint && <span className="text-xs text-slate-400 ml-2">{input.hint}</span>}
              </label>
              {input.type === 'number' && (
                <input
                  type="number"
                  min={input.min}
                  max={input.max}
                  value={values[input.id] as number || ''}
                  onChange={(e) => setValues({ ...values, [input.id]: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={`${input.min || 0} - ${input.max || 999}`}
                />
              )}
              {input.type === 'select' && (
                <select
                  value={values[input.id] as string || ''}
                  onChange={(e) => setValues({ ...values, [input.id]: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select...</option>
                  {input.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {input.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values[input.id] as boolean || false}
                    onChange={(e) => setValues({ ...values, [input.id]: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-600">Yes</span>
                </label>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={handleCalculate}
          className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Calculate
        </button>
        
        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.riskLevel === 'very-high' ? 'bg-red-50 border border-red-200' :
            result.riskLevel === 'high' ? 'bg-orange-50 border border-orange-200' :
            result.riskLevel === 'moderate' ? 'bg-amber-50 border border-amber-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-3xl font-bold text-slate-900">{result.value}</p>
                {result.riskLevel && <RiskBadge level={result.riskLevel} />}
              </div>
              <button onClick={handleCopy} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-slate-400" />}
              </button>
            </div>
            <p className="text-sm text-slate-700 mb-3">{result.interpretation}</p>
            
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">Recommendations:</p>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* References */}
        <div className="text-xs text-slate-400">
          <p className="font-medium mb-1">References:</p>
          {calculator.references.map((ref, idx) => (
            <p key={idx}>{ref}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

const DrugCard: React.FC<{ drug: DrugInfo; onSelect: (drug: DrugInfo) => void }> = ({ drug, onSelect }) => (
  <button
    onClick={() => onSelect(drug)}
    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
  >
    <div className="flex items-start justify-between mb-2">
      <Pill size={16} className="text-blue-500" />
      <span className="text-xs text-slate-500">{drug.drugClass}</span>
    </div>
    <h4 className="font-semibold text-slate-900">{drug.genericName}</h4>
    <p className="text-xs text-slate-500">{drug.brandNames.join(', ')}</p>
    <div className="flex flex-wrap gap-1 mt-2">
      {drug.indications.slice(0, 2).map((ind, idx) => (
        <span key={idx} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
          {ind}
        </span>
      ))}
    </div>
  </button>
);

const DrugPanel: React.FC<{ drug: DrugInfo; onClose: () => void }> = ({ drug, onClose }) => {
  const [activeTab, setActiveTab] = useState<'dosing' | 'interactions' | 'warnings' | 'monitoring'>('dosing');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-white flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{drug.genericName}</h3>
          <p className="text-xs text-blue-100">{drug.brandNames.join(', ')}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
          <X size={18} />
        </button>
      </div>
      
      {/* Quick Info */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-500">Class</p>
          <p className="text-sm font-medium">{drug.drugClass}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Pregnancy</p>
          <p className="text-sm font-medium">Category {drug.pregnancyCategory}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Lactation</p>
          <p className="text-sm font-medium text-xs">{drug.lactationSafety}</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'dosing', label: 'Dosing' },
          { key: 'interactions', label: 'Interactions' },
          { key: 'warnings', label: 'Warnings' },
          { key: 'monitoring', label: 'Monitoring' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'dosing' && (
          <div className="space-y-4">
            {drug.dosing.map((dose, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{dose.indication}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div><span className="text-slate-500">Route:</span> {dose.route}</div>
                  <div><span className="text-slate-500">Dose:</span> {dose.adultDose}</div>
                  <div><span className="text-slate-500">Frequency:</span> {dose.frequency}</div>
                  {dose.maxDose && <div><span className="text-slate-500">Max:</span> {dose.maxDose}</div>}
                </div>
                {dose.notes && <p className="text-xs text-slate-500 mt-2">{dose.notes}</p>}
              </div>
            ))}
            {drug.renalDosing && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-700">Renal Dosing</p>
                <p className="text-sm text-amber-600">{drug.renalDosing}</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'interactions' && (
          <div className="space-y-3">
            {drug.interactions.map((int, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                int.severity === 'major' ? 'bg-red-50 border-red-200' :
                int.severity === 'moderate' ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{int.drug}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    int.severity === 'major' ? 'bg-red-100 text-red-700' :
                    int.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {int.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{int.description}</p>
                <p className="text-xs text-slate-500 mt-1"><strong>Management:</strong> {int.management}</p>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'warnings' && (
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium text-red-700 mb-2">Contraindications</p>
              <ul className="space-y-1">
                {drug.contraindications.map((c, idx) => (
                  <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="font-medium text-amber-700 mb-2">Warnings</p>
              <ul className="space-y-1">
                {drug.warnings.map((w, idx) => (
                  <li key={idx} className="text-sm text-amber-600">• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'monitoring' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-700 mb-2">Monitoring Parameters</p>
              <ul className="space-y-1">
                {drug.monitoring.map((m, idx) => (
                  <li key={idx} className="text-sm text-blue-600">• {m}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-2">Adverse Effects</p>
              <div className="space-y-1">
                {drug.adverseEffects.map((ae, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{ae.effect}</span>
                    <span className="text-slate-500">{ae.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ClinicalDecisionSupport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculators' | 'drugs' | 'guidelines'>('calculators');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCalculator, setSelectedCalculator] = useState<ClinicalCalculator | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredCalculators = useMemo(() => {
    return CALCULATORS.filter(calc => {
      const matchesSearch = searchTerm === '' || 
        calc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        calc.shortName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || calc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  const filteredDrugs = useMemo(() => {
    return DRUGS.filter(drug => {
      return searchTerm === '' || 
        drug.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.brandNames.some(b => b.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [searchTerm]);

  const categories = ['all', ...new Set(CALCULATORS.map(c => c.category))];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Clinical Decision Support</h2>
              <p className="text-emerald-100 text-sm">Evidence-based tools at the point of care</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'calculators', label: 'Calculators', icon: Calculator, count: CALCULATORS.length },
          { key: 'drugs', label: 'Drug Reference', icon: Pill, count: DRUGS.length },
          { key: 'guidelines', label: 'Guidelines', icon: FileText, count: GUIDELINES.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {activeTab === 'calculators' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* List Panel */}
          <div className="col-span-2 space-y-4">
            {activeTab === 'calculators' && (
              <div className="grid grid-cols-2 gap-3">
                {filteredCalculators.map(calc => (
                  <CalculatorCard key={calc.id} calculator={calc} onSelect={setSelectedCalculator} />
                ))}
              </div>
            )}

            {activeTab === 'drugs' && (
              <div className="grid grid-cols-2 gap-3">
                {filteredDrugs.map(drug => (
                  <DrugCard key={drug.id} drug={drug} onSelect={setSelectedDrug} />
                ))}
              </div>
            )}

            {activeTab === 'guidelines' && (
              <div className="space-y-3">
                {GUIDELINES.map(guide => (
                  <div key={guide.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{guide.title}</h4>
                        <p className="text-sm text-slate-500">{guide.organization} • {guide.year}</p>
                      </div>
                      {guide.link && (
                        <a href={guide.link} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg">
                          <ExternalLink size={16} className="text-slate-400" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{guide.summary}</p>
                    <div className="space-y-2">
                      {guide.recommendations.slice(0, 2).map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            rec.strength === 'strong' ? 'bg-green-100 text-green-700' :
                            rec.strength === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {rec.strength}
                          </span>
                          <span className="text-slate-700">{rec.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div>
            {selectedCalculator ? (
              <CalculatorPanel calculator={selectedCalculator} onClose={() => setSelectedCalculator(null)} />
            ) : selectedDrug ? (
              <DrugPanel drug={selectedDrug} onClose={() => setSelectedDrug(null)} />
            ) : (
              <div className="h-full flex items-center justify-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <div className="text-center text-slate-400">
                  <Calculator size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Select a tool</p>
                  <p className="text-sm">Choose a calculator or drug to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalDecisionSupport;
