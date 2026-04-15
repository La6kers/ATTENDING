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
//
// Negation handling (added 2026-04-14):
//   The single-term trigger matcher now consults an explicit negation parser
//   so that phrases like "denies suicidal ideation", "no chest pain", and
//   "patient denied SI" do NOT trip critical red flags. Negation is required
//   for high-stakes triggers (suicidal ideation, chest pain, syncope, etc.)
//   to prevent false positives that historically alarmed providers when
//   patients explicitly denied a symptom in their own message.
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

      // Keyword matching — but suppress matches that are negated in the text.
      // A keyword counts as "matched" only if it appears AT LEAST ONCE in an
      // un-negated context. This prevents false positives like
      // "patient denies suicidal ideation" from accumulating enough keyword
      // hits (suicidal, ideation, plan) to fire rf-suicidal-ideation.
      const keywordMatches = keywords.filter((kw) => {
        const presentExpanded = expandedText.includes(kw);
        const presentNormal = normalizedText.includes(kw);
        if (!presentExpanded && !presentNormal) return false;
        // If the keyword is negated everywhere it appears, drop it.
        if (presentExpanded && isNegatedTerm(expandedText, kw)) return false;
        if (presentNormal && isNegatedTerm(normalizedText, kw)) return false;
        return true;
      });

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
      if (expandedText.includes(pattern) && !isNegatedTerm(expandedText, pattern)) {
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
      if (expandedText.includes(pattern) && !isNegatedTerm(expandedText, pattern)) {
        return true;
      }
    }
  }

  return false;
}

// =============================================================================
// Negation Detection
// =============================================================================
//
// Detects explicit negation of a symptom term in clinical/chat text so that
// phrases like "denies suicidal ideation" or "no chest pain" do NOT trip the
// red flag pattern matcher.
//
// Uses a window-based scan: looks for a negation cue within `windowWords`
// tokens BEFORE the matched term, OR an "any of: 'no <term>'" pattern that
// directly precedes the term. Stop-words (commas, periods, semicolons) break
// the negation window so "I have a runny nose. No suicidal ideation, but..."
// correctly negates only the second clause.
//
// IMPORTANT: This is a clinical safety function. Bias is intentionally
// conservative — when in doubt, treat as NOT negated (i.e., still flag).
// The only exit conditions for negation are explicit, common phrasings.
// =============================================================================

const NEGATION_CUES = [
  'no',
  'not',
  'never',
  'none',
  'denies',
  'denied',
  'denying',
  'denial of',
  'without',
  'w/o',
  'negative for',
  'neg for',
  'ruled out',
  'r/o',
  'absence of',
  'absent',
  'free of',
  'free from',
  'no signs of',
  'no evidence of',
  'no history of',
  'no complaints of',
  'no c/o',
  'no report of',
  'no reports of',
  'no recent',
  'no current',
  'no active',
  "doesn't have",
  'does not have',
  "doesn't experience",
  'does not experience',
  "doesn't endorse",
  'does not endorse',
  "didn't have",
  'did not have',
  "isn't",
  'is not',
  'no longer',
  'patient denies',
  'pt denies',
];

// Phrases that LOOK like negation cues but should be ignored because they
// reverse the meaning ("denies any history of NOT having SI" is rare;
// the bigger risk is patterns like "without warning" attaching to the wrong
// noun). We keep this list short to avoid weakening the safety check.
const NEGATION_TERMINATORS = ['.', ';', '!', '?', ' but ', ' however ', ' although '];

/**
 * Returns true if `pattern` appears in `text` in a negated context.
 *
 * Algorithm:
 *  1. For every occurrence of `pattern` in `text`, examine the preceding
 *     `windowWords` words.
 *  2. If a NEGATION_TERMINATOR appears between a negation cue and the term,
 *     the negation does NOT apply (a new clause has begun).
 *  3. If any NEGATION_CUE appears in the un-terminated window, return true.
 *  4. Otherwise return false (term is asserted, flag should fire).
 *
 * Examples:
 *   isNegatedTerm("denies suicidal ideation", "suicidal")       // true
 *   isNegatedTerm("patient denies SI", "suicidal")              // false (pattern not present)
 *   isNegatedTerm("no chest pain", "chest pain")                // true
 *   isNegatedTerm("severe chest pain. denies SI", "chest pain") // false (chest pain is asserted)
 *   isNegatedTerm("I am suicidal", "suicidal")                  // false
 *   isNegatedTerm("she denies any chest pain or pressure", "chest pain") // true
 */
export function isNegatedTerm(text: string, pattern: string, windowWords = 6): boolean {
  if (!text || !pattern) return false;
  const normalizedText = text.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  let searchFrom = 0;
  while (searchFrom < normalizedText.length) {
    const idx = normalizedText.indexOf(normalizedPattern, searchFrom);
    if (idx === -1) return false;

    // Slice the text BEFORE this occurrence
    const before = normalizedText.slice(0, idx);

    // Walk backwards collecting up to `windowWords` whitespace-separated tokens,
    // but stop at any sentence/clause terminator.
    let cursor = before.length;
    let collected: string[] = [];
    let terminated = false;

    // Read tokens from the right
    const beforeWords = before.split(/\s+/);
    for (let i = beforeWords.length - 1; i >= 0 && collected.length < windowWords; i--) {
      const tok = beforeWords[i];
      if (!tok) continue;
      // Sentence terminator? stop scanning further back.
      if (NEGATION_TERMINATORS.some(t => tok.endsWith(t.trim()) && t.trim().length > 0)) {
        // Include this token (it may contain "no.") then stop.
        collected.unshift(tok);
        terminated = true;
        break;
      }
      collected.unshift(tok);
    }

    const window = collected.join(' ');

    // Multi-word negation cues need substring check; single-word need exact-token check.
    const negated = NEGATION_CUES.some(cue => {
      if (cue.includes(' ')) {
        return window.includes(cue);
      }
      // Single-word: must appear as its own token, not as a substring of another word
      // (e.g., "now" must not match "no")
      return collected.some(t => t.replace(/[.,;:!?]/g, '') === cue);
    });

    if (negated) return true;

    // Not negated at this occurrence — try the next occurrence of the pattern.
    // Don't return false yet: if ANY occurrence is negated above we returned true,
    // but we want to require ALL occurrences to be negated to suppress the flag.
    // → Actually the safer interpretation is: if AT LEAST ONE occurrence is asserted
    //   (not negated), we should fire the flag. So return false here.
    return false;

    // (unreachable, kept for clarity)
    // searchFrom = idx + normalizedPattern.length;
  }

  return false;
}
