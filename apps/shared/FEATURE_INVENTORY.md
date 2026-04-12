# ATTENDING AI -- Shared Services Feature Inventory

> **Generated**: 2026-03-25
> **Scope**: `apps/shared/` -- all services, libs, hooks, components, and supporting modules
> **Method**: Cross-referenced every `@attending/shared` and relative-path import across `provider-portal` and `patient-portal`

---

## Legend

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Currently imported and used by provider-portal and/or patient-portal |
| **FUTURE-TOGGLE** | Not currently imported by either portal, but designed for a specific planned feature. Keep and gate behind a feature flag. |
| **DEAD** | Not imported anywhere, no clear future purpose, candidate for removal |

---

## 1. SERVICES (`apps/shared/services/`)

### 1.1 Root-Level Services

| File | Status | Imported By | Description | Feature Flag |
|------|--------|-------------|-------------|--------------|
| `assessmentSubmission.ts` | **ACTIVE** | patient-portal (via `@attending/shared` barrel) | Submits COMPASS patient assessments to backend | `patient.compass-chat` |
| `ClinicalRecommendationService.ts` | **ACTIVE** | provider-portal (`labOrderingStore`, `imagingOrderingStore`, `medicationOrderingStore`) | Generates lab/imaging/medication recommendations given patient context | `ai.order-recommendations` |
| `CompassBridge.ts` | **ACTIVE** | patient-portal (via `@attending/shared` barrel); bridges COMPASS chat events | Event bus between COMPASS assessment UI and backend | `patient.compass-chat` |
| `CompassPreVisitPipeline.ts` | **FUTURE-TOGGLE** | Not imported by either portal | Pre-visit data pipeline that enriches COMPASS assessments before provider review | `provider.previsit-summary` |
| `CostAwareAIRouter.ts` | **ACTIVE** | provider-portal (`previsit/[id]`, `visit/[id]`, `api/ai/clinical`) | Routes AI requests to cheapest capable model (BioMistral local-first, fallback to cloud) | `ai.differential-diagnosis` |
| `ClinicalAIService.ts` | **FUTURE-TOGGLE** | Not imported by either portal (has tests in `__tests__/`) | High-level clinical AI orchestration service | `ai.diagnostic-solver` |
| `DiagnosisLearningService.ts` | **FUTURE-TOGGLE** | Not imported by either portal | Tracks provider feedback on AI diagnoses to improve model accuracy over time | `experimental.llm-agent` |
| `GeolocationService.ts` | **ACTIVE** | patient-portal (via `@attending/shared` barrel, used for emergency facility lookup) | Calculates distances, finds nearest emergency facilities and nurse hotlines | `patient.emergency-access` |
| `NotificationService.ts` | **ACTIVE** | patient-portal (via `@attending/shared` barrel) | In-app notification delivery for COMPASS results, provider messages | `patient.compass-chat` |
| `PharmacyInventoryService.ts` | **FUTURE-TOGGLE** | Not directly imported (provider-portal has local `PharmacyInventory` interface, patient-portal has local `checkPharmacyInventory` stub) | Real-time pharmacy stock checking for e-prescribing | `integration.e-prescribing` |
| `registerServices.ts` | **FUTURE-TOGGLE** | Not imported by either portal | Bootstrap that registers all services into the ServiceRegistry | (infrastructure -- no flag needed, but currently unused) |

### 1.2 Service Subdirectories

