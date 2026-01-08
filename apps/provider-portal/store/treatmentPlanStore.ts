// ============================================================
// Treatment Plan Store - Orchestration Layer
// apps/provider-portal/store/treatmentPlanStore.ts
//
// Coordinates all ordering modules (Labs, Imaging, Medications, Referrals)
// with diagnosis-driven recommendations and evidence-based protocols
// ============================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export type PlanStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'EXECUTED' | 'MODIFIED';
export type OrderPriority = 'STAT' | 'URGENT' | 'ROUTINE';

export interface Diagnosis {
  code: string;
  description: string;
  type: 'primary' | 'secondary' | 'rule-out';
  icd10?: string;
  confidence?: number;
  supportingEvidence?: string[];
}

export interface FollowUp {
  id: string;
  type: 'appointment' | 'phone' | 'portal' | 'lab_check';
  description: string;
  timeframe: string;
  timeframeDays: number;
  scheduled?: boolean;
  scheduledDate?: string;
  assignedTo?: string;
}

export interface EducationMaterial {
  id: string;
  title: string;
  category: 'condition' | 'medication' | 'procedure' | 'lifestyle' | 'warning';
  contentUrl?: string;
  summary: string;
  languagesAvailable: string[];
  delivered?: boolean;
}

export interface ReturnPrecaution {
  id: string;
  condition: string;
  urgency: 'emergent' | 'urgent' | 'soon';
  instruction: string;
}

// Order summary types (references to submitted orders)
export interface OrderSummary {
  id: string;
  type: 'lab' | 'imaging' | 'medication' | 'referral';
  name: string;
  priority: OrderPriority;
  status: 'pending' | 'submitted' | 'completed' | 'cancelled';
  submittedAt?: Date;
  aiRecommended?: boolean;
}

// AI-generated protocol
export interface TreatmentProtocol {
  id: string;
  name: string;
  diagnosis: string;
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  source: string;
  recommendedLabs: string[];
  recommendedImaging: string[];
  recommendedMedications: string[];
  recommendedReferrals: string[];
  followUpSchedule: Partial<FollowUp>[];
  contraindications: string[];
  warnings: string[];
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  encounterId: string;
  providerId: string;
  
  // Clinical
  diagnoses: Diagnosis[];
  chiefComplaint: string;
  clinicalSummary: string;
  
  // Orders (references to submitted orders)
  labOrders: OrderSummary[];
  imagingOrders: OrderSummary[];
  prescriptions: OrderSummary[];
  referrals: OrderSummary[];
  
  // Plan details
  followUpSchedule: FollowUp[];
  patientEducation: EducationMaterial[];
  returnPrecautions: ReturnPrecaution[];
  additionalInstructions: string;
  
  // Workflow
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  
  // AI
  protocolApplied?: TreatmentProtocol;
  aiConfidence?: number;
}

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
  insurancePlan?: string;
}

interface TreatmentPlanState {
  // Current Plan
  currentPlan: TreatmentPlan | null;
  patientContext: PatientContext | null;
  
  // Protocol recommendations
  suggestedProtocols: TreatmentProtocol[];
  selectedProtocol: TreatmentProtocol | null;
  loadingProtocols: boolean;
  
  // Order tracking (from child stores)
  pendingLabOrders: OrderSummary[];
  pendingImagingOrders: OrderSummary[];
  pendingPrescriptions: OrderSummary[];
  pendingReferrals: OrderSummary[];
  
  // Workflow state
  loading: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  
  // Saved plans history
  savedPlans: TreatmentPlan[];
  
  // Actions - Plan Management
  initializePlan: (patientId: string, encounterId: string, context: PatientContext) => void;
  loadPlan: (planId: string) => Promise<void>;
  savePlan: () => Promise<string>;
  submitPlan: () => Promise<void>;
  clearPlan: () => void;
  
