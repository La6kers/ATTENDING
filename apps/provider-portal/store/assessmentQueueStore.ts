// Assessment Queue Store - Manages COMPASS assessments for provider review
// This store handles the flow of patient assessments from COMPASS to provider review
// Updated to use @attending/shared types for consistency across portals

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  PatientAssessment, 
  ClinicalSummary, 
  UrgencyLevel, 
  Diagnosis,
  HistoryOfPresentIllness,
} from '@attending/shared';

// Re-export PatientAssessment for components that import from this file
export type { PatientAssessment };

// Filters for assessment queue
export interface AssessmentFilters {
  status: string | 'all';
  urgency: UrgencyLevel | 'all';
  timeRange: 'today' | 'week' | 'month' | 'all';
  searchQuery: string;
}

interface AssessmentQueueStore {
  assessments: PatientAssessment[];
  selectedAssessment: PatientAssessment | null;
  filters: AssessmentFilters;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAssessments: () => Promise<void>;
  addAssessment: (assessment: PatientAssessment) => void;
  selectAssessment: (id: string | null) => void;
  setFilters: (filters: Partial<AssessmentFilters>) => void;
  updateAssessmentStatus: (id: string, status: PatientAssessment['status']) => void;
  addProviderNotes: (id: string, notes: string) => void;
  confirmDiagnosis: (id: string, diagnosis: Diagnosis) => void;
  addIcdCode: (id: string, code: string) => void;
  setTreatmentPlan: (id: string, plan: string) => void;
  completeReview: (id: string, data: Partial<PatientAssessment>) => void;
  
  // Computed
  getFilteredAssessments: () => PatientAssessment[];
  getUrgentCount: () => number;
  getPendingCount: () => number;
  getAssessmentById: (id: string) => PatientAssessment | undefined;
}

