// =============================================================================
// ATTENDING AI - Content Classification
// packages/ai-governance/src/classification/ContentClassifier.ts
//
// Classifies AI output as clinical guidance vs educational content
// CMS HTE requires clear separation between these content types
// =============================================================================

// =============================================================================
// Content Classification
// =============================================================================

export type ContentClassification =
  | 'clinical-guidance'    // Personalized clinical recommendations (requires clinician review)
  | 'educational'          // General health information
  | 'informational'        // System/app information
  | 'emergency'            // Emergency detection
  | 'administrative';      // Scheduling, logistics

export interface ClassificationResult {
  classification: ContentClassification;
  confidence: number; // 0-1
  requiresClinicianReview: boolean;
  reasoning: string;
  signals: ClassificationSignal[];
}

export interface ClassificationSignal {
  type: 'keyword' | 'context' | 'pattern';
  signal: string;
  weight: number;
}

// =============================================================================
// Content Classifier
// =============================================================================

export class ContentClassifier {
  private clinicalSignals: string[];
  private emergencySignals: string[];
  private educationalSignals: string[];

  constructor() {
    this.clinicalSignals = [
      'diagnos', 'prescri', 'treatment', 'medication', 'dosage',
      'differential', 'prognosis', 'contraindic', 'recommend',
      'lab result', 'vital sign', 'clinical finding', 'assessment',
      'should consider', 'may indicate', 'consistent with',
      'rule out', 'work up', 'order', 'referral',
    ];

    this.emergencySignals = [
      'emergency', '911', 'chest pain', 'stroke', 'seizure',
      'anaphylaxis', 'suicid', 'self-harm', 'homicid',
      'severe bleeding', 'unconscious', 'not breathing',
      'overdose', 'poisoning',
    ];

    this.educationalSignals = [
      'in general', 'typically', 'usually', 'common causes',
      'overview of', 'what is', 'how does', 'general information',
      'learn more', 'health tip', 'prevention',
      'studies show', 'research suggests',
    ];
  }

  /**
   * Classify AI-generated content.
   */
  classify(content: string, context?: ClassificationContext): ClassificationResult {
    const lowerContent = content.toLowerCase();
    const signals: ClassificationSignal[] = [];

    // Check emergency signals first (highest priority)
    const emergencyScore = this.scoreSignals(lowerContent, this.emergencySignals, signals, 'emergency');
    if (emergencyScore > 0.3) {
      return {
        classification: 'emergency',
        confidence: Math.min(emergencyScore + 0.3, 1),
        requiresClinicianReview: true,
        reasoning: 'Content contains emergency-related language',
        signals,
      };
    }

    // Score clinical vs educational
    const clinicalScore = this.scoreSignals(lowerContent, this.clinicalSignals, signals, 'clinical');
    const educationalScore = this.scoreSignals(lowerContent, this.educationalSignals, signals, 'educational');

    // Context boosts
    let contextBoost = 0;
    if (context?.hasPatientData) contextBoost += 0.2;
    if (context?.hasLabResults) contextBoost += 0.15;
    if (context?.hasMedications) contextBoost += 0.15;
    if (context?.isProviderFacing) contextBoost += 0.1;

    const adjustedClinicalScore = clinicalScore + contextBoost;

    // Classify based on scores
    if (adjustedClinicalScore > educationalScore && adjustedClinicalScore > 0.2) {
      return {
        classification: 'clinical-guidance',
        confidence: Math.min(adjustedClinicalScore, 1),
        requiresClinicianReview: true,
        reasoning: 'Content contains clinical guidance based on patient-specific data',
        signals,
      };
    }

    if (educationalScore > 0.2) {
      return {
        classification: 'educational',
        confidence: Math.min(educationalScore, 1),
        requiresClinicianReview: false,
        reasoning: 'Content provides general health education',
        signals,
      };
    }

    return {
      classification: 'informational',
      confidence: 0.5,
      requiresClinicianReview: false,
      reasoning: 'Content is general information',
      signals,
    };
  }

  private scoreSignals(
    content: string,
    keywords: string[],
    signals: ClassificationSignal[],
    category: string,
  ): number {
    let score = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        const weight = 1 / keywords.length;
        score += weight;
        signals.push({
          type: 'keyword',
          signal: `${category}:${keyword}`,
          weight,
        });
      }
    }
    return Math.min(score * 2, 1); // Scale up since not all keywords will match
  }
}

// =============================================================================
// Classification Context
// =============================================================================

export interface ClassificationContext {
  hasPatientData?: boolean;
  hasLabResults?: boolean;
  hasMedications?: boolean;
  isProviderFacing?: boolean;
  isPatientFacing?: boolean;
  encounterContext?: boolean;
}
