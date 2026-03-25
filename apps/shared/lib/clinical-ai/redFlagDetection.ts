// =============================================================================
// ATTENDING AI - Red Flag Detection
// apps/shared/lib/clinical-ai/redFlagDetection.ts
//
// Emergency and critical condition detection based on clinical criteria
// =============================================================================

import {
  RedFlag, RedFlagMatch, RedFlagEvaluation, RedFlagSeverity, RedFlagCategory,
  PatientContext, ClinicalAssessment, VitalSigns, Symptom,
} from './types';

// Re-export types that other modules need
export type { RedFlagEvaluation, RedFlagMatch, RedFlagSeverity, RedFlagCategory };

// =============================================================================
// Red Flag Definitions
// =============================================================================

export const RED_FLAGS: RedFlag[] = [
  // Cardiovascular
  {
    id: 'rf-chest-pain-cardiac',
    name: 'Acute Coronary Syndrome',
    description: 'Chest pain with cardiac features suggesting MI or unstable angina',
    severity: 'critical',
    category: 'cardiovascular',
    triggerCriteria: [
      'chest pain radiating to arm, jaw, or back',
      'chest pain with diaphoresis',
      'chest pain with shortness of breath',
      'crushing or pressure-like chest pain',
      'chest pain with nausea or vomiting',
      'history of CAD with new chest pain',
    ],
    recommendedAction: 'Activate chest pain protocol. Obtain ECG within 10 minutes. Consider STEMI activation.',
    timeframe: 'immediate',
    icdCodes: ['I21', 'I20.0'],
  },
  {
    id: 'rf-stroke',
    name: 'Acute Stroke',
    description: 'Signs and symptoms suggestive of acute cerebrovascular event',
    severity: 'critical',
    category: 'neurological',
    triggerCriteria: [
      'sudden onset facial droop',
      'sudden arm or leg weakness',
      'sudden speech difficulty or slurred speech',
      'sudden vision changes',
      'sudden severe headache',
      'sudden confusion or altered mental status',
      'sudden difficulty walking or loss of balance',
    ],
    recommendedAction: 'Activate stroke protocol. Establish last known well time. CT head without contrast STAT.',
    timeframe: 'immediate',
    icdCodes: ['I63', 'I61'],
  },
  {
    id: 'rf-sepsis',
    name: 'Sepsis / Septic Shock',
    description: 'Signs of systemic infection with organ dysfunction',
    severity: 'critical',
    category: 'infectious',
    triggerCriteria: [
      'fever with hypotension',
      'suspected infection with altered mental status',
      'fever with tachycardia and tachypnea',
      'suspected infection with lactate > 2',
      'fever with signs of organ dysfunction',
      'immunocompromised with fever',
    ],
    recommendedAction: 'Initiate sepsis bundle. Blood cultures x2, lactate, broad-spectrum antibiotics within 1 hour. IV fluid resuscitation.',
    timeframe: 'immediate',
    icdCodes: ['A41.9', 'R65.20', 'R65.21'],
  },
  {
    id: 'rf-respiratory-distress',
    name: 'Acute Respiratory Failure',
    description: 'Signs of impending respiratory failure requiring immediate intervention',
    severity: 'critical',
    category: 'respiratory',
    triggerCriteria: [
      'oxygen saturation < 90% on room air',
      'severe shortness of breath at rest',
      'use of accessory muscles',
      'inability to speak in full sentences',
      'cyanosis',
      'respiratory rate > 30',
      'altered mental status with respiratory symptoms',
    ],
    recommendedAction: 'Supplemental oxygen, prepare for possible intubation, ABG, chest X-ray STAT.',
    timeframe: 'immediate',
    icdCodes: ['J96.0', 'J96.9'],
  },
  {
    id: 'rf-anaphylaxis',
    name: 'Anaphylaxis',
    description: 'Severe allergic reaction with systemic involvement',
    severity: 'critical',
    category: 'other',
    triggerCriteria: [
      'allergic reaction with hypotension',
      'allergic reaction with airway swelling',
      'allergic reaction with difficulty breathing',
      'hives with wheezing',
      'rapid onset multi-system allergic symptoms',
      'known allergen exposure with systemic symptoms',
    ],
    recommendedAction: 'Epinephrine IM immediately. Airway management. IV access, fluids. H1/H2 blockers, steroids.',
    timeframe: 'immediate',
    icdCodes: ['T78.2'],
  },
  {
    id: 'rf-gi-bleed',
    name: 'Acute GI Hemorrhage',
    description: 'Signs of significant gastrointestinal bleeding',
    severity: 'critical',
    category: 'other',
    triggerCriteria: [
      'hematemesis (vomiting blood)',
      'melena (black tarry stools)',
      'hematochezia with hemodynamic instability',
      'GI bleeding with syncope',
      'GI bleeding with tachycardia',
      'GI bleeding with hypotension',
    ],
    recommendedAction: 'Large bore IV access x2, type and crossmatch, GI consult, consider ICU admission.',
    timeframe: 'immediate',
    icdCodes: ['K92.2', 'K92.0', 'K92.1'],
  },
  {
    id: 'rf-suicidal-ideation',
    name: 'Suicidal Ideation with Plan',
    description: 'Active suicidal thoughts with intent or plan',
    severity: 'critical',
    category: 'psychiatric',
    triggerCriteria: [
      'suicidal ideation with plan',
      'suicidal ideation with intent',
      'recent suicide attempt',
      'suicidal ideation with access to means',
      'command hallucinations to harm self',
    ],
    recommendedAction: 'Immediate psychiatric evaluation. 1:1 observation. Remove access to means. Safety contract if appropriate.',
    timeframe: 'immediate',
    icdCodes: ['R45.851'],
  },
  {
    id: 'rf-meningitis',
    name: 'Suspected Meningitis',
    description: 'Clinical features suggestive of meningitis or encephalitis',
    severity: 'critical',
    category: 'infectious',
    triggerCriteria: [
      'fever with severe headache and neck stiffness',
      'fever with altered mental status',
      'fever with photophobia',
      'fever with petechial rash',
      'headache with nuchal rigidity',
      'Kernig or Brudzinski sign positive',
    ],
    recommendedAction: 'Blood cultures, lumbar puncture (if safe), empiric antibiotics immediately. Consider dexamethasone.',
    timeframe: 'immediate',
    icdCodes: ['G00.9', 'G03.9'],
  },
  // High severity (urgent)
  {
    id: 'rf-pulmonary-embolism',
    name: 'Suspected Pulmonary Embolism',
    description: 'Clinical features suggestive of pulmonary embolism',
    severity: 'high',
    category: 'respiratory',
    triggerCriteria: [
      'sudden onset shortness of breath',
      'pleuritic chest pain',
      'hemoptysis',
      'recent surgery or immobilization with dyspnea',
      'known DVT with respiratory symptoms',
      'tachycardia with hypoxia',
      'unilateral leg swelling with dyspnea',
    ],
    recommendedAction: 'Calculate Wells score. D-dimer if low probability. CT-PA if moderate/high probability. Anticoagulation if confirmed.',
    timeframe: 'urgent',
    icdCodes: ['I26.9'],
  },
  {
    id: 'rf-appendicitis',
    name: 'Suspected Appendicitis',
    description: 'Clinical features suggestive of acute appendicitis',
    severity: 'high',
    category: 'other',
    triggerCriteria: [
      'right lower quadrant pain',
      'periumbilical pain migrating to RLQ',
      'RLQ pain with fever',
      'RLQ pain with anorexia',
      'rebound tenderness in RLQ',
      'positive psoas sign',
      'positive Rovsing sign',
    ],
    recommendedAction: 'NPO, IV fluids, CBC, CRP. CT abdomen/pelvis or ultrasound. Surgical consult.',
    timeframe: 'urgent',
    icdCodes: ['K35.80'],
  },
  {
    id: 'rf-ectopic-pregnancy',
    name: 'Ectopic Pregnancy',
    description: 'Suspected ectopic pregnancy in reproductive-age female',
    severity: 'critical',
    category: 'obstetric',
    triggerCriteria: [
      'abdominal pain with positive pregnancy test',
      'vaginal bleeding with positive pregnancy test',
      'amenorrhea with abdominal pain',
      'shoulder pain in early pregnancy',
      'syncope in early pregnancy',
      'hemodynamic instability in early pregnancy',
    ],
    recommendedAction: 'Quantitative beta-hCG, transvaginal ultrasound, type and screen. OB/GYN consult. Consider surgical emergency if unstable.',
    timeframe: 'immediate',
    icdCodes: ['O00.9'],
  },
  {
    id: 'rf-diabetic-emergency',
    name: 'Diabetic Emergency (DKA/HHS)',
    description: 'Signs of diabetic ketoacidosis or hyperosmolar state',
    severity: 'critical',
    category: 'metabolic',
    triggerCriteria: [
      'known diabetic with altered mental status',
      'blood glucose > 250 with ketones',
      'blood glucose > 600',
      'diabetic with Kussmaul breathing',
      'diabetic with fruity breath odor',
      'diabetic with severe dehydration',
      'new diagnosis diabetes with severe symptoms',
    ],
    recommendedAction: 'IV fluids, insulin drip, electrolyte monitoring (especially potassium), frequent glucose checks. ICU if severe.',
    timeframe: 'immediate',
    icdCodes: ['E11.10', 'E11.00', 'E13.10'],
  },
  {
    id: 'rf-pediatric-fever',
    name: 'Febrile Infant < 60 days',
    description: 'Fever in infant under 60 days requiring full sepsis workup',
    severity: 'high',
    category: 'pediatric',
    triggerCriteria: [
      'infant < 60 days with temperature >= 38C (100.4F)',
      'infant < 60 days appearing ill',
      'neonate with temperature instability',
    ],
    recommendedAction: 'Full sepsis workup: CBC, blood culture, UA, urine culture, LP. Empiric antibiotics. Admission.',
    timeframe: 'urgent',
    icdCodes: ['P81.9', 'R50.9'],
  },
  {
    id: 'rf-testicular-torsion',
    name: 'Testicular Torsion',
    description: 'Suspected testicular torsion requiring emergent evaluation',
    severity: 'critical',
    category: 'other',
    triggerCriteria: [
      'sudden onset severe testicular pain',
      'testicular pain with absent cremasteric reflex',
      'testicular pain with high-riding testicle',
      'testicular pain with nausea/vomiting',
      'adolescent male with acute scrotal pain',
    ],
    recommendedAction: 'Emergent urology consult. Doppler ultrasound if available but should not delay surgery. OR within 6 hours for salvage.',
    timeframe: 'immediate',
    icdCodes: ['N44.0'],
  },
  // Moderate severity
  {
    id: 'rf-dvt',
    name: 'Deep Vein Thrombosis',
    description: 'Signs suggestive of lower extremity DVT',
    severity: 'moderate',
    category: 'cardiovascular',
    triggerCriteria: [
      'unilateral leg swelling',
      'calf pain with warmth',
      'recent immobilization with leg symptoms',
      'malignancy with leg swelling',
      'positive Homans sign',
    ],
    recommendedAction: 'Calculate Wells score. D-dimer if low probability. Lower extremity duplex ultrasound. Anticoagulation if confirmed.',
    timeframe: 'urgent',
    icdCodes: ['I82.40'],
  },
  {
    id: 'rf-cauda-equina',
    name: 'Cauda Equina Syndrome',
    description: 'Neurological emergency affecting lower spine',
    severity: 'critical',
    category: 'neurological',
    triggerCriteria: [
      'back pain with urinary retention',
      'back pain with saddle anesthesia',
      'back pain with fecal incontinence',
      'back pain with bilateral leg weakness',
      'back pain with progressive neurological deficit',
    ],
    recommendedAction: 'Emergent MRI lumbar spine. Neurosurgery consult. Dexamethasone if confirmed. Surgery within 48 hours for best outcomes.',
    timeframe: 'immediate',
    icdCodes: ['G83.4'],
  },
];

