// =============================================================================
// ATTENDING AI - Triage Classification API
// apps/provider-portal/pages/api/clinical/triage.ts
//
// Endpoint for ESI triage level classification using clinical services package.
// Returns triage level, rationale, and recommended disposition.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { triageClassifier, type TriageInput, type TriageResult } from '@attending/clinical-services';

// Types
interface TriageRequest {
  chiefComplaint: string;
  vitalSigns?: {
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    painLevel?: number;
  };
  patientAge?: number;
  symptoms?: string[];
  redFlags?: string[];
  mentalStatus?: 'alert' | 'confused' | 'lethargic' | 'unresponsive';
}

interface TriageResponse {
  success: boolean;
  data?: TriageResult;
  error?: string;
  timestamp: string;
}

// Validate request body
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
  
  if (bodyObj.vitalSigns && typeof bodyObj.vitalSigns === 'object') {
    const vs = bodyObj.vitalSigns as Record<string, unknown>;
    if (vs.heartRate !== undefined && (typeof vs.heartRate !== 'number' || vs.heartRate < 0 || vs.heartRate > 300)) {
      errors.push('heartRate must be a number between 0-300');
    }
    if (vs.oxygenSaturation !== undefined && (typeof vs.oxygenSaturation !== 'number' || vs.oxygenSaturation < 0 || vs.oxygenSaturation > 100)) {
      errors.push('oxygenSaturation must be a number between 0-100');
    }
    if (vs.painLevel !== undefined && (typeof vs.painLevel !== 'number' || vs.painLevel < 0 || vs.painLevel > 10)) {
      errors.push('painLevel must be a number between 0-10');
    }
  }
  
  if (bodyObj.patientAge !== undefined && (typeof bodyObj.patientAge !== 'number' || bodyObj.patientAge < 0 || bodyObj.patientAge > 150)) {
    errors.push('patientAge must be a number between 0-150');
  }
  
  return { valid: errors.length === 0, errors };
}

// Map request to classifier input
function mapToTriageInput(body: TriageRequest): TriageInput {
  return {
    chiefComplaint: body.chiefComplaint,
    vitals: body.vitalSigns ? {
      heartRate: body.vitalSigns.heartRate,
      bloodPressure: body.vitalSigns.systolicBP ? {
        systolic: body.vitalSigns.systolicBP,
        diastolic: body.vitalSigns.diastolicBP || 80,
      } : undefined,
      respiratoryRate: body.vitalSigns.respiratoryRate,
      temperature: body.vitalSigns.temperature,
      oxygenSaturation: body.vitalSigns.oxygenSaturation,
      painLevel: body.vitalSigns.painLevel,
    } : undefined,
    age: body.patientAge,
    symptoms: body.symptoms || [],
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TriageResponse>
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
    
    // Map to classifier input
    const input = mapToTriageInput(req.body);
    
    // Classify using the singleton classifier
    const result = triageClassifier.classify(input);
    
    // Log for audit trail (in production, this would go to a proper audit service)
    console.log('[AUDIT] Triage classification:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: input.chiefComplaint,
      esiLevel: result.esiLevel,
      category: result.category,
      recommendedDisposition: result.recommendedDisposition,
    });
    
    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Triage classification failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during triage classification',
      timestamp: new Date().toISOString(),
    });
  }
}