// Mock data generator for development
const generateMockAssessments = (): PatientAssessment[] => [
  {
    id: 'assess-001',
    patientId: 'pat-001',
    patientName: 'Sarah Johnson',
    patientAge: 45,
    patientGender: 'Female',
    chiefComplaint: 'Persistent headache with visual disturbances for 3 days',
    urgencyLevel: 'moderate',
    redFlags: ['Visual changes', 'Sudden onset', 'Worst headache of life'],
    riskFactors: ['Hypertension', 'Family history of stroke', 'Oral contraceptive use'],
    differentialDiagnosis: [
      { 
        name: 'Migraine with aura', 
        probability: 0.55, 
        supportingEvidence: ['Visual disturbances', 'Throbbing quality', 'Photophobia'] 
      },
      { 
        name: 'Tension-type headache', 
        probability: 0.25, 
        supportingEvidence: ['Stress', 'Bilateral location', 'Work from home strain'] 
      },
      { 
        name: 'Hypertensive urgency', 
        probability: 0.15, 
        supportingEvidence: ['HTN history', 'Sudden onset', 'Visual symptoms'] 
      },
      { 
        name: 'Intracranial mass', 
        probability: 0.05, 
        supportingEvidence: ['New onset', 'Progressive symptoms'] 
      },
    ],
    hpiData: {
      onset: '3 days ago',
      location: 'Bilateral frontal and temporal',
      duration: 'Constant with fluctuating intensity',
      character: 'Throbbing, pulsating',
      severity: 7,
      aggravatingFactors: ['Bright lights', 'Screen time', 'Physical activity'],
      relievingFactors: ['Dark room', 'Ibuprofen (partial relief)'],
      associatedSymptoms: ['Nausea', 'Light sensitivity', 'Seeing spots'],
    },
    medicalHistory: {
      conditions: ['Hypertension', 'Anxiety'],
      medications: ['Lisinopril 10mg daily', 'Oral contraceptive'],
      allergies: ['Sulfa drugs'],
      surgeries: ['Appendectomy 2015'],
    },
    status: 'pending',
    submittedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'assess-002',
    patientId: 'pat-002',
    patientName: 'Michael Chen',
    patientAge: 62,
    patientGender: 'Male',
    chiefComplaint: 'Chest tightness and pressure with exertion, started 2 days ago',
    urgencyLevel: 'high',
    redFlags: ['Chest pain', 'Exertional symptoms', 'Multiple CAD risk factors', 'Radiation to left arm'],
    riskFactors: ['Type 2 Diabetes', 'Current smoker (30 pack-years)', 'Age > 55', 'Male', 'Hyperlipidemia', 'Sedentary lifestyle'],
    differentialDiagnosis: [
      { 
        name: 'Unstable angina', 
        probability: 0.40, 
        supportingEvidence: ['New onset exertional symptoms', 'Multiple risk factors', 'Pressure-like quality'] 
      },
      { 
        name: 'Stable angina pectoris', 
        probability: 0.30, 
        supportingEvidence: ['Exertional trigger', 'Relieved by rest', 'Predictable pattern'] 
      },
      { 
        name: 'NSTEMI', 
        probability: 0.20, 
        supportingEvidence: ['Risk factors', 'Arm radiation', 'Duration > 20 min episodes'] 
      },
      { 
        name: 'GERD/Esophageal spasm', 
        probability: 0.10, 
        supportingEvidence: ['Pressure description', 'No diaphoresis'] 
      },
    ],
    hpiData: {
      onset: '2 days ago',
      location: 'Substernal, radiates to left arm',
      duration: 'Episodes lasting 10-20 minutes',
      character: 'Pressure, tightness, squeezing',
      severity: 6,
      aggravatingFactors: ['Walking upstairs', 'Carrying groceries', 'Cold weather'],
      relievingFactors: ['Rest (5-10 min)', 'Sitting down'],
      associatedSymptoms: ['Mild shortness of breath', 'Occasional left arm tingling'],
    },
    medicalHistory: {
      conditions: ['Type 2 Diabetes', 'Hyperlipidemia', 'Hypertension'],
      medications: ['Metformin 1000mg BID', 'Atorvastatin 40mg daily', 'Lisinopril 20mg daily', 'Aspirin 81mg daily'],
      allergies: ['None known'],
      surgeries: ['Hernia repair 2010'],
    },
    status: 'urgent',
    submittedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'assess-003',
    patientId: 'pat-003',
    patientName: 'Emily Rodriguez',
    patientAge: 28,
    patientGender: 'Female',
    chiefComplaint: 'Recurring abdominal pain and bloating after meals for 6 weeks',
    urgencyLevel: 'standard',
    redFlags: [],
    riskFactors: ['Anxiety disorder', 'Recent antibiotic use'],
    differentialDiagnosis: [
      { 
        name: 'Irritable bowel syndrome', 
        probability: 0.50, 
        supportingEvidence: ['Bloating', 'Stress correlation', 'Alternating bowel habits', 'No alarm symptoms'] 
      },
      { 
        name: 'Lactose intolerance', 
        probability: 0.25, 
        supportingEvidence: ['Post-meal symptoms', 'Dairy correlation noted'] 
      },
      { 
        name: 'Celiac disease', 
        probability: 0.15, 
        supportingEvidence: ['Chronic symptoms', 'Bloating', 'Family history autoimmune'] 
      },
      { 
        name: 'SIBO', 
        probability: 0.10, 
        supportingEvidence: ['Recent antibiotics', 'Bloating'] 
      },
    ],
    hpiData: {
      onset: '6 weeks ago',
      location: 'Diffuse abdominal, worse in lower quadrants',
      duration: 'Intermittent, usually 1-3 hours post-meal',
      character: 'Crampy, bloating sensation',
      severity: 4,
      aggravatingFactors: ['Dairy products', 'Stress', 'Large meals', 'Wheat/bread'],
      relievingFactors: ['Bowel movement', 'Peppermint tea', 'Smaller meals'],
      associatedSymptoms: ['Bloating', 'Alternating constipation/diarrhea', 'Flatulence'],
    },
    medicalHistory: {
      conditions: ['Generalized anxiety disorder'],
      medications: ['Sertraline 50mg daily', 'Occasional ibuprofen'],
      allergies: ['Penicillin - rash'],
      surgeries: ['None'],
    },
    status: 'pending',
    submittedAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
  {
    id: 'assess-004',
    patientId: 'pat-004',
    patientName: 'Robert Williams',
    patientAge: 55,
    patientGender: 'Male',
    chiefComplaint: 'Progressive shortness of breath and ankle swelling for 2 weeks',
    urgencyLevel: 'moderate',
    redFlags: ['Dyspnea on exertion', 'Peripheral edema', 'Orthopnea'],
    riskFactors: ['Hypertension (poorly controlled)', 'Obesity', 'Prior MI (2019)', 'Type 2 Diabetes'],
    differentialDiagnosis: [
      { 
        name: 'Heart failure exacerbation', 
        probability: 0.60, 
        supportingEvidence: ['Prior MI', 'Bilateral edema', 'Orthopnea', 'Progressive dyspnea'] 
      },
      { 
        name: 'Acute kidney injury', 
        probability: 0.20, 
        supportingEvidence: ['Edema', 'Diabetes', 'Possible medication effect'] 
      },
      { 
        name: 'Pulmonary embolism', 
        probability: 0.15, 
        supportingEvidence: ['Dyspnea', 'Leg swelling (asymmetric?)'] 
      },
      { 
        name: 'COPD exacerbation', 
        probability: 0.05, 
        supportingEvidence: ['Dyspnea', 'Former smoker'] 
      },
    ],
    hpiData: {
      onset: '2 weeks ago, gradually worsening',
      location: 'Bilateral lower extremities, chest',
      duration: 'Constant edema, dyspnea with minimal exertion',
      character: 'Pitting edema, air hunger',
      severity: 6,
      aggravatingFactors: ['Walking', 'Lying flat', 'Salty foods'],
      relievingFactors: ['Sitting upright', 'Using 3 pillows at night'],
      associatedSymptoms: ['Weight gain (8 lbs in 2 weeks)', 'Orthopnea', 'PND', 'Fatigue'],
    },
    medicalHistory: {
      conditions: ['Hypertension', 'Type 2 Diabetes', 'CAD - prior STEMI 2019', 'HFrEF (EF 35%)'],
      medications: ['Carvedilol 25mg BID', 'Lisinopril 40mg daily', 'Furosemide 40mg daily', 'Metformin 1000mg BID', 'Aspirin 81mg', 'Atorvastatin 80mg'],
      allergies: ['ACE inhibitor cough (switched from enalapril)'],
      surgeries: ['PCI with stent 2019'],
    },
    status: 'pending',
    submittedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'assess-005',
    patientId: 'pat-005',
    patientName: 'Jennifer Martinez',
    patientAge: 34,
    patientGender: 'Female',
    chiefComplaint: 'Sore throat, fever, and fatigue for 4 days',
    urgencyLevel: 'standard',
    redFlags: [],
    riskFactors: ['Healthcare worker', 'Recent sick contacts'],
    differentialDiagnosis: [
      { 
        name: 'Viral pharyngitis', 
        probability: 0.50, 
        supportingEvidence: ['Gradual onset', 'Low-grade fever', 'Cough present', 'Sick contacts'] 
      },
      { 
        name: 'Streptococcal pharyngitis', 
        probability: 0.30, 
        supportingEvidence: ['Sore throat', 'Fever', 'Absence of cough', 'Tender cervical nodes'] 
      },
      { 
        name: 'Infectious mononucleosis', 
        probability: 0.15, 
        supportingEvidence: ['Fatigue', 'Young adult', 'Pharyngitis'] 
      },
      { 
        name: 'COVID-19', 
        probability: 0.05, 
        supportingEvidence: ['Healthcare worker', 'Respiratory symptoms'] 
      },
    ],
    hpiData: {
      onset: '4 days ago',
      location: 'Throat',
      duration: 'Constant',
      character: 'Scratchy, painful swallowing',
      severity: 5,
      aggravatingFactors: ['Swallowing', 'Talking'],
      relievingFactors: ['Warm liquids', 'Throat lozenges', 'Ibuprofen'],
      associatedSymptoms: ['Fever (max 101.5°F)', 'Fatigue', 'Mild headache', 'Tender neck lymph nodes'],
    },
    medicalHistory: {
      conditions: ['Seasonal allergies'],
      medications: ['Cetirizine 10mg PRN'],
      allergies: ['None known'],
      surgeries: ['None'],
    },
    status: 'completed',
    submittedAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    reviewedAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    providerNotes: 'Rapid strep negative. Likely viral pharyngitis. Supportive care recommended. Return if symptoms worsen or persist > 7 days.',
    confirmedDiagnoses: [{ name: 'Acute viral pharyngitis', probability: 1, supportingEvidence: ['Negative rapid strep', 'Viral prodrome'] }],
    icdCodes: ['J02.9'],
    treatmentPlan: 'Supportive care: rest, fluids, OTC analgesics. Return precautions given.',
  },
];

export const useAssessmentQueueStore = create<AssessmentQueueStore>()(
  devtools(
    immer((set, get) => ({
      assessments: [],
      selectedAssessment: null,
      filters: {
        status: 'all',
        urgency: 'all',
        timeRange: 'today',
        searchQuery: '',
      },
      loading: false,
      error: null,

      fetchAssessments: async () => {
        set(state => { state.loading = true; state.error = null; });
        
        try {
          // In production, this would call the API:
          // const response = await fetch('/api/assessments');
          // const data = await response.json();
          
          // For now, use mock data with simulated delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const mockData = generateMockAssessments();
          
          set(state => {
            state.assessments = mockData;
            state.loading = false;
          });
        } catch (error) {
          console.error('Failed to fetch assessments:', error);
          set(state => {
            state.error = 'Failed to fetch assessments. Please try again.';
            state.loading = false;
          });
        }
      },

      addAssessment: (assessment) => {
        set(state => {
          const existingIndex = state.assessments.findIndex(a => a.id === assessment.id);
          if (existingIndex >= 0) {
            state.assessments[existingIndex] = assessment;
          } else {
            state.assessments.unshift(assessment);
          }
        });
      },

      selectAssessment: (id) => {
        set(state => {
          state.selectedAssessment = id 
            ? state.assessments.find(a => a.id === id) || null 
            : null;
        });
      },

      setFilters: (filters) => {
        set(state => {
          state.filters = { ...state.filters, ...filters };
        });
      },

      updateAssessmentStatus: (id, status) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            assessment.status = status;
            if (status === 'in_review') {
              assessment.reviewedAt = new Date().toISOString();
            } else if (status === 'completed') {
              assessment.completedAt = new Date().toISOString();
            }
            if (state.selectedAssessment?.id === id) {
              state.selectedAssessment = { ...assessment };
            }
          }
        });
      },

      addProviderNotes: (id, notes) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            assessment.providerNotes = notes;
            if (state.selectedAssessment?.id === id) {
              state.selectedAssessment.providerNotes = notes;
            }
          }
        });
      },

      confirmDiagnosis: (id, diagnosis) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            if (!assessment.confirmedDiagnoses) {
              assessment.confirmedDiagnoses = [];
            }
            if (!assessment.confirmedDiagnoses.find(d => d.name === diagnosis.name)) {
              assessment.confirmedDiagnoses.push(diagnosis);
            }
          }
        });
      },

      addIcdCode: (id, code) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            if (!assessment.icdCodes) {
              assessment.icdCodes = [];
            }
            if (!assessment.icdCodes.includes(code)) {
              assessment.icdCodes.push(code);
            }
          }
        });
      },

      setTreatmentPlan: (id, plan) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            assessment.treatmentPlan = plan;
          }
        });
      },

      completeReview: (id, data) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            Object.assign(assessment, data);
            assessment.status = 'completed';
            assessment.completedAt = new Date().toISOString();
            if (state.selectedAssessment?.id === id) {
              Object.assign(state.selectedAssessment, assessment);
            }
          }
        });
      },

      getFilteredAssessments: () => {
        const { assessments, filters } = get();
        
        return assessments
          .filter(a => {
            if (filters.status !== 'all' && a.status !== filters.status) return false;
            if (filters.urgency !== 'all' && a.urgencyLevel !== filters.urgency) return false;
            
            if (filters.timeRange !== 'all') {
              const submittedDate = new Date(a.submittedAt);
              const now = new Date();
              const diffMs = now.getTime() - submittedDate.getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              
              if (filters.timeRange === 'today' && diffDays > 1) return false;
              if (filters.timeRange === 'week' && diffDays > 7) return false;
              if (filters.timeRange === 'month' && diffDays > 30) return false;
            }
            
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const searchableText = [
                a.patientName,
                a.chiefComplaint,
                ...(a.differentialDiagnosis?.map(d => d.name) || []),
                ...(a.redFlags || []),
              ].join(' ').toLowerCase();
              
              if (!searchableText.includes(query)) return false;
            }
            
            return true;
          })
          .sort((a, b) => {
            if (a.status === 'urgent' && b.status !== 'urgent') return -1;
            if (b.status === 'urgent' && a.status !== 'urgent') return 1;
            
            const urgencyOrder: Record<UrgencyLevel, number> = { high: 0, moderate: 1, standard: 2 };
            const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
            if (urgencyDiff !== 0) return urgencyDiff;
            
            return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
          });
      },

      getUrgentCount: () => get().assessments.filter(
        a => a.urgencyLevel === 'high' || a.status === 'urgent'
      ).length,
      
      getPendingCount: () => get().assessments.filter(
        a => a.status === 'pending' || a.status === 'urgent'
      ).length,

      getAssessmentById: (id) => get().assessments.find(a => a.id === id),
    })),
    { name: 'assessment-queue-store' }
  )
);
