// CompassPreVisitPipeline.ts
// Wires COMPASS OLDCARTS assessment data into the differential diagnosis engine
// so that structured patient-reported symptoms flow directly into AI diagnostics.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OldcartsData {
  onset: string;
  location: string;
  duration: string;
  character: string;
  aggravating: string[];
  relieving: string[];
  timing: string;
  severity: number;
  associatedSymptoms: string[];
  rawResponses: Record<string, string>;
}

export type DurationCategory = 'acute' | 'subacute' | 'chronic';
export type SeverityCategory = 'mild' | 'moderate' | 'severe';
export type TemporalPattern =
  | 'constant'
  | 'intermittent'
  | 'positional'
  | 'nocturnal'
  | 'exertional';

export interface StructuredSymptomProfile {
  chiefComplaint: string;
  symptomTerms: string[];
  durationCategory: DurationCategory;
  severityCategory: SeverityCategory;
  temporalPattern: TemporalPattern;
  bodyRegion: string;
  riskIndicators: string[];
}

export interface DifferentialInput {
  structuredProfile: StructuredSymptomProfile;
  enrichedSymptoms: string[];
  suggestedComplaintCategory: string;
}

export interface Vitals {
  bp: string;
  hr: number;
  temp: number;
  rr: number;
  spo2: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DURATION_ACUTE_DAYS = 7;
const DURATION_SUBACUTE_DAYS = 28;

/** Best-effort conversion of a free-text duration string into a day count. */
function parseDurationToDays(duration: string): number {
  const lower = duration.toLowerCase().trim();

  // Match patterns like "3 days", "2 weeks", "1 month", "6 hours"
  const match = lower.match(/(\d+\.?\d*)\s*(hour|hr|day|week|wk|month|mo|year|yr)s?/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('hour') || unit.startsWith('hr')) return value / 24;
    if (unit.startsWith('day')) return value;
    if (unit.startsWith('week') || unit.startsWith('wk')) return value * 7;
    if (unit.startsWith('month') || unit.startsWith('mo')) return value * 30;
    if (unit.startsWith('year') || unit.startsWith('yr')) return value * 365;
  }

  // Heuristic keywords
  if (/today|just started|hours? ago|this morning|this evening/i.test(lower)) return 0.5;
  if (/yesterday/i.test(lower)) return 1;
  if (/few days|couple days|several days/i.test(lower)) return 4;
  if (/a week|about a week/i.test(lower)) return 7;
  if (/couple weeks|two weeks/i.test(lower)) return 14;
  if (/few weeks|several weeks/i.test(lower)) return 21;
  if (/a month|about a month/i.test(lower)) return 30;
  if (/months|several months/i.test(lower)) return 90;
  if (/year|years|long time/i.test(lower)) return 365;

  // Default to acute if unparseable
  return 3;
}

function classifyDuration(duration: string): DurationCategory {
  const days = parseDurationToDays(duration);
  if (days < DURATION_ACUTE_DAYS) return 'acute';
  if (days <= DURATION_SUBACUTE_DAYS) return 'subacute';
  return 'chronic';
}

function classifySeverity(severity: number): SeverityCategory {
  if (severity <= 3) return 'mild';
  if (severity <= 6) return 'moderate';
  return 'severe';
}

const POSITIONAL_KEYWORDS = [
  'lying down', 'standing', 'bending', 'position', 'sitting',
  'leaning', 'supine', 'upright', 'recumbent',
];
const NOCTURNAL_KEYWORDS = [
  'night', 'sleep', 'wakes me', 'nocturnal', 'bedtime', 'lying in bed',
];
const EXERTIONAL_KEYWORDS = [
  'exertion', 'exercise', 'walking', 'climbing', 'activity',
  'running', 'stairs', 'physical', 'effort', 'lifting',
];
const INTERMITTENT_KEYWORDS = [
  'comes and goes', 'intermittent', 'on and off', 'episodic',
  'sometimes', 'occasional', 'waves', 'fluctuates',
];

