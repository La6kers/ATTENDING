// ============================================================
// Unified Clinical Types
// apps/shared/types/clinical.types.ts
//
// SINGLE SOURCE OF TRUTH for all clinical types used across:
// - Provider Portal ordering modules (labs, imaging, medications, referrals)
// - Patient Portal (COMPASS) assessments
// - Shared catalogs and recommendation services
// ============================================================

// =============================================================================
// ALLERGY TYPES - Canonical Definition
// =============================================================================

/**
 * Structured allergy information with full clinical details
 * Use this when you need severity, reaction type, and cross-reactivity info
 */
export interface AllergyInfo {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  type?: 'drug' | 'food' | 'environmental' | 'contrast' | 'other';
  crossReactivity?: string[];
}

/**
 * Type guard to check if an allergy is a structured AllergyInfo object
 */
export function isAllergyInfo(allergy: string | AllergyInfo): allergy is AllergyInfo {
  return typeof allergy === 'object' && 'allergen' in allergy;
}

/**
 * Normalize any allergy format to AllergyInfo
 * Handles both string[] and AllergyInfo[] inputs
 */
export function normalizeAllergy(allergy: string | AllergyInfo): AllergyInfo {
  if (typeof allergy === 'string') {
    return { allergen: allergy, severity: 'moderate' };
  }
  return allergy;
}

/**
 * Extract allergen name from any allergy format
 */
export function getAllergenName(allergy: string | AllergyInfo): string {
  return typeof allergy === 'string' ? allergy : allergy.allergen;
}

/**
 * Normalize an array of allergies to AllergyInfo[]
 */
export function normalizeAllergies(allergies: (string | AllergyInfo)[] | undefined): AllergyInfo[] {
  if (!allergies) return [];
  return allergies.map(normalizeAllergy);
}

/**
 * Extract allergen names as string array
 */
export function getAllergenNames(allergies: (string | AllergyInfo)[] | undefined): string[] {
  if (!allergies) return [];
  return allergies.map(getAllergenName);
}

// =============================================================================
// ORDERING CONTEXT - Canonical Definition (renamed from PatientContext)
// =============================================================================

/**
 * Compact patient context for clinical ordering workflows.
 * Used by labs, imaging, medications, referrals, and AI recommendation engines.
 *
 * NOT the same as the rich PatientContextState in patientContextStore —
 * use patientContextStore.toOrderingContext() to bridge between them.
 *
 * IMPORTANT: `allergies` can be either string[] or AllergyInfo[]
 * Always use the helper functions above to safely access allergy data.
 */
export interface OrderingContext {
  // Identity
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | string;
  
  // Clinical presentation
  chiefComplaint: string;
  redFlags: string[];
  primaryDiagnosis?: string;
  riskLevel?: 'low' | 'moderate' | 'high';  // Clinical risk stratification
  
  // Medical history - allergies can be simple strings or detailed objects
  allergies: (string | AllergyInfo)[];
  currentMedications: string[];
  medicalHistory: string[];
  
  // Physical measurements
  weight?: number;
  height?: number;
  
  // Lab values for drug dosing
  creatinine?: number;
  gfr?: number;
  renalFunction?: { creatinine: number; gfr: number };
  hepaticFunction?: { alt: number; ast: number };
  
  // Special populations
  pregnant?: boolean;
  breastfeeding?: boolean;
  
  // Administrative
  insurancePlan?: string;
  pcp?: string;
}

/**
 * @deprecated Use OrderingContext instead. Kept for backward compatibility.
 */
export type PatientContext = OrderingContext;

// =============================================================================
// ORDER PRIORITY - Canonical Definition
// =============================================================================

export type OrderPriority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';

