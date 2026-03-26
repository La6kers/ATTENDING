/**
 * SNF-to-Hospital Transfer State Machine
 *
 * XState v5 state machine governing the complete transfer workflow.
 * Supports three transfer modes (Emergency, Urgent, Planned) with
 * differentiated data collection requirements and transmission timing.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 10
 * @see apps/shared/types/snf-transfer.types.ts
 */

import { createMachine, assign } from 'xstate';
import type {
  TransferMode,
  TransferStatus,
  TransferTimeline,
  TransferSectionStatus,
  TransferBlocker,
} from '../types/snf-transfer.types';
import type { InteractSectionId, InteractDocument, TransferAcknowledgment } from '../types/interact.types';
import type { ReconciliationResult } from '../types/mar-reconciliation.types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface TransferMachineContext {
  // Identity
  transferRequestId: string | null;
  patientId: string;
  organizationId: string;
  sendingFacilityId: string;
  receivingFacilityId: string;

  // Mode
  transferMode: TransferMode | null;

  // Data collection
  completedSections: Set<InteractSectionId>;
  sectionStatuses: TransferSectionStatus[];
  blockers: TransferBlocker[];

  // INTERACT document
  interactDocument: Partial<InteractDocument> | null;
  documentCompleteness: number;

  // MAR reconciliation
  reconciliationResult: ReconciliationResult | null;

  // Transmission
  transmittedAt: string | null;
  acknowledgment: TransferAcknowledgment | null;

  // Timeline
  timeline: Partial<TransferTimeline>;

  // Error
  error: string | null;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type TransferMachineEvent =
  // Initiation
  | { type: 'INITIATE_TRANSFER'; patientId: string; sendingFacilityId: string; receivingFacilityId: string }
  | { type: 'SELECT_EMERGENCY' }
  | { type: 'SELECT_URGENT' }
  | { type: 'SELECT_PLANNED' }

  // Data collection
  | { type: 'SECTION_COMPLETED'; sectionId: InteractSectionId }
  | { type: 'EMERGENCY_DATA_READY'; document: Partial<InteractDocument> }
  | { type: 'ALL_DATA_COLLECTED'; document: Partial<InteractDocument> }
  | { type: 'BLOCKER_IDENTIFIED'; blocker: TransferBlocker }
  | { type: 'BLOCKER_RESOLVED'; sectionId: InteractSectionId; field: string }

  // MAR reconciliation
  | { type: 'MAR_RECONCILIATION_COMPLETE'; result: ReconciliationResult }
  | { type: 'MAR_RECONCILIATION_SKIPPED' }

  // Document
  | { type: 'DOCUMENT_GENERATED'; document: InteractDocument }
  | { type: 'DOCUMENT_UPDATED'; document: Partial<InteractDocument>; completeness: number }

  // Review
  | { type: 'PROVIDER_APPROVED' }
  | { type: 'PROVIDER_REJECTED'; reason: string }
  | { type: 'MULTIDISCIPLINARY_APPROVED' }
  | { type: 'MULTIDISCIPLINARY_REJECTED'; reason: string }

  // Transmission
  | { type: 'TRANSMITTED'; timestamp: string }
  | { type: 'ACKNOWLEDGED'; acknowledgment: TransferAcknowledgment }
  | { type: 'ACKNOWLEDGMENT_TIMEOUT' }

  // Transport
  | { type: 'PATIENT_DEPARTED'; timestamp: string }
  | { type: 'PATIENT_ARRIVED'; timestamp: string }

  // Control
  | { type: 'CANCEL'; reason: string }
  | { type: 'RETRY' }
  | { type: 'ERROR'; message: string };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const transferMachine = createMachine({
  id: 'snfTransfer',
  initial: 'idle',
  context: {
    transferRequestId: null,
    patientId: '',
    organizationId: '',
    sendingFacilityId: '',
    receivingFacilityId: '',
    transferMode: null,
    completedSections: new Set<InteractSectionId>(),
    sectionStatuses: [],
    blockers: [],
    interactDocument: null,
    documentCompleteness: 0,
    reconciliationResult: null,
    transmittedAt: null,
    acknowledgment: null,
    timeline: {},
    error: null,
    retryCount: 0,
  } satisfies TransferMachineContext,

  states: {
    // ====== IDLE ======
    idle: {
      on: {
        INITIATE_TRANSFER: {
          target: 'modeSelection',
          actions: assign({
            patientId: ({ event }) => event.patientId,
            sendingFacilityId: ({ event }) => event.sendingFacilityId,
            receivingFacilityId: ({ event }) => event.receivingFacilityId,
            timeline: () => ({ initiatedAt: new Date().toISOString() }),
            error: () => null,
          }),
        },
      },
    },

    // ====== MODE SELECTION ======
    modeSelection: {
      on: {
        SELECT_EMERGENCY: {
          target: 'emergencyPath',
          actions: assign({ transferMode: () => 'EMERGENCY' as TransferMode }),
        },
        SELECT_URGENT: {
          target: 'urgentPath',
          actions: assign({ transferMode: () => 'URGENT' as TransferMode }),
        },
        SELECT_PLANNED: {
          target: 'plannedPath',
          actions: assign({ transferMode: () => 'PLANNED' as TransferMode }),
        },
        CANCEL: { target: 'cancelled' },
      },
    },

    // ====================================================================
    // EMERGENCY PATH
    // Abbreviated data collection → immediate transmission → monitoring
    // ====================================================================
    emergencyPath: {
      initial: 'dataCollection',
      states: {
        dataCollection: {
          // In emergency mode, auto-extract critical fields:
          // Code status, allergies, medications (last 24h), isolation, vitals
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              dataCollectionStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            EMERGENCY_DATA_READY: {
              target: 'documentGeneration',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  dataCollectionCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            SECTION_COMPLETED: {
              actions: assign({
                completedSections: ({ context, event }) => {
                  const updated = new Set(context.completedSections);
                  updated.add(event.sectionId);
                  return updated;
                },
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        documentGeneration: {
          on: {
            DOCUMENT_GENERATED: {
              target: 'transmission',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                documentCompleteness: ({ event }) => event.document.completionPercentage,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  documentGeneratedAt: new Date().toISOString(),
                }),
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
        transmission: {
          on: {
            TRANSMITTED: {
              target: '#snfTransfer.monitoring',
              actions: assign({
                transmittedAt: ({ event }) => event.timestamp,
                timeline: ({ context, event }) => ({
                  ...context.timeline,
                  transmittedAt: event.timestamp,
                }),
              }),
            },
            // In emergency mode, continue receiving document updates post-transmission
            DOCUMENT_UPDATED: {
              actions: assign({
                interactDocument: ({ event }) => event.document,
                documentCompleteness: ({ event }) => event.completeness,
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
      },
    },

    // ====================================================================
    // URGENT PATH
    // Full data collection → MAR reconciliation → provider review → transmission
    // ====================================================================
    urgentPath: {
      initial: 'dataCollection',
      states: {
        dataCollection: {
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              dataCollectionStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            SECTION_COMPLETED: {
              actions: assign({
                completedSections: ({ context, event }) => {
                  const updated = new Set(context.completedSections);
                  updated.add(event.sectionId);
                  return updated;
                },
              }),
            },
            ALL_DATA_COLLECTED: {
              target: 'marReconciliation',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  dataCollectionCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            BLOCKER_IDENTIFIED: {
              actions: assign({
                blockers: ({ context, event }) => [...context.blockers, event.blocker],
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        marReconciliation: {
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              marReconciliationStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            MAR_RECONCILIATION_COMPLETE: {
              target: 'documentGeneration',
              actions: assign({
                reconciliationResult: ({ event }) => event.result,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  marReconciliationCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            MAR_RECONCILIATION_SKIPPED: {
              target: 'documentGeneration',
            },
            ERROR: { target: '#snfTransfer.error' },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        documentGeneration: {
          on: {
            DOCUMENT_GENERATED: {
              target: 'providerReview',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                documentCompleteness: ({ event }) => event.document.completionPercentage,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  documentGeneratedAt: new Date().toISOString(),
                }),
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
        providerReview: {
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              providerReviewStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            PROVIDER_APPROVED: {
              target: 'transmission',
              actions: assign({
                timeline: ({ context }) => ({
                  ...context.timeline,
                  providerReviewCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            PROVIDER_REJECTED: {
              target: 'dataCollection',
              actions: assign({
                error: ({ event }) => event.reason,
              }),
            },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        transmission: {
          on: {
            TRANSMITTED: {
              target: 'awaitingAcknowledgment',
              actions: assign({
                transmittedAt: ({ event }) => event.timestamp,
                timeline: ({ context, event }) => ({
                  ...context.timeline,
                  transmittedAt: event.timestamp,
                }),
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
        awaitingAcknowledgment: {
          on: {
            ACKNOWLEDGED: {
              target: '#snfTransfer.monitoring',
              actions: assign({
                acknowledgment: ({ event }) => event.acknowledgment,
                timeline: ({ context, event }) => ({
                  ...context.timeline,
                  hospitalAcknowledgedAt: event.acknowledgment.receivedAt,
                }),
              }),
            },
            ACKNOWLEDGMENT_TIMEOUT: {
              // Proceed to monitoring even without acknowledgment
              target: '#snfTransfer.monitoring',
            },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
      },
    },

    // ====================================================================
    // PLANNED PATH
    // Extended data collection → multidisciplinary review → transmission
    // ====================================================================
    plannedPath: {
      initial: 'scheduling',
      states: {
        scheduling: {
          // Wait for data collection window to open
          on: {
            ALL_DATA_COLLECTED: {
              target: 'marReconciliation',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  dataCollectionStartedAt: new Date().toISOString(),
                  dataCollectionCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            SECTION_COMPLETED: {
              actions: assign({
                completedSections: ({ context, event }) => {
                  const updated = new Set(context.completedSections);
                  updated.add(event.sectionId);
                  return updated;
                },
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        marReconciliation: {
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              marReconciliationStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            MAR_RECONCILIATION_COMPLETE: {
              target: 'documentGeneration',
              actions: assign({
                reconciliationResult: ({ event }) => event.result,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  marReconciliationCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            MAR_RECONCILIATION_SKIPPED: {
              target: 'documentGeneration',
            },
            ERROR: { target: '#snfTransfer.error' },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        documentGeneration: {
          on: {
            DOCUMENT_GENERATED: {
              target: 'multidisciplinaryReview',
              actions: assign({
                interactDocument: ({ event }) => event.document,
                documentCompleteness: ({ event }) => event.document.completionPercentage,
                timeline: ({ context }) => ({
                  ...context.timeline,
                  documentGeneratedAt: new Date().toISOString(),
                }),
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
        multidisciplinaryReview: {
          entry: assign({
            timeline: ({ context }) => ({
              ...context.timeline,
              providerReviewStartedAt: new Date().toISOString(),
            }),
          }),
          on: {
            MULTIDISCIPLINARY_APPROVED: {
              target: 'transmission',
              actions: assign({
                timeline: ({ context }) => ({
                  ...context.timeline,
                  providerReviewCompletedAt: new Date().toISOString(),
                }),
              }),
            },
            MULTIDISCIPLINARY_REJECTED: {
              target: 'scheduling',
              actions: assign({
                error: ({ event }) => event.reason,
              }),
            },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
        transmission: {
          on: {
            TRANSMITTED: {
              target: 'awaitingAcknowledgment',
              actions: assign({
                transmittedAt: ({ event }) => event.timestamp,
                timeline: ({ context, event }) => ({
                  ...context.timeline,
                  transmittedAt: event.timestamp,
                }),
              }),
            },
            ERROR: { target: '#snfTransfer.error' },
          },
        },
        awaitingAcknowledgment: {
          on: {
            ACKNOWLEDGED: {
              target: '#snfTransfer.monitoring',
              actions: assign({
                acknowledgment: ({ event }) => event.acknowledgment,
                timeline: ({ context, event }) => ({
                  ...context.timeline,
                  hospitalAcknowledgedAt: event.acknowledgment.receivedAt,
                }),
              }),
            },
            ACKNOWLEDGMENT_TIMEOUT: {
              target: '#snfTransfer.monitoring',
            },
            CANCEL: { target: '#snfTransfer.cancelled' },
          },
        },
      },
    },

    // ====================================================================
    // SHARED STATES
    // ====================================================================

    // ------ Monitoring: patient in transit ------
    monitoring: {
      on: {
        PATIENT_DEPARTED: {
          target: 'inTransit',
          actions: assign({
            timeline: ({ context, event }) => ({
              ...context.timeline,
              patientDepartedAt: event.timestamp,
            }),
          }),
        },
        // In emergency mode, allow direct jump to arrived
        PATIENT_ARRIVED: {
          target: 'completed',
          actions: assign({
            timeline: ({ context, event }) => ({
              ...context.timeline,
              patientArrivedAt: event.timestamp,
              completedAt: new Date().toISOString(),
            }),
          }),
        },
        // Continue receiving document updates
        DOCUMENT_UPDATED: {
          actions: assign({
            interactDocument: ({ event }) => event.document,
            documentCompleteness: ({ event }) => event.completeness,
          }),
        },
        // Late acknowledgment
        ACKNOWLEDGED: {
          actions: assign({
            acknowledgment: ({ event }) => event.acknowledgment,
            timeline: ({ context, event }) => ({
              ...context.timeline,
              hospitalAcknowledgedAt: event.acknowledgment.receivedAt,
            }),
          }),
        },
        CANCEL: { target: 'cancelled' },
      },
    },

    // ------ Patient is in transit ------
    inTransit: {
      on: {
        PATIENT_ARRIVED: {
          target: 'completed',
          actions: assign({
            timeline: ({ context, event }) => ({
              ...context.timeline,
              patientArrivedAt: event.timestamp,
              completedAt: new Date().toISOString(),
            }),
          }),
        },
        DOCUMENT_UPDATED: {
          actions: assign({
            interactDocument: ({ event }) => event.document,
            documentCompleteness: ({ event }) => event.completeness,
          }),
        },
        CANCEL: { target: 'cancelled' },
      },
    },

    // ------ Terminal states ------
    completed: {
      type: 'final',
    },

    cancelled: {
      type: 'final',
      entry: assign({
        timeline: ({ context }) => ({
          ...context.timeline,
          cancelledAt: new Date().toISOString(),
        }),
      }),
    },

    error: {
      on: {
        RETRY: {
          target: 'modeSelection',
          guard: ({ context }) => context.retryCount < 3,
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            error: () => null,
          }),
        },
        CANCEL: { target: 'cancelled' },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// State selectors
// ---------------------------------------------------------------------------

export function getTransferStatus(stateValue: string | object): TransferStatus {
  if (typeof stateValue === 'object') {
    // Nested state — extract the parent
    const parent = Object.keys(stateValue)[0];
    const child = (stateValue as Record<string, string>)[parent];

    const nestedMap: Record<string, Record<string, TransferStatus>> = {
      emergencyPath: {
        dataCollection: 'DATA_COLLECTION',
        documentGeneration: 'DOCUMENT_GENERATION',
        transmission: 'TRANSMITTED',
      },
      urgentPath: {
        dataCollection: 'DATA_COLLECTION',
        marReconciliation: 'MAR_RECONCILIATION',
        documentGeneration: 'DOCUMENT_GENERATION',
        providerReview: 'PROVIDER_REVIEW',
        transmission: 'TRANSMITTED',
        awaitingAcknowledgment: 'TRANSMITTED',
      },
      plannedPath: {
        scheduling: 'DATA_COLLECTION',
        marReconciliation: 'MAR_RECONCILIATION',
        documentGeneration: 'DOCUMENT_GENERATION',
        multidisciplinaryReview: 'PROVIDER_REVIEW',
        transmission: 'TRANSMITTED',
        awaitingAcknowledgment: 'TRANSMITTED',
      },
    };

    return nestedMap[parent]?.[child] ?? 'INITIATED';
  }

  const flatMap: Record<string, TransferStatus> = {
    idle: 'INITIATED',
    modeSelection: 'INITIATED',
    monitoring: 'ACKNOWLEDGED',
    inTransit: 'IN_TRANSIT',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
    error: 'INITIATED',
  };

  return flatMap[stateValue] ?? 'INITIATED';
}
