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
  type ClinicalProtocol 
} from '@attending/clinical-services';

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
    relatedProtocols?: ClinicalProtocol[];
    references: string[];
    lastUpdated: string;
  };
  error?: string;
  timestamp: string;
}

const PROTOCOL_ALIASES: Record<string, string> = {
  'mi': 'protocol-acs',
  'myocardial infarction': 'protocol-acs',
  'heart attack': 'protocol-acs',
  'stemi': 'protocol-acs',
  'nstemi': 'protocol-acs',
  'acute coronary syndrome': 'protocol-acs',
  'acs': 'protocol-acs',
  'chest pain cardiac': 'protocol-acs',
  'cva': 'protocol-stroke',
  'cerebrovascular accident': 'protocol-stroke',
  'stroke': 'protocol-stroke',
  'tia': 'protocol-stroke',
  'sepsis': 'protocol-sepsis',
  'septic shock': 'protocol-sepsis',
  'severe sepsis': 'protocol-sepsis',
  'respiratory': 'protocol-respiratory',
  'respiratory failure': 'protocol-respiratory',
  'dka': 'protocol-dka',
  'diabetic ketoacidosis': 'protocol-dka',
  'pe': 'protocol-pe',
  'pulmonary embolism': 'protocol-pe',
  'trauma': 'protocol-trauma',
};

function normalizeConditionToProtocolId(condition: string): string {
  const lower = condition.toLowerCase().trim();
  return PROTOCOL_ALIASES[lower] || `protocol-${lower.replace(/\s+/g, '-')}`;
}

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.condition || typeof body.condition !== 'string') {
    errors.push('condition is required and must be a string');
  }
  
  if (body.severity && !['mild', 'moderate', 'severe', 'critical'].includes(body.severity)) {
    errors.push('severity must be mild, moderate, severe, or critical');
  }
  
  return { valid: errors.length === 0, errors };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolResponse>
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    const protocolId = normalizeConditionToProtocolId(requestData.condition);
    
    const protocolService = new ClinicalProtocolService();
    
    // Try to get protocol by ID
    let protocol = protocolService.getProtocol(protocolId);
    
    // If not found by ID, try searching by symptoms
    if (!protocol) {
      const matchingProtocols = protocolService.findMatchingProtocols([requestData.condition]);
      if (matchingProtocols.length > 0) {
        protocol = matchingProtocols[0];
      }
    }
    
    if (!protocol) {
      const allProtocols = protocolService.getAllProtocols();
      const availableNames = allProtocols.map(p => p.name).join(', ');
      
      return res.status(404).json({
        success: false,
        error: `No protocol found for condition: ${requestData.condition}. Available protocols: ${availableNames}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get related protocols from same category
    const relatedProtocols = protocolService.getProtocolsByCategory(protocol.category)
      .filter(p => p.id !== protocol!.id)
      .slice(0, 3);
    
    console.log('[AUDIT] Protocol retrieved:', {
      timestamp: new Date().toISOString(),
      condition: requestData.condition,
      severity: requestData.severity,
      protocolId: protocol.id,
      protocolName: protocol.name,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        protocol,
        relatedProtocols: relatedProtocols.length > 0 ? relatedProtocols : undefined,
        references: protocol.references || [],
        lastUpdated: protocol.lastUpdated || new Date().toISOString(),
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
