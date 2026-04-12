// =============================================================================
// ATTENDING AI - Text-Based Red Flag Evaluator
// apps/shared/lib/clinical-ai/redFlagTextEvaluator.ts
//
// Lightweight evaluator that runs the canonical RED_FLAGS against plain text
// (chat messages, symptom descriptions). No PatientContext or structured
// ClinicalAssessment required — this is the offline-first pathway.
//
// Tier 0: Zero network dependency. Hardcoded rules at build time.
// Safety invariant: NEVER returns empty. Always evaluates all rules.
// =============================================================================

import {
  RED_FLAGS,
  RED_FLAG_RULES_VERSION,
  expandWithSynonyms,
  extractKeywords,
  type RedFlagSeverity,
} from './redFlagDetection';

// =============================================================================
// Types
// =============================================================================

export interface TextRedFlagMatch {
  id: string;
  name: string;
  severity: RedFlagSeverity;
  category: string;
  matchedPatterns: string[];
  confidence: number;
  recommendedAction: string;
  timeframe: string;
  icdCodes: string[];
}

export interface TextRedFlagResult {
  hasRedFlags: boolean;
  flags: TextRedFlagMatch[];
  overallSeverity: RedFlagSeverity | null;
  rulesVersion: string;
  rulesCount: number;
  evaluatedAt: string;
}

// =============================================================================
// Main Evaluator
// =============================================================================

/**
 * Evaluate plain text for red flags using the canonical rule set.
 *
 * This function is designed to run anywhere — browser, server, React Native,
 * service worker. Zero dependencies on network, DOM, or Node.js APIs.
 *
 * @param text - The text to evaluate (chat message, symptom description, etc.)
 * @returns Detection result with matched flags sorted by severity
 */
