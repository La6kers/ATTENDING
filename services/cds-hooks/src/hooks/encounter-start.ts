// ============================================================
// ATTENDING AI - Encounter Start CDS Hook
// services/cds-hooks/src/hooks/encounter-start.ts
//
// Triggered when a new encounter begins
// Alerts providers to urgent findings and pending assessments
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  CDSRequest,
  CDSResponse,
  CDSCard,
  CDSSuggestion,
} from '../types';

// ============================================================
// TYPES
// ============================================================

interface EncounterStartOptions {
  providerPortalUrl: string;
}

// ============================================================
// MAIN HOOK HANDLER
// ============================================================

export async function encounterStartHook(
  request: CDSRequest,
  options: EncounterStartOptions
): Promise<CDSResponse> {
  const { context, prefetch } = request;
  const patientId = context.patientId;
  const encounterId = context.encounterId;
  const cards: CDSCard[] = [];

  if (!patientId) {
    return { cards: [] };
  }

  // Fetch any pending assessments
  const assessments = await getPatientAssessments(patientId);

  // Fetch patient's recent critical results
  const criticalResults = await getCriticalResults(patientId);

  // Check for urgent assessments
  const urgentAssessment = assessments.find(a => a.urgencyLevel === 'high');
  
  if (urgentAssessment) {
    cards.push(createUrgentAssessmentCard(urgentAssessment, options));
  } else if (assessments.length > 0) {
    cards.push(createPendingAssessmentCard(assessments[0]!, assessments.length, options));
  }

  // Alert for critical lab results
  if (criticalResults.length > 0) {
    cards.push(createCriticalResultsCard(criticalResults, options));
  }

  // Check for care gaps or overdue screenings
  const careGaps = await getCareGaps(patientId);
  if (careGaps.length > 0) {
    cards.push(createCareGapsCard(careGaps, options));
  }

  return { cards };
}

// ============================================================
// CARD CREATORS
// ============================================================

/**
 * Create urgent assessment alert card
 */
function createUrgentAssessmentCard(
  assessment: any,
  options: EncounterStartOptions
): CDSCard {
  const redFlagsList = assessment.redFlags?.length > 0
    ? `\n\n**Red Flags:**\n${assessment.redFlags.map((rf: string) => `• ${rf}`).join('\n')}`
    : '';

  return {
    uuid: uuidv4(),
    summary: '🚨 URGENT: Pre-Visit Assessment Requires Immediate Review',
    detail: `**Chief Complaint:** ${assessment.chiefComplaint}

**Urgency Score:** ${assessment.urgencyScore}/100 (HIGH)
${redFlagsList}

**Submitted:** ${formatTimeAgo(new Date(assessment.submittedAt))}

This patient completed a COMPASS assessment with concerning findings that require prompt evaluation.`,
    indicator: 'critical',
    source: {
      label: 'ATTENDING AI',
      url: options.providerPortalUrl,
    },
    links: [
      {
        label: 'Review Assessment Now',
        url: `${options.providerPortalUrl}/assessments/${assessment.id}`,
        type: 'absolute',
      },
    ],
    suggestions: [
      {
        uuid: uuidv4(),
        label: 'Begin Urgent Evaluation',
        isRecommended: true,
        actions: [],
      },
      {
        uuid: uuidv4(),
        label: 'Order STAT Workup',
        actions: [],
      },
    ],
  };
}

/**
 * Create pending assessment notification card
 */
function createPendingAssessmentCard(
  assessment: any,
  totalCount: number,
  options: EncounterStartOptions
): CDSCard {
  const additionalText = totalCount > 1 
    ? `\n\n*${totalCount - 1} additional assessment(s) pending review.*`
    : '';

  return {
    uuid: uuidv4(),
    summary: '📋 COMPASS Pre-Visit Assessment Available',
    detail: `**Chief Complaint:** ${assessment.chiefComplaint}

**Urgency:** ${assessment.urgencyLevel.toUpperCase()} (Score: ${assessment.urgencyScore}/100)

**Submitted:** ${formatTimeAgo(new Date(assessment.submittedAt))}

The patient completed a structured symptom assessment that can help inform today's visit.${additionalText}`,
    indicator: assessment.urgencyLevel === 'moderate' ? 'warning' : 'info',
    source: {
      label: 'ATTENDING AI COMPASS',
      url: options.providerPortalUrl,
    },
    links: [
      {
        label: 'View Assessment',
        url: `${options.providerPortalUrl}/assessments/${assessment.id}`,
        type: 'absolute',
      },
    ],
  };
}

