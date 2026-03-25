// =============================================================================
// ATTENDING AI - Red Flags Evaluation API
// apps/provider-portal/pages/api/clinical/red-flags.ts
//
// CRITICAL SAFETY ENDPOINT: Evaluates patient symptoms for emergency red flags.
// Returns immediate action recommendations and escalation triggers.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  redFlagEvaluator, 
  type RedFlagResult,
  type RedFlag
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

type UrgencyLevel = 'critical' | 'warning' | 'urgent' | 'moderate' | 'low';

interface RedFlagResponseData {
  hasRedFlags: boolean;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: Array<{
    id: string;
    category: string;
    symptom: string;
    severity: string;
    message: string;
    recommendation: string;
    immediateAction?: string;
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

function validateRequest(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  const bodyObj = body as Record<string, unknown>;
  
  if (!bodyObj.symptoms && !bodyObj.chiefComplaint) {
    errors.push('Either symptoms array or chiefComplaint is required');
  }
  
  if (bodyObj.symptoms && !Array.isArray(bodyObj.symptoms)) {
    errors.push('symptoms must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}

// Transform RedFlag to our API response format
function transformRedFlag(flag: RedFlag) {
  return {
    id: flag.id,
    category: flag.category,
    symptom: flag.symptom,
    severity: flag.severity,
    message: flag.message,
    recommendation: flag.recommendation,
    immediateAction: flag.immediateAction,
  };
}

function determineUrgencyLevel(result: RedFlagResult): UrgencyLevel {
  if (result.isEmergency || result.redFlags.some(rf => rf.severity === 'critical')) {
    return 'critical';
  }
  if (result.urgencyScore >= 50) {
    return 'urgent';
  }
  if (result.urgencyScore >= 25) {
    return 'moderate';
  }
  return 'low';
}

function generateImmediateActions(redFlags: RedFlag[]): string[] {
  const actions: string[] = [];
  const categories = new Set(redFlags.map(rf => rf.category));
  
  if (redFlags.some(rf => rf.severity === 'critical')) {
    actions.push('ACTIVATE RAPID RESPONSE or CALL CODE');
    actions.push('Ensure IV access and continuous monitoring');
    actions.push('Prepare for emergent intervention');
  }
  
  if (categories.has('cardiovascular')) {
    actions.push('Obtain 12-lead ECG immediately');
    actions.push('Establish cardiac monitoring');
    actions.push('Prepare for troponin, BNP, D-dimer');
  }
  
  if (categories.has('neurological')) {
    actions.push('Perform NIH Stroke Scale assessment');
    actions.push('Note time of symptom onset (last known well)');
    actions.push('Prepare for emergent neuroimaging');
  }
  
  if (categories.has('respiratory')) {
    actions.push('Apply supplemental oxygen if SpO2 < 94%');
    actions.push('Prepare for ABG and chest imaging');
    actions.push('Have intubation equipment ready');
  }
  
  if (categories.has('infectious')) {
    actions.push('Initiate sepsis bundle within 1 hour');
    actions.push('Blood cultures x2 before antibiotics');
    actions.push('Lactate level STAT');
    actions.push('30 mL/kg crystalloid if hypotensive');
  }
  
  if (categories.has('psychiatric')) {
    actions.push('Initiate 1:1 observation');
    actions.push('Remove all potential weapons/ligatures');
    actions.push('Contact psychiatry for emergent evaluation');
  }
  
  if (categories.has('allergic')) {
    actions.push('Prepare epinephrine (0.3-0.5 mg IM)');
    actions.push('Establish large-bore IV access');
    actions.push('Prepare for airway management');
  }
  
  // Add recommendations from the red flags themselves
  for (const flag of redFlags) {
    if (flag.immediateAction && !actions.includes(flag.immediateAction)) {
      actions.push(flag.immediateAction);
    }
  }
  
  return [...new Set(actions)];
}

function getDisposition(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
      return 'Immediate bedside evaluation - Resuscitation bay';
    case 'urgent':
      return 'Urgent bedside evaluation - High acuity area';
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
    case 'urgent':
      return 'Within 10 minutes';
    case 'moderate':
      return 'Within 30 minutes';
    default:
      return 'Within 60 minutes';
  }
}

function getEmergencyProtocol(redFlags: RedFlag[]): string | undefined {
  const categories = new Set(redFlags.map(rf => rf.category));
  
  if (categories.has('cardiovascular')) {
    return 'STEMI/ACS Protocol';
  }
  
  if (categories.has('neurological')) {
    return 'Stroke Alert Protocol';
  }
  
  if (categories.has('infectious')) return 'Sepsis Bundle Protocol';
  if (categories.has('allergic')) return 'Anaphylaxis Protocol';
  
  if (categories.has('respiratory')) {
    if (redFlags.some(rf => rf.severity === 'critical')) {
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
    
    // Evaluate using the singleton evaluator
    const result: RedFlagResult = redFlagEvaluator.evaluate({
      symptoms: allSymptoms,
      chiefComplaint: body.chiefComplaint || allSymptoms.join(', '),
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
      medicalHistory: body.medicalHistory,
    });
    
    // Transform red flags to API format
    const transformedRedFlags = result.redFlags.map(transformRedFlag);
    
    // Determine urgency level
    const urgencyLevel = determineUrgencyLevel(result);
    
    // Generate response
    const immediateActions = generateImmediateActions(result.redFlags);
    const disposition = getDisposition(urgencyLevel);
    const timeToAction = getTimeToAction(urgencyLevel);
    const emergencyProtocol = getEmergencyProtocol(result.redFlags);
    
    const escalationRequired = result.isEmergency;
    const escalationReason = escalationRequired 
      ? `${result.redFlags.length} red flag(s) detected: ${result.redFlags.map(rf => rf.message).join(', ')}`
      : undefined;
    
    // Audit logging
    console.log('[AUDIT] Red flag evaluation:', {
      timestamp: new Date().toISOString(),
      hasRedFlags: result.hasRedFlags,
      urgencyLevel,
      urgencyScore: result.urgencyScore,
      redFlagCount: result.redFlags.length,
      categories: [...new Set(result.redFlags.map(rf => rf.category))],
      escalationRequired,
      emergencyProtocol,
    });
    
    if (urgencyLevel === 'critical') {
      console.error('[CRITICAL RED FLAG]', {
        timestamp: new Date().toISOString(),
        redFlags: result.redFlags.map(rf => ({
          symptom: rf.symptom,
          category: rf.category,
          message: rf.message,
        })),
        immediateActions,
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        hasRedFlags: result.hasRedFlags,
        urgencyLevel,
        urgencyScore: result.urgencyScore,
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
