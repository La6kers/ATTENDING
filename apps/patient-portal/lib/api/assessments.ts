// ============================================================
// ATTENDING AI — Assessments API Service
// apps/patient-portal/lib/api/assessments.ts
//
// COMPASS assessment flow: start → respond → advance → complete
// Maps to backend AssessmentsController CQRS endpoints.
// ============================================================

import api from './client';

// ============================================================
// Types
// ============================================================

export interface Assessment {
  id: string;
  assessmentNumber: string;
  patientId: string;
  patient?: {
    id: string;
    mrn: string;
    fullName: string;
    age: number;
    sex: string;
  };
  chiefComplaint: string;
  currentPhase: string;
  triageLevel: string | null;
  painSeverity: number | null;
  hpi: HpiData | null;
  hasRedFlags: boolean;
  redFlags: RedFlag[] | null;
  isEmergency: boolean;
  emergencyReason: string | null;
  startedAt: string;
  completedAt: string | null;
  reviewedAt: string | null;
}

export interface HpiData {
  onset: string | null;
  location: string | null;
  duration: string | null;
  character: string | null;
  aggravating: string | null;
  relieving: string | null;
  timing: string | null;
  severity: string | null;
  context: string | null;
  associatedSymptoms: string | null;
}

export interface RedFlag {
  id: string;
  symptom: string;
  severity: string;
  category: string;
}

export interface AssessmentSummary {
  id: string;
  assessmentNumber: string;
  patient?: {
    id: string;
    mrn: string;
    fullName: string;
    age: number;
    sex: string;
  };
  chiefComplaint: string;
  currentPhase: string;
  triageLevel: string | null;
  hasRedFlags: boolean;
  isEmergency: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface StartAssessmentResult {
  id: string;
  assessmentNumber: string;
}

export interface SubmitResponseResult {
  hasNewRedFlags: boolean;
  isEmergency: boolean;
  emergencyReason?: string;
}

// ============================================================
// API Functions
// ============================================================

export const assessmentsApi = {
  /** Start new COMPASS assessment */
  start: (patientId: string, chiefComplaint: string) =>
    api.post<Assessment>('/assessments', { patientId, chiefComplaint }, {
      target: 'backend',
      idempotencyKey: `assessment-start-${patientId}-${Date.now()}`,
    }),

  /** Get assessment by ID */
  getById: (id: string) =>
    api.get<Assessment>(`/assessments/${id}`, { target: 'backend' }),

  /** Get patient's assessments */
  getByPatient: (patientId: string) =>
    api.get<AssessmentSummary[]>(`/assessments/patient/${patientId}`, { target: 'backend' }),

  /** Submit a response to an assessment question */
  submitResponse: (assessmentId: string, question: string, response: string) =>
    api.post<Assessment>(`/assessments/${assessmentId}/responses`, { question, response }, {
      target: 'backend',
      offlineQueue: true,
    }),

  /** Advance assessment to next phase */
  advancePhase: (assessmentId: string, newPhase: string, data?: Record<string, unknown>) =>
    api.post<Assessment>(`/assessments/${assessmentId}/advance`, { newPhase, data }, {
      target: 'backend',
    }),

  /** Complete assessment with triage level */
  complete: (assessmentId: string, triageLevel: string, summary?: string) =>
    api.post<Assessment>(`/assessments/${assessmentId}/complete`, { triageLevel, summary }, {
      target: 'backend',
      idempotencyKey: `assessment-complete-${assessmentId}`,
    }),

  /** Submit via Next.js proxy (handles session + offline) */
  submitViaProxy: (assessmentData: Record<string, unknown>) =>
    api.post<{ assessmentId: string; queuePosition?: number }>('/assessments/submit', assessmentData, {
      target: 'next',
      offlineQueue: true,
    }),
};

export default assessmentsApi;
