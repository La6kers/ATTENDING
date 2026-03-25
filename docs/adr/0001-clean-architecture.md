# ADR-0001: Domain-Driven Clean Architecture

**Status:** Accepted  
**Date:** 2026-02-24  
**Decision Makers:** Engineering Team

## Context

The ATTENDING AI healthcare platform operates in a heavily regulated environment (HIPAA, HITECH Act, state medical board requirements). We need to ensure strict separation of concerns to:

1. Maintain clear boundaries between business logic and infrastructure concerns
2. Enforce compliance controls at the domain layer
3. Facilitate testing and validation of critical clinical workflows
4. Enable independent evolution of UI, API contracts, and backend services

The platform processes sensitive Protected Health Information (PHI) and orchestrates clinical operations (appointments, clinical notes, referrals) that require audit trails and immutable records.

## Decision

We adopt **domain-driven clean architecture** with a strict four-layer separation using .NET 8:

```
┌─────────────────────────────────────┐
│     API / HTTP Boundary             │
├─────────────────────────────────────┤
│     Application Layer               │  Commands, Queries, DTOs
│     (ATTENDING.Orders.Application)  │  Orchestration & Validation
├─────────────────────────────────────┤
│     Domain Layer                    │  Core Business Logic
│     (ATTENDING.Orders.Domain)       │  Aggregates, Value Objects
├─────────────────────────────────────┤
│     Infrastructure Layer            │  EF Core, MediatR, 3rd-party integrations
│     (ATTENDING.Orders.Infrastructure)
└─────────────────────────────────────┘
```

### Layer Responsibilities

**Domain Layer** (ATTENDING.Orders.Domain)
- Aggregates: `Order`, `Patient`, `Appointment`, `ClinicalNote`
- Value Objects: `PhoneNumber`, `DateRange`, `ClinicalStatus`
- Domain Services: `OrderValidationService`, `AppointmentScheduler`
- Domain Events: `OrderCreated`, `PatientRegistered`, `AppointmentScheduled`
- No external dependencies (no EF Core, no HTTP clients)

**Application Layer** (ATTENDING.Orders.Application)
- Commands: `CreateOrderCommand`, `ScheduleAppointmentCommand`
- Queries: `GetPatientQuery`, `ListUpcomingAppointmentsQuery`
- Command/Query Handlers: Orchestrate domain operations
- DTOs: Isolate external contract changes
- Validation Pipelines: FluentValidation rules
- Mapper: AutoMapper for DTO ↔ Domain transformations

**Infrastructure Layer** (ATTENDING.Orders.Infrastructure)
- EF Core DbContext, migrations, configurations
- Repository implementations
- External service clients (Epic FHIR, CRM APIs)
- Message publishers (MassTransit)
- Email/SMS providers

**API/Presentation Layer**
- Controllers: REST endpoints
- Middleware: Auth, logging, error handling
- Dependency Injection configuration
- OpenAPI/Swagger definitions

## Consequences

### Positive
- **HIPAA Audit Trail**: Domain events enable comprehensive logging of all PHI access
- **Testability**: Pure domain logic is testable without database or HTTP mocks
- **Clear Dependencies**: Inverse dependency flow: Domain ← Application ← Infrastructure
- **Scaling**: Independent deployment of API, workers, scheduled jobs
- **Compliance**: Business rules centralized in domain layer for regulatory review
- **.NET 8 Performance**: Native AOT and minimal APIs reduce cold-start time

### Negative
- **Boilerplate**: More files and directory structure (4 projects per domain)
- **Abstraction Learning Curve**: Developers must understand layered architecture concepts
- **Mapping Overhead**: DTO ↔ Domain conversions add performance cost (measured & acceptable)

### Risks
- **Layer Violation**: Developers may bypass layers during urgent fixes
- **Domain Anemia**: If domain logic is weak, layers become mere data-passing conduits
- **Over-Engineering**: Micro-features don't need full four-layer treatment

## Alternatives Considered

1. **Traditional N-Tier Architecture** (UI → BLL → DAL)
   - Simpler initially but mixing concerns (business logic in DAL)
   - Harder to enforce HIPAA controls

2. **Hexagonal Architecture (Ports & Adapters)**
   - More flexible for extreme requirements changes
   - Steeper learning curve; we don't need that flexibility level

3. **Minimal APIs without Separate Projects**
   - Faster initial development
   - Would violate HIPAA audit requirements as logic scatters

## Implementation Notes

- Use C# records for DTOs and Value Objects (immutability by default)
- Leverage nullable reference types (`#nullable enable`) for null-safety
- Configure EF Core global query filters for multi-tenancy (TenantId)
- Domain events dispatched synchronously in `SaveChangesAsync`
