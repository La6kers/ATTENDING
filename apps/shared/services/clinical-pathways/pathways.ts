// ============================================================
// ATTENDING AI - Clinical Pathway Definitions
// apps/shared/services/clinical-pathways/pathways.ts
//
// Evidence-based clinical pathways ready for automation
// ============================================================

import { ClinicalPathway } from './types';

// ============================================================
// CHEST PAIN / ACUTE CORONARY SYNDROME PATHWAY
// Based on ACC/AHA 2021 Guidelines
// ============================================================

export const chestPainACSPathway: ClinicalPathway = {
  id: 'pathway-chest-pain-acs',
  name: 'Acute Coronary Syndrome Evaluation',
  shortName: 'ACS',
  description: 'Standardized evaluation pathway for patients presenting with chest pain concerning for acute coronary syndrome',
  version: '2.0.0',
  lastUpdated: '2024-01-15',
  source: 'ACC/AHA 2021 Chest Pain Guidelines',
  
  category: 'cardiovascular',
  specialty: ['emergency_medicine', 'internal_medicine', 'cardiology'],
  tags: ['chest pain', 'ACS', 'STEMI', 'NSTEMI', 'unstable angina', 'cardiac'],
  enabled: true,

  trigger: {
    operator: 'AND',
    symptoms: [
      {
        symptom: 'chest pain',
        synonyms: ['chest discomfort', 'chest pressure', 'chest tightness', 'substernal pain'],
        required: true,
        severity: 'any',
      },
    ],
    demographics: {
      minAge: 25,
      riskFactors: ['diabetes', 'hypertension', 'hyperlipidemia', 'smoking', 'family history CAD', 'prior MI', 'prior PCI', 'prior CABG'],
    },
    minConfidence: 0.6,
  },

  riskTool: {
    name: 'HEART Score',
    shortName: 'HEART',
    description: 'Risk stratification for chest pain patients in the ED',
    inputs: [
      {
        id: 'history',
        label: 'History',
        type: 'select',
        options: [
          { value: 0, label: 'Slightly suspicious', points: 0 },
          { value: 1, label: 'Moderately suspicious', points: 1 },
          { value: 2, label: 'Highly suspicious', points: 2 },
        ],
      },
      {
        id: 'ecg',
        label: 'ECG',
        type: 'select',
        options: [
          { value: 0, label: 'Normal', points: 0 },
          { value: 1, label: 'Non-specific repolarization', points: 1 },
          { value: 2, label: 'Significant ST deviation', points: 2 },
        ],
      },
      {
        id: 'age',
        label: 'Age',
        type: 'select',
        options: [
          { value: 0, label: '< 45 years', points: 0 },
          { value: 1, label: '45-64 years', points: 1 },
          { value: 2, label: '≥ 65 years', points: 2 },
        ],
        source: 'auto_history',
      },
      {
        id: 'risk_factors',
        label: 'Risk Factors',
        type: 'select',
        options: [
          { value: 0, label: 'No known risk factors', points: 0 },
          { value: 1, label: '1-2 risk factors', points: 1 },
          { value: 2, label: '≥ 3 risk factors or known CAD', points: 2 },
        ],
      },
      {
        id: 'troponin',
        label: 'Initial Troponin',
        type: 'select',
        options: [
          { value: 0, label: '≤ normal limit', points: 0 },
          { value: 1, label: '1-3x normal limit', points: 1 },
          { value: 2, label: '> 3x normal limit', points: 2 },
        ],
        source: 'auto_labs',
      },
    ],
    scoringMethod: 'additive',
    maxScore: 10,
    categories: [
      { name: 'Low Risk', minScore: 0, maxScore: 3, risk: 'low', color: '#10B981', recommendation: 'Consider discharge with outpatient follow-up' },
      { name: 'Moderate Risk', minScore: 4, maxScore: 6, risk: 'moderate', color: '#F59E0B', recommendation: 'Observation and serial troponins; consider stress testing' },
      { name: 'High Risk', minScore: 7, maxScore: 10, risk: 'high', color: '#EF4444', recommendation: 'Admit for inpatient evaluation and cardiology consult' },
    ],
    categoryActions: {
      'Low Risk': ['discharge_planning', 'outpatient_follow_up', 'patient_education'],
      'Moderate Risk': ['observation', 'serial_troponins', 'cardiology_consult_consider', 'stress_test'],
      'High Risk': ['admission', 'cardiology_consult_stat', 'anticoagulation', 'cath_lab_alert'],
    },
  },

  steps: [
    {
      order: 1,
      id: 'step-ecg',
      name: 'Obtain 12-Lead ECG',
      description: 'Obtain and interpret 12-lead ECG within 10 minutes of presentation',
      type: 'order',
      timing: {
        target: 10,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_ecg_time',
      },
      actions: [
        {
          type: 'order_procedure',
          description: 'Order STAT 12-lead ECG',
          autoOrder: true,
          orderDetails: {
            orderType: 'procedure',
            orderNames: ['12-Lead ECG'],
            orderCodes: ['93000'],
            priority: 'stat',
            instructions: 'STAT - Chest pain evaluation',
          },
        },
      ],
      branches: [
        {
          condition: { type: 'clinical_decision', field: 'ecg_stemi', operator: '==', value: true },
          nextStepId: 'step-stemi-activation',
          description: 'If STEMI criteria met, activate cath lab',
        },
      ],
      optional: false,
      rationale: 'Early ECG identifies STEMI patients who need emergent reperfusion',
      evidence: [
        {
          source: 'ACC/AHA',
          citation: '2021 Chest Pain Guideline',
          level: 'A',
          recommendation: 'I',
        },
      ],
      prerequisites: [],
    },
    {
      order: 2,
      id: 'step-troponin',
      name: 'Order Cardiac Biomarkers',
      description: 'Order high-sensitivity troponin and BNP',
      type: 'order',
      timing: {
        target: 30,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_troponin_time',
      },
      actions: [
        {
          type: 'order_lab',
          description: 'Order STAT cardiac panel',
          autoOrder: true,
          orderDetails: {
            orderType: 'lab',
            orderNames: ['Troponin I High Sensitivity', 'BNP', 'BMP', 'CBC', 'PT/INR'],
            priority: 'stat',
          },
        },
      ],
      optional: false,
      rationale: 'High-sensitivity troponin allows earlier rule-out of MI',
      evidence: [
        {
          source: 'ACC/AHA',
          citation: '2021 Chest Pain Guideline',
          level: 'A',
          recommendation: 'I',
        },
      ],
      prerequisites: ['step-ecg'],
    },
    {
      order: 3,
      id: 'step-aspirin',
      name: 'Administer Aspirin',
      description: 'Administer aspirin 324mg chewed (unless contraindicated)',
      type: 'medication',
      timing: {
        target: 15,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_aspirin_time',
      },
      actions: [
        {
          type: 'order_medication',
          description: 'Order aspirin 324mg PO',
          autoOrder: true,
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Aspirin 324mg chewable'],
            priority: 'stat',
            instructions: 'Chew and swallow. Hold if active bleeding, allergy, or severe asthma.',
          },
        },
      ],
      optional: false,
      rationale: 'Aspirin reduces mortality in ACS',
      evidence: [
        {
          source: 'ACC/AHA',
          citation: 'ISIS-2 Trial',
          level: 'A',
          recommendation: 'I',
        },
      ],
      prerequisites: ['step-ecg'],
    },
    {
      order: 4,
      id: 'step-risk-stratify',
      name: 'Calculate HEART Score',
      description: 'Calculate HEART score for risk stratification',
      type: 'assessment',
      timing: {
        target: 60,
        targetUnit: 'minutes',
        critical: false,
      },
      actions: [
        {
          type: 'calculate_score',
          description: 'Complete HEART score calculation',
        },
        {
          type: 'document',
          description: 'Document risk stratification',
          documentation: {
            requiredFields: ['heart_score', 'risk_category', 'disposition_plan'],
          },
        },
      ],
      branches: [
        {
          condition: { type: 'score', field: 'heart_score', operator: '<=', value: 3 },
          nextStepId: 'step-low-risk-disposition',
          description: 'Low risk - consider discharge pathway',
        },
        {
          condition: { type: 'score', field: 'heart_score', operator: '>=', value: 7 },
          nextStepId: 'step-high-risk-admission',
          description: 'High risk - admission pathway',
        },
      ],
      optional: false,
      prerequisites: ['step-troponin'],
    },
    {
      order: 5,
      id: 'step-stemi-activation',
      name: 'STEMI Activation',
      description: 'Activate cardiac catheterization lab for primary PCI',
      type: 'procedure',
      timing: {
        target: 90,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_balloon_time',
      },
      actions: [
        {
          type: 'notify',
          description: 'Page interventional cardiology and activate cath lab',
        },
        {
          type: 'order_medication',
          description: 'Initiate anticoagulation protocol',
          autoOrder: true,
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Heparin IV bolus per ACS protocol'],
            priority: 'stat',
          },
        },
        {
          type: 'consult',
          description: 'STAT cardiology consult',
        },
      ],
      optional: true,  // Only if STEMI
      rationale: 'Primary PCI is the preferred reperfusion strategy for STEMI',
      evidence: [
        {
          source: 'ACC/AHA',
          citation: '2013 STEMI Guidelines',
          level: 'A',
          recommendation: 'I',
        },
      ],
      prerequisites: ['step-ecg'],
    },
    {
      order: 6,
      id: 'step-low-risk-disposition',
      name: 'Low Risk Disposition',
      description: 'Discharge planning for low-risk chest pain',
      type: 'disposition',
      timing: {
        target: 4,
        targetUnit: 'hours',
        critical: false,
      },
      actions: [
        {
          type: 'patient_education',
          description: 'Provide chest pain discharge instructions',
        },
        {
          type: 'order_procedure',
          description: 'Schedule outpatient stress test',
          orderDetails: {
            orderType: 'procedure',
            orderNames: ['Exercise Stress Test', 'Stress Echocardiogram'],
            priority: 'routine',
            instructions: 'Schedule within 72 hours',
          },
        },
        {
          type: 'document',
          description: 'Complete discharge summary',
        },
      ],
      optional: true,
      prerequisites: ['step-risk-stratify'],
    },
    {
      order: 7,
      id: 'step-high-risk-admission',
      name: 'High Risk Admission',
      description: 'Admit for inpatient ACS evaluation',
      type: 'disposition',
      timing: {
        target: 2,
        targetUnit: 'hours',
        critical: true,
      },
      actions: [
        {
          type: 'consult',
          description: 'Cardiology consult',
        },
        {
          type: 'order_medication',
          description: 'Initiate ACS medication protocol',
          autoOrder: true,
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Heparin drip', 'Beta-blocker', 'Statin', 'P2Y12 inhibitor'],
            priority: 'urgent',
          },
        },
        {
          type: 'document',
          description: 'Complete admission orders',
        },
      ],
      optional: true,
      prerequisites: ['step-risk-stratify'],
    },
  ],

  outcomes: [
    {
      id: 'outcome-door-to-ecg',
      name: 'Door-to-ECG Time',
      description: 'Time from arrival to ECG completion',
      measureType: 'time',
      target: 10,
      benchmark: 10,
      trackingPeriod: '24h',
      dataSource: 'pathway_completion',
    },
    {
      id: 'outcome-door-to-balloon',
      name: 'Door-to-Balloon Time (STEMI)',
      description: 'Time from arrival to primary PCI for STEMI patients',
      measureType: 'time',
      target: 90,
      benchmark: 90,
      trackingPeriod: '24h',
      dataSource: 'pathway_completion',
    },
    {
      id: 'outcome-30-day-mace',
      name: '30-Day MACE',
      description: 'Major adverse cardiac events within 30 days',
      measureType: 'rate',
      target: 5,
      benchmark: 8,
      trackingPeriod: '30d',
      dataSource: 'claims',
    },
    {
      id: 'outcome-missed-mi',
      name: 'Missed MI Rate',
      description: 'Patients discharged who return with MI within 7 days',
      measureType: 'rate',
      target: 0.5,
      benchmark: 2,
      trackingPeriod: '7d',
      dataSource: 'ehr_data',
    },
  ],
};

