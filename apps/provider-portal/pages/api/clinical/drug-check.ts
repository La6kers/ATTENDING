// =============================================================================
// ATTENDING AI - Drug Interaction Check API
// apps/provider-portal/pages/api/clinical/drug-check.ts
//
// CRITICAL SAFETY ENDPOINT: Checks for drug-drug interactions and allergy alerts.
// FIXED: Updated request/response format to match test expectations
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Types
// =============================================================================

interface Medication {
  name: string;
  rxcui?: string;
  dose?: string;
  route?: string;
}

interface Allergy {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
}

interface DrugCheckRequest {
  // New format (test expected)
  proposedMedication?: Medication;
  currentMedications?: Medication[];
  allergies?: Allergy[];
  pregnancyStatus?: 'pregnant' | 'not-pregnant' | 'unknown';
  renalFunction?: 'normal' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment';
  hepaticFunction?: 'normal' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment';
  
  // Legacy format support
  medications?: string[];
  includeCurrentMedications?: string[];
}

interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  clinicalEffect: string;
  management: string;
  documentation?: string;
}

interface AllergyAlert {
  drug: string;
  allergen: string;
  alertType: 'direct' | 'cross-reactivity';
  riskLevel: 'low' | 'moderate' | 'high';
  notes?: string;
}

interface Contraindication {
  medication: string;
  condition: string;
  severity: 'relative' | 'absolute';
  recommendation: string;
}

interface ClinicalGuidance {
  category: string;
  message: string;
  recommendation: string;
}

interface DrugCheckResponse {
  success: boolean;
  data?: {
    interactions: Interaction[];
    allergyAlerts: AllergyAlert[];
    contraindications: Contraindication[];
    safeToAdminister: boolean;
    overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
    clinicalGuidance: ClinicalGuidance[];
    warnings?: string[];
    recommendations?: string[];
  };
  error?: string;
  timestamp: string;
}

// =============================================================================
// Drug Interaction Database
// =============================================================================

const DRUG_INTERACTIONS: Array<{
  drug1Patterns: string[];
  drug2Patterns: string[];
  severity: Interaction['severity'];
  clinicalEffect: string;
  management: string;
}> = [
  {
    drug1Patterns: ['warfarin', 'coumadin'],
    drug2Patterns: ['ibuprofen', 'naproxen', 'aspirin', 'nsaid', 'advil', 'motrin', 'aleve', 'celecoxib'],
    severity: 'major',
    clinicalEffect: 'Increased risk of bleeding. NSAIDs inhibit platelet function and may increase anticoagulant effect.',
    management: 'Avoid combination if possible. If necessary, monitor INR closely and watch for signs of bleeding.',
  },
  {
    drug1Patterns: ['warfarin', 'coumadin'],
    drug2Patterns: ['fluconazole', 'metronidazole', 'flagyl', 'diflucan'],
    severity: 'major',
    clinicalEffect: 'CYP2C9 inhibition increases warfarin levels and bleeding risk.',
    management: 'Reduce warfarin dose by 25-50%. Monitor INR closely.',
  },
  {
    drug1Patterns: ['ssri', 'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'prozac', 'zoloft', 'paxil', 'lexapro'],
    drug2Patterns: ['tramadol', 'fentanyl', 'meperidine', 'demerol'],
    severity: 'major',
    clinicalEffect: 'Risk of serotonin syndrome - potentially life-threatening.',
    management: 'Avoid combination. If necessary, start low and monitor closely for serotonin syndrome symptoms.',
  },
  {
    drug1Patterns: ['ace', 'lisinopril', 'enalapril', 'ramipril', 'benazepril', 'captopril'],
    drug2Patterns: ['potassium', 'spironolactone', 'aldactone'],
    severity: 'moderate',
    clinicalEffect: 'Additive hyperkalemia risk.',
    management: 'Monitor potassium levels. Consider reducing potassium supplementation.',
  },
  {
    drug1Patterns: ['metformin', 'glucophage'],
    drug2Patterns: ['contrast', 'iodinated'],
    severity: 'moderate',
    clinicalEffect: 'Risk of lactic acidosis with contrast-induced nephropathy.',
    management: 'Hold metformin for 48 hours after contrast. Check renal function before resuming.',
  },
];

// =============================================================================
// Allergy Cross-Reactivity Database
// =============================================================================

const ALLERGY_CROSS_REACTIONS: Array<{
  allergenPatterns: string[];
  crossReactsWith: string[];
  riskLevel: AllergyAlert['riskLevel'];
  notes: string;
}> = [
  {
    allergenPatterns: ['penicillin', 'amoxicillin', 'ampicillin', 'pcn'],
    crossReactsWith: ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'cephalexin', 'keflex', 'cefazolin', 'ancef', 'ceftriaxone', 'rocephin'],
    riskLevel: 'high',
    notes: 'Penicillin allergy with potential cross-reactivity to cephalosporins (1-2% risk with first-gen).',
  },
  {
    allergenPatterns: ['sulfa', 'sulfamethoxazole', 'bactrim', 'septra'],
    crossReactsWith: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine'],
    riskLevel: 'moderate',
    notes: 'Sulfonamide allergy. Cross-reactivity between antibiotic and non-antibiotic sulfonamides is low but possible.',
  },
  {
    allergenPatterns: ['codeine', 'morphine'],
    crossReactsWith: ['codeine', 'morphine', 'hydrocodone', 'oxycodone', 'hydromorphone', 'tramadol'],
    riskLevel: 'moderate',
    notes: 'Opioid reactions often pseudo-allergic (histamine release). True allergy is rare.',
  },
];

