/**
 * Referral system types for the provider portal
 */

// Base referral types
export type ReferralUrgency = 'routine' | 'priority' | 'urgent';
export type ReferralStatus = 
  | 'draft' 
  | 'submitted' 
  | 'authorization-pending' 
  | 'approved' 
  | 'denied' 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled'
  | 'provider-notified'
  | 'in-progress';

export type SpecialtyType = 
  | 'cardiology'
  | 'neurology'
  | 'endocrinology'
  | 'dermatology'
  | 'orthopedics'
  | 'psychiatry'
  | 'gastroenterology'
  | 'ophthalmology'
  | 'pulmonology'
  | 'rheumatology'
  | 'oncology'
  | 'urology'
  | 'otolaryngology'
  | 'nephrology'
  | 'hematology'
  | 'infectious-disease'
  | 'pain-management'
  | 'physical-therapy'
  | 'occupational-therapy'
  | 'other';

// Provider information
export interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: SpecialtyType;
  subspecialty?: string;
  npi: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax?: string;
  };
  availability: {
    nextAvailable: Date;
    waitTime: string;
    acceptingNewPatients: boolean;
    urgentSlots: boolean;
  };
  insurance: {
    inNetwork: boolean;
    plans: string[];
  };
  ratings: {
    overall: number;
    patientSatisfaction: number;
    reviewCount: number;
  };
  credentials: string[];
  languages: string[];
  hospitalAffiliations: string[];
}

// Clinical information
export interface ClinicalJustification {
  primaryDiagnosis: string;
  icdCodes: string[];
  symptoms: string[];
  redFlags: string[];
  clinicalReason: string;
  supportingDocumentation: string[];
  urgencyJustification?: string;
  differentialDiagnoses?: string[];
}

// AI recommendation
export interface AIReferralRecommendation {
  id: string;
  confidence: number;
  reasoning: string;
  suggestedSpecialty: SpecialtyType;
  suggestedUrgency: ReferralUrgency;
  clinicalIndicators: string[];
  riskFactors: string[];
  recommendedProviders: string[];
  alternativeSpecialties?: SpecialtyType[];
  contraindications?: string[];
  additionalConsiderations?: string[];
}

// Insurance and authorization
export interface InsuranceAuthorization {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'not-required';
  authorizationNumber?: string;
  approvedDate?: Date;
  expirationDate?: Date;
  denialReason?: string;
  appealDeadline?: Date;
  copayAmount?: number;
  deductibleAmount?: number;
  coinsurancePercentage?: number;
  priorAuthRequired: boolean;
  referralRequired: boolean;
  visitLimit?: number;
  notes?: string;
}

// Main referral interface
export interface Referral {
  id: string;
  patientId: string;
  providerId: string;
  requestingProviderId: string;
  
  // Basic information
  specialty: SpecialtyType;
  subspecialty?: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  
  // Provider information
  preferredProvider?: Provider;
  assignedProvider?: Provider;
  alternativeProviders: Provider[];
  
  // Clinical information
  clinicalJustification: ClinicalJustification;
  aiRecommendation?: AIReferralRecommendation;
  
  // Insurance and authorization
  insurance: InsuranceAuthorization;
  
  // Workflow tracking
  submittedAt?: Date;
  authorizedAt?: Date;
  scheduledAt?: Date;
  appointmentDate?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Communication
  patientNotified: boolean;
  providerNotified: boolean;
  notifications: ReferralNotification[];
  