| Directory / File | Status | Imported By | Description | Feature Flag |
|-----------------|--------|-------------|-------------|--------------|
| **`ai-providers/`** | **FUTURE-TOGGLE** | Not imported by either portal | Swappable AI backend abstraction (OpenAI, Anthropic, BioMistral, Azure) | `ai.differential-diagnosis` |
| `AIProviderFactory.ts` | FUTURE-TOGGLE | -- | Factory for creating AI provider instances | -- |
| **`ai-scribe/`** | **ACTIVE** | provider-portal (`api/scribe/index.ts`) | Ambient clinical scribe: audio-to-structured-note pipeline | `ai.ambient-scribe` |
| `AmbientScribeService.ts` | ACTIVE | provider-portal | Main scribe session manager | -- |
| **`ambient/`** | **ACTIVE** | provider-portal (`api/ambient/transcribe`, `generate-note`, `session`) | Ambient listening, AI documentation, clinical note generation | `ai.ambient-scribe` |
| `AmbientListeningService.ts` | ACTIVE | provider-portal | Real-time audio capture and transcription | -- |
| `ambient-ai.service.ts` | ACTIVE | provider-portal | AI processing of ambient audio | -- |
| `ClinicalNoteGenerator.ts` | ACTIVE | provider-portal | Generates structured clinical notes from transcripts | -- |
| `ambient-documentation.service.ts` | ACTIVE | provider-portal | Documentation workflow orchestration | -- |
| **`analytics/`** | **ACTIVE** | provider-portal (`api/analytics/outcomes`) | Clinical analytics and outcomes tracking | `clinical.quality-measures` |
| `clinical-analytics.service.ts` | ACTIVE | provider-portal | Outcomes data aggregation | -- |
| **`care-gaps/`** | **FUTURE-TOGGLE** | Not imported (exported from `services/index.ts` but directory only has `CareGapsService.ts`, no portal imports) | Identifies missing preventive care and screening gaps | `clinical.care-gaps` |
| `CareGapsService.ts` | FUTURE-TOGGLE | -- | Preventive care gap detection engine | -- |
| **`clinical-decision/`** | **ACTIVE** | provider-portal (`api/interventions/recommendations`) | Clinical decision support engine | `clinical.smart-orders` |
| `ClinicalDecisionEngine.ts` | ACTIVE | provider-portal | Rule-based + AI clinical decision support | -- |
| **`clinical-imaging/`** | **FUTURE-TOGGLE** | Not imported by either portal | AI-assisted medical image analysis | `ai.image-analysis` |
| `ImageAnalysisService.ts` | FUTURE-TOGGLE | -- | Radiology image interpretation | -- |
| **`clinical-pathways/`** | **FUTURE-TOGGLE** | Not imported (provider-portal has its own local `ClinicalPathwayPanel` component) | Evidence-based clinical pathway engine with step tracking | `clinical.care-coordination` |
| `engine.ts` | FUTURE-TOGGLE | -- | Pathway execution engine | -- |
| `pathways.ts` | FUTURE-TOGGLE | -- | Pathway definitions | -- |
| `types.ts` | FUTURE-TOGGLE | -- | Pathway type definitions | -- |
| **`companion/`** | **FUTURE-TOGGLE** | Not imported from shared (patient-portal has its own local `components/companion/`) | Shared AI health companion service logic | `patient.health-coaching` |
| `companion.service.ts` | FUTURE-TOGGLE | -- | Health companion backend logic | -- |
| **`diagnostic-solver/`** | **FUTURE-TOGGLE** | Not imported (exported from `services/index.ts` but no portal imports) | Complex diagnostic reasoning with step-by-step explanation | `ai.diagnostic-solver` |
| `DiagnosticSolverService.ts` | FUTURE-TOGGLE | -- | Multi-step diagnostic reasoning engine | -- |
| **`fhir-sync/`** | **ACTIVE** | provider-portal (`api/fhir/sync/patient`, `api/fhir/orders/send`) | Bidirectional FHIR data synchronization and order transmission | `integration.fhir-sync` |
| `FhirSyncService.ts` | ACTIVE | provider-portal | Patient data sync with external EHRs | -- |
| `FhirPersistenceService.ts` | ACTIVE | provider-portal | Persists synced FHIR data locally | -- |
| `FhirOrderService.ts` | ACTIVE | provider-portal | Sends orders to external EHR via FHIR | -- |
| **`interventions/`** | **ACTIVE** | provider-portal (`api/interventions/*`) | Clinical intervention services bundle | (multiple flags) |
| `CareCoordinationHub.ts` | ACTIVE | provider-portal (`api/interventions/coordination`) | Multi-provider care coordination | `clinical.care-coordination` |
| `ClinicalTrialMatcher.ts` | ACTIVE | provider-portal (`api/interventions/trials`) | Matches patients to eligible clinical trials | `ai.clinical-trials` |
| `MedicationOptimizer.ts` | ACTIVE | provider-portal (`api/interventions/medications`) | Optimizes medication regimens for efficacy and cost | `clinical.medication-optimizer` |
| `SDOHService.ts` | ACTIVE | provider-portal (`api/interventions/sdoh`) | Social determinants of health screening and resource referral | `clinical.sdoh-screening` |
| `SmartOrderAssistant.ts` | ACTIVE | provider-portal (`api/interventions/orders`) | Intelligent order entry with clinical decision support | `clinical.smart-orders` |
| **`learning/`** | **FUTURE-TOGGLE** | Not imported by either portal | Continuous learning from provider feedback on AI suggestions | `experimental.llm-agent` |
| `continuous-learning.service.ts` | FUTURE-TOGGLE | -- | Feedback loop and model improvement tracking | -- |
| **`predictive/`** | **ACTIVE** | provider-portal (`api/predictive/analyze`) | Predictive patient deterioration models | `ai.predictive-alerts` |
| `PredictiveModels.ts` | ACTIVE | provider-portal | Risk scoring and deterioration prediction | -- |
| **`predictive-alerts/`** | **FUTURE-TOGGLE** | Not directly imported (exported from `services/index.ts`; `predictive/` is used instead) | Alert generation from predictive model outputs | `ai.predictive-alerts` |
| `DeteriorationAlertService.ts` | FUTURE-TOGGLE | -- | Generates and routes deterioration alerts | -- |
| **`prior-auth/`** | **ACTIVE** | provider-portal (`api/prior-auth/index`, `api/prior-auth/[id]`) | Automated prior authorization submission and tracking | `clinical.prior-auth` |
| `PriorAuthService.ts` | ACTIVE | provider-portal | Prior auth workflow automation | -- |
| **`quality/`** | **ACTIVE** | provider-portal (`api/quality/dashboard`, `api/quality/patient/[patientId]`) | HEDIS and quality measure tracking | `clinical.quality-measures` |
| `QualityMeasuresService.ts` | ACTIVE | provider-portal | Quality measure calculation and dashboard data | -- |
| **`registry/`** | **FUTURE-TOGGLE** | Not imported by either portal (exported from `services/index.ts`) | Modular service registry for plug-and-play architecture | (infrastructure) |
| `ServiceRegistry.ts` | FUTURE-TOGGLE | -- | Dependency injection container for services | -- |
| **`rpm/`** | **ACTIVE** | provider-portal (`api/rpm/[patientId]`, `api/rpm/enrollment`) | Remote patient monitoring: wearables, home devices | `patient.rpm` |
| `RemoteMonitoringService.ts` | ACTIVE | provider-portal | Device data ingestion and alerting | -- |
| **`smart-inbox/`** | **FUTURE-TOGGLE** | Not imported (exported from `services/index.ts` but no portal imports) | AI-prioritized provider message inbox | `provider.smart-inbox` |
| `SmartInboxService.ts` | FUTURE-TOGGLE | -- | Message prioritization and triage | -- |