// ============================================================
// STROKE/TIA PATHWAY
// Based on AHA/ASA 2019 Guidelines
// ============================================================

export const strokePathway: ClinicalPathway = {
  id: 'pathway-stroke',
  name: 'Acute Stroke Evaluation',
  shortName: 'Stroke',
  description: 'Rapid evaluation pathway for suspected acute stroke or TIA',
  version: '1.5.0',
  lastUpdated: '2024-01-10',
  source: 'AHA/ASA 2019 Stroke Guidelines',
  
  category: 'neurological',
  specialty: ['emergency_medicine', 'neurology'],
  tags: ['stroke', 'TIA', 'CVA', 'neurological emergency', 'thrombolysis'],
  enabled: true,

  trigger: {
    operator: 'OR',
    symptoms: [
      { symptom: 'facial droop', synonyms: ['face drooping', 'facial weakness'], required: false },
      { symptom: 'arm weakness', synonyms: ['arm numbness', 'arm drift'], required: false },
      { symptom: 'speech difficulty', synonyms: ['slurred speech', 'aphasia', 'dysarthria'], required: false },
      { symptom: 'sudden severe headache', synonyms: ['thunderclap headache', 'worst headache'], required: false },
      { symptom: 'vision loss', synonyms: ['sudden blindness', 'visual field cut'], required: false },
      { symptom: 'sudden confusion', synonyms: ['altered mental status', 'disorientation'], required: false },
    ],
    demographics: {
      minAge: 18,
    },
    minConfidence: 0.5,
  },

  steps: [
    {
      order: 1,
      id: 'step-stroke-alert',
      name: 'Activate Stroke Alert',
      description: 'Activate stroke team and notify CT scanner',
      type: 'procedure',
      timing: {
        target: 5,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_stroke_alert',
      },
      actions: [
        {
          type: 'notify',
          description: 'Page stroke team and notify CT',
        },
      ],
      optional: false,
      prerequisites: [],
    },
    {
      order: 2,
      id: 'step-nihss',
      name: 'Perform NIH Stroke Scale',
      description: 'Complete NIH Stroke Scale assessment',
      type: 'assessment',
      timing: {
        target: 10,
        targetUnit: 'minutes',
        critical: true,
      },
      actions: [
        {
          type: 'calculate_score',
          description: 'Complete NIHSS assessment',
        },
      ],
      optional: false,
      prerequisites: ['step-stroke-alert'],
    },
    {
      order: 3,
      id: 'step-ct-head',
      name: 'CT Head Non-Contrast',
      description: 'STAT CT head to rule out hemorrhage',
      type: 'order',
      timing: {
        target: 25,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_ct_time',
      },
      actions: [
        {
          type: 'order_imaging',
          description: 'Order STAT CT Head',
          autoOrder: true,
          orderDetails: {
            orderType: 'imaging',
            orderNames: ['CT Head without contrast'],
            priority: 'stat',
            instructions: 'STROKE ALERT - Priority imaging',
          },
        },
      ],
      branches: [
        {
          condition: { type: 'clinical_decision', field: 'ct_hemorrhage', operator: '==', value: true },
          nextStepId: 'step-hemorrhagic-stroke',
          description: 'If hemorrhage present, hemorrhagic stroke pathway',
        },
      ],
      optional: false,
      prerequisites: ['step-stroke-alert'],
    },
    {
      order: 4,
      id: 'step-tpa-evaluation',
      name: 'tPA Eligibility Evaluation',
      description: 'Evaluate for IV thrombolysis eligibility',
      type: 'assessment',
      timing: {
        target: 45,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'door_to_needle_time',
      },
      actions: [
        {
          type: 'calculate_score',
          description: 'Complete tPA inclusion/exclusion checklist',
        },
        {
          type: 'order_medication',
          description: 'Prepare tPA if eligible',
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Alteplase (tPA) per stroke protocol'],
            priority: 'stat',
          },
        },
      ],
      optional: false,
      prerequisites: ['step-ct-head', 'step-nihss'],
    },
  ],

  outcomes: [
    {
      id: 'outcome-door-to-ct',
      name: 'Door-to-CT Time',
      description: 'Time from arrival to CT completion',
      measureType: 'time',
      target: 25,
      benchmark: 25,
      trackingPeriod: '24h',
      dataSource: 'pathway_completion',
    },
    {
      id: 'outcome-door-to-needle',
      name: 'Door-to-Needle Time',
      description: 'Time from arrival to tPA administration',
      measureType: 'time',
      target: 45,
      benchmark: 60,
      trackingPeriod: '24h',
      dataSource: 'pathway_completion',
    },
  ],
};

