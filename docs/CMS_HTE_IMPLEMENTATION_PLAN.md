# CMS HTE Implementation Plan — Technical Mapping

**Date:** April 8, 2026
**Status:** Planning
**Branch:** mockup-2

---

## Codebase Readiness Assessment

### What We Already Have (Strengths)

| Requirement | Current State | Location |
|-------------|---------------|----------|
| FHIR R4 resource mappers | Patient, Observation, Condition, MedicationRequest, AllergyIntolerance, Encounter, Bundle | `apps/shared/lib/fhir/` |
| HL7v2 parser/builder | ADT, ORM, ORU, SIU, MDM message types | `apps/shared/lib/integrations/hl7v2.ts` |
| FHIR vendor factory | Epic, Oracle Health (Cerner), athenahealth | ADR-0005, `appsettings.json` FhirCerner config |
| PHI encryption | AES-256-GCM with key rotation, deterministic fields | `apps/shared/lib/encryption.ts` |
| Audit trail | Immutable decision logs, no PHI stored, per-encounter queries | `apps/shared/lib/auditTrail.ts` |
| Azure AD B2C | MFA enforcement, JWT Bearer, OIDC discovery | `backend/src/ATTENDING.Orders.Api/Program.cs` |
| Clinical safety | 14 red flags, drug interactions, behavioral health screening | `docs/CLINICAL_SAFETY.md`, clinical services |
| Multi-tenant isolation | OrganizationId on all entities, RBAC | Prisma schema, middleware |
| Soft-delete compliance | 6-year retention per 45 CFR 164.530(j) | Prisma middleware |
| Performance SLA | Route-specific thresholds (150ms-800ms) | `appsettings.json` |
| 60+ clinical services | CDS engine, ambient scribe, care gaps, imaging analysis | `apps/shared/services/` |
| CDS Hooks server | HL7 CDS Hooks v1.2 integration | `services/cds-hooks/` |

### What We Need to Build (Gaps)

---

## Phase 0: Foundation (Now - May 2026)

### 0.1 Administrative Actions (No Code)

- [ ] Sign CMS Interoperability Pledge at cms.gov
- [ ] Self-attest CARIN Code of Conduct at MyHealthApplication.com
- [ ] Register for DiMe Seal developer portal
- [ ] Request ID.me developer sandbox access at developers.id.me
- [ ] Engage SOC 2 Type II auditor (Drata, Vanta, or Secureframe)
- [ ] Submit DirectTrust CARIN-CFA application

### 0.2 Privacy Policy Rewrite

**What:** Rewrite privacy policy to meet CARIN Code of Conduct requirements.

**CARIN Requires:**
- Prominent, publicly accessible, lay-language
- Covers: data collection, consent, use, disclosure, access, security, retention/deletion
- Staff training documentation

**Files to Update:**
- `docs/index.html` (website — add/update privacy policy section)
- New: `docs/privacy-policy.html` or `apps/patient-portal/pages/privacy.tsx`
- Backend: add privacy policy acceptance tracking to `User` model

### 0.3 WCAG 2.2 AA Audit

**What:** Audit patient-facing portals for accessibility compliance.

**Scope:**
- `apps/patient-portal/` — COMPASS assessment flow (18 phases)
- `apps/provider-portal/` — clinical dashboards
- `apps/mobile/` — React Native app
- `docs/index.html` — marketing site

**Tools:** axe-core, Lighthouse, manual screen reader testing

**Known Concerns:**
- COMPASS 18-phase assessment — complex form accessibility
- React Grid Layout dashboards — drag-drop accessibility
- Glassmorphism design — contrast ratios with frosted glass effects

### 0.4 SOC 2 Type II Readiness

**What:** Assess current controls against SOC 2 Trust Service Criteria.

**Existing Controls That Help:**
- AES-256-GCM encryption (`encryption.ts`)
- Audit trail (`auditTrail.ts`)
- MFA enforcement (Program.cs)
- Rate limiting (appsettings.json)
- Soft-delete with retention policy
- Performance monitoring with SLA thresholds
- Multi-tenant data isolation

**Likely Gaps:**
- Formal change management process documentation
- Vendor risk management program
- Incident response plan (documented but not automated)
- Business continuity / disaster recovery testing
- Employee security training records
- Access review processes (periodic recertification)

---

## Phase 1: Identity & FHIR Core (May - August 2026)

### 1.1 ID.me OIDC Integration

**New Package:** `packages/identity/`

