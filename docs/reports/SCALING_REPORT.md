# ATTENDING AI — Scaling & Cost-Effectiveness Report

**Date:** 2026-03-24
**Context:** Pre-production with simulated data. No real patient data. Goal: plug-and-play clinic onboarding, cost-effective scaling, no future architectural band-aids.

---

## The Honest Assessment

The foundational architecture is strong — shared-database multi-tenancy, tiered clinical intelligence, config-driven FHIR integration, dual ORM with BFF proxy, usage-based billing stubs. These are the right patterns for scaling to hundreds of clinics.

**However, there are 7 things that are broken right now** that would force expensive patches later if not fixed before the first real clinic. The good news: all 7 are fixable with the current architecture — no rewrites needed.

---

## What's Broken (Fix Before First Clinic)

### 1. Onboarding Doesn't Actually Create Tenants

**File:** `apps/provider-portal/pages/api/admin/onboarding.ts`

The onboarding endpoint generates an `organizationId` but **never creates an Organization record**. Line 124 says `// pending Organization model` — but the model exists in the schema. Users created during onboarding aren't linked to an org. Feature flags are written to audit logs instead of the feature flag system. Clinical protocols are activated globally (no org filter).

The second endpoint (`pages/api/admin/onboard-tenant.ts`) imports from `scripts/onboard-tenant` which doesn't exist — it crashes on import.

**Impact:** No clinic can actually be onboarded. Everything runs as a single implicit tenant.

### 2. Tenant Middleware Uses PostgreSQL Syntax on SQL Server

**File:** `apps/shared/lib/database/tenantMiddleware.ts` (lines 42, 64)

```sql
SET app.current_org_id = '...'   -- PostgreSQL only
RESET app.current_org_id         -- PostgreSQL only
```

This will throw a runtime error on SQL Server. There is no database-level RLS — all isolation is application-level Prisma middleware. And there are **two competing middleware systems** (`tenantMiddleware.ts` and `multiTenant.ts`) that aren't coordinated.

### 3. Nine Clinical Models Missing `organizationId`

These models have no `organizationId` column and can't be tenant-filtered directly:

| Missing `organizationId` | Relies on |
|---|---|
| Allergy, Condition, Medication, VitalSign | Patient FK join |
| LabResult, ImagingResult | Order FK join |
| EmergencyEvent, ClinicalImage, PatientPopulationFlag | Patient FK join |

The multi-tenant middleware in `multiTenant.ts` lists some of these as "tenant-scoped" but injects `organizationId` into queries — **which will fail because the column doesn't exist**. This works in dev (strict mode off) but breaks in production (strict mode on).

**This is trivial to fix now with zero data. It's a painful migration with millions of rows later.**

### 4. Feature Flags Reference a Non-Existent Column

**File:** `apps/shared/lib/featureFlags.ts` (line 69)

```typescript
select: { featureFlags: true, tier: true }
```

The Organization model has `settings` and `tier` but no `featureFlags` column. This query fails at runtime. The three-tier lookup (Redis → DB → defaults) is well-designed but the DB layer is broken.

### 5. Billing Metering Has No Database Table

**File:** `apps/shared/lib/billing.ts` (line 323)

The billing meter buffers usage events in memory, flushes to Redis counters, then tries to persist to `prisma.usageRecord` — but `UsageRecord` doesn't exist in the schema. The optional chaining (`prisma.usageRecord?.upsert`) silently swallows the failure. Usage data lives only in RAM and Redis (volatile).

### 6. Seed Data Doesn't Exercise Multi-Tenancy

**File:** `prisma/seed.ts`

Demo data is created without `organizationId` on Users and without creating an Organization first. The demo never actually exercises the multi-tenant code path, which means these bugs stay hidden until the first real clinic.

### 7. CI Schema Drift Check Not Implemented

The dual ORM strategy doc (`docs/DUAL_ORM_STRATEGY.md`) describes a CI gate: `prisma db pull && git diff --exit-code`. This doesn't exist yet. When someone adds a column via EF Core and forgets `prisma db pull`, the Prisma client silently lacks the column until a query hits it at runtime.

---

## What's Over-Built (Costing Money for Zero Value Today)

### Current Pre-Production Cost: ~$1,300-1,500/mo (if using prod SKUs)

