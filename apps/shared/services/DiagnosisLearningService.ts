// DiagnosisLearningService.ts
// Tracks which AI-suggested diagnoses providers actually select,
// building a feedback loop that tunes confidence scores over time.

const LEARNING_STORAGE_KEY = 'attending_diagnosis_learning_feedback';
const LEARNING_RATE = 0.1;
const MIN_SAMPLE_SIZE = 10;
const MAX_ADJUSTMENT = 0.15;
const SIGNIFICANT_GAP = 0.15;

export interface DiagnosisFeedback {
  complaintCategory: string;    // 'headache', 'chest_pain', etc.
  diagnosisName: string;
  icdCode: string;
  aiConfidence: number;         // what AI suggested
  providerSelected: boolean;    // did provider accept it
  timestamp: string;
}

export interface ConfidenceAdjustment {
  diagnosisName: string;
  complaintCategory: string;
  originalConfidence: number;
  adjustedConfidence: number;
  sampleSize: number;
  acceptanceRate: number;
}

interface FeedbackAggregate {
  totalCount: number;
  acceptedCount: number;
  aiConfidenceSum: number;
}

export class DiagnosisLearningService {
  private feedbackBuffer: DiagnosisFeedback[] = [];
  /** Map keyed by "complaintCategory::diagnosisName" */
  private aggregates: Map<string, FeedbackAggregate> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  private makeKey(category: string, diagnosis: string): string {
    return `${category}::${diagnosis}`;
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as {
        feedbackBuffer: DiagnosisFeedback[];
        aggregates: Array<[string, FeedbackAggregate]>;
      };

      this.feedbackBuffer = data.feedbackBuffer ?? [];
      this.aggregates = new Map(data.aggregates ?? []);
    } catch {
      // Corrupted storage – start fresh
      this.feedbackBuffer = [];
      this.aggregates = new Map();
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const data = {
        feedbackBuffer: this.feedbackBuffer,
        aggregates: Array.from(this.aggregates.entries()),
      };
      localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable – silently ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Record a feedback event (called when provider confirms/rejects diagnoses).
   */
  recordFeedback(feedback: DiagnosisFeedback): void {
    this.feedbackBuffer.push(feedback);

    const key = this.makeKey(feedback.complaintCategory, feedback.diagnosisName);
    const existing = this.aggregates.get(key) ?? {
      totalCount: 0,
      acceptedCount: 0,
      aiConfidenceSum: 0,
    };

    existing.totalCount += 1;
    existing.acceptedCount += feedback.providerSelected ? 1 : 0;
    existing.aiConfidenceSum += feedback.aiConfidence;

    this.aggregates.set(key, existing);
    this.saveToStorage();
  }

  /**
   * Get confidence adjustment for a diagnosis based on historical feedback.
   *
   * Uses a simple Bayesian-inspired update:
   *  1. Compute acceptance rate for (complaintCategory, diagnosisName).
   *  2. Compute average AI confidence for the same pair.
   *  3. If the gap between acceptance rate and AI confidence exceeds 15%,
   *     produce an adjustment = (acceptanceRate - aiAvgConfidence) * LEARNING_RATE.
   *  4. Only apply when sampleSize >= MIN_SAMPLE_SIZE.
   *  5. Cap at +/- MAX_ADJUSTMENT.
   *
   * Returns the adjustment value (positive = AI was under-confident,
   * negative = AI was over-confident). Returns 0 when insufficient data.
   */
  getConfidenceAdjustment(complaintCategory: string, diagnosisName: string): number {
    const key = this.makeKey(complaintCategory, diagnosisName);
    const agg = this.aggregates.get(key);

    if (!agg || agg.totalCount < MIN_SAMPLE_SIZE) {
      return 0;
    }

    const acceptanceRate = agg.acceptedCount / agg.totalCount;
    const aiAvgConfidence = agg.aiConfidenceSum / agg.totalCount;
    const gap = acceptanceRate - aiAvgConfidence;

    if (Math.abs(gap) < SIGNIFICANT_GAP) {
      return 0;
    }

    const rawAdjustment = gap * LEARNING_RATE;
    return Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, rawAdjustment));
  }

  /**
   * Get all adjustments for a complaint category.
   */
  getAdjustmentsForCategory(complaintCategory: string): ConfidenceAdjustment[] {
    const results: ConfidenceAdjustment[] = [];

    for (const [key, agg] of this.aggregates.entries()) {
      const [category, diagnosisName] = key.split('::');
      if (category !== complaintCategory) continue;

      const acceptanceRate = agg.acceptedCount / agg.totalCount;
      const aiAvgConfidence = agg.aiConfidenceSum / agg.totalCount;
      const adjustment = this.getConfidenceAdjustment(category, diagnosisName);

      results.push({
        diagnosisName,
        complaintCategory: category,
        originalConfidence: aiAvgConfidence,
        adjustedConfidence: Math.max(0, Math.min(1, aiAvgConfidence + adjustment)),
        sampleSize: agg.totalCount,
        acceptanceRate,
      });
    }

    return results;
  }

  /**
   * Get learning stats across all tracked categories and diagnoses.
   */
  getLearningStats(): {
    totalFeedback: number;
    categoriesTracked: number;
    diagnosesTracked: number;
    averageAcceptanceRate: number;
    topOverconfidentDiagnoses: Array<{ name: string; aiAvgConfidence: number; acceptanceRate: number }>;
    topUnderconfidentDiagnoses: Array<{ name: string; aiAvgConfidence: number; acceptanceRate: number }>;
  } {
    const categories = new Set<string>();
    const diagnoses = new Set<string>();
    let totalAccepted = 0;
    let totalCount = 0;

    interface GapEntry {
      name: string;
      aiAvgConfidence: number;
      acceptanceRate: number;
      gap: number; // acceptanceRate - aiAvgConfidence
    }

    const gapEntries: GapEntry[] = [];

    for (const [key, agg] of this.aggregates.entries()) {
      const [category, diagnosisName] = key.split('::');
      categories.add(category);
      diagnoses.add(diagnosisName);
      totalAccepted += agg.acceptedCount;
      totalCount += agg.totalCount;

      const acceptanceRate = agg.acceptedCount / agg.totalCount;
      const aiAvgConfidence = agg.aiConfidenceSum / agg.totalCount;

      gapEntries.push({
        name: diagnosisName,
        aiAvgConfidence,
        acceptanceRate,
        gap: acceptanceRate - aiAvgConfidence,
      });
    }

    // Over-confident: AI confidence much higher than acceptance (negative gap)
    const overconfident = gapEntries
      .filter((e) => e.gap < 0)
      .sort((a, b) => a.gap - b.gap) // most negative first
      .slice(0, 5)
      .map(({ name, aiAvgConfidence, acceptanceRate }) => ({
        name,
        aiAvgConfidence: Math.round(aiAvgConfidence * 1000) / 1000,
        acceptanceRate: Math.round(acceptanceRate * 1000) / 1000,
      }));

    // Under-confident: AI confidence much lower than acceptance (positive gap)
    const underconfident = gapEntries
      .filter((e) => e.gap > 0)
      .sort((a, b) => b.gap - a.gap) // most positive first
      .slice(0, 5)
      .map(({ name, aiAvgConfidence, acceptanceRate }) => ({
        name,
        aiAvgConfidence: Math.round(aiAvgConfidence * 1000) / 1000,
        acceptanceRate: Math.round(acceptanceRate * 1000) / 1000,
      }));

    return {
      totalFeedback: totalCount,
      categoriesTracked: categories.size,
      diagnosesTracked: diagnoses.size,
      averageAcceptanceRate: totalCount > 0 ? Math.round((totalAccepted / totalCount) * 1000) / 1000 : 0,
      topOverconfidentDiagnoses: overconfident,
      topUnderconfidentDiagnoses: underconfident,
    };
  }

  /**
   * Flush feedback buffer to persistent storage.
   */
  async flush(): Promise<void> {
    this.saveToStorage();
  }
}

// Singleton instance
const diagnosisLearningService = new DiagnosisLearningService();
export default diagnosisLearningService;
