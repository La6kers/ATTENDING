// =============================================================================
// ATTENDING AI - Clinical Protocols API
// apps/provider-portal/pages/api/clinical/protocols.ts
//
// Endpoint for retrieving clinical protocols based on condition/diagnosis.
// Returns evidence-based protocols with time-sensitive actions.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  ClinicalProtocolService, 
  type ProtocolRequest,
  type ClinicalProtocol 
} from '@attending/clinical-services';

// Types
interface ProtocolApiRequest {
  condition: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  setting?: 'emergency' | 'inpatient' | 'outpatient' | 'icu';
  patientAge?: number;
  comorbidities?: string[];
}

interface ProtocolResponse {
  success: boolean;
  data?: {
    protocol: ClinicalProtocol;
    alternativeProtocols?: ClinicalProtocol[];
    references?: string[];
    lastUpdated: string;
    evidenceLevel: string;
  };
  error?: string;
  timestamp: string;
}

// Protocol lookup mapping
const PROTOCOL_ALIASES: Record<string, string> = {
  // Cardiac
  'mi': 'acs',
  'myocardial infarction': 'acs',
  'heart attack': 'acs',
  'stemi': 'acs',
  'nstemi': 'acs',
  'acute coronary syndrome': 'acs',
  'chest pain cardiac': 'acs',
  
  // Stroke
  'cva': 'stroke',
  'cerebrovascular accident': 'stroke',
  'tia': 'stroke',
  'transient ischemic attack': 'stroke',
  'brain attack': 'stroke',
  
  // Sepsis
  'septic shock': 'sepsis',
  'severe sepsis': 'sepsis',
  'systemic infection': 'sepsis',
  'bacteremia': 'sepsis',
  
  // Respiratory
  'respiratory failure': 'respiratory',
  'acute respiratory distress': 'respiratory',
  'ards': 'respiratory',
  'copd exacerbation': 'respiratory',
  'asthma exacerbation': 'respiratory',
  'pneumonia severe': 'respiratory',
  
  // Trauma
  'major trauma': 'trauma',
  'polytrauma': 'trauma',
  'traumatic injury': 'trauma',
  
  // DKA
  'diabetic ketoacidosis': 'dka',
  'dka': 'dka',
  'hyperglycemic crisis': 'dka',
  
  // PE
  'pulmonary embolism': 'pe',
  'pe': 'pe',
  'pulmonary embolus': 'pe',
};

// Normalize condition name
function normalizeCondition(condition: string): string {
  const lower = condition.toLowerCase().trim();
  return PROTOCOL_ALIASES[lower] || lower;
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.condition || typeof body.condition !== 'string') {
    errors.push('condition is required and must be a string');
  }
  
  if (body.severity && !['mild', 'moderate', 'severe', 'critical'].includes(body.severity)) {
    errors.push('severity must be mild, moderate, severe, or critical');
  }
  
  if (body.setting && !['emergency', 'inpatient', 'outpatient', 'icu'].includes(body.setting)) {
    errors.push('setting must be emergency, inpatient, outpatient, or icu');
  }
  
  return { valid: errors.length === 0, errors };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolResponse>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Support both GET (with query params) and POST
  let requestData: ProtocolApiRequest;
  
  if (req.method === 'GET') {
    requestData = {
      condition: req.query.condition as string,
      severity: req.query.severity as any,
      setting: req.query.setting as any,
      patientAge: req.query.patientAge ? parseInt(req.query.patientAge as string) : undefined,
    };
  } else if (req.method === 'POST') {
    requestData = req.body;
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.',
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    // Validate request
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Normalize condition name
    const normalizedCondition = normalizeCondition(requestData.condition);
    
    // Initialize service and get protocol
    const protocolService = new ClinicalProtocolService();
    
    const protocolRequest: ProtocolRequest = {
      condition: normalizedCondition,
      severity: requestData.severity,
      setting: requestData.setting || 'emergency',
      patientAge: requestData.patientAge,
      comorbidities: requestData.comorbidities || [],
    };
    
    const protocol = protocolService.getProtocol(protocolRequest);
    
    if (!protocol) {
      return res.status(404).json({
        success: false,
        error: `No protocol found for condition: ${requestData.condition}. Available protocols: stroke, acs, sepsis, respiratory, trauma, dka, pe`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get alternative protocols if applicable
    const alternativeProtocols = protocolService.getAlternativeProtocols?.(normalizedCondition);
    
    // Log for audit trail
    console.log('[AUDIT] Protocol retrieved:', {
      timestamp: new Date().toISOString(),
      condition: normalizedCondition,
      severity: requestData.severity,
      setting: requestData.setting,
      protocolName: protocol.name,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        protocol,
        alternativeProtocols,
        references: protocol.references || [],
        lastUpdated: protocol.lastUpdated || new Date().toISOString(),
        evidenceLevel: protocol.evidenceLevel || 'Level I - High Quality',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Protocol retrieval failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during protocol retrieval',
      timestamp: new Date().toISOString(),
    });
  }
}
