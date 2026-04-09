// =============================================================================
// ATTENDING AI - AI Model Registry
// packages/ai-governance/src/governance/ModelRegistry.ts
//
// Tracks AI model versions, deployment status, and validation data
// Required for DiMe Seal clinical evidence and NIST AI RMF compliance
// =============================================================================

// =============================================================================
// Model Registry Types
// =============================================================================

export interface AIModel {
  id: string;
  name: string;
  version: string;
  provider: 'anthropic' | 'local' | 'azure' | 'biomistral';
  capabilities: ModelCapability[];
  deployedAt: Date;
  retiredAt?: Date;
  status: 'active' | 'deprecated' | 'retired' | 'testing';

  // Validation
  validationMetrics?: ValidationMetrics;
  biasAssessment?: BiasAssessment;
  safetyRecord?: SafetyRecord;

  // Governance
  approvedBy?: string;
  approvalDate?: Date;
  reviewSchedule?: string; // e.g., "quarterly"
  dataRetentionPolicy?: string;
}

export type ModelCapability =
  | 'clinical-decision-support'
  | 'differential-diagnosis'
  | 'medication-review'
  | 'lab-interpretation'
  | 'imaging-analysis'
  | 'ambient-scribe'
  | 'patient-education'
  | 'triage-assessment'
  | 'care-gap-detection'
  | 'risk-prediction';

export interface ValidationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  areaUnderCurve?: number;
  testDatasetSize: number;
  testDate: Date;
  validationMethod: string; // e.g., "retrospective cohort", "prospective pilot"
}

export interface BiasAssessment {
  assessmentDate: Date;
  demographics: {
    category: string; // e.g., "age", "sex", "race/ethnicity"
    groups: Array<{
      group: string;
      sampleSize: number;
      performanceMetric: number;
    }>;
    maxDisparity: number; // Largest performance gap between groups
  }[];
  overallEquityScore: number; // 0-1
  mitigationActions?: string[];
}

export interface SafetyRecord {
  totalPredictions: number;
  adverseEvents: number;
  adverseEventRate: number;
  lastAdverseEvent?: Date;
  safetyReviewDate: Date;
  falsePositiveRate?: number;
  falseNegativeRate?: number;
  // Critical safety: false negatives for emergency conditions
  emergencyMissRate?: number;
}

// =============================================================================
// Model Registry
// =============================================================================

export class ModelRegistry {
  private models: Map<string, AIModel> = new Map();

  /**
   * Register a new AI model.
   */
  register(model: AIModel): void {
    const key = `${model.name}:${model.version}`;
    this.models.set(key, model);
  }

  /**
   * Get the currently active version of a model.
   */
  getActive(name: string): AIModel | null {
    for (const model of this.models.values()) {
      if (model.name === name && model.status === 'active') {
        return model;
      }
    }
    return null;
  }

  /**
   * Get a specific model version.
   */
  get(name: string, version: string): AIModel | null {
    return this.models.get(`${name}:${version}`) || null;
  }

  /**
   * List all registered models.
   */
  list(filter?: { status?: AIModel['status']; capability?: ModelCapability }): AIModel[] {
    let models = Array.from(this.models.values());

    if (filter?.status) {
      models = models.filter(m => m.status === filter.status);
    }
    if (filter?.capability) {
      models = models.filter(m => m.capabilities.includes(filter.capability!));
    }

    return models.sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  }

  /**
   * Retire a model version.
   */
  retire(name: string, version: string): void {
    const model = this.get(name, version);
    if (model) {
      model.status = 'retired';
      model.retiredAt = new Date();
    }
  }

  /**
   * Check if any models need safety review (based on reviewSchedule).
   */
  getModelsNeedingReview(): AIModel[] {
    const now = new Date();
    return this.list({ status: 'active' }).filter(model => {
      if (!model.reviewSchedule || !model.safetyRecord?.safetyReviewDate) return false;

      const lastReview = model.safetyRecord.safetyReviewDate;
      const daysSinceReview = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

      switch (model.reviewSchedule) {
        case 'monthly': return daysSinceReview > 30;
        case 'quarterly': return daysSinceReview > 90;
        case 'biannual': return daysSinceReview > 180;
        case 'annual': return daysSinceReview > 365;
        default: return false;
      }
    });
  }

  /**
   * Generate a model governance report for compliance documentation.
   */
  generateReport(): ModelGovernanceReport {
    const allModels = this.list();
    const activeModels = allModels.filter(m => m.status === 'active');

    return {
      reportDate: new Date(),
      totalModels: allModels.length,
      activeModels: activeModels.length,
      models: activeModels.map(m => ({
        name: m.name,
        version: m.version,
        provider: m.provider,
        capabilities: m.capabilities,
        deployedAt: m.deployedAt,
        hasValidation: !!m.validationMetrics,
        hasBiasAssessment: !!m.biasAssessment,
        hasSafetyRecord: !!m.safetyRecord,
        equityScore: m.biasAssessment?.overallEquityScore,
        adverseEventRate: m.safetyRecord?.adverseEventRate,
      })),
      needsReview: this.getModelsNeedingReview().map(m => m.name),
    };
  }
}

export interface ModelGovernanceReport {
  reportDate: Date;
  totalModels: number;
  activeModels: number;
  models: Array<{
    name: string;
    version: string;
    provider: string;
    capabilities: ModelCapability[];
    deployedAt: Date;
    hasValidation: boolean;
    hasBiasAssessment: boolean;
    hasSafetyRecord: boolean;
    equityScore?: number;
    adverseEventRate?: number;
  }>;
  needsReview: string[];
}