// ============================================================
// SEPSIS PATHWAY
// Based on Surviving Sepsis Campaign 2021
// ============================================================

export const sepsisPathway: ClinicalPathway = {
  id: 'pathway-sepsis',
  name: 'Sepsis Evaluation and Management',
  shortName: 'Sepsis',
  description: 'Early recognition and treatment of sepsis',
  version: '2.1.0',
  lastUpdated: '2024-01-12',
  source: 'Surviving Sepsis Campaign 2021',
  
  category: 'infectious',
  specialty: ['emergency_medicine', 'internal_medicine', 'infectious_disease'],
  tags: ['sepsis', 'septic shock', 'infection', 'SIRS', 'qSOFA'],
  enabled: true,

  trigger: {
    operator: 'AND',
    symptoms: [
      { symptom: 'fever', synonyms: ['chills', 'rigors'], required: false },
      { symptom: 'suspected infection', synonyms: ['infection'], required: true },
    ],
    vitals: [
      { vital: 'heart_rate', operator: '>', value: 90 },
      { vital: 'respiratory_rate', operator: '>', value: 20 },
      { vital: 'temperature', operator: '>', value: 38.3 },
    ],
    minConfidence: 0.6,
  },

  steps: [
    {
      order: 1,
      id: 'step-lactate',
      name: 'Obtain Lactate Level',
      description: 'STAT lactate to assess tissue perfusion',
      type: 'order',
      timing: {
        target: 30,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'time_to_lactate',
      },
      actions: [
        {
          type: 'order_lab',
          description: 'Order STAT lactate',
          autoOrder: true,
          orderDetails: {
            orderType: 'lab',
            orderNames: ['Lactate', 'CBC', 'BMP', 'Procalcitonin'],
            priority: 'stat',
          },
        },
      ],
      optional: false,
      prerequisites: [],
    },
    {
      order: 2,
      id: 'step-blood-cultures',
      name: 'Obtain Blood Cultures',
      description: 'Blood cultures x2 before antibiotics',
      type: 'order',
      timing: {
        target: 45,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'time_to_cultures',
      },
      actions: [
        {
          type: 'order_lab',
          description: 'Order blood cultures',
          autoOrder: true,
          orderDetails: {
            orderType: 'lab',
            orderNames: ['Blood culture x2 (separate sites)', 'Urinalysis', 'Urine culture'],
            priority: 'stat',
          },
        },
      ],
      optional: false,
      prerequisites: ['step-lactate'],
    },
    {
      order: 3,
      id: 'step-antibiotics',
      name: 'Administer Broad-Spectrum Antibiotics',
      description: 'IV antibiotics within 1 hour of sepsis recognition',
      type: 'medication',
      timing: {
        target: 60,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'time_to_antibiotics',
      },
      actions: [
        {
          type: 'order_medication',
          description: 'Order empiric antibiotics',
          autoOrder: true,
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Piperacillin-Tazobactam 4.5g IV', 'Vancomycin 25mg/kg IV'],
            priority: 'stat',
            instructions: 'Adjust for renal function. Consider source and local resistance patterns.',
          },
        },
      ],
      optional: false,
      prerequisites: ['step-blood-cultures'],
    },
    {
      order: 4,
      id: 'step-fluid-resuscitation',
      name: 'Fluid Resuscitation',
      description: '30 mL/kg crystalloid for hypotension or lactate ≥ 4',
      type: 'medication',
      timing: {
        target: 180,
        targetUnit: 'minutes',
        critical: true,
        trackMetric: 'time_to_fluid_completion',
      },
      actions: [
        {
          type: 'order_medication',
          description: 'Order IV fluid bolus',
          autoOrder: true,
          orderDetails: {
            orderType: 'medication',
            orderNames: ['Lactated Ringers 30 mL/kg IV bolus'],
            priority: 'stat',
            instructions: 'Reassess after each 500mL. Target MAP ≥ 65.',
          },
        },
      ],
      optional: false,
      prerequisites: ['step-lactate'],
    },
  ],

  outcomes: [
    {
      id: 'outcome-bundle-compliance',
      name: 'Sepsis Bundle Compliance',
      description: 'Percentage completing 1-hour bundle',
      measureType: 'percentage',
      target: 90,
      benchmark: 75,
      trackingPeriod: '24h',
      dataSource: 'pathway_completion',
    },
    {
      id: 'outcome-mortality',
      name: 'Sepsis Mortality Rate',
      description: 'In-hospital mortality for sepsis patients',
      measureType: 'rate',
      target: 15,
      benchmark: 25,
      trackingPeriod: '30d',
      dataSource: 'claims',
    },
  ],
};

// ============================================================
// PATHWAY REGISTRY
// ============================================================

export const clinicalPathways: ClinicalPathway[] = [
  chestPainACSPathway,
  strokePathway,
  sepsisPathway,
];

export const getPathwayById = (id: string): ClinicalPathway | undefined => {
  return clinicalPathways.find(p => p.id === id);
};

export const getPathwaysByCategory = (category: string): ClinicalPathway[] => {
  return clinicalPathways.filter(p => p.category === category);
};

export const getActivePathways = (): ClinicalPathway[] => {
  return clinicalPathways.filter(p => p.enabled);
};

export default clinicalPathways;
