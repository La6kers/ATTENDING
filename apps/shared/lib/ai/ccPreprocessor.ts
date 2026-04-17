// ============================================================
// COMPASS — Chief Complaint Preprocessor
//
// Runs BEFORE symptomSynonyms.normalizeSymptomText() to handle:
//
//   1. Medical abbreviation expansion (CP → chest pain, SOB → shortness
//      of breath, n/v → nausea and vomiting) — clinical shorthand that
//      synonym dictionaries don't cover because it's not layman.
//
//   2. Narrative-to-symptom extraction — when the CC is a full sentence
//      ("A 52-year-old woman presented with a 7-day history of severe
//      chest pain radiating to the left arm..."), pull declarative
//      symptom tokens that downstream synonym matchers can hit.
//
//   3. Common ED/clinical shorthand normalization that the layman
//      synonym list misses by design.
//
// Keep this module deterministic and fast (regex-only, no LLM). The LLM
// fallback in ccNormalizer.ts handles everything past this layer.
//
// Designed to improve accuracy on external benchmark datasets (DDXPlus,
// NHAMCS, MedCaseReasoning) where the CC phrasing is often:
//   - Medical-student-question style ("Do you have fever?")
//   - ED nurse shorthand ("CP, SOB, hx CHF")
//   - Published case-report prose ("A 52-year-old man presented with...")
//
// Does NOT replace or duplicate any existing functionality — strictly
// additive pre-processing.
// ============================================================

/**
 * Common medical abbreviations used in clinical documentation.
 *
 * Keys are the abbreviation as it appears; values are the canonical
 * expansion (should be the form that symptomSynonyms recognizes or the
 * prevalence engine's CC-keyword rules key on).
 *
 * Matched with word boundaries. Case-insensitive.
 */
const ABBREVIATIONS: Record<string, string> = {
  // Cardiovascular
  'cp': 'chest pain',
  'mi': 'myocardial infarction',
  'acs': 'acute coronary syndrome',
  'stemi': 'ST-elevation myocardial infarction chest pain',
  'nstemi': 'non-ST-elevation myocardial infarction chest pain',
  'chf': 'congestive heart failure',
  'hf': 'heart failure',
  'cad': 'coronary artery disease',
  'htn': 'hypertension',
  'afib': 'atrial fibrillation',
  'a-fib': 'atrial fibrillation',
  'a fib': 'atrial fibrillation',
  'svt': 'supraventricular tachycardia heart racing',
  'dvt': 'deep vein thrombosis leg swelling',
  'pe': 'pulmonary embolism',
  'pnd': 'paroxysmal nocturnal dyspnea wake up gasping',

  // Respiratory
  'sob': 'shortness of breath',
  'soa': 'shortness of air',
  'doe': 'dyspnea on exertion shortness of breath with exertion',
  'copd': 'chronic obstructive pulmonary disease',
  'uri': 'upper respiratory infection',
  'urti': 'upper respiratory tract infection',
  'lrti': 'lower respiratory tract infection',
  'pna': 'pneumonia',
  'tb': 'tuberculosis',

  // GI
  'n/v': 'nausea and vomiting',
  'nv': 'nausea and vomiting',
  'n&v': 'nausea and vomiting',
  'gi bleed': 'gastrointestinal bleeding',
  'ugi bleed': 'upper gastrointestinal bleeding',
  'lgi bleed': 'lower gastrointestinal bleeding',
  'gerd': 'gastroesophageal reflux',
  'ibd': 'inflammatory bowel disease',
  'ibs': 'irritable bowel syndrome',
  'sbo': 'small bowel obstruction',

  // GU
  'uti': 'urinary tract infection',
  'bph': 'benign prostatic hyperplasia',
  'aki': 'acute kidney injury',
  'ckd': 'chronic kidney disease',
  'esrd': 'end-stage renal disease',

  // Neuro
  'cva': 'stroke',
  'tia': 'transient ischemic attack',
  'ich': 'intracranial hemorrhage',
  'sah': 'subarachnoid hemorrhage',
  'sdh': 'subdural hematoma',
  'loc': 'loss of consciousness passed out',
  'ams': 'altered mental status confusion',

  // Endo / Metabolic
  'dka': 'diabetic ketoacidosis',
  'hhs': 'hyperosmolar hyperglycemic state',
  'dm': 'diabetes mellitus',
  't1dm': 'type 1 diabetes',
  't2dm': 'type 2 diabetes',

  // MSK / Injury
  'lbp': 'low back pain',
  'mvc': 'motor vehicle collision injury',
  'mva': 'motor vehicle accident injury',
  'fall': 'fall injury',
  'tbi': 'traumatic brain injury head injury',

  // Psych
  'si': 'suicidal ideation',
  'hi': 'homicidal ideation',
  'ocd': 'obsessive compulsive disorder',
  'ptsd': 'post-traumatic stress disorder',
  'gad': 'generalized anxiety disorder',

  // General
  'hx': 'history of',
  'pmh': 'past medical history',
  'fhx': 'family history',
  'sh': 'social history',
  'etoh': 'alcohol',
  'ivdu': 'intravenous drug use',
  'abx': 'antibiotics',
  'bx': 'biopsy',
  'rx': 'prescription medication',
  'fu': 'follow up',
  'rof': 'reason for visit',
  'sx': 'symptoms',
  'dx': 'diagnosis',
  'tx': 'treatment',
  'w/': 'with',
  'w/o': 'without',
  'c/o': 'complaining of',
  'pt': 'patient',
  'yo': 'year-old',
  'ys': 'years',
  'hrs': 'hours',
  'wks': 'weeks',
  'mos': 'months',
};

