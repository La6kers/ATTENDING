// ============================================================
// ATTENDING AI — Symptom-Cause Graph Engine
// Evidence-based differential weighting from curated clinical
// symptom→cause mappings (5,061 edges, 143 symptoms, 3,636 causes)
//
// Core concept: Inverse Symptom Frequency (ISF)
// A cause appearing under only 1 symptom has ISF=1.0 (very specific).
// A cause appearing under 21 symptoms (e.g., Diabetes) has ISF=0.05 (red herring).
// This separates discriminative diagnoses from systemic noise.
// ============================================================

import graphData from './symptomCauseGraph.json';

// ============================================================
// Types
// ============================================================

interface GraphCause {
  cause: string;
  isf: number;         // 1/N where N = number of symptoms this cause maps to
  symptomCount: number; // how many symptoms this cause appears under
}

type SymptomGraph = Record<string, GraphCause[]>;

const GRAPH: SymptomGraph = graphData as SymptomGraph;

// ============================================================
// Fuzzy Symptom Matching
// ============================================================

// Map common chief complaint phrases → graph symptom keys
const SYMPTOM_ALIASES: Record<string, string[]> = {
  // Knee
  'knee pain': ['Acute Knee Pain'],
  'knee': ['Acute Knee Pain'],
  // Chest
  'chest pain': ['Pleuritic Chest Pain'],
  'chest tightness': ['Pleuritic Chest Pain'],
  'chest pressure': ['Pleuritic Chest Pain'],
  // Abdominal
  'abdominal pain': ['Acute Abdominal Pain', 'Generalized Abdominal Pain'],
  'stomach pain': ['Acute Abdominal Pain', 'Epigastric Pain'],
  'belly pain': ['Acute Abdominal Pain'],
  'right lower quadrant': ['Right Lower Quadrant Abdominal Pain'],
  'left lower quadrant': ['Left Lower Quadrant Abdominal Pain'],
  'right upper quadrant': ['Right Upper Quadrant Abdominal Pain'],
  'left upper quadrant': ['Left Upper Quadrant Abdominal Pain'],
  'epigastric': ['Epigastric Pain'],
  'periumbilical': ['Periumbilical Pain'],
  'suprapubic': ['Suprapubic Pain'],
  // Respiratory
  'shortness of breath': ['Acute Dyspnea', 'Dyspnea Causes'],
  'difficulty breathing': ['Acute Dyspnea', 'Dyspnea Causes'],
  'dyspnea': ['Acute Dyspnea', 'Dyspnea Causes'],
  'cough': ['Acute Cough', 'Chronic Cough'],
  'wheezing': ['Expiratory Wheezing'],
  'coughing blood': ['Hemoptysis Causes'],
  'hemoptysis': ['Hemoptysis Causes'],
  // Neurological
  'headache': ['Syncope'],  // closest in graph
  'dizziness': ['Dizziness', 'Dysequilibrium'],
  'fainting': ['Syncope', 'Vasovagal Syncope'],
  'syncope': ['Syncope', 'Vasovagal Syncope'],
  // MSK
  'back pain': ['Low Back Pain Causes'],
  'lower back': ['Low Back Pain Causes'],
  'neck pain': ['Neck Pain', 'Neck Pain Causes'],
  'shoulder pain': ['Shoulder Pain'],
  'hip pain': ['Hip Pain', 'Hip Pain Causes'],
  'elbow pain': ['Elbow Pain'],
  'foot pain': ['Foot Pain'],
  'heel pain': ['Heel Pain'],
  'leg pain': ['Leg Pain'],
  // GU
  'burning urination': ['Dysuria'],
  'painful urination': ['Dysuria'],
  'uti': ['Dysuria', 'Urinary Frequency'],
  'blood in urine': ['Dysuria'],
  'urinary frequency': ['Urinary Frequency', 'Nocturia'],
  // ENT
  'sore throat': ['Hoarseness Causes', 'Esophageal Dysphagia', 'Oropharyngeal Dysphagia'],
  'hoarseness': ['Hoarseness Causes'],
  'ear pain': ['Otalgia'],
  'ringing in ears': ['Tinnitus'],
  'difficulty swallowing': ['Esophageal Dysphagia', 'Oropharyngeal Dysphagia'],
  // GI
  'nausea': ['Nausea Causes', 'Vomiting'],
  'vomiting': ['Vomiting', 'Nausea Causes'],
  'rectal bleeding': ['Lower Gastrointestinal Bleeding'],
  'blood in stool': ['Lower Gastrointestinal Bleeding', 'Gastrointestinal Bleeding'],
  'heartburn': ['Dyspepsia Causes'],
  'indigestion': ['Dyspepsia Causes'],
  // Eye
  'eye pain': ['Eye Pain'],
  'vision changes': ['Decreased Visual Acuity', 'Floaters', 'Light Flashes'],
  'double vision': ['Diplopia'],
  'red eye': ['Red Eye'],
  // Other
  'fatigue': ['Fatigue', 'Fatigue Causes'],
  'tired': ['Fatigue', 'Fatigue Causes'],
  'night sweats': ['Night Sweats'],
  'itching': ['Pruritus Causes'],
  'palpitations': ['Palpitation', 'Palpitation Causes'],
  'swollen glands': ['Salivary Gland Enlargement'],
  'testicular pain': ['Acute Testicular Pain', 'Chronic Testicular Pain'],
  'pelvic pain': ['Acute Pelvic Pain', 'Chronic Pelvic Pain'],
  'missed period': ['Amenorrhea'],
  'limp': ['Limp'],
};