### 1.3 Services in `services/index.ts` That Reference Non-Existent Directories

These are exported from the barrel but their target directories do not exist on disk yet.

| Export Target | Status | Description | Feature Flag |
|---------------|--------|-------------|--------------|
| `smart-scheduling/SmartSchedulingService` | **DEAD** | Directory does not exist | `provider.smart-scheduling` |
| `peer-consult/PeerConsultService` | **DEAD** | Directory does not exist | `provider.peer-consult` |
| `patient-engagement/MedicationBuddyService` | **DEAD** | Directory does not exist | `patient.medication-buddy` |
| `patient-engagement/HealthCoachingService` | **DEAD** | Directory does not exist | `patient.health-coaching` |
| `patient-engagement/FamilyHealthHubService` | **DEAD** | Directory does not exist | `patient.family-hub` |
| `patient-engagement/PostDischargeConciergeService` | **DEAD** | Directory does not exist | (no flag yet) |
| `mental-health/MentalHealthService` | **DEAD** | Directory does not exist | (no flag yet) |
| `social-support/SocialSupportService` | **DEAD** | Directory does not exist | (no flag yet) |
| `end-of-life/EndOfLifeService` | **DEAD** | Directory does not exist | (no flag yet) |
| `interpreter/MedicalInterpreterService` | **DEAD** | Directory does not exist | (no flag yet) |
| `population-health/PopulationHealthService` | **DEAD** | Directory does not exist | `provider.population-health` |
| `wearables/WearablesService` | **DEAD** | Directory does not exist | `patient.rpm` |
| `smart-order/SmartOrderAssistant` | **DEAD** | Directory does not exist (note: `interventions/SmartOrderAssistant` exists and IS used) | `clinical.smart-orders` |
| `clinical-trials/ClinicalTrialMatcher` | **DEAD** | Directory does not exist (note: `interventions/ClinicalTrialMatcher` exists and IS used) | `ai.clinical-trials` |
| `medication-optimizer/MedicationOptimizer` | **DEAD** | Directory does not exist (note: `interventions/MedicationOptimizer` exists and IS used) | `clinical.medication-optimizer` |
| `care-coordination/CareCoordinationHub` | **DEAD** | Directory does not exist (note: `interventions/CareCoordinationHub` exists and IS used) | `clinical.care-coordination` |
| `sdoh/SDOHService` | **DEAD** | Directory does not exist (note: `interventions/SDOHService` exists and IS used) | `clinical.sdoh-screening` |

