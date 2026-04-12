// =============================================================================
// COMPASS Smart Question Skip Logic
// apps/patient-portal/lib/compassSkipLogic.ts
//
// Determines which Review of Systems (ROS) questions to ask based on the
// patient's chief complaint and reported symptoms. Skips irrelevant body
// systems to reduce assessment time while maintaining clinical thoroughness.
//
// Each complaint category maps to:
//   - relevantSystems: always asked (core to the differential diagnosis)
//   - conditionalSystems: asked only if a trigger term is detected
//   - skipSystems: skipped unless unlocked by a new symptom
//
// Estimated time savings are based on ~45 seconds per ROS system question.
// =============================================================================
//
// TODO(SECURITY): This skip-logic module encodes clinically-driven ROS
// branching rules and is currently bundled client-side. While the UX
// branching itself can remain client-side for responsiveness, the underlying
// clinical mappings (relevantSystems per complaint, conditional triggers)
// constitute proprietary clinical logic. Consider serving the rules as a
// server-side configuration endpoint so they are not statically compiled
// into the browser bundle.
// =============================================================================

// =============================================================================
// Types
// =============================================================================

/** All body systems covered in the Review of Systems */
export type ROSSystem =
  | 'constitutional'
  | 'HEENT'
  | 'cardiovascular'
  | 'respiratory'
  | 'gastrointestinal'
  | 'urinary'
  | 'reproductive'
  | 'musculoskeletal'
  | 'neurological'
  | 'psychiatric'
  | 'dermatologic'
  | 'infectious';

export const ALL_ROS_SYSTEMS: ROSSystem[] = [
  'constitutional',
  'HEENT',
  'cardiovascular',
  'respiratory',
  'gastrointestinal',
  'urinary',
  'reproductive',
  'musculoskeletal',
  'neurological',
  'psychiatric',
  'dermatologic',
  'infectious',
];

/** Configuration for a single complaint category */
export interface SkipConfig {
  complaintCategory: string;
  relevantSystems: ROSSystem[];
  conditionalSystems: Record<string, ROSSystem[]>;
  skipSystems: ROSSystem[];
}

/** Result of determining which systems to ask about */
export interface RelevantSystemsResult {
  ask: ROSSystem[];
  skip: ROSSystem[];
  reason: Record<string, string>;
}

/** Result of checking whether a new symptom unlocks skipped systems */
export interface UnlockResult {
  unlock: ROSSystem[];
  reason: string;
}

/** Time savings estimate for a complaint category */
export interface TimeSavingsEstimate {
  category: string;
  skippedCount: number;
  estimatedSecondsSaved: number;
  estimatedMinutesSaved: number;
  summary: string;
}

// =============================================================================
// Constants
// =============================================================================

const SECONDS_PER_ROS_QUESTION = 45;

// =============================================================================
// Complaint Category Configurations
// =============================================================================

const SKIP_CONFIGS: Record<string, SkipConfig> = {
  headache: {
    complaintCategory: 'headache',
    relevantSystems: ['neurological', 'constitutional', 'HEENT', 'cardiovascular'],
    conditionalSystems: {
      fever: ['infectious'],
      neck: ['musculoskeletal'],
      nausea: ['gastrointestinal'],
      vision: ['HEENT'],
      stress: ['psychiatric'],
      rash: ['dermatologic', 'infectious'],
    },
    skipSystems: ['urinary', 'reproductive', 'dermatologic', 'musculoskeletal'],
  },

  'chest pain': {
    complaintCategory: 'chest pain',
    relevantSystems: ['cardiovascular', 'respiratory', 'constitutional', 'gastrointestinal'],
    conditionalSystems: {
      anxiety: ['psychiatric'],
      radiating: ['musculoskeletal'],
      rash: ['dermatologic'],
      fever: ['infectious'],
      numbness: ['neurological'],
    },
    skipSystems: ['urinary', 'dermatologic', 'neurological', 'reproductive'],
  },

  'abdominal pain': {
    complaintCategory: 'abdominal pain',
    relevantSystems: ['gastrointestinal', 'urinary', 'constitutional', 'reproductive'],
    conditionalSystems: {
      fever: ['infectious'],
      rash: ['dermatologic'],
      back: ['musculoskeletal'],
      dizziness: ['neurological', 'cardiovascular'],
    },
    skipSystems: ['neurological', 'HEENT', 'dermatologic', 'musculoskeletal'],
  },

  respiratory: {
    complaintCategory: 'respiratory',
    relevantSystems: ['respiratory', 'constitutional', 'cardiovascular', 'HEENT'],
    conditionalSystems: {
      fever: ['infectious'],
      chest: ['cardiovascular'],
      rash: ['dermatologic', 'infectious'],
      anxiety: ['psychiatric'],
    },
    skipSystems: ['urinary', 'reproductive', 'dermatologic', 'musculoskeletal'],
  },

  'back pain': {
    complaintCategory: 'back pain',
    relevantSystems: ['musculoskeletal', 'neurological', 'urinary', 'constitutional'],
    conditionalSystems: {
      fever: ['infectious'],
      abdominal: ['gastrointestinal'],
      numbness: ['neurological'],
      weakness: ['neurological'],
    },
    skipSystems: ['HEENT', 'dermatologic', 'reproductive', 'gastrointestinal'],
  },

  'mental health': {
    complaintCategory: 'mental health',
    relevantSystems: ['psychiatric', 'neurological', 'constitutional'],
    conditionalSystems: {
      headache: ['HEENT', 'neurological'],
      chest: ['cardiovascular'],
      appetite: ['gastrointestinal'],
      sleep: ['neurological'],
      pain: ['musculoskeletal'],
    },
    skipSystems: ['HEENT', 'cardiovascular', 'respiratory', 'gastrointestinal', 'urinary', 'dermatologic'],
  },

  'skin/rash': {
    complaintCategory: 'skin/rash',
    relevantSystems: ['dermatologic', 'constitutional', 'infectious'],
    conditionalSystems: {
      joint: ['musculoskeletal'],
      fever: ['infectious'],
      breathing: ['respiratory'],
      swelling: ['cardiovascular'],
    },
    skipSystems: ['neurological', 'cardiovascular', 'respiratory', 'urinary'],
  },

  'general/other': {
    complaintCategory: 'general/other',
    relevantSystems: [...ALL_ROS_SYSTEMS],
    conditionalSystems: {},
    skipSystems: [],
  },
};

