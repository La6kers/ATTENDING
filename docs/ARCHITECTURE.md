# ATTENDING AI — Architecture

**Last Updated:** February 22, 2026

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                      │
│  ┌──────────────────────┐    ┌──────────────────────┐               │
│  │   Provider Portal     │    │   Patient Portal      │               │
│  │   (Next.js SSR)       │    │   (COMPASS Assessment) │               │
│  │   Port 3000           │    │   Port 3001            │               │
│  └──────────┬───────────┘    └──────────┬────────────┘               │
└─────────────┼───────────────────────────┼───────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BFF LAYER (Next.js API Routes)                    │
│  Auth (NextAuth) → Session validation → Proxy to .NET backend       │
│  No business logic — validation, rules, persistence in .NET         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 PRODUCTION BACKEND (.NET 8)                          │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────┐      │
│  │ API Layer    │  │ Application     │  │ Domain             │      │
│  │ Controllers  │  │ CQRS Commands   │  │ Entities           │      │
│  │ Middleware   │  │ Queries         │  │ Value Objects      │      │
│  │ SignalR Hub  │  │ Validators      │  │ Domain Services    │      │
│  │ Swagger      │  │ Pipeline        │  │ (Drug Interactions │      │
│  └──────┬──────┘  └────────┬────────┘  │  Red Flags, etc.)  │      │
│         │                  │           └────────────────────┘      │
│         ▼                  ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ Infrastructure Layer                                     │       │
│  │ Entity Framework Core → MS SQL Server                    │       │
│  │ FHIR Client → Epic/Oracle/Meditech                       │       │
│  │ Serilog → Application Insights                           │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐         │
│  │ MS SQL Server │  │ Redis Cache   │  │ Azure Key Vault  │         │
│  │ (Azure SQL)   │  │ (Rate limits, │  │ (Secrets)        │         │
│  │ 30+ tables    │  │  sessions)    │  │                  │         │
│  └──────────────┘  └───────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
ATTENDING/
├── apps/
│   ├── provider-portal/          # ATTENDING — provider interface
│   │   ├── pages/                # Next.js pages + API routes (BFF)
│   │   ├── components/           # Provider UI components
│   │   └── store/                # Zustand stores (lab, imaging, med, referral)
│   ├── patient-portal/           # COMPASS — patient assessment
│   │   ├── pages/                # Assessment flow pages
│   │   └── components/           # Patient UI components
│   └── shared/                   # @attending/shared
│       ├── catalogs/             # Clinical data (labs, imaging, meds, referrals)
│       ├── lib/
│       │   ├── api/              # secureHandler.ts (API security pipeline)
│       │   ├── auth/             # Auth (canonical location)
│       │   ├── clinical-ai/      # Clinical AI (canonical location)
│       │   ├── fhir/             # FHIR client (canonical location)
│       │   ├── security/         # Encryption, CSRF, rate limiting
│       │   └── websocket/        # WebSocket client
│       ├── machines/             # XState assessment machine
│       ├── services/             # ClinicalRecommendationService
│       └── stores/               # createClinicalOrderStore factory
├── backend/                      # .NET 8 Clean Architecture
│   ├── src/
│   │   ├── ATTENDING.Domain/     # Entities, value objects, domain services
│   │   ├── ATTENDING.Application/# CQRS commands, queries, validators
│   │   ├── ATTENDING.Infrastructure/ # EF Core, repos, external clients
│   │   └── ATTENDING.Orders.Api/ # Controllers, middleware, SignalR
│   └── tests/
│       └── ATTENDING.Domain.Tests/
├── prisma/                       # Schema (source of truth for data model)
│   └── schema.prisma
├── packages/                     # Shared npm packages
│   ├── clinical-services/        # Red flag detection, drug interactions
│   ├── clinical-types/           # TypeScript types for clinical domain
│   └── ui-primitives/            # Shared UI components
├── services/
│   ├── notification-service/     # WebSocket server (canonical)
│   └── cds-hooks/                # CDS Hooks service
├── infrastructure/               # Docker, K8s, Terraform, load testing
├── tests/                        # Integration + E2E tests
├── archive/                      # Archived dead code (preserved in git)
└── docs/                         # 5 living documents only
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js | 14 |
| UI Library | React | 18 |
| Language (Frontend) | TypeScript | 5.3.3 |
| Styling | Tailwind CSS | 3.x |
| State Management | Zustand + Immer | Latest |
| State Machines | XState | 5.x |
| Backend Framework | ASP.NET Core | 8.0 |
| Backend ORM | Entity Framework Core | 8.x |
| Frontend ORM (Prisma) | Prisma | 5.x (sqlserver provider) |
| Database | Microsoft SQL Server | 2022 (Docker dev / Azure SQL prod) |
| Auth Provider | Azure AD B2C | — |
| Auth Library | NextAuth.js | 4.x |
| Real-time (.NET) | SignalR | — |
| Real-time (Node) | Socket.io | — |
| Logging | Serilog + Application Insights | — |
| CI/CD | GitHub Actions | — |
| Cloud | Microsoft Azure | — |
| Containerization | Docker | — |
| Monorepo | Turborepo + npm workspaces | — |

---

## Key Design Patterns

**Store Factory:** `createClinicalOrderStore.ts` generates typed Zustand stores for any clinical order type (lab, imaging, medication, referral) from a configuration object. Reduced 2,400 lines across 4 stores to ~400 lines.

**Secure API Handler:** 9-layer middleware pipeline applied to every API route: method validation → rate limiting → authentication → RBAC → CSRF → input sanitization → Zod validation → audit logging → PHI masking.

**Service Registry:** Plugin architecture with tier-gating (free/pro/enterprise), dependency resolution, health monitoring, and metrics tracking.

**Domain-Driven Design (.NET):** Entities with private setters and static factory methods (Patient.Create(), Encounter.Start()). Domain services for cross-entity logic (drug interactions, red flag evaluation).

**CQRS (.NET):** Commands (state changes) and Queries (reads) separated with MediatR-style pipeline behaviors for logging, validation, and error handling.
