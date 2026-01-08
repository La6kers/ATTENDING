// ============================================================
// Referral Ordering Store - Zustand with BioMistral AI Integration
// apps/provider-portal/store/referralOrderingStore.ts
//
// Manages specialty referral workflow with AI-powered recommendations
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export type ReferralUrgency = 'STAT' | 'URGENT' | 'ROUTINE' | 'ELECTIVE';
export type ReferralStatus = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Specialty {
  code: string;
  name: string;
  category: 'medical' | 'surgical' | 'diagnostic' | 'therapeutic' | 'behavioral';
  subspecialties: string[];
  averageWaitDays: { routine: number; urgent: number };
  requiresAuth: boolean;
  commonIndications: string[];
  redFlagIndications: string[];
}

export interface Provider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  subspecialty?: string;
  organization: string;
  address: string;
  phone: string;
  fax: string;
  acceptingNew: boolean;
  insurancesAccepted: string[];
  nextAvailable: { routine: string; urgent: string };
  rating?: number;
  preferred?: boolean;
}

export interface AIReferralRecommendation {
  id: string;
  specialty: string;
  subspecialty?: string;
  urgency: ReferralUrgency;
  rationale: string;
  clinicalQuestion: string;
  suggestedTests: string[];
  confidence: number;
  category: 'critical' | 'recommended' | 'consider';
  redFlagRelated?: boolean;
}

export interface SelectedReferral {
  specialty: Specialty;
  urgency: ReferralUrgency;
  preferredProvider?: Provider;
  clinicalQuestion: string;
  relevantHistory: string;
  attachedDocuments: string[];
  priorAuthRequired: boolean;
  priorAuthStatus?: 'pending' | 'approved' | 'denied';
  aiRecommended?: boolean;
}

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  primaryDiagnosis?: string;
  allergies: string[];
  insurancePlan: string;
  pcp: string;
  redFlags: string[];
}

interface ReferralOrderingState {
  // Catalog State
  specialtyCatalog: Specialty[];
  providerDirectory: Provider[];
  searchQuery: string;
  categoryFilter: 'all' | Specialty['category'];
  
  // Selection State
  selectedReferrals: Map<string, SelectedReferral>;
  defaultUrgency: ReferralUrgency;
  
  // AI Integration
  aiRecommendations: AIReferralRecommendation[];
  loadingRecommendations: boolean;
  patientContext: PatientContext | null;
  
  // Provider Search
  selectedSpecialtyForProviders: string | null;
  filteredProviders: Provider[];
  
  // Workflow State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedReferralIds: string[];
  
  // Actions
  loadCatalogs: () => Promise<void>;
  loadAIRecommendations: (patientId: string, context: PatientContext) => Promise<void>;
  searchProviders: (specialty: string, insurance?: string) => void;
  
  addReferral: (specialty: Specialty, urgency?: ReferralUrgency) => void;
  updateReferral: (code: string, updates: Partial<SelectedReferral>) => void;
  removeReferral: (code: string) => void;
  setPreferredProvider: (specialtyCode: string, provider: Provider) => void;
  
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: ReferralOrderingState['categoryFilter']) => void;
  setDefaultUrgency: (urgency: ReferralUrgency) => void;
  
  submitReferrals: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed Helpers
  getSelectedReferralsArray: () => SelectedReferral[];
  getFilteredCatalog: () => Specialty[];
  getStatCount: () => number;
  getAuthRequiredCount: () => number;
  hasRedFlagReferrals: () => boolean;
}

// =============================================================================
// Specialty Catalog
// =============================================================================

