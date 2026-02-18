// ============================================================
// Clinical AI Recommendation Service
// apps/shared/services/ClinicalRecommendationService.ts
//
// Unified AI-powered clinical recommendations for labs, imaging, medications
// Consolidates duplicate BioMistral recommendation logic from stores
// ============================================================

import type { 
  OrderingContext,
  PatientContext, 
  AIRecommendation, 
  OrderPriority,
  RecommendationCategory 
} from '../catalogs/types';
import { LAB_CATALOG } from '../catalogs/labs';
import { IMAGING_CATALOG } from '../catalogs/imaging';
import { MEDICATION_CATALOG } from '../catalogs/medications';

// =============================================================================
// Helper Functions
// =============================================================================

/** 
 * Normalize allergies from mixed format to string array 
 * Handles both string[] and {allergen, reaction, severity}[] formats
 */
function normalizeAllergies(allergies: PatientContext['allergies']): string[] {
  if (!allergies) return [];
  return allergies.map(a => typeof a === 'string' ? a : a.allergen);
}

/**
 * Check if any allergy matches a search term
 */
function hasAllergyMatch(allergies: PatientContext['allergies'], searchTerm: string): boolean {
  const normalizedAllergies = normalizeAllergies(allergies);
  const lowerSearch = searchTerm.toLowerCase();
  return normalizedAllergies.some(a => a.toLowerCase().includes(lowerSearch));
}

// =============================================================================
// Types
// =============================================================================

export interface LabRecommendation extends AIRecommendation<string> {
  testCode: string;
  testName: string;
}

export interface ImagingRecommendation extends AIRecommendation<string> {
  studyCode: string;
  studyName: string;
  modality: string;
}

export interface MedicationRecommendation extends AIRecommendation<string> {
  medicationId: string;
  medicationName: string;
  recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid';
  dosageRecommendation?: string;
  durationRecommendation?: string;
  monitoringRequired?: string[];
}

export interface RecommendationResult {
  labs: LabRecommendation[];
  imaging: ImagingRecommendation[];
  medications: MedicationRecommendation[];
  summary: string;
}

// =============================================================================
// Symptom-Based Recommendation Mappings
// =============================================================================

interface SymptomMapping {
  keywords: string[];
  labs: Array<{ code: string; priority: OrderPriority; category: RecommendationCategory; rationale: string }>;
  imaging: Array<{ code: string; priority: OrderPriority; category: RecommendationCategory; rationale: string }>;
  medications: Array<{ id: string; priority: OrderPriority; type: 'first-line' | 'alternative' | 'adjunct'; rationale: string }>;
}

