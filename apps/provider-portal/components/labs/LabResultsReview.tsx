// =============================================================================
// ATTENDING AI - Lab Results Review Panel
// components/labs/LabResultsReview.tsx
//
// Two-column layout matching inbox design:
//   Left: Stacked lab result cards (by patient/order)
//   Right: AI-powered analysis panel with:
//     - Abnormality explanations with "dive deeper" expansion
//     - AI-drafted patient message (plain language)
//     - Suggested handouts from reputable sources
//     - Follow-up lab recommendations
//     - Encounter addendum builder
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Brain, Sparkles, Send, Copy, Check, Edit3, FileText, ExternalLink,
  Beaker, Activity, TrendingUp, TrendingDown, Minus, BookOpen,
  ClipboardList, Plus, RotateCcw, Users, Calendar, ArrowRight,
  Shield, Pill, ChevronRight, FolderCheck, Eye, Target,
  ThumbsUp, ThumbsDown, HelpCircle, Lightbulb, ShoppingCart,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface LabValue {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  previousValue?: string;
  previousDate?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface LabOrder {
  id: string;
  patientName: string;
  patientAge: number;
  mrn: string;
  patientId: string;
  orderDate: string;
  resultDate: string;
  orderingProvider: string;
  encounterId?: string;
  encounterDate?: string;
  encounterReason?: string;
  panelName: string;
  status: 'pending' | 'partial' | 'final';
  priority: 'routine' | 'urgent' | 'stat';
  results: LabValue[];
  conditions: string[];
  medications: { name: string; dose: string }[];
  allergies: string[];
  reviewed: boolean;
}

interface AILabAnalysis {
  summary: string;
  abnormalities: AbnormalityExplanation[];
  patientMessages: { label: string; text: string }[];
  handouts: Handout[];
  followUpLabs: FollowUpLab[];
  addendumText: string;
  diagnosisValidation: DiagnosisValidation[];
  addOnOrders: AddOnOrder[];
}

interface AbnormalityExplanation {
  labName: string;
  value: string;
  unit: string;
  status: 'abnormal' | 'critical';
  briefCause: string;
  detailedExplanation: string;
  clinicalSignificance: string;
  possibleCauses: string[];
  recommendedActions: string[];
}

interface Handout {
  title: string;
  source: string;
  url: string;
  relevance: string;
}

interface FollowUpLab {
  id: string;
  name: string;
  reason: string;
  timeframe: string;
  selected: boolean;
}

interface DiagnosisValidation {
  originalDiagnosis: string;
  encounterDate: string;
  icdCode: string;
  verdict: 'validated' | 'refuted' | 'inconclusive' | 'partially_validated';
  confidence: number; // 0-100
  supportingEvidence: { lab: string; finding: string; supports: boolean }[];
  clinicalReasoning: string;
  alternativeDiagnoses?: { diagnosis: string; likelihood: string; supportingLabs: string[] }[];
  providerFeedback: string;
  learningPoint?: string;
}

interface AddOnOrder {
  id: string;
  name: string;
  code: string;
  reason: string;
  priority: 'routine' | 'urgent' | 'stat';
  selected: boolean;
}

// =============================================================================
// Theme (matching inbox)
// =============================================================================

import { reviewColors } from '../../lib/reviewTheme';
import { ReviewTabBar } from '../shared/ReviewTabBar';

// Alias for convenience — maps old names to shared theme
const colors = {
  ...reviewColors,
  // Labs uses white cards with dark text in some tabs
  cardBg: reviewColors.cardBg,
  sectionBg: reviewColors.cardSectionBg,
  text: reviewColors.cardText,
  textSecondary: reviewColors.cardTextSecondary,
  textMuted: reviewColors.cardTextMuted,
  border: reviewColors.cardBorder,
  accentLight: reviewColors.cardAccentLight,
};

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_LAB_ORDERS: LabOrder[] = [
  {
    id: 'lab-001',
    patientName: 'Margaret Williams',
    patientAge: 68,
    mrn: 'MRN-449821',
    patientId: 'pt-001',
    orderDate: '2026-02-28',
    resultDate: '2026-03-05',
    orderingProvider: 'Dr. Thomas Reed',
    encounterId: 'enc-220',
    encounterDate: '2026-02-28',
    encounterReason: 'Diabetes follow-up',
    panelName: 'Comprehensive Metabolic Panel + HbA1c',
    status: 'final',
    priority: 'routine',
    reviewed: false,
    conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 2'],
    medications: [
      { name: 'Metformin', dose: '1000mg BID' },
      { name: 'Lisinopril', dose: '20mg daily' },
      { name: 'Atorvastatin', dose: '40mg daily' },
    ],
    allergies: ['Sulfa drugs'],
    results: [
      { id: 'r1', name: 'Glucose (fasting)', value: '142', unit: 'mg/dL', referenceRange: '70-100', status: 'abnormal', previousValue: '156', previousDate: '2025-12-10', trend: 'down' },
      { id: 'r2', name: 'HbA1c', value: '7.8', unit: '%', referenceRange: '< 5.7', status: 'abnormal', previousValue: '8.2', previousDate: '2025-12-10', trend: 'down' },
      { id: 'r3', name: 'BUN', value: '28', unit: 'mg/dL', referenceRange: '7-20', status: 'abnormal', previousValue: '24', previousDate: '2025-12-10', trend: 'up' },
      { id: 'r4', name: 'Creatinine', value: '1.4', unit: 'mg/dL', referenceRange: '0.6-1.2', status: 'abnormal', previousValue: '1.3', previousDate: '2025-12-10', trend: 'up' },
      { id: 'r5', name: 'eGFR', value: '52', unit: 'mL/min', referenceRange: '> 60', status: 'abnormal', previousValue: '56', previousDate: '2025-12-10', trend: 'down' },
      { id: 'r6', name: 'Sodium', value: '139', unit: 'mEq/L', referenceRange: '136-145', status: 'normal' },
      { id: 'r7', name: 'Potassium', value: '5.3', unit: 'mEq/L', referenceRange: '3.5-5.0', status: 'abnormal', previousValue: '4.8', previousDate: '2025-12-10', trend: 'up' },
      { id: 'r8', name: 'Chloride', value: '101', unit: 'mEq/L', referenceRange: '98-106', status: 'normal' },
      { id: 'r9', name: 'CO2', value: '22', unit: 'mEq/L', referenceRange: '23-29', status: 'abnormal' },
      { id: 'r10', name: 'Calcium', value: '9.4', unit: 'mg/dL', referenceRange: '8.5-10.5', status: 'normal' },
      { id: 'r11', name: 'Total Protein', value: '7.0', unit: 'g/dL', referenceRange: '6.0-8.3', status: 'normal' },
      { id: 'r12', name: 'Albumin', value: '3.9', unit: 'g/dL', referenceRange: '3.5-5.5', status: 'normal' },
      { id: 'r13', name: 'ALT', value: '22', unit: 'U/L', referenceRange: '7-56', status: 'normal' },
      { id: 'r14', name: 'AST', value: '25', unit: 'U/L', referenceRange: '10-40', status: 'normal' },
    ],
  },
  {
    id: 'lab-002',
    patientName: 'Robert Chen',
    patientAge: 54,
    mrn: 'MRN-331205',
    patientId: 'pt-002',
    orderDate: '2026-03-01',
    resultDate: '2026-03-05',
    orderingProvider: 'Dr. Thomas Reed',
    encounterId: 'enc-225',
    encounterDate: '2026-03-01',
    encounterReason: 'Chest pain evaluation',
    panelName: 'Cardiac Panel + Lipids',
    status: 'final',
    priority: 'urgent',
    reviewed: false,
    conditions: ['Hyperlipidemia', 'Family hx CAD', 'Obesity'],
    medications: [
      { name: 'Atorvastatin', dose: '80mg daily' },
      { name: 'Aspirin', dose: '81mg daily' },
    ],
    allergies: ['NKDA'],
    results: [
      { id: 'r20', name: 'Troponin I', value: '0.02', unit: 'ng/mL', referenceRange: '< 0.04', status: 'normal' },
      { id: 'r21', name: 'BNP', value: '45', unit: 'pg/mL', referenceRange: '< 100', status: 'normal' },
      { id: 'r22', name: 'Total Cholesterol', value: '248', unit: 'mg/dL', referenceRange: '< 200', status: 'abnormal', previousValue: '262', previousDate: '2025-09-15', trend: 'down' },
      { id: 'r23', name: 'LDL', value: '168', unit: 'mg/dL', referenceRange: '< 100', status: 'abnormal', previousValue: '178', previousDate: '2025-09-15', trend: 'down' },
      { id: 'r24', name: 'HDL', value: '38', unit: 'mg/dL', referenceRange: '> 40', status: 'abnormal', previousValue: '36', previousDate: '2025-09-15', trend: 'up' },
      { id: 'r25', name: 'Triglycerides', value: '210', unit: 'mg/dL', referenceRange: '< 150', status: 'abnormal', previousValue: '240', previousDate: '2025-09-15', trend: 'down' },
      { id: 'r26', name: 'hs-CRP', value: '3.8', unit: 'mg/L', referenceRange: '< 1.0', status: 'abnormal' },
    ],
  },
  {
    id: 'lab-003',
    patientName: 'Sarah Martinez',
    patientAge: 42,
    mrn: 'MRN-557103',
    patientId: 'pt-003',
    orderDate: '2026-03-02',
    resultDate: '2026-03-06',
    orderingProvider: 'Dr. Thomas Reed',
    panelName: 'Thyroid Panel + CBC',
    status: 'final',
    priority: 'routine',
    reviewed: false,
    conditions: ['Hypothyroidism', 'Iron deficiency anemia'],
    medications: [
      { name: 'Levothyroxine', dose: '75mcg daily' },
      { name: 'Ferrous sulfate', dose: '325mg daily' },
    ],
    allergies: ['Penicillin'],
    results: [
      { id: 'r30', name: 'TSH', value: '6.8', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'abnormal', previousValue: '5.2', previousDate: '2025-11-20', trend: 'up' },
      { id: 'r31', name: 'Free T4', value: '0.8', unit: 'ng/dL', referenceRange: '0.8-1.8', status: 'normal' },
      { id: 'r32', name: 'Hemoglobin', value: '10.8', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'abnormal', previousValue: '10.2', previousDate: '2025-11-20', trend: 'up' },
      { id: 'r33', name: 'Hematocrit', value: '33.2', unit: '%', referenceRange: '36-46', status: 'abnormal' },
      { id: 'r34', name: 'MCV', value: '72', unit: 'fL', referenceRange: '80-100', status: 'abnormal' },
      { id: 'r35', name: 'Ferritin', value: '12', unit: 'ng/mL', referenceRange: '12-150', status: 'normal' },
      { id: 'r36', name: 'Iron', value: '42', unit: 'mcg/dL', referenceRange: '60-170', status: 'abnormal' },
      { id: 'r37', name: 'TIBC', value: '420', unit: 'mcg/dL', referenceRange: '250-370', status: 'abnormal' },
      { id: 'r38', name: 'WBC', value: '6.8', unit: 'K/uL', referenceRange: '4.5-11.0', status: 'normal' },
      { id: 'r39', name: 'Platelets', value: '265', unit: 'K/uL', referenceRange: '150-400', status: 'normal' },
    ],
  },
  {
    id: 'lab-004',
    patientName: 'James Peterson',
    patientAge: 71,
    mrn: 'MRN-882416',
    patientId: 'pt-004',
    orderDate: '2026-03-03',
    resultDate: '2026-03-06',
    orderingProvider: 'Dr. Thomas Reed',
    panelName: 'PSA + Basic Metabolic',
    status: 'final',
    priority: 'routine',
    reviewed: true,
    conditions: ['BPH', 'Hypertension'],
    medications: [
      { name: 'Tamsulosin', dose: '0.4mg daily' },
      { name: 'Amlodipine', dose: '5mg daily' },
    ],
    allergies: ['NKDA'],
    results: [
      { id: 'r40', name: 'PSA', value: '2.1', unit: 'ng/mL', referenceRange: '< 4.0', status: 'normal', previousValue: '1.8', previousDate: '2025-03-10', trend: 'up' },
      { id: 'r41', name: 'Glucose', value: '95', unit: 'mg/dL', referenceRange: '70-100', status: 'normal' },
      { id: 'r42', name: 'BUN', value: '18', unit: 'mg/dL', referenceRange: '7-20', status: 'normal' },
      { id: 'r43', name: 'Creatinine', value: '1.0', unit: 'mg/dL', referenceRange: '0.6-1.2', status: 'normal' },
      { id: 'r44', name: 'Potassium', value: '4.2', unit: 'mEq/L', referenceRange: '3.5-5.0', status: 'normal' },
    ],
  },
];

// =============================================================================
// AI Analysis Generator (mock — same pattern as inbox agent)
// =============================================================================

function generateAIAnalysis(order: LabOrder): AILabAnalysis {
  const abnormals = order.results.filter(r => r.status === 'abnormal' || r.status === 'critical');
  const firstName = order.patientName.split(' ')[0];

  const abnormalities: AbnormalityExplanation[] = abnormals.map(lab => {
    const explanations: Record<string, Omit<AbnormalityExplanation, 'labName' | 'value' | 'unit' | 'status'>> = {
      'HbA1c': {
        briefCause: 'Reflects average blood sugar over 2-3 months. Elevated level indicates suboptimal diabetes control.',
        detailedExplanation: 'Hemoglobin A1c measures glycated hemoglobin — glucose that attaches to red blood cells. Since red blood cells live ~120 days, this provides a 2-3 month average. A value of 7.8% corresponds to an estimated average glucose of ~177 mg/dL. The ADA target for most adults is < 7.0%, though individualized targets may be appropriate for older patients or those with comorbidities.',
        clinicalSignificance: 'Improved from 8.2% but still above target. Current metformin dose may need augmentation. Consider GLP-1 agonist addition given concurrent CKD and cardiovascular risk.',
        possibleCauses: ['Dietary non-adherence', 'Medication non-compliance', 'Disease progression', 'Insufficient medication dosing'],
        recommendedActions: ['Dietary counseling referral', 'Consider adding GLP-1 agonist', 'Recheck in 3 months', 'Review medication compliance'],
      },
      'Glucose (fasting)': {
        briefCause: 'Fasting blood sugar is elevated, consistent with diabetes. Trending down from previous value.',
        detailedExplanation: 'Fasting glucose above 126 mg/dL on two occasions confirms diabetes diagnosis. This patient\'s value of 142 mg/dL is elevated but improving from 156 mg/dL. Dawn phenomenon or evening carbohydrate intake may contribute.',
        clinicalSignificance: 'Improving trend suggests current regimen is partially effective. Combined with A1c improvement, supports treatment intensification rather than change.',
        possibleCauses: ['Type 2 Diabetes', 'Dawn phenomenon', 'Dietary factors', 'Stress response'],
        recommendedActions: ['Continue current metformin', 'Evaluate for additional agent', 'Dietary counseling'],
      },
      'Creatinine': {
        briefCause: 'Mildly elevated, suggesting reduced kidney filtration. Important to trend over time.',
        detailedExplanation: 'Serum creatinine is a byproduct of muscle metabolism filtered by the kidneys. Elevation indicates decreased glomerular filtration rate. This patient\'s value of 1.4 mg/dL with eGFR 52 mL/min places them in CKD Stage 3a, progressed from Stage 2.',
        clinicalSignificance: 'Progressive decline in renal function. ACEi (lisinopril) is renoprotective but potassium must be monitored. Metformin is still appropriate at this eGFR but requires monitoring. Consider nephrology referral if eGFR drops below 45.',
        possibleCauses: ['Diabetic nephropathy', 'Hypertensive nephrosclerosis', 'ACEi effect', 'Dehydration'],
        recommendedActions: ['Continue ACEi for renoprotection', 'Monitor potassium closely', 'Nephrology referral if eGFR < 45', 'Avoid nephrotoxins'],
      },
      'BUN': {
        briefCause: 'Elevated blood urea nitrogen, often seen alongside elevated creatinine in kidney disease.',
        detailedExplanation: 'BUN reflects protein metabolism and kidney excretion. Elevated BUN with elevated creatinine suggests reduced kidney function. BUN/Cr ratio of 20:1 is proportional, suggesting renal cause rather than prerenal (dehydration) cause.',
        clinicalSignificance: 'Consistent with CKD progression. Not independently alarming but confirms trend.',
        possibleCauses: ['Chronic kidney disease', 'High protein diet', 'Dehydration', 'GI bleeding'],
        recommendedActions: ['Correlate with creatinine and eGFR trends', 'Assess hydration status'],
      },
      'eGFR': {
        briefCause: 'Estimated kidney filtration rate is below normal, indicating Stage 3a chronic kidney disease.',
        detailedExplanation: 'eGFR estimates how well kidneys filter waste. Normal is > 90 mL/min. This patient has declined from 56 to 52 mL/min over 3 months, now crossing into Stage 3a CKD. Rate of decline (~16 mL/min/year if sustained) warrants close monitoring.',
        clinicalSignificance: 'Accelerated decline warrants evaluation. Consider nephrology referral. Review all medications for renal dosing. Ensure adequate blood pressure control.',
        possibleCauses: ['Diabetic nephropathy', 'Hypertensive nephrosclerosis', 'Combined etiology'],
        recommendedActions: ['Nephrology referral', 'Optimize BP control', 'Check urine albumin-to-creatinine ratio', 'Recheck in 3 months'],
      },
      'Potassium': {
        briefCause: 'Slightly elevated potassium, which can occur with kidney disease and ACE inhibitor use.',
        detailedExplanation: 'Potassium of 5.3 mEq/L is above normal range. In the context of CKD and ACE inhibitor (lisinopril), this is a common finding but requires monitoring. Values above 5.5 mEq/L may require medication adjustment. Values above 6.0 require urgent intervention.',
        clinicalSignificance: 'Trending up from 4.8. Combination of declining renal function and ACEi therapy. Not yet at dangerous levels but trajectory is concerning.',
        possibleCauses: ['ACE inhibitor effect', 'Declining renal function', 'Dietary intake', 'Metabolic acidosis'],
        recommendedActions: ['Dietary potassium counseling', 'Consider potassium binder if rising', 'Repeat in 2-4 weeks', 'Review ACEi dosing'],
      },
      'CO2': {
        briefCause: 'Low carbon dioxide level may indicate mild metabolic acidosis, common in kidney disease.',
        detailedExplanation: 'Serum CO2 (bicarbonate) of 22 mEq/L is mildly low. In CKD, the kidneys struggle to regenerate bicarbonate, leading to metabolic acidosis. This can accelerate kidney decline and contribute to bone disease.',
        clinicalSignificance: 'Mild metabolic acidosis of CKD. Consider oral bicarbonate supplementation if persistently below 22.',
        possibleCauses: ['CKD-related metabolic acidosis', 'Metformin (rare)', 'Diarrhea'],
        recommendedActions: ['Consider sodium bicarbonate supplementation', 'Monitor with CKD labs'],
      },
      'Total Cholesterol': {
        briefCause: 'Total cholesterol remains elevated despite statin therapy, increasing cardiovascular risk.',
        detailedExplanation: 'Total cholesterol of 248 mg/dL is well above the goal of < 200 mg/dL. Despite maximum-dose atorvastatin (80mg), cholesterol remains significantly elevated. This may indicate genetic predisposition, dietary factors, or statin non-response.',
        clinicalSignificance: 'Given family history of coronary artery disease and chest pain presentation, aggressive lipid management is critical. Consider adding ezetimibe or PCSK9 inhibitor.',
        possibleCauses: ['Familial hypercholesterolemia', 'Dietary factors', 'Statin non-response', 'Secondary causes'],
        recommendedActions: ['Add ezetimibe 10mg', 'Consider PCSK9 inhibitor referral', 'Lipid specialty consultation', 'Dietary counseling'],
      },
      'LDL': {
        briefCause: 'LDL ("bad cholesterol") is significantly above target, especially concerning given cardiac risk factors.',
        detailedExplanation: 'LDL of 168 mg/dL is far above the < 70 mg/dL target recommended for high-risk patients (family hx CAD + chest pain). LDL is the primary driver of atherosclerotic plaque formation.',
        clinicalSignificance: 'Critical gap from target. Despite improvement from 178, this patient needs aggressive LDL lowering. Consider combination therapy.',
        possibleCauses: ['Insufficient statin effect', 'Genetic factors', 'Dietary saturated fat intake'],
        recommendedActions: ['Add ezetimibe', 'Consider PCSK9 inhibitor', 'Lifestyle modifications', 'Recheck in 6-8 weeks after therapy change'],
      },
      'HDL': {
        briefCause: 'HDL ("good cholesterol") is below the protective threshold, increasing cardiovascular risk.',
        detailedExplanation: 'HDL of 38 mg/dL is below the 40 mg/dL minimum for men. Low HDL is an independent cardiovascular risk factor. It is improving slightly from 36.',
        clinicalSignificance: 'Part of the atherogenic lipid profile (high LDL, low HDL, high triglycerides). Exercise and weight loss are the most effective HDL-raising interventions.',
        possibleCauses: ['Sedentary lifestyle', 'Obesity', 'Metabolic syndrome', 'Genetic factors'],
        recommendedActions: ['Exercise prescription (150 min/week moderate)', 'Weight loss counseling', 'Consider fish oil for triglycerides'],
      },
      'Triglycerides': {
        briefCause: 'Triglycerides are elevated, contributing to cardiovascular risk and possible metabolic syndrome.',
        detailedExplanation: 'Triglycerides of 210 mg/dL exceed the < 150 mg/dL goal. Elevated triglycerides often accompany low HDL in metabolic syndrome. They are improving from 240 mg/dL.',
        clinicalSignificance: 'Combined with obesity and family history, this lipid profile represents high cardiovascular risk. Lifestyle modification is first-line for triglycerides.',
        possibleCauses: ['Obesity', 'Dietary refined carbohydrates/sugar', 'Sedentary lifestyle', 'Metabolic syndrome'],
        recommendedActions: ['Dietary counseling (reduce refined carbs)', 'Exercise prescription', 'Consider prescription fish oil if > 500', 'Recheck after lifestyle changes'],
      },
      'hs-CRP': {
        briefCause: 'High-sensitivity CRP indicates elevated inflammation, a risk factor for heart disease.',
        detailedExplanation: 'hs-CRP of 3.8 mg/L indicates high cardiovascular inflammation risk (> 3.0 = high risk). In the context of elevated lipids and chest pain presentation, this adds to the overall risk profile. CRP is non-specific and can be elevated by infection, obesity, or autoimmune conditions.',
        clinicalSignificance: 'Combined with atherogenic lipid profile, family history, and presenting chest pain — this patient has high residual cardiovascular risk despite statin therapy.',
        possibleCauses: ['Cardiovascular inflammation', 'Obesity-related inflammation', 'Subclinical infection', 'Metabolic syndrome'],
        recommendedActions: ['Intensify lipid therapy', 'Cardiology referral for stress testing', 'Repeat in 3 months after intervention', 'Consider colchicine for CV inflammation'],
      },
      'TSH': {
        briefCause: 'Thyroid stimulating hormone is elevated, indicating the thyroid is underactive and needs more medication.',
        detailedExplanation: 'TSH of 6.8 mIU/L is above the normal range of 0.4-4.0. The pituitary gland produces more TSH when it senses insufficient thyroid hormone. This patient\'s TSH has risen from 5.2, suggesting the current levothyroxine dose (75mcg) is insufficient.',
        clinicalSignificance: 'Worsening hypothyroidism despite treatment. Dose increase indicated. Also contributing to fatigue and potentially worsening anemia recovery.',
        possibleCauses: ['Insufficient levothyroxine dose', 'Medication malabsorption (iron interaction)', 'Disease progression', 'Non-compliance'],
        recommendedActions: ['Increase levothyroxine to 88-100mcg', 'Separate from iron by 4 hours', 'Recheck TSH in 6-8 weeks', 'Assess compliance'],
      },
      'Hemoglobin': {
        briefCause: 'Low hemoglobin indicates anemia, likely from iron deficiency in this patient.',
        detailedExplanation: 'Hemoglobin of 10.8 g/dL is below the normal range for women (12-16 g/dL). Combined with low MCV (72 fL, microcytic) and low iron/high TIBC, this confirms iron deficiency anemia. Slight improvement from 10.2 suggests iron supplementation is working but slowly.',
        clinicalSignificance: 'Ongoing iron deficiency anemia despite oral supplementation. Consider GI evaluation for occult blood loss. Hypothyroidism may also impair hematopoiesis.',
        possibleCauses: ['Iron deficiency (menstrual loss, GI loss)', 'Chronic disease', 'Hypothyroidism effect', 'Malabsorption'],
        recommendedActions: ['Evaluate for GI blood loss', 'Consider IV iron if poor oral response', 'Check reticulocyte count', 'Ensure iron taken correctly'],
      },
      'Hematocrit': {
        briefCause: 'Low hematocrit mirrors the low hemoglobin, confirming anemia.',
        detailedExplanation: 'Hematocrit of 33.2% is proportionally low with hemoglobin, consistent with iron deficiency anemia.',
        clinicalSignificance: 'Consistent with overall anemia picture. No discordance suggesting other pathology.',
        possibleCauses: ['Iron deficiency anemia'],
        recommendedActions: ['Address underlying iron deficiency'],
      },
      'MCV': {
        briefCause: 'Small red blood cells (microcytic) are characteristic of iron deficiency anemia.',
        detailedExplanation: 'MCV of 72 fL indicates microcytic anemia. The most common cause is iron deficiency, confirmed by the low iron and elevated TIBC in this patient.',
        clinicalSignificance: 'Classic microcytic pattern confirms iron deficiency as the cause of anemia.',
        possibleCauses: ['Iron deficiency', 'Thalassemia trait', 'Chronic disease', 'Lead poisoning'],
        recommendedActions: ['Iron supplementation optimization', 'GI evaluation if not improving'],
      },
      'Iron': {
        briefCause: 'Low iron level is the direct cause of this patient\'s anemia.',
        detailedExplanation: 'Serum iron of 42 mcg/dL is below normal (60-170). With elevated TIBC and borderline ferritin, the body is iron-depleted and trying to absorb more.',
        clinicalSignificance: 'Confirms iron deficiency. Despite supplementation, stores remain low. Absorption may be impaired by hypothyroidism or concurrent iron-levothyroxine interaction.',
        possibleCauses: ['Inadequate intake', 'Menstrual losses', 'GI malabsorption', 'GI blood loss', 'Drug interaction with levothyroxine'],
        recommendedActions: ['Separate iron and levothyroxine by 4 hours', 'Consider IV iron infusion', 'GI evaluation for occult bleeding', 'Dietary iron counseling'],
      },
      'TIBC': {
        briefCause: 'Elevated TIBC indicates the body is trying to compensate for low iron by making more transport protein.',
        detailedExplanation: 'Total Iron Binding Capacity of 420 mcg/dL is elevated, reflecting increased transferrin production in response to iron deficiency. The body upregulates iron transport proteins when stores are depleted.',
        clinicalSignificance: 'Classic iron deficiency pattern: low iron + high TIBC + borderline ferritin.',
        possibleCauses: ['Iron deficiency'],
        recommendedActions: ['Address iron deficiency as above'],
      },
    };

    const explanation = explanations[lab.name];
    return {
      labName: lab.name,
      value: lab.value,
      unit: lab.unit,
      status: lab.status as 'abnormal' | 'critical',
      briefCause: explanation?.briefCause || `${lab.name} is outside the normal range (${lab.referenceRange}). Further evaluation may be needed.`,
      detailedExplanation: explanation?.detailedExplanation || 'Detailed clinical analysis pending provider review.',
      clinicalSignificance: explanation?.clinicalSignificance || 'Clinical significance to be determined.',
      possibleCauses: explanation?.possibleCauses || ['To be evaluated'],
      recommendedActions: explanation?.recommendedActions || ['Provider review needed'],
    };
  });

  // Plain language lab name mapping
  const plainNames: Record<string, string> = {
    'HbA1c': 'your diabetes blood sugar test',
    'Glucose (fasting)': 'your fasting blood sugar',
    'TSH': 'your thyroid level',
    'Free T4': 'your thyroid hormone level',
    'BUN': 'your kidney function (blood urea nitrogen)',
    'Creatinine': 'your kidney function (creatinine)',
    'eGFR': 'your kidney filtration rate',
    'Potassium': 'your potassium level',
    'CO2': 'your bicarbonate level',
    'Total Cholesterol': 'your total cholesterol',
    'LDL': 'your LDL cholesterol (sometimes called "bad" cholesterol)',
    'HDL': 'your HDL cholesterol (sometimes called "good" cholesterol)',
    'Triglycerides': 'your triglyceride level',
    'hs-CRP': 'your inflammation marker',
    'Hemoglobin': 'your hemoglobin (red blood cell) level',
    'Hematocrit': 'your hematocrit (red blood cell percentage)',
    'MCV': 'your red blood cell size',
    'Iron': 'your iron level',
    'TIBC': 'your iron-binding capacity',
    'Ferritin': 'your iron stores',
    'PSA': 'your prostate screening test',
  };

  const normals = order.results.filter(r => r.status === 'normal');

  // --- Variation A: Detailed (default) ---
  let msgDetailed = `Dear ${firstName},\n\nYour recent blood work results are ready, and I'd like to share them with you.\n\n`;
  if (normals.length > 0) {
    msgDetailed += `Good news — ${normals.length} of your ${order.results.length} test results came back within normal range.\n\n`;
  }
  if (abnormals.length > 0) {
    msgDetailed += `There are ${abnormals.length} result${abnormals.length > 1 ? 's' : ''} I'd like to discuss with you:\n\n`;
    abnormals.forEach(lab => {
      const plainName = plainNames[lab.name] || lab.name.toLowerCase();
      msgDetailed += `  - ${plainName[0].toUpperCase() + plainName.slice(1)} was ${lab.status === 'critical' ? 'significantly ' : 'slightly '}outside the normal range\n`;
    });
    msgDetailed += `\nI'm including some educational materials to help you understand these results. `;
    msgDetailed += `I'd like to schedule a follow-up to discuss these findings and our plan going forward.\n\n`;
  }
  msgDetailed += `Please don't hesitate to reach out with any questions.\n\nBest regards,\nDr. Thomas Reed\nFamily Medicine`;

  // --- Variation B: Brief / Concise ---
  let msgBrief = `Hi ${firstName},\n\n`;
  if (abnormals.length === 0) {
    msgBrief += `Great news — all of your lab results came back normal. No changes to your current plan are needed. We'll recheck at your next scheduled visit.\n\n`;
  } else {
    msgBrief += `Your lab results are in. `;
    if (normals.length > 0) msgBrief += `Most results look good. `;
    msgBrief += `A few values were outside the expected range and I'd like to go over them with you.\n\n`;
    msgBrief += `Please call the office to schedule a follow-up, or reply to this message with any questions.\n\n`;
  }
  msgBrief += `— Dr. Reed`;

  const patientMessages = [
    { label: 'Detailed', text: msgDetailed },
    { label: 'Brief', text: msgBrief },
  ];

  // Generate handouts based on conditions
  const handouts: Handout[] = [];
  if (order.conditions.some(c => c.includes('Diabetes'))) {
    handouts.push(
      { title: 'Understanding Your A1c Results', source: 'American Diabetes Association', url: 'https://diabetes.org/a1c', relevance: 'Explains what A1c means and target goals' },
      { title: 'Managing Blood Sugar Through Diet', source: 'NIH - NIDDK', url: 'https://niddk.nih.gov/diabetes-diet', relevance: 'Dietary guidance for blood sugar control' },
    );
  }
  if (abnormals.some(a => a.name.includes('Creatinine') || a.name.includes('eGFR') || a.name.includes('BUN'))) {
    handouts.push(
      { title: 'Chronic Kidney Disease: What You Should Know', source: 'National Kidney Foundation', url: 'https://kidney.org/ckd', relevance: 'Understanding kidney function test results' },
    );
  }
  if (abnormals.some(a => a.name.includes('Cholesterol') || a.name.includes('LDL') || a.name.includes('Triglycerides'))) {
    handouts.push(
      { title: 'Understanding Your Cholesterol Numbers', source: 'American Heart Association', url: 'https://heart.org/cholesterol', relevance: 'Guide to cholesterol types and targets' },
      { title: 'Heart-Healthy Living', source: 'NIH - NHLBI', url: 'https://nhlbi.nih.gov/heart-healthy', relevance: 'Lifestyle changes to improve cholesterol' },
    );
  }
  if (abnormals.some(a => a.name === 'TSH')) {
    handouts.push(
      { title: 'Hypothyroidism: Understanding Your Thyroid', source: 'American Thyroid Association', url: 'https://thyroid.org/hypothyroidism', relevance: 'Information about thyroid hormone levels' },
    );
  }
  if (abnormals.some(a => a.name.includes('Hemoglobin') || a.name.includes('Iron') || a.name.includes('Ferritin'))) {
    handouts.push(
      { title: 'Iron Deficiency Anemia', source: 'NIH - NHLBI', url: 'https://nhlbi.nih.gov/iron-deficiency', relevance: 'Understanding iron levels and anemia' },
      { title: 'Iron-Rich Foods Guide', source: 'Academy of Nutrition and Dietetics', url: 'https://eatright.org/iron-foods', relevance: 'Dietary sources of iron' },
    );
  }

  // Follow-up labs
  const followUpLabs: FollowUpLab[] = [];
  if (order.conditions.some(c => c.includes('Diabetes'))) {
    followUpLabs.push(
      { id: 'fu-a1c', name: 'HbA1c', reason: 'Recheck diabetes control after intervention', timeframe: '3 months', selected: true },
      { id: 'fu-cmp', name: 'Comprehensive Metabolic Panel', reason: 'Monitor kidney function and electrolytes', timeframe: '3 months', selected: true },
      { id: 'fu-uacr', name: 'Urine Albumin-to-Creatinine Ratio', reason: 'Screen for diabetic kidney disease progression', timeframe: '3 months', selected: false },
    );
  }
  if (abnormals.some(a => a.name.includes('Cholesterol') || a.name.includes('LDL'))) {
    followUpLabs.push(
      { id: 'fu-lipid', name: 'Lipid Panel', reason: 'Recheck after therapy adjustment', timeframe: '6-8 weeks', selected: true },
      { id: 'fu-crp', name: 'hs-CRP', reason: 'Monitor cardiovascular inflammation', timeframe: '3 months', selected: false },
    );
  }
  if (abnormals.some(a => a.name === 'TSH')) {
    followUpLabs.push(
      { id: 'fu-tsh', name: 'TSH + Free T4', reason: 'Recheck after dose adjustment', timeframe: '6-8 weeks', selected: true },
    );
  }
  if (abnormals.some(a => a.name.includes('Hemoglobin') || a.name.includes('Iron'))) {
    followUpLabs.push(
      { id: 'fu-cbc', name: 'CBC with Differential', reason: 'Monitor anemia response to treatment', timeframe: '6-8 weeks', selected: true },
      { id: 'fu-iron', name: 'Iron Studies + Ferritin', reason: 'Recheck iron stores', timeframe: '6-8 weeks', selected: true },
      { id: 'fu-retic', name: 'Reticulocyte Count', reason: 'Assess bone marrow response', timeframe: '2 weeks', selected: false },
    );
  }

  // Addendum text
  let addendum = `Lab Results Reviewed: ${order.panelName} (collected ${order.orderDate}, resulted ${order.resultDate})\n\n`;
  if (abnormals.length > 0) {
    addendum += `Abnormal Results:\n`;
    abnormals.forEach(lab => {
      addendum += `  - ${lab.name}: ${lab.value} ${lab.unit} (ref: ${lab.referenceRange}) [${lab.status.toUpperCase()}]`;
      if (lab.previousValue) addendum += ` Previous: ${lab.previousValue} (${lab.previousDate})`;
      addendum += `\n`;
    });
    addendum += `\nClinical Assessment:\n${abnormalities.map(a => `  - ${a.labName}: ${a.clinicalSignificance}`).join('\n')}\n`;
    addendum += `\nPlan:\n`;
    followUpLabs.filter(f => f.selected).forEach(f => {
      addendum += `  - Order ${f.name} in ${f.timeframe}: ${f.reason}\n`;
    });
    addendum += `  - Patient notified of results with educational materials\n`;
  } else {
    addendum += `All results within normal limits. Patient notified.\n`;
  }
  addendum += `\nReviewed by: Dr. Thomas Reed`;

  // ML Diagnosis Validation
  const diagnosisValidation: DiagnosisValidation[] = [];
  if (order.encounterReason && order.conditions.length > 0) {
    order.conditions.forEach(condition => {
      if (condition === 'Type 2 Diabetes') {
        const a1c = order.results.find(r => r.name === 'HbA1c');
        const glucose = order.results.find(r => r.name === 'Glucose (fasting)');
        const improving = a1c?.trend === 'down';
        diagnosisValidation.push({
          originalDiagnosis: 'Type 2 Diabetes Mellitus',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'E11.9',
          verdict: 'validated',
          confidence: 95,
          supportingEvidence: [
            ...(a1c ? [{ lab: 'HbA1c', finding: `${a1c.value}% (ref < 5.7%) — confirms poor glycemic control`, supports: true }] : []),
            ...(glucose ? [{ lab: 'Fasting Glucose', finding: `${glucose.value} mg/dL (ref 70-100) — elevated fasting glucose`, supports: true }] : []),
          ],
          clinicalReasoning: `Lab results strongly validate the diagnosis of Type 2 Diabetes. HbA1c of ${a1c?.value || 'N/A'}% confirms sustained hyperglycemia. ${improving ? 'Positive trend noted — A1c improving from previous value, suggesting treatment is partially effective but goal not yet achieved.' : 'No improvement trend — consider treatment intensification.'}`,
          providerFeedback: improving
            ? 'Diagnosis confirmed. Treatment trajectory is positive — A1c trending down. Consider whether current pace of improvement is sufficient or if intensification would benefit the patient sooner.'
            : 'Diagnosis confirmed. Current treatment appears insufficient. Consider GLP-1 agonist or SGLT2 inhibitor addition, which also provides renal and cardiovascular benefit.',
          learningPoint: 'For patients with CKD Stage 3+, GLP-1 agonists (e.g., semaglutide) and SGLT2 inhibitors (e.g., empagliflozin) offer dual benefit: glycemic control + renoprotection.',
        });
      }
      if (condition === 'CKD Stage 2') {
        const egfr = order.results.find(r => r.name === 'eGFR');
        const cr = order.results.find(r => r.name === 'Creatinine');
        diagnosisValidation.push({
          originalDiagnosis: 'Chronic Kidney Disease, Stage 2',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'N18.2',
          verdict: 'refuted',
          confidence: 88,
          supportingEvidence: [
            ...(egfr ? [{ lab: 'eGFR', finding: `${egfr.value} mL/min (ref > 60) — now below 60, indicating Stage 3a`, supports: false }] : []),
            ...(cr ? [{ lab: 'Creatinine', finding: `${cr.value} mg/dL — rising trend indicates worsening function`, supports: false }] : []),
          ],
          clinicalReasoning: 'The original diagnosis of CKD Stage 2 (eGFR 60-89) is no longer accurate. Current eGFR of 52 mL/min places this patient in CKD Stage 3a (eGFR 45-59). The diagnosis should be updated to reflect disease progression.',
          alternativeDiagnoses: [
            { diagnosis: 'CKD Stage 3a (N18.31)', likelihood: 'High', supportingLabs: ['eGFR 52', 'Creatinine 1.4', 'Rising BUN'] },
          ],
          providerFeedback: 'STAGING UPDATE NEEDED: Patient has progressed from CKD Stage 2 to Stage 3a. Update diagnosis code from N18.2 to N18.31. This triggers additional monitoring requirements (urine albumin-to-creatinine ratio, phosphorus, PTH) and may affect medication dosing thresholds.',
          learningPoint: 'CKD staging by eGFR: Stage 1 ≥90, Stage 2 60-89, Stage 3a 45-59, Stage 3b 30-44, Stage 4 15-29, Stage 5 <15. Each stage transition changes monitoring requirements.',
        });
      }
      if (condition === 'Hyperlipidemia') {
        const ldl = order.results.find(r => r.name === 'LDL');
        const tc = order.results.find(r => r.name === 'Total Cholesterol');
        const crp = order.results.find(r => r.name === 'hs-CRP');
        diagnosisValidation.push({
          originalDiagnosis: 'Hyperlipidemia',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'E78.5',
          verdict: 'validated',
          confidence: 98,
          supportingEvidence: [
            ...(ldl ? [{ lab: 'LDL', finding: `${ldl.value} mg/dL (ref < 100) — significantly elevated`, supports: true }] : []),
            ...(tc ? [{ lab: 'Total Cholesterol', finding: `${tc.value} mg/dL (ref < 200) — elevated`, supports: true }] : []),
            ...(crp ? [{ lab: 'hs-CRP', finding: `${crp.value} mg/L — high inflammatory marker adds CV risk`, supports: true }] : []),
          ],
          clinicalReasoning: 'Lab results strongly validate hyperlipidemia diagnosis. Despite max-dose statin, LDL remains well above target, suggesting familial component or need for combination therapy.',
          alternativeDiagnoses: [
            { diagnosis: 'Familial Hypercholesterolemia (E78.01)', likelihood: 'Moderate', supportingLabs: ['LDL > 160 despite max statin', 'Family hx CAD'] },
          ],
          providerFeedback: 'Diagnosis confirmed but consider reclassification to Familial Hypercholesterolemia given statin resistance and family history. This changes the treatment algorithm — PCSK9 inhibitors are indicated and may have better insurance coverage with FH diagnosis code.',
          learningPoint: 'Consider FH screening (Dutch Lipid Clinic criteria) when LDL > 160 despite max statin + family hx of premature CAD. FH diagnosis improves access to PCSK9 inhibitors.',
        });
      }
      if (condition === 'Hypothyroidism') {
        const tsh = order.results.find(r => r.name === 'TSH');
        diagnosisValidation.push({
          originalDiagnosis: 'Hypothyroidism',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'E03.9',
          verdict: 'validated',
          confidence: 92,
          supportingEvidence: [
            ...(tsh ? [{ lab: 'TSH', finding: `${tsh.value} mIU/L (ref 0.4-4.0) — elevated, confirming insufficient thyroid hormone`, supports: true }] : []),
          ],
          clinicalReasoning: 'Elevated TSH with borderline-low Free T4 validates hypothyroidism. Current dose of levothyroxine 75mcg is insufficient. Note: concurrent iron supplementation may be interfering with levothyroxine absorption.',
          providerFeedback: 'Diagnosis confirmed but TSH worsening despite treatment. Check timing of levothyroxine relative to iron supplementation — must be separated by at least 4 hours. If compliance and timing are adequate, dose increase to 88-100mcg is indicated.',
          learningPoint: 'Levothyroxine absorption is significantly reduced by iron, calcium, PPIs, and soy. Always verify medication timing before increasing dose.',
        });
      }
      if (condition === 'Iron deficiency anemia') {
        const hgb = order.results.find(r => r.name === 'Hemoglobin');
        const iron = order.results.find(r => r.name === 'Iron');
        const mcv = order.results.find(r => r.name === 'MCV');
        diagnosisValidation.push({
          originalDiagnosis: 'Iron Deficiency Anemia',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'D50.9',
          verdict: 'validated',
          confidence: 96,
          supportingEvidence: [
            ...(hgb ? [{ lab: 'Hemoglobin', finding: `${hgb.value} g/dL (ref 12-16) — confirms anemia`, supports: true }] : []),
            ...(mcv ? [{ lab: 'MCV', finding: `${mcv.value} fL (ref 80-100) — microcytic, classic for iron deficiency`, supports: true }] : []),
            ...(iron ? [{ lab: 'Iron', finding: `${iron.value} mcg/dL (ref 60-170) — low serum iron`, supports: true }] : []),
          ],
          clinicalReasoning: 'Classic iron deficiency anemia pattern: low hemoglobin + microcytic (low MCV) + low iron + high TIBC. Slow improvement with oral iron raises question of GI malabsorption or ongoing blood loss.',
          providerFeedback: 'Diagnosis confirmed. Improvement is slow — consider GI evaluation for occult blood loss (colonoscopy if age-appropriate, stool guaiac). If oral iron fails after 3 months, IV iron infusion indicated.',
        });
      }
      if (condition === 'BPH') {
        const psa = order.results.find(r => r.name === 'PSA');
        diagnosisValidation.push({
          originalDiagnosis: 'Benign Prostatic Hyperplasia',
          encounterDate: order.encounterDate || order.orderDate,
          icdCode: 'N40.0',
          verdict: 'validated',
          confidence: 85,
          supportingEvidence: [
            ...(psa ? [{ lab: 'PSA', finding: `${psa.value} ng/mL (ref < 4.0) — within normal range, no concern for malignancy`, supports: true }] : []),
          ],
          clinicalReasoning: 'PSA within normal limits supports BPH diagnosis and argues against prostate malignancy. PSA trending up slightly from 1.8 to 2.1 over 12 months — within expected variation.',
          providerFeedback: 'Reassuring results. Continue current BPH management. PSA velocity is within normal bounds (<0.75 ng/mL/year). Recheck annually.',
        });
      }
    });
  }

  // Add-on Orders (additional labs that could be ordered based on results)
  const addOnOrders: AddOnOrder[] = [];
  if (abnormals.some(a => a.name.includes('eGFR') || a.name.includes('Creatinine'))) {
    addOnOrders.push(
      { id: 'ao-uacr', name: 'Urine Albumin-to-Creatinine Ratio', code: 'UACR', reason: 'Assess for diabetic nephropathy progression', priority: 'routine', selected: false },
      { id: 'ao-pth', name: 'Parathyroid Hormone (PTH)', code: 'PTH', reason: 'CKD Stage 3 mineral bone disorder screening', priority: 'routine', selected: false },
      { id: 'ao-phos', name: 'Phosphorus', code: 'PHOS', reason: 'CKD mineral metabolism monitoring', priority: 'routine', selected: false },
    );
  }
  if (abnormals.some(a => a.name.includes('Cholesterol') || a.name.includes('LDL'))) {
    addOnOrders.push(
      { id: 'ao-apob', name: 'Apolipoprotein B', code: 'APOB', reason: 'Better CV risk stratification than LDL alone', priority: 'routine', selected: false },
      { id: 'ao-lpa', name: 'Lipoprotein(a)', code: 'LP(a)', reason: 'Genetic CV risk factor — test once if not done', priority: 'routine', selected: false },
    );
  }
  if (abnormals.some(a => a.name.includes('Hemoglobin') || a.name.includes('Iron'))) {
    addOnOrders.push(
      { id: 'ao-retic', name: 'Reticulocyte Count', code: 'RETIC', reason: 'Assess bone marrow response to iron therapy', priority: 'routine', selected: false },
      { id: 'ao-fobt', name: 'Fecal Occult Blood Test', code: 'FOBT', reason: 'Screen for GI blood loss as cause of iron deficiency', priority: 'urgent', selected: false },
    );
  }
  if (abnormals.some(a => a.name === 'TSH')) {
    addOnOrders.push(
      { id: 'ao-tpo', name: 'Anti-TPO Antibodies', code: 'TPO-Ab', reason: 'Confirm autoimmune thyroiditis if not already tested', priority: 'routine', selected: false },
    );
  }

  return {
    summary: abnormals.length === 0
      ? 'All results are within normal range. No follow-up needed.'
      : `${abnormals.length} abnormal result${abnormals.length > 1 ? 's' : ''} identified requiring attention.`,
    abnormalities,
    patientMessages,
    handouts,
    followUpLabs,
    addendumText: addendum,
    diagnosisValidation,
    addOnOrders,
  };
}

// =============================================================================
// Sub-Components
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    normal: { bg: '#dcfce7', text: '#166534', label: 'Normal' },
    abnormal: { bg: '#fef3c7', text: '#92400e', label: 'Abnormal' },
    critical: { bg: '#fecaca', text: '#991b1b', label: 'Critical' },
  };
  const c = config[status] || config.normal;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-green-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

