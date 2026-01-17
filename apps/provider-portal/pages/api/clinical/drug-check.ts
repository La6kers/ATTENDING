// =============================================================================
// ATTENDING AI - Drug Interaction Check API
// apps/provider-portal/pages/api/clinical/drug-check.ts
//
// CRITICAL SAFETY ENDPOINT: Checks for drug-drug interactions and allergy alerts.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  drugInteractionChecker,
  type DrugCheckResult,
  type DrugInteraction,
  type AllergyAlert
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
      severity: string;
      clinicalEffect: string;
      management: string;
    }>;
    criticalInteractions: Array<{
      drug1: string;
      drug2: string;
      severity: string;
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

function validateRequest(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  const bodyObj = body as Record<string, unknown>;
  
  if (!bodyObj.medications || !Array.isArray(bodyObj.medications)) {
    errors.push('medications is required and must be an array');
  }
  
  if (bodyObj.medications && Array.isArray(bodyObj.medications) && bodyObj.medications.length === 0) {
    errors.push('medications array cannot be empty');
  }
  
  return { valid: errors.length === 0, errors };
}

function determineOverallRiskLevel(result: DrugCheckResult): 'low' | 'moderate' | 'high' | 'critical' {
  // Check for contraindicated interactions
  if (result.interactions.some(i => i.severity === 'contraindicated')) {
    return 'critical';
  }
  // Check for major interactions
  if (result.interactions.some(i => i.severity === 'major')) {
    return 'high';
  }
  // Check for moderate interactions
  if (result.interactions.some(i => i.severity === 'moderate')) {
    return 'moderate';
  }
  // Check for allergy alerts
  if (result.allergyAlerts.length > 0) {
    return result.allergyAlerts.some(a => a.severity === 'severe') ? 'high' : 'moderate';
  }
  return 'low';
}

function transformInteraction(interaction: DrugInteraction) {
  return {
    drug1: interaction.drug1,
    drug2: interaction.drug2,
    severity: interaction.severity,
    clinicalEffect: interaction.description,
    management: interaction.management,
  };
}

function transformAllergyAlert(alert: AllergyAlert) {
  return {
    drug: alert.drug,
    allergen: alert.allergen,
    riskLevel: alert.severity,
    notes: alert.crossReactivity ? 'Cross-reactivity possible' : undefined,
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
    
    // Convert allergies to string array for the checker
    const allergyStrings = (body.allergies || []).map(a => a.allergen);
    
    // Check interactions and allergies using the singleton checker
    const result = drugInteractionChecker.check({
      medications: allMedications,
      allergies: allergyStrings,
    });
    
    // Transform for response
    const transformedInteractions = result.interactions.map(transformInteraction);
    
    // Separate critical (major/contraindicated) from non-critical
    const criticalInteractions = result.interactions
      .filter(i => i.severity === 'major' || i.severity === 'contraindicated')
      .map(transformInteraction);
    
    const transformedAllergyAlerts = result.allergyAlerts.map(transformAllergyAlert);
    
    const riskLevel = determineOverallRiskLevel(result);
    
    // Generate recommendations based on results
    const recommendations: string[] = [];
    if (result.contraindications.length > 0) {
      recommendations.push(...result.contraindications);
    }
    if (result.warnings.length > 0) {
      recommendations.push(...result.warnings);
    }
    if (criticalInteractions.length > 0) {
      recommendations.push('Review critical drug interactions before prescribing');
    }
    if (transformedAllergyAlerts.length > 0) {
      recommendations.push('Patient has allergy alerts - verify safety before prescribing');
    }
    
    // Log critical interactions for safety monitoring
    if (criticalInteractions.length > 0) {
      console.error('[CRITICAL DRUG INTERACTION]', {
        timestamp: new Date().toISOString(),
        medications: allMedications,
        criticalInteractions,
      });
    }
    
    console.log('[AUDIT] Drug interaction check:', {
      timestamp: new Date().toISOString(),
      medicationCount: allMedications.length,
      interactionCount: result.interactions.length,
      criticalCount: criticalInteractions.length,
      allergyAlertCount: result.allergyAlerts.length,
      riskLevel,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        hasInteractions: result.interactions.length > 0,
        hasAllergyAlerts: result.allergyAlerts.length > 0,
        interactions: transformedInteractions,
        criticalInteractions,
        allergyAlerts: transformedAllergyAlerts,
        recommendations,
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