  // Documentation
  attachments: ReferralAttachment[];
  notes: ReferralNote[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// Referral creation request
export interface CreateReferralRequest {
  patientId: string;
  specialty: SpecialtyType;
  subspecialty?: string;
  urgency: ReferralUrgency;
  preferredProviderId?: string;
  clinicalReason: string;
  primaryDiagnosis: string;
  icdCodes?: string[];
  symptoms?: string[];
  redFlags?: string[];
  supportingDocumentation?: string[];
  requestUrgentSlot?: boolean;
  patientPreferences?: {
    location?: string;
    language?: string;
    gender?: 'male' | 'female' | 'no-preference';
    timePreference?: 'morning' | 'afternoon' | 'evening' | 'any';
  };
}

// Referral update request
export interface UpdateReferralRequest {
  id: string;
  status?: ReferralStatus;
  assignedProviderId?: string;
  appointmentDate?: Date;
  notes?: string;
  insurance?: Partial<InsuranceAuthorization>;
}

// Referral search and filtering
export interface ReferralFilters {
  status?: ReferralStatus[];
  urgency?: ReferralUrgency[];
  specialty?: SpecialtyType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  providerId?: string[];
  patientId?: string;
  needsAuthorization?: boolean;
  overdue?: boolean;
  searchQuery?: string;
}

export interface ReferralSort {
  field: 'createdAt' | 'urgency' | 'status' | 'specialty' | 'appointmentDate' | 'patientName';
  direction: 'asc' | 'desc';
}

// Referral list response
export interface ReferralListResponse {
  referrals: Referral[];
  totalCount: number;
  filters: ReferralFilters;
  sort: ReferralSort;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Notifications
export interface ReferralNotification {
  id: string;
  type: 'status-change' | 'appointment-scheduled' | 'authorization-update' | 'reminder' | 'urgent-alert';
  title: string;
  message: string;
  recipient: 'patient' | 'provider' | 'staff' | 'all';
  method: 'email' | 'sms' | 'phone' | 'portal' | 'fax';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failed?: boolean;
  failureReason?: string;
}

// Attachments
export interface ReferralAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  category: 'clinical-notes' | 'lab-results' | 'imaging' | 'insurance' | 'other';
  description?: string;
  url: string;
  thumbnailUrl?: string;
}

// Notes
export interface ReferralNote {
  id: string;
  content: string;
  type: 'clinical' | 'administrative' | 'patient-communication' | 'provider-communication';
  createdAt: Date;
  createdBy: string;
  isPrivate: boolean;
  tags?: string[];
}

// Appeal process
export interface ReferralAppeal {
  id: string;
  referralId: string;
  reason: string;
  status: 'pending' | 'under-review' | 'approved' | 'denied' | 'withdrawn';
  submittedAt: Date;
  submittedBy: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  decision?: string;
  decisionReason?: string;
  supportingDocuments: ReferralAttachment[];
  timeline: AppealTimelineEvent[];
}

export interface AppealTimelineEvent {
  id: string;
  type: 'submitted' | 'acknowledged' | 'under-review' | 'additional-info-requested' | 'decision-made';
  description: string;
  occurredAt: Date;
  performedBy: string;
  notes?: string;
}

// Provider search and matching
export interface ProviderSearchCriteria {
  specialty: SpecialtyType;
  subspecialty?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in miles
  };
  zipCode?: string;
  city?: string;
  state?: string;
  urgency?: ReferralUrgency;
  insurancePlan?: string;
  language?: string;
  gender?: 'male' | 'female';
  acceptingNewPatients?: boolean;
  hospitalAffiliation?: string;
  minRating?: number;
  maxWaitTime?: number; // in days
  sortBy?: 'distance' | 'rating' | 'wait-time' | 'availability';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProviderSearchResult {
  providers: Provider[];
  totalFound: number;
  searchCriteria: ProviderSearchCriteria;
  searchRadius?: number;
  alternativeSpecialties?: SpecialtyType[];
}

// Referral analytics and reporting
export interface ReferralAnalytics {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  deniedReferrals: number;
  completedReferrals: number;
  averageProcessingTime: number; // in days
  averageWaitTime: number; // in days
  approvalRate: number; // percentage
  urgentReferrals: number;
  bySpecialty: Record<SpecialtyType, number>;
  byStatus: Record<ReferralStatus, number>;
  byUrgency: Record<ReferralUrgency, number>;
  monthlyTrends: {
    month: string;
    total: number;
    approved: number;
    denied: number;
    completed: number;
  }[];
}

// Referral templates
export interface ReferralTemplate {
  id: string;
  name: string;
  description: string;
  specialty: SpecialtyType;
  subspecialty?: string;
  defaultUrgency: ReferralUrgency;
  clinicalReasonTemplate: string;
  requiredFields: string[];
  optionalFields: string[];
  icdCodes: string[];
  commonSymptoms: string[];
  redFlags: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

// Workflow configuration
export interface ReferralWorkflowConfig {
  id: string;
  specialty: SpecialtyType;
  urgencyRules: {
    urgency: ReferralUrgency;
    autoApprove: boolean;
    requiresAuthorization: boolean;
    maxWaitTime: number; // in days
    escalationRules: {
      condition: string;
      action: string;
      notifyRoles: string[];
    }[];
  }[];
  statusTransitions: {
    from: ReferralStatus;
    to: ReferralStatus[];
    requiredRole?: string;
    autoTransition?: boolean;
    conditions?: string[];
  }[];
  notificationRules: {
    trigger: string;
    recipients: string[];
    template: string;
    delay?: number; // in minutes
  }[];
}

// Common specialty configurations
export const SPECIALTY_CONFIGS: Record<SpecialtyType, {
  name: string;
  icon: string;
  commonUrgency: ReferralUrgency;
  typicalWaitTime: string;
  requiresAuthorization: boolean;
  commonReasons: string[];
}> = {
  cardiology: {
    name: 'Cardiology',
    icon: '❤️',
    commonUrgency: 'priority',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Chest pain evaluation', 'Hypertension management', 'Heart murmur assessment']
  },
  neurology: {
    name: 'Neurology',
    icon: '🧠',
    commonUrgency: 'priority',
    typicalWaitTime: '2-3 weeks',
    requiresAuthorization: true,
    commonReasons: ['Headache evaluation', 'Seizure workup', 'Memory concerns']
  },
  endocrinology: {
    name: 'Endocrinology',
    icon: '🩺',
    commonUrgency: 'routine',
    typicalWaitTime: '3-4 weeks',
    requiresAuthorization: true,
    commonReasons: ['Diabetes management', 'Thyroid disorders', 'Hormone imbalances']
  },
  dermatology: {
    name: 'Dermatology',
    icon: '🧴',
    commonUrgency: 'routine',
    typicalWaitTime: '2-4 weeks',
    requiresAuthorization: false,
    commonReasons: ['Skin lesion evaluation', 'Rash assessment', 'Mole check']
  },
  orthopedics: {
    name: 'Orthopedics',
    icon: '🦴',
    commonUrgency: 'routine',
    typicalWaitTime: '1-3 weeks',
    requiresAuthorization: true,
    commonReasons: ['Joint pain', 'Sports injury', 'Fracture follow-up']
  },
  psychiatry: {
    name: 'Psychiatry',
    icon: '🧠',
    commonUrgency: 'priority',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Depression screening', 'Anxiety management', 'Medication evaluation']
  },
  gastroenterology: {
    name: 'Gastroenterology',
    icon: '🫁',
    commonUrgency: 'routine',
    typicalWaitTime: '2-3 weeks',
    requiresAuthorization: true,
    commonReasons: ['Abdominal pain', 'GERD evaluation', 'Colonoscopy screening']
  },
  ophthalmology: {
    name: 'Ophthalmology',
    icon: '👁️',
    commonUrgency: 'routine',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: false,
    commonReasons: ['Vision changes', 'Eye pain', 'Diabetic eye exam']
  },
  pulmonology: {
    name: 'Pulmonology',
    icon: '🫁',
    commonUrgency: 'priority',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Shortness of breath', 'Chronic cough', 'Sleep apnea']
  },
  rheumatology: {
    name: 'Rheumatology',
    icon: '🦴',
    commonUrgency: 'routine',
    typicalWaitTime: '4-6 weeks',
    requiresAuthorization: true,
    commonReasons: ['Joint pain', 'Autoimmune disorders', 'Arthritis evaluation']
  },
  oncology: {
    name: 'Oncology',
    icon: '🎗️',
    commonUrgency: 'urgent',
    typicalWaitTime: '1-2 days',
    requiresAuthorization: true,
    commonReasons: ['Cancer screening', 'Abnormal imaging', 'Tumor evaluation']
  },
  urology: {
    name: 'Urology',
    icon: '🩺',
    commonUrgency: 'routine',
    typicalWaitTime: '2-3 weeks',
    requiresAuthorization: true,
    commonReasons: ['Kidney stones', 'Urinary symptoms', 'Prostate evaluation']
  },
  otolaryngology: {
    name: 'ENT',
    icon: '👂',
    commonUrgency: 'routine',
    typicalWaitTime: '2-3 weeks',
    requiresAuthorization: false,
    commonReasons: ['Hearing loss', 'Sinus problems', 'Throat issues']
  },
  nephrology: {
    name: 'Nephrology',
    icon: '🩺',
    commonUrgency: 'priority',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Kidney function decline', 'Hypertension', 'Proteinuria']
  },
  hematology: {
    name: 'Hematology',
    icon: '🩸',
    commonUrgency: 'priority',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Anemia evaluation', 'Bleeding disorders', 'Blood count abnormalities']
  },
  'infectious-disease': {
    name: 'Infectious Disease',
    icon: '🦠',
    commonUrgency: 'urgent',
    typicalWaitTime: '1-3 days',
    requiresAuthorization: true,
    commonReasons: ['Complex infections', 'Antibiotic resistance', 'Fever workup']
  },
  'pain-management': {
    name: 'Pain Management',
    icon: '💊',
    commonUrgency: 'routine',
    typicalWaitTime: '2-4 weeks',
    requiresAuthorization: true,
    commonReasons: ['Chronic pain', 'Back pain', 'Nerve pain']
  },
  'physical-therapy': {
    name: 'Physical Therapy',
    icon: '🏃',
    commonUrgency: 'routine',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Mobility issues', 'Post-surgical rehab', 'Injury recovery']
  },
  'occupational-therapy': {
    name: 'Occupational Therapy',
    icon: '🤲',
    commonUrgency: 'routine',
    typicalWaitTime: '1-2 weeks',
    requiresAuthorization: true,
    commonReasons: ['Daily living skills', 'Hand therapy', 'Cognitive rehabilitation']
  },
  other: {
    name: 'Other Specialty',
    icon: '🩺',
    commonUrgency: 'routine',
    typicalWaitTime: '2-4 weeks',
    requiresAuthorization: true,
    commonReasons: ['Specialized consultation', 'Second opinion', 'Complex case']
  }
};

// Utility types
export type ReferralAction = 
  | 'submit'
  | 'preview'
  | 'edit'
  | 'cancel'
  | 'approve'
  | 'deny'
  | 'schedule'
  | 'complete'
  | 'appeal'
  | 'duplicate'
  | 'print'
  | 'export';

export interface ReferralActionResult {
  success: boolean;
  message: string;
  referralId?: string;
  errors?: string[];
  warnings?: string[];
}

// Form validation
export interface ReferralValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ReferralValidationResult {
  isValid: boolean;
  errors: ReferralValidationError[];
  warnings: ReferralValidationError[];
}
