// =============================================================================
// ATTENDING AI - Drug Interactions API
// apps/provider-portal/pages/api/clinical/drug-check.ts
//
// Endpoint for checking drug-drug interactions and allergy cross-reactivity.
// Critical safety feature for medication ordering workflow.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  DrugInteractionChecker, 
  type DrugCheckInput, 
  type DrugInteractionResult,
  type DrugInteraction,
  type AllergyAlert 
} from '@attending/clinical-services';

// Types
interface DrugCheckRequest {
  proposedMedication: {
    name: string;
    class?: string;
    dose?: string;
    route?: string;
    frequency?: string;
  };
  currentMedications: {
    name: string;
    class?: string;
    dose?: string;
  }[];
  allergies: {
    allergen: string;
    reaction?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  }[];
  patientAge?: number;
  renalFunction?: 'normal' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment' | 'esrd';
  hepaticFunction?: 'normal' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment';
  pregnancyStatus?: 'pregnant' | 'breastfeeding' | 'not-pregnant' | 'unknown';
}

interface DrugCheckResponse {
  success: boolean;
  data?: {
    safeToAdminister: boolean;
    requiresReview: boolean;
    interactions: DrugInteraction[];
    allergyAlerts: AllergyAlert[];
    contraindications: string[];
    dosageAdjustments: string[];
    monitoringRequired: string[];
    overallRiskLevel: 'low' | 'moderate' | 'high' | 'contraindicated';
    clinicalGuidance: string;
  };
  error?: string;
  timestamp: string;
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.proposedMedication || !body.proposedMedication.name) {
    errors.push('proposedMedication.name is required');
  }
  
  if (!body.currentMedications || !Array.isArray(body.currentMedications)) {
    errors.push('currentMedications must be an array');
  }
  
  if (!body.allergies || !Array.isArray(body.allergies)) {
    errors.push('allergies must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}

// Map request to checker input
function mapToDrugCheckInput(body: DrugCheckRequest): DrugCheckInput {
  return {
    proposedMedication: body.proposedMedication,
    currentMedications: body.currentMedications,
    allergies: body.allergies,
    patientAge: body.patientAge,
    renalFunction: body.renalFunction,
    hepaticFunction: body.hepaticFunction,
    pregnancyStatus: body.pregnancyStatus,
  };
}

// Generate clinical guidance based on results
function generateClinicalGuidance(
  interactions: DrugInteraction[],
  allergyAlerts: AllergyAlert[],
  contraindications: string[]
): string {
  const parts: string[] = [];
  
  // Contraindication warning
  if (contraindications.length > 0) {
    parts.push(`⛔ CONTRAINDICATED: ${contraindications.join('. ')}`);
  }
  
  // Allergy warnings
  const severeAllergies = allergyAlerts.filter(a => a.severity === 'severe');
  if (severeAllergies.length > 0) {
    parts.push(`⚠️ SEVERE ALLERGY RISK: ${severeAllergies.map(a => a.description).join('. ')}`);
  }
  
  // Major interactions
  const majorInteractions = interactions.filter(i => i.severity === 'major');
  if (majorInteractions.length > 0) {
    parts.push(`⚠️ MAJOR INTERACTIONS: ${majorInteractions.map(i => 
      `${i.interactingDrug} - ${i.effect}`
    ).join('. ')}`);
  }
  
  // Moderate interactions
  const moderateInteractions = interactions.filter(i => i.severity === 'moderate');
  if (moderateInteractions.length > 0) {
    parts.push(`ℹ️ MODERATE INTERACTIONS: Monitor for ${moderateInteractions.map(i => 
      i.effect
    ).join(', ')}`);
  }
  
  if (parts.length === 0) {
    parts.push('✓ No significant interactions or contraindications identified');
  }
  
  return parts.join('\n\n');
}

// Determine overall risk level
function determineRiskLevel(
  interactions: DrugInteraction[],
  allergyAlerts: AllergyAlert[],
  contraindications: string[]
): 'low' | 'moderate' | 'high' | 'contraindicated' {
  if (contraindications.length > 0) return 'contraindicated';
  if (allergyAlerts.some(a => a.severity === 'severe')) return 'contraindicated';
  if (interactions.some(i => i.severity === 'major')) return 'high';
  if (interactions.some(i => i.severity === 'moderate')) return 'moderate';
  if (allergyAlerts.some(a => a.severity === 'moderate')) return 'moderate';
  return 'low';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DrugCheckResponse>
) {
  // CORS headers
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
    // Validate request
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Map to checker input
    const input = mapToDrugCheckInput(req.body);
    
    // Initialize checker and check interactions
    const checker = new DrugInteractionChecker();
    const result = checker.check(input);
    
    // Generate additional clinical context
    const clinicalGuidance = generateClinicalGuidance(
      result.interactions,
      result.allergyAlerts,
      result.contraindications
    );
    
    const overallRiskLevel = determineRiskLevel(
      result.interactions,
      result.allergyAlerts,
      result.contraindications
    );
    
    const safeToAdminister = overallRiskLevel === 'low';
    const requiresReview = overallRiskLevel !== 'low' && overallRiskLevel !== 'contraindicated';
    
    // Log for audit trail (HIPAA-compliant logging - no PHI)
    console.log('[AUDIT] Drug interaction check:', {
      timestamp: new Date().toISOString(),
      proposedMedication: input.proposedMedication.name,
      currentMedCount: input.currentMedications.length,
      allergyCount: input.allergies.length,
      interactionCount: result.interactions.length,
      allergyAlertCount: result.allergyAlerts.length,
      overallRiskLevel,
      safeToAdminister,
    });
    
    // CRITICAL: If contraindicated, log as warning
    if (overallRiskLevel === 'contraindicated') {
      console.warn('[SAFETY] Contraindicated medication attempted:', {
        timestamp: new Date().toISOString(),
        medication: input.proposedMedication.name,
        contraindications: result.contraindications,
        allergyAlerts: result.allergyAlerts.filter(a => a.severity === 'severe'),
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        safeToAdminister,
        requiresReview,
        interactions: result.interactions,
        allergyAlerts: result.allergyAlerts,
        contraindications: result.contraindications,
        dosageAdjustments: result.dosageAdjustments || [],
        monitoringRequired: result.monitoringRequired || [],
        overallRiskLevel,
        clinicalGuidance,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Drug interaction check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during drug interaction check. Manual pharmacist review recommended.',
      timestamp: new Date().toISOString(),
    });
  }
}
