// ============================================================
// Referral Ordering Types
// apps/provider-portal/components/referral-ordering/types.ts
// ============================================================

export type ReferralUrgency = 'STAT' | 'URGENT' | 'ROUTINE' | 'ELECTIVE';
export type ReferralStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'RECEIVED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'DENIED';
export type ReferralCategory = 'critical' | 'recommended' | 'consider' | 'new';

export interface Specialty {
  code: string;
  name: string;
  category: 'medical' | 'surgical' | 'diagnostic' | 'therapeutic' | 'behavioral';
  subspecialties: string[];
  averageWaitDays: { routine: number; urgent: number };
  requiresAuth: boolean;
  commonIndications: string[];
  redFlagIndications: string[];
  icon?: string;
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
  category: ReferralCategory;
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
  status?: ReferralStatus;
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
  riskLevel?: 'low' | 'moderate' | 'high';
}

export interface ReferralStatusUpdate {
  id: string;
  status: ReferralStatus;
  timestamp: Date;
  message: string;
  completed: boolean;
}

export interface ActiveReferral {
  id: string;
  specialty: string;
  specialtyName: string;
  status: ReferralStatus;
  appointmentDate?: string;
  provider?: string;
}

export interface CommonReferralOption {
  specialty: string;
  icon: string;
  label: string;
  defaultUrgency: ReferralUrgency;
  defaultProvider?: string;
}

// Urgency configuration for consistent styling
export const URGENCY_CONFIG: Record<ReferralUrgency, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  waitTime: string;
}> = {
  STAT: {
    label: 'STAT',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    waitTime: 'Same day',
  },
  URGENT: {
    label: 'Urgent',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    waitTime: '24-48 hours',
  },
  ROUTINE: {
    label: 'Routine',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    waitTime: '2-4 weeks',
  },
  ELECTIVE: {
    label: 'Elective',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    waitTime: '4+ weeks',
  },
};

// Category configuration for AI recommendations
export const CATEGORY_CONFIG: Record<ReferralCategory, {
  label: string;
  borderColor: string;
  bgColor: string;
}> = {
  critical: {
    label: 'Critical',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
  },
  recommended: {
    label: 'Recommended',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50',
  },
  consider: {
    label: 'Consider',
    borderColor: 'border-l-gray-400',
    bgColor: 'bg-gray-50',
  },
  new: {
    label: 'New',
    borderColor: 'border-l-purple-500',
    bgColor: 'bg-purple-50',
  },
};

// Common referral quick-select options
export const COMMON_REFERRALS: CommonReferralOption[] = [
  { specialty: 'CARDS', icon: '❤️', label: 'Cardiology', defaultUrgency: 'ROUTINE' },
  { specialty: 'ENDO', icon: '🩺', label: 'Endocrinology', defaultUrgency: 'ROUTINE' },
  { specialty: 'DERM', icon: '🧴', label: 'Dermatology', defaultUrgency: 'ROUTINE' },
  { specialty: 'ORTHO', icon: '🦴', label: 'Orthopedics', defaultUrgency: 'ROUTINE' },
  { specialty: 'PSYCH', icon: '🧠', label: 'Psychiatry', defaultUrgency: 'ROUTINE' },
  { specialty: 'GI', icon: '🫁', label: 'Gastroenterology', defaultUrgency: 'ROUTINE' },
  { specialty: 'PULM', icon: '💨', label: 'Pulmonology', defaultUrgency: 'ROUTINE' },
  { specialty: 'RHEUM', icon: '🔬', label: 'Rheumatology', defaultUrgency: 'ROUTINE' },
];