> **Note**: The last five entries above are path mismatches in `services/index.ts`. The actual implementations live under `interventions/` and ARE actively imported. The `services/index.ts` barrel exports point to non-existent paths (`smart-order/`, `clinical-trials/`, `medication-optimizer/`, `care-coordination/`, `sdoh/`) which will cause build errors if anyone imports from the barrel. This should be fixed.

---

## 2. LIB MODULES (`apps/shared/lib/`)

### 2.1 Core Infrastructure (ACTIVE)

| Module | Imported By | Description |
|--------|-------------|-------------|
| `lib/prisma.ts` | Both portals (extensively) | Prisma database client singleton |
| `lib/utils.ts` | Both portals | Utility functions: `cn`, `formatDate`, `debounce`, etc. |
| `lib/security/` | Both portals | CSRF, rate limiting, input sanitization, security headers |
| `lib/api/handler.ts` | provider-portal (many API routes) | Standardized API route handler factory |
| `lib/api/backendProxy.ts` | Both portals | Proxy layer for backend API calls |
| `lib/api/response.ts` | provider-portal | Standardized API response helpers |
| `lib/audit/` | provider-portal (extensively) | HIPAA-compliant audit logging |
| `lib/auth/` | Both portals | Authentication, sessions, SSO, MFA, API keys, permissions |
| `lib/auth/ssoProviders.ts` | provider-portal (`api/auth/[...nextauth]`) | SSO provider configuration for NextAuth |
| `lib/auth/apiKeys.ts` | provider-portal (admin, integrations) | API key management |
| `lib/auth/withApiAuth.ts` | provider-portal | API route authentication middleware |
| `lib/logging/` | provider-portal (integrations, admin) | Structured logging |
| `lib/redis/` | provider-portal (`api/ai/differential`, admin) | Redis client and cache service |
| `lib/integrations/events.ts` | provider-portal (instrumentation, webhooks, imports) | Clinical event bus and webhook dispatcher |
| `lib/integrations/hl7v2.ts` | provider-portal (`api/integrations/hl7v2`) | HL7v2 message parsing and generation |
| `lib/integrations/transforms.ts` | provider-portal (`api/integrations/import`) | Data transformation for integrations |
| `lib/integrations/bulkExport.ts` | provider-portal (`api/fhir/export`) | FHIR bulk data export |
| `lib/integrations/deadLetterQueue.ts` | provider-portal (`api/admin/dlq`) | Dead letter queue for failed integration messages |
| `lib/ai/differentialDiagnosis.ts` | provider-portal (`api/ai/differential`) | Differential diagnosis AI engine |
| `lib/fhir/` | provider-portal (hooks, components, pages) | FHIR client, hooks, resource mappers, provider |
| `lib/clinical-ai/` | provider-portal (via internal references) | BioMistral client, red flag detection, clinical AI hooks |
| `lib/clinicalBranding.ts` | provider-portal (components, dashboard) | Clinical terminology and disclaimer text constants |
| `lib/alerting.ts` | provider-portal (`api/admin/alerts`) | Alert engine for system monitoring |
| `lib/billing.ts` | provider-portal (`api/admin/billing`, `platform`) | Usage metering for billing |
| `lib/metrics.ts` | provider-portal (`api/metrics`, `admin/dashboard`, `platform`) | Application metrics collection |
| `lib/scheduler.ts` | provider-portal (`api/admin/scheduler`, `dashboard`, `platform`) | Background job scheduler |
| `lib/rateLimits.ts` | provider-portal (`api/ai/differential`, `admin/rate-limits`) | Rate limit tier definitions |
| `lib/phiCache.ts` | provider-portal (`api/admin/phi-cache`) | PHI-aware caching with automatic expiry |
| `lib/featureFlags.ts` | provider-portal (`api/admin/features`) | Feature flag runtime evaluation (separate from `config/FeatureFlags.ts`) |
| `lib/envValidation.ts` | provider-portal (instrumentation) | Environment variable validation at startup |
| `lib/shutdown.ts` | provider-portal (instrumentation) | Graceful shutdown handler registration |
| `lib/database/` | provider-portal (instrumentation) | Database configuration and tenant middleware |
| `lib/openapi.ts` | provider-portal (`api/docs`) | OpenAPI spec generation |
| `lib/retention.ts` | provider-portal (`api/admin/retention`) | Data retention policy enforcement |
| `lib/integrations/registry.ts` | provider-portal (`api/admin/integrations`) | Integration configuration registry |
| `schemas/` | provider-portal (`api/imaging`, `api/referrals`) | Zod validation schemas for orders |