/**
 * Create critical results alert card
 */
function createCriticalResultsCard(
  results: CriticalResult[],
  options: EncounterStartOptions
): CDSCard {
  const resultsList = results
    .map(r => `• **${r.testName}:** ${r.value} ${r.unit} (${r.interpretation})`)
    .join('\n');

  return {
    uuid: uuidv4(),
    summary: `⚠️ ${results.length} Critical Lab Result${results.length > 1 ? 's' : ''} Require Review`,
    detail: `The following critical values have been resulted since the last visit:

${resultsList}

*Critical values require provider acknowledgment and appropriate clinical action.*`,
    indicator: 'critical',
    source: {
      label: 'ATTENDING AI Lab Alerts',
      url: options.providerPortalUrl,
    },
    links: [
      {
        label: 'View Lab Results',
        url: `${options.providerPortalUrl}/labs`,
        type: 'absolute',
      },
    ],
    suggestions: [
      {
        uuid: uuidv4(),
        label: 'Acknowledge Results',
        isRecommended: true,
        actions: [],
      },
    ],
    overrideReasons: [
      { code: 'previously-addressed', display: 'Already addressed' },
      { code: 'expected-value', display: 'Expected for this patient' },
    ],
  };
}

/**
 * Create care gaps reminder card
 */
function createCareGapsCard(
  careGaps: CareGap[],
  options: EncounterStartOptions
): CDSCard {
  const gapsList = careGaps
    .slice(0, 5)
    .map(g => `• ${g.description}${g.dueDate ? ` (Due: ${g.dueDate})` : ''}`)
    .join('\n');

  const additionalText = careGaps.length > 5 
    ? `\n\n*${careGaps.length - 5} additional care gaps identified.*`
    : '';

  return {
    uuid: uuidv4(),
    summary: `💡 ${careGaps.length} Care Gap${careGaps.length > 1 ? 's' : ''} Identified`,
    detail: `Consider addressing the following during this encounter:

${gapsList}${additionalText}`,
    indicator: 'info',
    source: {
      label: 'ATTENDING AI Quality Care',
      url: options.providerPortalUrl,
    },
    suggestions: careGaps.slice(0, 3).map(gap => ({
      uuid: uuidv4(),
      label: gap.actionLabel || `Address: ${gap.description.substring(0, 30)}...`,
      actions: [],
    })),
  };
}

// ============================================================
// DATA TYPES
// ============================================================

interface CriticalResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  interpretation: string;
  resultedAt: string;
}

interface CareGap {
  id: string;
  description: string;
  category: string;
  dueDate?: string;
  actionLabel?: string;
}

// ============================================================
// DATA FETCHING
// ============================================================

/**
 * Fetch patient's pending assessments
 */
async function getPatientAssessments(patientId: string): Promise<any[]> {
  try {
    const apiUrl = process.env.ATTENDING_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${apiUrl}/api/assessments?patientId=${patientId}&status=pending`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.assessments || [];
  } catch {
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return [{
        id: `mock-${patientId}`,
        patientId,
        chiefComplaint: 'Follow-up for hypertension management',
        urgencyLevel: 'moderate',
        urgencyScore: 45,
        redFlags: [],
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      }];
    }
    return [];
  }
}

/**
 * Fetch critical lab results
 */
async function getCriticalResults(patientId: string): Promise<CriticalResult[]> {
  try {
    const apiUrl = process.env.ATTENDING_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${apiUrl}/api/labs/critical?patientId=${patientId}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Fetch care gaps for patient
 */
async function getCareGaps(patientId: string): Promise<CareGap[]> {
  try {
    const apiUrl = process.env.ATTENDING_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${apiUrl}/api/patients/${patientId}/care-gaps`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.gaps || [];
  } catch {
    // Return mock care gaps for development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          id: '1',
          description: 'Annual wellness visit overdue',
          category: 'preventive',
          dueDate: '2024-06-15',
          actionLabel: 'Schedule AWV',
        },
        {
          id: '2',
          description: 'HbA1c due for diabetes monitoring',
          category: 'chronic-disease',
          dueDate: '2024-07-01',
          actionLabel: 'Order HbA1c',
        },
      ];
    }
    return [];
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Format time ago string
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
