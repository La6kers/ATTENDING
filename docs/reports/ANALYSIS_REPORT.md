# ATTENDING AI Platform — Comprehensive Code Analysis Report

**Date:** 2026-03-24
**Scope:** Full-stack analysis across Security, Architecture/Quality, and Performance

---

## Executive Summary

The ATTENDING platform has strong foundations — clean architecture in the .NET backend, thorough database indexing (186 indexes), well-designed WebSocket reconnection, and comprehensive k6 load test scripts. However, the analysis uncovered **3 critical**, **10 high**, **14 medium**, and **9 low** findings across security, architecture, and performance domains.

**Immediate action required:** The backend proxy route has no authentication (C1), DEMO_MODE can bypass auth in production (C2), and several hard deletes violate HIPAA retention requirements (C3).

---

## CRITICAL Findings (3)

### C1. Backend Proxy Route Has No Authentication
**File:** `apps/provider-portal/pages/api/backend/[...path].ts`
**Domain:** Security

The catch-all BFF proxy forwards requests to the .NET backend without `requireAuth()`. Any unauthenticated request reaches `/api/backend/v1/patients`, `/api/backend/v1/laborders`, etc. Combined with DevBypass on the backend, this is a complete auth bypass.

**Fix:** Wrap handler with `requireAuth()` and `withRateLimit()`.

---

### C2. DEMO_MODE Auth Bypass Not Gated on NODE_ENV
**File:** `apps/provider-portal/lib/api/auth.ts` (lines 52, 65-68)
**Domain:** Security

`DEMO_MODE=true` auto-authenticates as the first PROVIDER user. Unlike the .NET backend (which throws in production), the Next.js frontend has no production guard. A misconfigured env var bypasses all authentication.

**Fix:** Add `if (isDemo && process.env.NODE_ENV === 'production') throw`.

---

### C3. Hard Deletes on PHI Data Violate HIPAA 6-Year Retention
**Domain:** Security / Compliance

Hard `DELETE` operations found in:
- `pages/api/treatment-plans/[id].ts` (line 196) — treatment plans
- `apps/compass-admin/pages/api/webhooks/[id].ts` — webhook deliveries with PHI payloads
- `apps/patient-portal/pages/api/webhooks/[id].ts` — same
- `apps/shared/lib/retention.ts` (line 253) — retention engine `hard_delete` action
- `apps/shared/lib/scheduler.ts` (line 320) — session cleanup
- `apps/shared/lib/audit/archival.ts` (line 149) — audit log deletion after blob upload

**Fix:** Replace all `prisma.*.delete()` on PHI-adjacent data with soft-delete. Retention engine must validate 6-year threshold before hard delete.

---

## HIGH Findings (10)

### H1. Multi-Tenant Isolation Not Enforced in Patient API [Security]
**Files:** `pages/api/patients/index.ts`, `pages/api/patients/[id].ts`

Patient list only filters by `organizationId` if the client sends it as a query parameter. Single-patient GET has no org scope at all — any patient ID from any org is accessible. Uses global `prisma` instead of `getTenantPrisma()`.

**Fix:** All patient/clinical queries must use `session.user.organizationId`.

### H2. Clinical API Routes Lack Authentication [Security]
**Files:** `pages/api/clinical/triage.ts`, `red-flags.ts`, `protocols.ts`, `labs.ts`, `drug-check.ts`

Bare handlers without `requireAuth()`, plus `Access-Control-Allow-Origin: *` on all of them.

**Fix:** Add `requireAuth()`. Replace wildcard CORS with specific origins.

### H3. Wildcard CORS on 7 Endpoints [Security]
**Files:** 7 endpoints in `pages/api/clinical/` and `pages/api/docs.ts`

All set `Access-Control-Allow-Origin: *`, contradicting the .NET backend's restricted origin policy.

### H4. Patient Update Lacks Input Validation [Security]
**File:** `pages/api/patients/[id].ts` (lines 252-269)

PATCH destructures `req.body` directly — no Zod validation. Malformed data goes straight to the PHI database.

### H5. 14 Phantom Service Exports — Build-Breaking Risk [Architecture]
**File:** `apps/shared/services/index.ts` (lines 17-42)

Exports from 14 nonexistent directories (smart-scheduling, peer-consult, patient-engagement, etc.). Any consumer importing these will fail.

### H6. Shared Library Is a Server/Client Monolith [Architecture]
**File:** `apps/shared/`

56 service files mixing server-only code (Prisma, Redis, encryption) with client-only code (React hooks, Zustand stores). All consumers pull the entire dependency surface.

**Fix:** Split into `@attending/types`, `@attending/client-lib`, `@attending/server-lib`.

### H7. 47 Component Directories with Overlapping Domains [Architecture]
**Path:** `apps/provider-portal/components/`

181 files in 47 directories. Four duplicate domain pairs: `imaging/` + `imaging-ordering/`, `labs/` + `lab-ordering/`, `medications/` + `medication-ordering/`, `referrals/` + `referral-ordering/`. Triple overlap: `clinical/`, `clinical-hub/`, `clinical-services/`.

### H8. Patient Data in 3 Overlapping Zustand Stores [Architecture]
**Files:** `store/patientContextStore.ts`, `store/useEncounterStore.ts`, `store/useProviderStore.ts`

Same patient represented with different types, different persistence (localStorage vs sessionStorage), no sync.

### H9. 178 `any` Types in Shared Library [Quality]
**Files:** 43 files, worst: `integrations/transforms.ts` (18), `fhir-sync/FhirPersistenceService.ts` (25)

