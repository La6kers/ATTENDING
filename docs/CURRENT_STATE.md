# ATTENDING AI — Current State

**Last Updated:** February 21, 2026
**Branch:** mockup-2
**Tag:** v0.9-pre-restructure

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
| Production Backend | .NET 8 / Clean Architecture | Built, not connected |
| Database | PostgreSQL via Prisma (migrating to MS SQL) | Schema complete |
| Auth | Azure AD B2C + NextAuth | Scaffolded, not enforced |
| Real-time | Socket.io / SignalR | Scaffolded, not connected |
| CI/CD | GitHub Actions (8 workflows) | Builds only, no deploy |

---

## What Is Real and Production-Quality

These components have been reviewed, are well-typed, and represent genuine value:

- **Prisma Schema** (prisma/schema.prisma) — 30+ models, soft-delete, HIPAA annotations, proper indexes. Grade: A.
- **Clinical Catalogs** (apps/shared/catalogs/) — Labs, imaging, medications, referrals with CPT/LOINC codes. Core IP. Grade: A.
- **Store Factory** (apps/shared/stores/createClinicalOrderStore.ts) — Clean Zustand+Immer pattern. 83% reduction from individual stores. Grade: A.
- **Secure API Handler** (apps/shared/lib/api/secureHandler.ts) — 9-layer pipeline: method validation, rate limiting, auth, RBAC, CSRF, input sanitization, Zod validation, audit logging, PHI masking. Grade: A.
- **Security Module** (apps/shared/lib/security/security.ts) — AES-256-GCM encryption, PBKDF2 hashing, timing-safe CSRF, SQL injection detection tuned for clinical text. Grade: A.
- **Assessment Machine** (apps/shared/machines/assessmentMachine.ts) — 18-phase OLDCARTS clinical flow in XState. Grade: A−.
- **Red Flag Detection** (apps/shared/lib/clinical-ai/redFlagDetection.ts) — 14 patterns, 18 emergency conditions. Grade: A−.
- **C# Backend** (backend/src/ATTENDING.Orders.Api/) — Clean Architecture with domain, application, infrastructure layers. Serilog, SignalR, health checks. Grade: B+.
- **Individual Order Stores** (apps/provider-portal/store/) — Lab, imaging, medication, referral. Well-typed Zustand. Grade: A−.

## What Exists But Is NOT Connected

These have code on disk but are not wired into any running flow:

- **40+ provider-portal pages** — Render components with hardcoded mock data. No real API calls.
- **Authentication** (apps/shared/lib/auth/) — Comprehensive but the app runs without it.
- **FHIR integration** (apps/shared/lib/fhir/) — Client, hooks, mappers. Never connected to a real EHR.
- **Enterprise infrastructure** — Multi-tenant middleware, distributed locks, circuit breakers, Redis cache.
- **GitHub Actions** — CI builds but all deploy steps are commented out. No environments configured.
- **Kubernetes manifests** (infrastructure/k8s/) — Never applied to any cluster.

## What Does NOT Exist (Despite Claims in Previous Docs)

- No deployed instance anywhere.
- No verified test coverage (claimed 85%, actual ~15-25%).
- No verified performance metrics (claimed 1.2s page load, 45ms API p95 — never measured).
- No load testing results.
- No SOC 2 evidence collection.
- No FHIR sandbox connection tested.

---

## Canonical Service Locations

After Phase 1 deduplication, each service has ONE location:

| Service | Location | Previous Duplicates (archived) |
|---------|----------|-------------------------------|
| Auth | apps/shared/lib/auth/ | apps/shared/auth/, services/auth/, provider-portal/lib/auth/ |
| FHIR | apps/shared/lib/fhir/ | provider-portal/lib/fhir/ |
| Clinical AI | apps/shared/lib/clinical-ai/ | shared/services/clinical-ai/, provider-portal/services/biomistral/ |
| WebSocket | services/notification-service/ | services/websocket/ |
| Clinical Recommendations | apps/shared/services/ClinicalRecommendationService.ts | ClinicalAIService.ts |

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

## Next Milestone

**Wire the Core Loop (Phase 3):**
Patient enters symptoms → COMPASS assessment → Provider sees pre-visit summary → Orders labs → Lab order persists to database → Confirmation.

Four connections. Not forty new features.

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
