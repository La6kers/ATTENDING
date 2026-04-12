// =============================================================================
// ATTENDING AI - AI Recommendation Audit Log
// packages/ai-governance/src/audit/AIRecommendationLog.ts
//
// Immutable audit trail for all AI-generated recommendations
// CMS HTE requires human oversight and traceability
// =============================================================================

import type { ContentClassification } from '../classification/ContentClassifier';

// =============================================================================
// Audit Entry Types
// =============================================================================

export interface AIRecommendationEntry {
  id: string;
  timestamp: Date;
  organizationId: string;

  // Who/what
  patientId?: string;
  encounterId?: string;
  providerId?: string;
  conversationId?: string;

  // AI Model Info
  modelName: string;        // e.g., "biomistral", "claude-sonnet-4"
  modelVersion: string;     // e.g., "2024.1.0"
  promptHash?: string;      // Hash of the prompt (no PHI)

  // Output Classification
  contentClassification: ContentClassification;
  confidenceScore: number;  // 0-1

  // Clinical Content (no PHI — only clinical pattern metadata)
  recommendationType: RecommendationType;
  recommendationSummary: string;    // e.g., "Suggested differential: Type 2 DM"
  icdCodes?: string[];              // Referenced ICD codes
  snomedCodes?: string[];           // Referenced SNOMED codes
  loincCodes?: string[];            // Referenced LOINC codes

  // Review Status
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewAction?: ReviewAction;
  reviewNotes?: string;

  // Safety
  safetyFlags: string[];           // e.g., ["drug-interaction", "red-flag"]
  harmPotential: 'none' | 'low' | 'medium' | 'high';
}

export type RecommendationType =
  | 'differential-diagnosis'
  | 'medication-suggestion'
  | 'lab-recommendation'
  | 'imaging-recommendation'
  | 'referral-suggestion'
  | 'care-gap-alert'
  | 'clinical-pathway'
  | 'patient-education'
  | 'triage-assessment'
  | 'risk-alert';

export type ReviewStatus = 'pending' | 'approved' | 'flagged' | 'rejected' | 'auto-approved';
export type ReviewAction = 'accepted' | 'modified' | 'rejected' | 'escalated';

// =============================================================================
// AI Recommendation Logger
// =============================================================================

export interface AIAuditStorage {
  store(entry: AIRecommendationEntry): Promise<void>;
  getByConversation(conversationId: string): Promise<AIRecommendationEntry[]>;
  getByEncounter(encounterId: string): Promise<AIRecommendationEntry[]>;
  getPendingReviews(organizationId: string): Promise<AIRecommendationEntry[]>;
  updateReview(id: string, review: ReviewUpdate): Promise<void>;
  getMetrics(organizationId: string, period: { start: Date; end: Date }): Promise<AIAuditMetrics>;
}

export interface ReviewUpdate {
  reviewStatus: ReviewStatus;
  reviewedBy: string;
  reviewAction?: ReviewAction;
  reviewNotes?: string;
}

export class AIRecommendationLogger {
  private storage: AIAuditStorage;
  private defaultModelName: string;
  private defaultModelVersion: string;

  constructor(storage: AIAuditStorage, modelName: string, modelVersion: string) {
    this.storage = storage;
    this.defaultModelName = modelName;
    this.defaultModelVersion = modelVersion;
  }

  /**
   * Log an AI recommendation with full audit trail.
   */
  async log(params: {
    organizationId: string;
    patientId?: string;
    encounterId?: string;
    providerId?: string;
    conversationId?: string;
    contentClassification: ContentClassification;
    confidenceScore: number;
    recommendationType: RecommendationType;
    recommendationSummary: string;
    icdCodes?: string[];
    snomedCodes?: string[];
    loincCodes?: string[];
    safetyFlags?: string[];
    harmPotential?: 'none' | 'low' | 'medium' | 'high';
    modelName?: string;
    modelVersion?: string;
  }): Promise<AIRecommendationEntry> {
    const entry: AIRecommendationEntry = {
      id: generateAuditId(),
      timestamp: new Date(),
      organizationId: params.organizationId,
      patientId: params.patientId,
      encounterId: params.encounterId,
      providerId: params.providerId,
      conversationId: params.conversationId,
      modelName: params.modelName || this.defaultModelName,
      modelVersion: params.modelVersion || this.defaultModelVersion,
      contentClassification: params.contentClassification,
      confidenceScore: params.confidenceScore,
      recommendationType: params.recommendationType,
      recommendationSummary: params.recommendationSummary,
      icdCodes: params.icdCodes,
      snomedCodes: params.snomedCodes,
      loincCodes: params.loincCodes,
      // Auto-approve low-risk educational content; require review for clinical
      reviewStatus: params.contentClassification === 'clinical-guidance' ? 'pending' : 'auto-approved',
      safetyFlags: params.safetyFlags || [],
      harmPotential: params.harmPotential || 'none',
    };

    await this.storage.store(entry);
    return entry;
  }

  /**
   * Submit a clinician review for an AI recommendation.
   */
  async submitReview(entryId: string, review: ReviewUpdate): Promise<void> {
    await this.storage.updateReview(entryId, {
      ...review,
      reviewStatus: review.reviewStatus,
    });
  }

  /**
   * Get all recommendations pending clinician review.
   */
  async getPendingReviews(organizationId: string): Promise<AIRecommendationEntry[]> {
    return this.storage.getPendingReviews(organizationId);
  }

  /**
   * Get AI performance metrics for reporting.
   */
  async getMetrics(organizationId: string, period: { start: Date; end: Date }): Promise<AIAuditMetrics> {
    return this.storage.getMetrics(organizationId, period);
  }
}

// =============================================================================
// Metrics
// =============================================================================

export interface AIAuditMetrics {
  totalRecommendations: number;
  byType: Record<RecommendationType, number>;
  byClassification: Record<ContentClassification, number>;
  reviewMetrics: {
    pending: number;
    approved: number;
    flagged: number;
    rejected: number;
    avgReviewTimeMs: number;
  };
  safetyMetrics: {
    totalSafetyFlags: number;
    byFlag: Record<string, number>;
    highHarmCount: number;
  };
  acceptanceRate: number; // 0-1
  avgConfidenceScore: number;
}

// =============================================================================
// Helpers
// =============================================================================

function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ai-audit-${timestamp}-${random}`;
}