  // Actions - Clinical Content
  addDiagnosis: (diagnosis: Diagnosis) => void;
  updateDiagnosis: (code: string, updates: Partial<Diagnosis>) => void;
  removeDiagnosis: (code: string) => void;
  setClinicalSummary: (summary: string) => void;
  
  // Actions - Protocol Management
  loadProtocols: (diagnoses: Diagnosis[]) => Promise<void>;
  applyProtocol: (protocol: TreatmentProtocol) => void;
  
  // Actions - Orders Integration
  addLabOrder: (order: OrderSummary) => void;
  addImagingOrder: (order: OrderSummary) => void;
  addPrescription: (order: OrderSummary) => void;
  addReferral: (order: OrderSummary) => void;
  removeOrder: (type: OrderSummary['type'], orderId: string) => void;
  
  // Actions - Follow-up & Education
  addFollowUp: (followUp: FollowUp) => void;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => void;
  removeFollowUp: (id: string) => void;
  addEducation: (material: EducationMaterial) => void;
  removeEducation: (id: string) => void;
  addReturnPrecaution: (precaution: ReturnPrecaution) => void;
  removeReturnPrecaution: (id: string) => void;
  setAdditionalInstructions: (instructions: string) => void;
  
  // Computed
  getTotalOrderCount: () => number;
  getStatOrderCount: () => number;
  hasRedFlagDiagnosis: () => boolean;
  validatePlan: () => string[];
  getOrdersByPriority: () => { stat: OrderSummary[]; urgent: OrderSummary[]; routine: OrderSummary[] };
  getCostEstimate: () => { labs: number; imaging: number; medications: number; total: number };
}

// =============================================================================
// Treatment Protocols Database
// =============================================================================