function classifyTemporalPattern(
  timing: string,
  aggravating: string[],
  relieving: string[],
): TemporalPattern {
  // Defensive: coerce strings to arrays (API may receive string instead of string[])
  const safeAgg = Array.isArray(aggravating) ? aggravating : [aggravating].filter(Boolean);
  const safeRel = Array.isArray(relieving) ? relieving : [relieving].filter(Boolean);
  const combined = [timing, ...safeAgg, ...safeRel]
    .join(' ')
    .toLowerCase();

  if (EXERTIONAL_KEYWORDS.some((kw) => combined.includes(kw))) return 'exertional';
  if (NOCTURNAL_KEYWORDS.some((kw) => combined.includes(kw))) return 'nocturnal';
  if (POSITIONAL_KEYWORDS.some((kw) => combined.includes(kw))) return 'positional';
  if (INTERMITTENT_KEYWORDS.some((kw) => combined.includes(kw))) return 'intermittent';

  return 'constant';
}

/** Map location / chief complaint to a broad body region. */
function resolveBodyRegion(location: string, chiefComplaint: string): string {
  const text = `${location} ${chiefComplaint}`.toLowerCase();

  const regionMap: Record<string, string[]> = {
    head: ['head', 'temple', 'forehead', 'skull', 'scalp', 'cranial'],
    face: ['face', 'jaw', 'sinus', 'cheek', 'eye', 'ear', 'nose', 'mouth', 'teeth', 'tooth'],
    neck: ['neck', 'throat', 'cervical'],
    chest: ['chest', 'sternum', 'rib', 'thorax', 'pectoral', 'breast'],
    abdomen: ['abdomen', 'abdominal', 'stomach', 'belly', 'epigastric', 'umbilical', 'flank', 'groin'],
    back: ['back', 'lumbar', 'spine', 'spinal', 'thoracic', 'sacral', 'coccyx'],
    'upper extremity': ['arm', 'shoulder', 'elbow', 'wrist', 'hand', 'finger'],
    'lower extremity': ['leg', 'hip', 'knee', 'ankle', 'foot', 'toe', 'calf', 'thigh', 'shin'],
    pelvis: ['pelvis', 'pelvic', 'bladder', 'urinary', 'genital'],
    'whole body': ['all over', 'everywhere', 'diffuse', 'generalized', 'whole body', 'widespread'],
  };

  for (const [region, keywords] of Object.entries(regionMap)) {
    if (keywords.some((kw) => text.includes(kw))) return region;
  }

  return location.toLowerCase() || 'unspecified';
}

// ---------------------------------------------------------------------------
// Risk indicator detection
// ---------------------------------------------------------------------------

interface RiskRule {
  label: string;
  test: (oldcarts: OldcartsData, profile: Partial<StructuredSymptomProfile>) => boolean;
}

const RISK_RULES: RiskRule[] = [
  {
    label: 'thunderclap headache - SAH rule-out',
    test: (o, p) => {
      const text = `${o.location} ${o.character} ${o.associatedSymptoms.join(' ')}`.toLowerCase();
      return (
        /sudden/i.test(o.onset) &&
        p.severityCategory === 'severe' &&
        text.includes('head')
      );
    },
  },
  {
    label: 'possible ACS',
    test: (o, p) => {
      const text = `${o.location} ${o.character}`.toLowerCase();
      return text.includes('chest') && p.temporalPattern === 'exertional';
    },
  },
  {
    label: 'sepsis concern',
    test: (o) => {
      const text = `${o.character} ${o.associatedSymptoms.join(' ')} ${Object.values(o.rawResponses).join(' ')}`.toLowerCase();
      return (
        /(fever|febrile|chills)/i.test(text) &&
        /(confus|altered|mental status|disoriented|letharg)/i.test(text)
      );
    },
  },
  {
    label: 'stroke concern',
    test: (o) => {
      const text = `${o.character} ${o.associatedSymptoms.join(' ')}`.toLowerCase();
      return (
        /sudden/i.test(o.onset) &&
        /(numb|weak|facial droop|slurred|speech|vision loss|paralysis|neurolog)/i.test(text)
      );
    },
  },
  {
    label: 'surgical abdomen concern',
    test: (o, p) => {
      const text = `${o.location} ${o.character}`.toLowerCase();
      return (
        p.severityCategory === 'severe' &&
        p.durationCategory === 'acute' &&
        /(abdomen|abdominal|stomach|belly)/i.test(text)
      );
    },
  },
];

