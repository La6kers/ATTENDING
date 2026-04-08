# ATTENDING AI — Frontend Bundle Security Audit
**Date:** 2026-04-03
**Scope:** Turborepo monorepo, branch `claude/optimistic-rosalind`
**Context:** Healthcare application (HIPAA), pre-Azure deployment review

---

## Executive Summary

The audit identified two critical issues requiring remediation before production deployment:
1. Proprietary clinical decision algorithms running client-side (visible in browser bundles)
2. A BioMistral AI API key variable designed to be baked into the frontend bundle

Several medium-severity issues exist around internal URL exposure and a missing `.dockerignore`. Docker build configuration, source maps, and Prisma client isolation are all correctly handled.

---

## Finding 1: Clinical Decision Logic in Client Bundle (CRITICAL)

### What was found

Three clinical logic modules are imported by page/component code, meaning they ship to the browser:

**`apps/patient-portal/lib/differentialDiagnosis.ts`**
Imported at `apps/patient-portal/pages/compass/chat.tsx:24`:
```ts
import { generateDifferentialDiagnosis } from '../../lib/differentialDiagnosis';
```
This module wraps a Bayesian differential diagnosis engine. The full diagnostic scoring logic — including ICD-10 code mappings, urgency classifications, and evidence weighting — is bundled into the client JavaScript.

**`apps/patient-portal/lib/compassSkipLogic.ts`**
Referenced from patient-portal components. Contains the full ROS (Review of Systems) skip logic: which body systems to ask about given a chief complaint, trigger terms for conditional questions, and estimated time savings per skipped system. Patients can read this and tailor their answers to navigate the assessment.

**`apps/patient-portal/machines/assessmentMachine.ts`**
Imported at `apps/patient-portal/components/assessment/AssessmentChat.tsx:19`:
```ts
import { assessmentMachine } from '@/machines/assessmentMachine';
```
This is an 18-phase XState assessment state machine including emergency detection thresholds, urgency scoring (critical/emergent/urgent/moderate/routine), and provider handoff logic. The full state graph is in the browser bundle.

### Why it matters

- **IP exposure:** Competitors can reverse-engineer the clinical methodology from minified (but not source-mapped) JS
- **Assessment gaming:** Patients can read the skip logic and urgency thresholds, then craft responses to avoid emergency flags or reach specific outcomes
- **HIPAA relevance:** The logic itself doesn't contain PHI, but manipulable clinical scoring in a medical context creates patient safety risk

### Remediation

Move all three modules to server-side API routes:
- Create `POST /api/compass/diagnose` that accepts HPI input and returns differential results
- Create `POST /api/compass/next-question` that runs skip logic server-side and returns the next question
- The XState machine can remain client-side for UI state only if emergency thresholds and scoring are removed from it — or move it entirely server-side via a session endpoint

---

## Finding 2: BioMistral API Key in NEXT_PUBLIC Namespace (CRITICAL)

### What was found

`apps/shared/lib/env/index.ts:59`:
```ts
NEXT_PUBLIC_BIOMISTRAL_API_KEY: z.string().optional().or(z.literal(''))
```

`apps/shared/config/biomistral.config.ts:85`:
```ts
apiKey: process.env.BIOMISTRAL_API_KEY || process.env.NEXT_PUBLIC_BIOMISTRAL_API_KEY
```

In Next.js, any environment variable prefixed with `NEXT_PUBLIC_` is **inlined into the browser JavaScript bundle at build time**. If `NEXT_PUBLIC_BIOMISTRAL_API_KEY` is set in Azure App Service configuration, the key value is readable in the page source by anyone.

### Remediation

1. Remove `NEXT_PUBLIC_BIOMISTRAL_API_KEY` from the env schema and from `biomistral.config.ts`
2. Ensure BioMistral is only called from API routes (`pages/api/`) using the server-only `BIOMISTRAL_API_KEY`
3. If the BioMistral endpoint needs to be called directly from the browser (e.g., for streaming), proxy it through a Next.js API route that validates the user's session first

---

## Finding 3: NEXT_PUBLIC Environment Variables Inventory (HIGH / MEDIUM)

The following `NEXT_PUBLIC_*` variables are baked into the browser bundle. Each is assessed for risk:

