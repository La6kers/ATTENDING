// ============================================================
// ATTENDING AI - Patient View CDS Hook
// services/cds-hooks/src/hooks/patient-view.ts
//
// Triggered when a provider opens a patient's chart
// Displays COMPASS pre-visit assessment if available
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  CDSRequest,
  CDSResponse,
  CDSCard,
  CDSSuggestion,
  CDSLink,
} from '../types';

// ============================================================
// TYPES
// ============================================================

interface PatientViewOptions {
  providerPortalUrl: string;
}

interface COMPASSAssessment {
  id: string;
  patientId: string;
  chiefComplaint: string;
  urgencyLevel: 'standard' | 'moderate' | 'high';
  urgencyScore: number;
  redFlags: string[];
  riskFactors: string[];
  differentialDx: Array<{
    name: string;
    probability: number;
    icdCode?: string;
  }>;
  status: string;
  submittedAt: string;
}

// ============================================================
// MAIN HOOK HANDLER
// ============================================================

export async function patientViewHook(
  request: CDSRequest,
  options: PatientViewOptions
): Promise<CDSResponse> {
  const { context, prefetch } = request;
  const patientId = context.patientId;
  const cards: CDSCard[] = [];

  if (!patientId) {
    return { cards: [] };
  }

  // Fetch pending COMPASS assessments for this patient
  const assessments = await getPatientAssessments(patientId);

  if (assessments.length === 0) {
    // No assessments - optionally show a card suggesting COMPASS
    return { cards: [] };
  }

  // Get the most recent pending assessment
  const latestAssessment = assessments[0]!;

  // Create main assessment card
  const assessmentCard = createAssessmentCard(latestAssessment, options);
  cards.push(assessmentCard);

  // If there are red flags, add a critical alert card
  if (latestAssessment.redFlags.length > 0) {
    const redFlagCard = createRedFlagCard(latestAssessment, options);
    cards.push(redFlagCard);
  }

  // Add differential diagnosis card if available
  if (latestAssessment.differentialDx && latestAssessment.differentialDx.length > 0) {
    const dxCard = createDifferentialCard(latestAssessment, options);
    cards.push(dxCard);
  }

  return { cards };
}

// ============================================================
// CARD CREATORS
// ============================================================

/**
 * Create main COMPASS assessment card
 */
function createAssessmentCard(
  assessment: COMPASSAssessment,
  options: PatientViewOptions
): CDSCard {
  const urgencyEmoji = {
    high: '🚨',
    moderate: '⚠️',
    standard: '📋',
  };

  const indicator = assessment.urgencyLevel === 'high' ? 'critical' :
                    assessment.urgencyLevel === 'moderate' ? 'warning' : 'info';

  const timeSinceSubmit = getTimeSince(new Date(assessment.submittedAt));

  return {
    uuid: uuidv4(),
    summary: `${urgencyEmoji[assessment.urgencyLevel]} COMPASS Pre-Visit Assessment Available`,
    detail: `**Chief Complaint:** ${assessment.chiefComplaint}

**Urgency:** ${assessment.urgencyLevel.toUpperCase()} (Score: ${assessment.urgencyScore}/100)

**Submitted:** ${timeSinceSubmit}

${assessment.riskFactors.length > 0 ? `**Risk Factors:** ${assessment.riskFactors.join(', ')}` : ''}

This assessment was completed by the patient through the COMPASS AI-assisted interview system and is pending provider review.`,
    indicator,
    source: {
      label: 'ATTENDING AI COMPASS',
      url: options.providerPortalUrl,
      icon: `${options.providerPortalUrl}/icons/compass-icon.png`,
    },
    links: [
      {
        label: 'Review Full Assessment',
        url: `${options.providerPortalUrl}/assessments/${assessment.id}`,
        type: 'absolute',
      },
    ],
    suggestions: assessment.urgencyLevel === 'high' ? [
      {
        uuid: uuidv4(),
        label: 'Begin Urgent Evaluation',
        isRecommended: true,
        actions: [],
      },
    ] : undefined,
  };
}

/**
 * Create red flag alert card
 */
