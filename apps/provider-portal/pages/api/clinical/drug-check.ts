// =============================================================================
// ATTENDING AI - Drug Interaction Check API
// apps/provider-portal/pages/api/clinical/drug-check.ts
//
// CRITICAL SAFETY ENDPOINT: Checks for drug-drug interactions and allergy alerts.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  DrugInteractionChecker,
  type InteractionCheckResult,
  type DrugInteraction,
  type SeverityLevel,
  type AllergyEntry
} from '@attending/clinical-services';

interface DrugCheckRequest {
  medications: string[];
  allergies?: Array<{
    allergen: string;
    reaction?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
  }>;
  includeCurrentMedications?: string[];
}

interface DrugCheckResponse {
  success: boolean;
  data?: {
    hasInteractions: boolean;
    hasAllergyAlerts: boolean;
    interactions: Array<{
      drug1: string;
      drug2: string;
      severity: SeverityLevel;
      clinicalEffect: string;
      management: string;
    }>;
    criticalInteractions: Array<{
      drug1: string;
      drug2: string;
      severity: SeverityLevel;
      clinicalEffect: string;
      management: string;
    }>;
    allergyAlerts: Array<{
      drug: string;
      allergen: string;
      riskLevel: string;
      notes?: string;
    }>;
    recommendations: string[];
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  };
  error?: string;
  timestamp: string;
}

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.medications || !Array.isArray(body.medications)) {
    errors.push('medications is required and must be an array');
  }
  
  if (body.medications && body.medications.length === 0) {
    errors.push('medications array cannot be empty');
  }
  
  return { valid: errors.length === 0, errors };
}

function determineOverallRiskLevel(result: InteractionCheckResult): 'low' | 'moderate' | 'high' | 'critical' {
  if (result.criticalInteractions.some(i => i.severity === 'contraindicated')) {
    return 'critical';
  }
  if (result.criticalInteractions.some(i => i.severity === 'severe')) {
    return 'high';
  }
  if (result.interactions.some(i => i.severity === 'moderate')) {
    return 'moderate';
  }
  return 'low';
}

function transformInteraction(interaction: DrugInteraction) {
  return {
    drug1: interaction.drug1,
    drug2: interaction.drug2,
    severity: interaction.severity,
    clinicalEffect: interaction.clinicalEffect,
    management: interaction.management,
  };
}

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
    
    // Combine with current medications if provided
    const allMedications = [
      ...body.medications,
      ...(body.includeCurrentMedications || [])
    ];
    
    // Convert allergies to expected format
    const allergies: AllergyEntry[] = (body.allergies || []).map(a => ({
      allergen: a.allergen,
      reaction: a.reaction || 'Unknown reaction',
      severity: a.severity || 'moderate',
    }));
    
    // Check interactions and allergies
    const checker = new DrugInteractionChecker();
    const result = checker.checkAll(allMedications, allergies);
    
    // Transform for response
    const transformedInteractions = result.interactions.map(transformInteraction);
    const transformedCritical = result.criticalInteractions.map(transformInteraction);
    
    const transformedAllergyAlerts = result.allergyAlerts.map(a => ({
      drug: a.drug,
      allergen: a.allergen,
      riskLevel: a.riskLevel,
      notes: a.crossReactivity?.notes,
    }));
    
    const riskLevel = determineOverallRiskLevel(result);
    
    // Log critical interactions for safety monitoring
    if (result.criticalInteractions.length > 0) {
      console.error('[CRITICAL DRUG INTERACTION]', {
        timestamp: new Date().toISOString(),
        medications: allMedications,
        criticalInteractions: result.criticalInteractions,
      });
    }
    
    console.log('[AUDIT] Drug interaction check:', {
      timestamp: new Date().toISOString(),
      medicationCount: allMedications.length,
      interactionCount: result.interactions.length,
      criticalCount: result.criticalInteractions.length,
      allergyAlertCount: result.allergyAlerts.length,
      riskLevel,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        hasInteractions: result.hasInteractions,
        hasAllergyAlerts: result.allergyAlerts.length > 0,
        interactions: transformedInteractions,
        criticalInteractions: transformedCritical,
        allergyAlerts: transformedAllergyAlerts,
        recommendations: result.recommendations,
        riskLevel,
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
