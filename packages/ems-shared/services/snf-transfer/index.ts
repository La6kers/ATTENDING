/**
 * SNF-to-Hospital Transfer Service Module
 *
 * Public API for the P16 SNF transfer system. All external consumers
 * should import from this barrel file.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md
 */

// Orchestrator
export { SnfTransferOrchestrator } from './SnfTransferOrchestrator';

// Core services
export { MarReconciliationEngine } from './MarReconciliationEngine';
export { InteractDocumentGenerator } from './InteractDocumentGenerator';
export { TransferCommunicationService } from './TransferCommunicationService';

// Clinical assessment services
export { WoundAssessmentProcessor } from './WoundAssessmentProcessor';
export { IsolationPrecautionManager } from './IsolationPrecautionManager';
export { FunctionalStatusAggregator } from './FunctionalStatusAggregator';
export { PprEvaluator } from './PprEvaluator';
export { PolstExtractor } from './PolstExtractor';

// Diagnosis coding & billing services
export { DiagnosisCodingEngine } from './DiagnosisCodingEngine';
export type { CodingInput, CodingResult, CodeSuggestion } from './DiagnosisCodingEngine';
export { EmLevelDeterminator } from './EmLevelDeterminator';
export { NarrativeGenerator } from './NarrativeGenerator';
export type { NarrativeInput, NarrativeResult } from './NarrativeGenerator';

// Re-export types for convenience
export type {
  TransferRequest,
  TransferSummary,
  TransferProgress,
  TransferEvent,
  InitiateTransferInput,
  HospitalReceivingData,
} from '../../types/snf-transfer.types';

export type {
  InteractDocument,
  TransferAcknowledgment,
  PPRFlag,
} from '../../types/interact.types';

export type {
  ReconciliationSession,
  ReconciliationResult,
  MedicationDiscrepancy,
} from '../../types/mar-reconciliation.types';
