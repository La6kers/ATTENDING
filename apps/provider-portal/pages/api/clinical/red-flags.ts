// =============================================================================
// ATTENDING AI - Red Flags Evaluation API
// apps/provider-portal/pages/api/clinical/red-flags.ts
//
// CRITICAL SAFETY ENDPOINT: Evaluates patient symptoms for emergency red flags.
// Returns immediate action recommendations and escalation triggers.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  RedFlagEvaluator, 
  type EvaluationResult,
  type RedFlagMatch,
  type UrgencyLevel
} from '@attending/clinical-services';

// Types
interface RedFlagRequest {
  symptoms: string[];
  chiefComplaint?: string;
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
  medicalHistory?: string[];
  mentalStatus?: 'alert' | 'confused' | 'lethargic' | 'unresponsive';
  onsetDuration?: string;
  progression?: 'improving' | 'stable' | 'worsening' | 'rapidly-worsening';
}

interface RedFlagResponseData {
  hasRedFlags: boolean;
  urgencyLevel: UrgencyLevel;
  redFlags: Array<{
    category: string;
    pattern: string;
    symptom: string;
    severity: UrgencyLevel;
    matchedKeywords: string[];
    confidence: number;
    immediateAction: string;
    timeFrame: string;
  }>;
  immediateActions: string[];
  escalationRequired: boolean;
  escalationReason?: string;
  disposition: string;
  timeToAction?: string;
  emergencyProtocol?: string;
}

interface RedFlagResponse {
  success: boolean;
  data?: RedFlagResponseData;
  error?: string;
  timestamp: string;
}

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.symptoms && !body.chiefComplaint) {
    errors.push('Either symptoms array or chiefComplaint is required');
  }
  
  if (body.symptoms && !Array.isArray(body.symptoms)) {
    errors.push('symptoms must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}

// Transform RedFlagMatch to our API response format
function transformMatch(match: RedFlagMatch): RedFlagResponseData['redFlags'][0] {
  return {
    category: match.flag.category,
    pattern: match.flag.pattern,
    symptom: match.flag.pattern, // Use pattern as symptom description
    severity: match.flag.urgencyLevel,
    matchedKeywords: match.matchedKeywords,
    confidence: match.confidence,
    immediateAction: match.flag.immediateAction,
    timeFrame: match.flag.timeFrame,
  };
}

function generateImmediateActions(matches: RedFlagMatch[]): string[] {
  const actions: string[] = [];
  const categories = new Set(matches.map(m => m.flag.category));
  
  if (matches.some(m => m.flag.urgencyLevel === 'critical')) {
    actions.push('ACTIVATE RAPID RESPONSE or CALL CODE');
    actions.push('Ensure IV access and continuous monitoring');
    actions.push('Prepare for emergent intervention');
  }
  
  if (categories.has('Cardiovascular')) {
    actions.push('Obtain 12-lead ECG immediately');
    actions.push('Establish cardiac monitoring');
    actions.push('Prepare for troponin, BNP, D-dimer');
  }
  
  if (categories.has('Neurological')) {
    actions.push('Perform NIH Stroke Scale assessment');
    actions.push('Note time of symptom onset (last known well)');
    actions.push('Prepare for emergent neuroimaging');
  }
  
  if (categories.has('Respiratory')) {
    actions.push('Apply supplemental oxygen if SpO2 < 94%');
    actions.push('Prepare for ABG and chest imaging');
    actions.push('Have intubation equipment ready');
  }
  
  if (categories.has('Infectious')) {
    actions.push('Initiate sepsis bundle within 1 hour');
    actions.push('Blood cultures x2 before antibiotics');
    actions.push('Lactate level STAT');
    actions.push('30 mL/kg crystalloid if hypotensive');
  }
  
  if (categories.has('Psychiatric')) {
    actions.push('Initiate 1:1 observation');
    actions.push('Remove all potential weapons/ligatures');
    actions.push('Contact psychiatry for emergent evaluation');
  }
  
  if (categories.has('Allergic')) {
    actions.push('Prepare epinephrine (0.3-0.5 mg IM)');
    actions.push('Establish large-bore IV access');
    actions.push('Prepare for airway management');
  }
  
  return [...new Set(actions)];
}

function getDisposition(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
      return 'Immediate bedside evaluation - Resuscitation bay';
    case 'emergent':
      return 'Urgent bedside evaluation - High acuity area';
    case 'urgent':
      return 'Priority evaluation - Monitored bed';
    case 'moderate':
      return 'Standard evaluation - Treatment area';
    default:
      return 'Routine evaluation - Fast track acceptable';
  }
}

function getTimeToAction(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
      return 'Immediate - Physician at bedside NOW';
    case 'emergent':
      return 'Within 10 minutes';
    case 'urgent':
      return 'Within 30 minutes';
    case 'moderate':
      return 'Within 60 minutes';
    default:
      return 'Within 120 minutes';
  }
}

