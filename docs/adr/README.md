# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the ATTENDING AI healthcare platform. Each ADR documents a major technical decision, its rationale, consequences, and alternatives considered.

## Overview

An **ADR** is a record of an architecturally significant decision that was made and its consequences. They serve as:

- **Decision Log**: Why we chose X over Y, Z
- **Knowledge Preservation**: Onboarding new engineers
- **Future Reference**: Why we did something (prevents reopening decisions)
- **Audit Trail**: For HIPAA compliance and regulatory review

## Current ADRs

| ID | Title | Status | Date | Topic |
|---|---|---|---|---|
| [0001](./0001-clean-architecture.md) | Domain-Driven Clean Architecture | Accepted | 2026-02-24 | Layered architecture (Domain → Application → Infrastructure → API) |
| [0002](./0002-cqrs-mediatr.md) | CQRS with MediatR Pipeline Behaviors | Accepted | 2026-02-24 | Command/Query separation with cross-cutting concern middleware |
| [0003](./0003-multi-tenant-isolation.md) | Row-Level Multi-Tenant Isolation | Accepted | 2026-02-24 | TenantId on all entities with EF Core global query filters |
| [0004](./0004-event-driven-architecture.md) | Event-Driven Architecture with MassTransit | Accepted | 2026-02-24 | Domain events published to message bus for async workflows |
| [0005](./0005-fhir-integration-strategy.md) | Multi-Vendor FHIR R4 Integration | Accepted | 2026-02-24 | Vendor-agnostic FHIR client factory pattern |

## ADR Process

### Creating a New ADR

1. **Title**: Write a clear title as "ADR-NNNN: Short Description"
   - Use 4-digit number (0001, 0002, etc.)
   - Example: `0006-redis-caching-strategy.md`

2. **Status**: Start with one of:
   - `Proposed`: Under discussion
   - `Accepted`: Approved and implemented
   - `Deprecated`: Replaced by newer ADR
   - `Superseded by [ADR-XXXX]`: Link to replacement

3. **Required Sections**:
   ```markdown
   # ADR-NNNN: Title

   **Status:** Accepted
   **Date:** YYYY-MM-DD
   **Decision Makers:** [Names/Roles]

   ## Context
   - What problem or challenge triggered this decision?
   - What constraints exist?
   - Why is this decision necessary?

   ## Decision
   - What was decided?
   - Use clear technical language and code examples

   ## Consequences

   ### Positive
   - Benefit 1
   - Benefit 2

   ### Negative
   - Tradeoff 1
   - Tradeoff 2

   ### Risks
   - Risk 1
   - Risk 2

   ## Alternatives Considered
   - Alternative A: Why rejected?
   - Alternative B: Why rejected?

   ## Implementation Notes
   - Key points for teams implementing this
   - Configuration examples
   - Testing strategy
   ```

4. **Format**: Use Markdown with:
   - Code blocks with syntax highlighting (e.g., ` ```csharp ` )
   - Tables for comparisons
   - Lists for clarity
   - References to related ADRs

5. **Review & Approve**:
   - Share with engineering team
   - Get feedback from stakeholders
   - Update status to "Accepted"

6. **Update this README**: Add entry to the ADR table above

### Updating an Existing ADR

Only update an accepted ADR if:
- **Correction**: Fixed a typo or factual error
- **Clarification**: Improved explanation without changing decision
- **Superseded**: Mark as superseded by new ADR

Do **NOT** update to change decision; create a new ADR instead.

### Deprecating an ADR

If a decision is no longer relevant:

1. Change status to `Deprecated` or `Superseded by ADR-XXXX`
2. Add note at top of document:
   ```markdown
   > **Deprecated (2026-03-01)**: This decision was superseded by [ADR-0007](./0007-xxx.md)
   > due to [reason]. See that ADR for current guidance.
   ```
3. Keep original ADR for historical reference

## ADR Topology

The ADRs form an interconnected system:

```
0001: Clean Architecture (Foundation)
├── 0002: CQRS + MediatR (Application layer pattern)
├── 0003: Multi-Tenant Isolation (Domain + query layer)
└── 0004: Event-Driven Architecture (Cross-domain communication)
    └── 0005: FHIR Integration (External service abstraction)
```

### Dependency Notes

- **0002** (CQRS) implements the Application layer from **0001**
- **0003** (Multi-Tenancy) applies to all layers of **0001**
- **0004** (Events) drives async workflows between aggregates (0001/0002)
- **0005** (FHIR) is a consumer of events (0004) and uses CQRS handlers (0002)

## HIPAA & Regulatory Compliance

ATTENDING AI ADRs are designed with healthcare compliance in mind:

- **Audit Trails** (0004): Domain events logged for HIPAA accountability
- **Data Isolation** (0003): Row-level multi-tenancy prevents cross-organization data leakage
- **Separation of Concerns** (0001): Clear boundaries for security review
- **Error Handling** (0002): Consistent error responses prevent information disclosure
- **Third-Party Integration** (0005): Vendor-agnostic pattern simplifies BAA audits

Each ADR includes "Risks" section highlighting compliance considerations.

## Architectural Principles

ADRs are guided by these core principles:

1. **Domain-Driven**: Business logic (clinical workflows) drives architecture
2. **Clean Code**: Separation of concerns, testability, maintainability
3. **Event-Sourced Audit**: All state changes are events (HIPAA requirement)
4. **Multi-Tenant Safe**: No accidental data leakage across organizations
5. **Vendor-Agnostic**: Pluggable integrations (EHR, email, SMS providers)
6. **Resilient**: Async processing, retry logic, graceful degradation
7. **Scalable**: Layers can be deployed independently

## Tools & Standards

- **Markdown Format**: GitHub-flavored Markdown
- **C# Code Examples**: .NET 8, async/await, modern C# syntax
- **FHIR Standard**: R4 (as of 2026-02-24)
- **EHR Vendors**: Epic, Oracle Health (Cerner), athenahealth
- **Message Bus**: MassTransit with Azure Service Bus transport

## Questions?

- **New to ADRs?** Read the [Nygard ADR template](https://github.com/joelparkerhenderson/architecture_decision_record)
- **Architecture questions?** Post in #architecture Slack channel
- **Compliance concerns?** Contact the HIPAA Officer

## Changelog

| Date | Change |
|---|---|
| 2026-02-24 | Initial ADR set created (0001-0005) |
