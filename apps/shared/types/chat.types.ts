// ============================================================
// ATTENDING AI - Unified Chat Types
// apps/shared/types/chat.types.ts
//
// Single source of truth for all chat-related types used by:
// - Patient Portal (COMPASS)
// - Provider Portal
// - Chat stores
// - UI components
//
// UPDATED: Standardized to camelCase to match XState machine
// ============================================================

// =============================================================================
// Assessment Phases - Detailed 18-Phase Flow (camelCase)
// =============================================================================

/**
 * Detailed assessment phases used in COMPASS chat flow.
 * Uses camelCase to match XState assessment machine states.
 */
export type DetailedAssessmentPhase =
  | 'welcome'
  | 'demographics'
  | 'chiefComplaint'
  | 'hpiOnset'
  | 'hpiLocation'
  | 'hpiDuration'
  | 'hpiCharacter'
  | 'hpiSeverity'
  | 'hpiAggravating'
  | 'hpiRelieving'
  | 'hpiAssociated'
  | 'reviewOfSystems'
  | 'medications'
  | 'allergies'
  | 'medicalHistory'
  | 'socialHistory'
  | 'familyHistory'
  | 'summary'
  | 'complete';

/**
 * High-level assessment phases for progress tracking and provider view.
 */
export type HighLevelAssessmentPhase =
  | 'chief-complaint'
  | 'hpi-development'
  | 'review-of-systems'
  | 'medical-history'
  | 'risk-stratification'
  | 'clinical-summary';

/**
 * Maps detailed phases to high-level categories for progress display.
 */
export const PHASE_CATEGORY_MAP: Record<DetailedAssessmentPhase, HighLevelAssessmentPhase> = {
  welcome: 'chief-complaint',
  demographics: 'chief-complaint',
  chiefComplaint: 'chief-complaint',
  hpiOnset: 'hpi-development',
  hpiLocation: 'hpi-development',
  hpiDuration: 'hpi-development',
  hpiCharacter: 'hpi-development',
  hpiSeverity: 'hpi-development',
  hpiAggravating: 'hpi-development',
  hpiRelieving: 'hpi-development',
  hpiAssociated: 'hpi-development',
  reviewOfSystems: 'review-of-systems',
  medications: 'medical-history',
  allergies: 'medical-history',
  medicalHistory: 'medical-history',
  socialHistory: 'medical-history',
  familyHistory: 'medical-history',
  summary: 'clinical-summary',
  complete: 'clinical-summary',
};

/**
 * Progress percentage for each detailed phase.
 */
export const PHASE_PROGRESS: Record<DetailedAssessmentPhase, number> = {
  welcome: 0,
  demographics: 5,
  chiefComplaint: 10,
  hpiOnset: 15,
  hpiLocation: 20,
  hpiDuration: 25,
  hpiCharacter: 30,
  hpiSeverity: 35,
  hpiAggravating: 40,
  hpiRelieving: 45,
  hpiAssociated: 50,
  reviewOfSystems: 55,
  medications: 65,
  allergies: 70,
  medicalHistory: 75,
  socialHistory: 80,
  familyHistory: 85,
  summary: 95,
  complete: 100,
};

// =============================================================================
// Urgency Levels
// =============================================================================

/**
 * Unified urgency level including emergency.
 * Used consistently across patient and provider portals.
 */
export type UrgencyLevel = 'standard' | 'moderate' | 'high' | 'emergency';

/**
 * Urgency level configuration for UI display.
 */
export const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  priority: number;
}> = {
  standard: {
    label: 'Standard',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    priority: 1,
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    priority: 2,
  },
  high: {
    label: 'High Priority',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    priority: 3,
  },
  emergency: {
    label: 'EMERGENCY',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    priority: 4,
  },
};

// =============================================================================
// Quick Reply Types
// =============================================================================

/**
 * Quick reply option for chat interface.
 * Uses 'text' consistently across all components.
 */
export interface QuickReply {
  id: string;
  text: string;
  value?: string;
  icon?: 'check' | 'x' | 'clock' | 'arrow' | 'alert';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  category?: string;
}

// =============================================================================
// Message Types
// =============================================================================

/**
 * Role of the message sender.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Metadata attached to chat messages.
 * phase now uses standardized DetailedAssessmentPhase (camelCase)
 */
export interface MessageMetadata {
  phase?: DetailedAssessmentPhase;
  quickReplies?: QuickReply[];
  isRedFlag?: boolean;
  isEmergency?: boolean;
  urgencyTrigger?: boolean;
  aiConfidence?: number;
  clinicalNote?: string;
  redFlagDetected?: boolean;
}

/**
 * Chat message with ISO string timestamp.
 * Timestamps are always stored as ISO strings for serialization.
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO 8601 format
  metadata?: MessageMetadata;
}

/**
 * Helper to create a new message with proper timestamp.
 */
