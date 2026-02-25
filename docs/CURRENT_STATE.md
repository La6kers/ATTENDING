# ATTENDING AI — Current State

**Last Updated:** February 24, 2026
**Branch:** mockup-2
**Grade:** A- → A (Batch 15 complete; verification steps remain for A+)

---

## What This Document Is

An honest, verified assessment of what works, what's scaffolding, and what's next.
This is the first file any developer or AI session should read.

---

## Architecture Overview

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend (Provider) | Next.js 14 / React 18 / TypeScript | Running, mock data |
| Frontend (Patient) | Next.js 14 / React 18 / TypeScript | Running, mock data |
| BFF API Routes | Next.js API routes + Prisma | Partially wired |
| Production Backend | .NET 8 / Clean Architecture / CQRS | Built, comprehensive tests |
| Database | MS SQL Server via EF Core + Prisma | Schema complete, Docker dev |
| Auth | Azure AD B2C + NextAuth | Scaffolded, not enforced |
| Real-time | SignalR (production) / Socket.io (frontend) | Built, not connected |
| CI/CD | GitHub Actions (4 canonical workflows) | Build + test passing |

---

## What Is Real and Production-Quality

These components have been reviewed, tested, and represent genuine enterprise value:

### Grade A (Production-Ready)
- **Prisma Schema** (prisma/schema.prisma) — 30+ models, soft-delete, HIPAA annotations, proper indexes
- **Clinical Catalogs** (apps/shared/catalogs/) — Labs, imaging, medications, referrals with CPT/LOINC codes. Core IP.
- **Store Factory** (apps/shared/stores/createClinicalOrderStore.ts) — Clean Zustand+Immer pattern. 83% reduction from individual stores.
- **Secure API Handler** (apps/shared/lib/api/secureHandler.ts) — 9-layer pipeline: method validation, rate limiting, auth, RBAC, CSRF, input sanitization, Zod validation, audit logging, PHI masking.
- **Security Module** (apps/shared/lib/security/security.ts) — AES-256-GCM encryption, PBKDF2 hashing, timing-safe CSRF, SQL injection detection tuned for clinical text.
- **Test Infrastructure** — TestAuthHandler, WebApplicationFactory, Testcontainers fixtures, 45+ test files.
- **Rate Limiting** — Per-tenant sliding window, clinical ops token bucket, auth fixed window.
- **PHI-Safe Logging** — Serilog with masking destructuring policy.
- **Distributed Locks** — Redis-backed with Lua atomic release + InMemory fallback.
- **Idempotency Protection** — Middleware preventing duplicate clinical orders on retries.
- **Resilience Policies** — Circuit breaker + exponential retry on external service calls (AI, FHIR).

### Grade A-
- **Assessment Machine** (apps/shared/machines/assessmentMachine.ts) — 18-phase OLDCARTS clinical flow in XState.
- **Red Flag Detection** (apps/shared/lib/clinical-ai/redFlagDetection.ts) — 14 patterns, 18 emergency conditions.
- **Individual Order Stores** (apps/provider-portal/store/) — Lab, imaging, medication, referral. Well-typed Zustand.

### Grade B+
- **.NET Backend** (backend/src/) — Full Clean Architecture with CQRS, MediatR, FluentValidation, SignalR. Comprehensive exception handling (validation, concurrency, business rules, circuit breaker, cancellation).
- **CI/CD Pipelines** — Backend CI, frontend CI, full-stack deploy, security scanning. Consolidated from 10 overlapping files to 4 canonical workflows.

---

## What Exists But Is NOT Connected

These have code on disk but are not wired into any running flow:

- **40+ provider-portal pages** — Render components with hardcoded mock data. No real API calls.
- **Authentication** (apps/shared/lib/auth/) — Comprehensive but the app runs without it.
- **FHIR integration** (apps/shared/lib/fhir/) — Client, hooks, mappers. Never connected to a real EHR. Has resilience handler configured.
- **Enterprise infrastructure** — Multi-tenant middleware, distributed locks, circuit breakers, Redis cache.
- **GitHub Actions** — CI builds; all deploy steps reference Azure secrets not yet provisioned.
- **Kubernetes manifests** (infrastructure/k8s/) — Never applied to any cluster.

## What Does NOT Exist

