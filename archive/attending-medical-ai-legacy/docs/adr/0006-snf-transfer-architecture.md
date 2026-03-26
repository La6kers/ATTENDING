# ADR 0006: SNF-to-Hospital Transfer Architecture

Last Updated: March 24, 2026

## Status

Accepted

## Context

Patent 16 requires a system for automated SNF-to-Hospital transfer documentation. The system must support three transfer modes (emergency, urgent, planned), medication reconciliation against hospital formulary, wound assessment with AI staging, isolation precaution transmission, functional status aggregation, PPR quality flagging, and advance directive integration.

Key constraints:
- Must integrate with the existing ATTENDING platform monorepo
- Must follow the tiered clinical intelligence pattern (Tier 0/1/2)
- Must support real-time updates in emergency mode
- Must generate INTERACT v4.0 compliant documents
- Must support bidirectional communication with receiving hospitals

## Decision

### Architecture: Module-per-claim with shared orchestration

Each of the six novel patent elements is implemented as an independent service module. A central orchestrator coordinates them through an XState state machine that models the three transfer modes as parallel paths with shared monitoring states.

**Why modules, not a monolithic service:** Each patent claim covers a distinct clinical domain (medications, wounds, infections, functional status, quality metrics, advance directives). Independent modules allow:
- Each domain to have its own validation rules and data sources
- Independent testing and verification per patent claim
- Tier assignment per module (wound CV = Tier 2, formulary matching = Tier 0)

### Data model: Prisma schema extensions, not a separate database

New models are added to the existing Prisma schema rather than creating a separate database. This maintains:
- Single source of truth for patient data
- Existing multi-tenancy enforcement via organizationId
- Existing audit trail patterns (soft delete, timestamps)

### State management: Two XState machines

The transfer workflow uses two state machines:
1. **transferMachine**: Top-level workflow with three mode paths (emergency/urgent/planned) converging on shared monitoring → completion states
2. **marReconciliationMachine**: Nested workflow for medication reconciliation with pharmacist and provider review gates

**Why two machines, not one:** MAR reconciliation has its own multi-step review process that can be independently tested and potentially reused outside of transfers.

### Communication: SignalR with HL7 FHIR fallback

Emergency mode requires real-time incremental document updates. SignalR (already in the platform) provides push-based updates. For hospitals without SignalR integration, the system falls back to HL7 FHIR R4 CCD/C-CDA document exchange, then to direct API, then to automated fax.

## Consequences

### Positive
- Clean mapping between patent claims and implementation modules
- Each module independently testable
- Emergency mode can transmit partial documents immediately
- Existing platform patterns (tiered architecture, event dispatch, multi-tenancy) are reused

### Negative
- 10 new Prisma models increase schema complexity
- Hospital formulary data must be sourced and maintained externally
- Wound CV model and POLST OCR model require separate ML infrastructure (Tier 2)

### Risks
- Hospital integration varies widely — some hospitals may only accept fax
- INTERACT protocol may update; field catalog must support versioning
- PPR diagnosis list changes annually with CMS rulemaking

## Alternatives Considered

1. **Separate microservice**: Rejected — adds deployment complexity without benefit given the existing monorepo architecture
2. **Single monolithic transfer service**: Rejected — combines unrelated clinical domains and makes per-claim testing difficult
3. **Generic document generator with plugin architecture**: Rejected — over-engineering for a system with exactly one target protocol (INTERACT)