const SYMPTOM_MAPPINGS: SymptomMapping[] = [
  // HEADACHE / MIGRAINE
  {
    keywords: ['headache', 'migraine', 'head pain'],
    labs: [
      { code: 'CBC-DIFF', priority: 'ROUTINE', category: 'recommended', rationale: 'Baseline for infection, anemia evaluation' },
      { code: 'CMP', priority: 'ROUTINE', category: 'recommended', rationale: 'Metabolic evaluation, kidney function for contrast' },
      { code: 'ESR', priority: 'ROUTINE', category: 'recommended', rationale: 'Screen for temporal arteritis in patients >50' },
      { code: 'CRP', priority: 'ROUTINE', category: 'recommended', rationale: 'Acute inflammatory marker' },
      { code: 'TSH', priority: 'ROUTINE', category: 'consider', rationale: 'Thyroid dysfunction can cause headaches' },
      { code: 'MG', priority: 'ROUTINE', category: 'consider', rationale: 'Low magnesium associated with migraine' },
    ],
    imaging: [
      { code: 'CT-HEAD-NC', priority: 'STAT', category: 'critical', rationale: 'Rule out acute intracranial pathology, hemorrhage' },
      { code: 'MRI-BRAIN-NC', priority: 'ROUTINE', category: 'recommended', rationale: 'Superior soft tissue detail if CT negative' },
    ],
    medications: [
      { id: 'sumatriptan', priority: 'ROUTINE', type: 'first-line', rationale: 'First-line abortive therapy for acute migraine' },
      { id: 'rizatriptan', priority: 'ROUTINE', type: 'alternative', rationale: 'Alternative triptan with faster onset' },
      { id: 'ibuprofen', priority: 'ROUTINE', type: 'alternative', rationale: 'For mild-moderate headache' },
      { id: 'ondansetron', priority: 'ROUTINE', type: 'adjunct', rationale: 'For migraine-associated nausea' },
      { id: 'topiramate', priority: 'ROUTINE', type: 'adjunct', rationale: 'Prophylaxis for frequent migraines' },
    ],
  },
  // CHEST PAIN
  {
    keywords: ['chest pain', 'chest', 'cardiac', 'heart'],
    labs: [
      { code: 'TROP-I', priority: 'STAT', category: 'critical', rationale: 'Gold standard for myocardial injury' },
      { code: 'CBC-DIFF', priority: 'STAT', category: 'critical', rationale: 'Evaluate anemia, infection' },
      { code: 'BMP', priority: 'STAT', category: 'critical', rationale: 'Electrolytes, kidney function for contrast' },
      { code: 'BNP', priority: 'ROUTINE', category: 'recommended', rationale: 'Heart failure evaluation' },
      { code: 'DDIMER', priority: 'STAT', category: 'critical', rationale: 'Rule out PE if clinically indicated' },
      { code: 'LIPID', priority: 'ROUTINE', category: 'consider', rationale: 'CV risk assessment' },
    ],
    imaging: [
      { code: 'XR-CHEST-2V', priority: 'STAT', category: 'critical', rationale: 'Baseline chest evaluation' },
      { code: 'CT-CHEST-PE', priority: 'STAT', category: 'critical', rationale: 'Rule out pulmonary embolism' },
      { code: 'ECHO-TTE', priority: 'ROUTINE', category: 'recommended', rationale: 'Cardiac function assessment' },
    ],
    medications: [
      { id: 'metoprolol', priority: 'ROUTINE', type: 'first-line', rationale: 'Rate control, cardioprotection' },
      { id: 'atorvastatin', priority: 'ROUTINE', type: 'adjunct', rationale: 'Lipid management, plaque stabilization' },
    ],
  },
  // ABDOMINAL PAIN
  {
    keywords: ['abdominal', 'stomach', 'belly', 'abdomen'],
    labs: [
      { code: 'CBC-DIFF', priority: 'STAT', category: 'critical', rationale: 'Infection, blood loss evaluation' },
      { code: 'CMP', priority: 'STAT', category: 'critical', rationale: 'Liver, kidney, electrolytes' },
      { code: 'LIPASE', priority: 'STAT', category: 'critical', rationale: 'Pancreatitis evaluation' },
      { code: 'UA-MICRO', priority: 'ROUTINE', category: 'recommended', rationale: 'UTI, nephrolithiasis' },
      { code: 'HCG-U', priority: 'STAT', category: 'critical', rationale: 'Rule out ectopic in females' },
    ],
    imaging: [
      { code: 'US-RUQ', priority: 'STAT', category: 'critical', rationale: 'Gallbladder evaluation for RUQ pain' },
      { code: 'CT-ABD-PELVIS-C', priority: 'ROUTINE', category: 'recommended', rationale: 'Comprehensive abdominal evaluation' },
      { code: 'CT-ABD-PELVIS-NC', priority: 'ROUTINE', category: 'recommended', rationale: 'If contrast contraindicated' },
    ],
    medications: [
      { id: 'ondansetron', priority: 'ROUTINE', type: 'adjunct', rationale: 'Nausea management' },
      { id: 'omeprazole', priority: 'ROUTINE', type: 'adjunct', rationale: 'Acid suppression if GERD suspected' },
    ],
  },
  // FEVER / INFECTION
  {
    keywords: ['fever', 'infection', 'sepsis', 'temperature'],
    labs: [
      { code: 'CBC-DIFF', priority: 'STAT', category: 'critical', rationale: 'WBC, differential for infection' },
      { code: 'CMP', priority: 'STAT', category: 'critical', rationale: 'Organ function assessment' },
      { code: 'LACTATE', priority: 'STAT', category: 'critical', rationale: 'Sepsis severity marker' },
      { code: 'PROCALCITONIN', priority: 'STAT', category: 'critical', rationale: 'Bacterial vs viral infection' },
      { code: 'BCULT', priority: 'STAT', category: 'critical', rationale: 'Blood cultures before antibiotics' },
      { code: 'UA-MICRO', priority: 'ROUTINE', category: 'recommended', rationale: 'UTI source evaluation' },
    ],
    imaging: [
      { code: 'XR-CHEST-2V', priority: 'ROUTINE', category: 'recommended', rationale: 'Pneumonia evaluation' },
    ],
    medications: [
      { id: 'azithromycin', priority: 'ROUTINE', type: 'first-line', rationale: 'Respiratory infection coverage' },
      { id: 'amoxicillin', priority: 'ROUTINE', type: 'first-line', rationale: 'First-line for strep, sinusitis' },
      { id: 'ciprofloxacin', priority: 'ROUTINE', type: 'alternative', rationale: 'UTI, complicated infections' },
    ],
  },
  // FATIGUE
  {
    keywords: ['fatigue', 'tired', 'weakness', 'exhaustion'],
    labs: [
      { code: 'CBC-DIFF', priority: 'ROUTINE', category: 'critical', rationale: 'Anemia evaluation' },
      { code: 'CMP', priority: 'ROUTINE', category: 'critical', rationale: 'Metabolic causes' },
      { code: 'TSH', priority: 'ROUTINE', category: 'critical', rationale: 'Hypothyroidism screening' },
      { code: 'IRON', priority: 'ROUTINE', category: 'recommended', rationale: 'Iron deficiency' },
      { code: 'FERRITIN', priority: 'ROUTINE', category: 'recommended', rationale: 'Iron stores' },
      { code: 'B12', priority: 'ROUTINE', category: 'recommended', rationale: 'B12 deficiency' },
      { code: 'VITD', priority: 'ROUTINE', category: 'consider', rationale: 'Vitamin D deficiency' },
    ],
    imaging: [],
    medications: [
      { id: 'levothyroxine', priority: 'ROUTINE', type: 'first-line', rationale: 'If hypothyroid confirmed' },
      { id: 'vitamin-d3', priority: 'ROUTINE', type: 'adjunct', rationale: 'If vitamin D deficient' },
    ],
  },
  // SHORTNESS OF BREATH
  {
    keywords: ['shortness of breath', 'dyspnea', 'breathing', 'sob'],
    labs: [
      { code: 'CBC-DIFF', priority: 'STAT', category: 'critical', rationale: 'Anemia, infection evaluation' },
      { code: 'BMP', priority: 'STAT', category: 'critical', rationale: 'Electrolytes, kidney function' },
      { code: 'BNP', priority: 'STAT', category: 'critical', rationale: 'Heart failure evaluation' },
      { code: 'DDIMER', priority: 'STAT', category: 'critical', rationale: 'PE evaluation' },
      { code: 'TROP-I', priority: 'STAT', category: 'recommended', rationale: 'Cardiac ischemia' },
    ],
    imaging: [
      { code: 'XR-CHEST-2V', priority: 'STAT', category: 'critical', rationale: 'Pulmonary/cardiac evaluation' },
      { code: 'CT-CHEST-PE', priority: 'STAT', category: 'critical', rationale: 'Rule out pulmonary embolism' },
      { code: 'ECHO-TTE', priority: 'ROUTINE', category: 'recommended', rationale: 'Cardiac function' },
    ],
    medications: [
      { id: 'albuterol', priority: 'STAT', type: 'first-line', rationale: 'Bronchospasm relief' },
      { id: 'prednisone', priority: 'ROUTINE', type: 'adjunct', rationale: 'Inflammation reduction' },
    ],
  },
  // ANXIETY / DEPRESSION
  {
    keywords: ['anxiety', 'depression', 'stress', 'panic'],
    labs: [
      { code: 'TSH', priority: 'ROUTINE', category: 'recommended', rationale: 'Thyroid dysfunction mimics psychiatric symptoms' },
      { code: 'CBC-DIFF', priority: 'ROUTINE', category: 'consider', rationale: 'Anemia can cause fatigue/depression' },
      { code: 'CMP', priority: 'ROUTINE', category: 'consider', rationale: 'Metabolic causes' },
    ],
    imaging: [],
    medications: [
      { id: 'sertraline', priority: 'ROUTINE', type: 'first-line', rationale: 'First-line SSRI for depression/anxiety' },
      { id: 'escitalopram', priority: 'ROUTINE', type: 'alternative', rationale: 'Alternative SSRI, fewer interactions' },
    ],
  },
  // BACK PAIN
  {
    keywords: ['back pain', 'spine', 'lumbar', 'back'],
    labs: [
      { code: 'CBC-DIFF', priority: 'ROUTINE', category: 'consider', rationale: 'If infection/malignancy suspected' },
      { code: 'CRP', priority: 'ROUTINE', category: 'consider', rationale: 'Inflammatory causes' },
    ],
    imaging: [
      { code: 'MRI-LSPINE', priority: 'ROUTINE', category: 'recommended', rationale: 'Disc disease, stenosis evaluation' },
      { code: 'XR-CSPINE', priority: 'ROUTINE', category: 'consider', rationale: 'Alignment, degenerative changes' },
    ],
    medications: [
      { id: 'ibuprofen', priority: 'ROUTINE', type: 'first-line', rationale: 'Anti-inflammatory for acute pain' },
      { id: 'cyclobenzaprine', priority: 'ROUTINE', type: 'adjunct', rationale: 'Muscle relaxant for spasm' },
      { id: 'acetaminophen', priority: 'ROUTINE', type: 'alternative', rationale: 'If NSAIDs contraindicated' },
    ],
  },
];