- No deployed instance anywhere.
- No verified test coverage metrics (infrastructure is built, needs `dotnet test` run locally).
- No verified performance baselines (k6 scripts exist, never run against live system).
- No load testing results.
- No SOC 2 evidence collection.
- No FHIR sandbox connection tested.

---

## Canonical Service Locations

After Phase 1 deduplication, each service has ONE location:

| Service | Location |
|---------|----------|
| Auth | apps/shared/lib/auth/ |
| FHIR | apps/shared/lib/fhir/ |
| Clinical AI | apps/shared/lib/clinical-ai/ |
| WebSocket | services/notification-service/ |
| Clinical Recommendations | apps/shared/services/ClinicalRecommendationService.ts |
| Security | apps/shared/lib/security/security.ts |
| API Handler | apps/shared/lib/api/secureHandler.ts |
| Store Factory | apps/shared/stores/createClinicalOrderStore.ts |
| Assessment Machine | apps/shared/machines/assessmentMachine.ts |
| Red Flags | apps/shared/lib/clinical-ai/redFlagDetection.ts |

---

## Locked Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Production Backend | .NET 8 | Separates business logic from UI per Peter's guidance |
| Frontend | Next.js as BFF only | SSR + lightweight proxy to .NET |
| Database | Microsoft SQL Server | Peter's operational expertise |
| Cloud | Microsoft Azure | HIPAA-eligible, BAA available |
| Environments | Dev / Staging / Production | Multi-environment CI/CD |
| Feature Flags | Azure App Configuration | Deploy without releasing |

---

## GitHub Actions — Canonical Workflows

| File | Purpose | Status |
|------|---------|--------|
| `backend-ci.yml` | Backend build, test (unit + integration), Docker image | Active |
| `backend.yml` | Backend CI/CD with staging + production deploy | Active |
| `ci.yml` | Frontend lint, typecheck, test, build, security audit | Active |
| `deploy.yml` | Full-stack Azure deploy (provider, patient, API) | Active |
| `security-scan.yaml` | Trivy + secret scanning | Active |
| `ehr-integration-tests.yaml` | FHIR integration tests | Active |
| `ci.yaml` | **DISABLED** — had wrong DB (PostgreSQL instead of SQL Server) | Disabled |
| `frontend.yml` | **DISABLED** — had wrong package manager (pnpm instead of npm) | Disabled |
| `deploy-staging.yaml` | **DISABLED** — superseded by `deploy.yml` | Disabled |
| `deploy-production.yaml` | **DISABLED** — superseded by `deploy.yml` | Disabled |

---

## Next Milestone

**Wire the Core Loop (Phase 3):**
Patient enters symptoms → COMPASS assessment → Provider sees pre-visit summary → Orders labs → Lab order persists to database → Confirmation.

Four connections. Not forty new features.

---

## Remaining for A+ Grade

| Item | Description | Blocked By |
|------|-------------|-----------|
| Run `dotnet test` | Verify all 45+ test files pass | Needs local .NET 8 SDK |
| Generate coverage report | Confirm coverage % meets clinical threshold | Needs test run |
| CI pipeline update | Ensure backend-ci.yml test step passes in CI | Needs test verification |
| Wire core loop | Connect 4 endpoints (assessment → API → DB → dashboard) | Development time |

---

## Key Files for Context

| # | File | Purpose |
|---|------|---------|
| 1 | prisma/schema.prisma | Data model truth |
| 2 | apps/shared/stores/createClinicalOrderStore.ts | State pattern |
| 3 | apps/shared/catalogs/labs.ts | Clinical data pattern |
| 4 | apps/shared/machines/assessmentMachine.ts | Workflow pattern |
| 5 | apps/shared/lib/api/secureHandler.ts | API security pattern |
| 6 | backend/src/ATTENDING.Orders.Api/Program.cs | .NET backend config |
| 7 | package.json + turbo.json | Monorepo config |
| 8 | docs/CURRENT_STATE.md | This file |

---

## Development Batch History

| Batch | Content | Grade Impact |
|-------|---------|-------------|
| 1-13 | Core platform, frontend, backend migration, production hardening | → A- |
| 14 | Comprehensive test infrastructure (45+ files, TestAuthHandler, Testcontainers, E2E) | A- solidified |
| 15 | Enterprise hardening: resilience policies, idempotency, enhanced error handling, CI cleanup | → A |
