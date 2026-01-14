// =============================================================================
// ATTENDING AI - Lab Recommendations API
// apps/provider-portal/pages/api/clinical/labs.ts
//
// Endpoint for AI-powered lab recommendations based on clinical presentation.
// Returns prioritized lab bundles with clinical rationale.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  LabRecommender, 
  type LabRecommendationInput, 
  type LabRecommendation 
} from '@attending/clinical-services';

// Types
interface LabRequest {
  chiefComplaint: string;
  workingDiagnosis?: string;
  symptoms?: string[];
  redFlags?: string[];
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  existingConditions?: string[];
  currentMedications?: string[];
  recentLabs?: {
    testCode: string;
    resultDate: string;
    value?: number;
    unit?: string;
  }[];
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'other';
  pregnancyStatus?: 'pregnant' | 'not-pregnant' | 'unknown';
}

interface LabResponse {
  success: boolean;
  data?: {
    recommendations: LabRecommendation[];
    bundlesSuggested: string[];
    criticalCount: number;
    recommendedCount: number;
    considerCount: number;
    totalEstimatedCost?: number;
    clinicalContext: string;
  };
  error?: string;
  timestamp: string;
}

// Validate request body
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.chiefComplaint || typeof body.chiefComplaint !== 'string') {
    errors.push('chiefComplaint is required and must be a string');
  }
  
  if (body.patientAge && (body.patientAge < 0 || body.patientAge > 150)) {
    errors.push('patientAge must be between 0-150');
  }
  
  if (body.patientSex && !['male', 'female', 'other'].includes(body.patientSex)) {
    errors.push('patientSex must be male, female, or other');
  }
  
  return { valid: errors.length === 0, errors };
}

// Map request to recommender input
function mapToLabInput(body: LabRequest): LabRecommendationInput {
  return {
    chiefComplaint: body.chiefComplaint,
    workingDiagnosis: body.workingDiagnosis,
    symptoms: body.symptoms || [],
    redFlags: body.redFlags || [],
    vitalSigns: body.vitalSigns,
    existingConditions: body.existingConditions || [],
    currentMedications: body.currentMedications || [],
    recentLabs: body.recentLabs || [],
    patientAge: body.patientAge,
    patientSex: body.patientSex,
    pregnancyStatus: body.pregnancyStatus,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LabResponse>
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
    
    // Map to recommender input
    const input = mapToLabInput(req.body);
    
    // Initialize recommender and get recommendations
    const recommender = new LabRecommender();
    const recommendations = recommender.recommend(input);
    
    // Categorize recommendations
    const critical = recommendations.filter(r => r.category === 'critical');
    const recommended = recommendations.filter(r => r.category === 'recommended');
    const consider = recommendations.filter(r => r.category === 'consider');
    
    // Get suggested bundles
    const bundlesSuggested = [...new Set(recommendations.map(r => r.bundle).filter(Boolean))] as string[];
    
    // Generate clinical context
    const clinicalContext = generateClinicalContext(input, recommendations);
    
    // Log for audit trail
    console.log('[AUDIT] Lab recommendations:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: input.chiefComplaint,
      workingDiagnosis: input.workingDiagnosis,
      recommendationCount: recommendations.length,
      criticalCount: critical.length,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        recommendations,
        bundlesSuggested,
        criticalCount: critical.length,
        recommendedCount: recommended.length,
        considerCount: consider.length,
        clinicalContext,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Lab recommendations failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during lab recommendation',
      timestamp: new Date().toISOString(),
    });
  }
}

// Generate clinical context narrative
function generateClinicalContext(
  input: LabRecommendationInput, 
  recommendations: LabRecommendation[]
): string {
  const parts: string[] = [];
  
  parts.push(`Patient presents with ${input.chiefComplaint}.`);
  
  if (input.workingDiagnosis) {
    parts.push(`Working diagnosis: ${input.workingDiagnosis}.`);
  }
  
  if (input.redFlags && input.redFlags.length > 0) {
    parts.push(`Red flags identified: ${input.redFlags.join(', ')}.`);
  }
  
  const critical = recommendations.filter(r => r.category === 'critical');
  if (critical.length > 0) {
    parts.push(`CRITICAL: ${critical.length} time-sensitive labs recommended.`);
  }
  
  return parts.join(' ');
}
