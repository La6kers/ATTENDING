// ============================================================
// ATTENDING AI - CDS Hooks Types
// services/cds-hooks/src/types/index.ts
//
// Type definitions for CDS Hooks specification v1.1
// https://cds-hooks.hl7.org/1.0/
// ============================================================

import type { Resource, Bundle } from 'fhir/r4';

// ============================================================
// CDS SERVICE DISCOVERY
// ============================================================

/**
 * CDS Hooks discovery response
 */
export interface CDSServicesResponse {
  services: CDSService[];
}

/**
 * Individual CDS service definition
 */
export interface CDSService {
  /** Unique identifier for this service */
  id: string;
  
  /** Hook this service should be invoked on */
  hook: CDSHookType;
  
  /** Human-readable name */
  title: string;
  
  /** Longer description */
  description: string;
  
  /** Prefetch templates for data the service needs */
  prefetch?: Record<string, string>;
  
  /** Usage requirements description */
  usageRequirements?: string;
}

/**
 * Supported CDS Hook types
 */
export type CDSHookType = 
  | 'patient-view'
  | 'order-select'
  | 'order-sign'
  | 'encounter-start'
  | 'encounter-discharge'
  | 'appointment-book';

// ============================================================
// CDS HOOKS REQUEST
// ============================================================

/**
 * Request sent to CDS service
 */
export interface CDSRequest {
  /** Hook that triggered this request */
  hook: CDSHookType;
  
  /** Unique ID for this request */
  hookInstance: string;
  
  /** FHIR server base URL */
  fhirServer?: string;
  
  /** FHIR authorization token */
  fhirAuthorization?: FHIRAuthorization;
  
  /** Hook-specific context */
  context: CDSContext;
  
  /** Prefetched FHIR resources */
  prefetch?: Record<string, Resource | Bundle>;
}

/**
 * FHIR authorization info
 */
export interface FHIRAuthorization {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  subject: string;
}

/**
 * Hook context (varies by hook type)
 */
export interface CDSContext {
  /** User identifier */
  userId?: string;
  
  /** Patient FHIR ID */
  patientId?: string;
  
  /** Encounter FHIR ID */
  encounterId?: string;
  
  /** Selected order IDs (for order-select) */
  selections?: string[];
  
  /** Draft orders bundle (for order-select/sign) */
  draftOrders?: Bundle;
  
  /** Additional context properties */
  [key: string]: unknown;
}

// ============================================================
// CDS HOOKS RESPONSE
// ============================================================

/**
 * Response from CDS service
 */
export interface CDSResponse {
  /** Cards to display */
  cards: CDSCard[];
  
  /** System actions to execute automatically */
  systemActions?: CDSSystemAction[];
}

/**
 * Decision support card
 */
export interface CDSCard {
  /** Unique identifier */
  uuid: string;
  
  /** One-line summary (<140 chars) */
  summary: string;
  
  /** Detailed info (markdown) */
  detail?: string;
  
  /** Visual indicator */
  indicator: 'info' | 'warning' | 'critical';
  
  /** Source attribution */
  source: CDSSource;
  
  /** Suggested actions */
  suggestions?: CDSSuggestion[];
  
  /** External links */
  links?: CDSLink[];
  
  /** Override reasons if required */
  overrideReasons?: CDSOverrideReason[];
  
  /** Selection behavior for suggestions */
  selectionBehavior?: 'at-most-one' | 'any';
}

/**
 * Source attribution
 */
export interface CDSSource {
  /** Source label */
  label: string;
  
  /** Source URL */
  url?: string;
  
  /** Source icon URL */
  icon?: string;
  
  /** Topic for categorization */
  topic?: CDSTopic;
}

/**
 * Topic for categorization
 */
export interface CDSTopic {
  code: string;
  system: string;
  display?: string;
}

/**
 * Suggested action
 */
export interface CDSSuggestion {
  /** Suggestion label */
  label: string;
  
  /** Unique ID */
  uuid: string;
  
  /** Is this the recommended choice? */
  isRecommended?: boolean;
  
  /** Actions to take */
  actions?: CDSAction[];
}

/**
 * Action to take
 */
export interface CDSAction {
  /** Action type */
  type: 'create' | 'update' | 'delete';
  
  /** Description */
  description: string;
  
  /** FHIR resource for create/update */
  resource?: Resource;
  
  /** Resource ID for update/delete */
  resourceId?: string;
}

/**
 * External link
 */
export interface CDSLink {
  /** Link label */
  label: string;
  
  /** URL */
  url: string;
  
  /** Link type */
  type: 'absolute' | 'smart';
  
  /** App context for SMART links */
  appContext?: string;
}

/**
 * Override reason
 */
export interface CDSOverrideReason {
  code: string;
  system?: string;
  display: string;
}

/**
 * System action (auto-executed)
 */
export interface CDSSystemAction {
  type: 'create' | 'update' | 'delete';
  description: string;
  resource?: Resource;
  resourceId?: string;
}

// ============================================================
// CDS HOOKS FEEDBACK
// ============================================================

/**
 * Feedback sent back about card acceptance
 */
export interface CDSFeedback {
  /** Card UUID */
  card: string;
  
  /** Outcome */
  outcome: 'accepted' | 'overridden';
  
  /** Accepted suggestions */
  acceptedSuggestions?: Array<{ id: string }>;
  
  /** Override reason */
  overrideReason?: CDSOverrideReason;
  
  /** Free text rationale */
  outcomeTimestamp: string;
}

// ============================================================
// ATTENDING-SPECIFIC EXTENSIONS
// ============================================================

/**
 * COMPASS assessment context for cards
 */
export interface COMPASSCardContext {
  assessmentId: string;
  patientId: string;
  chiefComplaint: string;
  urgencyLevel: 'standard' | 'moderate' | 'high';
  urgencyScore: number;
  redFlags: string[];
  differentialDx: Array<{
    name: string;
    probability: number;
    icdCode?: string;
  }>;
}

/**
 * Extended card with ATTENDING metadata
 */
export interface ATTENDINGCard extends CDSCard {
  /** COMPASS-specific context */
  compassContext?: COMPASSCardContext;
  
  /** AI confidence level */
  aiConfidence?: number;
  
  /** Clinical evidence references */
  evidenceReferences?: string[];
}
