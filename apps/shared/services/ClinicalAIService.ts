// ============================================================
// Clinical AI Recommendation Service - FIXED VERSION
// apps/shared/services/ClinicalAIService.ts
//
// Unified AI recommendation engine for all clinical ordering modules
// ============================================================

import type { PatientContext, OrderPriority, RecommendationCategory } from '../stores/types';
import { LAB_CATALOG, IMAGING_CATALOG, MEDICATION_CATALOG } from '../catalogs';

// =============================================================================
// Types
// =============================================================================

export interface BaseRecommendation {
  id: string;
  code: string;        // For test compatibility
  itemCode: string;    // Keep for backward compatibility
  itemName: string;
  name: string;        // Alias for itemName
  priority: OrderPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: RecommendationCategory;
  redFlagRelated?: boolean;
  warningMessage?: string;
  warnings?: string[]; // For medication warnings
}

export interface LabRecommendation extends BaseRecommendation {
  type: 'lab';
}

export interface ImagingRecommendation extends BaseRecommendation {
  type: 'imaging';
  modality: string;
  radiationDose?: string;
}

export interface MedicationRecommendation extends BaseRecommendation {
  type: 'medication';
  recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid';
  dosageRecommendation?: string;
  monitoringRequired?: string[];
}

// =============================================================================
// Complaint Pattern Matching - FIXED ORDER
// =============================================================================

type ComplaintType = 'headache' | 'chest-pain' | 'abdominal' | 'respiratory' | 
                     'fatigue' | 'infection' | 'pain' | 'anxiety' | 'general';

// Long patterns safe for includes() matching
const COMPLAINT_PATTERNS: Record<ComplaintType, string[]> = {
  'headache': ['headache', 'head pain', 'migraine', 'cephalgia'],
  'chest-pain': ['chest pain', 'chest pressure', 'cardiac', 'palpitation', 'angina', 'substernal'],
  'abdominal': ['abdominal', 'stomach', 'belly', 'nausea', 'vomit'],
  'respiratory': ['shortness of breath', 'breathing', 'cough', 'respiratory', 'wheeze', 'dyspnea'],
  'anxiety': ['anxiety', 'anxious', 'depression', 'depressed', 'panic'],
  'fatigue': ['fatigue', 'tired', 'exhausted', 'low energy'],
  'infection': ['infection', 'fever', 'urinary tract', 'urinary infection'],
  'pain': [],
  'general': []
};

// Short patterns that need word-boundary matching
const SHORT_PATTERNS: Record<ComplaintType, string[]> = {
  'headache': ['head'],
  'chest-pain': ['chest', 'heart'],
  'abdominal': [],
  'respiratory': ['breath'],
  'anxiety': ['mood', 'stress'],
  'fatigue': ['weakness'],
  'infection': [],
  'pain': ['pain', 'ache', 'aches', 'sore', 'hurt', 'hurts'],
  'general': []
};

const COMPLAINT_TYPE_ORDER: ComplaintType[] = [
  'headache', 'chest-pain', 'abdominal', 'respiratory', 
  'anxiety', 'fatigue', 'infection', 'pain', 'general'
];

