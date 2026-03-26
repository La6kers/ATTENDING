/**
 * MAR Reconciliation State Machine
 *
 * XState v5 state machine governing the medication reconciliation workflow
 * for SNF-to-Hospital transfers. Manages the lifecycle from medication
 * ingestion through formulary matching, discrepancy detection, and
 * multi-level review (nurse → pharmacist → provider).
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 4
 * @see apps/shared/types/mar-reconciliation.types.ts
 */

import { createMachine, assign } from 'xstate';
import type {
  SNFMedicationRecord,
  FormularyEntry,
  MedicationDiscrepancy,
  DiscrepancyResolution,
  DiscrepancySeverity,
  ReconciliationStatus,
  FormularyMatchResult,
} from '../types/mar-reconciliation.types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface MARReconciliationContext {
  // Session
  reconciliationId: string | null;
  transferRequestId: string;
  patientId: string;
  organizationId: string;

  // Data
  snfMedications: SNFMedicationRecord[];
  formularyEntries: FormularyEntry[];
  formularyMatchResults: FormularyMatchResult[];
  discrepancies: MedicationDiscrepancy[];

  // Progress
  currentDiscrepancyIndex: number;
  resolvedCount: number;
  totalMedications: number;

  // Personnel
  initiatedBy: string | null;
  pharmacistReviewBy: string | null;
  providerReviewBy: string | null;

  // Review
  pharmacistNotes: string;
  providerNotes: string;

  // Error
  error: string | null;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type MARReconciliationEvent =
  | { type: 'INITIATE_RECONCILIATION'; transferRequestId: string; patientId: string; initiatedBy: string }
  | { type: 'MEDICATIONS_LOADED'; medications: SNFMedicationRecord[]; formulary: FormularyEntry[] }
  | { type: 'MATCHING_COMPLETE'; results: FormularyMatchResult[] }
  | { type: 'DISCREPANCIES_FOUND'; discrepancies: MedicationDiscrepancy[] }
  | { type: 'NO_DISCREPANCIES' }
  | { type: 'RESOLVE_DISCREPANCY'; discrepancyId: string; resolution: DiscrepancyResolution; resolvedBy: string; notes?: string }
  | { type: 'DISCREPANCY_RESOLVED' }
  | { type: 'ESCALATE_TO_PHARMACIST' }
  | { type: 'ALL_RESOLVED' }
  | { type: 'PHARMACIST_APPROVED'; pharmacistId: string; notes?: string }
  | { type: 'PHARMACIST_OVERRIDE'; pharmacistId: string; overrideReason: string }
  | { type: 'PROVIDER_APPROVED'; providerId: string; notes?: string }
  | { type: 'PROVIDER_REQUESTS_CHANGES'; providerId: string; changeRequests: string }
  | { type: 'RECONCILIATION_COMPLETE' }
  | { type: 'CANCEL'; reason: string }
  | { type: 'RETRY' }
  | { type: 'ERROR'; message: string };

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function hasCriticalDiscrepancies(context: MARReconciliationContext): boolean {
  return context.discrepancies.some(
    (d) => d.severity === 'CRITICAL' && d.resolution === 'PENDING'
  );
}

function allDiscrepanciesResolved(context: MARReconciliationContext): boolean {
  return context.discrepancies.every((d) => d.resolution !== 'PENDING');
}

function hasUnresolvedDiscrepancies(context: MARReconciliationContext): boolean {
  return context.discrepancies.some((d) => d.resolution === 'PENDING');
}