function getEmergencyProtocol(matches: RedFlagMatch[]): string | undefined {
  const categories = new Set(matches.map(m => m.flag.category));
  
  if (categories.has('Cardiovascular')) {
    const hasChestPain = matches.some(m => 
      m.matchedKeywords.some(kw => kw.toLowerCase().includes('chest'))
    );
    if (hasChestPain) return 'STEMI/ACS Protocol';
  }
  
  if (categories.has('Neurological')) {
    const hasStrokeSymptoms = matches.some(m => 
      m.matchedKeywords.some(kw => 
        kw.toLowerCase().includes('stroke') || 
        kw.toLowerCase().includes('weakness') ||
        kw.toLowerCase().includes('speech')
      )
    );
    if (hasStrokeSymptoms) return 'Stroke Alert Protocol';
  }
  
  if (categories.has('Infectious')) return 'Sepsis Bundle Protocol';
  if (categories.has('Allergic')) return 'Anaphylaxis Protocol';
  
  if (categories.has('Respiratory')) {
    if (matches.some(m => m.flag.urgencyLevel === 'critical')) {
      return 'Respiratory Failure Protocol';
    }
  }
  
  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RedFlagResponse>
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
    
    // Combine symptoms and chief complaint for evaluation
    const body = req.body as RedFlagRequest;
    const allSymptoms = [...(body.symptoms || [])];
    if (body.chiefComplaint && !allSymptoms.includes(body.chiefComplaint)) {
      allSymptoms.unshift(body.chiefComplaint);
    }
    
    // Initialize evaluator and evaluate
    const evaluator = new RedFlagEvaluator('high');
    const result: EvaluationResult = evaluator.evaluateMultiple(allSymptoms);
    
    // Transform matches to API format
    const transformedRedFlags = result.matches.map(transformMatch);
    
    // Generate response
    const immediateActions = generateImmediateActions(result.matches);
    const disposition = getDisposition(result.highestUrgency);
    const timeToAction = getTimeToAction(result.highestUrgency);
    const emergencyProtocol = getEmergencyProtocol(result.matches);
    
    const escalationRequired = result.requiresImmediateEscalation;
    const escalationReason = escalationRequired 
      ? `${result.matches.length} red flag(s) detected: ${result.matches.map(m => m.flag.pattern).join(', ')}`
      : undefined;
    
    // Audit logging
    console.log('[AUDIT] Red flag evaluation:', {
      timestamp: new Date().toISOString(),
      hasRedFlags: result.hasRedFlags,
      urgencyLevel: result.highestUrgency,
      redFlagCount: result.matches.length,
      categories: [...new Set(result.matches.map(m => m.flag.category))],
      escalationRequired,
      emergencyProtocol,
    });
    
    if (result.highestUrgency === 'critical') {
      console.error('[CRITICAL RED FLAG]', {
        timestamp: new Date().toISOString(),
        matches: result.matches.map(m => ({
          pattern: m.flag.pattern,
          category: m.flag.category,
          action: m.flag.immediateAction,
        })),
        immediateActions,
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        hasRedFlags: result.hasRedFlags,
        urgencyLevel: result.highestUrgency,
        redFlags: transformedRedFlags,
        immediateActions,
        escalationRequired,
        escalationReason,
        disposition,
        timeToAction,
        emergencyProtocol,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Red flag evaluation failed:', error);
    console.error('[SAFETY] Evaluation error - manual review required:', {
      timestamp: new Date().toISOString(),
      requestBody: req.body,
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during red flag evaluation. Manual clinical review required.',
      timestamp: new Date().toISOString(),
    });
  }
}