const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
  {
    id: 'proto-migraine-acute',
    name: 'Acute Migraine Management',
    diagnosis: 'Migraine',
    description: 'Evidence-based protocol for acute migraine presentation without red flags',
    evidenceLevel: 'A',
    source: 'American Headache Society Guidelines 2021',
    recommendedLabs: ['CBC-DIFF', 'CMP', 'TSH'],
    recommendedImaging: [],
    recommendedMedications: ['sumatriptan-inj', 'ondansetron', 'ketorolac'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'appointment', description: 'Follow-up visit', timeframe: '2 weeks', timeframeDays: 14 },
      { type: 'phone', description: 'Check treatment response', timeframe: '3 days', timeframeDays: 3 }
    ],
    contraindications: ['Cardiovascular disease', 'Uncontrolled hypertension', 'Hemiplegic migraine'],
    warnings: ['Screen for medication overuse headache']
  },
  {
    id: 'proto-headache-redflag',
    name: 'Red Flag Headache Workup',
    diagnosis: 'Headache - Rule Out Secondary Cause',
    description: 'STAT evaluation protocol for headache with red flag features',
    evidenceLevel: 'B',
    source: 'ACEP Clinical Policy: Headache 2019',
    recommendedLabs: ['CBC-DIFF', 'CMP', 'ESR', 'CRP', 'PT-INR'],
    recommendedImaging: ['CT-HEAD-WO', 'CTA-HEAD-NECK'],
    recommendedMedications: [],
    recommendedReferrals: ['NEURO'],
    followUpSchedule: [
      { type: 'phone', description: 'Imaging results review', timeframe: 'Same day', timeframeDays: 0 }
    ],
    contraindications: [],
    warnings: ['Consider LP if CT negative with high clinical suspicion for SAH', 'Neurology consult if mass effect or hemorrhage']
  },
  {
    id: 'proto-chest-pain-lowrisk',
    name: 'Low-Risk Chest Pain Evaluation',
    diagnosis: 'Chest Pain - Low Risk',
    description: 'Outpatient workup for low-risk chest pain per HEART score',
    evidenceLevel: 'A',
    source: 'ACC/AHA Chest Pain Guidelines 2021',
    recommendedLabs: ['TROPONIN', 'CBC-DIFF', 'CMP', 'LIPID'],
    recommendedImaging: ['ECHO', 'STRESS-TEST'],
    recommendedMedications: ['aspirin-81', 'atorvastatin'],
    recommendedReferrals: ['CARDS'],
    followUpSchedule: [
      { type: 'appointment', description: 'Cardiology follow-up', timeframe: '1 week', timeframeDays: 7 },
      { type: 'lab_check', description: 'Repeat lipid panel (fasting)', timeframe: '6 weeks', timeframeDays: 42 }
    ],
    contraindications: ['Unstable angina', 'Positive troponin'],
    warnings: ['Immediate ED referral if symptoms worsen']
  },
  {
    id: 'proto-dm2-initial',
    name: 'Type 2 Diabetes Initial Workup',
    diagnosis: 'Type 2 Diabetes Mellitus',
    description: 'Comprehensive initial evaluation for newly diagnosed T2DM',
    evidenceLevel: 'A',
    source: 'ADA Standards of Care 2024',
    recommendedLabs: ['HBA1C', 'CMP', 'LIPID', 'UA', 'UACR', 'TSH'],
    recommendedImaging: [],
    recommendedMedications: ['metformin-500', 'metformin-1000'],
    recommendedReferrals: ['ENDO', 'OPHTH'],
    followUpSchedule: [
      { type: 'appointment', description: 'Diabetes education', timeframe: '1 week', timeframeDays: 7 },
      { type: 'lab_check', description: 'HbA1c recheck', timeframe: '3 months', timeframeDays: 90 },
      { type: 'appointment', description: 'Follow-up visit', timeframe: '3 months', timeframeDays: 90 }
    ],
    contraindications: ['eGFR < 30', 'Active liver disease'],
    warnings: ['Hold metformin before contrast procedures', 'Monitor for lactic acidosis symptoms']
  },
  {
    id: 'proto-uti-uncomplicated',
    name: 'Uncomplicated UTI Treatment',
    diagnosis: 'Urinary Tract Infection - Uncomplicated',
    description: 'First-line treatment for uncomplicated cystitis in women',
    evidenceLevel: 'A',
    source: 'IDSA Guidelines 2024',
    recommendedLabs: ['UA', 'URINE-CULTURE'],
    recommendedImaging: [],
    recommendedMedications: ['nitrofurantoin', 'tmp-smx'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'phone', description: 'Symptom check', timeframe: '3 days', timeframeDays: 3 }
    ],
    contraindications: ['Pregnancy', 'Pyelonephritis symptoms', 'Recurrent UTI (>3/year)'],
    warnings: ['Consider urology referral for recurrent infections']
  },
  {
    id: 'proto-hypertension-initial',
    name: 'Hypertension Initial Evaluation',
    diagnosis: 'Essential Hypertension',
    description: 'Initial evaluation and treatment for newly diagnosed hypertension',
    evidenceLevel: 'A',
    source: 'ACC/AHA Hypertension Guidelines 2017',
    recommendedLabs: ['CMP', 'LIPID', 'TSH', 'UA', 'CBC-DIFF'],
    recommendedImaging: ['ECG'],
    recommendedMedications: ['lisinopril', 'amlodipine'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'appointment', description: 'BP recheck', timeframe: '2 weeks', timeframeDays: 14 },
      { type: 'lab_check', description: 'Renal function check', timeframe: '2 weeks', timeframeDays: 14 }
    ],
    contraindications: ['Secondary hypertension'],
    warnings: ['Screen for secondary causes if resistant', 'ASCVD risk calculation']
  },
  {
    id: 'proto-anxiety-gad',
    name: 'Generalized Anxiety Disorder',
    diagnosis: 'Generalized Anxiety Disorder',
    description: 'Initial evaluation and treatment for GAD',
    evidenceLevel: 'A',
    source: 'APA Clinical Practice Guidelines 2023',
    recommendedLabs: ['TSH', 'CBC-DIFF'],
    recommendedImaging: [],
    recommendedMedications: ['sertraline', 'escitalopram'],
    recommendedReferrals: ['PSYCH'],
    followUpSchedule: [
      { type: 'phone', description: 'Medication tolerance check', timeframe: '1 week', timeframeDays: 7 },
      { type: 'appointment', description: 'Symptom assessment', timeframe: '4 weeks', timeframeDays: 28 }
    ],
    contraindications: ['Bipolar disorder', 'Active substance use'],
    warnings: ['Black box warning for suicidal ideation in young adults', 'Taper if discontinuing']
  },
  {
    id: 'proto-back-pain-acute',
    name: 'Acute Low Back Pain',
    diagnosis: 'Acute Low Back Pain',
    description: 'Conservative management of acute mechanical low back pain',
    evidenceLevel: 'A',
    source: 'ACP Clinical Guidelines 2017',
    recommendedLabs: [],
    recommendedImaging: [],
    recommendedMedications: ['naproxen', 'cyclobenzaprine'],
    recommendedReferrals: ['PT'],
    followUpSchedule: [
      { type: 'phone', description: 'Symptom check', timeframe: '1 week', timeframeDays: 7 },
      { type: 'appointment', description: 'Follow-up if not improving', timeframe: '4 weeks', timeframeDays: 28 }
    ],
    contraindications: ['Red flag symptoms', 'Neurological deficits'],
    warnings: ['Imaging not routinely recommended', 'Watch for red flags: saddle anesthesia, bladder dysfunction']
  }
];