### 2.2 Lib Modules -- FUTURE-TOGGLE (Not Currently Imported)

| Module | Description | Recommended Feature Flag |
|--------|-------------|--------------------------|
| `lib/api/apiClient.ts` | Generic HTTP API client | (infrastructure) |
| `lib/api/apiResponse.ts` | API response type helpers | (infrastructure) |
| `lib/api/apiVersion.ts` | API versioning middleware | (infrastructure) |
| `lib/api/createApiHandler.ts` | Alternative handler factory | (infrastructure) |
| `lib/api/secureApiHandler.ts` | Secure API handler with auth built-in | (infrastructure) |
| `lib/api/secureHandler.ts` | Variant of secure handler | (infrastructure) |
| `lib/apiErrors.ts` | Standardized API error classes | (infrastructure) |
| `lib/auditTrail.ts` | Legacy audit trail (superseded by `lib/audit/`) | (deprecated candidate) |
| `lib/circuitBreaker.ts` | Circuit breaker for external service calls | `integration.epic-fhir` |
| `lib/cors.ts` | CORS configuration | (infrastructure) |
| `lib/distributedLock.ts` | Distributed locking via Redis | (infrastructure) |
| `lib/encryption.ts` | PHI field-level encryption | (infrastructure -- critical for production) |
| `lib/env/index.ts` | Environment configuration loader | (infrastructure) |
| `lib/idempotency.ts` | Idempotency key middleware for API mutations | (infrastructure) |
| `lib/config.ts` | Application configuration | (infrastructure) |
| `lib/multiTenant.ts` | Multi-tenant isolation helpers | (infrastructure) |
| `lib/softDeleteMiddleware.ts` | Prisma soft-delete middleware | (infrastructure) |
| `lib/tracing.ts` | Distributed tracing (OpenTelemetry) | (infrastructure) |
| `lib/clinicalKnowledgeBase.ts` | Curated clinical knowledge for AI grounding | `ai.differential-diagnosis` |
| `lib/webhooks/` | Webhook payload building, delivery, FHIR transforms | `integration.epic-fhir` |
| `lib/websocket/` | WebSocket client, hooks, provider | (infrastructure) |
| `lib/validators/clinical.ts` | Clinical data validation rules | (infrastructure) |
| `lib/validators/vitalSigns.ts` | Vital sign range validation | (infrastructure) |
| `lib/middleware/index.ts` | General middleware utilities | (infrastructure) |
| `lib/monitoring/index.ts` | System health monitoring | (infrastructure) |
| `lib/optimizations/index.ts` | Performance optimization utilities | (infrastructure) |
| `lib/performance/index.ts` | Performance measurement utilities | (infrastructure) |
| `lib/security/security.ts` | Additional security utilities | (infrastructure) |
| `lib/audit/archival.ts` | Audit log archival to cold storage | (infrastructure) |

---

## 3. HOOKS (`apps/shared/hooks/`)

| File | Status | Imported By | Description |
|------|--------|-------------|-------------|
| `useWebSocket.ts` | **ACTIVE** | Both portals | WebSocket connection hook |
| `useDebounce.ts` | **FUTURE-TOGGLE** | Not imported | Debounce hook for input fields |
| `useLocalStorage.ts` | **FUTURE-TOGGLE** | Not imported | Persistent local storage hook |
| `useNotifications.ts` | **FUTURE-TOGGLE** | Not imported | Notification subscription hook |
| `useServices.tsx` | **FUTURE-TOGGLE** | Not imported | Service registry access hook |

---

## 4. COMPONENTS (`apps/shared/components/`)

