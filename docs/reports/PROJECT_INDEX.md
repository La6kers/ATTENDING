# Project Index: ATTENDING AI Medical Platform

Generated: 2026-03-24

> AI-powered clinical decision support platform combining physician-designed workflows (ATTENDING AI) with structured patient symptom assessment (COMPASS). Built for rural healthcare where provider shortages make every clinical decision count.

## Project Structure

```
ATTENDING/
├── apps/
│   ├── provider-portal/       # Next.js 14 — Provider dashboard (Port 3000)
│   ├── patient-portal/        # Next.js 14 — COMPASS patient assessment (Port 3001)
│   ├── shared/                # @attending/shared — shared lib across portals
│   ├── compass-admin/         # Admin workspace (declared but minimal)
│   └── landing/               # Marketing landing page
│
├── backend/                   # .NET 8 — Clean Architecture
│   └── src/
│       ├── ATTENDING.Domain/          # Entities, value objects, domain services
│       ├── ATTENDING.Application/     # CQRS commands/queries (MediatR)
│       ├── ATTENDING.Infrastructure/  # EF Core, repos, FHIR clients, AI
│       ├── ATTENDING.Orders.Api/      # Controllers, SignalR hub, middleware
│       └── ATTENDING.Contracts/       # Shared DTOs/contracts
│
├── prisma/                    # Prisma schema (query client only; EF Core owns migrations)
│   ├── schema.prisma
│   ├── seed.ts / seed-demo.ts
│   └── migrations/
│
├── services/
│   ├── cds-hooks/             # CDS Hooks service (encounter-start, order-select, patient-view)
│   └── notification-service/  # Socket.io server (RETIRING — migrating to SignalR)
│
├── tests/
│   ├── integration/           # Vitest integration tests
│   ├── e2e/                   # Playwright E2E specs
│   ├── clinical-safety/       # Assessment machine & drug interaction safety tests
│   └── load/                  # k6 load/smoke/spike tests
│
├── infrastructure/
│   ├── terraform/             # Azure IaC (main.tf)
│   ├── k8s/                   # Kubernetes manifests
│   ├── monitoring/            # Grafana dashboard, Prometheus alerts
│   └── load-testing/          # k6 scripts
│
├── scripts/                   # Dev setup, DB migration, secret audit, maintenance
├── docs/                      # Architecture, clinical safety, operations, ADRs
└── archive/                   # Legacy docs and duplicate configs
```

## Entry Points

- **Provider Portal**: `apps/provider-portal/pages/index.tsx` → Dashboard at localhost:3000
- **Patient Portal**: `apps/patient-portal/pages/dashboard.tsx` → COMPASS at localhost:3001
- **Backend API**: `backend/src/ATTENDING.Orders.Api/` → .NET 8 API at localhost:5080
- **CDS Hooks**: `services/cds-hooks/src/index.ts`
- **Dev Setup**: `scripts/dev-setup.js` / `scripts/setup-dev.js`
- **DB Seed**: `prisma/seed.ts`

## Core Modules

### @attending/shared (`apps/shared/`)
Central shared library used by both portals:
- `lib/fhir/` — FHIR R4 client (Epic, Oracle Health, generic)
- `lib/auth/` — Auth utilities, session management, MFA, permissions, SSO
- `lib/api/` — secureHandler, backendProxy, API client, response helpers
- `lib/clinical-ai/` — Red flag detection, BioMistral client, clinical AI hooks
- `lib/ai/` — Differential diagnosis
- `lib/websocket/` — WebSocket client & hooks (SignalR)
- `lib/integrations/` — HL7v2, bulk export, dead letter queue, registry
- `lib/webhooks/` — Webhook delivery, FHIR transforms
- `lib/database/` — Tenant middleware, config
- `lib/redis/` — Redis client, cache service
- `lib/audit/` — Audit middleware, archival
- `lib/security/` — Security utilities
- `lib/validators/` — Clinical validators, vital signs validation
- `machines/assessmentMachine.ts` — XState 18-phase OLDCARTS assessment
- `catalogs/` — Clinical catalogs (labs, imaging, medications, referrals)

### Provider Portal (`apps/provider-portal/`)
**Key Pages** (70 pages):
- Dashboard, Clinical Hub, Command Center, Decision Support
- Labs, Imaging, Medications, Referrals (ordering workflows)
- Encounter/Visit flow, Pre-visit, Patient Assessment
- Ambient Scribe, AI Calibration, Visual AI, Copilot
- Population Health, Predictive Risk, Quality Measures, Outcomes
- Specialty modules: Cardiology, Dermatology, Endocrinology, Gynecology, Infectious Disease, Urology
- Admin, Settings (EHR connection, integrations), Inbox

**Stores** (Zustand):
- `labOrderingStore`, `imagingOrderingStore`, `medicationOrderingStore`, `referralOrderingStore`
- `assessmentQueueStore`, `patientContextStore`, `treatmentPlanStore`
- `patientChatStore`, `providerChatStore`, `useClinicalHub`, `useEncounterStore`

**API Routes** (BFF to .NET backend): `pages/api/` — clinical, FHIR, interventions, admin, labs, imaging, prescriptions, referrals, chat, predictive, quality, treatment-plans, ambient, AI feedback, notifications, backend proxy

### Patient Portal (`apps/patient-portal/`)
- Assessment flow, Health summary, Emergency access, Care resources
- Offline support (IndexedDB), PWA hooks
- Crash detection service, Push notifications
- Camera capture, Voice input

