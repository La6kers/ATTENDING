// =============================================================================
// ATTENDING AI - AI Recommendation Logger Tests
// packages/ai-governance/src/__tests__/ai-recommendation-log.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIRecommendationLogger, type AIAuditStorage, type ReviewUpdate } from '../audit/AIRecommendationLog';

// =============================================================================
// Mock Storage
// =============================================================================

function createMockAuditStorage(): AIAuditStorage {
  return {
    store: vi.fn(async () => {}),
    getByConversation: vi.fn(async () => []),
    getByEncounter: vi.fn(async () => []),
    getPendingReviews: vi.fn(async () => []),
    updateReview: vi.fn(async () => {}),
    getMetrics: vi.fn(async () => ({
      totalRecommendations: 0,
      byType: {} as any,
      byClassification: {} as any,
      reviewMetrics: { pending: 0, approved: 0, flagged: 0, rejected: 0, avgReviewTimeMs: 0 },
      safetyMetrics: { totalSafetyFlags: 0, byFlag: {}, highHarmCount: 0 },
      acceptanceRate: 0,
      avgConfidenceScore: 0,
    })),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AIRecommendationLogger', () => {
  let storage: AIAuditStorage;
  let logger: AIRecommendationLogger;

  beforeEach(() => {
    storage = createMockAuditStorage();
    logger = new AIRecommendationLogger(storage, 'biomistral', '2024.1.0');
  });

  describe('log', () => {
    it('should create audit entry with default model info', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        patientId: 'patient-1',
        contentClassification: 'clinical-guidance',
        confidenceScore: 0.85,
        recommendationType: 'differential-diagnosis',
        recommendationSummary: 'Suggested differential: Type 2 DM',
      });

      expect(entry.id).toMatch(/^ai-audit-/);
      expect(entry.modelName).toBe('biomistral');
      expect(entry.modelVersion).toBe('2024.1.0');
      expect(entry.organizationId).toBe('org-1');
      expect(entry.contentClassification).toBe('clinical-guidance');
      expect(entry.confidenceScore).toBe(0.85);
      expect(storage.store).toHaveBeenCalledTimes(1);
    });

    it('should auto-approve educational content', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'educational',
        confidenceScore: 0.9,
        recommendationType: 'patient-education',
        recommendationSummary: 'General info about diabetes',
      });

      expect(entry.reviewStatus).toBe('auto-approved');
    });

    it('should set pending review for clinical guidance', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'clinical-guidance',
        confidenceScore: 0.75,
        recommendationType: 'medication-suggestion',
        recommendationSummary: 'Consider adding metformin',
      });

      expect(entry.reviewStatus).toBe('pending');
    });

    it('should use override model name when provided', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'clinical-guidance',
        confidenceScore: 0.9,
        recommendationType: 'lab-recommendation',
        recommendationSummary: 'Order HbA1c',
        modelName: 'claude-sonnet',
        modelVersion: '4.0',
      });

      expect(entry.modelName).toBe('claude-sonnet');
      expect(entry.modelVersion).toBe('4.0');
    });

    it('should include safety flags when provided', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'clinical-guidance',
        confidenceScore: 0.7,
        recommendationType: 'medication-suggestion',
        recommendationSummary: 'Drug interaction detected',
        safetyFlags: ['drug-interaction', 'red-flag'],
        harmPotential: 'high',
      });

      expect(entry.safetyFlags).toEqual(['drug-interaction', 'red-flag']);
      expect(entry.harmPotential).toBe('high');
    });

    it('should default safety fields when not provided', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'informational',
        confidenceScore: 0.5,
        recommendationType: 'care-gap-alert',
        recommendationSummary: 'Test',
      });

      expect(entry.safetyFlags).toEqual([]);
      expect(entry.harmPotential).toBe('none');
    });

    it('should include clinical codes when provided', async () => {
      const entry = await logger.log({
        organizationId: 'org-1',
        contentClassification: 'clinical-guidance',
        confidenceScore: 0.8,
        recommendationType: 'differential-diagnosis',
        recommendationSummary: 'Possible Type 2 DM',
        icdCodes: ['E11.9'],
        snomedCodes: ['44054006'],
        loincCodes: ['4548-4'],
      });

      expect(entry.icdCodes).toEqual(['E11.9']);
      expect(entry.snomedCodes).toEqual(['44054006']);
      expect(entry.loincCodes).toEqual(['4548-4']);
    });
  });

  describe('submitReview', () => {
    it('should forward review to storage', async () => {
      const review: ReviewUpdate = {
        reviewStatus: 'approved',
        reviewedBy: 'dr-smith',
        reviewAction: 'accepted',
        reviewNotes: 'Appropriate recommendation',
      };

      await logger.submitReview('ai-audit-123', review);

      expect(storage.updateReview).toHaveBeenCalledWith('ai-audit-123', expect.objectContaining({
        reviewStatus: 'approved',
        reviewedBy: 'dr-smith',
      }));
    });
  });

  describe('getPendingReviews', () => {
    it('should delegate to storage', async () => {
      await logger.getPendingReviews('org-1');
      expect(storage.getPendingReviews).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getMetrics', () => {
    it('should delegate to storage with period', async () => {
      const period = { start: new Date('2026-01-01'), end: new Date('2026-04-01') };
      await logger.getMetrics('org-1', period);
      expect(storage.getMetrics).toHaveBeenCalledWith('org-1', period);
    });
  });
});
