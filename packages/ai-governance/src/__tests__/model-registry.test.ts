// =============================================================================
// ATTENDING AI - Model Registry Tests
// packages/ai-governance/src/__tests__/model-registry.test.ts
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry, type AIModel } from '../governance/ModelRegistry';

// =============================================================================
// Fixtures
// =============================================================================

function makeModel(overrides: Partial<AIModel> = {}): AIModel {
  return {
    id: 'model-001',
    name: 'biomistral',
    version: '2024.1.0',
    provider: 'local',
    capabilities: ['clinical-decision-support', 'differential-diagnosis'],
    deployedAt: new Date('2026-01-01'),
    status: 'active',
    approvedBy: 'dr-isbell',
    approvalDate: new Date('2025-12-15'),
    reviewSchedule: 'quarterly',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  describe('register', () => {
    it('should register a model', () => {
      const model = makeModel();
      registry.register(model);

      const found = registry.get('biomistral', '2024.1.0');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('biomistral');
    });

    it('should allow multiple versions of same model', () => {
      registry.register(makeModel({ version: '2024.1.0' }));
      registry.register(makeModel({ version: '2024.2.0' }));

      expect(registry.get('biomistral', '2024.1.0')).not.toBeNull();
      expect(registry.get('biomistral', '2024.2.0')).not.toBeNull();
    });
  });

  describe('getActive', () => {
    it('should return active model by name', () => {
      registry.register(makeModel({ status: 'active' }));
      registry.register(makeModel({ name: 'claude', version: '4.0', status: 'active', provider: 'anthropic' }));

      const active = registry.getActive('biomistral');
      expect(active).not.toBeNull();
      expect(active!.status).toBe('active');
    });

    it('should return null if no active version', () => {
      registry.register(makeModel({ status: 'retired' }));
      expect(registry.getActive('biomistral')).toBeNull();
    });

    it('should return null for non-existent model', () => {
      expect(registry.getActive('nonexistent')).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all models sorted by deployedAt desc', () => {
      registry.register(makeModel({ version: '2024.1.0', deployedAt: new Date('2024-01-01') }));
      registry.register(makeModel({ version: '2024.2.0', deployedAt: new Date('2024-06-01') }));
      registry.register(makeModel({ version: '2025.1.0', deployedAt: new Date('2025-01-01') }));

      const all = registry.list();
      expect(all).toHaveLength(3);
      expect(all[0].version).toBe('2025.1.0');
    });

    it('should filter by status', () => {
      registry.register(makeModel({ version: '1.0', status: 'active' }));
      registry.register(makeModel({ version: '0.9', status: 'retired' }));

      const active = registry.list({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].version).toBe('1.0');
    });

    it('should filter by capability', () => {
      registry.register(makeModel({ version: '1.0', capabilities: ['clinical-decision-support'] }));
      registry.register(makeModel({ version: '2.0', capabilities: ['ambient-scribe'] }));

      const cds = registry.list({ capability: 'clinical-decision-support' });
      expect(cds).toHaveLength(1);
    });
  });

  describe('retire', () => {
    it('should mark model as retired', () => {
      registry.register(makeModel());
      registry.retire('biomistral', '2024.1.0');

      const model = registry.get('biomistral', '2024.1.0');
      expect(model!.status).toBe('retired');
      expect(model!.retiredAt).toBeDefined();
    });

    it('should handle non-existent model gracefully', () => {
      // Should not throw
      registry.retire('nonexistent', '1.0');
    });
  });

  describe('getModelsNeedingReview', () => {
    it('should return models past their review schedule', () => {
      const oldReview = new Date();
      oldReview.setDate(oldReview.getDate() - 100); // 100 days ago

      registry.register(makeModel({
        reviewSchedule: 'quarterly', // 90 days
        safetyRecord: {
          totalPredictions: 1000,
          adverseEvents: 2,
          adverseEventRate: 0.002,
          safetyReviewDate: oldReview,
        },
      }));

      const needsReview = registry.getModelsNeedingReview();
      expect(needsReview).toHaveLength(1);
    });

    it('should not return models within review window', () => {
      const recentReview = new Date();
      recentReview.setDate(recentReview.getDate() - 30); // 30 days ago

      registry.register(makeModel({
        reviewSchedule: 'quarterly', // 90 days
        safetyRecord: {
          totalPredictions: 1000,
          adverseEvents: 2,
          adverseEventRate: 0.002,
          safetyReviewDate: recentReview,
        },
      }));

      const needsReview = registry.getModelsNeedingReview();
      expect(needsReview).toHaveLength(0);
    });

    it('should not include retired models', () => {
      const oldReview = new Date();
      oldReview.setDate(oldReview.getDate() - 400);

      registry.register(makeModel({
        status: 'retired',
        reviewSchedule: 'annual',
        safetyRecord: {
          totalPredictions: 500,
          adverseEvents: 1,
          adverseEventRate: 0.002,
          safetyReviewDate: oldReview,
        },
      }));

      expect(registry.getModelsNeedingReview()).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate governance report for active models', () => {
      registry.register(makeModel({
        validationMetrics: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.91,
          f1Score: 0.90,
          testDatasetSize: 5000,
          testDate: new Date(),
          validationMethod: 'retrospective cohort',
        },
        biasAssessment: {
          assessmentDate: new Date(),
          demographics: [],
          overallEquityScore: 0.88,
        },
        safetyRecord: {
          totalPredictions: 10000,
          adverseEvents: 5,
          adverseEventRate: 0.0005,
          safetyReviewDate: new Date(),
        },
      }));

      registry.register(makeModel({ name: 'old-model', version: '0.1', status: 'retired' }));

      const report = registry.generateReport();

      expect(report.totalModels).toBe(2);
      expect(report.activeModels).toBe(1);
      expect(report.models).toHaveLength(1);
      expect(report.models[0].hasValidation).toBe(true);
      expect(report.models[0].hasBiasAssessment).toBe(true);
      expect(report.models[0].hasSafetyRecord).toBe(true);
      expect(report.models[0].equityScore).toBe(0.88);
      expect(report.reportDate).toBeDefined();
    });

    it('should handle empty registry', () => {
      const report = registry.generateReport();
      expect(report.totalModels).toBe(0);
      expect(report.activeModels).toBe(0);
      expect(report.models).toEqual([]);
    });
  });
});