/**
 * Clinical question-to-statement conversions.
 *
 * DDXPlus emits evidences as questions ("Do you have fever?"). When the
 * list includes them, the patient has them (positive answers only).
 * Convert to declarative symptom tokens.
 */
const QUESTION_TO_STATEMENT: Array<[RegExp, string]> = [
  [/\bdo you have (?:a |an )?/gi, ' '],
  [/\bdo you feel (?:a |an )?/gi, ' '],
  [/\bdo you experience (?:a |an )?/gi, ' '],
  [/\bare you experiencing (?:a |an )?/gi, ' '],
  [/\bare you (?:feeling |having )?/gi, ' '],
  [/\bhave you been (?:feeling |having )?/gi, ' '],
  [/\bhave you (?:ever |recently )?(?:been |had )?/gi, ' '],
  [/\bis there (?:a |any )?/gi, ' '],
  [/\bhow (?:long|severe|intense|bad)[^?]*\?/gi, ' '],
  [/\bwhere (?:is|are)[^?]*\?/gi, ' '],
  [/\bwhat (?:is|are|does)[^?]*\?/gi, ' '],
  [/\bcharacterize your pain:?\s*/gi, ' '],
  [/\brelated to your reason for consulting/gi, ' '],
  [/\?+/g, ' '],
];

/**
 * Symptom terms to extract from narrative prose (MedCaseReasoning-style).
 *
 * When a CC is a full sentence, scan for these keywords and append the
 * canonical symptom form. The synonym matcher then picks up from there.
 */