// =============================================================================
// Red Flag Enhancement
// =============================================================================

function enhanceForRedFlags(
  recommendations: { labs: LabRecommendation[]; imaging: ImagingRecommendation[] },
  redFlags: string[]
): void {
  if (!redFlags || redFlags.length === 0) return;
  
  const redFlagText = redFlags.join(' ').toLowerCase();
  
  // Worst headache / thunderclap
  if (redFlagText.includes('worst') || redFlagText.includes('thunderclap')) {
    recommendations.labs.forEach(r => {
      if (['CBC-DIFF', 'CMP', 'ESR', 'CRP'].includes(r.testCode)) {
        r.priority = 'STAT';
        r.category = 'critical';
        r.redFlagRelated = true;
      }
    });
    recommendations.imaging.forEach(r => {
      if (r.studyCode === 'CT-HEAD-NC') {
        r.priority = 'STAT';
        r.category = 'critical';
        r.redFlagRelated = true;
      }
    });
  }
  
  // Neurological deficits
  if (redFlagText.includes('weakness') || redFlagText.includes('numbness') || 
      redFlagText.includes('vision') || redFlagText.includes('speech')) {
    // Add stroke protocol
    const strokeLabs = ['CBC-DIFF', 'BMP', 'PT-INR', 'PTT', 'GLU'];
    strokeLabs.forEach(code => {
      const existing = recommendations.labs.find(r => r.testCode === code);
      if (existing) {
        existing.priority = 'STAT';
        existing.category = 'critical';
        existing.redFlagRelated = true;
      }
    });
  }
}

