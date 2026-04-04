# ATTENDING AI — Improvement Roadmap

**Created:** 2026-04-03
**Status:** Pre-production (no live clinic/patient data)
**Current Branch:** mockup-2

---

## Completed (April 2026)

- [x] Rate limiting on AI-facing API endpoints (diagnose, analyze-image)
- [x] Origin validation on API endpoints
- [x] Removed wildcard CORS from provider-portal clinical endpoints
- [x] CSP headers on compass-standalone and provider-portal
- [x] Removed `unsafe-eval` from CSP
- [x] ErrorBoundary on all three portals
- [x] Dynamic imports for ResultsPanel and PhotoCapture (code splitting)
- [x] Zustand `useShallow` selectors on heavy pages (assess.tsx, labs.tsx)
- [x] `optimizePackageImports` for lucide-react tree shaking (all apps)
- [x] Accessibility: minimum font sizes, contrast ratios, aria labels
- [x] Source maps disabled in production
- [x] Security headers (X-Frame-Options, nosniff, HSTS, Referrer-Policy)
- [x] Generic error messages on hardened API endpoints
- [x] Input sanitization with length limits on AI endpoints

---

## Phase 1 — Pre-Launch Polish (Before First External Demo)

**Goal:** App feels production-quality to evaluators and investors.

| Task | Effort | Files |
|------|--------|-------|
| Add `React.memo` to list components (ClinicalMessageCard) | 2 hrs | `ClinicalMessageCard.tsx` |
| Add `useMemo` to sorted/filtered lists (ClinicalMessageList) | 1 hr | `ClinicalMessageList.tsx` |
| Add image optimization config to all `next.config.js` | 30 min | 3 config files |
| Add loading skeletons for slow-loading panels | 4 hrs | Results, labs, clinical hub |
| Mobile responsive pass on provider-portal | 4 hrs | Layout components |

---

## Phase 2 — Architecture & Code Quality (Before Pilot Program)

**Goal:** Codebase is maintainable and safe to hand to a team.

| Task | Effort | Files |
|------|--------|-------|
| Refactor `encounter/[id].tsx` (2,322 lines) into 5-7 components | 12 hrs | New component files |
| Refactor `LabResultsReview.tsx` (1,635 lines) into sub-components | 8 hrs | New component files |
| Consolidate duplicate `assessmentMachine.ts` (patient-portal vs shared) | 4 hrs | 2 files |
| Consolidate duplicate `CareCoordinationHub.tsx` (2 versions) | 4 hrs | 2 files |
| Consolidate `ChatInput.tsx` (3 versions) into shared | 3 hrs | 3 files |
| Reduce TypeScript `any` usage (465 instances) — enable `no-explicit-any` | 16 hrs | Across codebase |
| Resolve or ticket 60+ TODO/FIXME comments | 4 hrs | Across codebase |
| Remove archive directories (legacy code) | 1 hr | Root level |

---

## Phase 3 — Security Hardening (Before Real Patient Data)

**Goal:** HIPAA-ready. No PHI exposure risks.

| Task | Effort | Priority |
|------|--------|----------|
| Move clinical AI algorithms to server-only API routes | 8 hrs | CRITICAL |
| — `differentialDiagnosis.ts` Bayesian engine | | |
| — `symptomCauseGraph.json` (505KB clinical knowledge) | | |
| — `clinicalScoringTools.ts` | | |
| Implement Azure Key Vault for secrets management | 4 hrs | CRITICAL |
| Sanitize error responses on ALL API routes (not just AI endpoints) | 6 hrs | HIGH |
| Add rate limiting middleware globally (not per-endpoint) | 4 hrs | HIGH |
| Validate CORS origin on remaining 3 clinical endpoints | 1 hr | HIGH |
| — `drug-check.ts`, `labs.ts`, `protocols.ts` | | |
| Move emergency settings from localStorage to server-side | 4 hrs | MEDIUM |
| Add schema validation (Zod) to all API route inputs | 8 hrs | MEDIUM |
| Create `.dockerignore` at repository root | 30 min | MEDIUM |
| Implement nonce-based CSP (replace `unsafe-inline`) | 4 hrs | MEDIUM |
| Mobile certificate pinning (when mobile app launches) | 2 hrs | MEDIUM |
| Prompt injection mitigation for AI endpoints | 4 hrs | LOW |

---

## Phase 4 — Testing (Before Production Launch)

**Goal:** Confidence that changes don't break critical paths.

| Task | Effort | Coverage Target |
|------|--------|-----------------|
| API route tests: auth, session, token handling | 12 hrs | 100% of auth routes |
| API route tests: clinical endpoints (diagnose, analyze-image) | 8 hrs | 100% of AI routes |
| Unit tests: Zustand stores (13 untested store files) | 16 hrs | All stores |
| Unit tests: clinical services (DeteriorationAlert, ClinicalDecision) | 12 hrs | Core services |
| Unit tests: shared utilities (security, CORS, FHIR) | 8 hrs | shared/lib/ |
| E2E tests: COMPASS assessment flow | 8 hrs | Happy path + edge cases |
| E2E tests: provider encounter workflow | 8 hrs | Happy path |
| Set up CI coverage gate (50% minimum) | 2 hrs | CI/CD pipeline |
| **Total estimated effort** | **~74 hrs** | **Target: 50%+** |

---

## Phase 5 — Scale & Performance (Before High Traffic)

**Goal:** App handles concurrent users without degradation.

| Task | Effort |
|------|--------|
| Replace in-memory rate limiting with Redis/Upstash | 4 hrs |
| Add `Cache-Control` headers to read-only API endpoints | 3 hrs |
| Implement ISR (Incremental Static Regeneration) for static pages | 4 hrs |
| Add request deduplication for concurrent identical API calls | 4 hrs |
| Bundle analysis — verify no client-side clinical data leakage | 2 hrs |
| Add compression middleware | 1 hr |

---

## Dependency Maintenance

| Item | Current | Action |
|------|---------|--------|
| `lucide-react` in shared | 0.263.1 (dev) | Update to 0.400.0 to match apps |
| `react-grid-layout` | 1.4.4 (provider) vs 1.5.3 (patient) | Align versions |
| Dead service exports in shared | Exported, never imported | Audit with ts-unused-exports |

---

## Notes

- **Current test coverage:** ~1.2% (22 test files / 940 source files)
- **Largest files:** encounter/[id].tsx (2,322), LabResultsReview.tsx (1,635), DeteriorationAlertService.ts (1,485)
- **TypeScript `any` count:** 465 (Provider: 210, Shared: 181, Patient: 73)
- All phase timelines are estimates for a single developer
- Phases can overlap — security hardening should start before testing is complete