// =============================================================================
// Complaint Detection Patterns
// =============================================================================

/**
 * Patterns used to classify free-text chief complaints into categories.
 * Order matters: more specific patterns are checked first.
 */
const COMPLAINT_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: 'chest pain',
    patterns: [
      /chest\s*(pain|tight|pressure|discomfort|ache|squeeze|heavy)/i,
      /pain\s*(in|around|near)\s*(my\s*)?chest/i,
      /heart\s*(pain|ache|palpitat)/i,
    ],
  },
  {
    category: 'headache',
    patterns: [
      /head\s*ache/i,
      /headache/i,
      /migraine/i,
      /head\s*(pain|pressure|throbbing|pounding)/i,
      /pain\s*(in|around|behind)\s*(my\s*)?(head|eye|temple|forehead)/i,
    ],
  },
  {
    category: 'abdominal pain',
    patterns: [
      /abdominal?\s*(pain|cramp|ache|discomfort)/i,
      /stomach\s*(pain|ache|cramp|hurt|upset)/i,
      /belly\s*(pain|ache|cramp|hurt)/i,
      /pain\s*(in|around)\s*(my\s*)?(abdomen|stomach|belly|gut)/i,
      /nausea|vomit|diarrhea|constipat/i,
    ],
  },
  {
    category: 'respiratory',
    patterns: [
      /breath|breathing/i,
      /cough/i,
      /wheez/i,
      /short(ness)?\s*(of\s*)?breath/i,
      /can'?t\s*breathe/i,
      /congestion/i,
      /sinus/i,
      /pneumonia/i,
      /asthma/i,
    ],
  },
  {
    category: 'back pain',
    patterns: [
      /back\s*(pain|ache|hurt|spasm|stiff)/i,
      /pain\s*(in|around)\s*(my\s*)?(back|spine|lower\s*back|upper\s*back)/i,
      /sciatica/i,
      /lumbar/i,
    ],
  },
  {
    category: 'mental health',
    patterns: [
      /depress/i,
      /anxiety|anxious/i,
      /panic\s*attack/i,
      /stress|stressed/i,
      /can'?t\s*sleep|insomnia/i,
      /feeling\s*(sad|down|hopeless|overwhelmed|worried)/i,
      /mental\s*health/i,
      /mood/i,
    ],
  },
  {
    category: 'skin/rash',
    patterns: [
      /rash/i,
      /skin\s*(rash|itch|bump|lesion|irritat|red|break)/i,
      /hives/i,
      /eczema/i,
      /dermatit/i,
      /itch(y|ing)?/i,
      /acne/i,
    ],
  },
];

// =============================================================================
// Symptom-to-System Unlock Mapping
// =============================================================================

/**
 * Maps symptom keywords to the body systems they should unlock.
 * Used when a patient mentions a new symptom mid-assessment that
 * suggests a previously-skipped system should be explored.
 */
