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
  type LabRecommendation,
  type LabBundle,
  type RecommendationResult
} from '@attending/clinical-services';

// Types
interface LabRequest {
  chiefComplaint: string;
  symptoms?: string[];
  redFlags?: string[];
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  existingConditions?: string[];
  patientAge?: number;
}

interface TransformedRecommendation {
  testCode: string;
  testName: string;
  category: string;
  priority: string;
  rationale: string;
  confidence: number;
  specimenType: string;
  turnaroundTime: string;
  estimatedCost?: number;
}

interface LabResponse {
  success: boolean;
  data?: {
    recommendations: TransformedRecommendation[];
    bundles: LabBundle[];
    urgentTests: TransformedRecommendation[];
    statCount: number;
    routineCount: number;
    totalEstimatedCost: number;
    orderingSummary: string;
    clinicalContext: string;
  };
  error?: string;
  timestamp: string;
}

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.chiefComplaint || typeof body.chiefComplaint !== 'string') {
    errors.push('chiefComplaint is required and must be a string');
  }
  
  if (body.patientAge && (body.patientAge < 0 || body.patientAge > 150)) {
    errors.push('patientAge must be between 0-150');
  }
  
  return { valid: errors.length === 0, errors };
}

function transformRecommendation(rec: LabRecommendation): TransformedRecommendation {
  return {
    testCode: rec.test.code,
    testName: rec.test.name,
    category: rec.test.category,
    priority: rec.priority,
    rationale: rec.rationale,
    confidence: rec.confidence,
    specimenType: rec.test.specimenType,
    turnaroundTime: rec.test.turnaroundTime,
    estimatedCost: rec.test.cost,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LabResponse>
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
    
    const body = req.body as LabRequest;
    
    // Build symptoms array for recommender
    const allSymptoms = [body.chiefComplaint];
    if (body.symptoms) allSymptoms.push(...body.symptoms);
    if (body.redFlags) allSymptoms.push(...body.redFlags);
    
    // Build context
    const context: { age?: number; comorbidities?: string[]; vitalSigns?: Record<string, number> } = {};
    if (body.patientAge) context.age = body.patientAge;
    if (body.existingConditions) context.comorbidities = body.existingConditions;
    if (body.vitalSigns) {
      context.vitalSigns = {
        heartRate: body.vitalSigns.heartRate,
        bloodPressure: body.vitalSigns.bloodPressure,
        temperature: body.vitalSigns.temperature,
        oxygenSaturation: body.vitalSigns.oxygenSaturation,
      };
    }
    
    // Get recommendations
    const recommender = new LabRecommender();
    const result: RecommendationResult = recommender.recommend(allSymptoms, context);
    
    // Transform recommendations
    const transformedRecs = result.individualTests.map(transformRecommendation);
    const transformedUrgent = result.urgentTests.map(transformRecommendation);
    
    // Count by priority
    const statCount = result.individualTests.filter(r => r.priority === 'STAT').length;
    const routineCount = result.individualTests.filter(r => r.priority === 'Routine').length;
    
    // Generate clinical context
    const clinicalContext = generateClinicalContext(body, result);
    
    console.log('[AUDIT] Lab recommendations:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: body.chiefComplaint,
      bundleCount: result.bundles.length,
      testCount: result.individualTests.length,
      urgentCount: result.urgentTests.length,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        recommendations: transformedRecs,
        bundles: result.bundles,
        urgentTests: transformedUrgent,
        statCount,
        routineCount,
        totalEstimatedCost: result.estimatedCost,
        orderingSummary: result.orderingSummary,
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

function generateClinicalContext(request: LabRequest, result: RecommendationResult): string {
  const parts: string[] = [];
  
  parts.push(`Patient presents with ${request.chiefComplaint}.`);
  
  if (request.redFlags && request.redFlags.length > 0) {
    parts.push(`Red flags identified: ${request.redFlags.join(', ')}.`);
  }
  
  if (result.bundles.length > 0) {
    parts.push(`Recommended bundles: ${result.bundles.map(b => b.name).join(', ')}.`);
  }
  
  if (result.urgentTests.length > 0) {
    parts.push(`STAT: ${result.urgentTests.length} time-sensitive tests recommended.`);
  }
  
  return parts.join(' ');
}