/**
 * Find matching symptom keys in the graph for a chief complaint
 */
function findGraphSymptoms(chiefComplaint: string): string[] {
  const cc = chiefComplaint.toLowerCase();
  const matches = new Set<string>();

  // Check aliases first (most common path)
  for (const [phrase, graphKeys] of Object.entries(SYMPTOM_ALIASES)) {
    if (cc.includes(phrase)) {
      graphKeys.forEach(k => matches.add(k));
    }
  }

  // Direct match against graph keys
  if (matches.size === 0) {
    for (const graphSymptom of Object.keys(GRAPH)) {
      const gs = graphSymptom.toLowerCase();
      if (cc.includes(gs) || gs.includes(cc)) {
        matches.add(graphSymptom);
      }
    }
  }

  return Array.from(matches);
}

// ============================================================
// Public API
// ============================================================

export interface GraphDiagnosis {
  cause: string;
  isf: number;
  symptomCount: number;
  graphScore: number;     // ISF-weighted relevance score
  matchedSymptoms: string[]; // which graph symptoms it matched from
}

/**
 * Query the symptom-cause graph for differential diagnoses.
 * Returns causes ranked by diagnostic specificity (ISF).
 *
 * ISF = 1.0 → cause is UNIQUE to this symptom → strong diagnostic signal
 * ISF < 0.2 → cause appears under 5+ symptoms → systemic/nonspecific
 */
export function queryGraph(chiefComplaint: string): GraphDiagnosis[] {
  const graphSymptoms = findGraphSymptoms(chiefComplaint);
  if (graphSymptoms.length === 0) return [];

  const causeMap = new Map<string, GraphDiagnosis>();

  for (const symptom of graphSymptoms) {
    const causes = GRAPH[symptom];
    if (!causes) continue;

    for (const entry of causes) {
      const existing = causeMap.get(entry.cause);
      if (existing) {
        // Cause matches multiple symptoms → boost score
        existing.graphScore += entry.isf * 10;
        existing.matchedSymptoms.push(symptom);
      } else {
        causeMap.set(entry.cause, {
          cause: entry.cause,
          isf: entry.isf,
          symptomCount: entry.symptomCount,
          graphScore: entry.isf * 10,
          matchedSymptoms: [symptom],
        });
      }
    }
  }

  // Sort by graph score (specificity-weighted)
  return Array.from(causeMap.values()).sort((a, b) => b.graphScore - a.graphScore);
}

/**
 * Apply graph-based scoring to an existing diagnosis score map.
 * Boosts diagnoses found in the graph, penalizes misses.
 *
 * @param chiefComplaint - patient's chief complaint
 * @param scores - mutable Map of diagnosis→score from the rule engine
 * @returns evidence strings per diagnosis
 */
export function applyGraphBoosts(
  chiefComplaint: string,
  scores: Map<string, number>
): Map<string, string[]> {
  const evidenceMap = new Map<string, string[]>();
  const graphResults = queryGraph(chiefComplaint);

  if (graphResults.length === 0) return evidenceMap;

  for (const result of graphResults) {
    const { cause, isf, symptomCount: _symptomCount } = result;

    // Normalize cause name for matching against existing diagnosis names
    const causeNorm = cause.toLowerCase();

    // Try to match against existing diagnoses in the score map
    let matched = false;
    for (const [diagnosis] of scores) {
      const dxNorm = diagnosis.toLowerCase();
      if (dxNorm.includes(causeNorm) || causeNorm.includes(dxNorm) ||
          fuzzyMatch(dxNorm, causeNorm)) {
        // Boost based on ISF: specific causes get bigger boost
        const boost = Math.round(isf * 15);
        scores.set(diagnosis, (scores.get(diagnosis) || 0) + boost);

        const evidence = evidenceMap.get(diagnosis) || [];
        if (isf >= 0.5) {
          evidence.push(`Graph: ${cause} — highly specific to this presentation (ISF ${isf.toFixed(2)})`);
        }
        evidenceMap.set(diagnosis, evidence);
        matched = true;
      }
    }

    // If graph cause not in score map, add it with ISF-weighted score
    // Only for high-ISF causes (specific to this symptom)
    if (!matched && isf >= 0.25) {
      const newScore = Math.round(isf * 20);
      if (newScore >= 5) {
        scores.set(cause, (scores.get(cause) || 0) + newScore);
        const evidence = [`Evidence-based: ${cause} is a known cause of ${result.matchedSymptoms.join(', ')} (specificity ${isf.toFixed(2)})`];
        evidenceMap.set(cause, evidence);
      }
    }
  }

  return evidenceMap;
}