// =============================================================================
// Main Recommendation Generator
// =============================================================================

export class ClinicalRecommendationService {
  /**
   * Generate comprehensive clinical recommendations.
   * Synchronous rule-based engine — no network calls.
   * For AI-enhanced recommendations, use generateAIRecommendations() which
   * calls this first for instant results, then optionally enhances via API.
   */
  generateRecommendations(patient: OrderingContext): RecommendationResult {
    const complaint = patient.chiefComplaint.toLowerCase();
    const labs: LabRecommendation[] = [];
    const imaging: ImagingRecommendation[] = [];
    const medications: MedicationRecommendation[] = [];
    const addedLabs = new Set<string>();
    const addedImaging = new Set<string>();
    const addedMeds = new Set<string>();
    
    // Match symptoms to mappings
    for (const mapping of SYMPTOM_MAPPINGS) {
      const matches = mapping.keywords.some(kw => complaint.includes(kw));
      if (!matches) continue;
      
      // Add labs
      for (const lab of mapping.labs) {
        if (addedLabs.has(lab.code)) continue;
        const test = LAB_CATALOG[lab.code];
        if (!test) continue;
        
        labs.push({
          id: `rec_${lab.code}_${Date.now()}`,
          itemCode: lab.code,
          itemName: test.name,
          testCode: lab.code,
          testName: test.name,
          priority: lab.priority,
          rationale: lab.rationale,
          clinicalEvidence: [],
          confidence: lab.category === 'critical' ? 0.95 : lab.category === 'recommended' ? 0.85 : 0.70,
          category: lab.category,
        });
        addedLabs.add(lab.code);
      }
      
      // Add imaging
      for (const img of mapping.imaging) {
        if (addedImaging.has(img.code)) continue;
        const study = IMAGING_CATALOG[img.code];
        if (!study) continue;
        
        // Check contrast allergy
        if (study.contrast && (
          hasAllergyMatch(patient.allergies, 'contrast') || 
          hasAllergyMatch(patient.allergies, 'iodine')
        )) {
          continue; // Skip contrast studies for allergic patients
        }
        
        imaging.push({
          id: `rec_${img.code}_${Date.now()}`,
          itemCode: img.code,
          itemName: study.name,
          studyCode: img.code,
          studyName: study.name,
          modality: study.modality,
          priority: img.priority,
          rationale: img.rationale,
          clinicalEvidence: [],
          confidence: img.category === 'critical' ? 0.95 : img.category === 'recommended' ? 0.85 : 0.70,
          category: img.category,
        });
        addedImaging.add(img.code);
      }
      
      // Add medications
      for (const med of mapping.medications) {
        if (addedMeds.has(med.id)) continue;
        const medication = MEDICATION_CATALOG[med.id];
        if (!medication) continue;
        
        // Check contraindications against medical history and allergies
        const medicalHistory = patient.medicalHistory || [];
        const hasContraindication = medication.contraindications.some(ci => {
          const ciLower = ci.toLowerCase();
          const historyMatch = medicalHistory.some(h => h.toLowerCase().includes(ciLower));
          const allergyMatch = hasAllergyMatch(patient.allergies, ci);
          return historyMatch || allergyMatch;
        });
        if (hasContraindication) continue;
        
        // Check pregnancy
        if (patient.pregnant && medication.pregnancyCategory === 'X') continue;
        
        medications.push({
          id: `rec_${med.id}_${Date.now()}`,
          itemCode: med.id,
          itemName: `${medication.genericName} (${medication.brandName})`,
          medicationId: med.id,
          medicationName: `${medication.genericName} ${medication.defaultStrength}`,
          priority: med.priority,
          rationale: med.rationale,
          clinicalEvidence: [],
          confidence: med.type === 'first-line' ? 0.92 : med.type === 'alternative' ? 0.85 : 0.75,
          category: med.type === 'first-line' ? 'critical' : 'recommended',
          recommendationType: med.type,
          warningMessage: medication.blackBoxWarning,
        });
        addedMeds.add(med.id);
      }
    }
    
    // Add pregnancy test for females of childbearing age
    if (patient.gender.toLowerCase() === 'female' && 
        patient.age >= 12 && patient.age <= 55 &&
        !addedLabs.has('HCG-U')) {
      const test = LAB_CATALOG['HCG-U'];
      if (test) {
        labs.push({
          id: `rec_HCG-U_${Date.now()}`,
          itemCode: 'HCG-U',
          itemName: test.name,
          testCode: 'HCG-U',
          testName: test.name,
          priority: 'STAT',
          rationale: 'Required before imaging with contrast and certain medications',
          clinicalEvidence: ['Standard of care for females of childbearing age'],
          confidence: 0.98,
          category: 'critical',
        });
      }
    }
    
    // Enhance for red flags
    enhanceForRedFlags({ labs, imaging }, patient.redFlags);
    
    // Sort by category priority
    const sortByCategory = (a: AIRecommendation, b: AIRecommendation) => {
      const order: Record<RecommendationCategory, number> = { 
        critical: 0, 
        recommended: 1, 
        consider: 2, 
        avoid: 3,
        'not-indicated': 4 
      };
      return (order[a.category] ?? 5) - (order[b.category] ?? 5);
    };
    
    labs.sort(sortByCategory);
    imaging.sort(sortByCategory);
    medications.sort(sortByCategory);
    
    // Generate summary
    const criticalLabs = labs.filter(l => l.category === 'critical').length;
    const criticalImaging = imaging.filter(i => i.category === 'critical').length;
    const summary = `Recommended: ${criticalLabs} critical labs, ${criticalImaging} critical imaging studies, ${medications.length} medications for ${patient.chiefComplaint}`;
    
    return { labs, imaging, medications, summary };
  }