const SYMPTOM_UNLOCK_MAP: Record<string, ROSSystem[]> = {
  // Constitutional triggers
  fever: ['constitutional', 'infectious'],
  chills: ['constitutional', 'infectious'],
  fatigue: ['constitutional'],
  'weight loss': ['constitutional', 'gastrointestinal'],
  'night sweats': ['constitutional', 'infectious'],

  // HEENT triggers
  'sore throat': ['HEENT', 'infectious'],
  'ear pain': ['HEENT'],
  'vision change': ['HEENT', 'neurological'],
  'runny nose': ['HEENT', 'respiratory'],
  congestion: ['HEENT', 'respiratory'],

  // Cardiovascular triggers
  palpitations: ['cardiovascular'],
  'chest tightness': ['cardiovascular', 'respiratory'],
  edema: ['cardiovascular'],
  swelling: ['cardiovascular'],

  // Respiratory triggers
  cough: ['respiratory'],
  wheezing: ['respiratory'],
  'shortness of breath': ['respiratory', 'cardiovascular'],

  // GI triggers
  nausea: ['gastrointestinal'],
  vomiting: ['gastrointestinal'],
  diarrhea: ['gastrointestinal'],
  constipation: ['gastrointestinal'],
  bloating: ['gastrointestinal'],

  // Urinary triggers
  'frequent urination': ['urinary'],
  'painful urination': ['urinary', 'infectious'],
  'blood in urine': ['urinary'],
  incontinence: ['urinary'],

  // Reproductive triggers
  'pelvic pain': ['reproductive', 'urinary'],
  discharge: ['reproductive', 'infectious'],
  'menstrual changes': ['reproductive'],

  // Musculoskeletal triggers
  'joint pain': ['musculoskeletal'],
  stiffness: ['musculoskeletal'],
  weakness: ['musculoskeletal', 'neurological'],
  spasm: ['musculoskeletal'],
  swollen: ['musculoskeletal', 'cardiovascular'],

  // Neurological triggers
  numbness: ['neurological'],
  tingling: ['neurological'],
  dizziness: ['neurological', 'cardiovascular'],
  seizure: ['neurological'],
  confusion: ['neurological'],
  'memory loss': ['neurological', 'psychiatric'],

  // Psychiatric triggers
  anxiety: ['psychiatric'],
  depression: ['psychiatric'],
  insomnia: ['psychiatric', 'neurological'],
  'mood changes': ['psychiatric'],

  // Dermatologic triggers
  rash: ['dermatologic', 'infectious'],
  itching: ['dermatologic'],
  bruising: ['dermatologic'],
  'skin changes': ['dermatologic'],

  // Infectious triggers
  'sore throat': ['infectious', 'HEENT'],
  'swollen glands': ['infectious'],
  exposure: ['infectious'],
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Classifies a free-text chief complaint into one of the known categories.
 * Returns 'general/other' if no specific pattern matches.
 */
export function classifyComplaint(chiefComplaint: string): string {
  const normalized = chiefComplaint.toLowerCase().trim();

  for (const { category, patterns } of COMPLAINT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return category;
      }
    }
  }

  return 'general/other';
}

/**
 * Determines which ROS systems to ask about and which to skip, based on
 * the chief complaint and any symptoms already reported by the patient.
 *
 * @param chiefComplaint - The patient's free-text chief complaint
 * @param reportedSymptoms - Array of symptoms already mentioned (from HPI, etc.)
 * @returns Object with `ask`, `skip`, and `reason` maps
 */
export function getRelevantSystems(
  chiefComplaint: string,
  reportedSymptoms: string[] = []
): RelevantSystemsResult {
  const category = classifyComplaint(chiefComplaint);
  const config = SKIP_CONFIGS[category] || SKIP_CONFIGS['general/other'];

  const ask = new Set<ROSSystem>(config.relevantSystems);
  const reason: Record<string, string> = {};

  // Mark relevant systems with reason
  for (const sys of config.relevantSystems) {
    reason[sys] = `Core system for ${category} evaluation`;
  }

  // Check conditional systems against reported symptoms
  const allText = [chiefComplaint, ...reportedSymptoms].join(' ').toLowerCase();

  for (const [trigger, systems] of Object.entries(config.conditionalSystems)) {
    if (allText.includes(trigger.toLowerCase())) {
      for (const sys of systems) {
        ask.add(sys);
        reason[sys] = `Unlocked by trigger term: "${trigger}"`;
      }
    }
  }

  // Determine final skip list (skip only what's still not in ask)
  const skip: ROSSystem[] = [];
  for (const sys of ALL_ROS_SYSTEMS) {
    if (!ask.has(sys)) {
      skip.push(sys);
      if (!reason[sys]) {
        reason[sys] = `Not indicated for ${category}; skipped to save time`;
      }
    }
  }

  return {
    ask: Array.from(ask),
    skip,
    reason,
  };
}