const NARRATIVE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bchest (?:pain|pressure|tightness|discomfort|heaviness)\b/i, 'chest pain'],
  [/\bsh(?:ortness )?(?:of )?breath\b/i, 'shortness of breath'],
  [/\bdyspnea\b/i, 'shortness of breath'],
  [/\bpalpitations?\b/i, 'palpitations heart racing'],
  [/\bheadaches?\b/i, 'headache'],
  [/\babdominal (?:pain|cramp|discomfort|tender)\b/i, 'abdominal pain'],
  [/\b(?:lower |upper )?abd(?:omen|ominal)\b/i, 'abdominal pain'],
  [/\brlq pain\b/i, 'right lower quadrant pain appendicitis'],
  [/\bllq pain\b/i, 'left lower quadrant pain'],
  [/\bruq pain\b/i, 'right upper quadrant pain'],
  [/\bluq pain\b/i, 'left upper quadrant pain'],
  [/\bnauseas?\b/i, 'nausea'],
  [/\bvomit(?:ing|ed)?\b/i, 'vomiting'],
  [/\bhematemesis\b/i, 'vomiting blood'],
  [/\bmelena\b/i, 'black tarry stool gi bleed'],
  [/\bhematochezia\b/i, 'bloody stool'],
  [/\bhematuria\b/i, 'blood in urine'],
  [/\bdiarrh(?:ea|oea)\b/i, 'diarrhea'],
  [/\bconstipat(?:ion|ed)\b/i, 'constipation'],
  [/\bfevers?\b/i, 'fever'],
  [/\bfebrile\b/i, 'fever'],
  [/\bchills?\b/i, 'chills'],
  [/\brigors?\b/i, 'rigors shaking chills'],
  [/\bdiaphoresis\b/i, 'sweating'],
  [/\b(?:pre)?syncop(?:e|al)\b/i, 'syncope passed out'],
  [/\bdizz(?:iness|y)\b/i, 'dizziness'],
  [/\bvertigo\b/i, 'vertigo dizziness'],
  [/\bseizure\b/i, 'seizure'],
  [/\bweakness\b/i, 'weakness'],
  [/\bhemiparesis\b/i, 'one-sided weakness stroke'],
  [/\bhemiplegia\b/i, 'one-sided paralysis stroke'],
  [/\bparesthesias?\b/i, 'numbness tingling'],
  [/\bnumbness\b/i, 'numbness'],
  [/\btingling\b/i, 'tingling'],
  [/\bcoughs?\b/i, 'cough'],
  [/\bhemoptysis\b/i, 'coughing up blood'],
  [/\bwheez(?:ing|e)\b/i, 'wheezing'],
  [/\bstridor\b/i, 'stridor noisy breathing'],
  [/\brash(?:es)?\b/i, 'rash'],
  [/\burticaria\b/i, 'hives rash'],
  [/\bpruritus\b/i, 'itching'],
  [/\bjaundice\b/i, 'jaundice yellow skin'],
  [/\bswell(?:ing)?\b/i, 'swelling'],
  [/\bedema\b/i, 'edema swelling'],
  [/\bankle (?:swelling|edema)\b/i, 'ankle edema leg swelling'],
  [/\borthopnea\b/i, 'cant lay flat orthopnea'],
  [/\bparoxysmal nocturnal dyspnea\b/i, 'wake up gasping'],
  [/\bdysuria\b/i, 'burning when i pee'],
  [/\bfrequency\b/i, 'urinary frequency'],
  [/\burgency\b/i, 'urinary urgency'],
  [/\bpolyuria\b/i, 'frequent urination'],
  [/\bpolydipsia\b/i, 'excessive thirst'],
  [/\bfatigu(?:e|ed)\b/i, 'fatigue'],
  [/\blethargy\b/i, 'fatigue tired'],
  [/\bmalaise\b/i, 'feel unwell'],
  [/\bweight loss\b/i, 'weight loss'],
  [/\bweight gain\b/i, 'weight gain'],
  [/\bloss of appetite\b/i, 'no appetite anorexia'],
  [/\banorexia\b/i, 'no appetite'],
  [/\bsore throat\b/i, 'sore throat'],
  [/\bodynophagia\b/i, 'painful swallowing sore throat'],
  [/\bdysphagia\b/i, 'difficulty swallowing'],
  [/\bconfusion\b/i, 'confusion altered mental status'],
  [/\baltered mental status\b/i, 'confusion altered mental status'],
  [/\banxi(?:ety|ous)\b/i, 'anxiety'],
  [/\bdepress(?:ion|ed)\b/i, 'depression'],
  [/\bsuicidal\b/i, 'suicidal thoughts'],
  [/\bback pain\b/i, 'back pain'],
  [/\bjoint (?:pain|ache)\b/i, 'joint pain'],
  [/\bmyalgia\b/i, 'muscle pain'],
  [/\barthralgia\b/i, 'joint pain'],
];

/**
 * Common typo and vernacular cleanup that synonymsSynonyms.ts doesn't cover.
 * Applied before the synonym lookup.
 */