const SPECIALTY_CATALOG: Record<string, Specialty> = {
  'NEURO': {
    code: 'NEURO',
    name: 'Neurology',
    category: 'medical',
    subspecialties: ['Headache Medicine', 'Epilepsy', 'Movement Disorders', 'Stroke', 'Neuromuscular'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    commonIndications: ['Headache evaluation', 'Seizure workup', 'Neuropathy', 'Tremor', 'Memory concerns'],
    redFlagIndications: ['Thunderclap headache', 'New onset seizure', 'Acute weakness', 'Sudden vision loss']
  },
  'CARDS': {
    code: 'CARDS',
    name: 'Cardiology',
    category: 'medical',
    subspecialties: ['Interventional', 'Electrophysiology', 'Heart Failure', 'Preventive'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: false,
    commonIndications: ['Chest pain evaluation', 'Arrhythmia', 'Heart murmur', 'Hypertension management'],
    redFlagIndications: ['Acute chest pain', 'Syncope', 'New heart failure', 'Unstable angina']
  },
  'GI': {
    code: 'GI',
    name: 'Gastroenterology',
    category: 'medical',
    subspecialties: ['Hepatology', 'IBD', 'Motility', 'Therapeutic Endoscopy'],
    averageWaitDays: { routine: 28, urgent: 5 },
    requiresAuth: true,
    commonIndications: ['GERD refractory to PPI', 'Colonoscopy screening', 'Abnormal LFTs', 'Chronic diarrhea'],
    redFlagIndications: ['GI bleeding', 'Jaundice', 'Acute abdominal pain', 'Weight loss with GI symptoms']
  },
  'PULM': {
    code: 'PULM',
    name: 'Pulmonology',
    category: 'medical',
    subspecialties: ['Sleep Medicine', 'Critical Care', 'Interventional'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    commonIndications: ['Chronic cough', 'Dyspnea evaluation', 'Abnormal chest imaging', 'Asthma management'],
    redFlagIndications: ['Hemoptysis', 'Pulmonary embolism', 'Respiratory failure', 'Lung mass']
  },
  'ENDO': {
    code: 'ENDO',
    name: 'Endocrinology',
    category: 'medical',
    subspecialties: ['Diabetes', 'Thyroid', 'Bone/Metabolic', 'Pituitary'],
    averageWaitDays: { routine: 35, urgent: 7 },
    requiresAuth: false,
    commonIndications: ['Uncontrolled diabetes', 'Thyroid nodule', 'Osteoporosis', 'Adrenal abnormality'],
    redFlagIndications: ['DKA', 'Thyroid storm', 'Adrenal crisis', 'Severe hypoglycemia']
  },
  'RHEUM': {
    code: 'RHEUM',
    name: 'Rheumatology',
    category: 'medical',
    subspecialties: ['Inflammatory Arthritis', 'Connective Tissue', 'Vasculitis'],
    averageWaitDays: { routine: 42, urgent: 7 },
    requiresAuth: false,
    commonIndications: ['Joint pain workup', 'Positive ANA', 'Suspected RA', 'Gout management'],
    redFlagIndications: ['Vasculitis', 'Acute monoarthritis', 'Systemic lupus flare', 'Scleroderma crisis']
  },
  'NEPH': {
    code: 'NEPH',
    name: 'Nephrology',
    category: 'medical',
    subspecialties: ['Dialysis', 'Transplant', 'Hypertension'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    commonIndications: ['CKD Stage 4+', 'Proteinuria', 'Recurrent kidney stones', 'Resistant hypertension'],
    redFlagIndications: ['Acute kidney injury', 'Glomerulonephritis', 'Nephrotic syndrome', 'Electrolyte emergency']
  },
  'HEME-ONC': {
    code: 'HEME-ONC',
    name: 'Hematology/Oncology',
    category: 'medical',
    subspecialties: ['Hematology', 'Medical Oncology', 'Bone Marrow Transplant'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: false,
    commonIndications: ['Anemia workup', 'Abnormal WBC', 'Lymphadenopathy', 'Cancer staging'],
    redFlagIndications: ['Suspected malignancy', 'Pancytopenia', 'Hyperviscosity', 'Tumor lysis']
  },
  'ORTHO': {
    code: 'ORTHO',
    name: 'Orthopedic Surgery',
    category: 'surgical',
    subspecialties: ['Sports Medicine', 'Spine', 'Joint Replacement', 'Hand', 'Trauma'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    commonIndications: ['Joint pain', 'Back pain', 'Fracture follow-up', 'Rotator cuff tear'],
    redFlagIndications: ['Open fracture', 'Compartment syndrome', 'Cauda equina', 'Septic joint']
  },
  'GENSURG': {
    code: 'GENSURG',
    name: 'General Surgery',
    category: 'surgical',
    subspecialties: ['Minimally Invasive', 'Colorectal', 'Breast', 'Trauma'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: true,
    commonIndications: ['Hernia repair', 'Cholecystectomy', 'Breast mass', 'Appendicitis'],
    redFlagIndications: ['Acute abdomen', 'Bowel obstruction', 'Perforated viscus', 'Hemorrhage']
  },
  'PSYCH': {
    code: 'PSYCH',
    name: 'Psychiatry',
    category: 'behavioral',
    subspecialties: ['Adult', 'Child/Adolescent', 'Addiction', 'Geriatric'],
    averageWaitDays: { routine: 42, urgent: 7 },
    requiresAuth: false,
    commonIndications: ['Depression', 'Anxiety', 'Medication management', 'Bipolar disorder'],
    redFlagIndications: ['Suicidal ideation', 'Psychosis', 'Severe agitation', 'Catatonia']
  },
  'DERM': {
    code: 'DERM',
    name: 'Dermatology',
    category: 'medical',
    subspecialties: ['Medical Dermatology', 'Dermatopathology', 'Mohs Surgery'],
    averageWaitDays: { routine: 60, urgent: 14 },
    requiresAuth: false,
    commonIndications: ['Suspicious lesion', 'Chronic rash', 'Acne', 'Psoriasis'],
    redFlagIndications: ['Melanoma concern', 'SJS/TEN', 'Necrotizing fasciitis', 'Severe drug reaction']
  },
  'OPHTH': {
    code: 'OPHTH',
    name: 'Ophthalmology',
    category: 'surgical',
    subspecialties: ['Retina', 'Glaucoma', 'Cornea', 'Oculoplastics'],
    averageWaitDays: { routine: 28, urgent: 1 },
    requiresAuth: false,
    commonIndications: ['Vision changes', 'Diabetic eye exam', 'Glaucoma screening', 'Cataract'],
    redFlagIndications: ['Acute vision loss', 'Eye trauma', 'Retinal detachment', 'Acute glaucoma']
  },
  'ENT': {
    code: 'ENT',
    name: 'Otolaryngology',
    category: 'surgical',
    subspecialties: ['Head & Neck', 'Otology', 'Rhinology', 'Laryngology'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    commonIndications: ['Chronic sinusitis', 'Hearing loss', 'Neck mass', 'Hoarseness'],
    redFlagIndications: ['Airway compromise', 'Deep neck infection', 'Sudden hearing loss', 'Suspected cancer']
  },
  'UROL': {
    code: 'UROL',
    name: 'Urology',
    category: 'surgical',
    subspecialties: ['Oncology', 'Female Pelvic', 'Male Infertility', 'Pediatric'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    commonIndications: ['Elevated PSA', 'Hematuria', 'BPH', 'Kidney stones'],
    redFlagIndications: ['Urinary retention', 'Testicular torsion', 'Fournier gangrene', 'Urosepsis']
  },
  'PT': {
    code: 'PT',
    name: 'Physical Therapy',
    category: 'therapeutic',
    subspecialties: ['Orthopedic', 'Neurologic', 'Vestibular', 'Pelvic Floor'],
    averageWaitDays: { routine: 7, urgent: 2 },
    requiresAuth: true,
    commonIndications: ['Post-surgical rehab', 'Back pain', 'Balance issues', 'Joint replacement'],
    redFlagIndications: []
  },
  'OT': {
    code: 'OT',
    name: 'Occupational Therapy',
    category: 'therapeutic',
    subspecialties: ['Hand Therapy', 'Neurologic', 'Pediatric'],
    averageWaitDays: { routine: 7, urgent: 3 },
    requiresAuth: true,
    commonIndications: ['Hand injury', 'Stroke rehab', 'ADL training', 'Splinting'],
    redFlagIndications: []
  }
};

// =============================================================================
// Sample Provider Directory
// =============================================================================

const PROVIDER_DIRECTORY: Provider[] = [
  {
    id: 'prov-001',
    name: 'Sarah Chen',
    credentials: 'MD, PhD',
    specialty: 'NEURO',
    subspecialty: 'Headache Medicine',
    organization: 'Regional Neurology Associates',
    address: '1234 Medical Center Dr, Suite 400',
    phone: '(555) 234-5678',
    fax: '(555) 234-5679',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '2 weeks', urgent: '2 days' },
    rating: 4.8,
    preferred: true
  },
  {
    id: 'prov-002',
    name: 'Michael Rodriguez',
    credentials: 'MD, FACC',
    specialty: 'CARDS',
    subspecialty: 'Interventional',
    organization: 'Heart & Vascular Institute',
    address: '5678 Cardiac Way, Suite 200',
    phone: '(555) 345-6789',
    fax: '(555) 345-6790',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '1 week', urgent: 'Same day' },
    rating: 4.9,
    preferred: true
  },
  {
    id: 'prov-003',
    name: 'Jennifer Park',
    credentials: 'MD',
    specialty: 'GI',
    subspecialty: 'IBD',
    organization: 'Digestive Health Center',
    address: '9012 GI Lane, Suite 150',
    phone: '(555) 456-7890',
    fax: '(555) 456-7891',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'United', 'Medicare'],
    nextAvailable: { routine: '4 weeks', urgent: '1 week' },
    rating: 4.7
  },
  {
    id: 'prov-004',
    name: 'David Kim',
    credentials: 'MD, FACS',
    specialty: 'ORTHO',
    subspecialty: 'Sports Medicine',
    organization: 'Sports Medicine & Orthopedics',
    address: '3456 Athletic Dr, Suite 300',
    phone: '(555) 567-8901',
    fax: '(555) 567-8902',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '3 weeks', urgent: '3 days' },
    rating: 4.6
  },
  {
    id: 'prov-005',
    name: 'Lisa Thompson',
    credentials: 'MD',
    specialty: 'PSYCH',
    subspecialty: 'Adult',
    organization: 'Behavioral Health Associates',
    address: '7890 Mental Health Way, Suite 100',
    phone: '(555) 678-9012',
    fax: '(555) 678-9013',
    acceptingNew: false,
    insurancesAccepted: ['Blue Cross', 'Aetna'],
    nextAvailable: { routine: '6 weeks', urgent: '1 week' },
    rating: 4.9
  }
];

// =============================================================================
// Store Implementation
// =============================================================================

const API_BASE = '/api';

export const useReferralOrderingStore = create<ReferralOrderingState>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      specialtyCatalog: Object.values(SPECIALTY_CATALOG),
      providerDirectory: PROVIDER_DIRECTORY,
      searchQuery: '',
      categoryFilter: 'all',
      selectedReferrals: new Map(),
      defaultUrgency: 'ROUTINE',
      aiRecommendations: [],
      loadingRecommendations: false,
      patientContext: null,
      selectedSpecialtyForProviders: null,
      filteredProviders: [],
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedReferralIds: [],

      // Load catalogs (could fetch from API)
      loadCatalogs: async () => {
        set(state => { state.loading = true; });
        try {
          // In production, fetch from API
          // const response = await fetch(`${API_BASE}/specialties`);
          set(state => {
            state.specialtyCatalog = Object.values(SPECIALTY_CATALOG);
            state.providerDirectory = PROVIDER_DIRECTORY;
            state.loading = false;
          });
        } catch (error) {
          set(state => {
            state.error = 'Failed to load specialty catalog';
            state.loading = false;
          });
        }
      },

      // Load AI recommendations from BioMistral
      loadAIRecommendations: async (patientId: string, context: PatientContext) => {
        set(state => {
          state.loadingRecommendations = true;
          state.patientContext = context;
        });

        try {
          const response = await fetch(`${API_BASE}/referrals/ai-recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, context })
          });

          if (!response.ok) {
            // Generate fallback recommendations based on context
            const fallbackRecs = generateFallbackRecommendations(context);
            set(state => {
              state.aiRecommendations = fallbackRecs;
              state.loadingRecommendations = false;
            });
            return;
          }

          const recommendations = await response.json();
          set(state => {
            state.aiRecommendations = recommendations;
            state.loadingRecommendations = false;
          });
        } catch (error) {
          const fallbackRecs = generateFallbackRecommendations(context);
          set(state => {
            state.aiRecommendations = fallbackRecs;
            state.loadingRecommendations = false;
          });
        }
      },

      // Search providers by specialty
      searchProviders: (specialty: string, insurance?: string) => {
        set(state => {
          state.selectedSpecialtyForProviders = specialty;
          state.filteredProviders = state.providerDirectory.filter(p => {
            if (p.specialty !== specialty) return false;
            if (insurance && !p.insurancesAccepted.includes(insurance)) return false;
            return true;
          });
        });
      },

      // Add a referral
      addReferral: (specialty: Specialty, urgency?: ReferralUrgency) => {
        const aiRec = get().aiRecommendations.find(r => r.specialty === specialty.code);
        set(state => {
          state.selectedReferrals.set(specialty.code, {
            specialty,
            urgency: urgency || aiRec?.urgency || state.defaultUrgency,
            clinicalQuestion: aiRec?.clinicalQuestion || '',
            relevantHistory: '',
            attachedDocuments: [],
            priorAuthRequired: specialty.requiresAuth,
            aiRecommended: !!aiRec
          });
        });
      },

      // Update referral details
      updateReferral: (code: string, updates: Partial<SelectedReferral>) => {
        set(state => {
          const existing = state.selectedReferrals.get(code);
          if (existing) {
            state.selectedReferrals.set(code, { ...existing, ...updates });
          }
        });
      },

      // Remove referral
      removeReferral: (code: string) => {
        set(state => {
          state.selectedReferrals.delete(code);
        });
      },

      // Set preferred provider
      setPreferredProvider: (specialtyCode: string, provider: Provider) => {
        set(state => {
          const ref = state.selectedReferrals.get(specialtyCode);
          if (ref) {
            ref.preferredProvider = provider;
          }
        });
      },

      // Filters
      setSearchQuery: (query: string) => set(state => { state.searchQuery = query; }),
      setCategoryFilter: (filter) => set(state => { state.categoryFilter = filter; }),
      setDefaultUrgency: (urgency) => set(state => { state.defaultUrgency = urgency; }),

      // Submit referrals
      submitReferrals: async (encounterId: string) => {
        set(state => { state.submitting = true; state.error = null; });
        
        try {
          const { selectedReferrals, patientContext } = get();
          const referralIds: string[] = [];

          for (const [code, referral] of selectedReferrals) {
            const response = await fetch(`${API_BASE}/referrals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                patientId: patientContext?.id,
                specialty: referral.specialty.code,
                specialtyName: referral.specialty.name,
                urgency: referral.urgency,
                preferredProviderId: referral.preferredProvider?.id,
                clinicalQuestion: referral.clinicalQuestion,
                relevantHistory: referral.relevantHistory,
                attachedDocuments: referral.attachedDocuments,
                priorAuthRequired: referral.priorAuthRequired
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit referral');
            }

            const result = await response.json();
            referralIds.push(result.id);
          }

          set(state => {
            state.submitting = false;
            state.lastSubmittedReferralIds = referralIds;
          });

          get().clearOrder();
          return referralIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit referrals';
          });
          throw error;
        }
      },

      // Clear order
      clearOrder: () => set(state => {
        state.selectedReferrals = new Map();
        state.aiRecommendations = [];
        state.patientContext = null;
        state.error = null;
      }),

      // Computed helpers
      getSelectedReferralsArray: () => Array.from(get().selectedReferrals.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter, specialtyCatalog } = get();
        const query = searchQuery.toLowerCase();

        return specialtyCatalog.filter(spec => {
          if (categoryFilter !== 'all' && spec.category !== categoryFilter) return false;
          if (query) {
            return (
              spec.code.toLowerCase().includes(query) ||
              spec.name.toLowerCase().includes(query) ||
              spec.subspecialties.some(s => s.toLowerCase().includes(query)) ||
              spec.commonIndications.some(i => i.toLowerCase().includes(query))
            );
          }
          return true;
        });
      },

      getStatCount: () => {
        return get().getSelectedReferralsArray().filter(r => r.urgency === 'STAT').length;
      },

      getAuthRequiredCount: () => {
        return get().getSelectedReferralsArray().filter(r => r.priorAuthRequired).length;
      },

      hasRedFlagReferrals: () => {
        const { aiRecommendations, selectedReferrals } = get();
        return aiRecommendations.some(rec => 
          rec.redFlagRelated && selectedReferrals.has(rec.specialty)
        );
      }
    })),
    { name: 'referral-ordering-store' }
  )
);