// =============================================================================
// Return Precautions Database
// =============================================================================

const STANDARD_RETURN_PRECAUTIONS: Record<string, ReturnPrecaution[]> = {
  'headache': [
    { id: 'rp-1', condition: 'Sudden severe headache ("worst of life")', urgency: 'emergent', instruction: 'Call 911 or go to ER immediately' },
    { id: 'rp-2', condition: 'Fever with stiff neck', urgency: 'emergent', instruction: 'Go to ER immediately - possible meningitis' },
    { id: 'rp-3', condition: 'Confusion, weakness, or vision changes', urgency: 'emergent', instruction: 'Call 911 immediately' },
    { id: 'rp-4', condition: 'Headache not improving after 48 hours', urgency: 'soon', instruction: 'Call our office for earlier appointment' }
  ],
  'chest-pain': [
    { id: 'rp-5', condition: 'Chest pain at rest or with minimal exertion', urgency: 'emergent', instruction: 'Call 911 immediately' },
    { id: 'rp-6', condition: 'Shortness of breath, sweating, or nausea with chest pain', urgency: 'emergent', instruction: 'Call 911 immediately' },
    { id: 'rp-7', condition: 'Pain radiating to arm, jaw, or back', urgency: 'emergent', instruction: 'Call 911 immediately' }
  ],
  'abdominal-pain': [
    { id: 'rp-8', condition: 'Severe or worsening abdominal pain', urgency: 'emergent', instruction: 'Go to ER immediately' },
    { id: 'rp-9', condition: 'Fever over 101°F with abdominal pain', urgency: 'urgent', instruction: 'Go to urgent care or ER within hours' },
    { id: 'rp-10', condition: 'Blood in stool or vomit', urgency: 'urgent', instruction: 'Go to ER today' }
  ],
  'back-pain': [
    { id: 'rp-11', condition: 'Loss of bladder or bowel control', urgency: 'emergent', instruction: 'Call 911 immediately - possible cauda equina' },
    { id: 'rp-12', condition: 'Numbness in groin or inner thighs', urgency: 'emergent', instruction: 'Go to ER immediately' },
    { id: 'rp-13', condition: 'Progressive leg weakness', urgency: 'urgent', instruction: 'Go to ER today' }
  ],
  'mental-health': [
    { id: 'rp-14', condition: 'Thoughts of self-harm or suicide', urgency: 'emergent', instruction: 'Call 988 Suicide Hotline or go to ER immediately' },
    { id: 'rp-15', condition: 'Worsening depression or anxiety', urgency: 'urgent', instruction: 'Call our office for urgent appointment' },
    { id: 'rp-16', condition: 'Medication side effects', urgency: 'soon', instruction: 'Call our office' }
  ]
};

