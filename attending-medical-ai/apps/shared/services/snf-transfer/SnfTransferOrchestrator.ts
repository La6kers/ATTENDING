/**
 * SNF Transfer Orchestrator
 *
 * Main orchestrator for SNF-to-Hospital transfers. Coordinates data collection,
 * reconciliation, document generation, and transmission across all three
 * transfer modes (Emergency, Urgent, Planned).
 *
 * Tier 1 service — assembles clinical context from Tier 0 domain services.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claims 1-3, 10
 */

import type {
  TransferRequest,
  InitiateTransferInput,
  TransferProgress,
  TransferSectionStatus,
  TransferEvent,
  TransferEventType,
  HospitalReceivingData,
} from '../../types/snf-transfer.types';
import type {
  InteractDocument,
  InteractSectionId,
  TransferMode,
  TransferStatus,
  TransferAcknowledgment,
} from '../../types/interact.types';
import type { ReconciliationResult } from '../../types/mar-reconciliation.types';
import { INTERACT_SECTIONS, getFieldsBySection, getEmergencyFields } from '../../catalogs/interact-fields';
import type { MarReconciliationEngine } from './MarReconciliationEngine';
import type { InteractDocumentGenerator } from './InteractDocumentGenerator';
import type { TransferCommunicationService } from './TransferCommunicationService';
import type { WoundAssessmentProcessor } from './WoundAssessmentProcessor';
import type { IsolationPrecautionManager } from './IsolationPrecautionManager';
import type { FunctionalStatusAggregator } from './FunctionalStatusAggregator';
import type { PprEvaluator } from './PprEvaluator';
import type { PolstExtractor } from './PolstExtractor';

// ---------------------------------------------------------------------------
// Orchestrator Interface
// ---------------------------------------------------------------------------