// =============================================================================
// Helper: Generate fallback recommendations
// =============================================================================

function generateFallbackRecommendations(context: PatientContext): AIReferralRecommendation[] {
  const recommendations: AIReferralRecommendation[] = [];
  const complaint = context.chiefComplaint.toLowerCase();
  const redFlags = context.redFlags || [];

  // Headache → Neurology
  if (complaint.includes('headache') || complaint.includes('migraine')) {
    const isRedFlag = redFlags.some(f => 
      f.toLowerCase().includes('thunderclap') || 
      f.toLowerCase().includes('worst headache') ||
      f.toLowerCase().includes('confusion')
    );
    recommendations.push({
      id: `rec-${Date.now()}-neuro`,
      specialty: 'NEURO',
      subspecialty: 'Headache Medicine',
      urgency: isRedFlag ? 'STAT' : 'ROUTINE',
      rationale: isRedFlag 
        ? 'Red flag headache symptoms require urgent neurological evaluation to rule out secondary causes'
        : 'Complex or refractory headache warrants specialist evaluation',
      clinicalQuestion: 'Please evaluate for secondary headache causes and optimize preventive therapy',
      suggestedTests: ['MRI Brain', 'MRA Head/Neck'],
      confidence: isRedFlag ? 0.95 : 0.82,
      category: isRedFlag ? 'critical' : 'recommended',
      redFlagRelated: isRedFlag
    });
  }

  // Chest pain → Cardiology
  if (complaint.includes('chest pain') || complaint.includes('palpitation')) {
    recommendations.push({
      id: `rec-${Date.now()}-cards`,
      specialty: 'CARDS',
      urgency: 'URGENT',
      rationale: 'Chest pain requires cardiac evaluation to rule out ischemic causes',
      clinicalQuestion: 'Please evaluate for cardiac etiology and optimize risk factor management',
      suggestedTests: ['Stress test', 'Echocardiogram'],
      confidence: 0.88,
      category: 'recommended'
    });
  }

  // GI symptoms → Gastroenterology
  if (complaint.includes('abdominal') || complaint.includes('nausea') || complaint.includes('reflux')) {
    recommendations.push({
      id: `rec-${Date.now()}-gi`,
      specialty: 'GI',
      urgency: 'ROUTINE',
      rationale: 'Persistent GI symptoms warrant endoscopic evaluation',
      clinicalQuestion: 'Please evaluate for structural causes and optimize medical management',
      suggestedTests: ['Upper endoscopy', 'H. pylori testing'],
      confidence: 0.75,
      category: 'consider'
    });
  }

  // Joint pain → Orthopedics or Rheumatology
  if (complaint.includes('joint') || complaint.includes('arthritis') || complaint.includes('back pain')) {
    recommendations.push({
      id: `rec-${Date.now()}-ortho`,
      specialty: 'ORTHO',
      urgency: 'ROUTINE',
      rationale: 'Musculoskeletal symptoms may benefit from orthopedic evaluation',
      clinicalQuestion: 'Please evaluate for structural causes and treatment options',
      suggestedTests: ['X-ray', 'MRI if indicated'],
      confidence: 0.72,
      category: 'consider'
    });
  }

  // Mental health
  if (complaint.includes('depression') || complaint.includes('anxiety') || complaint.includes('mood')) {
    recommendations.push({
      id: `rec-${Date.now()}-psych`,
      specialty: 'PSYCH',
      urgency: redFlags.some(f => f.toLowerCase().includes('suicidal')) ? 'STAT' : 'ROUTINE',
      rationale: 'Psychiatric evaluation recommended for medication management and therapy',
      clinicalQuestion: 'Please evaluate and manage psychiatric symptoms',
      suggestedTests: [],
      confidence: 0.80,
      category: 'recommended',
      redFlagRelated: redFlags.some(f => f.toLowerCase().includes('suicidal'))
    });
  }

  return recommendations;
}

export default useReferralOrderingStore;
