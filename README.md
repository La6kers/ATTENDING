# ATTENDING AI Medical Platform

[![CI](https://github.com/La6kers/ATTENDING/actions/workflows/ci.yml/badge.svg)](https://github.com/La6kers/ATTENDING/actions/workflows/ci.yml)
[![Backend CI](https://github.com/La6kers/ATTENDING/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/La6kers/ATTENDING/actions/workflows/backend-ci.yml)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)

> AI-powered clinical decision support platform combining physician-designed workflows (ATTENDING AI) with structured patient symptom assessment (COMPASS). Built for rural healthcare settings where provider shortages make every clinical decision count.

---

## Quick Start (Local Development)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — SQL Server + Redis
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- [Node.js 20+](https://nodejs.org/)
- [k6](https://k6.io/docs/get-started/installation/) — smoke tests (optional locally)

### 1. Clone and install

```bash
git clone https://github.com/La6kers/ATTENDING.git
cd ATTENDING
npm install
```

### 2. Configure environment

```bash
cp env.development.example .env
# Edit .env — set MSSQL_SA_PASSWORD and NEXTAUTH_SECRET
```

See `env.development.example` for all required variables including EHR/FHIR configuration.

### 3. Start the data layer

```bash
npm run db:up
# Starts SQL Server 2022 and Redis via Docker Compose
# Wait for health checks to pass (~30 seconds on first run)
```

### 4. Run database migrations

```bash
# EF Core migrations (.NET backend)
cd backend
dotnet ef database update --project src/ATTENDING.Infrastructure --startup-project src/ATTENDING.Orders.Api
cd ..

# Prisma schema push (Next.js portals)
npm run db:push
npm run db:seed
```

### 5. Start all services

```bash
npm run dev:full
```

| Service            | URL                      |
|--------------------|--------------------------|
| Provider Portal    | http://localhost:3000    |
| Patient Portal     | http://localhost:3001    |
| .NET Backend API   | http://localhost:5080    |
| Seq (structured logs) | http://localhost:5341 |
| Jaeger (traces)    | http://localhost:16686   |

> **Note:** Seq and Jaeger require `docker compose --profile observability up` to start.

---

## Architecture

```
ATTENDING/
├── apps/
│   ├── provider-portal/     # Next.js 14 — ATTENDING provider dashboard (Port 3000)
│   │   ├── pages/           # Dashboard, Labs, Imaging, Meds, Referrals, Previsit
│   │   ├── components/      # React UI components
│   │   ├── store/           # Zustand stores (lab, imaging, med, referral)
│   │   ├── lib/api/         # BFF proxy, auth, SignalR notification context
│   │   └── pages/api/       # Next.js API routes (BFF to .NET backend)
│   │
│   ├── patient-portal/      # Next.js 14 — COMPASS patient assessment (Port 3001)
│   │   ├── pages/           # Assessment flow, symptom chat
│   │   └── pages/api/       # Assessment submission endpoint
│   │
│   └── shared/              # @attending/shared — shared across portals
│       ├── lib/fhir/        # FHIR R4 client (Epic / Oracle Health / generic)
│       ├── lib/api/         # secureHandler, backendProxy
│       ├── lib/auth/        # Auth utilities
│       ├── machines/        # XState 18-phase OLDCARTS assessment machine
│       └── catalogs/        # Clinical data (labs, imaging, meds, referrals)
│
├── backend/                 # .NET 8 — Clean Architecture
│   ├── src/
│   │   ├── ATTENDING.Domain/        # Entities, value objects, domain services
│   │   │                            # VitalSigns, RedFlagEvaluator, GuidelineEvaluator
│   │   ├── ATTENDING.Application/   # CQRS commands/queries, validators, interfaces
│   │   │                            # TieredClinicalIntelligenceService
│   │   ├── ATTENDING.Infrastructure/# EF Core, repositories, FHIR clients, AI
│   │   └── ATTENDING.Orders.Api/    # Controllers, SignalR hub, middleware
│   └── tests/
│       ├── ATTENDING.Domain.Tests/
│       └── ATTENDING.Integration.Tests/
│
├── prisma/
│   └── schema.prisma        # Prisma schema — synced from EF Core via db pull
│                            # Used as query client only; EF Core owns migrations
│
├── packages/
│   ├── clinical-services/   # Red flag detection, drug interaction checking (TypeScript)
│   ├── clinical-types/      # Shared TypeScript types for clinical domain
│   └── ui-primitives/       # Shared UI components
│
├── services/
│   └── cds-hooks/           # CDS Hooks service (planned)
│
├── infrastructure/
│   ├── load-testing/        # k6 smoke and load test scripts
│   ├── nginx/               # Reverse proxy config (production profile)
│   └── terraform/           # Azure infrastructure as code
│
├── tests/                   # Integration + E2E tests (Playwright, Vitest)
└── docs/                    # Architecture, clinical safety, operations runbook
```

---

## Tech Stack

| Layer               | Technology                          | Version |
|---------------------|-------------------------------------|---------|
| Frontend Framework  | Next.js                             | 14      |
| UI Library          | React                               | 18      |
| Language (Frontend) | TypeScript                          | 5.3     |
| Styling             | Tailwind CSS                        | 3.x     |
| State Management    | Zustand + Immer                     | Latest  |
| State Machines      | XState                              | 5.x     |
| Backend Framework   | ASP.NET Core                        | 8.0     |
| Backend ORM         | Entity Framework Core               | 8.x     |
| Frontend ORM        | Prisma (query client — no migrations) | 5.x   |
| **Database**        | **Microsoft SQL Server 2022**       | —       |
| Authentication      | Azure AD B2C + NextAuth.js          | 4.x     |
| **Real-time**       | **ASP.NET Core SignalR**            | —       |
| Logging             | Serilog → Application Insights      | —       |
| Tracing             | OpenTelemetry → Application Insights | —      |
| CI/CD               | GitHub Actions                      | —       |
| Cloud               | Microsoft Azure                     | —       |
| Containerization    | Docker                              | —       |
| Monorepo            | Turborepo + npm workspaces          | 2.x     |

> **Database:** SQL Server 2022 in all environments — Docker locally, Azure SQL in production.
> There is no SQLite or PostgreSQL configuration. Do not add either.

> **Real-time:** All real-time notifications flow through ASP.NET Core SignalR exclusively.
> The `services/notification-service` Socket.io server is being retired.

---

## Key Commands

| Command                  | Description                                          |
|--------------------------|------------------------------------------------------|
| `npm run dev:full`        | Start SQL Server + Redis + .NET API + both portals  |
| `npm run db:up`           | Start SQL Server 2022 + Redis (Docker)              |
| `npm run db:down`         | Stop Docker services                                |
| `npm run dev:backend`     | Start .NET 8 API only (port 5080)                   |
| `npm run dev:provider`    | Start provider portal only (port 3000)              |
| `npm run dev:patient`     | Start patient portal only (port 3001)               |
| `npm run db:push`         | Push Prisma schema to database                      |
| `npm run db:seed`         | Seed development data                               |
| `npm run db:studio`       | Open Prisma Studio                                  |
| `npm run test:run`        | Run all frontend tests (Vitest)                     |
| `npm run test:backend`    | Run .NET tests (excludes Docker-only)               |
| `npm run test:e2e`        | Run Playwright E2E tests                            |
| `npm run lint`            | Lint all workspaces                                 |
| `npm run typecheck`       | TypeScript type check                               |

---

## Clinical Intelligence Architecture

ATTENDING AI uses a tiered clinical intelligence pipeline:

**Tier 0 — Pure Domain (always runs, zero network, <1ms)**
- `GuidelineEvaluator` — Evidence-based clinical decision rules (Wells PE, HEART Score, CURB-65, Ottawa Rules, qSOFA, Modified Geneva)
- `RedFlagEvaluator` — 14-category emergency pattern detection
- `DrugInteractionService` — Critical drug interaction checking
- `VitalSigns` value object — MAP, Shock Index, SIRS criteria, physiological validation

**Tier 1 — Clinical Context Assembly**
- `ClinicalContextAssembler` — Gathers structured context from database (labs, meds, conditions, vitals)
- `DiagnosticReasoningService` — Bayesian post-test probability updates

**Tier 2 — Cloud AI (optional — enhances but never gates Tier 0)**
- Clinical AI prompt generation from structured context
- When unavailable, Tier 0 results are returned independently

> Tier 0 runs on any hardware, with or without internet. A rural clinic with no connectivity still receives full clinical decision support.

---

## FHIR / EHR Integration

Supported EHR systems via SMART on FHIR R4:

- **Epic** (MyChart / App Orchard) — via SMART on FHIR
- **Oracle Health / Cerner** — via SMART on FHIR
- **Generic FHIR R4** — any endpoint with `.well-known/smart-configuration`

EHR data enriches the provider view (medications, allergies, vitals, problem list) but is not required. Assessment data is always the fallback. See `docs/PROVIDER_SETUP.md` for EHR sandbox configuration.

---

## Security & HIPAA Compliance

- **Authentication:** Azure AD B2C (production), NextAuth.js session management
- **Multi-tenancy:** EF Core global query filters enforce OrganizationId isolation at every query
- **PHI logging:** Serilog `PhiMaskingDestructuringPolicy` prevents patient names, MRNs, and DOBs from appearing in any log output
- **Audit trail:** Every PHI access and state-changing operation writes to `AuditLog` (userId, action, entityType, entityId, patientId, IP, userAgent, timestamp)
- **Soft delete:** All PHI-containing entities use soft delete — hard deletes are prohibited (HIPAA 164.530(j), 6-year retention)
- **Encryption:** TLS in transit; TDE at rest via Azure SQL
- **Security headers:** OWASP headers applied via `SecurityHeadersMiddleware` (HSTS, CSP, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy)
- **Secrets:** Azure Key Vault in production — no secrets in environment files

---

## Development Data

After `npm run db:seed`:

| Patient          | Chief Complaint              | Urgency         |
|------------------|------------------------------|-----------------|
| Maria Garcia     | Thunderclap headache         | 🔴 EMERGENCY    |
| Robert Chen      | Exertional chest pain        | 🟠 HIGH         |
| James Wilson     | Pleuritic chest pain         | 🟠 HIGH         |
| Jennifer Williams| RLQ abdominal pain           | 🟡 MODERATE     |
| Michael Brown    | Chronic cough                | 🟢 STANDARD     |
| Emily Davis      | Anxiety/insomnia             | 🟢 STANDARD     |

---

## Documentation

| Document                          | Purpose                                           |
|-----------------------------------|---------------------------------------------------|
| `docs/ARCHITECTURE.md`            | System architecture and design patterns           |
| `docs/CLINICAL_SAFETY.md`         | Red flag rules, drug interactions, safety tests   |
| `docs/PROVIDER_SETUP.md`          | EHR sandbox setup (Epic, Oracle Health)           |
| `docs/OPERATIONS_RUNBOOK.md`      | Production runbook, incident response             |
| `docs/STAGING_SETUP.md`           | Staging environment configuration                 |
| `docs/PERFORMANCE_BASELINE.md`    | SLA targets and load test baselines               |
| `docs/API_REFERENCE.md`           | .NET API endpoint reference                       |

---

## Team

- **Scott Isbell, MD** — Founder & CEO, Clinical Lead
- **Bill LaPierre** — Advisor
- **Herbie** — Advisor

---

## License

Proprietary — All Rights Reserved © 2026 ATTENDING AI