export interface ISnfTransferOrchestrator {
  initiateTransfer(input: InitiateTransferInput): Promise<TransferRequest>;
  getTransferProgress(transferId: string): Promise<TransferProgress>;
  completeSection(transferId: string, sectionId: InteractSectionId, data: unknown): Promise<void>;
  startReconciliation(transferId: string): Promise<ReconciliationResult>;
  generateDocument(transferId: string): Promise<InteractDocument>;
  transmitToHospital(transferId: string): Promise<void>;
  handleAcknowledgment(transferId: string, ack: TransferAcknowledgment): Promise<void>;
  cancelTransfer(transferId: string, reason: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class SnfTransferOrchestrator implements ISnfTransferOrchestrator {
  constructor(
    private readonly marEngine: MarReconciliationEngine,
    private readonly documentGenerator: InteractDocumentGenerator,
    private readonly communicationService: TransferCommunicationService,
    private readonly woundProcessor: WoundAssessmentProcessor,
    private readonly isolationManager: IsolationPrecautionManager,
    private readonly functionalAggregator: FunctionalStatusAggregator,
    private readonly pprEvaluator: PprEvaluator,
    private readonly polstExtractor: PolstExtractor,
    private readonly eventHandler: (event: TransferEvent) => void
  ) {}

  async initiateTransfer(input: InitiateTransferInput): Promise<TransferRequest> {
    // 1. Create transfer request record
    const transfer = this.createTransferRequest(input);

    // 2. Evaluate PPR risk
    const pprFlag = await this.pprEvaluator.evaluate(
      input.patientId,
      input.reasonForTransfer,
      input.icdCodes ?? []
    );

    if (pprFlag.isFlagged) {
      transfer.pprFlag = pprFlag;
      this.emitEvent('PPR_FLAG_RAISED', transfer.id, { pprFlag });
    }

    // 3. Determine data collection strategy based on mode
    const mode = input.urgencyLevel;
    if (mode === 'EMERGENCY') {
      // Auto-extract critical data immediately
      await this.startEmergencyDataCollection(transfer);
    }

    this.emitEvent('TRANSFER_INITIATED', transfer.id, {
      urgencyLevel: input.urgencyLevel,
      receivingFacilityId: input.receivingFacilityId,
    });

    return transfer;
  }

  async getTransferProgress(transferId: string): Promise<TransferProgress> {
    // Build section status from completed sections
    const sections: TransferSectionStatus[] = INTERACT_SECTIONS.map((section) => {
      const fields = getFieldsBySection(section.id);
      // In a real implementation, check which fields have been populated
      return {
        sectionId: section.id,
        status: 'NOT_STARTED',
        completedFields: 0,
        totalFields: fields.length,
        completionPercentage: 0,
      };
    });

    return {
      transferRequestId: transferId,
      transferMode: 'URGENT', // Would come from stored transfer
      overallPercentage: 0,
      sections,
      blockers: [],
    };
  }

  async completeSection(
    transferId: string,
    sectionId: InteractSectionId,
    data: unknown
  ): Promise<void> {
    // Validate section data against INTERACT field definitions
    // Store section data
    // Update progress

    this.emitEvent('SECTION_COMPLETED', transferId, { sectionId });
  }

  async startReconciliation(transferId: string): Promise<ReconciliationResult> {
    this.emitEvent('MAR_RECONCILIATION_STARTED', transferId, {});

    const result = await this.marEngine.reconcile(transferId);

    if (result.criticalCount > 0) {
      this.emitEvent('CRITICAL_DISCREPANCY_DETECTED', transferId, {
        criticalCount: result.criticalCount,
      });
    }

    this.emitEvent('MAR_RECONCILIATION_COMPLETED', transferId, {
      totalMedications: result.totalMedications,
      discrepancyCount: result.discrepancyCount,
      criticalCount: result.criticalCount,
    });

    return result;
  }

  async generateDocument(transferId: string): Promise<InteractDocument> {
    const document = await this.documentGenerator.generate(transferId);

    this.emitEvent('DOCUMENT_GENERATED', transferId, {
      documentId: document.id,
      completionPercentage: document.completionPercentage,
    });

    return document;
  }

  async transmitToHospital(transferId: string): Promise<void> {
    await this.communicationService.transmit(transferId);

    this.emitEvent('DOCUMENT_TRANSMITTED', transferId, {
      transmittedAt: new Date().toISOString(),
    });
  }

  async handleAcknowledgment(
    transferId: string,
    ack: TransferAcknowledgment
  ): Promise<void> {
    this.emitEvent('HOSPITAL_ACKNOWLEDGED', transferId, {
      receivedAt: ack.receivedAt,
      receivingPhysician: ack.receivingPhysician,
      isolationRoomAssigned: ack.isolationRoomAssigned,
    });
  }

  async cancelTransfer(transferId: string, reason: string): Promise<void> {
    this.emitEvent('TRANSFER_CANCELLED', transferId, { reason });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private createTransferRequest(input: InitiateTransferInput): TransferRequest {
    const now = new Date().toISOString();
    return {
      id: '', // Generated by persistence layer
      organizationId: '', // From auth context
      patientId: input.patientId,
      sendingFacilityId: input.sendingFacilityId,
      sendingFacilityName: '',
      receivingFacilityId: input.receivingFacilityId,
      receivingFacilityName: '',
      urgencyLevel: input.urgencyLevel,
      transferMode: input.urgencyLevel,
      status: 'INITIATED',
      reasonForTransfer: input.reasonForTransfer,
      icdCodes: input.icdCodes ?? [],
      metadata: {
        earlyWarningSigns: [],
        interventionsAttempted: [],
      },
      timeline: {
        initiatedAt: now,
      },
      transportMode: input.transportMode as any,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async startEmergencyDataCollection(transfer: TransferRequest): Promise<void> {
    // In emergency mode, extract priority tier 1 and 2 fields automatically:
    // Tier 1: Code status, name, DOB, allergies, isolation, urgency, reason
    // Tier 2: Medications (last 24h), vitals, SNF info, attending physician
    //
    // This runs as a background operation with the document being
    // incrementally transmitted to the receiving hospital as data arrives.

    const emergencyFields = getEmergencyFields();
    // Implementation would query each data source for emergency fields
    // and incrementally build the INTERACT document
  }

  private emitEvent(
    type: TransferEventType,
    transferRequestId: string,
    data: Record<string, unknown>
  ): void {
    this.eventHandler({
      type,
      transferRequestId,
      timestamp: new Date().toISOString(),
      data,
    });
  }
}