In a medical platform, untyped FHIR/integration transforms are a patient safety concern.

### H10. Redis KEYS Command Used in Cache Invalidation [Performance]
**Files:** `apps/shared/lib/redis/cacheService.ts` (line 590), `apps/shared/lib/phiCache.ts` (5 call sites)

Redis `KEYS` is O(N) and blocks the entire server. PHI cache uses it on every write (entry limit check), patient discharge, org invalidation, and stats. **Production blocker.**

**Fix:** Replace with `SCAN` or maintain Redis Sets per entity for O(1) invalidation.

---

## MEDIUM Findings (14)

| # | Finding | Domain | Key File |
|---|---------|--------|----------|
| M1 | BFF proxy always returns 200 (flattens 201, 204) | Architecture | `pages/api/backend/[...path].ts` |
| M2 | Dual data path (CQRS vs Prisma fallback) consistency risk | Architecture | `shared/lib/api/backendProxy.ts` |
| M3 | Overlapping pages: `ambient.tsx`/`ambient-scribe.tsx`, `clinical.tsx`/`clinical-dashboard.tsx`/`clinical-hub.tsx`, `treatment-plan.tsx`/`treatment-plans.tsx` | Architecture | `pages/` |
| M4 | ClinicalHub store uses hardcoded mock data, `executeAction` is `console.log` only | Architecture | `store/useClinicalHub.ts` |
| M5 | Zod v3 vs v4 version conflict between root and shared | Quality | `package.json` files |
| M6 | Session accessToken stored in browser sessionStorage (XSS risk) | Security | `shared/lib/auth/sessionManager.ts` |
| M7 | PHI logged in emergency notification service (phone, email in console.log) | Security | `patient-portal/pages/api/emergency/notify.ts` |
| M8 | Webhook signature verification is optional | Security | `pages/api/integrations/webhook.ts` |
| M9 | SQL injection risk in tenant middleware (raw SQL + wrong dialect) | Security | `shared/lib/database/tenantMiddleware.ts` |
| M10 | JWT validation fails open on database outage | Security | `pages/api/auth/[...nextauth].ts` |
| M11 | No dynamic imports on 55+ pages (only 1 uses `next/dynamic`) | Performance | All pages |
| M12 | Zero React.memo usage; no list virtualization | Performance | All components |
| M13 | Patient detail API has unbounded nested includes | Performance | `pages/api/patients/[id].ts` |
| M14 | Performance baseline has never been recorded | Performance | `docs/PERFORMANCE_BASELINE.md` |

---

## LOW Findings (9)

| # | Finding | Domain |
|---|---------|--------|
| L1 | react-grid-layout CSS loaded globally for all pages | Performance |
| L2 | FhirProvider/NotificationProvider wrap non-clinical pages | Performance |
| L3 | Patient search uses `LIKE '%term%'` on 5 columns (no full-text) | Performance |
| L4 | Missing composite index on PatientAssessment `[status, assignedProviderId]` | Performance |
| L5 | 30s WebSocket heartbeat too slow for clinical alerts | Performance |
| L6 | Health check exposes uptime without auth | Security |
| L7 | Rate limit headers leak internal tier names | Security |
| L8 | Duplicate API routes: 2x CSRF token, 2x differential diagnosis | Architecture |
| L9 | notification-service is fully dead code (zero references) | Architecture |

---

## Positive Findings

- **Database indexing:** 186 `@@index` declarations with clinically-aware composite indexes
- **WebSocket reconnection:** Exponential backoff with jitter, message queue, auto-resubscription
- **k6 load tests:** Clinically-aware scenario design with per-endpoint SLA thresholds
- **.NET backend security:** PHI masking via Serilog, OWASP headers, restricted CORS, production env guards
- **Soft-delete middleware** exists and is well-designed — just not universally applied
- **BFF circuit breaker** with 30-second cooldown prevents backend health-check spam

---

## Priority Remediation Roadmap

### Immediate (This Week)
1. **C1** — Add `requireAuth()` to `backend/[...path].ts`
2. **C2** — Add production guard for `DEMO_MODE`
3. **H1** — Enforce `organizationId` from session in all patient queries
4. **H2/H3** — Add auth + restrict CORS on clinical endpoints

### Short-Term (2 Weeks)
5. **C3** — Replace all hard deletes with soft-delete on PHI data
6. **H10** — Replace Redis `KEYS` with `SCAN` in cache and PHI cache
7. **H4** — Add Zod validation to patient PATCH/POST endpoints
8. **M7** — Replace `console.log` with PHI-safe structured logging in emergency service
9. **M8** — Make webhook signature verification mandatory

### Medium-Term (1 Month)
10. **H5** — Remove 14 phantom service exports
11. **H6** — Begin shared lib split (types → client → server)
12. **H8** — Consolidate patient state to single Zustand store
13. **M11/M12** — Add `next/dynamic` imports + `React.memo` to heavy pages
14. **M14** — Run k6 baseline and record in `PERFORMANCE_BASELINE.md`

### Ongoing
15. **H9** — Progressively type the 178 `any` usages (prioritize FHIR/integration layers)
16. **H7** — Consolidate component directories by domain
17. **M5** — Resolve Zod v3/v4 version conflict

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total findings | **36** |
| Critical | 3 |
| High | 10 |
| Medium | 14 |
| Low | 9 |
| `any` type occurrences | 178 across 43 files |
| Database indexes | 186 (thorough) |
| Test files | 257 total |
| Component directories | 47 (needs consolidation) |
| Hard delete violations | 6 locations |
| Unauthenticated API routes | ~8 endpoints |
