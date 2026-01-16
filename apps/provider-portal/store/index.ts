// =============================================================================
// ATTENDING AI - Provider Portal Stores
// apps/provider-portal/store/index.ts
//
// Barrel exports for all Zustand stores
// Organized by domain for cleaner imports
// =============================================================================

// =============================================================================
// Clinical Ordering Stores
// =============================================================================

// Lab Orders
export { 
  useLabOrderingStore,
  LAB_CATALOG,
  LAB_PANELS,
  type LabTest,
  type LabPanel,
  type LabCategory,
  type SelectedLab,
  type LabRecommendation,
} from './labOrderingStore';

// Imaging Orders
export { 
  useImagingOrderingStore,
  IMAGING_CATALOG,
  type ImagingStudy,
  type ImagingModality,
  type SelectedStudy,
  type ImagingRecommendation,
} from './imagingOrderingStore';

// Medication Orders
export { 
  useMedicationOrderingStore,
  type SelectedMedication,
} from './medicationOrderingStore';

// Referral Orders
export { 
  useReferralOrderingStore,
  type Specialty,
  type Provider as ReferralProvider,
  type SelectedReferral,
  type AIReferralRecommendation,
} from './referralOrderingStore';

// =============================================================================
// Treatment & Care Planning
// =============================================================================

export { 
  useTreatmentPlanStore,
} from './treatmentPlanStore';

// =============================================================================
// Communication Stores
// =============================================================================

// Provider Chat
export { 
  useProviderChatStore,
} from './providerChatStore';

// Patient Chat (provider view)
export { 
  usePatientChatStore,
} from './patientChatStore';

// =============================================================================
// Workflow & Queue Management
// =============================================================================

// Assessment Queue
export { 
  useAssessmentQueueStore,
} from './assessmentQueueStore';

// Clinical Hub (unified workflow)
export { 
  useClinicalHub,
} from './useClinicalHub';

// Inbox
export { 
  useInbox,
} from './useInbox';

// =============================================================================
// Provider State
// =============================================================================

export { 
  useProviderStore,
} from './useProviderStore';

// =============================================================================
// Shared Types
// =============================================================================

export type { OrderPriority, PatientContext } from '@attending/shared/catalogs';
