# ATTENDING Backend — Current State

_Last updated: Batch 14 completion_

---

## Overall Grade: A- → A+ (in progress)

### What's Complete

The backend is a production-hardened .NET 8 Clean Architecture application targeting clinical use with PHI handling.

#### Architecture
- **Domain layer** — Entities, domain services, domain events, value objects
- **Application layer** — CQRS with MediatR, FluentValidation, command/query handlers
- **Infrastructure layer** — EF Core + SQL Server, repository pattern, audit interceptor, distributed locks, clinical scheduler
- **API layer** — Controllers, JWT/DevBypass auth, security middleware, health checks, SignalR hub
- **Contracts** — Versioned DTOs, pagination models

#### Security & Compliance
- Multi-tenant schema isolation (tenant ID on every query)
- Audit interceptor auto-populates CreatedBy/ModifiedBy/DeletedBy on every write
- Security headers middleware (CSP, HSTS, X-Frame-Options, etc.)
- Correlation ID middleware for distributed tracing
- Soft-delete global query filters
- Optimistic concurrency via RowVersion on all entities
- Azure AD B2C JWT bearer for production; DevAuthHandler for local dev

#### Infrastructure Services
- `RedisDistributedLockService` — cross-node safe, used by clinical scheduler
- `InMemoryDistributedLockService` — dev/test fallback
- `ClinicalSchedulerService` — distributed-lock-protected background jobs (critical lab sweep, stale encounter sweep)
- `DatabaseInitializer` — idempotent seed on startup, environment-aware

#### AI / FHIR Integration
- BioMistral clinical AI service (differential diagnosis, lab/imaging recommendations, triage)
- Epic FHIR R4 client + Oracle Health (Cerner) stub
- Fallback mechanisms for AI service unavailability

---

## Test Coverage

### Test Projects

| Project | Type | Files |
|---------|------|-------|
| ATTENDING.Domain.Tests | Unit | ~20 files |
| ATTENDING.Integration.Tests | Integration + E2E | ~25 files |

### Integration Test Categories

**Handler Integration Tests** (InMemory DB via `DatabaseFixture`):
- `AssessmentHandlerTests.cs` — Start, emergency detection, validation
- `AssessmentHandlerFullTests.cs` — SubmitResponse, AdvancePhase, Complete, Review, full workflow
- `PatientHandlerTests.cs` — Create, duplicate MRN, allergies, conditions
- `EncounterHandlerTests.cs` — Create, CheckIn, Start, Complete, state transitions
- `LabOrderHandlerTests.cs` — Create, STAT upgrade, patient validation
- `LabOrderHandlerFullTests.cs` — UpdatePriority, Cancel, MarkCollected, AddResult, audit logging
- `QueryHandlerTests.cs` — Patient/Encounter/Assessment queries, pagination, navigation properties

**Controller Integration Tests** (Full HTTP pipeline via `AttendingWebApplicationFactory`):
- `ControllerIntegrationTests.cs` — 40+ tests covering all controllers, health, system
- `ImagingMedicationsReferralsControllerTests.cs` — Imaging orders, medications, referrals CRUD
- `E2EClinicalWorkflowTests.cs` — Full patient intake → encounter → assessment → lab order
- `MultiTenantIsolationTests.cs` — Tenant data isolation, cross-tenant access prevention
- `SecurityRegressionTests.cs` — SQL injection, XSS, oversized payloads, path traversal
- `AuditTrailTests.cs` — PHI access logging, mandatory fields, state-changing operations
- `MiddlewareTests.cs` — Correlation ID, API version, security headers
- `ApiSmokeTests.cs` — Health checks, critical endpoints respond

**Infrastructure / Real-DB Tests** (Docker SQL Server via `SqlServerFixture`):
- `DistributedLockServiceTests.cs` — Lock acquisition, contention, scheduler patterns
- `ClinicalSchedulerServiceTests.cs` — Distributed lock integration, cancellation, idempotency
- `DatabaseInitializerTests.cs` — Seeding, idempotency, environment-specific behavior
- `ConcurrencyTests.cs` — RowVersion optimistic concurrency (real SQL Server)
- `SoftDeleteQueryFilterTests.cs` — Global query filters, navigation properties
- `AuditInterceptorTests.cs` — Auto-population of CreatedBy/ModifiedBy/DeletedBy

### Test Infrastructure

| Component | Implementation |
|-----------|----------------|
| `AttendingWebApplicationFactory` | Full HTTP pipeline, `TestAuthHandler` auto-authenticates all requests, InMemory DB per instance |
| `AuditCapturingWebApplicationFactory` | Extends base factory, exposes inspectable audit entries |
| `DatabaseFixture` | InMemory DB with seeding helpers, `StubAuditService` |
| `SqlServerFixture` | Testcontainers SQL Server, real EF migrations, concurrency testing |
| `appsettings.Testing.json` | Disables health checks, minimal logging, DevBypass=false |

### Authentication Strategy by Environment

| Environment | Handler | Mechanism |
|-------------|---------|-----------|
| Production | Azure AD B2C | JWT bearer token validation |
| Development | `DevAuthHandler` | Auto-auth when `DevBypass=true` AND `IsDevelopment()` |
| Testing | `TestAuthHandler` | Always authenticates as provider identity (injected by factory) |

---

## Known Gaps / Remaining Work

### A+ Completion Items
- [ ] Run full test suite and confirm pass rate (requires local `dotnet test`)
- [ ] Docker-based tests need `[Trait("Category", "Docker")]` and local Docker daemon
- [ ] Generate code coverage report (`coverlet` + `reportgenerator`)
- [ ] Review and update CI/CD pipeline to run integration tests

### Production Readiness (Enterprise Roadmap Phase 1)
- [ ] Secrets management (Azure Key Vault integration in production)
- [ ] Structured logging with correlation IDs forwarded to Seq/Application Insights
- [ ] Rate limiting per tenant
- [ ] API versioning enforcement (sunset headers)
- [ ] Database connection resiliency (retry policies, circuit breaker)
- [ ] Performance baseline tests (response time SLAs for clinical workflows)

---

## Running the Tests

See `TEST_EXECUTION.md` for full instructions.

**Quick start (no Docker required):**
```bash
cd backend
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "Category!=Docker" \
  --logger "console;verbosity=normal"
```

**With Docker (real SQL Server tests):**
```bash
dotnet test tests/ATTENDING.Integration.Tests \
  --logger "console;verbosity=normal"
```
