// ============================================================
// Referral Ordering Types
// apps/provider-portal/components/referral-ordering/types.ts
//
// Note: Core types are now imported from shared catalogs
// This file maintains UI-specific types and configurations
// ============================================================

// Re-export shared types for convenience
export type {
  PatientContext,
  ReferralUrgency,
  Specialty,
  ReferralProvider as Provider,
  ReferralRecommendation as AIReferralRecommendation,
} from '@attending/shared/catalogs';

// Import types for local use in this file
import type { Specialty, ReferralProvider as Provider, ReferralUrgency } from '@attending/shared/catalogs';
export type ReferralStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'RECEIVED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'DENIED';
// Aligned with RecommendationCategory from shared catalogs
export type ReferralCategory = 'critical' | 'recommended' | 'consider' | 'avoid' | 'not-indicated' | 'new';

// Note: Specialty, Provider (as ReferralProvider), and AIReferralRecommendation
// are now imported from shared catalogs above

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

// PatientContext is now imported from shared catalogs above
// Extended patient context for UI-specific needs (add riskLevel if needed)
export interface UIPatientContext {
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
  avoid: {
    label: 'Avoid',
    borderColor: 'border-l-orange-500',
    bgColor: 'bg-orange-50',
  },
  'not-indicated': {
    label: 'Not Indicated',
    borderColor: 'border-l-gray-300',
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