```
packages/identity/
├── src/
│   ├── providers/
│   │   ├── idme.ts          # ID.me OIDC client
│   │   ├── clear.ts         # CLEAR integration (future)
│   │   └── logingov.ts      # Login.gov (future)
│   ├── middleware/
│   │   ├── ial2-verify.ts   # IAL2 level verification middleware
│   │   └── token-exchange.ts # Exchange ID.me tokens for app tokens
│   ├── types.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Integration Points:**

1. **Patient Portal Auth** — Replace Azure AD B2C for patient authentication:
   - `apps/patient-portal/pages/api/auth/[...nextauth].ts` — Add ID.me provider to NextAuth
   - New flow: Patient → ID.me IAL2 → OIDC token → App session

2. **.NET Backend** — Accept ID.me tokens alongside Azure AD B2C:
   - `backend/src/ATTENDING.Orders.Api/Program.cs` — Add second JWT Bearer scheme for ID.me
   - Authority: `https://api.id.me/oidc` (or sandbox equivalent)

3. **Mobile App** — Deep link to ID.me for native verification:
   - `apps/mobile/app/(auth)/` — Add ID.me login option
   - Use expo-auth-session for OIDC flow

**"No Portal Sign-In" Flow:**
```
Patient opens app → App checks for ID.me credential →
  If none: redirect to ID.me for IAL2 verification →
  ID.me returns verified identity (OIDC token) →
  App creates session using verified identity →
  No separate username/password needed
```

**Key Decision:** ID.me OIDC can coexist with Azure AD B2C. Providers continue using B2C (organizational auth). Patients use ID.me (personal identity verification). This dual-auth approach means:
- `Program.cs` needs `AddAuthentication().AddJwtBearer("AzureAdB2C", ...).AddJwtBearer("IDme", ...)`
- NextAuth needs both providers configured
- Authorization policies distinguish provider vs patient roles

### 1.2 FHIR R4 Client Enhancement

**Existing:** `apps/shared/lib/fhir/` has resource mappers for basic FHIR resources.

**Needed:** Full FHIR R4 client with SMART on FHIR authorization for querying CMS-Aligned Networks.

**New Package:** `packages/fhir-client/`

```
packages/fhir-client/
├── src/
│   ├── client/
│   │   ├── FhirClient.ts        # Base FHIR REST client
│   │   ├── SmartClient.ts       # SMART on FHIR 2.0 authorization
│   │   └── BulkDataClient.ts    # Bulk FHIR export ($export)
│   ├── profiles/
│   │   ├── us-core/             # US Core 6.1.0 profile validators
│   │   ├── carin-bb/            # CARIN Blue Button profiles
│   │   └── davinci/             # Da Vinci PDex profiles
│   ├── terminology/
│   │   ├── loinc.ts             # LOINC code lookups
│   │   ├── snomed.ts            # SNOMED CT lookups
│   │   └── rxnorm.ts            # RxNorm lookups
│   ├── network/
│   │   ├── RecordLocator.ts     # Record Locator Service (RLS) client
│   │   └── NetworkDirectory.ts  # CMS-Aligned Network directory
│   ├── consent/
│   │   └── QuerySpecificity.ts  # Patient controls what data to retrieve
│   ├── types.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Backend (.NET) FHIR Enhancement:**

The .NET backend (`ATTENDING.Infrastructure`) should also have FHIR capabilities via Firely SDK:

```
backend/src/ATTENDING.Infrastructure/Fhir/
├── FhirClientFactory.cs         # Creates vendor-specific FHIR clients
├── SmartOnFhirAuthHandler.cs    # SMART App Launch 2.0 (NOT Azure proxy)
├── Profiles/
│   ├── USCorePatientProfile.cs
│   ├── USCoreConditionProfile.cs
│   └── ...
└── Mappers/
    ├── PatientMapper.cs         # Domain ↔ FHIR resource mapping
    ├── ConditionMapper.cs
    └── ...