const VERNACULAR_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"],
  [/\baint\b/gi, "ain't"],
  [/\bdont\b/gi, "don't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bim\b/gi, "I'm"],
  [/\bive\b/gi, "I've"],
  [/\bsuffocat(?:e|ing|ion)?\b/gi, 'suffocating cant breathe'],
  [/\bbreath(?:ing)?\s+(?:is\s+)?(?:real(?:ly)?\s+)?hard\b/gi, 'shortness of breath'],
  [/\bkillin(?:g)?\s+me\b/gi, 'severe pain'],
  [/\bhurtin(?:g)?\s+bad\b/gi, 'severe pain'],
  [/\bpassed\s+out\b/gi, 'syncope passed out'],
  [/\bgonna\b/gi, 'going to'],
  [/\bwanna\b/gi, 'want to'],
  [/\bkinda\b/gi, 'kind of'],
  [/\bsorta\b/gi, 'sort of'],
];

/**
 * Expand medical abbreviations in-place. Uses word boundaries so "a-fib"
 * matches but "configurable" does not.
 */
function expandAbbreviations(text: string): string {
  let out = text;
  for (const [abbr, expansion] of Object.entries(ABBREVIATIONS)) {
    // Build a regex that matches the abbreviation at word boundaries.
    // Escape special regex chars in the key (for things like "n/v" or "w/").
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    out = out.replace(pattern, `${abbr} ${expansion}`); // append, don't replace — preserve original
  }
  return out;
}

/**
 * Convert question-form phrasing into declarative tokens. Useful for
 * DDXPlus which emits evidences as questions.
 */
function flattenQuestions(text: string): string {
  let out = text;
  for (const [pattern, replacement] of QUESTION_TO_STATEMENT) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Scan narrative prose for symptom keywords and append canonical forms.
 * Non-destructive — preserves original text.
 */
function extractFromNarrative(text: string): string {
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const [pattern, canonical] of NARRATIVE_KEYWORDS) {
    if (pattern.test(text)) {
      if (!seen.has(canonical)) {
        hits.push(canonical);
        seen.add(canonical);
      }
    }
  }
  return hits.length ? `${text} ${hits.join(' ')}` : text;
}

/**
 * Apply vernacular cleanup.
 */
function cleanVernacular(text: string): string {
  let out = text;
  for (const [pattern, replacement] of VERNACULAR_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export interface CCPreprocessResult {
  /** The final preprocessed chief complaint — this is what downstream
   *  synonym matching + LR rules should see. */
  processed: string;
  /** The original input, unchanged. */
  original: string;
  /** Whether any abbreviations were expanded. */
  expandedAbbrev: boolean;
  /** Whether any narrative keywords were extracted. */
  extractedNarrative: boolean;
  /** Whether any question-form phrasing was flattened. */
  flattenedQuestions: boolean;
}

/**
 * Main entry — deterministic CC preprocessor. Always safe to call; falls
 * through to the identity function for clean inputs.
 *
 * Runs in this order:
 *   1. Vernacular cleanup (cant → can't)
 *   2. Question flattening (for DDXPlus)
 *   3. Abbreviation expansion (CP → chest pain)
 *   4. Narrative keyword extraction (for case-report prose)
 *
 * The output is always a superset of the input semantically — we APPEND
 * canonical forms, never replace.
 */
export function preprocessCC(input: string | undefined | null): CCPreprocessResult {
  const original = input || '';
  if (!original) {
    return { processed: '', original, expandedAbbrev: false, extractedNarrative: false, flattenedQuestions: false };
  }

  const cleaned = cleanVernacular(original);
  const flattened = flattenQuestions(cleaned);
  const flattenedQuestions = flattened !== cleaned;

  const expanded = expandAbbreviations(flattened);
  const expandedAbbrev = expanded !== flattened;

  const narrativeExtracted = extractFromNarrative(expanded);
  const extractedNarrative = narrativeExtracted !== expanded;

  return {
    processed: narrativeExtracted,
    original,
    expandedAbbrev,
    extractedNarrative,
    flattenedQuestions,
  };
}

/**
 * Quick tracer — reports what changed. Useful for logging.
 */
export function describePreprocess(r: CCPreprocessResult): string {
  const steps: string[] = [];
  if (r.flattenedQuestions) steps.push('questions');
  if (r.expandedAbbrev) steps.push('abbrev');
  if (r.extractedNarrative) steps.push('narrative');
  return steps.length ? steps.join('+') : 'none';
}