export function createMessage(
  role: MessageRole,
  content: string,
  metadata?: MessageMetadata
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

/**
 * Helper to generate unique message ID.
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// Red Flag Types
// =============================================================================

/**
 * Red flag severity levels.
 */
export type RedFlagSeverity = 'warning' | 'urgent' | 'critical';

/**
 * Detected red flag from symptom analysis.
 */
export interface RedFlag {
  id: string;
  symptom: string;
  severity: RedFlagSeverity;
  detectedAt: string; // ISO 8601 format
  context: string;
  category?: string;
}

/**
 * Helper to create a new red flag.
 */
export function createRedFlag(
  symptom: string,
  severity: RedFlagSeverity,
  context: string,
  category?: string
): RedFlag {
  return {
    id: `rf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symptom,
    severity,
    detectedAt: new Date().toISOString(),
    context: context.substring(0, 100),
    category,
  };
}

// =============================================================================
// HPI (History of Present Illness) Data
// =============================================================================

/**
 * Structured HPI data collected during assessment.
 */
export interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number; // 0-10 scale
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
  timing?: string;
}

// =============================================================================
// Assessment Data
// =============================================================================

/**
 * Complete assessment data collected during COMPASS chat.
 */
export interface AssessmentData {
  sessionId: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi: HPIData;
  reviewOfSystems: Record<string, string[]>;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  surgicalHistory: string[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory: string[];
}

/**
 * Create empty assessment data with session ID.
 */
export function createAssessmentData(sessionId: string): AssessmentData {
  return {
    sessionId,
    hpi: {},
    reviewOfSystems: {},
    medications: [],
    allergies: [],
    medicalHistory: [],
    surgicalHistory: [],
    socialHistory: {},
    familyHistory: [],
  };
}

// =============================================================================
// Chat Session Types
// =============================================================================

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `COMPASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Chat session state.
 */
export interface ChatSession {
  sessionId: string;
  isInitialized: boolean;
  messages: ChatMessage[];
  currentPhase: DetailedAssessmentPhase;
  assessmentData: AssessmentData;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: RedFlag[];
  isAIProcessing: boolean;
  showEmergencyModal: boolean;
  error: string | null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate urgency score from red flags and severity.
 */
export function calculateUrgencyScore(redFlags: RedFlag[], severity?: number): number {
  let score = 0;

  redFlags.forEach((flag) => {
    switch (flag.severity) {
      case 'critical':
        score += 40;
        break;
      case 'urgent':
        score += 25;
        break;
      case 'warning':
        score += 10;
        break;
    }
  });

  if (severity && severity >= 8) score += 20;
  else if (severity && severity >= 6) score += 10;

  return Math.min(score, 100);
}

/**
 * Determine urgency level from score.
 */
export function determineUrgencyLevel(score: number, hasEmergency: boolean): UrgencyLevel {
  if (hasEmergency || score >= 80) return 'emergency';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'standard';
}

/**
 * Format timestamp for display.
 */
export function formatMessageTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Get progress percentage for current phase.
 */
export function getPhaseProgress(phase: DetailedAssessmentPhase): number {
  return PHASE_PROGRESS[phase] || 0;
}

/**
 * Get high-level category for detailed phase.
 */
export function getPhaseCategory(phase: DetailedAssessmentPhase): HighLevelAssessmentPhase {
  return PHASE_CATEGORY_MAP[phase] || 'chief-complaint';
}

// =============================================================================
// Legacy Compatibility - Snake Case Mapping
// =============================================================================

/**
 * @deprecated Use DetailedAssessmentPhase instead
 * Maps snake_case phase names to camelCase for legacy support
 */
export const LEGACY_PHASE_MAP: Record<string, DetailedAssessmentPhase> = {
  'chief_complaint': 'chiefComplaint',
  'hpi_onset': 'hpiOnset',
  'hpi_location': 'hpiLocation',
  'hpi_duration': 'hpiDuration',
  'hpi_character': 'hpiCharacter',
  'hpi_severity': 'hpiSeverity',
  'hpi_aggravating': 'hpiAggravating',
  'hpi_relieving': 'hpiRelieving',
  'hpi_associated': 'hpiAssociated',
  'review_of_systems': 'reviewOfSystems',
  'medical_history': 'medicalHistory',
  'social_history': 'socialHistory',
  'family_history': 'familyHistory',
};

/**
 * @deprecated Use phase directly
 * Converts legacy snake_case phase to camelCase
 */
export function normalizePhaseName(phase: string): DetailedAssessmentPhase {
  return LEGACY_PHASE_MAP[phase] || (phase as DetailedAssessmentPhase);
}