```

**NuGet Packages Needed:**
- `Hl7.Fhir.R4` (Firely FHIR SDK)
- `Hl7.Fhir.Support` (Firely support)

**Critical: Azure SMART on FHIR Proxy Migration**

The Azure SMART on FHIR proxy retires September 2026. Must implement SMART on FHIR (Enhanced) directly:
- OAuth 2.0 authorization code flow with PKCE
- Patient-level scopes: `patient/*.read`
- Launch context passing for EHR-embedded launch
- Bearer token management with refresh

### 1.3 Patient Consent & Query Specificity

**New Package:** `packages/consent/`

**CMS Requirement:** Patients control what data is retrieved. This means:

1. **Consent UI** in `apps/patient-portal/`:
   - Granular data category selection (medications, labs, conditions, etc.)
   - Per-network consent (choose which CMS-Aligned Networks to query)
   - Revocation capability

2. **Consent Storage** in Prisma schema:
   ```prisma
   model PatientConsent {
     id              String   @id @default(cuid())
     patientId       String
     organizationId  String
     consentType     String   // "fhir-data-access", "ai-analysis", etc.
     dataCategories  String[] // ["medications", "labs", "conditions"]
     networkIds      String[] // Which CMS networks patient authorized
     grantedAt       DateTime
     revokedAt       DateTime?
     expiresAt       DateTime?
     // ... audit fields
   }
   ```

3. **Query Filter** in FHIR client — only request resource types patient has consented to

---

## Phase 2: AI Transparency & Clinical Safety (June - September 2026)

### 2.1 AI Transparency Framework

**New Package:** `packages/ai-governance/`

```
packages/ai-governance/
├── src/
│   ├── disclaimers/
│   │   ├── templates.ts         # Disclaimer text templates
│   │   ├── placement.ts         # Rules for where disclaimers appear
│   │   └── components/          # React components for disclaimers
│   ├── classification/
│   │   ├── ContentClassifier.ts # Clinical guidance vs educational content
│   │   └── ConfidenceGating.ts  # Thresholds for AI output display
│   ├── audit/
│   │   ├── AIRecommendationLog.ts
│   │   └── ModelVersionTracker.ts
│   ├── governance/
│   │   ├── ModelRegistry.ts     # Track AI model versions, training data
│   │   ├── BiasMonitor.ts       # Equity monitoring across populations
│   │   └── SafetyMonitor.ts     # Post-deployment adverse event tracking
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Integration into Existing Services:**

Every AI service in `apps/shared/services/` needs:
1. **Disclaimer wrapper** — Output includes machine-readable classification (clinical/educational)
2. **Model version tracking** — Which model + version generated each output
3. **Confidence gating** — Below threshold = no display without clinician review
4. **Audit event** — Every AI output logged with classification

**Existing `auditTrail.ts` Enhancement:**
- Add `aiModelVersion`, `aiConfidenceScore`, `contentClassification` fields
- Add `clinicianReviewStatus` (pending/approved/flagged/rejected)

### 2.2 Clinician Review Queue

**New App:** `apps/clinician-review/`

**Purpose:** CMS requires "human oversight — clinician review of conversations to identify potential harm."

```
apps/clinician-review/
├── pages/
│   ├── index.tsx              # Dashboard: conversations needing review
│   ├── review/[id].tsx        # Individual conversation review
│   ├── analytics.tsx          # AI safety metrics
│   └── settings.tsx           # Review policies, thresholds
├── components/
│   ├── ConversationViewer.tsx  # Read-only AI conversation display
│   ├── ReviewActions.tsx       # Approve/flag/escalate buttons
│   ├── HarmIndicators.tsx      # AI-detected potential harm markers
│   └── AuditTimeline.tsx       # Full audit trail for conversation
└── package.json
```

**Alternatively:** This could be a section within `apps/provider-portal/` rather than a standalone app. Decision depends on whether clinician reviewers are the same as clinical providers.

### 2.3 NIST AI Risk Management Framework Alignment

**Document:** `docs/compliance/NIST_AI_RMF_ALIGNMENT.md`

Map existing capabilities to NIST AI RMF v1.0 functions:
- **GOVERN** — AI governance policies, roles, accountability
- **MAP** — Context mapping, risk identification
- **MEASURE** — Bias testing, performance monitoring, adverse events
- **MANAGE** — Risk response, incident procedures, model retirement

---

## Phase 3: Certifications (July - December 2026)

### 3.1 SOC 2 Type II Evidence Package

**Controls to Document:**

| Trust Service Criteria | Evidence Source |
|----------------------|----------------|
| CC6.1 - Logical access | Azure AD B2C + MFA, RBAC, multi-tenant isolation |
| CC6.2 - Authentication | JWT Bearer, MFA enforcement, token validation |
| CC6.3 - Authorization | Role-based policies, organization scoping |
| CC6.6 - Encryption | AES-256-GCM at rest, TLS 1.2+ in transit |
| CC7.1 - Change management | GitHub Actions CI/CD, PR reviews |
| CC7.2 - Monitoring | Serilog + App Insights, SLA thresholds, health checks |
| CC7.3 - Incident response | Need to formalize and automate |
| CC8.1 - Risk assessment | Need formal risk assessment process |

### 3.2 DirectTrust CARIN-CFA Evidence

Prepare evidence package for 35-45 hour assessment covering:
- HIPAA Privacy Rule compliance
- HIPAA Security Rule compliance
- Cybersecurity practices
- Secure cloud use (Azure)
- Customer satisfaction processes
- Business practices
- Third-party cloud service provider security

### 3.3 DiMe Seal Application

After SOC 2 Type II is complete:
1. Upload SOC 2 report
2. Upload CARIN attestation
3. Submit WCAG audit results
4. Provide clinical evidence (patent application, safety rules, audit data)
5. Submit equity analysis (demographic breakdowns of AI performance)

---

## Phase 4: Network Integration (October 2026 - February 2027)

### 4.1 CMS-Aligned Network Onboarding

- Target 1-2 networks for initial integration
- Implement Record Locator Service (RLS) queries
- Test FHIR data retrieval with IAL2-verified identities
- Build Bulk Data API support for population-level access

### 4.2 End-to-End Flow

```
Patient → ID.me IAL2 → Attending AI →
  SMART on FHIR auth → CMS-Aligned Network →
  FHIR R4 data retrieval (patient-consented categories) →
  AI analysis with transparency disclaimers →
  Clinician review queue →
  Patient receives personalized guidance
```

---

## New Turborepo Packages Summary

| Package | Purpose | Phase | Estimated Effort |
|---------|---------|-------|-----------------|
| `packages/identity` | ID.me OIDC, IAL2 flows | Phase 1 | 4-8 weeks |
| `packages/fhir-client` | FHIR R4 + SMART on FHIR 2.0 | Phase 1 | 8-16 weeks |
| `packages/consent` | Patient consent management | Phase 1 | 4-6 weeks |
| `packages/ai-governance` | Transparency, classification, audit | Phase 2 | 6-10 weeks |
| `apps/clinician-review` | AI conversation oversight | Phase 2 | 4-8 weeks |

---

## Database Schema Additions (Prisma)

```prisma
// Patient identity verification
model IdentityVerification {
  id              String   @id @default(cuid())
  patientId       String
  provider        String   // "idme", "clear", "logingov"
  ialLevel        String   // "IAL2"
  verifiedAt      DateTime
  expiresAt       DateTime?
  tokenHash       String   // Hashed credential token
  attributes      Json?    // Verified attributes (citizenship, etc.)
  organizationId  String
  // ... audit fields
}

// Patient data consent
model PatientConsent {
  id              String   @id @default(cuid())
  patientId       String
  organizationId  String
  consentType     String
  dataCategories  String[]
  networkIds      String[]
  grantedAt       DateTime
  revokedAt       DateTime?
  expiresAt       DateTime?
  // ... audit fields
}

// AI conversation review
model AIConversationReview {
  id              String   @id @default(cuid())
  conversationId  String
  patientId       String
  reviewerId      String?  // Clinician who reviewed
  status          String   // "pending", "approved", "flagged", "escalated"
  harmIndicators  Json?    // AI-detected potential harm markers
  reviewNotes     String?
  reviewedAt      DateTime?
  organizationId  String
  // ... audit fields
}

// AI model governance
model AIModelVersion {
  id              String   @id @default(cuid())
  modelName       String   // "biomistral", "claude-sonnet-4", etc.
  version         String
  deployedAt      DateTime
  retiredAt       DateTime?
  validationData  Json?    // Performance metrics, bias scores
  organizationId  String
}
```

---

## Critical Path & Dependencies

```
Phase 0 (NOW)
  ├── CMS Pledge (immediate, no dependency)
  ├── CARIN Self-Attestation (immediate)
  ├── SOC 2 Scoping → SOC 2 Observation Period → SOC 2 Report (9-12 months)
  │                                                    └──→ DiMe Seal Application
  ├── WCAG Audit → Remediation → Re-audit
  ├── DirectTrust Application → Evidence Gathering → Assessment
  └── ID.me Sandbox Access → Phase 1

Phase 1 (May-Aug)
  ├── ID.me OIDC Integration
  ├── FHIR R4 Client (Firely SDK + TypeScript)
  ├── SMART on FHIR Enhanced (replaces Azure proxy)
  └── Patient Consent System

Phase 2 (Jun-Sep)
  ├── AI Governance Package
  ├── Clinician Review App
  └── NIST AI RMF Documentation

Phase 3 (Jul-Dec)
  ├── SOC 2 Type II Complete
  ├── DirectTrust CARIN-CFA Complete
  ├── DiMe Seal (after SOC 2)
  └── Medicare App Library Application

Phase 4 (Oct-Feb 2027)
  ├── CMS-Aligned Network Onboarding
  └── Production Launch
```

**Critical Path:** SOC 2 Type II is the longest lead-time item and gates the DiMe Seal. Start immediately.

---

*This plan should be updated as implementation progresses. Each phase should have its own feature branch and PR strategy.*