function createRedFlagCard(
  assessment: COMPASSAssessment,
  options: PatientViewOptions
): CDSCard {
  const redFlagList = assessment.redFlags
    .map(rf => `• ${rf}`)
    .join('\n');

  return {
    uuid: uuidv4(),
    summary: `🚨 ${assessment.redFlags.length} Critical Red Flag${assessment.redFlags.length > 1 ? 's' : ''} Identified`,
    detail: `The following concerning findings require immediate attention:

${redFlagList}

**Recommended Actions:**
- Review patient history immediately
- Consider emergent workup
- Assess need for expedited evaluation`,
    indicator: 'critical',
    source: {
      label: 'ATTENDING AI Clinical Safety',
      url: options.providerPortalUrl,
    },
    suggestions: [
      {
        uuid: uuidv4(),
        label: 'Acknowledge Red Flags',
        isRecommended: true,
        actions: [],
      },
      {
        uuid: uuidv4(),
        label: 'Order STAT Labs',
        actions: [],
      },
      {
        uuid: uuidv4(),
        label: 'Order Emergent Imaging',
        actions: [],
      },
    ],
    overrideReasons: [
      { code: 'already-addressed', display: 'Already addressed in prior visit' },
      { code: 'chronic-baseline', display: 'Known chronic condition at baseline' },
      { code: 'patient-declined', display: 'Patient declined workup' },
      { code: 'clinical-judgment', display: 'Clinical judgment - low concern' },
    ],
    selectionBehavior: 'at-most-one',
  };
}

/**
 * Create differential diagnosis card
 */
function createDifferentialCard(
  assessment: COMPASSAssessment,
  options: PatientViewOptions
): CDSCard {
  const topDiagnoses = assessment.differentialDx.slice(0, 5);
  
  const dxList = topDiagnoses
    .map((dx, i) => {
      const probability = Math.round(dx.probability * 100);
      const icdStr = dx.icdCode ? ` (${dx.icdCode})` : '';
      return `${i + 1}. **${dx.name}**${icdStr} - ${probability}%`;
    })
    .join('\n');

  return {
    uuid: uuidv4(),
    summary: '🔬 AI-Generated Differential Diagnosis',
    detail: `Based on the COMPASS assessment, the following diagnoses should be considered:

${dxList}

*These are AI-generated suggestions requiring clinical confirmation. Probabilities are estimated based on symptom patterns and should not replace clinical judgment.*`,
    indicator: 'info',
    source: {
      label: 'ATTENDING AI Clinical Engine',
      url: options.providerPortalUrl,
    },
    links: [
      {
        label: 'View Evidence & Reasoning',
        url: `${options.providerPortalUrl}/assessments/${assessment.id}#differential`,
        type: 'absolute',
      },
    ],
  };
}

// ============================================================
// DATA FETCHING
// ============================================================

/**
 * Fetch patient's pending COMPASS assessments
 * In production, this calls the ATTENDING API
 */
async function getPatientAssessments(patientId: string): Promise<COMPASSAssessment[]> {
  try {
    const apiUrl = process.env.ATTENDING_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${apiUrl}/api/assessments?patientId=${patientId}&status=pending`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[CDS] Failed to fetch assessments:', response.status);
      return [];
    }

    const data = await response.json();
    return data.assessments || [];
  } catch (error) {
    console.error('[CDS] Error fetching assessments:', error);
    
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockAssessments(patientId);
    }
    
    return [];
  }
}

/**
 * Mock assessments for development/testing
 */
function getMockAssessments(patientId: string): COMPASSAssessment[] {
  return [
    {
      id: `mock-assessment-${patientId}`,
      patientId,
      chiefComplaint: 'Severe headache with sudden onset',
      urgencyLevel: 'high',
      urgencyScore: 85,
      redFlags: [
        'Thunderclap headache - sudden onset reaching maximum intensity',
        'First or worst headache of life',
        'Associated neurological symptoms',
      ],
      riskFactors: [
        'Age > 50',
        'Hypertension',
        'No prior headache history',
      ],
      differentialDx: [
        { name: 'Subarachnoid Hemorrhage', probability: 0.35, icdCode: 'I60.9' },
        { name: 'Migraine with Aura', probability: 0.25, icdCode: 'G43.1' },
        { name: 'Tension-type Headache', probability: 0.20, icdCode: 'G44.2' },
        { name: 'Hypertensive Crisis', probability: 0.12, icdCode: 'I16.0' },
        { name: 'Meningitis', probability: 0.08, icdCode: 'G03.9' },
      ],
      status: 'pending',
      submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    },
  ];
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Get human-readable time since date
 */
function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