export function evaluateTextForRedFlags(text: string): TextRedFlagResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      hasRedFlags: false,
      flags: [],
      overallSeverity: null,
      rulesVersion: RED_FLAG_RULES_VERSION,
      rulesCount: RED_FLAGS.length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const normalizedText = text.toLowerCase().trim();
  const expandedText = expandWithSynonyms(normalizedText);
  const flags: TextRedFlagMatch[] = [];

  // ==========================================================================
  // FALSE POSITIVE PREVENTION
  // ==========================================================================

  const hasMildPrefix = expandedText.includes('mild ') || expandedText.includes('minor ');
  const hasSevereIndicators =
    expandedText.includes('severe') ||
    expandedText.includes('sudden') ||
    expandedText.includes('crushing') ||
    expandedText.includes('radiating') ||
    expandedText.includes('worst') ||
    expandedText.includes('10/10') ||
    expandedText.includes('unbearable') ||
    expandedText.includes('thunderclap') ||
    expandedText.includes('tearing');

  const commonColdPattern = /\b(runny nose|nasal congestion|sneezing|common cold)\b/i;
  const isLikelyCommonCold =
    commonColdPattern.test(expandedText) && hasMildPrefix && !hasSevereIndicators;

  const chronicPatterns =
    /\b(for \d+ months?|for \d+ years?|chronic|stable|unchanged|reproducible|positional)\b/i;
  const isChronicPresentation = chronicPatterns.test(expandedText);

  // ==========================================================================
  // Evaluate each red flag
  // ==========================================================================

  for (const redFlag of RED_FLAGS) {
    // Skip critical red flags for clearly benign presentations
    if (redFlag.severity === 'critical' && isLikelyCommonCold) continue;
    if (redFlag.severity === 'critical' && hasMildPrefix && !hasSevereIndicators) continue;

    const matchedPatterns: string[] = [];
    let totalScore = 0;

    for (const criterion of redFlag.triggerCriteria) {
      const criterionLower = criterion.toLowerCase();
      const expandedCriterion = expandWithSynonyms(criterionLower);
      const keywords = extractKeywords(expandedCriterion);

      // Check for single medical term matches
      if (checkSingleTermMatch(criterionLower, expandedText)) {
        matchedPatterns.push(criterion);
        totalScore += 1;
        continue;
      }

      // Keyword matching
      const keywordMatches = keywords.filter(
        (kw) => expandedText.includes(kw) || normalizedText.includes(kw)
      );

      if (keywords.length <= 3) {
        if (keywordMatches.length === keywords.length) {
          matchedPatterns.push(criterion);
          totalScore += 1;
        }
      } else if (keywordMatches.length >= Math.ceil(keywords.length * 0.6)) {
        matchedPatterns.push(criterion);
        totalScore += 1;
      }
    }

    // Minimum match threshold
    const minMatches = redFlag.severity === 'critical' ? 1 : 2;
    if (matchedPatterns.length < minMatches) continue;

    // Confidence scoring
    let confidence = Math.min(0.95, 0.5 + totalScore * 0.15);
    if (isChronicPresentation) confidence *= 0.5;
    if (confidence < 0.3) continue;

    flags.push({
      id: redFlag.id,
      name: redFlag.name,
      severity: redFlag.severity,
      category: redFlag.category,
      matchedPatterns,
      confidence,
      recommendedAction: redFlag.recommendedAction,
      timeframe: redFlag.timeframe,
      icdCodes: redFlag.icdCodes,
    });
  }

  // Sort by severity then confidence
  const severityOrder: Record<RedFlagSeverity, number> = { critical: 0, high: 1, moderate: 2 };
  flags.sort((a, b) => {
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    return diff !== 0 ? diff : b.confidence - a.confidence;
  });

  return {
    hasRedFlags: flags.length > 0,
    flags,
    overallSeverity: flags.length > 0 ? flags[0].severity : null,
    rulesVersion: RED_FLAG_RULES_VERSION,
    rulesCount: RED_FLAGS.length,
    evaluatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Helpers
// =============================================================================

const SINGLE_TERM_TRIGGERS = [
  {
    criterion: 'hematemesis',
    patterns: ['hematemesis', 'vomiting blood', 'bloody vomit', 'vomit blood'],
  },
  {
    criterion: 'melena',
    patterns: ['melena', 'black tarry', 'tarry stool', 'black stool'],
  },
  {
    criterion: 'hemoptysis',
    patterns: ['hemoptysis', 'coughing blood', 'bloody sputum', 'cough blood', 'coughing up blood'],
  },
  {
    criterion: 'syncope',
    patterns: ['syncope', 'passed out', 'loss of consciousness', 'blacked out'],
  },
  {
    criterion: 'seizure',
    patterns: ['seizure', 'convulsion', 'convulsions', 'seizing', 'convulsing'],
  },
  {
    criterion: 'anaphylaxis',
    patterns: ['anaphylaxis', 'anaphylactic'],
  },
  {
    criterion: 'pneumothorax',
    patterns: ['pneumothorax', 'collapsed lung', 'tension pneumo'],
  },
  {
    criterion: 'dissection',
    patterns: ['aortic dissection', 'tearing chest pain', 'ripping pain'],
  },
  {
    criterion: 'suicidal',
    patterns: ['suicidal', 'want to die', 'kill myself', 'end my life', 'suicide'],
  },
  {
    criterion: 'chest pain',
    patterns: ['chest pain', 'chest tightness', 'pressure in chest', 'chest pressure'],
  },
  {
    criterion: 'headache',
    patterns: ['worst headache', 'thunderclap headache', 'thunderclap', 'sudden severe headache'],
  },
  {
    criterion: 'bleeding',
    patterns: ['bleeding heavily', 'hemorrhage', 'can\'t stop bleeding', 'uncontrolled bleeding'],
  },
  {
    criterion: 'vision',
    patterns: ['vision loss', 'sudden blindness', 'can\'t see', 'sudden vision loss', 'lost vision'],
  },
  {
    criterion: 'pain',
    patterns: ['worst pain', 'excruciating pain', 'pain 10/10', 'unbearable pain'],
  },
];

function checkSingleTermMatch(criterion: string, expandedText: string): boolean {
  const criterionLower = criterion.toLowerCase();

  for (const trigger of SINGLE_TERM_TRIGGERS) {
    // Check if this criterion relates to this trigger
    const related =
      criterionLower.includes(trigger.criterion) ||
      trigger.criterion.includes(criterionLower.split(' ')[0]);

    if (!related) continue;

    for (const pattern of trigger.patterns) {
      if (expandedText.includes(pattern)) {
        return true;
      }
    }
  }

  // Also check if any trigger pattern appears in both the criterion and the text
  // This catches cases like "chest pain" appearing in a criterion about chest pain
  for (const trigger of SINGLE_TERM_TRIGGERS) {
    const criterionHasPattern = trigger.patterns.some(p => criterionLower.includes(p));
    if (!criterionHasPattern) continue;

    for (const pattern of trigger.patterns) {
      if (expandedText.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}
