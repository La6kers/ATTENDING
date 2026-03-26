# P16 Module Architecture

Last Updated: March 24, 2026

## Overview

The P16 SNF-to-Hospital Transfer system is organized as a set of independent modules within the ATTENDING platform monorepo, following the existing tiered clinical intelligence architecture.

## Tiered Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tier 2: Cloud AI Services                              │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ WoundAssessment     │  │ PolstExtractor           │  │
│  │ Processor (CV)      │  │ (OCR/NLP)                │  │
│  └─────────────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Tier 1: Context Assembly                               │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ SnfTransfer         │  │ InteractDocument         │  │
│  │ Orchestrator        │  │ Generator                │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ MarReconciliation   │  │ TransferCommunication    │  │
│  │ Engine              │  │ Service                  │  │
│  └─────────────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Tier 0: Pure Domain Rules                              │
│  ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ PprEvaluator    │ │ Isolation    │ │ Functional   │ │
│  │                 │ │ Precaution   │ │ Status       │ │
│  │                 │ │ Manager      │ │ Aggregator   │ │
│  └─────────────────┘ └──────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│  State Machines (XState v5)                             │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ transferMachine     │  │ marReconciliation        │  │
│  │ (3 mode paths)      │  │ Machine                  │  │
│  └─────────────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Prisma Models (10 new) + .NET Domain Entities   │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Clinical Catalogs (INTERACT, PPR, Instruments)  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Directory Layout

```
apps/shared/
├── types/
│   ├── interact.types.ts          # INTERACT document types
│   ├── mar-reconciliation.types.ts # MAR reconciliation types
│   └── snf-transfer.types.ts      # Transfer orchestration types
├── catalogs/
│   ├── interact-fields.ts         # INTERACT field definitions
│   ├── ppr-diagnoses.ts           # CMS PPR diagnosis codes
│   └── functional-instruments.ts  # Assessment scoring rules
├── machines/
│   ├── transferMachine.ts         # Transfer workflow (3 modes)
│   └── marReconciliationMachine.ts # Reconciliation workflow
└── services/snf-transfer/
    ├── index.ts                   # Public API
    ├── SnfTransferOrchestrator.ts # Main orchestrator (Tier 1)
    ├── MarReconciliationEngine.ts # Formulary matching (Tier 0-1)
    ├── InteractDocumentGenerator.ts # Document assembly (Tier 1)
    ├── TransferCommunicationService.ts # Hospital comms (Tier 1)
    ├── WoundAssessmentProcessor.ts # CV wound staging (Tier 2)
    ├── IsolationPrecautionManager.ts # Infection control (Tier 0)
    ├── FunctionalStatusAggregator.ts # Score aggregation (Tier 0)
    ├── PprEvaluator.ts            # PPR flagging (Tier 0)
    └── PolstExtractor.ts          # Advance directive (Tier 2)

backend/src/ATTENDING.Domain/
├── Entities/SnfTransfer.cs        # All transfer entities
├── Services/MarReconciliationService.cs # .NET reconciliation
└── Events/TransferEvents.cs       # Domain events

prisma/
└── p16-schema-additions.prisma    # 10 new database models
```

## Transfer Flow by Mode

### Emergency Mode (10-15 minutes)
1. Nurse taps "Emergency Transfer" → system auto-extracts Tier 1 priority data
2. Code status, allergies, isolation → transmitted immediately
3. Medications, vitals → transmitted within 5 minutes
4. Document updates incrementally via SignalR
5. No MAR reconciliation or provider review required

### Urgent Mode (2-4 hours)
1. Nurse initiates transfer → structured data collection begins
2. System walks through each INTERACT section
3. Full MAR reconciliation (nurse → pharmacist → provider review)
4. Wound photography and AI-assisted staging
5. Complete INTERACT document generated → provider review
6. Document transmitted → hospital acknowledgment

### Planned Mode (24-48 hours)
1. Transfer scheduled → data collection window opens
2. Multidisciplinary team completes all sections
3. Full reconciliation with extended review
4. Document transmitted days before transfer
5. Hospital completes pre-authorization and bed planning

## Patent Claim Mapping

| Claim | Module | File |
|-------|--------|------|
| 1-3 (Independent) | Orchestrator + Document Generator | SnfTransferOrchestrator.ts, InteractDocumentGenerator.ts |
| 4 (MAR Reconciliation) | MAR Engine + Machine | MarReconciliationEngine.ts, marReconciliationMachine.ts |
| 5 (Wound Photography) | Wound Processor | WoundAssessmentProcessor.ts |
| 6 (Isolation Precautions) | Isolation Manager | IsolationPrecautionManager.ts |
| 7 (Functional Status) | Functional Aggregator | FunctionalStatusAggregator.ts |
| 8 (PPR Flagging) | PPR Evaluator | PprEvaluator.ts |
| 9 (POLST Integration) | POLST Extractor | PolstExtractor.ts |
| 10 (Transfer Modes) | Transfer Machine | transferMachine.ts |
| 11 (Bidirectional Ack) | Communication Service | TransferCommunicationService.ts |
| 12 (Real-time Tracking) | Communication Service + Events | TransferEvents.cs |