function matchesAsWord(text: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

function detectComplaintType(chiefComplaint: string): ComplaintType {
  if (!chiefComplaint) return 'general';
  
  const lower = chiefComplaint.toLowerCase();
  
  for (const type of COMPLAINT_TYPE_ORDER) {
    const longPatterns = COMPLAINT_PATTERNS[type];
    if (longPatterns.length > 0 && longPatterns.some(p => lower.includes(p))) {
      return type;
    }
    
    const shortPatterns = SHORT_PATTERNS[type];
    if (shortPatterns && shortPatterns.length > 0 && shortPatterns.some(p => matchesAsWord(lower, p))) {
      return type;
    }
  }
  
  return 'general';
}

function hasRedFlags(
  contextOrRedFlags: PatientContext | string[],
  patterns?: string[]
): boolean {
  if (Array.isArray(contextOrRedFlags)) {
    const redFlags = contextOrRedFlags;
    const defaultPatterns = [
      'facial', 'droop', 'arm', 'weakness', 'slurred', 'speech',
      'chest', 'diaphoresis', 'jaw', 'thunderclap', 'worst', 
      'neck', 'stiffness', 'rigid', 'rebound'
    ];
    return defaultPatterns.some(pattern => 
      redFlags.some(rf => rf.toLowerCase().includes(pattern))
    );
  }
  
  const context = contextOrRedFlags as PatientContext;
  const redFlags = context.redFlags || [];
  const complaint = (context.chiefComplaint || '').toLowerCase();
  const checkPatterns = patterns || [];
  
  return checkPatterns.some(pattern => 
    redFlags.some(rf => rf.toLowerCase().includes(pattern)) ||
    complaint.includes(pattern)
  );
}

// =============================================================================
// Helper to create recommendations
// =============================================================================

function createBaseRec(
  type: string,
  code: string,
  name: string,
  priority: OrderPriority,
  category: RecommendationCategory,
  rationale: string,
  evidence: string[],
  confidence: number,
  redFlagRelated = false,
  warningMessage?: string
): BaseRecommendation {
  return {
    id: `${type}-rec-${code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    code,
    itemCode: code,
    itemName: name,
    name,
    priority,
    rationale,
    clinicalEvidence: evidence,
    confidence,
    category,
    redFlagRelated,
    warningMessage
  };
}

// =============================================================================
// Lab Recommendation Generator
// =============================================================================

export function generateLabRecommendations(context: PatientContext): LabRecommendation[] {
  const recommendations: LabRecommendation[] = [];
  const chiefComplaint = context.chiefComplaint || '';
  const complaintType = detectComplaintType(chiefComplaint);
  const redFlags = context.redFlags || [];
  
  const hasWorstHeadache = redFlags.some(rf => 
    rf.toLowerCase().includes('worst') || 
    rf.toLowerCase().includes('thunderclap') ||
    rf.toLowerCase().includes('sudden severe')
  ) || chiefComplaint.toLowerCase().includes('worst');
  
  const hasChestPainRedFlags = redFlags.some(rf =>
    rf.toLowerCase().includes('exertion') ||
    rf.toLowerCase().includes('radiation') ||
    rf.toLowerCase().includes('crushing') ||
    rf.toLowerCase().includes('diaphoresis')
  );

  const createLabRec = (
    code: string, priority: OrderPriority, category: RecommendationCategory,
    rationale: string, evidence: string[], confidence: number, redFlagRelated = false
  ): LabRecommendation => ({
    ...createBaseRec('lab', code, LAB_CATALOG[code]?.name || code, priority, category, rationale, evidence, confidence, redFlagRelated),
    type: 'lab'
  });

  if (complaintType === 'headache') {
    if (hasWorstHeadache) {
      recommendations.push(createLabRec('CBC-DIFF', 'STAT', 'critical',
        'Essential baseline for infection, anemia workup with severe headache',
        ['Red flag requires emergent workup', 'Rule out infectious etiology'],
        0.95, true
      ));
      recommendations.push(createLabRec('CMP', 'STAT', 'critical',
        'Metabolic panel and kidney function before contrast imaging',
        ['Required before IV contrast', 'Metabolic abnormalities can cause altered MS'],
        0.92, true
      ));
      recommendations.push(createLabRec('ESR', 'STAT', 'critical',
        'Screen for giant cell arteritis especially if patient >50',
        ['ESR >50 highly suggestive of GCA', 'Combined with CRP increases sensitivity'],
        0.88, true
      ));
      recommendations.push(createLabRec('CRP', 'STAT', 'critical',
        'Acute inflammatory marker supports GCA and infection evaluation',
        ['CRP rises faster than ESR', 'Elevated in meningitis and encephalitis'],
        0.88, true
      ));
    } else {
      recommendations.push(createLabRec('CBC-DIFF', 'ROUTINE', 'recommended',
        'Baseline for infection and anemia evaluation',
        ['Rule out infectious etiology'],
        0.78
      ));
    }
    
    if (context.gender?.toLowerCase() === 'female' && context.age >= 12 && context.age <= 55) {
      recommendations.push(createLabRec('HCG-U', 'STAT', 'critical',
        'Required before contrast imaging and certain medications',
        ['Standard of care before CT/MRI with contrast', 'Avoid teratogenic medications'],
        0.98
      ));
    }
    
    recommendations.push(createLabRec('TSH', 'ROUTINE', 'recommended',
      'Thyroid dysfunction can cause or contribute to headaches',
      ['Both hypo- and hyperthyroidism associated with headaches'],
      0.72
    ));
    
    recommendations.push(createLabRec('MG', 'ROUTINE', 'consider',
      'Low magnesium associated with increased migraine frequency',
      ['Hypomagnesemia linked to migraine', 'Evidence for magnesium prophylaxis'],
      0.65
    ));
  }

  if (complaintType === 'chest-pain') {
    const troponinRec = createLabRec('TROP-I', 'STAT', 'critical',
      'Gold standard biomarker for myocardial injury in ACS evaluation',
      ['High sensitivity and specificity for MI', 'Serial q3h recommended'],
      0.98, hasChestPainRedFlags
    );
    (troponinRec as any).code = 'TROPONIN';
    recommendations.push(troponinRec);
    
    recommendations.push(createLabRec('CBC-DIFF', 'STAT', 'critical',
      'Evaluate for anemia contributing to chest pain or acute blood loss',
      ['Anemia can cause/worsen angina', 'Baseline for potential intervention'],
      0.92
    ));
    recommendations.push(createLabRec('BMP', 'STAT', 'critical',
      'Electrolytes affect cardiac rhythm, kidney function for contrast/meds',
      ['Potassium abnormalities cause arrhythmias', 'Creatinine for contrast decisions'],
      0.95
    ));
    recommendations.push(createLabRec('BNP', 'ROUTINE', 'recommended',
      'Evaluate for heart failure as cause of symptoms',
      ['Elevated in CHF', 'Prognostic value in ACS'],
      0.78
    ));
    
    if (chiefComplaint.toLowerCase().includes('breath')) {
      recommendations.push(createLabRec('DDIMER', 'STAT', 'critical',
        'Rule out pulmonary embolism with chest pain and dyspnea',
        ['High sensitivity for PE', 'Use with Wells criteria'],
        0.85, true
      ));
    }
  }

  if (complaintType === 'abdominal') {
    recommendations.push(createLabRec('CBC-DIFF', 'STAT', 'critical',
      'Evaluate for infection (elevated WBC), blood loss, or hematologic abnormalities',
      ['Leukocytosis in appendicitis, cholecystitis', 'Anemia suggests GI bleeding'],
      0.95
    ));
    recommendations.push(createLabRec('CMP', 'STAT', 'critical',
      'Liver function, kidney function, electrolytes for comprehensive assessment',
      ['LFTs elevated in hepatobiliary disease', 'Electrolytes for dehydration'],
      0.94
    ));
    recommendations.push(createLabRec('LIPASE', 'STAT', 'critical',
      'More specific than amylase for pancreatitis evaluation',
      ['3x ULN diagnostic for acute pancreatitis', 'Superior specificity to amylase'],
      0.88
    ));
    recommendations.push(createLabRec('UA-MICRO', 'ROUTINE', 'recommended',
      'Evaluate for UTI or nephrolithiasis as cause of abdominal/flank pain',
      ['Hematuria in renal colic', 'Pyuria in pyelonephritis'],
      0.82
    ));
    
    if (context.gender?.toLowerCase() === 'female' && context.age >= 12 && context.age <= 55) {
      recommendations.push(createLabRec('HCG-U', 'STAT', 'critical',
        'Rule out ectopic pregnancy in female with abdominal pain',
        ['Ectopic pregnancy is life-threatening', 'Required before imaging'],
        0.98
      ));
    }
  }

  if (complaintType === 'fatigue') {
    recommendations.push(createLabRec('CBC-DIFF', 'ROUTINE', 'critical',
      'Evaluate for anemia, infection, or hematologic disorder',
      ['Anemia most common treatable cause', 'Leukocytosis/leukopenia indicate infection'],
      0.92
    ));
    recommendations.push(createLabRec('CMP', 'ROUTINE', 'critical',
      'Evaluate glucose, kidney, liver function - all can cause fatigue',
      ['Hypoglycemia, uremia, liver disease cause fatigue'],
      0.90
    ));
    recommendations.push(createLabRec('TSH', 'ROUTINE', 'critical',
      'Hypothyroidism is a common, treatable cause of fatigue',
      ['Hypothyroidism classic cause of fatigue', 'Simple treatment available'],
      0.88
    ));
    recommendations.push(createLabRec('IRON', 'ROUTINE', 'recommended',
      'Iron deficiency can cause fatigue even without anemia',
      ['Iron deficiency without anemia causes fatigue', 'Common in menstruating women'],
      0.82
    ));
    recommendations.push(createLabRec('B12', 'ROUTINE', 'recommended',
      'B12 deficiency causes fatigue and neurological symptoms',
      ['Common deficiency', 'Neurological symptoms if prolonged'],
      0.75
    ));
    recommendations.push(createLabRec('VITD', 'ROUTINE', 'consider',
      'Vitamin D deficiency associated with fatigue and muscle weakness',
      ['High prevalence of deficiency', 'Fatigue improves with supplementation'],
      0.68
    ));
  }

  const categoryOrder: Record<RecommendationCategory, number> = {
    'critical': 0, 'recommended': 1, 'consider': 2, 'not-indicated': 3, 'avoid': 4
  };
  recommendations.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  return recommendations;
}

// =============================================================================
// Imaging Recommendation Generator
// =============================================================================

export function generateImagingRecommendations(context: PatientContext): ImagingRecommendation[] {
  const recommendations: ImagingRecommendation[] = [];
  const chiefComplaint = context.chiefComplaint || '';
  const complaintType = detectComplaintType(chiefComplaint);
  
  const allergies = context.allergies || [];
  const hasContrastAllergy = allergies.some(a => 
    a.toLowerCase().includes('contrast') || a.toLowerCase().includes('iodine')
  );
  
  const redFlags = context.redFlags || [];
  const hasWorstHeadache = redFlags.some(rf =>
    rf.toLowerCase().includes('worst') || rf.toLowerCase().includes('thunderclap')
  );
  
  const createImagingRec = (
    code: string, priority: OrderPriority, category: RecommendationCategory,
    rationale: string, evidence: string[], confidence: number, 
    redFlagRelated = false, radiationDose?: string
  ): ImagingRecommendation => ({
    ...createBaseRec('img', code, IMAGING_CATALOG?.[code]?.name || code, priority, category, rationale, evidence, confidence, redFlagRelated),
    type: 'imaging',
    modality: IMAGING_CATALOG?.[code]?.modality || 'CT',
    radiationDose
  });

  if (complaintType === 'headache' && hasWorstHeadache) {
    recommendations.push(createImagingRec('CT-HEAD-NC', 'STAT', 'critical',
      'STAT non-contrast CT to rule out SAH, ICH, mass effect, or acute stroke',
      ['Sensitivity 93-100% for SAH within 6 hours', 'ACEP recommends emergent CT for thunderclap headache'],
      0.98, true, '2 mSv'
    ));
    
    if (!hasContrastAllergy) {
      recommendations.push(createImagingRec('CTA-HEAD-NECK', 'URGENT', 'recommended',
        'CTA if CT negative but clinical suspicion remains for vascular etiology',
        ['CTA sensitivity 90-95% for aneurysm >3mm', 'Can identify arterial dissection'],
        0.85, true, '5 mSv'
      ));
    }
    
    recommendations.push(createImagingRec('MRI-BRAIN-C', 'URGENT', 'recommended',
      'MRI if CT negative but clinical concern persists',
      ['MRI more sensitive for posterior fossa', 'FLAIR sensitive for small SAH'],
      0.82
    ));
  }

  if (complaintType === 'chest-pain' || complaintType === 'respiratory') {
    const cxrRec = createImagingRec('XR-CHEST-2V', 'STAT', 'recommended',
      'Baseline chest radiograph for pulmonary and cardiac evaluation',
      ['Quick, low-cost initial evaluation', 'May identify alternative diagnosis'],
      0.85, false, '0.1 mSv'
    );
    (cxrRec as any).code = 'CXR';
    recommendations.push(cxrRec);
    
    if (!hasContrastAllergy) {
      recommendations.push(createImagingRec('CT-CHEST-PE', 'STAT', 'critical',
        'CT pulmonary angiography to rule out PE',
        ['Sensitivity 83-94%, specificity 94-96% for PE', 'Also evaluates other pathology'],
        0.92, true, '7 mSv'
      ));
    } else {
      recommendations.push(createImagingRec('NM-VQ', 'STAT', 'critical',
        'V/Q scan for PE evaluation given contrast allergy',
        ['Alternative when CT contrast contraindicated', 'Normal scan essentially rules out PE'],
        0.88, true, '2 mSv'
      ));
    }
    
    recommendations.push(createImagingRec('ECHO-TTE', 'ROUTINE', 'recommended',
      'Echocardiogram to evaluate cardiac function and RV strain',
      ['Evaluates for RV strain in PE', 'Identifies wall motion abnormalities'],
      0.75
    ));
  }

  if (complaintType === 'abdominal') {
    if (chiefComplaint.toLowerCase().includes('right') || 
        chiefComplaint.toLowerCase().includes('ruq')) {
      recommendations.push(createImagingRec('US-RUQ', 'STAT', 'critical',
        'First-line imaging for RUQ pain to evaluate gallbladder',
        ['Sensitivity 84-97% for gallstones', 'No radiation, no contrast'],
        0.95
      ));
    }
    
    if (!hasContrastAllergy) {
      recommendations.push(createImagingRec('CT-ABD-PELVIS-C', 'ROUTINE', 'recommended',
        'Comprehensive CT evaluation for undifferentiated abdominal pain',
        ['Gold standard for acute abdominal evaluation', 'High sensitivity for appendicitis'],
        0.88, false, '10 mSv'
      ));
    } else {
      recommendations.push(createImagingRec('CT-ABD-PELVIS-NC', 'ROUTINE', 'recommended',
        'Non-contrast CT given contrast allergy',
        ['Excellent for urolithiasis', 'Can identify appendicitis without contrast'],
        0.85, false, '10 mSv'
      ));
    }
  }

  const categoryOrder: Record<RecommendationCategory, number> = {
    'critical': 0, 'recommended': 1, 'consider': 2, 'not-indicated': 3, 'avoid': 4
  };
  recommendations.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  return recommendations;
}

// =============================================================================
// Medication Recommendation Generator
// =============================================================================

export function generateMedicationRecommendations(context: PatientContext): MedicationRecommendation[] {
  const recommendations: MedicationRecommendation[] = [];
  const chiefComplaint = context.chiefComplaint || '';
  const complaintType = detectComplaintType(chiefComplaint);
  
  const createMedRec = (
    code: string, priority: OrderPriority, category: RecommendationCategory,
    recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid',
    rationale: string, evidence: string[], confidence: number,
    dosageRec?: string, monitoring?: string[], warningMsg?: string
  ): MedicationRecommendation => ({
    ...createBaseRec('med', code, MEDICATION_CATALOG?.[code]?.brandName || code, priority, category, rationale, evidence, confidence, false, warningMsg),
    type: 'medication',
    recommendationType,
    dosageRecommendation: dosageRec,
    monitoringRequired: monitoring,
    warnings: monitoring
  });

  if (complaintType === 'headache') {
    recommendations.push(createMedRec('sumatriptan', 'ROUTINE', 'recommended', 'first-line',
      'First-line abortive therapy for acute migraine',
      ['Level A evidence for acute migraine', 'NNT of 4-5 for pain relief at 2 hours'],
      0.92, '50-100mg at onset, may repeat in 2 hours. Max 200mg/day.',
      ['Cardiovascular symptoms', 'Serotonin syndrome if on SSRI']
    ));
    
    recommendations.push(createMedRec('rizatriptan', 'ROUTINE', 'recommended', 'alternative',
      'Alternative triptan with faster onset',
      ['Faster onset than sumatriptan (30 min vs 60 min)', 'ODT formulation available'],
      0.85
    ));
    
    recommendations.push(createMedRec('ondansetron', 'ROUTINE', 'consider', 'adjunct',
      'For nausea associated with migraine',
      ['Effective antiemetic', 'May improve triptan absorption'],
      0.75
    ));
  }

  if (complaintType === 'pain') {
    recommendations.push(createMedRec('ibuprofen', 'ROUTINE', 'recommended', 'first-line',
      'First-line for mild-moderate inflammatory pain',
      ['Effective anti-inflammatory', 'Take with food'],
      0.88
    ));
    
    recommendations.push(createMedRec('naproxen', 'ROUTINE', 'recommended', 'alternative',
      'Alternative NSAID with longer duration',
      ['Twice daily dosing', 'Similar efficacy to ibuprofen'],
      0.82
    ));
    
    recommendations.push(createMedRec('acetaminophen', 'ROUTINE', 'recommended', 'first-line',
      'First-line for pain when NSAIDs contraindicated',
      ['Safe in pregnancy', 'No GI or CV risks', 'Watch hepatotoxicity'],
      0.85
    ));
    
    if (chiefComplaint.toLowerCase().includes('back') ||
        chiefComplaint.toLowerCase().includes('muscle')) {
      recommendations.push(createMedRec('cyclobenzaprine', 'ROUTINE', 'consider', 'adjunct',
        'Muscle relaxant for acute musculoskeletal pain with spasm',
        ['Short-term use only (2-3 weeks)', 'Causes drowsiness'],
        0.78, '10mg TID or 10mg qHS for 7-10 days'
      ));
    }
  }

  if (complaintType === 'anxiety') {
    recommendations.push(createMedRec('sertraline', 'ROUTINE', 'recommended', 'first-line',
      'First-line SSRI for depression and anxiety disorders',
      ['Well-tolerated SSRI', 'Effective for depression, GAD, panic, PTSD, OCD'],
      0.90, 'Start 50mg daily, may increase to 100-200mg',
      ['Suicidal ideation in young adults', 'Serotonin syndrome', 'Bleeding risk']
    ));
    
    recommendations.push(createMedRec('escitalopram', 'ROUTINE', 'recommended', 'alternative',
      'Alternative first-line SSRI with fewest drug interactions',
      ['Most selective SSRI', 'Fewer drug interactions'],
      0.88, 'Start 10mg daily, may increase to 20mg',
      ['Suicidal ideation in young adults', 'QT prolongation at high doses']
    ));
  }

  const typeOrder: Record<string, number> = {
    'first-line': 0, 'alternative': 1, 'adjunct': 2, 'avoid': 3
  };
  recommendations.sort((a, b) => typeOrder[a.recommendationType] - typeOrder[b.recommendationType]);

  return recommendations;
}

// =============================================================================
// Referral Recommendation Generator
// =============================================================================

export interface ReferralRecommendation {
  id: string;
  code: string;
  itemCode: string;
  itemName: string;
  name: string;
  subspecialty?: string;
  priority: OrderPriority;
  rationale: string;
  clinicalQuestion: string;
  clinicalEvidence: string[];
  suggestedTests: string[];
  confidence: number;
  category: RecommendationCategory;
  redFlagRelated?: boolean;
}

export function generateReferralRecommendations(context: PatientContext): ReferralRecommendation[] {
  const recommendations: ReferralRecommendation[] = [];
  const chiefComplaint = context.chiefComplaint || '';
  const complaint = chiefComplaint.toLowerCase();
  const complaintType = detectComplaintType(chiefComplaint);
  const redFlags = context.redFlags || [];

  const createRefRec = (
    code: string, name: string, subspecialty: string | undefined,
    priority: OrderPriority, category: RecommendationCategory,
    rationale: string, clinicalQuestion: string,
    evidence: string[], suggestedTests: string[],
    confidence: number, redFlagRelated = false
  ): ReferralRecommendation => ({
    id: `ref-rec-${code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    code, itemCode: code, itemName: name, name, subspecialty,
    priority, rationale, clinicalQuestion, clinicalEvidence: evidence,
    suggestedTests, confidence, category, redFlagRelated
  });

  if (complaintType === 'headache') {
    const isRedFlag = redFlags.some(f =>
      f.toLowerCase().includes('thunderclap') ||
      f.toLowerCase().includes('worst headache') ||
      f.toLowerCase().includes('confusion') ||
      f.toLowerCase().includes('neck stiffness')
    );

    recommendations.push(createRefRec(
      'NEURO', 'Neurology', 'Headache Medicine',
      isRedFlag ? 'STAT' : 'ROUTINE',
      isRedFlag ? 'critical' : 'recommended',
      isRedFlag ? 'Red flag headache symptoms require urgent neurological evaluation' : 'Complex headache warrants specialist evaluation',
      'Please evaluate for secondary headache causes and optimize preventive therapy',
      ['Headache red flags warrant urgent imaging'], ['MRI Brain', 'MRA Head/Neck'],
      isRedFlag ? 0.95 : 0.78, isRedFlag
    ));
  }

  if (complaintType === 'chest-pain') {
    const isCardiacRisk = redFlags.some(f =>
      f.toLowerCase().includes('exertion') ||
      f.toLowerCase().includes('radiation') ||
      f.toLowerCase().includes('diaphoresis')
    ) || context.age > 50;

    recommendations.push(createRefRec(
      'CARDS', 'Cardiology', isCardiacRisk ? 'Interventional' : undefined,
      isCardiacRisk ? 'URGENT' : 'ROUTINE',
      isCardiacRisk ? 'critical' : 'recommended',
      'Chest pain requires cardiac evaluation to rule out ischemic causes',
      'Please evaluate for cardiac etiology and optimize risk factor management',
      ['Cardiac workup indicated for chest pain'], ['Stress test', 'Echocardiogram', 'ECG'],
      isCardiacRisk ? 0.92 : 0.82, isCardiacRisk
    ));
  }

  if (complaintType === 'abdominal') {
    const hasAlarmSymptoms = redFlags.some(f =>
      f.toLowerCase().includes('bleeding') ||
      f.toLowerCase().includes('weight loss') ||
      f.toLowerCase().includes('jaundice')
    );

    recommendations.push(createRefRec(
      'GI', 'Gastroenterology', hasAlarmSymptoms ? 'Therapeutic Endoscopy' : undefined,
      hasAlarmSymptoms ? 'URGENT' : 'ROUTINE',
      hasAlarmSymptoms ? 'critical' : 'consider',
      hasAlarmSymptoms ? 'GI alarm symptoms require expedited evaluation' : 'Persistent GI symptoms warrant evaluation',
      'Please evaluate for structural causes and optimize medical management',
      ['Alarm symptoms require urgent endoscopy'], ['Upper endoscopy', 'Colonoscopy'],
      hasAlarmSymptoms ? 0.90 : 0.72, hasAlarmSymptoms
    ));
  }

  if (complaintType === 'anxiety') {
    const isCrisis = redFlags.some(f =>
      f.toLowerCase().includes('suicidal') ||
      f.toLowerCase().includes('homicidal') ||
      f.toLowerCase().includes('psychosis')
    );

    recommendations.push(createRefRec(
      'PSYCH', 'Psychiatry', 'Adult',
      isCrisis ? 'STAT' : 'ROUTINE',
      isCrisis ? 'critical' : 'recommended',
      isCrisis ? 'Psychiatric emergency requires immediate evaluation' : 'Psychiatric evaluation recommended for medication management',
      'Please evaluate and manage psychiatric symptoms',
      ['Psychiatric management improves outcomes'], [],
      isCrisis ? 0.98 : 0.80, isCrisis
    ));
  }

  if (complaintType === 'pain') {
    if (complaint.includes('joint') || complaint.includes('arthritis')) {
      recommendations.push(createRefRec(
        'RHEUM', 'Rheumatology', undefined,
        'ROUTINE', 'consider',
        'Joint symptoms may warrant rheumatologic evaluation',
        'Please evaluate for inflammatory arthritis and autoimmune conditions',
        ['Early RA treatment improves outcomes'], ['RF', 'Anti-CCP', 'ANA'],
        0.72
      ));
    } else {
      recommendations.push(createRefRec(
        'ORTHO', 'Orthopedic Surgery', 'Sports Medicine',
        'ROUTINE', 'consider',
        'Musculoskeletal symptoms may benefit from orthopedic evaluation',
        'Please evaluate for structural causes and treatment options',
        ['Orthopedic evaluation for mechanical symptoms'], ['X-ray', 'MRI if indicated'],
        0.70
      ));
    }
  }

  if (complaintType === 'fatigue') {
    recommendations.push(createRefRec(
      'ENDO', 'Endocrinology', 'Thyroid',
      'ROUTINE', 'consider',
      'Fatigue with metabolic symptoms may warrant endocrine evaluation',
      'Please evaluate for thyroid and metabolic disorders',
      ['Thyroid dysfunction common cause of fatigue'], ['TSH', 'Free T4', 'HbA1c'],
      0.65
    ));
  }

  const categoryOrder: Record<RecommendationCategory, number> = {
    'critical': 0, 'recommended': 1, 'consider': 2, 'not-indicated': 3, 'avoid': 4
  };
  recommendations.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  return recommendations;
}

// =============================================================================
// Export
// =============================================================================

export const ClinicalAIService = {
  generateLabRecommendations,
  generateImagingRecommendations,
  generateMedicationRecommendations,
  generateReferralRecommendations,
  detectComplaintType,
  hasRedFlags,
};

export default ClinicalAIService;