| Directory | Status | Imported By | Description |
|-----------|--------|-------------|-------------|
| `ui/` (Button, Card, Badge, etc.) | **ACTIVE** | provider-portal (`component-demo`, `button.tsx`) | Shared UI primitive components |
| `layout/` (Header) | **ACTIVE** | provider-portal (`component-demo`) | Shared layout components |
| `errors/ErrorBoundary.tsx` | **ACTIVE** | patient-portal | React error boundary |
| `errors/ClinicalErrorBoundary.tsx` | **FUTURE-TOGGLE** | Not imported | Clinical-context-aware error boundary |
| `chat/` (ChatInput, MessageBubble, etc.) | **FUTURE-TOGGLE** | Not imported (patient-portal has its own chat components) | Shared chat UI components |
| `clinical/` (ClinicalComponents, QuickActionsBar) | **FUTURE-TOGGLE** | Not imported | Reusable clinical display components |
| `accessibility/AccessibilityProvider.tsx` | **FUTURE-TOGGLE** | Not imported | Accessibility settings provider |
| `ClinicalDisclaimer.tsx` | **FUTURE-TOGGLE** | Not imported (provider-portal has its own `ClinicalDisclaimer`) | Shared clinical disclaimer component |

---

## 5. CONFIG (`apps/shared/config/`)

| File | Status | Imported By | Description |
|------|--------|-------------|-------------|
| `FeatureFlags.ts` | **ACTIVE** | provider-portal (via `lib/featureFlags.ts`) | Feature flag definitions and evaluation service (40+ flags defined) |
| `FeatureFlagProvider.ts` | **FUTURE-TOGGLE** | Not imported | React context provider for feature flags |
| `biomistral.config.ts` | **FUTURE-TOGGLE** | Not imported directly (provider-portal has local BioMistral config) | BioMistral model configuration |
| `index.ts` | **ACTIVE** | Barrel export | Config barrel |

---

## 6. OTHER MODULES

| Module | Status | Imported By | Description |
|--------|--------|-------------|-------------|
| `catalogs/` (labs, imaging, meds, referrals) | **ACTIVE** | provider-portal (ordering stores, hooks, components) | Clinical order catalogs with searchable entries |
| `types/` (chat, clinical, ordering) | **ACTIVE** | Both portals (extensively) | Shared TypeScript type definitions |
| `machines/assessmentMachine.ts` | **ACTIVE** | patient-portal (via barrel) | XState assessment flow state machine |
| `stores/createStore.ts` | **FUTURE-TOGGLE** | Not imported | Generic Zustand store factory |
| `data/mock/` | **ACTIVE** | Used in development/testing | Mock patient and assessment data |
| `styles/breakpoints.css` | **ACTIVE** | provider-portal (`_app.tsx`) | Responsive breakpoint CSS |

---

## 7. SUMMARY COUNTS

| Category | Count |
|----------|-------|
| **ACTIVE** services | 22 service files across 11 directories |
| **FUTURE-TOGGLE** services (on disk, not imported) | 15 service files across 10 directories |
| **DEAD** services (exported but directory missing) | 17 exports in `services/index.ts` pointing to non-existent paths |
| **ACTIVE** lib modules | ~30 modules |
| **FUTURE-TOGGLE** lib modules | ~25 modules |

---

## 8. RECOMMENDED ACTIONS

### Immediate (Fix Broken Exports)
1. **Fix `services/index.ts` path mismatches** -- The barrel exports for `smart-order/`, `clinical-trials/`, `medication-optimizer/`, `care-coordination/`, and `sdoh/` point to directories that do not exist. The actual implementations are under `interventions/`. Update the barrel to use the correct paths.

### Short-Term (Feature Flag Gating)
2. **Gate FUTURE-TOGGLE services behind feature flags** -- Services like `CareGapsService`, `ImageAnalysisService`, `DiagnosticSolverService`, `SmartInboxService`, `clinical-pathways/`, and `companion/` should check their corresponding feature flag before initializing.
3. **Add missing feature flag definitions** for `PostDischargeConciergeService`, `MentalHealthService`, `SocialSupportService`, `EndOfLifeService`, and `MedicalInterpreterService`.

### Medium-Term (Dead Code Cleanup)
4. **Remove or implement DEAD service exports** -- The 17 non-existent service directories referenced in `services/index.ts` will cause import failures. Either create the implementations or remove the exports.
5. **Consolidate duplicate patterns** -- `lib/auditTrail.ts` vs `lib/audit/`, multiple API handler factories (`handler.ts`, `createApiHandler.ts`, `secureApiHandler.ts`, `secureHandler.ts`), and duplicate clinical disclaimer components should be consolidated.

### Long-Term (Architecture)
6. **Activate ServiceRegistry pattern** -- The `registry/ServiceRegistry.ts` and `registerServices.ts` provide a dependency injection pattern that is not yet used. Once feature flag gating is consistent, wire services through the registry for testability and hot-swap capability.
