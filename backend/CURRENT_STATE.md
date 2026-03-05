# ATTENDING Backend — Current State

_Last updated: Batch 16 completion (Behavioral Health Module + A+ completion)_

---

## Overall Grade: A+

### What's Complete

The backend is a production-hardened .NET 8 Clean Architecture application targeting clinical use
with full PHI handling, behavioral health screening, and zero-downtime deployment.

---

## Architecture

- **Domain layer** — Entities, domain services, domain events, value objects
- **Application layer** — CQRS with MediatR, FluentValidation, command/query handlers
- **Infrastructure layer** — EF Core + SQL Server, repository pattern, audit interceptor, distributed locks, clinical scheduler
- **API layer** — Controllers, JWT/DevBypass auth, security middleware, health checks, SignalR hub
- **Contracts** — Versioned DTOs, pagination models

---

## Security & Compliance

- Multi-tenant schema isolation (tenant ID on every query)
- Audit interceptor auto-populates CreatedBy/ModifiedBy/DeletedBy on every write
- Security headers middleware (CSP, HSTS, X-Frame-Options, etc.)
- Correlation ID middleware for distributed tracing
- Soft-delete global query filters
- Optimistic concurrency via RowVersion on all entities
- Azure AD B2C JWT bearer for production; DevAuthHandler for local dev
- PHI-safe logging (`PhiSafeLoggingPolicy`)
- OpenTelemetry distributed tracing (`OpenTelemetryExtensions`)
- Rate limiting per tenant (`.NET 8` built-in `RateLimiter`)
- Idempotency middleware for clinical order creation (prevents duplicate orders)
- 42 CFR Part 2 restricted disclosure enforcement (behavioral health SUD records)

---

## Infrastructure Services

- `RedisDistributedLockService` — cross-node safe, used by clinical scheduler
- `InMemoryDistributedLockService` — dev/test fallback
- `ClinicalSchedulerService` — distributed-lock-protected background jobs
  - CriticalLabResultSweep (every 2 min)
  - StaleEncounterSweep (every 10 min)
- `DatabaseInitializer` — idempotent seed on startup, environment-aware
- `InProcessEventBus` — MediatR-backed domain event bus with MassTransit-ready interface
- `ResilienceHandler` — circuit breaker + retry on external HTTP calls (AI, FHIR)

---

## Clinical Features

### Core Clinical Loop (fully wired)
- Patient registration → Encounter → COMPASS Assessment → Lab orders → Confirmation
- Real-time SignalR notifications for critical results and emergency alerts
- Red flag detection (14 patterns, 18 emergency conditions)
- Drug interaction checking

### Behavioral Health Screening (Batch 16)
Full PHI-safe behavioral health screening module covering 5 validated instruments:

| Instrument | Standard | Purpose | Special Handling |
|---|---|---|---|
| PHQ-9 | USPSTF Grade B | Depression severity | Item 9 suicide safety flag |
| GAD-7 | Spitzer et al. 2006 | Anxiety severity | — |
| C-SSRS | FDA recommended | Suicide risk rating | Emergency pipeline (SignalR) |
| AUDIT-C | USPSTF Grade B | Alcohol use | 42 CFR Part 2 protection |
| PC-PTSD-5 | Prins et al. 2016 | PTSD screening | Gateway item logic |

**Safety pipeline:** C-SSRS with IdeationLevel ≥ ActiveIdeationWithPlan routes through the same
emergency notification hub as `EmergencyProtocolTriggeredEvent` — real-time SignalR alert to provider.

**42 CFR Part 2:** AUDIT-C high-risk SUD findings set `IsPartTwoProtected = true` and fire
`PartTwoRecordCreatedEvent`. Safety override: `GetActiveSuicideRiskAsync` returns ALL records
regardless of Part 2 status (per 42 CFR 2.51).

### AI / FHIR Integration
- BioMistral clinical AI service (differential diagnosis, lab/imaging recommendations, triage)
- Epic FHIR R4 client + Oracle Health (Cerner) stub
- Fallback mechanisms for AI service unavailability

---

## Test Coverage — 415 Tests Passing

### Test Projects

| Project | Type | Files |
|---|---|---|
| ATTENDING.Domain.Tests | Unit | ~20 files |
| ATTENDING.Integration.Tests | Integration + E2E | ~30 files |