The Terraform config has non-prod conditionals that **already solve this** — just deploy with `environment = "dev"`:

| Resource | Prod SKU | Non-Prod SKU | Savings |
|---|---|---|---|
| Azure Front Door | Premium + WAF ($335) | Standard ($35) | $300/mo |
| Redis | Premium P1 6GB ($260) | Basic C0 250MB ($25) | $235/mo |
| App Service (frontend) | P2v3 4-core ($300) | B2 ($55) | $245/mo |
| App Service (backend) | P1v3 2-core ($150) | B1 ($30) | $120/mo |
| Azure SQL | S3 100DTU zone-redundant ($150) | S1 20DTU ($30) | $120/mo |
| **Total** | **~$1,325** | **~$250** | **~$1,075/mo** |

### Zero-Value Items at Demo Stage

- **Zone redundancy + read replicas** on SQL — no benefit with simulated data
- **6-year audit log immutability** — HIPAA requirement for real PHI only
- **Premium Redis with private endpoints** — code already falls back to in-memory mock
- **K8s manifests** (`infrastructure/k8s/`) — no AKS cluster exists in Terraform; dead config
- **365-day Log Analytics retention** — 30 days is sufficient for synthetic data

### AI Inference Cost: $0 Today (By Design)

All clinical decision support runs locally:
- `BioMistralClient.ts`: "In production, this would call the BioMistral API"
- `differentialDiagnosis.ts`: Default provider is `'local'`
- `AIProviderFactory.ts`: OpenAI/Anthropic/Azure stubs exist but are unused

The cache strategy is already built (24h TTL for differentials, 7-day for drug interactions, 60-70% projected hit rate). When AI is enabled, estimated cost at 100 clinics: **~$360-480/mo** after caching.

---

## Scaling Trajectory: What Happens at Each Stage

### Demo → First Clinic

**Must fix:** Items 1-7 above. The architecture is right but the wiring is incomplete.

**Cost:** ~$250/mo (non-prod SKUs)

### 1-10 Clinics

**Infrastructure:** Same resources absorb the load. Azure SQL S1 (20 DTU) handles 10 clinics during business hours easily.

**New needs:**
- Enable AI inference (the `AIProviderFactory` abstraction is ready)
- Wire per-tenant SSO (infrastructure in `ssoProviders.ts` is built, just not connected to NextAuth)
- FHIR client secrets must move to Key Vault (currently stored as JSON in database)
- FHIR token persistence (tokens are in-memory; server restart breaks sessions)

**Cost:** ~$300-400/mo (still non-prod SKUs, add AI inference)

### 10-100 Clinics

**Infrastructure upgrades:**
- SQL: S1 → S3 or Serverless Gen5 (auto-pause saves 67% on off-hours)
- Redis: Basic → Standard C1 (persistence needed)
- App Service: B2 → P1v3 (for WebSocket connection capacity)
- Consider Azure Container Apps (consumption) for pay-per-request pricing

**New needs:**
- Replace Redis `KEYS` with `SCAN` in cache invalidation and billing (6 call sites — production blocker)
- WebSocket connections are the first hard boundary (~5,000 per App Service instance). Plan for Azure Web PubSub as alternative.
- Connection pool tuning (currently Prisma defaults: pool 5-20)

**Cost:** ~$800-1,200/mo

### 100+ Clinics

**When to consider:**
- Azure SQL Elastic Pool or Serverless Gen5 for noisy-neighbor isolation
- AKS deployment (K8s manifests are well-structured with security contexts, anti-affinity, topology spread)
- Dedicated WebSocket infrastructure (Azure Web PubSub ~$1/million messages)
- Database partitioning for AuditLog table (grows fastest)

**Cost:** ~$2,500-3,500/mo

---

## Architecture Decisions That Scale Well (Keep These)

1. **Shared database / shared schema** — Cost-effective up to hundreds of tenants. No per-clinic database overhead.

2. **Tiered clinical intelligence** — Tier 0 runs locally with zero network/cost. AI is optional enhancement, not a gate. Rural clinics with poor connectivity still get full decision support.

3. **Config-driven integration registry** — `IntegrationRegistry` stores per-org FHIR config, supports Epic/Cerner/generic without code changes.