export const PRIORITY_CONFIG: Record<OrderPriority, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  sortOrder: number;
  description: string;
}> = {
  STAT: { 
    label: 'STAT', 
    color: 'red', 
    bgColor: 'bg-red-100', 
    textColor: 'text-red-700',
    sortOrder: 0,
    description: 'Immediately - life threatening'
  },
  URGENT: { 
    label: 'Urgent', 
    color: 'orange', 
    bgColor: 'bg-orange-100', 
    textColor: 'text-orange-700',
    sortOrder: 1,
    description: 'Within 1-2 hours'
  },
  ASAP: { 
    label: 'ASAP', 
    color: 'yellow', 
    bgColor: 'bg-yellow-100', 
    textColor: 'text-yellow-700',
    sortOrder: 2,
    description: 'As soon as possible'
  },
  ROUTINE: { 
    label: 'Routine', 
    color: 'gray', 
    bgColor: 'bg-gray-100', 
    textColor: 'text-gray-700',
    sortOrder: 3,
    description: 'Standard turnaround'
  },
};

// =============================================================================
// RECOMMENDATION CATEGORIES - Canonical Definition
// =============================================================================

export type RecommendationCategory = 
  | 'critical'      // Red flag related, order immediately
  | 'recommended'   // Strongly recommended based on presentation
  | 'consider'      // May provide additional insight
  | 'not-indicated' // Not clinically indicated
  | 'avoid';        // Contraindicated or harmful

export const RECOMMENDATION_CATEGORY_CONFIGS: Record<RecommendationCategory, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
  buttonColor: string;
  sortOrder: number;
}> = {
  critical: {
    title: 'Critical - Order Immediately',
    description: 'Essential based on red flag symptoms',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    sortOrder: 0,
  },
  recommended: {
    title: 'Strongly Recommended',
    description: 'High clinical value based on presentation',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    sortOrder: 1,
  },
  consider: {
    title: 'Consider Ordering',
    description: 'May provide additional clinical insight',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    sortOrder: 2,
  },
  'not-indicated': {
    title: 'Not Indicated',
    description: 'Not clinically indicated for this presentation',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
    badgeColor: 'bg-gray-100 text-gray-600',
    buttonColor: 'bg-gray-500 hover:bg-gray-600',
    sortOrder: 3,
  },
  avoid: {
    title: 'Avoid',
    description: 'May cause harm or is contraindicated',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    iconColor: 'text-red-700',
    badgeColor: 'bg-red-200 text-red-800',
    buttonColor: 'bg-red-700 hover:bg-red-800',
    sortOrder: 4,
  },
};

/**
 * Groups recommendations by category for display
 */
export function groupRecommendationsByCategory<T extends { category: RecommendationCategory | string }>(
  items: T[]
): Record<RecommendationCategory, T[]> {
  const categories: RecommendationCategory[] = ['critical', 'recommended', 'consider', 'not-indicated', 'avoid'];
  
  const result = categories.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as Record<RecommendationCategory, T[]>);
  
  for (const item of items) {
    const cat = item.category as RecommendationCategory;
    if (result[cat]) {
      result[cat].push(item);
    }
  }
  
  return result;
}

/**
 * Check if a category is actionable (can be ordered)
 */
export function isActionableCategory(category: RecommendationCategory): boolean {
  return category === 'critical' || category === 'recommended' || category === 'consider';
}

// =============================================================================
// BASE CATALOG AND RECOMMENDATION TYPES
// =============================================================================

/**
 * Base interface for all catalog items (labs, imaging, meds, etc.)
 */
export interface BaseCatalogItem {
  code: string;
  name: string;
  description: string;
  category: string;
  defaultPriority: OrderPriority;
  cost: number | { generic: number; brand: number };
}

/**
 * Base interface for selected items in an order
 */
export interface BaseSelectedItem<T extends BaseCatalogItem = BaseCatalogItem> {
  item: T;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

/**
 * Base interface for AI recommendations
 */
export interface BaseAIRecommendation {
  id: string;
  itemCode: string;
  itemName: string;
  priority: OrderPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: RecommendationCategory;
  redFlagRelated?: boolean;
  warningMessage?: string;
}

// =============================================================================
// URGENCY LEVEL
// Note: UrgencyLevel is defined in chat.types.ts as the single source of truth
// Import from there: import { UrgencyLevel, URGENCY_CONFIG } from './chat.types';
// =============================================================================