function detectRiskIndicators(
  oldcarts: OldcartsData,
  profile: Partial<StructuredSymptomProfile>,
): string[] {
  const indicators: string[] = [];
  for (const rule of RISK_RULES) {
    if (rule.test(oldcarts, profile)) {
      indicators.push(rule.label);
    }
  }
  return indicators;
}

// ---------------------------------------------------------------------------
// Complaint category mapping
// ---------------------------------------------------------------------------

function mapComplaintCategory(chiefComplaint: string, bodyRegion: string): string {
  const text = `${chiefComplaint} ${bodyRegion}`.toLowerCase();

  const categories: Record<string, string[]> = {
    headache: ['headache', 'migraine', 'head pain', 'cephalgia'],
    'chest pain': ['chest pain', 'chest tightness', 'angina', 'chest pressure'],
    'abdominal pain': ['abdominal', 'stomach', 'belly', 'epigastric', 'nausea', 'vomiting', 'diarrhea'],
    respiratory: ['cough', 'breath', 'dyspnea', 'wheeze', 'respiratory', 'shortness of breath', 'sob'],
    'back pain': ['back pain', 'lumbar', 'spine', 'sciatica'],
    musculoskeletal: ['joint', 'muscle', 'arthralgia', 'myalgia', 'sprain', 'strain', 'swelling'],
    neurological: ['dizzy', 'vertigo', 'numbness', 'tingling', 'seizure', 'syncope', 'faint'],
    dermatological: ['rash', 'itch', 'skin', 'lesion', 'hives', 'dermatitis'],
    genitourinary: ['urinary', 'bladder', 'dysuria', 'frequency', 'hematuria', 'flank'],
    ent: ['ear', 'nose', 'throat', 'sinus', 'sore throat', 'congestion', 'hearing'],
    cardiac: ['palpitation', 'heart', 'irregular', 'tachycardia', 'bradycardia'],
    psychological: ['anxiety', 'depression', 'insomnia', 'stress', 'panic', 'mood'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }

  return 'general';
}

// ---------------------------------------------------------------------------
// Core exported functions
// ---------------------------------------------------------------------------

/**
 * Convert OLDCARTS assessment data into a StructuredSymptomProfile for the
 * differential diagnosis engine.
 */
export function parseOldcartsToProfile(
  oldcarts: OldcartsData,
  chiefComplaint: string,
): StructuredSymptomProfile {
  const durationCategory = classifyDuration(oldcarts.duration);
  const severityCategory = classifySeverity(oldcarts.severity);
  const temporalPattern = classifyTemporalPattern(
    oldcarts.timing,
    oldcarts.aggravating,
    oldcarts.relieving,
  );
  const bodyRegion = resolveBodyRegion(oldcarts.location, chiefComplaint);

  const partialProfile: Partial<StructuredSymptomProfile> = {
    durationCategory,
    severityCategory,
    temporalPattern,
  };

  const riskIndicators = detectRiskIndicators(oldcarts, partialProfile);
  const symptomTerms = extractSymptomTerms(oldcarts);

  return {
    chiefComplaint,
    symptomTerms,
    durationCategory,
    severityCategory,
    temporalPattern,
    bodyRegion,
    riskIndicators,
  };
}

/**
 * Extract and normalise symptom keyword terms from OLDCARTS fields.
 */
export function extractSymptomTerms(oldcarts: OldcartsData): string[] {
  // Defensive: coerce to arrays in case API sent strings
  const agg = Array.isArray(oldcarts.aggravating) ? oldcarts.aggravating : [oldcarts.aggravating].filter(Boolean);
  const rel = Array.isArray(oldcarts.relieving) ? oldcarts.relieving : [oldcarts.relieving].filter(Boolean);
  const assoc = Array.isArray(oldcarts.associatedSymptoms) ? oldcarts.associatedSymptoms : [oldcarts.associatedSymptoms].filter(Boolean);
  const raw: string[] = [
    oldcarts.character,
    ...agg,
    ...rel,
    ...assoc,
  ];

  // Tokenise, lowercase, deduplicate
  const termSet = new Set<string>();
  for (const entry of raw) {
    const tokens = entry
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);
    tokens.forEach((t) => termSet.add(t));
  }

  // Add multi-word associated symptoms as-is (normalised)
  for (const symptom of oldcarts.associatedSymptoms) {
    const normalised = symptom.toLowerCase().trim();
    if (normalised) termSet.add(normalised);
  }

  // Implicit symptom additions based on severity / patterns
  if (oldcarts.severity >= 8) {
    termSet.add('severe pain');
  }
  if (/sudden/i.test(oldcarts.onset)) {
    termSet.add('acute onset');
  }
  if (/worst/i.test(oldcarts.character) || oldcarts.severity === 10) {
    termSet.add('worst pain of life');
  }

  return Array.from(termSet);
}

