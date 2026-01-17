// =============================================================================
// ATTENDING AI - Lab Recommendations API
// apps/provider-portal/pages/api/clinical/labs.ts
//
// Endpoint for AI-powered lab recommendations based on clinical presentation.
// Returns prioritized lab bundles with clinical rationale.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  labRecommender, 
  type LabRecommendation,
  type LabBundle,
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
  patientGender?: string;
}

interface TransformedRecommendation {
  testCode: string;
  testName: string;
  category: string;
  priority: string;
  rationale: string;
  bundle?: string;
}

interface LabResponse {
  success: boolean;
  data?: {
    recommendations: TransformedRecommendation[];
    bundles: LabBundle[];
    urgentTests: TransformedRecommendation[];
    statCount: number;
    routineCount: number;
    orderingSummary: string;
    clinicalContext: string;
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
  
  if (!bodyObj.chiefComplaint || typeof bodyObj.chiefComplaint !== 'string') {
    errors.push('chiefComplaint is required and must be a string');
  }
  
  if (bodyObj.patientAge !== undefined) {
    const age = bodyObj.patientAge as number;
    if (age < 0 || age > 150) {
      errors.push('patientAge must be between 0-150');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function transformRecommendation(rec: LabRecommendation): TransformedRecommendation {
  return {
    testCode: rec.testCode,
    testName: rec.testName,
    category: rec.category,
    priority: rec.priority,
    rationale: rec.rationale,
    bundle: rec.bundle,
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
    
    // Get recommendations using the singleton recommender
    const recommendations = labRecommender.getRecommendations({
      chiefComplaint: body.chiefComplaint,
      symptoms: allSymptoms,
      age: body.patientAge || 0,
      gender: body.patientGender || 'unknown',
      medicalHistory: body.existingConditions,
      redFlags: body.redFlags,
    });
    
    // Transform recommendations
    const transformedRecs = recommendations.map(transformRecommendation);
    
    // Separate urgent (STAT) tests
    const urgentTests = transformedRecs.filter(r => r.priority === 'STAT');
    
    // Count by priority
    const statCount = urgentTests.length;
    const routineCount = transformedRecs.filter(r => r.priority === 'ROUTINE').length;
    
    // Get bundles that were recommended
    const bundleIds = [...new Set(recommendations.filter(r => r.bundle).map(r => r.bundle!))];
    const bundles = bundleIds.map(id => labRecommender.getBundle(id)).filter((b): b is LabBundle => b !== undefined);
    
    // Generate clinical context
    const clinicalContext = generateClinicalContext(body, transformedRecs, bundles);
    
    // Generate ordering summary
    const orderingSummary = generateOrderingSummary(transformedRecs, bundles);
    
    console.log('[AUDIT] Lab recommendations:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: body.chiefComplaint,
      bundleCount: bundles.length,
      testCount: transformedRecs.length,
      urgentCount: urgentTests.length,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        recommendations: transformedRecs,
        bundles,
        urgentTests,
        statCount,
        routineCount,
        orderingSummary,
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

function generateClinicalContext(
  request: LabRequest, 
  recommendations: TransformedRecommendation[],
  bundles: LabBundle[]
): string {
  const parts: string[] = [];
  
  parts.push(`Patient presents with ${request.chiefComplaint}.`);
  
  if (request.redFlags && request.redFlags.length > 0) {
    parts.push(`Red flags identified: ${request.redFlags.join(', ')}.`);
  }
  
  if (bundles.length > 0) {
    parts.push(`Recommended bundles: ${bundles.map(b => b.name).join(', ')}.`);
  }
  
  const urgentCount = recommendations.filter(r => r.priority === 'STAT').length;
  if (urgentCount > 0) {
    parts.push(`STAT: ${urgentCount} time-sensitive tests recommended.`);
  }
  
  return parts.join(' ');
}

function generateOrderingSummary(
  recommendations: TransformedRecommendation[],
  bundles: LabBundle[]
): string {
  const parts: string[] = [];
  
  if (bundles.length > 0) {
    parts.push(`Lab bundles: ${bundles.map(b => b.name).join(', ')}`);
  }
  
  const statTests = recommendations.filter(r => r.priority === 'STAT');
  if (statTests.length > 0) {
    parts.push(`STAT orders: ${statTests.map(t => t.testName).join(', ')}`);
  }
  
  const routineTests = recommendations.filter(r => r.priority === 'ROUTINE');
  if (routineTests.length > 0) {
    parts.push(`Routine orders: ${routineTests.map(t => t.testName).join(', ')}`);
  }
  
  return parts.join('. ') || 'No lab orders recommended.';
}
