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
  type RedFlagInput, 
  type RedFlagResult,
  type RedFlagMatch 
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
  onsetDuration?: string; // e.g., "sudden", "gradual", "hours", "days"
  progression?: 'improving' | 'stable' | 'worsening' | 'rapidly-worsening';
}

interface RedFlagResponse {
  success: boolean;
  data?: {
    hasRedFlags: boolean;
    urgencyLevel: 'critical' | 'emergent' | 'urgent' | 'moderate' | 'routine';
    redFlags: RedFlagMatch[];
    immediateActions: string[];
    escalationRequired: boolean;
    escalationReason?: string;
    disposition: string;
    timeToAction?: string;
    emergencyProtocol?: string;
  };
  error?: string;
  timestamp: string;
}

// CRITICAL: Always allow POST for safety evaluations
export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

// Validate request body
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

// Map request to evaluator input
function mapToRedFlagInput(body: RedFlagRequest): RedFlagInput {
  // Combine chief complaint with symptoms for comprehensive evaluation
  const allSymptoms = [...(body.symptoms || [])];
  if (body.chiefComplaint && !allSymptoms.includes(body.chiefComplaint)) {
    allSymptoms.unshift(body.chiefComplaint);
  }
  
  return {
    symptoms: allSymptoms,
    vitalSigns: body.vitalSigns,
    patientAge: body.patientAge,
    medicalHistory: body.medicalHistory || [],
    mentalStatus: body.mentalStatus,
    onsetDuration: body.onsetDuration,
    progression: body.progression,
  };
}

// Generate immediate actions based on red flags
function generateImmediateActions(redFlags: RedFlagMatch[]): string[] {
  const actions: string[] = [];
  const categories = new Set(redFlags.map(rf => rf.category));
  
  // Critical actions take priority
  if (redFlags.some(rf => rf.severity === 'critical')) {
    actions.push('ACTIVATE RAPID RESPONSE or CALL CODE');
    actions.push('Ensure IV access and continuous monitoring');
    actions.push('Prepare for emergent intervention');
  }
  
  // Category-specific actions
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
  
  if (categories.has('Sepsis')) {
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
  
  if (categories.has('Obstetric')) {
    actions.push('Contact OB for emergent evaluation');
    actions.push('Continuous fetal monitoring');
    actions.push('Type and screen, prepare for emergent delivery');
  }
  
  return [...new Set(actions)]; // Remove duplicates
}

// Determine disposition based on urgency
function getDisposition(urgencyLevel: string): string {
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

// Get time to action requirement
function getTimeToAction(urgencyLevel: string): string {
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

// Get emergency protocol if applicable
function getEmergencyProtocol(redFlags: RedFlagMatch[]): string | undefined {
  const categories = new Set(redFlags.map(rf => rf.category));
  
  if (categories.has('Cardiovascular')) {
    if (redFlags.some(rf => rf.symptom.toLowerCase().includes('chest pain'))) {
      return 'STEMI/ACS Protocol';
    }
  }
  
  if (categories.has('Neurological')) {
    if (redFlags.some(rf => 
      rf.symptom.toLowerCase().includes('stroke') || 
      rf.symptom.toLowerCase().includes('weakness') ||
      rf.symptom.toLowerCase().includes('speech')
    )) {
      return 'Stroke Alert Protocol';
    }
  }
  
  if (categories.has('Sepsis')) {
    return 'Sepsis Bundle Protocol';
  }
  
  if (categories.has('Allergic')) {
    return 'Anaphylaxis Protocol';
  }
  
  if (categories.has('Respiratory')) {
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
  // CORS headers - allow from patient portal
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
    
    // Map to evaluator input
    const input = mapToRedFlagInput(req.body);
    
    // Initialize evaluator and evaluate
    const evaluator = new RedFlagEvaluator();
    const result = evaluator.evaluate(input);
    
    // Generate response with actionable information
    const immediateActions = generateImmediateActions(result.redFlags);
    const disposition = getDisposition(result.urgencyLevel);
    const timeToAction = getTimeToAction(result.urgencyLevel);
    const emergencyProtocol = getEmergencyProtocol(result.redFlags);
    
    const escalationRequired = result.urgencyLevel === 'critical' || result.urgencyLevel === 'emergent';
    const escalationReason = escalationRequired 
      ? `${result.redFlags.length} red flag(s) detected: ${result.redFlags.map(rf => rf.symptom).join(', ')}`
      : undefined;
    
    // CRITICAL: Log all red flag evaluations for audit and safety monitoring
    console.log('[AUDIT] Red flag evaluation:', {
      timestamp: new Date().toISOString(),
      hasRedFlags: result.hasRedFlags,
      urgencyLevel: result.urgencyLevel,
      redFlagCount: result.redFlags.length,
      categories: [...new Set(result.redFlags.map(rf => rf.category))],
      escalationRequired,
      emergencyProtocol,
    });
    
    // If critical red flags, also log to error for monitoring
    if (result.urgencyLevel === 'critical') {
      console.error('[CRITICAL RED FLAG]', {
        timestamp: new Date().toISOString(),
        redFlags: result.redFlags,
        immediateActions,
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        hasRedFlags: result.hasRedFlags,
        urgencyLevel: result.urgencyLevel,
        redFlags: result.redFlags,
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
    // CRITICAL: Even on error, log for safety monitoring
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
