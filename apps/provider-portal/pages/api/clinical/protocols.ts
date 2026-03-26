// =============================================================================
// ATTENDING AI - Clinical Protocols API
// apps/provider-portal/pages/api/clinical/protocols.ts
//
// Endpoint for retrieving clinical protocols based on condition/diagnosis.
// Returns evidence-based protocols with time-sensitive actions.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  clinicalProtocolEngine,
  type ProtocolResult
} from '@attending/clinical-services';
import { requireAuth } from '@/lib/api/auth';

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
    protocol: ProtocolResult;
    relatedProtocols?: ProtocolResult[];
    references: string[];
    lastUpdated: string;
  };
  error?: string;
  timestamp: string;
}

const PROTOCOL_ALIASES: Record<string, string> = {
  'mi': 'acs',
  'myocardial infarction': 'acs',
  'heart attack': 'acs',
  'stemi': 'acs',
  'nstemi': 'acs',
  'acute coronary syndrome': 'acs',
  'chest pain cardiac': 'acs',
  'cva': 'stroke',
  'cerebrovascular accident': 'stroke',
  'tia': 'stroke',
  'septic shock': 'sepsis',
  'severe sepsis': 'sepsis',
  'respiratory failure': 'respiratory',
  'diabetic ketoacidosis': 'dka',
  'pulmonary embolism': 'pe',
};

function normalizeCondition(condition: string): string {
  const lower = condition.toLowerCase().trim();
  return PROTOCOL_ALIASES[lower] || lower.replace(/\s+/g, '-');
}

function validateRequest(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  const bodyObj = body as Record<string, unknown>;
  
  if (!bodyObj.condition || typeof bodyObj.condition !== 'string') {
    errors.push('condition is required and must be a string');
  }
  
  if (bodyObj.severity && !['mild', 'moderate', 'severe', 'critical'].includes(bodyObj.severity as string)) {
    errors.push('severity must be mild, moderate, severe, or critical');
  }
  
  return { valid: errors.length === 0, errors };
}

export default requireAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolResponse>
) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  let requestData: ProtocolApiRequest;
  
  if (req.method === 'GET') {
    requestData = {
      condition: req.query.condition as string,
      severity: req.query.severity as ProtocolApiRequest['severity'],
      setting: req.query.setting as ProtocolApiRequest['setting'],
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
    
    const normalizedCondition = normalizeCondition(requestData.condition);
    
    // Try to get protocol using the singleton engine
    const protocol = clinicalProtocolEngine.getProtocol(normalizedCondition);
    
    if (!protocol) {
      const allProtocols = clinicalProtocolEngine.getAllProtocols();
      const availableNames = allProtocols.map(p => p.name).join(', ');
      
      return res.status(404).json({
        success: false,
        error: `No protocol found for condition: ${requestData.condition}. Available protocols: ${availableNames}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get all protocols for potential related protocols
    const allProtocols = clinicalProtocolEngine.getAllProtocols();
    const relatedProtocols = allProtocols
      .filter(p => p.protocolId !== protocol.protocolId)
      .slice(0, 3);
    
    console.log('[AUDIT] Protocol retrieved:', {
      timestamp: new Date().toISOString(),
      condition: requestData.condition,
      severity: requestData.severity,
      protocolId: protocol.protocolId,
      protocolName: protocol.name,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        protocol,
        relatedProtocols: relatedProtocols.length > 0 ? relatedProtocols : undefined,
        references: [protocol.source],
        lastUpdated: protocol.lastUpdated,
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
});