/**
 * Get graph statistics for a complaint (useful for debugging/display)
 */
export function getGraphStats(chiefComplaint: string): {
  matchedSymptoms: string[];
  totalCauses: number;
  specificCauses: number;    // ISF = 1.0
  nonspecificCauses: number; // ISF < 0.2
  topSpecific: string[];     // top 5 most specific causes
  topNonspecific: string[];  // top shared/systemic causes
} {
  const graphSymptoms = findGraphSymptoms(chiefComplaint);
  const results = queryGraph(chiefComplaint);

  return {
    matchedSymptoms: graphSymptoms,
    totalCauses: results.length,
    specificCauses: results.filter(r => r.isf >= 1.0).length,
    nonspecificCauses: results.filter(r => r.isf < 0.2).length,
    topSpecific: results.filter(r => r.isf >= 1.0).slice(0, 5).map(r => r.cause),
    topNonspecific: results.filter(r => r.isf < 0.2).slice(0, 5).map(r => r.cause),
  };
}

// ============================================================
// Bayesian Graph Integration — ISF → Likelihood Ratios
// ============================================================

/**
 * Apply graph-derived likelihood ratios to a Bayesian odds map.
 * The graph provides a GENTLE confirmatory nudge — not a primary driver.
 *
 * ISF → LR conversion (conservative):
 *   ISF = 1.0 (unique cause) → LR = 1.5
 *   ISF = 0.5 → LR = 1.25
 *   ISF < 0.3 → filtered out (too nonspecific)
 *
 * The graph validates that a diagnosis IS a known cause of this symptom,
 * but the magnitude of belief shift comes from likelihood ratios (symptom-specific answers),
 * not from the graph alone.
 */
export function applyGraphLikelihoodRatios(
  chiefComplaint: string,
  odds: Map<string, number>
): Map<string, string[]> {
  const evidenceMap = new Map<string, string[]>();
  const graphResults = queryGraph(chiefComplaint);

  if (graphResults.length === 0) return evidenceMap;

  for (const result of graphResults) {
    const { cause, isf } = result;

    // Only apply for causes with meaningful specificity
    if (isf < 0.3) continue;

    // Conservative LR: gentle confirmation, not a primary driver
    // ISF=1.0 → LR=1.5, ISF=0.5 → LR=1.25, ISF=0.3 → LR=1.15
    const graphLR = 1 + (isf * 0.5);

    const causeNorm = cause.toLowerCase();

    // Try to match against existing diagnoses in the odds map
    let matched = false;
    for (const [diagnosis] of odds) {
      const dxNorm = diagnosis.toLowerCase();
      if (dxNorm.includes(causeNorm) || causeNorm.includes(dxNorm) ||
          fuzzyMatch(dxNorm, causeNorm)) {
        const currentOdds = odds.get(diagnosis) || 0.01;
        odds.set(diagnosis, currentOdds * graphLR);

        if (isf >= 0.8) {
          const evidence = evidenceMap.get(diagnosis) || [];
          evidence.push(`Evidence-based: ${cause} — highly specific to this presentation`);
          evidenceMap.set(diagnosis, evidence);
        }
        matched = true;
      }
    }

    // Add new diagnoses only for very specific causes not already in the map
    if (!matched && isf >= 0.8) {
      const baseOdds = 0.015;
      odds.set(cause, baseOdds * graphLR);
      const evidence = [`Evidence-based: ${cause} is a known cause (ISF ${isf.toFixed(2)})`];
      evidenceMap.set(cause, evidence);
    }
  }

  return evidenceMap;
}

// ============================================================
// Helpers
// ============================================================

function fuzzyMatch(a: string, b: string): boolean {
  // Simple containment-based fuzzy: check if significant words overlap
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap >= 2 || (overlap >= 1 && Math.min(wordsA.size, wordsB.size) <= 2);
}