// =============================================================================
// Red Flag Detection Functions
// =============================================================================

export function evaluateRedFlags(
  patientContext: PatientContext,
  assessment: ClinicalAssessment
): RedFlagEvaluation {
  const matches: RedFlagMatch[] = [];
  const startTime = Date.now();

  // Extract all text to search through
  const searchableText = buildSearchableText(patientContext, assessment);
  const symptoms = assessment.symptoms;
  const vitals = patientContext.vitals;

  // Evaluate each red flag
  for (const redFlag of RED_FLAGS) {
    const matchResult = evaluateSingleRedFlag(redFlag, searchableText, symptoms, vitals, patientContext);
    if (matchResult) {
      matches.push(matchResult);
    }
  }

  // Sort by severity and confidence
  matches.sort((a, b) => {
    const severityOrder: Record<RedFlagSeverity, number> = { critical: 0, high: 1, moderate: 2 };
    const severityDiff = severityOrder[a.redFlag.severity] - severityOrder[b.redFlag.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });

  // Determine overall severity and disposition
  const overallSeverity = matches.length > 0 ? matches[0].redFlag.severity : null;
  const recommendedDisposition = determineDisposition(matches);
  const summary = generateSummary(matches);

  return {
    hasRedFlags: matches.length > 0,
    matches,
    overallSeverity,
    recommendedDisposition,
    summary,
    evaluatedAt: new Date().toISOString(),
  };
}

function buildSearchableText(
  patientContext: PatientContext,
  assessment: ClinicalAssessment
): string {
  const parts: string[] = [];

  // Chief complaint
  parts.push(assessment.chiefComplaint.complaint.toLowerCase());

  // Symptoms
  for (const symptom of assessment.symptoms) {
    parts.push(symptom.name.toLowerCase());
    if (symptom.quality) parts.push(symptom.quality.toLowerCase());
    if (symptom.location) parts.push(symptom.location.toLowerCase());
    if (symptom.radiation) parts.push(symptom.radiation.toLowerCase());
    if (symptom.associatedSymptoms) {
      parts.push(...symptom.associatedSymptoms.map(s => s.toLowerCase()));
    }
    // Also include aggravatedBy for pleuritic pain detection
    if ((symptom as any).aggravatedBy) {
      parts.push(...(symptom as any).aggravatedBy.map((s: string) => s.toLowerCase()));
    }
  }

  // HPI
  if (assessment.historyOfPresentIllness) {
    parts.push(assessment.historyOfPresentIllness.toLowerCase());
  }

  // Medical history
  if (patientContext.medicalHistory) {
    parts.push(...patientContext.medicalHistory.conditions.map(c => c.toLowerCase()));
  }

  return parts.join(' ');
}

// Medical term synonyms for better detection
const MEDICAL_SYNONYMS: Record<string, string[]> = {
  'hematemesis': ['vomiting blood', 'bloody vomit', 'blood vomit', 'vomit blood', 'throwing up blood'],
  'melena': ['black tarry stools', 'black stools', 'tarry stools', 'dark stools', 'black stool'],
  'hemoptysis': ['coughing blood', 'coughing up blood', 'bloody sputum', 'blood sputum', 'spitting blood'],
  'dyspnea': ['shortness of breath', 'difficulty breathing', 'breathing difficulty', 'short of breath', 'breathless', 'can\'t breathe', 'trouble breathing'],
  'syncope': ['fainting', 'fainted', 'passed out', 'loss of consciousness', 'blacked out'],
  'diaphoresis': ['sweating', 'sweaty', 'cold sweat', 'profuse sweating'],
  'cad': ['coronary artery disease', 'heart disease', 'cardiac history', 'heart problems', 'previous mi', 'prior heart attack', 'stent', 'cabg', 'bypass'],
  'dvt': ['deep vein thrombosis', 'blood clot leg', 'leg clot'],
  'altered mental status': ['confused', 'confusion', 'disoriented', 'lethargic', 'drowsy', 'not alert', 'ams'],
  'fever': ['febrile', 'high temperature', 'temp elevated', 'pyrexia'],
  'infant': ['baby', 'newborn', 'neonate'],
};

function expandWithSynonyms(text: string): string {
  let expanded = text.toLowerCase();
  
  // Add synonyms to searchable text
  for (const [term, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (expanded.includes(synonym)) {
        expanded += ` ${term}`;
      }
    }
    // Also check if the term itself is present to add synonyms
    if (expanded.includes(term)) {
      expanded += ` ${synonyms.join(' ')}`;
    }
  }
  
  return expanded;
}

function evaluateSingleRedFlag(
  redFlag: RedFlag,
  searchableText: string,
  symptoms: Symptom[],
  vitals: VitalSigns | undefined,
  patientContext: PatientContext
): RedFlagMatch | null {
  const matchedCriteria: string[] = [];
  let totalScore = 0;

  // ==========================================================================
  // FALSE POSITIVE PREVENTION
  // Skip critical red flags for benign presentations
  // ==========================================================================

  if (redFlag.severity === 'critical') {
    // Check if ALL symptoms are explicitly MILD (not moderate - moderate could still be serious)
    const allSymptomsMild = symptoms.length > 0 && symptoms.every(s => {
      const sev = ((s as any).severity || '').toLowerCase();
      // Only 'mild' or 'minor' counts as mild. Empty string or 'moderate' don't count.
      return sev === 'mild' || sev === 'minor';
    });

    // Check for mild/minor indicators in text
    const hasMildPrefix = searchableText.includes('mild ') || searchableText.includes('minor ');

    // Check for severe/acute indicators that would override mild classification
    const hasSevereIndicators = searchableText.includes('severe') ||
      searchableText.includes('sudden') || searchableText.includes('crushing') ||
      searchableText.includes('radiating') || searchableText.includes('worst') ||
      searchableText.includes('10/10') || searchableText.includes('unbearable') ||
      searchableText.includes('thunderclap');

    // Common cold pattern check - only skip for clearly benign cold symptoms
    const commonColdPattern = /\b(runny nose|nasal congestion|sneezing|common cold)\b/i;
    const isLikelyCommonCold = commonColdPattern.test(searchableText) && hasMildPrefix && !hasSevereIndicators;

    if (isLikelyCommonCold) {
      return null; // Don't flag common cold symptoms as critical
    }

    // For stroke detection, require sudden onset or severe symptoms
    if (redFlag.id === 'rf-stroke') {
      const hasSuddenOnset = searchableText.includes('sudden') ||
        symptoms.some(s => ((s as any).onset || '').toLowerCase() === 'sudden');
      // Only skip if: mild symptoms AND no sudden onset AND no severe indicators
      if (allSymptomsMild && hasMildPrefix && !hasSuddenOnset && !hasSevereIndicators) {
        return null; // Non-sudden, explicitly mild headache shouldn't trigger stroke
      }
    }

    // Only skip if ALL symptoms are explicitly mild AND text says mild AND no severe indicators
    // This is very conservative - only skip clearly benign presentations
    if (allSymptomsMild && hasMildPrefix && !hasSevereIndicators) {
      return null;
    }
  }

  // ==========================================================================
  // CHRONIC CONDITION DETECTION
  // Reduce confidence for chronic/stable presentations
  // ==========================================================================

  const chronicPatterns = /\b(for \d+ months?|for \d+ years?|chronic|stable|unchanged|reproducible|positional|palpation|movement)\b/i;
  const isChronicPresentation = chronicPatterns.test(searchableText);

  // For musculoskeletal patterns, significantly reduce cardiac/stroke concern
  const musculoskeletalPatterns = /\b(reproducible with palpation|worse with movement|positional|musculoskeletal|costochondritis)\b/i;
  const isMusculoskeletalPattern = musculoskeletalPatterns.test(searchableText);

  // Check symptom duration explicitly
  const hasChronicDuration = symptoms.some(s => {
    const duration = ((s as any).duration || '').toLowerCase();
    return duration.includes('month') || duration.includes('year') || duration.includes('chronic');
  });

  // Check aggravating factors for musculoskeletal
  const hasMskAggravators = symptoms.some(s => {
    const aggravators = (s as any).aggravatedBy || [];
    return aggravators.some((a: string) =>
      /palpation|movement|position|breathing|cough/i.test(a)
    );
  });

  // Expand searchable text with medical synonyms
  const expandedText = expandWithSynonyms(searchableText);

  // Direct symptom name matching for critical conditions
  // Check if any symptom name directly matches a criterion keyword
  const symptomNames = symptoms.map(s => s.name.toLowerCase());
  const symptomQualities = symptoms.map(s => (s.quality || '').toLowerCase()).filter(q => q);
  
  // Check text-based criteria
  for (const criterion of redFlag.triggerCriteria) {
    const criterionLower = criterion.toLowerCase();
    const expandedCriterion = expandWithSynonyms(criterionLower);
    const keywords = extractKeywords(expandedCriterion);
    
    // Check both original and expanded text
    const keywordMatches = keywords.filter(kw => 
      expandedText.includes(kw) || searchableText.includes(kw)
    );
    
    // Direct match: symptom name matches criterion exactly
    if (symptomNames.some(name => criterionLower.includes(name) || name.includes(criterionLower.split(' ')[0]))) {
      if (!matchedCriteria.includes(criterion)) {
        matchedCriteria.push(criterion);
        totalScore += 1;
      }
      continue;
    }
    
    // Direct match: symptom quality matches criterion (e.g., "pleuritic" quality matches "pleuritic chest pain")
    if (symptomQualities.some(quality => criterionLower.includes(quality))) {
      if (!matchedCriteria.includes(criterion)) {
        matchedCriteria.push(criterion);
        totalScore += 1;
      }
      continue;
    }
    
    // Special handling for single medical terms (hematemesis, melena, etc.)
    const singleTermMatch = checkSingleTermMatch(criterionLower, expandedText);
    if (singleTermMatch) {
      matchedCriteria.push(criterion);
      totalScore += 1;
      continue;
    }
    
    // For short criteria (<=3 keywords), require ALL keywords to match
    // For longer criteria, use proportional matching
    if (keywords.length <= 3) {
      if (keywordMatches.length === keywords.length) {
        matchedCriteria.push(criterion);
        totalScore += 1;
      }
    } else if (keywordMatches.length >= Math.ceil(keywords.length * 0.6)) {
      matchedCriteria.push(criterion);
      totalScore += 1;
    }
  }

  // Special check for CAD + chest pain combination
  if (redFlag.id === 'rf-chest-pain-cardiac') {
    const hasCAD = patientContext.medicalHistory?.conditions.some(c => {
      const cl = c.toLowerCase();
      return cl.includes('cad') || cl.includes('coronary') || cl.includes('heart disease') ||
             cl.includes('mi') || cl.includes('stent') || cl.includes('cabg') ||
             cl.includes('bypass') || cl.includes('angina');
    });
    const hasChestPain = expandedText.includes('chest') && 
      (expandedText.includes('pain') || expandedText.includes('pressure') || expandedText.includes('discomfort'));
    
    if (hasCAD && hasChestPain && !matchedCriteria.includes('history of CAD with new chest pain')) {
      matchedCriteria.push('history of CAD with new chest pain');
      totalScore += 2; // Higher weight for this combination
    }
  }

  // Check vital sign criteria
  if (vitals) {
    const vitalMatches = checkVitalSignCriteria(redFlag, vitals);
    matchedCriteria.push(...vitalMatches);
    totalScore += vitalMatches.length;
  }

  // Check demographic criteria
  const demoMatches = checkDemographicCriteria(redFlag, patientContext, vitals);
  matchedCriteria.push(...demoMatches);
  totalScore += demoMatches.length;

  // Determine if we have enough matches
  // Special case: certain high-severity conditions should trigger with 1 match
  // - rf-pediatric-fever: febrile infant is a critical situation
  // - rf-pulmonary-embolism: PE is life-threatening, isolated hemoptysis/pleuritic pain warrants workup
  const singleMatchRedFlags = ['rf-pediatric-fever', 'rf-pulmonary-embolism'];
  const minMatches = (redFlag.severity === 'critical' || singleMatchRedFlags.includes(redFlag.id)) ? 1 : 2;

  if (matchedCriteria.length >= minMatches) {
    // Base confidence
    let confidence = Math.min(0.95, 0.5 + (totalScore * 0.15));

    // ==========================================================================
    // CONFIDENCE ADJUSTMENTS FOR BENIGN PATTERNS
    // ==========================================================================

    // Reduce confidence significantly for chronic/stable presentations
    if (isChronicPresentation || hasChronicDuration) {
      confidence *= 0.5; // 50% reduction for chronic conditions
    }

    // Reduce confidence for musculoskeletal patterns (especially for cardiac red flags)
    if (isMusculoskeletalPattern || hasMskAggravators) {
      if (redFlag.id === 'rf-chest-pain-cardiac' || redFlag.category === 'cardiovascular') {
        confidence *= 0.4; // 60% reduction for MSK chest pain
      }
    }

    // Skip entirely if confidence drops below threshold after adjustments
    if (confidence < 0.3) {
      return null;
    }

    return {
      redFlag,
      matchedCriteria,
      confidence,
      reasoning: `Matched ${matchedCriteria.length} criteria: ${matchedCriteria.join('; ')}`,
    };
  }

  return null;
}

function checkSingleTermMatch(criterion: string, expandedText: string): boolean {
  // Check for single medical terms that should trigger immediately
  const singleTermTriggers = [
    { criterion: 'hematemesis', patterns: ['hematemesis', 'vomiting blood', 'bloody vomit', 'vomit blood'] },
    { criterion: 'melena', patterns: ['melena', 'black tarry', 'tarry stool', 'black stool'] },
    { criterion: 'hemoptysis', patterns: ['hemoptysis', 'coughing blood', 'bloody sputum', 'cough blood', 'coughing up blood'] },
    { criterion: 'sudden onset shortness of breath', patterns: ['sudden shortness', 'sudden dyspnea', 'acute dyspnea', 'sudden difficulty breathing', 'suddenly short of breath', 'sudden onset dyspnea', 'sudden onset shortness'] },
    { criterion: 'pleuritic', patterns: ['pleuritic', 'pleurisy', 'worse with breathing', 'worse with deep breath', 'pain with breathing'] },
  ];
  
  for (const trigger of singleTermTriggers) {
    // Check if this criterion relates to this trigger
    const criterionLower = criterion.toLowerCase();
    const triggerKey = trigger.criterion.toLowerCase();
    
    if (criterionLower.includes(triggerKey) || triggerKey.includes(criterionLower.split(' ')[0])) {
      for (const pattern of trigger.patterns) {
        if (expandedText.includes(pattern)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['with', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'to', 'of']);
  return text
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function checkVitalSignCriteria(redFlag: RedFlag, vitals: VitalSigns): string[] {
  const matches: string[] = [];

  // Hypotension
  if (vitals.bloodPressureSystolic && vitals.bloodPressureSystolic < 90) {
    if (redFlag.category === 'cardiovascular' || redFlag.category === 'infectious') {
      matches.push(`Hypotension (SBP ${vitals.bloodPressureSystolic})`);
    }
  }

  // Tachycardia
  if (vitals.heartRate && vitals.heartRate > 120) {
    matches.push(`Tachycardia (HR ${vitals.heartRate})`);
  }

  // Hypoxia
  if (vitals.oxygenSaturation && vitals.oxygenSaturation < 90) {
    if (redFlag.category === 'respiratory') {
      matches.push(`Hypoxia (SpO2 ${vitals.oxygenSaturation}%)`);
    }
  }

  // Tachypnea
  if (vitals.respiratoryRate && vitals.respiratoryRate > 24) {
    if (redFlag.category === 'respiratory' || redFlag.category === 'infectious') {
      matches.push(`Tachypnea (RR ${vitals.respiratoryRate})`);
    }
  }

  // Fever
  if (vitals.temperature) {
    const tempC = vitals.temperatureUnit === 'F' 
      ? (vitals.temperature - 32) * 5/9 
      : vitals.temperature;
    if (tempC >= 38.0) {
      if (redFlag.category === 'infectious') {
        matches.push(`Fever (${vitals.temperature}°${vitals.temperatureUnit || 'C'})`);
      }
    }
  }

  // Severe hypertension
  if (vitals.bloodPressureSystolic && vitals.bloodPressureSystolic > 180) {
    if (redFlag.category === 'cardiovascular' || redFlag.category === 'neurological') {
      matches.push(`Severe hypertension (SBP ${vitals.bloodPressureSystolic})`);
    }
  }

  return matches;
}

function checkDemographicCriteria(
  redFlag: RedFlag,
  patientContext: PatientContext,
  vitals?: VitalSigns
): string[] {
  const matches: string[] = [];
  const { demographics } = patientContext;

  // Pediatric considerations - Febrile infant < 60 days
  if (redFlag.id === 'rf-pediatric-fever') {
    const isInfant = demographics.ageUnit === 'days' || 
        (demographics.ageUnit === 'months' && demographics.age < 2);
    
    // Check for fever from vitals
    let hasFever = false;
    if (vitals?.temperature) {
      const tempC = vitals.temperatureUnit === 'F' 
        ? (vitals.temperature - 32) * 5/9 
        : vitals.temperature;
      hasFever = tempC >= 38.0;
    }
    
    if (isInfant && hasFever) {
      matches.push('infant < 60 days with temperature >= 38C (100.4F)');
    } else if (isInfant) {
      // Still flag if infant appears ill even without confirmed fever
      matches.push('Age < 60 days');
    }
  }

  // Pregnancy considerations
  if (redFlag.category === 'obstetric') {
    if (demographics.pregnancyStatus === 'pregnant' || 
        demographics.sex === 'female' && demographics.age >= 12 && demographics.age <= 50) {
      // Could be pregnant
    }
  }

  // Immunocompromised
  if (redFlag.id === 'rf-sepsis' && patientContext.medicalHistory) {
    const immunocompromised = patientContext.medicalHistory.conditions.some(c => 
      c.toLowerCase().includes('hiv') ||
      c.toLowerCase().includes('cancer') ||
      c.toLowerCase().includes('transplant') ||
      c.toLowerCase().includes('immunodeficiency')
    );
    if (immunocompromised) {
      matches.push('Immunocompromised status');
    }
  }

  // DVT with respiratory symptoms check
  if (redFlag.id === 'rf-pulmonary-embolism' && patientContext.medicalHistory) {
    const hasDVT = patientContext.medicalHistory.conditions.some(c => 
      c.toLowerCase().includes('dvt') ||
      c.toLowerCase().includes('deep vein') ||
      c.toLowerCase().includes('blood clot')
    );
    if (hasDVT) {
      matches.push('Known DVT history');
    }
  }

  return matches;
}

function determineDisposition(matches: RedFlagMatch[]): RedFlagEvaluation['recommendedDisposition'] {
  if (matches.length === 0) return 'routine';

  const hasCritical = matches.some(m => m.redFlag.severity === 'critical');
  const hasHigh = matches.some(m => m.redFlag.severity === 'high');

  if (hasCritical) return 'emergency';
  if (hasHigh) return 'urgent_care';
  return 'routine';
}

function generateSummary(matches: RedFlagMatch[]): string {
  if (matches.length === 0) {
    return 'No red flags identified based on current clinical information.';
  }

  const critical = matches.filter(m => m.redFlag.severity === 'critical');
  const high = matches.filter(m => m.redFlag.severity === 'high');
  const moderate = matches.filter(m => m.redFlag.severity === 'moderate');

  const parts: string[] = [];

  if (critical.length > 0) {
    parts.push(`CRITICAL: ${critical.map(m => m.redFlag.name).join(', ')}`);
  }
  if (high.length > 0) {
    parts.push(`HIGH PRIORITY: ${high.map(m => m.redFlag.name).join(', ')}`);
  }
  if (moderate.length > 0) {
    parts.push(`MODERATE: ${moderate.map(m => m.redFlag.name).join(', ')}`);
  }

  return parts.join(' | ');
}

// =============================================================================
// Quick Check Functions
// =============================================================================

export function hasImmediateRedFlags(evaluation: RedFlagEvaluation): boolean {
  return evaluation.matches.some(m => m.redFlag.timeframe === 'immediate');
}

export function getRedFlagsByCategory(
  evaluation: RedFlagEvaluation,
  category: RedFlagCategory
): RedFlagMatch[] {
  return evaluation.matches.filter(m => m.redFlag.category === category);
}

export function getActionableRedFlags(evaluation: RedFlagEvaluation): RedFlagMatch[] {
  return evaluation.matches.filter(m => 
    m.redFlag.severity === 'critical' || m.redFlag.severity === 'high'
  );
}

export function formatRedFlagAlert(match: RedFlagMatch): string {
  return `⚠️ ${match.redFlag.severity.toUpperCase()}: ${match.redFlag.name}
${match.redFlag.description}
Action: ${match.redFlag.recommendedAction}
Timeframe: ${match.redFlag.timeframe}`;
}