| Variable | File | Risk Level | Notes |
|----------|------|-----------|-------|
| `NEXT_PUBLIC_BIOMISTRAL_API_KEY` | shared/config/biomistral.config.ts | **Critical** | AI service key — must never be public |
| `NEXT_PUBLIC_BIOMISTRAL_API_ENDPOINT` | shared/lib/env/index.ts | Medium | Internal service URL exposed |
| `NEXT_PUBLIC_API_URL` | provider-portal/next.config.js, patient-portal/lib/api/client.ts | Medium | Backend URL — acceptable only if it's a public Azure Front Door URL, not an internal VNet address |
| `NEXT_PUBLIC_SIGNALR_URL` | provider-portal/hooks/useWebSocket.ts:229 | Medium | Internal SignalR hub URL exposed |
| `NEXT_PUBLIC_WS_URL` | shared/lib/websocket/types.ts:30, shared/lib/security/security.ts:675 | Low | WebSocket URL — acceptable if public-facing |
| `NEXT_PUBLIC_CLINICAL_AI_URL` | shared/lib/clinical-ai/types.ts:366 | Medium | Points to `localhost:8000` by default — verify production value is not an internal address |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | patient-portal/components/assessment/EmergencyModal.tsx:257, shared/services/GeolocationService.ts:184 | Low | Acceptable — must be restricted to production domain(s) in GCP Console |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | shared/lib/env/index.ts:45 | Low | Validator blocks `true` in production; variable name reveals auth bypass mechanism to inspectors |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_VERSION` | shared/lib/config.ts:89-90 | Informational | Fine to expose |

### Key concern on `NEXT_PUBLIC_API_URL`

`provider-portal/next.config.js:49`:
```js
const dotnetBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
```

This URL is used in the rewrite rules (server-side) but also in `backendClient.ts` (client-side):
```ts
// apps/provider-portal/lib/api/backendClient.ts:9
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
```

If `NEXT_PUBLIC_API_URL` is set to an internal Azure hostname (e.g., `http://attending-backend.internal.azurewebsites.net`), that internal topology is visible in the bundle.

---

## Finding 4: Source Maps (PASS — No Action Needed)

No `productionBrowserSourceMaps: true` was found in any `next.config.js`. Next.js defaults to `false` for production builds. Source maps are not being served to the browser. The deployed JavaScript will be minified and not easily readable.

---

## Finding 5: Docker Configuration (MOSTLY PASS)

### What's correct

Both `apps/patient-portal/Dockerfile` and `apps/provider-portal/Dockerfile` use proper 3-stage multi-stage builds:

- **Stage 1 (deps):** Installs dependencies only
- **Stage 2 (builder):** Compiles TypeScript, runs Next.js build
- **Stage 3 (runner):** Only contains `.next/standalone`, `.next/static`, `public/`, and Prisma engine binaries

The runner image does **not** contain:
- Raw TypeScript/JavaScript source
- Full `node_modules`
- `.env` files
- Test files or documentation

Additional security practices in place:
- Non-root user (`nextjs`, uid 1001)
- `NEXT_TELEMETRY_DISABLED=1`
- Health check endpoint configured
- `output: 'standalone'` in next.config.js (minimizes runtime dependencies)

### Gap: No `.dockerignore` at repository root

No `.dockerignore` file was found in the repository root. If a future build context change causes a broad `COPY . .`, there is no safety net preventing `.env.production`, `.env.local`, or other secrets from entering the build context and potentially the image. This is a defense-in-depth gap.

### Note: Prisma schema in runner image

Both Dockerfiles copy `./prisma` into the runner stage (required for Prisma to function at runtime). The `schema.prisma` file is present in the container filesystem, exposing the full data model to anyone with container access. This is standard practice and acceptable, but:
- Ensure Azure Container Registry is private
- Restrict container instance access via Azure RBAC
- Do not expose container filesystems to end users

---

## Finding 6: Prisma Client Isolation (PASS — No Action Needed)

`@prisma/client` imports are correctly scoped to server-side code only:

