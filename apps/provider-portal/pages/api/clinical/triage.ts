// =============================================================================
// ATTENDING AI - Triage Classification API
// apps/provider-portal/pages/api/clinical/triage.ts
//
// Endpoint for ESI triage level classification using clinical services package.
// Returns triage level, rationale, and recommended disposition.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { TriageClassifier, type TriageInput, type TriageResult } from '@attending/clinical-services';

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
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.chiefComplaint || typeof body.chiefComplaint !== 'string') {
    errors.push('chiefComplaint is required and must be a string');
  }
  
  if (body.vitalSigns) {
    const vs = body.vitalSigns;
    if (vs.heartRate && (vs.heartRate < 0 || vs.heartRate > 300)) {
      errors.push('heartRate must be between 0-300');
    }
    if (vs.oxygenSaturation && (vs.oxygenSaturation < 0 || vs.oxygenSaturation > 100)) {
      errors.push('oxygenSaturation must be between 0-100');
    }
    if (vs.painLevel && (vs.painLevel < 0 || vs.painLevel > 10)) {
      errors.push('painLevel must be between 0-10');
    }
  }
  
  if (body.patientAge && (body.patientAge < 0 || body.patientAge > 150)) {
    errors.push('patientAge must be between 0-150');
  }
  
  return { valid: errors.length === 0, errors };
}

// Map request to classifier input
function mapToTriageInput(body: TriageRequest): TriageInput {
  return {
    chiefComplaint: body.chiefComplaint,
    vitalSigns: body.vitalSigns ? {
      heartRate: body.vitalSigns.heartRate,
      systolicBP: body.vitalSigns.systolicBP,
      diastolicBP: body.vitalSigns.diastolicBP,
      respiratoryRate: body.vitalSigns.respiratoryRate,
      temperature: body.vitalSigns.temperature,
      oxygenSaturation: body.vitalSigns.oxygenSaturation,
      painLevel: body.vitalSigns.painLevel,
    } : undefined,
    patientAge: body.patientAge,
    symptoms: body.symptoms || [],
    redFlags: body.redFlags || [],
    mentalStatus: body.mentalStatus,
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
    
    // Initialize classifier and classify
    const classifier = new TriageClassifier();
    const result = classifier.classify(input);
    
    // Log for audit trail (in production, this would go to a proper audit service)
    console.log('[AUDIT] Triage classification:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: input.chiefComplaint,
      esiLevel: result.esiLevel,
      disposition: result.disposition,
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