4. **BFF proxy with Prisma fallback** — Graceful degradation during .NET backend rolling updates. The `X-Data-Source` header provides observability.

5. **186 well-designed database indexes** — Composite indexes match actual query patterns. Cost of adding these retroactively at scale would be significant.

6. **Cache-first AI strategy** — Synonym normalization, 24h TTL, category-based caching. More clinics = better cache hit rate (same symptoms recur).

7. **Usage-based billing metering** — The `BillingMeter` design with 16 event types and per-event pricing is the right model. Just needs a database table.

---

## What to Simplify Now

### Remove
- `apps/shared/lib/api/secureHandler.ts` — superseded by `handler.ts` (it says so in its own comments)
- `services/notification-service/` — zero imports anywhere; replaced by WebSocket infrastructure
- 14 phantom service exports in `apps/shared/services/index.ts` pointing to nonexistent directories
- K8s manifests → move to `future/` or document as aspirational
- `apps/provider-portal/pages/api/admin/onboard-tenant.ts` — broken import, replace with fixed onboarding

### Consolidate
- Two tenant middleware systems → one (`multiTenant.ts` is more complete; remove `tenantMiddleware.ts`)
- Three API handler patterns → one (`createHandler` from `handler.ts`)
- Duplicate API routes: 2× CSRF token, 2× differential diagnosis
- Overlapping pages: `ambient.tsx`/`ambient-scribe.tsx`, `clinical.tsx`/`clinical-dashboard.tsx`/`clinical-hub.tsx`

---

## Priority Roadmap

### Phase 1: Fix the Foundation (Before Any Demo to Investors/Clinics)

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Fix onboarding endpoint to create Organization + link users | 1 day | Unblocks everything |
| 2 | Add `organizationId` to 9 clinical models + migration | 1 day | Tenant isolation actually works |
| 3 | Remove PostgreSQL syntax from `tenantMiddleware.ts`, consolidate with `multiTenant.ts` | 1 day | No runtime crashes on SQL Server |
| 4 | Fix seed data to create Organization and use `organizationId` | 2 hours | Demo exercises real multi-tenancy |
| 5 | Add `featureFlags` column to Organization (or use `settings`) | 2 hours | Feature gating works |
| 6 | Add `UsageRecord` model to schema | 2 hours | Billing data persists |
| 7 | Deploy with `environment = "dev"` in Terraform | 30 min | Save ~$1,075/mo |

**Total effort: ~3-4 days. Savings: ~$1,075/mo + working multi-tenancy.**

### Phase 2: Production-Ready (Before First Real Clinic)

| # | Task | Effort |
|---|---|---|
| 8 | Implement CI schema drift check (`prisma db pull && git diff`) | 2 hours |
| 9 | Migrate patient API routes to `createHandler` (auth + validation + audit) | 2 days |
| 10 | Move FHIR client secrets to Key Vault | 1 day |
| 11 | Add FHIR token persistence (Redis or DB) | 1 day |
| 12 | Write tenant isolation integration tests | 1 day |
| 13 | Replace Redis `KEYS` with `SCAN` (6 call sites) | 1 day |
| 14 | Add `requireAuth()` to backend proxy + clinical endpoints | 2 hours |

### Phase 3: Scale-Ready (Before 10+ Clinics)

| # | Task | Effort |
|---|---|---|
| 15 | Wire per-tenant SSO to NextAuth (infrastructure already built) | 2 days |
| 16 | Enable AI inference with Azure OpenAI | 1 day |
| 17 | Add `next/dynamic` to heavy pages + `React.memo` to list components | 2 days |
| 18 | Evaluate Azure SQL Serverless vs fixed DTU | 1 day |
| 19 | Run k6 baseline and record in `PERFORMANCE_BASELINE.md` | 1 day |

---

## Bottom Line

The architecture scales. The wiring doesn't — yet. Seven specific items need fixing, all achievable in ~4 days of focused work. The infrastructure is over-provisioned by ~$1,075/mo for the demo stage, solvable by changing one Terraform variable. The path from 1 clinic to 100 clinics requires no architectural changes — just SKU upgrades and the Phase 2/3 items above.

The single most important thing to do right now: **fix the onboarding endpoint and add `organizationId` to the 9 clinical models**. Everything else depends on multi-tenancy actually working.