// =============================================================================
// Store Implementation
// =============================================================================

const API_BASE = '/api';

export const useTreatmentPlanStore = create<TreatmentPlanState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        currentPlan: null,
        patientContext: null,
        suggestedProtocols: [],
        selectedProtocol: null,
        loadingProtocols: false,
        pendingLabOrders: [],
        pendingImagingOrders: [],
        pendingPrescriptions: [],
        pendingReferrals: [],
        loading: false,
        saving: false,
        error: null,
        validationErrors: [],
        savedPlans: [],

        // Initialize new plan
        initializePlan: (patientId: string, encounterId: string, context: PatientContext) => {
          const newPlan: TreatmentPlan = {
            id: `plan-${Date.now()}`,
            patientId,
            encounterId,
            providerId: '', // Set from session
            diagnoses: [],
            chiefComplaint: context.chiefComplaint,
            clinicalSummary: '',
            labOrders: [],
            imagingOrders: [],
            prescriptions: [],
            referrals: [],
            followUpSchedule: [],
            patientEducation: [],
            returnPrecautions: [],
            additionalInstructions: '',
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Auto-add return precautions based on chief complaint
          const precautions = getReturnPrecautionsForComplaint(context.chiefComplaint);

          set(state => {
            state.currentPlan = newPlan;
            state.patientContext = context;
            state.currentPlan!.returnPrecautions = precautions;
            state.pendingLabOrders = [];
            state.pendingImagingOrders = [];
            state.pendingPrescriptions = [];
            state.pendingReferrals = [];
            state.validationErrors = [];
          });
        },

        // Load existing plan
        loadPlan: async (planId: string) => {
          set(state => { state.loading = true; state.error = null; });
          try {
            const response = await fetch(`${API_BASE}/treatment-plans/${planId}`);
            if (!response.ok) throw new Error('Failed to load treatment plan');
            const plan = await response.json();
            set(state => {
              state.currentPlan = plan;
              state.loading = false;
            });
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Failed to load plan';
              state.loading = false;
            });
          }
        },

        // Save plan
        savePlan: async () => {
          const { currentPlan } = get();
          if (!currentPlan) throw new Error('No plan to save');

          set(state => { state.saving = true; state.error = null; });
          
          try {
            const isNew = currentPlan.id.startsWith('plan-');
            const response = await fetch(`${API_BASE}/treatment-plans${isNew ? '' : `/${currentPlan.id}`}`, {
              method: isNew ? 'POST' : 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...currentPlan,
                updatedAt: new Date()
              })
            });

            if (!response.ok) throw new Error('Failed to save treatment plan');
            const saved = await response.json();
            
            set(state => {
              state.currentPlan = saved;
              state.saving = false;
              const existingIdx = state.savedPlans.findIndex(p => p.id === saved.id);
              if (existingIdx >= 0) {
                state.savedPlans[existingIdx] = saved;
              } else {
                state.savedPlans.push(saved);
              }
            });

            return saved.id;
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Failed to save';
              state.saving = false;
            });
            throw error;
          }
        },

        // Submit plan for execution
        submitPlan: async () => {
          const errors = get().validatePlan();
          if (errors.length > 0) {
            set(state => { state.validationErrors = errors; });
            throw new Error('Plan validation failed');
          }

          set(state => {
            if (state.currentPlan) {
              state.currentPlan.status = 'PENDING_REVIEW';
            }
          });

          await get().savePlan();
        },

        // Clear plan
        clearPlan: () => set(state => {
          state.currentPlan = null;
          state.patientContext = null;
          state.suggestedProtocols = [];
          state.selectedProtocol = null;
          state.pendingLabOrders = [];
          state.pendingImagingOrders = [];
          state.pendingPrescriptions = [];
          state.pendingReferrals = [];
          state.error = null;
          state.validationErrors = [];
        }),

        // Diagnosis management
        addDiagnosis: (diagnosis: Diagnosis) => set(state => {
          if (state.currentPlan) {
            // Check for duplicates
            if (!state.currentPlan.diagnoses.some(d => d.code === diagnosis.code)) {
              state.currentPlan.diagnoses.push(diagnosis);
              state.currentPlan.updatedAt = new Date();
            }
          }
        }),

        updateDiagnosis: (code: string, updates: Partial<Diagnosis>) => set(state => {
          if (state.currentPlan) {
            const idx = state.currentPlan.diagnoses.findIndex(d => d.code === code);
            if (idx !== -1) {
              state.currentPlan.diagnoses[idx] = { ...state.currentPlan.diagnoses[idx], ...updates };
              state.currentPlan.updatedAt = new Date();
            }
          }
        }),

        removeDiagnosis: (code: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.diagnoses = state.currentPlan.diagnoses.filter(d => d.code !== code);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        setClinicalSummary: (summary: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.clinicalSummary = summary;
            state.currentPlan.updatedAt = new Date();
          }
        }),

        // Protocol management
        loadProtocols: async (diagnoses: Diagnosis[]) => {
          set(state => { state.loadingProtocols = true; });
          
          try {
            // In production, call BioMistral API
            // For now, match from local protocols
            const matchedProtocols = TREATMENT_PROTOCOLS.filter(proto => 
              diagnoses.some(d => 
                d.description.toLowerCase().includes(proto.diagnosis.toLowerCase()) ||
                proto.diagnosis.toLowerCase().includes(d.description.toLowerCase())
              )
            );

            set(state => {
              state.suggestedProtocols = matchedProtocols;
              state.loadingProtocols = false;
            });
          } catch (error) {
            set(state => {
              state.loadingProtocols = false;
            });
          }
        },

        applyProtocol: (protocol: TreatmentProtocol) => set(state => {
          state.selectedProtocol = protocol;
          if (state.currentPlan) {
            state.currentPlan.protocolApplied = protocol;
            
            // Add follow-ups from protocol
            protocol.followUpSchedule.forEach((fu, idx) => {
              const followUp: FollowUp = {
                id: `fu-${Date.now()}-${idx}`,
                type: fu.type || 'appointment',
                description: fu.description || '',
                timeframe: fu.timeframe || '',
                timeframeDays: fu.timeframeDays || 0,
                scheduled: false
              };
              state.currentPlan!.followUpSchedule.push(followUp);
            });

            // Add warnings as return precautions
            protocol.warnings.forEach((warning, idx) => {
              state.currentPlan!.returnPrecautions.push({
                id: `rp-proto-${Date.now()}-${idx}`,
                condition: warning,
                urgency: 'soon',
                instruction: 'Contact our office'
              });
            });

            state.currentPlan.updatedAt = new Date();
          }
        }),

        // Order management
        addLabOrder: (order: OrderSummary) => set(state => {
          if (!state.pendingLabOrders.some(o => o.id === order.id)) {
            state.pendingLabOrders.push(order);
          }
          if (state.currentPlan && !state.currentPlan.labOrders.some(o => o.id === order.id)) {
            state.currentPlan.labOrders.push(order);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        addImagingOrder: (order: OrderSummary) => set(state => {
          if (!state.pendingImagingOrders.some(o => o.id === order.id)) {
            state.pendingImagingOrders.push(order);
          }
          if (state.currentPlan && !state.currentPlan.imagingOrders.some(o => o.id === order.id)) {
            state.currentPlan.imagingOrders.push(order);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        addPrescription: (order: OrderSummary) => set(state => {
          if (!state.pendingPrescriptions.some(o => o.id === order.id)) {
            state.pendingPrescriptions.push(order);
          }
          if (state.currentPlan && !state.currentPlan.prescriptions.some(o => o.id === order.id)) {
            state.currentPlan.prescriptions.push(order);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        addReferral: (order: OrderSummary) => set(state => {
          if (!state.pendingReferrals.some(o => o.id === order.id)) {
            state.pendingReferrals.push(order);
          }
          if (state.currentPlan && !state.currentPlan.referrals.some(o => o.id === order.id)) {
            state.currentPlan.referrals.push(order);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        removeOrder: (type: OrderSummary['type'], orderId: string) => set(state => {
          const removeFromArray = (arr: OrderSummary[]) => arr.filter(o => o.id !== orderId);
          
          switch (type) {
            case 'lab':
              state.pendingLabOrders = removeFromArray(state.pendingLabOrders);
              if (state.currentPlan) state.currentPlan.labOrders = removeFromArray(state.currentPlan.labOrders);
              break;
            case 'imaging':
              state.pendingImagingOrders = removeFromArray(state.pendingImagingOrders);
              if (state.currentPlan) state.currentPlan.imagingOrders = removeFromArray(state.currentPlan.imagingOrders);
              break;
            case 'medication':
              state.pendingPrescriptions = removeFromArray(state.pendingPrescriptions);
              if (state.currentPlan) state.currentPlan.prescriptions = removeFromArray(state.currentPlan.prescriptions);
              break;
            case 'referral':
              state.pendingReferrals = removeFromArray(state.pendingReferrals);
              if (state.currentPlan) state.currentPlan.referrals = removeFromArray(state.currentPlan.referrals);
              break;
          }
          if (state.currentPlan) state.currentPlan.updatedAt = new Date();
        }),

        // Follow-up & Education
        addFollowUp: (followUp: FollowUp) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.followUpSchedule.push(followUp);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        updateFollowUp: (id: string, updates: Partial<FollowUp>) => set(state => {
          if (state.currentPlan) {
            const idx = state.currentPlan.followUpSchedule.findIndex(f => f.id === id);
            if (idx !== -1) {
              state.currentPlan.followUpSchedule[idx] = { ...state.currentPlan.followUpSchedule[idx], ...updates };
              state.currentPlan.updatedAt = new Date();
            }
          }
        }),

        removeFollowUp: (id: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.followUpSchedule = state.currentPlan.followUpSchedule.filter(f => f.id !== id);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        addEducation: (material: EducationMaterial) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.patientEducation.push(material);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        removeEducation: (id: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.patientEducation = state.currentPlan.patientEducation.filter(e => e.id !== id);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        addReturnPrecaution: (precaution: ReturnPrecaution) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.returnPrecautions.push(precaution);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        removeReturnPrecaution: (id: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.returnPrecautions = state.currentPlan.returnPrecautions.filter(r => r.id !== id);
            state.currentPlan.updatedAt = new Date();
          }
        }),

        setAdditionalInstructions: (instructions: string) => set(state => {
          if (state.currentPlan) {
            state.currentPlan.additionalInstructions = instructions;
            state.currentPlan.updatedAt = new Date();
          }
        }),

        // Computed helpers
        getTotalOrderCount: () => {
          const plan = get().currentPlan;
          if (!plan) return 0;
          return plan.labOrders.length + plan.imagingOrders.length + 
                 plan.prescriptions.length + plan.referrals.length;
        },

        getStatOrderCount: () => {
          const plan = get().currentPlan;
          if (!plan) return 0;
          const allOrders = [...plan.labOrders, ...plan.imagingOrders, ...plan.prescriptions, ...plan.referrals];
          return allOrders.filter(o => o.priority === 'STAT').length;
        },

        hasRedFlagDiagnosis: () => {
          const plan = get().currentPlan;
          if (!plan) return false;
          return plan.diagnoses.some(d => d.type === 'rule-out' || 
            d.description.toLowerCase().includes('red flag') ||
            d.description.toLowerCase().includes('secondary'));
        },

        validatePlan: () => {
          const { currentPlan, patientContext } = get();
          const errors: string[] = [];

          if (!currentPlan) {
            errors.push('No treatment plan initialized');
            return errors;
          }

          if (currentPlan.diagnoses.length === 0) {
            errors.push('At least one diagnosis is required');
          }

          if (!currentPlan.clinicalSummary || currentPlan.clinicalSummary.length < 20) {
            errors.push('Clinical summary is required (minimum 20 characters)');
          }

          if (currentPlan.followUpSchedule.length === 0) {
            errors.push('At least one follow-up plan is required');
          }

          if (currentPlan.returnPrecautions.length === 0) {
            errors.push('Return precautions are required');
          }

          // Check for required orders based on diagnoses
          const hasRuleOut = currentPlan.diagnoses.some(d => d.type === 'rule-out');
          if (hasRuleOut && currentPlan.labOrders.length === 0 && currentPlan.imagingOrders.length === 0) {
            errors.push('Rule-out diagnoses typically require diagnostic testing');
          }

          return errors;
        },

        getOrdersByPriority: () => {
          const plan = get().currentPlan;
          if (!plan) return { stat: [], urgent: [], routine: [] };

          const allOrders = [...plan.labOrders, ...plan.imagingOrders, ...plan.prescriptions, ...plan.referrals];
          
          return {
            stat: allOrders.filter(o => o.priority === 'STAT'),
            urgent: allOrders.filter(o => o.priority === 'URGENT'),
            routine: allOrders.filter(o => o.priority === 'ROUTINE')
          };
        },

        getCostEstimate: () => {
          // In production, this would sum actual costs from child stores
          const plan = get().currentPlan;
          if (!plan) return { labs: 0, imaging: 0, medications: 0, total: 0 };

          // Placeholder estimates
          const labs = plan.labOrders.length * 25;
          const imaging = plan.imagingOrders.length * 350;
          const medications = plan.prescriptions.length * 45;

          return {
            labs,
            imaging,
            medications,
            total: labs + imaging + medications
          };
        }
      })),
      {
        name: 'treatment-plan-store',
        partialize: (state) => ({
          savedPlans: state.savedPlans.slice(-10) // Keep last 10 plans
        })
      }
    ),
    { name: 'treatment-plan-store' }
  )
);

// =============================================================================
// Helper Functions
// =============================================================================

function getReturnPrecautionsForComplaint(complaint: string): ReturnPrecaution[] {
  const lowerComplaint = complaint.toLowerCase();
  
  if (lowerComplaint.includes('headache') || lowerComplaint.includes('migraine')) {
    return STANDARD_RETURN_PRECAUTIONS['headache'] || [];
  }
  if (lowerComplaint.includes('chest') || lowerComplaint.includes('cardiac')) {
    return STANDARD_RETURN_PRECAUTIONS['chest-pain'] || [];
  }
  if (lowerComplaint.includes('abdominal') || lowerComplaint.includes('stomach')) {
    return STANDARD_RETURN_PRECAUTIONS['abdominal-pain'] || [];
  }
  if (lowerComplaint.includes('back')) {
    return STANDARD_RETURN_PRECAUTIONS['back-pain'] || [];
  }
  if (lowerComplaint.includes('depression') || lowerComplaint.includes('anxiety') || lowerComplaint.includes('mood')) {
    return STANDARD_RETURN_PRECAUTIONS['mental-health'] || [];
  }
  
  // Default precautions
  return [
    { id: 'rp-default-1', condition: 'Symptoms significantly worsening', urgency: 'urgent', instruction: 'Return to clinic or go to urgent care' },
    { id: 'rp-default-2', condition: 'New symptoms developing', urgency: 'soon', instruction: 'Call our office' },
    { id: 'rp-default-3', condition: 'No improvement after 1 week', urgency: 'soon', instruction: 'Schedule follow-up appointment' }
  ];
}

export default useTreatmentPlanStore;