- `apps/shared/lib/prisma.ts` — server singleton
- `apps/provider-portal/lib/prisma.ts` — server singleton
- `apps/provider-portal/pages/api/labs/index.ts` — API route only
- `apps/patient-portal/pages/api/patient/medication-prices.ts` — API route only

Prisma is **not** imported in any component, hook, non-API page, or client-side module. The Prisma schema does not appear in the client-side JavaScript bundle through module imports.

---

## Finding 7: API Response Shape / Leakage (PARTIALLY AUDITED — Risk Exists)

Not fully audited due to the volume of API routes (~80+ in provider-portal alone). The structural risk exists wherever API routes return full Prisma objects without field projection.

**Pattern to look for:**
```ts
// Risky — returns all fields including internal ones
const patient = await prisma.patient.findUnique({ where: { id } });
return res.json(patient);

// Safe — explicit projection
const patient = await prisma.patient.findUnique({
  where: { id },
  select: { id: true, name: true, dateOfBirth: true }
});
return res.json(patient);
```

**Recommendation:** Audit all `pages/api/` routes that return patient, provider, or encounter data. Check for unguarded `findMany()` / `findUnique()` calls that return full records. Fields like `hashedPassword`, internal audit foreign keys, or system flags should never appear in API responses visible in the browser Network tab.

---

## Finding 8: Hardcoded Credentials (PASS)

No hardcoded API keys, tokens, connection strings, or passwords were found in frontend source files. All sensitive values are read from `process.env.*`. The default fallback values (e.g., `'http://localhost:5000'`) are development-only and appropriate.

---

## Prioritized Remediation Checklist

| # | Priority | Action | Files to Change |
|---|----------|--------|-----------------|
| 1 | **Critical** | Remove `NEXT_PUBLIC_BIOMISTRAL_API_KEY`. Call BioMistral only from API routes. | `apps/shared/lib/env/index.ts`, `apps/shared/config/biomistral.config.ts` |
| 2 | **Critical** | Move differential diagnosis engine to a server-side API route. Remove import from `pages/compass/chat.tsx`. | `apps/patient-portal/pages/compass/chat.tsx`, create `pages/api/compass/diagnose.ts` |
| 3 | **Critical** | Move assessmentMachine and compassSkipLogic to server-side. Remove from client bundle. | `apps/patient-portal/machines/assessmentMachine.ts`, `apps/patient-portal/lib/compassSkipLogic.ts` |
| 4 | **High** | Verify `NEXT_PUBLIC_API_URL` in Azure App Service config is a public Front Door URL, not an internal VNet address. | Azure portal config — no code change needed |
| 5 | **High** | Verify `NEXT_PUBLIC_CLINICAL_AI_URL` in production is not an internal hostname. | Azure portal config |
| 6 | **Medium** | Add `.dockerignore` at repo root. | Create `/.dockerignore` |
| 7 | **Medium** | Audit all `pages/api/` data routes for unguarded Prisma returns. Add `select:` projections. | All API routes returning patient/provider data |
| 8 | **Medium** | Restrict Google Maps API key to production domain in GCP Console. | GCP Console — no code change |
| 9 | **Low** | Rename `NEXT_PUBLIC_DEV_BYPASS_AUTH` → `DEV_BYPASS_AUTH`, read only in middleware. | `apps/shared/lib/env/index.ts` |
| 10 | **Low** | Add CI step to scan `.next/static/chunks/` for secret patterns (`hf_`, `sk-`, known key formats) post-build. | CI pipeline (`.github/workflows/`) |

---

## HIPAA-Specific Notes

- **PHI in client-side logic:** The clinical algorithms themselves don't store PHI, but running diagnosis logic client-side means PHI entered in the assessment form (symptoms, medical history) is processed in the browser rather than a controlled server environment. Any browser extension, XSS vulnerability, or compromised CDN could intercept this.
- **Audit logging:** Verify that all PHI access through API routes generates audit log entries. If Prisma middleware handles this, confirm it's applied to all models containing PHI.
- **Transport security:** HSTS headers are correctly configured in both `next.config.js` files (`max-age=31536000; includeSubDomains`). Good.
- **Data minimization:** The API response leakage risk (Finding 7) is particularly important for HIPAA — returning full patient records when only a subset is needed violates the minimum necessary standard.