### Backend .NET (`backend/src/`)
Clean Architecture with CQRS (MediatR):
- **Domain**: VitalSigns, RedFlagEvaluator, GuidelineEvaluator (Wells PE, HEART Score, CURB-65, Ottawa Rules, qSOFA, Modified Geneva), DrugInteractionService
- **Application**: TieredClinicalIntelligenceService, DiagnosticReasoningService, ClinicalContextAssembler
- **Infrastructure**: EF Core (SQL Server 2022), FHIR clients, AI integration
- **API**: Controllers, SignalR hub, SecurityHeadersMiddleware, PhiMaskingDestructuringPolicy

### Clinical Intelligence Tiers
- **Tier 0** — Pure domain rules (always runs, <1ms, no network): RedFlagEvaluator, GuidelineEvaluator, DrugInteractionService, VitalSigns
- **Tier 1** — Context assembly: ClinicalContextAssembler, DiagnosticReasoningService
- **Tier 2** — Cloud AI (optional, enhances but never gates Tier 0)

## Configuration

- `package.json` — Root monorepo config (npm workspaces + Turborepo)
- `turbo.json` — Turborepo pipeline (build, dev, test, lint, typecheck)
- `docker-compose.yml` — SQL Server 2022 + Redis (+ observability profile: Seq, Jaeger)
- `prisma/schema.prisma` — Database schema (synced from EF Core)
- `tsconfig.json` / `tsconfig.seed.json` — TypeScript configs
- `vitest.config.ts` / `vitest.integration.config.ts` — Test configs
- `env.development.example` / `env.production.example` — Environment templates
- `infrastructure/terraform/main.tf` — Azure infrastructure
- `infrastructure/k8s/` — Kubernetes manifests (namespace, portals, ingress, websocket)
- `infrastructure/monitoring/` — Grafana dashboard, Prometheus alerts

## Documentation

- `docs/ARCHITECTURE.md` — System architecture and design patterns
- `docs/CLINICAL_SAFETY.md` — Red flag rules, drug interactions, safety tests
- `docs/PROVIDER_SETUP.md` — EHR sandbox setup (Epic, Oracle Health)
- `docs/API_REFERENCE.md` — .NET API endpoint reference
- `docs/OPERATIONS_RUNBOOK.md` — Production runbook, incident response
- `docs/STAGING_SETUP.md` — Staging environment configuration
- `docs/PERFORMANCE_BASELINE.md` — SLA targets and load test baselines
- `docs/DUAL_ORM_STRATEGY.md` — EF Core + Prisma strategy
- `docs/EVENT_DISPATCH_ARCHITECTURE.md` — Event-driven architecture
- `docs/SECRETS_MANAGEMENT.md` — Azure Key Vault integration
- `docs/MIGRATION_STRATEGY.md` — Database migration approach
- `docs/adr/` — Architecture Decision Records (5 ADRs)

## Test Coverage

| Category            | Files |
|---------------------|-------|
| Unit/Integration    | 170   |
| E2E (Playwright)    | 4     |
| Clinical Safety     | 2     |
| Load Tests (k6)     | 10    |
| Backend .NET        | 71    |
| **Total**           | **257** |

## Tech Stack

| Layer              | Technology                      |
|--------------------|---------------------------------|
| Frontend           | Next.js 14, React 18, TypeScript 5.3 |
| Styling            | Tailwind CSS 3.x                |
| State              | Zustand + Immer, XState 5.x     |
| Backend            | ASP.NET Core 8, C#              |
| Backend ORM        | Entity Framework Core 8.x       |
| Frontend ORM       | Prisma 5.x (query only)         |
| Database           | SQL Server 2022 (all envs)      |
| Auth               | Azure AD B2C + NextAuth.js 4.x  |
| Real-time          | ASP.NET Core SignalR             |
| FHIR               | SMART on FHIR R4 (Epic, Oracle Health, generic) |
| Logging            | Serilog → Application Insights  |
| Tracing            | OpenTelemetry → Application Insights |
| CI/CD              | GitHub Actions                   |
| Cloud              | Microsoft Azure                  |
| Containers         | Docker, Kubernetes               |
| Monorepo           | Turborepo 2.x + npm workspaces  |
| Testing            | Vitest, Playwright, k6, xUnit   |

## Key Dependencies

- `@prisma/client` ^5.0.0 — Database query client
- `zod` ^4.3.6 — Runtime schema validation
- `@next/bundle-analyzer` ^16.1.4 — Bundle analysis
- `turbo` ^2.0.0 — Monorepo build system
- `concurrently` ^8.2.0 — Parallel dev server runner
- `vitest` ^4.0.17 — Unit/integration testing
- `@playwright/test` ^1.58.1 — E2E testing

## Quick Start

1. `npm install` — Install all workspace dependencies
2. `cp env.development.example .env` — Configure environment
3. `npm run db:up` — Start SQL Server + Redis via Docker
4. `npm run db:push:dev && npm run db:seed` — Push schema + seed data
5. `npm run dev:full` — Start backend + both portals
6. Provider Portal: http://localhost:3000 | Patient Portal: http://localhost:3001

## Team

- **Scott Isbell, MD** — Founder & CEO, Clinical Lead
- **Bill LaPierre** — Advisor
- **Herbie** — Advisor

## Repository

- GitHub: `github.com/La6kers/ATTENDING`
- License: Proprietary © 2026 ATTENDING AI