function canRetry(context: MARReconciliationContext): boolean {
  return context.retryCount < 3;
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const marReconciliationMachine = createMachine({
  id: 'marReconciliation',
  initial: 'idle',
  context: {
    reconciliationId: null,
    transferRequestId: '',
    patientId: '',
    organizationId: '',
    snfMedications: [],
    formularyEntries: [],
    formularyMatchResults: [],
    discrepancies: [],
    currentDiscrepancyIndex: 0,
    resolvedCount: 0,
    totalMedications: 0,
    initiatedBy: null,
    pharmacistReviewBy: null,
    providerReviewBy: null,
    pharmacistNotes: '',
    providerNotes: '',
    error: null,
    retryCount: 0,
  } satisfies MARReconciliationContext,

  states: {
    // ------ Initial state ------
    idle: {
      on: {
        INITIATE_RECONCILIATION: {
          target: 'loadingMedications',
          actions: assign({
            transferRequestId: ({ event }) => event.transferRequestId,
            patientId: ({ event }) => event.patientId,
            initiatedBy: ({ event }) => event.initiatedBy,
            error: () => null,
            retryCount: () => 0,
          }),
        },
      },
    },

    // ------ Load SNF medications and hospital formulary ------
    loadingMedications: {
      // In production, this state would invoke a service to fetch data.
      // The service resolves by sending MEDICATIONS_LOADED or ERROR.
      on: {
        MEDICATIONS_LOADED: {
          target: 'formularyMatching',
          actions: assign({
            snfMedications: ({ event }) => event.medications,
            formularyEntries: ({ event }) => event.formulary,
            totalMedications: ({ event }) => event.medications.length,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
      },
    },

    // ------ Match each SNF medication against hospital formulary ------
    formularyMatching: {
      // Invoke formulary matching service
      on: {
        MATCHING_COMPLETE: {
          target: 'discrepancyDetection',
          actions: assign({
            formularyMatchResults: ({ event }) => event.results,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
      },
    },

    // ------ Detect discrepancies from match results ------
    discrepancyDetection: {
      on: {
        DISCREPANCIES_FOUND: {
          target: 'discrepancyReview',
          actions: assign({
            discrepancies: ({ event }) => event.discrepancies,
            currentDiscrepancyIndex: () => 0,
          }),
        },
        NO_DISCREPANCIES: {
          target: 'providerReview',
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
      },
    },

    // ------ Nurse reviews and resolves discrepancies ------
    discrepancyReview: {
      on: {
        RESOLVE_DISCREPANCY: {
          target: 'resolvingDiscrepancy',
          actions: assign({
            discrepancies: ({ context, event }) =>
              context.discrepancies.map((d) =>
                d.id === event.discrepancyId
                  ? {
                      ...d,
                      resolution: event.resolution,
                      resolvedBy: event.resolvedBy,
                      resolvedAt: new Date().toISOString(),
                      resolutionNotes: event.notes,
                    }
                  : d
              ),
          }),
        },
        ESCALATE_TO_PHARMACIST: {
          target: 'pharmacistReview',
          guard: () => true, // Always allowed
        },
        ALL_RESOLVED: {
          target: 'providerReview',
          guard: ({ context }) => allDiscrepanciesResolved(context),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    // ------ Processing a single discrepancy resolution ------
    resolvingDiscrepancy: {
      always: [
        {
          target: 'pharmacistReview',
          guard: ({ context }) =>
            hasCriticalDiscrepancies(context) && !allDiscrepanciesResolved(context),
        },
        {
          target: 'providerReview',
          guard: ({ context }) => allDiscrepanciesResolved(context),
        },
        {
          target: 'discrepancyReview',
        },
      ],
      entry: assign({
        resolvedCount: ({ context }) =>
          context.discrepancies.filter((d) => d.resolution !== 'PENDING').length,
        currentDiscrepancyIndex: ({ context }) => {
          const nextUnresolved = context.discrepancies.findIndex(
            (d) => d.resolution === 'PENDING'
          );
          return nextUnresolved >= 0 ? nextUnresolved : context.currentDiscrepancyIndex;
        },
      }),
    },

    // ------ Pharmacist reviews critical discrepancies ------
    pharmacistReview: {
      on: {
        PHARMACIST_APPROVED: {
          target: 'providerReview',
          actions: assign({
            pharmacistReviewBy: ({ event }) => event.pharmacistId,
            pharmacistNotes: ({ event }) => event.notes ?? '',
          }),
        },
        PHARMACIST_OVERRIDE: {
          target: 'discrepancyReview',
          actions: assign({
            pharmacistReviewBy: ({ event }) => event.pharmacistId,
            pharmacistNotes: ({ event }) => event.overrideReason,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    // ------ Provider final review ------
    providerReview: {
      on: {
        PROVIDER_APPROVED: {
          target: 'generating',
          actions: assign({
            providerReviewBy: ({ event }) => event.providerId,
            providerNotes: ({ event }) => event.notes ?? '',
          }),
        },
        PROVIDER_REQUESTS_CHANGES: {
          target: 'discrepancyReview',
          actions: assign({
            providerReviewBy: ({ event }) => event.providerId,
            providerNotes: ({ event }) => event.changeRequests,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    // ------ Generate reconciliation summary ------
    generating: {
      on: {
        RECONCILIATION_COMPLETE: {
          target: 'completed',
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
      },
    },

    // ------ Terminal states ------
    completed: {
      type: 'final',
    },

    cancelled: {
      type: 'final',
    },

    error: {
      on: {
        RETRY: {
          target: 'loadingMedications',
          guard: ({ context }) => canRetry(context),
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            error: () => null,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// State selectors
// ---------------------------------------------------------------------------

export function getReconciliationStatus(
  stateValue: string
): ReconciliationStatus {
  const stateMap: Record<string, ReconciliationStatus> = {
    idle: 'PENDING',
    loadingMedications: 'IN_PROGRESS',
    formularyMatching: 'IN_PROGRESS',
    discrepancyDetection: 'IN_PROGRESS',
    discrepancyReview: 'IN_PROGRESS',
    resolvingDiscrepancy: 'IN_PROGRESS',
    pharmacistReview: 'PHARMACIST_REVIEW',
    providerReview: 'PROVIDER_REVIEW',
    generating: 'IN_PROGRESS',
    completed: 'COMPLETED',
    error: 'IN_PROGRESS',
  };
  return stateMap[stateValue] ?? 'PENDING';
}

export function getProgressPercentage(
  stateValue: string,
  context: MARReconciliationContext
): number {
  const stateProgress: Record<string, number> = {
    idle: 0,
    loadingMedications: 10,
    formularyMatching: 25,
    discrepancyDetection: 40,
    discrepancyReview: 50,
    resolvingDiscrepancy: 50,
    pharmacistReview: 70,
    providerReview: 85,
    generating: 95,
    completed: 100,
    error: 0,
  };

  const base = stateProgress[stateValue] ?? 0;

  // Add progress within discrepancy review
  if (
    (stateValue === 'discrepancyReview' || stateValue === 'resolvingDiscrepancy') &&
    context.discrepancies.length > 0
  ) {
    const reviewProgress =
      (context.resolvedCount / context.discrepancies.length) * 20; // 20% allocated to review
    return Math.round(base + reviewProgress);
  }

  return base;
}