  /**
   * Generate only lab recommendations (synchronous).
   */
  generateLabRecommendations(patient: OrderingContext): LabRecommendation[] {
    return this.generateRecommendations(patient).labs;
  }

  /**
   * Generate only imaging recommendations (synchronous).
   */
  generateImagingRecommendations(patient: OrderingContext): ImagingRecommendation[] {
    return this.generateRecommendations(patient).imaging;
  }

  /**
   * Generate only medication recommendations (synchronous).
   */
  generateMedicationRecommendations(patient: OrderingContext): MedicationRecommendation[] {
    return this.generateRecommendations(patient).medications;
  }

  /**
   * Async wrapper that returns rule-based results instantly,
   * then optionally enhances via BioMistral API if available.
   * Callers get immediate results; AI enhancement is best-effort.
   */
  async generateAIRecommendations(
    patient: OrderingContext,
    apiEndpoint?: string
  ): Promise<RecommendationResult> {
    // Start with synchronous rule-based results
    const ruleBasedResult = this.generateRecommendations(patient);

    // If no API endpoint, return rule-based results
    if (!apiEndpoint) return ruleBasedResult;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient }),
      });
      if (!response.ok) return ruleBasedResult;
      const aiResult = await response.json();
      // Merge AI results with rule-based (AI can add new items or adjust confidence)
      // For now, prefer AI results if available, fallback to rule-based
      return {
        labs: aiResult.labs?.length ? aiResult.labs : ruleBasedResult.labs,
        imaging: aiResult.imaging?.length ? aiResult.imaging : ruleBasedResult.imaging,
        medications: aiResult.medications?.length ? aiResult.medications : ruleBasedResult.medications,
        summary: aiResult.summary || ruleBasedResult.summary,
      };
    } catch {
      // AI unavailable — rule-based results are the fallback
      return ruleBasedResult;
    }
  }
}

// Export singleton instance
export const clinicalRecommendationService = new ClinicalRecommendationService();