/**
 * Build the full input payload that the differential diagnosis engine expects.
 */
export function buildDifferentialInput(
  oldcarts: OldcartsData,
  chiefComplaint: string,
): DifferentialInput {
  const structuredProfile = parseOldcartsToProfile(oldcarts, chiefComplaint);
  const enrichedSymptoms = extractSymptomTerms(oldcarts);
  const suggestedComplaintCategory = mapComplaintCategory(
    chiefComplaint,
    structuredProfile.bodyRegion,
  );

  return {
    structuredProfile,
    enrichedSymptoms,
    suggestedComplaintCategory,
  };
}

/**
 * Enrich an existing StructuredSymptomProfile with vital-sign-derived risk
 * indicators. Returns a new profile (does not mutate the original).
 */
export function enrichWithVitals(
  profile: StructuredSymptomProfile,
  vitals: Vitals,
): StructuredSymptomProfile {
  const additionalIndicators: string[] = [];

  // Tachycardia
  if (vitals.hr > 100) {
    additionalIndicators.push('tachycardia');
  }

  // Hypertension – parse systolic from "120/80" format
  const systolicMatch = vitals.bp.match(/^(\d+)\//);
  if (systolicMatch && parseInt(systolicMatch[1], 10) >= 140) {
    additionalIndicators.push('hypertension');
  }

  // Hypotension
  if (systolicMatch && parseInt(systolicMatch[1], 10) < 90) {
    additionalIndicators.push('hypotension');
  }

  // Fever
  if (vitals.temp >= 100.4) {
    additionalIndicators.push('fever');
  }

  // Hypothermia
  if (vitals.temp < 95) {
    additionalIndicators.push('hypothermia');
  }

  // Hypoxia
  if (vitals.spo2 < 94) {
    additionalIndicators.push('hypoxia');
  }

  // Tachypnea
  if (vitals.rr > 20) {
    additionalIndicators.push('tachypnea');
  }

  // Bradypnea
  if (vitals.rr < 12) {
    additionalIndicators.push('bradypnea');
  }

  return {
    ...profile,
    riskIndicators: [...profile.riskIndicators, ...additionalIndicators],
  };
}

/**
 * Determine the overall risk level from a StructuredSymptomProfile.
 */
export function getRiskLevel(
  profile: StructuredSymptomProfile,
): 'low' | 'moderate' | 'high' | 'critical' {
  const { severityCategory, durationCategory, riskIndicators, temporalPattern } = profile;

  // Critical-level risk indicators
  const criticalIndicators = [
    'thunderclap headache - SAH rule-out',
    'stroke concern',
    'sepsis concern',
    'hypoxia',
    'hypotension',
  ];
  if (riskIndicators.some((ri) => criticalIndicators.includes(ri))) {
    return 'critical';
  }

  // High-level risk indicators
  const highIndicators = [
    'possible ACS',
    'surgical abdomen concern',
    'tachycardia',
    'fever',
    'hypothermia',
  ];
  if (riskIndicators.some((ri) => highIndicators.includes(ri))) {
    return 'high';
  }

  // Score-based assessment for remaining cases
  let score = 0;

  if (severityCategory === 'severe') score += 3;
  else if (severityCategory === 'moderate') score += 1;

  if (durationCategory === 'acute') score += 1;

  if (temporalPattern === 'exertional') score += 2;
  if (temporalPattern === 'nocturnal') score += 1;

  if (riskIndicators.includes('hypertension')) score += 1;
  if (riskIndicators.includes('tachypnea')) score += 1;

  // Additional risk indicators bump the score
  score += Math.min(riskIndicators.length, 3);

  if (score >= 6) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}