// =============================================================================
// Pregnancy Contraindications
// =============================================================================

const PREGNANCY_CONTRAINDICATIONS: Array<{
  drugPatterns: string[];
  severity: 'relative' | 'absolute';
  recommendation: string;
}> = [
  {
    drugPatterns: ['warfarin', 'coumadin'],
    severity: 'absolute',
    recommendation: 'Contraindicated in pregnancy. Use LMWH instead. Risk of fetal warfarin syndrome.',
  },
  {
    drugPatterns: ['isotretinoin', 'accutane'],
    severity: 'absolute',
    recommendation: 'Absolute contraindication. Causes severe birth defects.',
  },
  {
    drugPatterns: ['methotrexate', 'mtx'],
    severity: 'absolute',
    recommendation: 'Contraindicated. Causes fetal death and abnormalities. Discontinue 3 months before conception.',
  },
  {
    drugPatterns: ['statin', 'atorvastatin', 'simvastatin', 'rosuvastatin', 'lipitor', 'crestor', 'zocor'],
    severity: 'absolute',
    recommendation: 'Contraindicated. Cholesterol essential for fetal development.',
  },
  {
    drugPatterns: ['ace', 'lisinopril', 'enalapril', 'ramipril', 'benazepril'],
    severity: 'absolute',
    recommendation: 'Contraindicated especially in 2nd/3rd trimester. Causes fetal renal failure.',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function matchesPattern(drug: string, patterns: string[]): boolean {
  const drugLower = drug.toLowerCase();
  return patterns.some(pattern => drugLower.includes(pattern.toLowerCase()));
}

function checkDrugInteractions(proposedMed: string, currentMeds: string[]): Interaction[] {
  const interactions: Interaction[] = [];
  
  for (const rule of DRUG_INTERACTIONS) {
    const proposedMatches1 = matchesPattern(proposedMed, rule.drug1Patterns);
    const proposedMatches2 = matchesPattern(proposedMed, rule.drug2Patterns);
    
    for (const currentMed of currentMeds) {
      const currentMatches1 = matchesPattern(currentMed, rule.drug1Patterns);
      const currentMatches2 = matchesPattern(currentMed, rule.drug2Patterns);
      
      if ((proposedMatches1 && currentMatches2) || (proposedMatches2 && currentMatches1)) {
        interactions.push({
          drug1: proposedMed,
          drug2: currentMed,
          severity: rule.severity,
          clinicalEffect: rule.clinicalEffect,
          management: rule.management,
        });
      }
    }
  }
  
  return interactions;
}

function checkAllergyAlerts(proposedMed: string, allergies: Allergy[]): AllergyAlert[] {
  const alerts: AllergyAlert[] = [];
  
  for (const allergy of allergies) {
    // Direct match
    if (matchesPattern(proposedMed, [allergy.allergen])) {
      alerts.push({
        drug: proposedMed,
        allergen: allergy.allergen,
        alertType: 'direct',
        riskLevel: 'high',
        notes: `Direct allergy match: ${allergy.allergen}`,
      });
      continue;
    }
    
    // Cross-reactivity check
    for (const rule of ALLERGY_CROSS_REACTIONS) {
      if (matchesPattern(allergy.allergen, rule.allergenPatterns)) {
        if (matchesPattern(proposedMed, rule.crossReactsWith)) {
          alerts.push({
            drug: proposedMed,
            allergen: allergy.allergen,
            alertType: 'cross-reactivity',
            riskLevel: rule.riskLevel,
            notes: rule.notes,
          });
        }
      }
    }
  }
  
  return alerts;
}

function checkContraindications(
  proposedMed: string,
  pregnancyStatus?: string,
  renalFunction?: string
): Contraindication[] {
  const contraindications: Contraindication[] = [];
  
  // Pregnancy contraindications
  if (pregnancyStatus === 'pregnant') {
    for (const rule of PREGNANCY_CONTRAINDICATIONS) {
      if (matchesPattern(proposedMed, rule.drugPatterns)) {
        contraindications.push({
          medication: proposedMed,
          condition: 'Pregnancy',
          severity: rule.severity,
          recommendation: rule.recommendation,
        });
      }
    }
  }
  
  // Renal impairment contraindications
  if (renalFunction && renalFunction !== 'normal') {
    const renalContraindicated = ['metformin', 'nsaid', 'ibuprofen', 'naproxen'];
    if (matchesPattern(proposedMed, renalContraindicated)) {
      contraindications.push({
        medication: proposedMed,
        condition: `Renal Impairment (${renalFunction})`,
        severity: renalFunction === 'severe-impairment' ? 'absolute' : 'relative',
        recommendation: 'Use with caution or avoid. Dose adjustment may be required.',
      });
    }
  }
  
  return contraindications;
}

function generateClinicalGuidance(
  interactions: Interaction[],
  allergyAlerts: AllergyAlert[],
  contraindications: Contraindication[],
  renalFunction?: string
): ClinicalGuidance[] {
  const guidance: ClinicalGuidance[] = [];
  
  if (interactions.length > 0) {
    const majorCount = interactions.filter(i => i.severity === 'major' || i.severity === 'contraindicated').length;
    guidance.push({
      category: 'Drug Interactions',
      message: `${interactions.length} interaction(s) detected, ${majorCount} major.`,
      recommendation: 'Review interactions before prescribing. Consider alternatives if major interactions present.',
    });
  }
  
  if (allergyAlerts.length > 0) {
    guidance.push({
      category: 'Allergy Alerts',
      message: `${allergyAlerts.length} allergy alert(s) detected.`,
      recommendation: 'Verify patient allergy history. Consider alternative medications.',
    });
  }
  
  if (contraindications.length > 0) {
    guidance.push({
      category: 'Contraindications',
      message: `${contraindications.length} contraindication(s) detected.`,
      recommendation: 'Do not prescribe unless benefits clearly outweigh risks. Document rationale.',
    });
  }
  
  if (renalFunction && renalFunction !== 'normal') {
    guidance.push({
      category: 'Renal Function',
      message: `Patient has ${renalFunction.replace('-', ' ')}.`,
      recommendation: 'Consider dose adjustments for renally-cleared medications.',
    });
  }
  
  return guidance;
}

function determineRiskLevel(
  interactions: Interaction[],
  allergyAlerts: AllergyAlert[],
  contraindications: Contraindication[]
): 'low' | 'moderate' | 'high' | 'critical' {
  // Check for absolute contraindications
  if (contraindications.some(c => c.severity === 'absolute')) {
    return 'critical';
  }
  
  // Check for contraindicated interactions
  if (interactions.some(i => i.severity === 'contraindicated')) {
    return 'critical';
  }
  
  // Check for major interactions
  if (interactions.some(i => i.severity === 'major')) {
    return 'high';
  }
  
  // Check for high-risk allergy alerts
  if (allergyAlerts.some(a => a.riskLevel === 'high')) {
    return 'high';
  }
  
  // Check for moderate risks
  if (interactions.some(i => i.severity === 'moderate') ||
      allergyAlerts.some(a => a.riskLevel === 'moderate') ||
      contraindications.length > 0) {
    return 'moderate';
  }
  
  return 'low';
}

// =============================================================================
// Request Validation
// =============================================================================

function validateRequest(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  const bodyObj = body as Record<string, unknown>;
  
  // New format validation
  if (bodyObj.proposedMedication !== undefined) {
    if (typeof bodyObj.proposedMedication !== 'object' || !bodyObj.proposedMedication) {
      errors.push('proposedMedication must be an object');
    } else {
      const med = bodyObj.proposedMedication as Record<string, unknown>;
      if (!med.name || typeof med.name !== 'string') {
        errors.push('proposedMedication.name is required');
      }
    }
    
    // currentMedications is REQUIRED when using proposedMedication format
    if (bodyObj.currentMedications === undefined) {
      errors.push('currentMedications is required');
    } else if (!Array.isArray(bodyObj.currentMedications)) {
      errors.push('currentMedications must be an array');
    }
    
    // allergies is REQUIRED when using proposedMedication format
    if (bodyObj.allergies === undefined) {
      errors.push('allergies is required');
    } else if (!Array.isArray(bodyObj.allergies)) {
      errors.push('allergies must be an array');
    }
  }
  // Legacy format validation  
  else if (bodyObj.medications !== undefined) {
    if (!Array.isArray(bodyObj.medications) || bodyObj.medications.length === 0) {
      errors.push('medications is required and must be a non-empty array');
    }
  }
  // Neither format provided
  else {
    errors.push('Either proposedMedication or medications is required');
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// API Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DrugCheckResponse>
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    const body = req.body as DrugCheckRequest;
    
    let proposedMedName: string;
    let currentMedNames: string[];
    let allergies: Allergy[];
    
    // Handle new format
    if (body.proposedMedication) {
      proposedMedName = body.proposedMedication.name;
      currentMedNames = (body.currentMedications || []).map(m => m.name);
      allergies = body.allergies || [];
    }
    // Handle legacy format
    else {
      const meds = body.medications || [];
      proposedMedName = meds[0] || '';
      currentMedNames = meds.slice(1).concat(body.includeCurrentMedications || []);
      allergies = [];
    }
    
    // Run checks
    const interactions = checkDrugInteractions(proposedMedName, currentMedNames);
    const allergyAlerts = checkAllergyAlerts(proposedMedName, allergies);
    const contraindications = checkContraindications(
      proposedMedName,
      body.pregnancyStatus,
      body.renalFunction
    );
    const clinicalGuidance = generateClinicalGuidance(
      interactions,
      allergyAlerts,
      contraindications,
      body.renalFunction
    );
    const overallRiskLevel = determineRiskLevel(interactions, allergyAlerts, contraindications);
    
    // Determine if safe to administer
    const safeToAdminister = 
      overallRiskLevel === 'low' &&
      allergyAlerts.filter(a => a.alertType === 'direct').length === 0;
    
    // Log for safety audit
    console.log('[AUDIT] Drug check:', {
      timestamp: new Date().toISOString(),
      proposedMedication: proposedMedName,
      currentMedicationCount: currentMedNames.length,
      interactionCount: interactions.length,
      allergyAlertCount: allergyAlerts.length,
      contraindicationCount: contraindications.length,
      overallRiskLevel,
      safeToAdminister,
    });
    
    if (overallRiskLevel === 'critical' || overallRiskLevel === 'high') {
      console.error('[CRITICAL DRUG CHECK]', {
        timestamp: new Date().toISOString(),
        proposedMedication: proposedMedName,
        interactions: interactions.filter(i => i.severity === 'major' || i.severity === 'contraindicated'),
        allergyAlerts: allergyAlerts.filter(a => a.riskLevel === 'high'),
        contraindications,
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        interactions,
        allergyAlerts,
        contraindications,
        safeToAdminister,
        overallRiskLevel,
        clinicalGuidance,
        warnings: interactions.map(i => i.clinicalEffect),
        recommendations: clinicalGuidance.map(g => g.recommendation),
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Drug interaction check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during drug interaction check',
      timestamp: new Date().toISOString(),
    });
  }
}