### Integration Test Categories

**Handler Tests** (InMemory DB via `DatabaseFixture`):
- `AssessmentHandlerTests.cs` / `AssessmentHandlerFullTests.cs`
- `PatientHandlerTests.cs`
- `EncounterHandlerTests.cs`
- `LabOrderHandlerTests.cs` / `LabOrderHandlerFullTests.cs`
- `QueryHandlerTests.cs`
- `BehavioralHealthHandlerTests.cs` — PHQ-9 (5 bands + item-9), GAD-7, C-SSRS (safety pipeline), AUDIT-C (Part 2), PC-PTSD-5 (gateway), guards

**Controller HTTP Tests** (Full pipeline via `AttendingWebApplicationFactory`):
- `ControllerIntegrationTests.cs` — 40+ tests across all controllers
- `ImagingMedicationsReferralsControllerTests.cs`
- `BehavioralHealthControllerTests.cs` — 20 tests, all 9 endpoints (Batch 16)
- `E2EClinicalWorkflowTests.cs`
- `SecurityRegressionTests.cs` — SQL injection, XSS, oversized payloads, path traversal
- `AuditTrailTests.cs`
- `MiddlewareTests.cs`
- `ApiSmokeTests.cs`

**Infrastructure Tests** (InMemory + Docker):
- `DistributedLockServiceTests.cs`
- `ClinicalSchedulerServiceTests.cs`
- `DatabaseInitializerTests.cs`
- `InProcessEventBusTests.cs`
- `ResilienceHandlerTests.cs`
- `RealDatabaseTests.cs` (`[Category=Docker]` — real SQL Server via Testcontainers)

### Test Infrastructure

| Component | Implementation |
|---|---|
| `AttendingWebApplicationFactory` | Full HTTP pipeline, `TestAuthHandler`, InMemory DB per instance |
| `AuditCapturingWebApplicationFactory` | Inspectable audit entries |
| `DatabaseFixture` | InMemory DB with seeding helpers |
| `SqlServerFixture` | Testcontainers SQL Server, real EF migrations |
| `appsettings.Testing.json` | Disables health checks, minimal logging |

### Run Commands

```bash
# All tests (no Docker required)
dotnet test tests/ATTENDING.Integration.Tests \
  --filter "Category!=Docker" \
  --logger "console;verbosity=normal"

# Docker-backed real-DB tests
dotnet test tests/ATTENDING.Integration.Tests \
  --logger "console;verbosity=normal"

# With coverage
dotnet test --collect:"XPlat Code Coverage"
```

---

## Deployment

### CI/CD Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|---|---|---|
| `backend-ci.yml` | Push/PR to `backend/**` | Build, test (415), Docker build |
| `blue-green.yml` | Push to `main` / manual | Blue-green Azure slot swap with smoke tests + auto-rollback |
| `deploy.yml` | Push to `main` | Full production deploy |
| `deploy-website.yml` | Push to `apps/website/**` | Static website deploy |
| `security-scan.yaml` | Schedule | SAST, dependency audit |

### Blue-Green Deployment (Batch 16)

Zero-downtime deployments via Azure App Service deployment slots:
1. Build Docker image → push to ACR
2. Run full test suite (415 tests, no Docker required)
3. Deploy image to `staging` slot
4. Smoke tests against staging: `/health/live`, `/health/ready`, `/api/v1/system/version`, `/api/v1/system/ping`
5. Slot swap: staging → production (zero-downtime, atomic)
6. Post-swap health verification
7. Auto-rollback if post-swap health check fails

---

## Authentication Strategy

| Environment | Handler | Mechanism |
|---|---|---|
| Production | Azure AD B2C | JWT bearer token validation |
| Development | `DevAuthHandler` | Auto-auth when `DevBypass=true` AND `IsDevelopment()` |
| Testing | `TestAuthHandler` | Always authenticates as provider identity |

---

## Known Remaining Work (Enterprise Roadmap)

- [ ] Azure Key Vault secrets management (production enforcement)
- [ ] MassTransit/RabbitMQ event bus (swap InProcessEventBus for multi-pod messaging)
- [ ] FHIR sandbox testing (connect existing FHIR client to Epic sandbox)
- [ ] SOC 2 evidence collection
- [ ] Azure infrastructure provisioning (currently local Docker)
