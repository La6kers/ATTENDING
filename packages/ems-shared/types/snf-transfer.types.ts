/**
 * SNF-to-Hospital Transfer Type Definitions
 *
 * Core types for the transfer orchestration system.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md
 * @see apps/shared/machines/transferMachine.ts
 */

import type {
  TransferUrgency,
  TransferMode,
  TransferStatus,
  InteractDocument,
  InteractSectionId,
  CodeStatus,
  IsolationPrecautionType,
  PPRFlag,
  TransferAcknowledgment,
} from './interact.types';
import type { ReconciliationSession, ReconciliationResult } from './mar-reconciliation.types';

// ---------------------------------------------------------------------------
// Transfer Request
// ---------------------------------------------------------------------------

export interface TransferRequest {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;

  // Facilities
  sendingFacilityId: string;
  sendingFacilityName: string;
  receivingFacilityId: string;
  receivingFacilityName: string;

  // Providers
  sendingProviderId?: string;
  sendingProviderName?: string;
  receivingProviderId?: string;
  receivingProviderName?: string;

  // Classification
  urgencyLevel: TransferUrgency;
  transferMode: TransferMode;
  status: TransferStatus;

  // Clinical
  reasonForTransfer: string;
  icdCodes: string[];
  presentingSymptoms?: string;

  // PPR
  pprFlag?: PPRFlag;

  // INTERACT document
  interactDocument?: InteractDocument;
  interactComplianceScore?: number;

  // MAR reconciliation
  reconciliation?: ReconciliationSession;

  // Transfer metadata
  metadata: TransferMetadata;

  // Timeline
  timeline: TransferTimeline;

  // Transport
  transportMode?: 'AMBULANCE_BLS' | 'AMBULANCE_ALS' | 'PRIVATE' | 'WHEELCHAIR_VAN';

  // Acknowledgment
  acknowledgment?: TransferAcknowledgment;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Transfer Metadata (INTERACT-required contextual data)
// ---------------------------------------------------------------------------

export interface TransferMetadata {
  // INTERACT-required fields
  earlyWarningSigns: string[];
  interventionsAttempted: TransferIntervention[];
  physicianNotifiedAt?: string;
  physicianOrders?: string;
  familyNotifiedAt?: string;
  familyNotifiedPerson?: string;

  // Transport
  transportMode?: string;
  transportCompany?: string;
  transportContactPhone?: string;