/**
 * Checks if a newly reported symptom should unlock any previously skipped
 * ROS systems. This allows the assessment to dynamically re-include
 * systems that become relevant as more information is gathered.
 *
 * @param newSymptom - A newly reported symptom string
 * @param currentlySkipped - Array of system names currently being skipped
 * @returns An UnlockResult if systems should be unlocked, or null
 */
export function shouldUnlockSystem(
  newSymptom: string,
  currentlySkipped: string[]
): UnlockResult | null {
  const normalized = newSymptom.toLowerCase().trim();
  const unlocked = new Set<ROSSystem>();
  const triggers: string[] = [];

  // Check each symptom keyword for matches
  for (const [keyword, systems] of Object.entries(SYMPTOM_UNLOCK_MAP)) {
    if (normalized.includes(keyword.toLowerCase())) {
      for (const sys of systems) {
        if (currentlySkipped.includes(sys)) {
          unlocked.add(sys);
          triggers.push(keyword);
        }
      }
    }
  }

  if (unlocked.size === 0) {
    return null;
  }

  const uniqueTriggers = [...new Set(triggers)];
  return {
    unlock: Array.from(unlocked),
    reason: `Patient mentioned "${uniqueTriggers.join(', ')}" which indicates ${Array.from(unlocked).join(', ')} should be assessed`,
  };
}

// =============================================================================
// Time Savings Estimation
// =============================================================================

/**
 * Calculates the estimated time savings for a given complaint category.
 */
export function getTimeSavings(chiefComplaint: string): TimeSavingsEstimate {
  const category = classifyComplaint(chiefComplaint);
  const result = getRelevantSystems(chiefComplaint);
  const skippedCount = result.skip.length;
  const secondsSaved = skippedCount * SECONDS_PER_ROS_QUESTION;
  const minutesSaved = Math.round((secondsSaved / 60) * 10) / 10;

  return {
    category,
    skippedCount,
    estimatedSecondsSaved: secondsSaved,
    estimatedMinutesSaved: minutesSaved,
    summary: `${category}: skips ${skippedCount} system${skippedCount !== 1 ? 's' : ''} x ~${SECONDS_PER_ROS_QUESTION}s each = ~${minutesSaved} min saved`,
  };
}

/**
 * Pre-computed time savings estimates for all complaint categories.
 * Useful for display in admin dashboards or analytics.
 */
export const TIME_SAVINGS_BY_CATEGORY: Record<string, TimeSavingsEstimate> = {
  headache: {
    category: 'headache',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'headache: skips 4 systems x ~45s each = ~3 min saved',
  },
  'chest pain': {
    category: 'chest pain',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'chest pain: skips 4 systems x ~45s each = ~3 min saved',
  },
  'abdominal pain': {
    category: 'abdominal pain',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'abdominal pain: skips 4 systems x ~45s each = ~3 min saved',
  },
  respiratory: {
    category: 'respiratory',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'respiratory: skips 4 systems x ~45s each = ~3 min saved',
  },
  'back pain': {
    category: 'back pain',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'back pain: skips 4 systems x ~45s each = ~3 min saved',
  },
  'mental health': {
    category: 'mental health',
    skippedCount: 6,
    estimatedSecondsSaved: 270,
    estimatedMinutesSaved: 4.5,
    summary: 'mental health: skips 6 systems x ~45s each = ~4.5 min saved',
  },
  'skin/rash': {
    category: 'skin/rash',
    skippedCount: 4,
    estimatedSecondsSaved: 180,
    estimatedMinutesSaved: 3,
    summary: 'skin/rash: skips 4 systems x ~45s each = ~3 min saved',
  },
  'general/other': {
    category: 'general/other',
    skippedCount: 0,
    estimatedSecondsSaved: 0,
    estimatedMinutesSaved: 0,
    summary: 'general/other: no systems skipped (full ROS)',
  },
};

// =============================================================================
// Utility: Get the SkipConfig for a complaint (for external inspection)
// =============================================================================

/**
 * Returns the raw SkipConfig for a given complaint, useful for debugging
 * or displaying the skip logic rationale to clinicians.
 */
export function getSkipConfig(chiefComplaint: string): SkipConfig {
  const category = classifyComplaint(chiefComplaint);
  return SKIP_CONFIGS[category] || SKIP_CONFIGS['general/other'];
}

/**
 * Returns all available complaint categories and their configs.
 */
export function getAllSkipConfigs(): Record<string, SkipConfig> {
  return { ...SKIP_CONFIGS };
}
