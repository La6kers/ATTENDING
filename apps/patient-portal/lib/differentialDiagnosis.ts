// =============================================================================
// ATTENDING AI — Rule-Based Differential Diagnosis Generator
// apps/patient-portal/lib/differentialDiagnosis.ts
//
// Client-side differential diagnosis for standalone COMPASS demo.
// Maps chief complaint keywords + HPI patterns to likely diagnoses.
// NOT a diagnostic tool — provides AI-suggested considerations only.
// =============================================================================

export interface DifferentialDx {
  name: string;
  probability: number;
  icd10Code: string;
  supportingEvidence: string[];
  category: string;
}

interface HPIInput {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  timing?: string;
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
}

// Keyword-to-diagnosis mapping rules
const DIAGNOSIS_RULES: Array<{
  keywords: RegExp;
  diagnoses: Array<{
    name: string;
    icd10: string;
    category: string;
    baseProbability: number;
    boostConditions?: Array<{ field: keyof HPIInput; pattern: RegExp; boost: number }>;
  }>;
}> = [
  {
    keywords: /chest\s*pain|chest\s*tight|chest\s*pressure|substernal/i,
    diagnoses: [
      {
        name: 'Acute Coronary Syndrome',
        icd10: 'I21.9',
        category: 'Cardiovascular',
        baseProbability: 35,
        boostConditions: [
          { field: 'character', pattern: /pressure|squeezing|crushing|heavy/i, boost: 15 },
          { field: 'severity', pattern: /.*/, boost: 0 }, // handled specially
          { field: 'associated', pattern: /sweat|diaphoresis|nausea|shortness|breath|jaw|arm/i, boost: 20 },
        ],
      },
      {
        name: 'Musculoskeletal Chest Pain',
        icd10: 'M79.3',
        category: 'Musculoskeletal',
        baseProbability: 25,
        boostConditions: [
          { field: 'character', pattern: /sharp|stabbing|localized|point/i, boost: 15 },
          { field: 'aggravating', pattern: /movement|touch|press|breath/i, boost: 10 },
        ],
      },
      {
        name: 'Gastroesophageal Reflux Disease',
        icd10: 'K21.0',
        category: 'Gastrointestinal',
        baseProbability: 20,
        boostConditions: [
          { field: 'character', pattern: /burn|acid|heartburn/i, boost: 20 },
          { field: 'aggravating', pattern: /eat|food|lying|meal/i, boost: 10 },
          { field: 'relieving', pattern: /antacid|tums|medication/i, boost: 10 },
        ],
      },
      {
        name: 'Pulmonary Embolism',
        icd10: 'I26.99',
        category: 'Pulmonary',
        baseProbability: 10,
        boostConditions: [
          { field: 'onset', pattern: /sudden/i, boost: 15 },
          { field: 'associated', pattern: /shortness|breath|cough|leg\s*swell/i, boost: 10 },
        ],
      },
      {
        name: 'Anxiety / Panic Disorder',
        icd10: 'F41.0',
        category: 'Psychiatric',
        baseProbability: 10,
        boostConditions: [
          { field: 'associated', pattern: /anxious|panic|tingle|numb|dizz/i, boost: 15 },
        ],
      },
    ],
  },
  {
    keywords: /headache|head\s*pain|migraine|head\s*ache/i,
    diagnoses: [
      {
        name: 'Tension-Type Headache',
        icd10: 'G44.209',
        category: 'Neurological',
        baseProbability: 40,
        boostConditions: [
          { field: 'character', pattern: /pressure|band|tight|dull|aching/i, boost: 15 },
          { field: 'location', pattern: /bilateral|both|forehead|temple/i, boost: 10 },
        ],
      },
      {
        name: 'Migraine',
        icd10: 'G43.909',
        category: 'Neurological',
        baseProbability: 30,
        boostConditions: [
          { field: 'character', pattern: /throb|pulse|pound/i, boost: 15 },
          { field: 'associated', pattern: /nausea|vomit|light|sound|aura/i, boost: 15 },
          { field: 'location', pattern: /one\s*side|unilateral|left|right/i, boost: 10 },
        ],
      },
      {
        name: 'Subarachnoid Hemorrhage',
        icd10: 'I60.9',
        category: 'Neurological Emergency',
        baseProbability: 5,
        boostConditions: [
          { field: 'onset', pattern: /sudden|worst|thunder/i, boost: 30 },
          { field: 'associated', pattern: /stiff\s*neck|vomit|confus|vision/i, boost: 20 },
        ],
      },
      {
        name: 'Sinusitis',
        icd10: 'J01.90',
        category: 'ENT',
        baseProbability: 15,
        boostConditions: [
          { field: 'location', pattern: /face|sinus|forehead|cheek/i, boost: 15 },
          { field: 'associated', pattern: /congestion|nasal|drain|fever/i, boost: 10 },
        ],
      },
      {
        name: 'Meningitis',
        icd10: 'G03.9',
        category: 'Infectious Emergency',
        baseProbability: 5,
        boostConditions: [
          { field: 'associated', pattern: /fever|stiff\s*neck|light|rash|confus/i, boost: 25 },
        ],
      },
    ],
  },
  {
    keywords: /abdom|stomach|belly|abdomen|gut\s*pain/i,
    diagnoses: [
      {
        name: 'Acute Gastritis',
        icd10: 'K29.00',
        category: 'Gastrointestinal',
        baseProbability: 30,
        boostConditions: [
          { field: 'location', pattern: /upper|epigast/i, boost: 10 },
          { field: 'aggravating', pattern: /eat|food|spicy|alcohol/i, boost: 15 },
        ],
      },
      {
        name: 'Appendicitis',
        icd10: 'K35.80',
        category: 'Surgical Emergency',
        baseProbability: 15,
        boostConditions: [
          { field: 'location', pattern: /right\s*lower|rlq|right\s*side/i, boost: 25 },
          { field: 'associated', pattern: /nausea|vomit|fever|appetite/i, boost: 15 },
        ],
      },
      {
        name: 'Cholecystitis',
        icd10: 'K81.0',
        category: 'Gastrointestinal',
        baseProbability: 15,
        boostConditions: [
          { field: 'location', pattern: /right\s*upper|ruq|right\s*side/i, boost: 20 },
          { field: 'aggravating', pattern: /fat|greasy|eat|meal/i, boost: 15 },
        ],
      },
      {
        name: 'Irritable Bowel Syndrome',
        icd10: 'K58.9',
        category: 'Gastrointestinal',
        baseProbability: 20,
        boostConditions: [
          { field: 'character', pattern: /cramp|spasm|bloat/i, boost: 15 },
          { field: 'associated', pattern: /diarrhea|constipat|bloat|gas/i, boost: 10 },
        ],
      },
      {
        name: 'Small Bowel Obstruction',
        icd10: 'K56.60',
        category: 'Surgical Emergency',
        baseProbability: 5,
        boostConditions: [
          { field: 'associated', pattern: /vomit|constipat|bloat|no\s*bowel/i, boost: 20 },
          { field: 'character', pattern: /cramp|wave|colicky/i, boost: 10 },
        ],
      },
    ],
  },
  {
    keywords: /cough|shortness.*breath|breath|wheez|respiratory/i,
    diagnoses: [
      {
        name: 'Upper Respiratory Infection',
        icd10: 'J06.9',
        category: 'Infectious',
        baseProbability: 35,
        boostConditions: [
          { field: 'associated', pattern: /sore\s*throat|runny|congestion|sneez/i, boost: 15 },
          { field: 'onset', pattern: /few\s*days|gradual/i, boost: 5 },
        ],
      },
      {
        name: 'Community-Acquired Pneumonia',
        icd10: 'J18.9',
        category: 'Infectious',
        baseProbability: 20,
        boostConditions: [
          { field: 'associated', pattern: /fever|chills|sputum|phlegm/i, boost: 15 },
          { field: 'character', pattern: /product|wet|yellow|green/i, boost: 10 },
        ],
      },
      {
        name: 'Asthma Exacerbation',
        icd10: 'J45.901',
        category: 'Pulmonary',
        baseProbability: 20,
        boostConditions: [
          { field: 'character', pattern: /wheez|tight|can't\s*breath/i, boost: 15 },
          { field: 'aggravating', pattern: /exert|exercise|cold|allerg/i, boost: 10 },
        ],
      },
      {
        name: 'Acute Bronchitis',
        icd10: 'J20.9',
        category: 'Infectious',
        baseProbability: 15,
        boostConditions: [
          { field: 'duration', pattern: /week|days/i, boost: 10 },
        ],
      },
      {
        name: 'Pulmonary Embolism',
        icd10: 'I26.99',
        category: 'Pulmonary Emergency',
        baseProbability: 5,
        boostConditions: [
          { field: 'onset', pattern: /sudden/i, boost: 20 },
          { field: 'associated', pattern: /chest|leg|swell|calf/i, boost: 15 },
        ],
      },
    ],
  },
];

// Default fallback for unrecognized complaints
const GENERIC_DIAGNOSES: DifferentialDx[] = [
  { name: 'Unspecified condition — requires clinical evaluation', probability: 50, icd10Code: 'R69', supportingEvidence: ['Complaint requires in-person assessment'], category: 'General' },
  { name: 'Functional disorder', probability: 25, icd10Code: 'F45.9', supportingEvidence: ['Consider after organic causes excluded'], category: 'General' },
  { name: 'Anxiety-related somatic symptoms', probability: 15, icd10Code: 'F41.1', supportingEvidence: ['Consider psychosocial factors'], category: 'Psychiatric' },
];

export function generateDifferentialDiagnosis(
  chiefComplaint: string,
  hpi: HPIInput,
  redFlags: Array<{ symptom: string }>,
): DifferentialDx[] {
  if (!chiefComplaint) return GENERIC_DIAGNOSES;

  // Find matching rule set
  const matchingRule = DIAGNOSIS_RULES.find(rule => rule.keywords.test(chiefComplaint));

  if (!matchingRule) return GENERIC_DIAGNOSES;

  // Calculate probabilities with boosts
  const results: DifferentialDx[] = matchingRule.diagnoses.map(dx => {
    let probability = dx.baseProbability;
    const evidence: string[] = [];

    if (dx.boostConditions) {
      for (const condition of dx.boostConditions) {
        const fieldValue = hpi[condition.field];
        if (fieldValue === undefined || fieldValue === null) continue;

        if (condition.field === 'severity' && typeof fieldValue === 'number') {
          if (fieldValue >= 7) {
            probability += 10;
            evidence.push(`High severity (${fieldValue}/10)`);
          }
          continue;
        }

        const textValue = Array.isArray(fieldValue) ? fieldValue.join(' ') : String(fieldValue);
        if (condition.pattern.test(textValue)) {
          probability += condition.boost;
          evidence.push(textValue);
        }
      }
    }

    // Boost for red flags matching the category
    if (redFlags.length > 0) {
      if (dx.category.includes('Emergency')) {
        probability += 15;
        evidence.push('Red flag(s) detected');
      }
    }

    return {
      name: dx.name,
      probability: Math.min(probability, 95), // Cap at 95%
      icd10Code: dx.icd10,
      supportingEvidence: evidence.length > 0 ? evidence : ['Based on chief complaint pattern'],
      category: dx.category,
    };
  });

  // Sort by probability descending and normalize
  results.sort((a, b) => b.probability - a.probability);

  // Normalize so they sum to ~100
  const total = results.reduce((sum, r) => sum + r.probability, 0);
  if (total > 0) {
    results.forEach(r => {
      r.probability = Math.round((r.probability / total) * 100);
    });
  }

  return results;
}