// =============================================================================
// Main Component
// =============================================================================

export const LabResultsReview: React.FC<{ onNewOrder?: () => void }> = ({ onNewOrder }) => {
  const [orders, setOrders] = useState(MOCK_LAB_ORDERS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_LAB_ORDERS[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unreviewed' | 'abnormal'>('all');
  const [expandedAbnormality, setExpandedAbnormality] = useState<string | null>(null);
  const [selectedHandouts, setSelectedHandouts] = useState<Set<string>>(new Set());
  const [responseText, setResponseText] = useState('');
  const [messageVariant, setMessageVariant] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'message' | 'followup' | 'dxvalidation'>('analysis');
  const [addOnOrders, setAddOnOrders] = useState<AddOnOrder[]>([]);
  const [expandedDx, setExpandedDx] = useState<string | null>(null);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedId), [orders, selectedId]);
  const analysis = useMemo(() => selectedOrder ? generateAIAnalysis(selectedOrder) : null, [selectedOrder]);

  // Initialize follow-up labs state from analysis
  const [followUpLabs, setFollowUpLabs] = useState<FollowUpLab[]>([]);
  React.useEffect(() => {
    if (analysis) {
      setFollowUpLabs(analysis.followUpLabs);
      setAddOnOrders(analysis.addOnOrders);
      setMessageVariant(0);
      setResponseText(analysis.patientMessages[0]?.text || '');
      setSelectedHandouts(new Set());
      setExpandedAbnormality(null);
      setExpandedDx(null);
      setIsEditing(false);
      setShowAddendum(false);
      setActiveTab('analysis');
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.patientName.toLowerCase().includes(q) ||
        o.panelName.toLowerCase().includes(q) ||
        o.mrn.toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'unreviewed') filtered = filtered.filter(o => !o.reviewed);
    if (filterStatus === 'abnormal') filtered = filtered.filter(o => o.results.some(r => r.status !== 'normal'));
    return filtered;
  }, [orders, searchQuery, filterStatus]);

  const handleMarkReviewed = useCallback(() => {
    if (!selectedId) return;
    setOrders(prev => prev.map(o => o.id === selectedId ? { ...o, reviewed: true } : o));
  }, [selectedId]);

  const toggleFollowUpLab = (labId: string) => {
    setFollowUpLabs(prev => prev.map(l => l.id === labId ? { ...l, selected: !l.selected } : l));
  };

  const toggleAddOnOrder = (orderId: string) => {
    setAddOnOrders(prev => prev.map(o => o.id === orderId ? { ...o, selected: !o.selected } : o));
  };

  const toggleHandout = (url: string) => {
    setSelectedHandouts(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(responseText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch { /* noop */ }
  };

  const abnormalCount = (order: LabOrder) => order.results.filter(r => r.status !== 'normal').length;
  const criticalCount = (order: LabOrder) => order.results.filter(r => r.status === 'critical').length;

  return (
    <div className="h-full flex rounded-xl overflow-hidden" style={{ background: colors.panelBg }}>
      {/* LEFT PANEL: Lab Result List */}
      <div className="w-[300px] flex flex-col flex-shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Search & Filter */}
        <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search patients or labs..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-teal-400"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'unreviewed', 'abnormal'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={filterStatus === f
                  ? { background: colors.accent, color: 'white' }
                  : { color: 'rgba(255,255,255,0.5)' }
                }>
                {f === 'all' ? 'All' : f === 'unreviewed' ? 'Unreviewed' : 'Abnormal'}
              </button>
            ))}
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredOrders.map(order => {
            const isSelected = selectedId === order.id;
            const abnCount = abnormalCount(order);
            const critCount = criticalCount(order);

            return (
              <button
                key={order.id}
                onClick={() => setSelectedId(order.id)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: isSelected ? colors.accent : order.reviewed ? colors.cardRead : colors.cardDark,
                  border: isSelected ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{order.patientName}</span>
                    {!order.reviewed && (
                      <span className="w-2 h-2 rounded-full bg-teal-300 flex-shrink-0" />
                    )}
                  </div>
                  {critCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500/80 text-white text-[10px] font-bold rounded animate-pulse">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/60 mb-1.5">{order.panelName}</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(order.resultDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                  <span className="text-white/50">{order.results.length} tests</span>
                  {abnCount > 0 && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                      <span className="font-semibold" style={{ color: critCount > 0 ? '#fca5a5' : '#fcd34d' }}>
                        {abnCount} abnormal
                      </span>
                    </>
                  )}
                  {order.priority === 'stat' || order.priority === 'urgent' ? (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                      <span className="text-orange-300 font-semibold uppercase">{order.priority}</span>
                    </>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className="p-3 text-center text-[10px] flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
          {orders.filter(o => !o.reviewed).length} unreviewed of {orders.length} results
        </div>
      </div>

      {/* RIGHT PANEL: AI Analysis */}
      {selectedOrder && analysis ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: colors.panelBgRight }}>
          {/* Patient Header */}
          <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
            style={{ background: colors.headerGradient }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {selectedOrder.patientName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{selectedOrder.patientName}</span>
                  <span className="text-teal-200 text-sm">{selectedOrder.patientAge}y · {selectedOrder.mrn}</span>
                </div>
                <div className="flex items-center gap-3 text-teal-200 text-xs mt-0.5">
                  <span>{selectedOrder.panelName}</span>
                  <span>·</span>
                  <span>Resulted {new Date(selectedOrder.resultDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {selectedOrder.allergies[0] !== 'NKDA' && (
                    <span className="flex items-center gap-1 text-red-300">
                      <AlertTriangle className="w-3 h-3" /> {selectedOrder.allergies.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrder.encounterId && (
                <button className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#0C4C5E' }}
                  onClick={() => setShowAddendum(!showAddendum)}>
                  <FileText className="w-3.5 h-3.5" />
                  {showAddendum ? 'Hide Addendum' : 'Add to Encounter'}
                </button>
              )}
              <button onClick={handleMarkReviewed}
                className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors"
                style={{ background: selectedOrder.reviewed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)' }}>
                {selectedOrder.reviewed ? <CheckCircle className="w-3.5 h-3.5 text-green-300" /> : <Eye className="w-3.5 h-3.5" />}
                {selectedOrder.reviewed ? 'Reviewed' : 'Mark Reviewed'}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Results Table */}
            <div className="w-[35%] p-4 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Results Summary */}
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4" style={{ color: colors.gold }} />
                <span className="text-sm font-bold text-white">Results Summary</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(200,164,78,0.2)', color: colors.gold }}>
                  {analysis.abnormalities.length} abnormal
                </span>
              </div>

              {/* Conditions & Meds Context */}
              <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Clinical Context
                </div>
                <div className="text-xs text-white/70 mb-1">
                  <span className="text-white/40">Dx:</span> {selectedOrder.conditions.join(', ')}
                </div>
                <div className="text-xs text-white/70">
                  <span className="text-white/40">Meds:</span> {selectedOrder.medications.map(m => `${m.name} ${m.dose}`).join(', ')}
                </div>
              </div>

              {/* Results Table */}
              <div className="space-y-1">
                {selectedOrder.results.map(lab => (
                  <div key={lab.id} className="p-2.5 rounded-xl text-xs"
                    style={{
                      background: lab.status === 'critical' ? 'rgba(239,68,68,0.15)' :
                                  lab.status === 'abnormal' ? 'rgba(251,191,36,0.1)' : colors.sectionBg,
                      border: lab.status === 'critical' ? '1px solid rgba(239,68,68,0.3)' :
                              lab.status === 'abnormal' ? '1px solid rgba(251,191,36,0.2)' : `1px solid ${colors.border}`,
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{
                        color: lab.status === 'critical' ? '#fca5a5' :
                               lab.status === 'abnormal' ? '#fcd34d' : colors.textSecondary,
                      }}>{lab.name}</span>
                      <div className="flex items-center gap-2">
                        {lab.trend && <TrendIcon trend={lab.trend} />}
                        <span className="font-bold" style={{
                          color: lab.status === 'critical' ? '#fca5a5' :
                                 lab.status === 'abnormal' ? '#fcd34d' : colors.text,
                        }}>
                          {lab.value} {lab.unit}
                        </span>
                        <StatusBadge status={lab.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ color: colors.textMuted }}>Ref: {lab.referenceRange}</span>
                      {lab.previousValue && (
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Prev: {lab.previousValue} ({lab.previousDate})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Panel */}
            <div className="w-[65%] flex flex-col overflow-hidden">
              {/* Tab Navigation */}
              <ReviewTabBar
                tabs={[
                  { id: 'analysis', label: 'AI Analysis', icon: Brain },
                  { id: 'dxvalidation', label: 'Dx Validation', icon: Target },
                  { id: 'followup', label: 'Orders', icon: Beaker },
                  { id: 'message', label: 'Message', icon: Send },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
              />

              <div className="flex-1 overflow-y-auto p-4">
                {/* ============ AI Analysis Tab ============ */}
                {activeTab === 'analysis' && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">AI Summary</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{analysis.summary}</div>
                      </div>
                    </div>

                    {analysis.abnormalities.length === 0 ? (
                      <div className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <div className="text-sm font-semibold text-white mb-1">All Results Normal</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>No abnormalities to review.</div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Abnormality Analysis
                        </div>
                        {analysis.abnormalities.map(abn => {
                          const isExpanded = expandedAbnormality === abn.labName;
                          return (
                            <div key={abn.labName} className="rounded-xl overflow-hidden"
                              style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                              {/* Brief */}
                              <button onClick={() => setExpandedAbnormality(isExpanded ? null : abn.labName)}
                                className="w-full p-3 text-left">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold" style={{ color: colors.text }}>{abn.labName}</span>
                                      <span className="text-xs font-bold" style={{ color: abn.status === 'critical' ? '#dc2626' : '#d97706' }}>
                                        {abn.value} {abn.unit}
                                      </span>
                                      <StatusBadge status={abn.status} />
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{abn.briefCause}</p>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    <span className="text-[10px] font-medium" style={{ color: colors.accent }}>
                                      {isExpanded ? 'Less' : 'Dive Deeper'}
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                                  </div>
                                </div>
                              </button>

                              {/* Expanded Detail */}
                              {isExpanded && (
                                <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                                  <div className="pt-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                      Detailed Explanation
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{abn.detailedExplanation}</p>
                                  </div>

                                  <div className="p-2.5 rounded-lg" style={{ background: colors.sectionBg }}>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                      Clinical Significance
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{abn.clinicalSignificance}</p>
                                  </div>

                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                      Possible Causes
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {abn.possibleCauses.map((cause, i) => (
                                        <span key={i} className="px-2 py-1 rounded-lg text-[11px]"
                                          style={{ background: colors.accentLight, color: colors.text }}>{cause}</span>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                      Recommended Actions
                                    </div>
                                    {abn.recommendedActions.map((action, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs py-0.5" style={{ color: colors.textSecondary }}>
                                        <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: colors.accent }} />
                                        {action}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Encounter Addendum (shown inline when toggled) */}
                    {showAddendum && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" style={{ color: colors.gold }} />
                          <span className="text-sm font-bold text-white">Encounter Addendum</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(200,164,78,0.2)', color: colors.gold }}>
                            {selectedOrder.encounterDate} — {selectedOrder.encounterReason}
                          </span>
                        </div>
                        <textarea
                          value={analysis.addendumText}
                          className="w-full h-48 p-3 rounded-xl text-xs leading-relaxed resize-none"
                          style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, color: colors.text, outline: 'none' }}
                          readOnly
                        />
                        <button className="mt-2 px-4 py-2 text-xs text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                          <FileText className="w-3.5 h-3.5" />
                          Sign & Add to Encounter {selectedOrder.encounterId}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ============ Dx Validation Tab ============ */}
                {activeTab === 'dxvalidation' && analysis && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Target className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">ML Diagnosis Validation</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          AI compares lab results against the encounter diagnosis to validate or refute clinical reasoning. Use this feedback to sharpen diagnostic accuracy.
                        </div>
                      </div>
                    </div>

                    {analysis.diagnosisValidation.length === 0 ? (
                      <div className="p-6 text-center">
                        <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <div className="text-sm font-semibold text-white mb-1">No Diagnoses to Validate</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>No encounter diagnosis linked to these lab results.</div>
                      </div>
                    ) : (
                      analysis.diagnosisValidation.map(dx => {
                        const isExpanded = expandedDx === dx.icdCode;
                        const verdictConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
                          validated: { icon: <ThumbsUp className="w-4 h-4" />, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'VALIDATED' },
                          refuted: { icon: <ThumbsDown className="w-4 h-4" />, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'REFUTED' },
                          inconclusive: { icon: <HelpCircle className="w-4 h-4" />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'INCONCLUSIVE' },
                          partially_validated: { icon: <HelpCircle className="w-4 h-4" />, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'PARTIAL' },
                        };
                        const vc = verdictConfig[dx.verdict] || verdictConfig.inconclusive;

                        return (
                          <div key={dx.icdCode} className="rounded-xl overflow-hidden"
                            style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                            <button onClick={() => setExpandedDx(isExpanded ? null : dx.icdCode)}
                              className="w-full p-3 text-left">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold" style={{ color: colors.text }}>{dx.originalDiagnosis}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.05)', color: colors.textMuted }}>
                                      {dx.icdCode}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                      style={{ background: vc.bg, color: vc.color }}>
                                      {vc.icon}
                                      {vc.label}
                                    </span>
                                    <span className="text-[10px]" style={{ color: colors.textMuted }}>
                                      {dx.confidence}% confidence
                                    </span>
                                    <span className="text-[10px]" style={{ color: colors.textMuted }}>
                                      · Encounter {dx.encounterDate}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                  <span className="text-[10px] font-medium" style={{ color: colors.accent }}>
                                    {isExpanded ? 'Less' : 'Details'}
                                  </span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: colors.accent }} /> : <ChevronDown className="w-4 h-4" style={{ color: colors.accent }} />}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                                {/* Supporting Evidence */}
                                <div className="pt-3">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                    Lab Evidence
                                  </div>
                                  <div className="space-y-1">
                                    {dx.supportingEvidence.map((ev, i) => (
                                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg text-xs"
                                        style={{ background: ev.supports ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' }}>
                                        {ev.supports
                                          ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-green-500" />
                                          : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />}
                                        <div>
                                          <span className="font-semibold" style={{ color: colors.text }}>{ev.lab}: </span>
                                          <span style={{ color: colors.textSecondary }}>{ev.finding}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Clinical Reasoning */}
                                <div className="p-2.5 rounded-lg" style={{ background: colors.sectionBg }}>
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
                                    Clinical Reasoning
                                  </div>
                                  <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{dx.clinicalReasoning}</p>
                                </div>

                                {/* Alternative Diagnoses */}
                                {dx.alternativeDiagnoses && dx.alternativeDiagnoses.length > 0 && (
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#f59e0b' }}>
                                      Consider Alternative Diagnoses
                                    </div>
                                    {dx.alternativeDiagnoses.map((alt, i) => (
                                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg text-xs mb-1"
                                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                        <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                                        <div>
                                          <span className="font-semibold" style={{ color: colors.text }}>{alt.diagnosis}</span>
                                          <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                                            {alt.likelihood} likelihood
                                          </span>
                                          <div className="mt-0.5" style={{ color: colors.textMuted }}>
                                            Supporting: {alt.supportingLabs.join(', ')}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Provider Feedback */}
                                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(200,164,78,0.08)', border: '1px solid rgba(200,164,78,0.2)' }}>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.gold }}>
                                      Provider Feedback
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{dx.providerFeedback}</p>
                                </div>

                                {/* Learning Point */}
                                {dx.learningPoint && (
                                  <div className="flex items-start gap-2 p-2.5 rounded-lg"
                                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-blue-400">Learning Point</div>
                                      <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{dx.learningPoint}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ============ Patient Message Tab ============ */}
                {activeTab === 'message' && analysis && (
                  <div className="space-y-3">
                    {/* Variation Selector + AI draft label */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(200,164,78,0.1)' }}>
                        <Sparkles className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                        <span className="text-xs font-medium" style={{ color: colors.gold }}>
                          {isEditing ? 'Edited by provider' : 'AI-generated draft — click to edit'}
                        </span>
                      </div>
                      {!isEditing && (
                        <div className="flex bg-white/10 rounded-lg p-0.5">
                          {analysis.patientMessages.map((msg, idx) => (
                            <button key={idx}
                              onClick={() => { setMessageVariant(idx); setResponseText(msg.text); }}
                              className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                              style={messageVariant === idx
                                ? { background: colors.accent, color: 'white' }
                                : { color: 'rgba(255,255,255,0.5)' }
                              }>
                              {msg.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message textarea */}
                    <div className="relative">
                      <textarea
                        ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        value={responseText}
                        onChange={e => { setResponseText(e.target.value); setIsEditing(true); }}
                        onFocus={() => setIsEditing(true)}
                        className="w-full p-4 rounded-xl text-sm leading-relaxed resize-none transition-all"
                        style={{
                          border: isEditing ? '2px solid #25B8A9' : `2px solid rgba(255,255,255,0.1)`,
                          background: isEditing ? '#FFFFFF' : colors.sectionBg,
                          outline: 'none', color: colors.text,
                        }}
                      />
                    </div>

                    {/* Handouts */}
                    {analysis.handouts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4" style={{ color: colors.gold }} />
                          <span className="text-sm font-bold text-white">Attach Patient Handouts</span>
                        </div>
                        <div className="space-y-1.5">
                          {analysis.handouts.map(handout => {
                            const isSelected = selectedHandouts.has(handout.url);
                            return (
                              <div key={handout.url}
                                className="flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer"
                                style={{
                                  background: isSelected ? colors.accentLight : 'rgba(255,255,255,0.06)',
                                  border: isSelected ? '1px solid rgba(26,143,168,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                }}
                                onClick={() => toggleHandout(handout.url)}>
                                <button className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: isSelected ? colors.accent : 'transparent', border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.2)' }}>
                                  {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold" style={{ color: isSelected ? colors.text : 'rgba(255,255,255,0.8)' }}>
                                    {handout.title}
                                  </div>
                                  <div className="text-[10px]" style={{ color: isSelected ? colors.textMuted : 'rgba(255,255,255,0.4)' }}>
                                    {handout.source} — {handout.relevance}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSelected ? colors.accent : 'rgba(255,255,255,0.3)' }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Send actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        {selectedHandouts.size > 0 && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                            style={{ background: 'rgba(37,184,169,0.15)', color: '#7dd3c8' }}>
                            <BookOpen className="w-3 h-3" />
                            {selectedHandouts.size} handout{selectedHandouts.size > 1 ? 's' : ''} attached
                          </span>
                        )}
                        <button onClick={handleCopy}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Copy">
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button disabled={!responseText.trim()}
                        className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-40"
                        style={{ background: responseText.trim() ? 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' : 'rgba(255,255,255,0.1)' }}>
                        <Send className="w-4 h-4" />
                        Send Results to Patient
                        {selectedHandouts.size > 0 && ` + ${selectedHandouts.size} Handouts`}
                      </button>
                    </div>
                  </div>
                )}

                {/* ============ Follow-up Orders Tab ============ */}
                {activeTab === 'followup' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'rgba(200,164,78,0.1)', border: '1px solid rgba(200,164,78,0.2)' }}>
                      <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">AI-Recommended Follow-up</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Based on today's results, conditions, and current medications, these follow-up labs are recommended.
                        </div>
                      </div>
                    </div>

                    {followUpLabs.length === 0 ? (
                      <div className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <div className="text-sm font-semibold text-white mb-1">No Follow-up Needed</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>All results normal — routine monitoring schedule applies.</div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {followUpLabs.map(lab => (
                          <div key={lab.id}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all"
                            style={{
                              background: lab.selected ? colors.accentLight : 'rgba(255,255,255,0.06)',
                              border: lab.selected ? '1px solid rgba(26,143,168,0.2)' : '1px solid rgba(255,255,255,0.1)',
                            }}>
                            <button onClick={() => toggleFollowUpLab(lab.id)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: lab.selected ? colors.accent : 'transparent', border: lab.selected ? 'none' : '2px solid rgba(255,255,255,0.2)' }}>
                              {lab.selected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            </button>
                            <Beaker className="w-4 h-4 flex-shrink-0" style={{ color: lab.selected ? colors.accent : 'rgba(255,255,255,0.4)' }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold" style={{ color: lab.selected ? colors.text : 'rgba(255,255,255,0.8)' }}>
                                {lab.name}
                              </div>
                              <div className="text-[10px]" style={{ color: lab.selected ? colors.textMuted : 'rgba(255,255,255,0.4)' }}>
                                {lab.reason}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Calendar className="w-3 h-3" style={{ color: lab.selected ? colors.accent : 'rgba(255,255,255,0.3)' }} />
                              <span className="text-[10px] font-medium" style={{ color: lab.selected ? colors.accent : 'rgba(255,255,255,0.4)' }}>
                                {lab.timeframe}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {followUpLabs.some(l => l.selected) && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                          style={{ background: 'rgba(37,184,169,0.15)', color: '#7dd3c8' }}>
                          <ClipboardList className="w-3 h-3" />
                          {followUpLabs.filter(l => l.selected).length} labs selected
                        </span>
                        <button className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                          <Beaker className="w-4 h-4" />
                          Order Follow-up Labs
                        </button>
                      </div>
                    )}

                    {/* Add-on Orders */}
                    {addOnOrders.length > 0 && (
                      <>
                        <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Add-on / Additional Orders
                        </div>
                        <div className="p-3 rounded-xl flex items-start gap-3 mb-2"
                          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                          <ShoppingCart className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Based on the current results, these additional tests may provide further diagnostic clarity. Select to add to the order.
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {addOnOrders.map(order => (
                            <div key={order.id}
                              className="flex items-center gap-3 p-3 rounded-xl transition-all"
                              style={{
                                background: order.selected ? colors.accentLight : 'rgba(255,255,255,0.06)',
                                border: order.selected ? '1px solid rgba(26,143,168,0.2)' : '1px solid rgba(255,255,255,0.1)',
                              }}>
                              <button onClick={() => toggleAddOnOrder(order.id)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: order.selected ? colors.accent : 'transparent', border: order.selected ? 'none' : '2px solid rgba(255,255,255,0.2)' }}>
                                {order.selected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />}
                              </button>
                              <Beaker className="w-4 h-4 flex-shrink-0" style={{ color: order.selected ? colors.accent : 'rgba(255,255,255,0.4)' }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold" style={{ color: order.selected ? colors.text : 'rgba(255,255,255,0.8)' }}>
                                    {order.name}
                                  </span>
                                  {order.priority !== 'routine' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                                      style={{ background: order.priority === 'stat' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: order.priority === 'stat' ? '#fca5a5' : '#fcd34d' }}>
                                      {order.priority}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px]" style={{ color: order.selected ? colors.textMuted : 'rgba(255,255,255,0.4)' }}>
                                  {order.reason}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {addOnOrders.some(o => o.selected) && (
                          <div className="flex items-center justify-between pt-2">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                              <ShoppingCart className="w-3 h-3" />
                              {addOnOrders.filter(o => o.selected).length} add-on{addOnOrders.filter(o => o.selected).length > 1 ? 's' : ''} selected
                            </span>
                            <button className="px-4 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]"
                              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                              <ShoppingCart className="w-4 h-4" />
                              Order Add-ons
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* New Order button */}
                    {onNewOrder && (
                      <button onClick={onNewOrder}
                        className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                        + New Lab Order
                      </button>
                    )}

                    {/* Addendum shortcut */}
                    {selectedOrder.encounterId && !showAddendum && (
                      <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                            <div>
                              <div className="text-xs font-medium text-white/80">Add to Encounter Note</div>
                              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Encounter {selectedOrder.encounterDate} — {selectedOrder.encounterReason}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => { setShowAddendum(true); setActiveTab('analysis'); }}
                            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
                            style={{ color: colors.gold, background: 'rgba(200,164,78,0.15)' }}>
                            <FileText className="w-3 h-3" />
                            Create Addendum
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ background: colors.panelBgRight }}>
          <div className="text-center">
            <Beaker className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <div className="text-sm text-white/40">Select a lab result to review</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabResultsReview;