  // Quality
  interactComplianceScore?: number;
  qualityFlags?: string[];
}

export interface TransferIntervention {
  intervention: string;
  timestamp: string;
  result: string;
  performedBy?: string;
}

// ---------------------------------------------------------------------------
// Transfer Timeline
// ---------------------------------------------------------------------------

export interface TransferTimeline {
  initiatedAt: string;
  dataCollectionStartedAt?: string;
  dataCollectionCompletedAt?: string;
  marReconciliationStartedAt?: string;
  marReconciliationCompletedAt?: string;
  documentGeneratedAt?: string;
  providerReviewStartedAt?: string;
  providerReviewCompletedAt?: string;
  transmittedAt?: string;
  hospitalAcknowledgedAt?: string;
  patientDepartedAt?: string;
  patientArrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

// ---------------------------------------------------------------------------
// Transfer Section Completion Tracking
// ---------------------------------------------------------------------------

export interface TransferSectionStatus {
  sectionId: InteractSectionId;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completedFields: number;
  totalFields: number;
  completionPercentage: number;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface TransferProgress {
  transferRequestId: string;
  transferMode: TransferMode;
  overallPercentage: number;
  sections: TransferSectionStatus[];
  currentSection?: InteractSectionId;
  blockers: TransferBlocker[];
}

export interface TransferBlocker {
  section: InteractSectionId;
  field: string;
  reason: string;
  severity: 'WARNING' | 'BLOCKING';
}

// ---------------------------------------------------------------------------
// Transfer Summary (for dashboard views)
// ---------------------------------------------------------------------------

export interface TransferSummary {
  id: string;
  patientName: string;
  patientDOB: string;
  urgencyLevel: TransferUrgency;
  status: TransferStatus;
  sendingFacility: string;
  receivingFacility: string;
  reasonForTransfer: string;
  codeStatus?: CodeStatus;
  hasIsolationPrecaution: boolean;
  isolationType?: IsolationPrecautionType;
  organism?: string;
  pprFlagged: boolean;
  medicationCount: number;
  discrepancyCount: number;
  criticalDiscrepancyCount: number;
  interactComplianceScore?: number;
  initiatedAt: string;
  estimatedArrival?: string;
}

// ---------------------------------------------------------------------------
// Transfer Events (for real-time updates via SignalR)
// ---------------------------------------------------------------------------

export type TransferEventType =
  | 'TRANSFER_INITIATED'
  | 'DATA_COLLECTION_STARTED'
  | 'SECTION_COMPLETED'
  | 'MAR_RECONCILIATION_STARTED'
  | 'CRITICAL_DISCREPANCY_DETECTED'
  | 'MAR_RECONCILIATION_COMPLETED'
  | 'DOCUMENT_GENERATED'
  | 'DOCUMENT_TRANSMITTED'
  | 'HOSPITAL_ACKNOWLEDGED'
  | 'PATIENT_DEPARTED'
  | 'PATIENT_ARRIVED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_CANCELLED'
  | 'PPR_FLAG_RAISED';

export interface TransferEvent {
  type: TransferEventType;
  transferRequestId: string;
  timestamp: string;
  data: Record<string, unknown>;
  actorId?: string;
  actorName?: string;
}

// ---------------------------------------------------------------------------
// Transfer Initiation Input
// ---------------------------------------------------------------------------

export interface InitiateTransferInput {
  patientId: string;
  sendingFacilityId: string;
  receivingFacilityId: string;
  urgencyLevel: TransferUrgency;
  reasonForTransfer: string;
  icdCodes?: string[];
  sendingProviderId?: string;
  receivingProviderId?: string;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  transportMode?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hospital Receiving Panel Data
// ---------------------------------------------------------------------------

export interface HospitalReceivingData {
  transferRequestId: string;
  urgencyLevel: TransferUrgency;
  estimatedArrival?: string;

  // Priority data (always sent first)
  patientName: string;
  patientDOB: string;
  codeStatus: CodeStatus;
  allergies: string[];
  isolationPrecautions: {
    hasActive: boolean;
    type?: IsolationPrecautionType;
    organism?: string;
    roomRequirements?: string;
  };

  // INTERACT document (may be incrementally updated in emergency mode)
  interactDocument: Partial<InteractDocument>;
  documentCompleteness: number;
  lastUpdatedAt: string;

  // Reconciliation summary
  marReconciliation?: {
    status: string;
    totalMedications: number;
    criticalDiscrepancies: number;
    isComplete: boolean;
  };
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isEmergencyTransfer(req: TransferRequest): boolean {
  return req.transferMode === 'EMERGENCY';
}

export function isTransferComplete(req: TransferRequest): boolean {
  return req.status === 'COMPLETED';
}

export function isTransferCancelled(req: TransferRequest): boolean {
  return req.status === 'CANCELLED';
}

export function isTransferInProgress(req: TransferRequest): boolean {
  return !['COMPLETED', 'CANCELLED'].includes(req.status);
}

export function hasHospitalAcknowledged(req: TransferRequest): boolean {
  return req.acknowledgment !== undefined && req.acknowledgment.receivedAt !== undefined;
}

export function needsProviderReview(req: TransferRequest): boolean {
  return req.status === 'PROVIDER_REVIEW';
}

export function getElapsedMinutes(req: TransferRequest): number {
  const start = new Date(req.timeline.initiatedAt).getTime();
  const now = Date.now();
  return Math.round((now - start) / 60000);
}
