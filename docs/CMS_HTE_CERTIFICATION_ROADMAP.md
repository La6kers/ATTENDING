# CMS Health Technology Ecosystem (HTE) — Certification Roadmap for Attending AI

**Prepared:** April 8, 2026
**For:** Dr. Scott Isbell, CEO & Physician-Founder, ATTENDING AI

---

## Executive Summary

The CMS Health Technology Ecosystem (HTE) is a public-private initiative launched July 30, 2025 to modernize healthcare data flows among patients, providers, payers, and technology platforms. CMS has set a **July 4, 2026** hard deadline for CMS-Aligned Networks to expose FHIR APIs with record locator services, and the **Medicare App Library** is expected to launch before that date, providing access to 68 million Medicare beneficiaries.

Attending AI — with its AI-powered clinical decision support, symptom checking, differential diagnosis, and care planning capabilities — is strongly positioned for the **Conversational AI Assistant** category within the HTE. This document details every certification, standard, and integration required to participate, with a prioritized roadmap and cost estimates.

---

## 1. CMS HTE Program Overview

The HTE is **not a regulation** — it is a CMS-led voluntary initiative with strong industry backing from 60+ companies (including Anthropic, Amazon, Apple, Google, Epic, CLEAR, and ID.me) and 600+ healthcare organizations that have signed the CMS interoperability pledge.

### Key Milestones

| Date | Milestone |
|------|-----------|
| July 30, 2025 | HTE announced with 60+ company commitments |
| Q1 2026 | Early adopter apps begin launching with digital identity integration |
| February 2026 | DiMe Seal selected as required credential for Medicare App Library; DirectTrust CARIN-CFA recognized as evaluation pathway |
| April 1, 2026 | CMS ACCESS Model application deadline |
| July 1, 2026 | CMS ACCESS Model begins (10-year chronic care payment model) |
| **July 4, 2026** | **Hard deadline**: CMS-Aligned Networks must expose FHIR APIs + record locator service |
| January 1, 2027 | Patient Access, Provider Access, and Payer-to-Payer APIs go live (CMS-0057-F) |

### Conversational AI Requirements (CMS-Defined)

1. **Identity verification** via CMS-approved service (CLEAR, ID.me, or Login.gov) at IAL2 level
2. **Digital credentials** — issue and maintain tokens for network data retrieval
3. **App certification** — CARIN Code of Conduct + DirectTrust accreditation OR DiMe Seal
4. **No portal sign-in** — all authentication through verified digital identity
5. **Query specificity** — patients control what data is retrieved
6. **Personalized AI guidance** using retrieved health records
7. **AI transparency** with disclaimers distinguishing clinical guidance from educational content
8. **Human oversight** — clinician review of conversations to identify potential harm

---

## 2. DirectTrust Certification

### Relevant Programs

- **Health App Accreditation Program** — HIPAA Privacy/Security, cybersecurity, secure cloud. Must score 85%+ with all mandatory criteria.
- **CARIN-CFA Accreditation** — Combined CARIN Code of Conduct + DirectTrust. CMS-recognized evaluation pathway for Medicare App Library. **Most strategic for Attending AI.**
- **New AI Program (Beta, 2026)** — Based on NIST AI RMF v1.0. Worth monitoring.

### Cost & Timeline

- **Year 1:** ~$5,600 (Annual Fee + Assessment Fee)
- **Accreditation validity:** 2 years
- **Timeline:** 4-8 months (max 8 months from application)
- **Assessment effort:** 35-45 hours of dedicated human Assessor time

---

## 3. DiMe Seal

CMS-required credential for Medicare App Library entry.

### Evaluation Domains

1. Clinical Evidence
2. Privacy & Security
3. Usability & Accessibility
4. Equity

### Prerequisites

- SOC 2 Type II
- HITRUST (or equivalent)
- CARIN Code of Conduct
- WCAG compliance
- ISO 27001

### Cost

- Initial: $1,799
- Annual renewal: $899
- **Critical dependency:** SOC 2 Type II ($20K-$100K, 3-12 months)

---

## 4. CARIN Code of Conduct

### Two Compliance Pathways

| Path | Cost | Verification | CMS Recognition |
|------|------|-------------|-----------------|
| **A: Self-Attestation** | Free | None | Not sufficient for Medicare App Library |
| **B: DirectTrust CARIN-CFA** | ~$5,600 | Independent assessment | CMS-recognized pathway |

**Recommendation:** Pursue Path B (DirectTrust CARIN-CFA).

---

## 5. IAL2 Identity Verification

### CMS-Approved Services

| Service | Users | Integration |
|---------|-------|-------------|
| **ID.me** (Recommended) | 130M+ | OIDC, SAML 2.0, OAuth 2.0 |
| **CLEAR** | 39M+ | API-based, Epic integration |
| **Login.gov** | Gov-operated | OIDC, SAML 2.0 |

**Recommendation:** Start with ID.me — broadest user base, mature SDKs, CMS contract.

---

## 6. FHIR Standards

### Required

- **FHIR R4 (4.0.1)** — mandated baseline
- **US Core 6.1.0+** — USCDI v3 (required Jan 1, 2026)
- **SMART App Launch 2.0** — required for API access
- **CARIN IG for Blue Button v2.1.0** — claims/encounter data

### Azure Note

Microsoft's SMART on FHIR proxy retiring September 2026. Must transition to SMART on FHIR (Enhanced).

---

## 7. Cost Estimates

### Total Investment

| Scenario | Range |
|----------|-------|
| Minimum (DiMe Seal path, lean) | $150,000-$250,000 |
| Recommended (both paths) | $250,000-$450,000 |
| Comprehensive (full stack) | $400,000-$700,000 |

---

## 8. Prioritized Roadmap

### Phase 0: Foundation (Now - May 2026) — 8 weeks
- Sign CMS Interoperability Pledge
- Self-attest CARIN Code of Conduct
- Privacy policy rewrite
- SOC 2 Type II readiness assessment
- WCAG accessibility audit
- Begin DirectTrust CARIN-CFA application
- ID.me sandbox access

### Phase 1: Identity & FHIR Core (May - August 2026) — 12 weeks
- ID.me OIDC integration
- FHIR R4 client (Firely SDK)
- US Core profile support
- SMART on FHIR (Enhanced)
- Patient consent & query controls

### Phase 2: AI Transparency & Clinical Safety (June - September 2026) — 12 weeks
- AI transparency disclaimers
- Clinical vs educational content separation
- Clinician review queue
- Audit logging for AI recommendations
- NIST AI RMF alignment

### Phase 3: Certifications (July - December 2026) — 24 weeks
- Complete SOC 2 Type II
- DirectTrust CARIN-CFA evidence package
- DiMe Seal application
- WCAG remediation
- Medicare App Library application

### Phase 4: Network Integration & Launch (October 2026 - February 2027) — 16 weeks
- CMS-Aligned Network onboarding
- Record Locator Service queries
- End-to-end testing
- Production launch for Medicare beneficiaries

---

## 9. Architecture Considerations

### Current Stack Gaps

| Component | Current | HTE Requirement | Gap |
|-----------|---------|-----------------|-----|
| Auth | Azure AD B2C | IAL2 via ID.me | Add ID.me OIDC provider |
| Backend | .NET 8 | FHIR R4 client | Add Firely .NET SDK |
| Database | SQL Server/Prisma | FHIR data model | FHIR resource tables |
| Frontend | Next.js | AI transparency UX | Disclaimer components |
| Cloud | Azure | SMART on FHIR Enhanced | Migrate from retiring proxy |

### Suggested New Packages (Turborepo)

- `packages/fhir-client` — FHIR R4 via Firely SDK, US Core profiles
- `packages/identity` — ID.me OIDC, IAL2 verification flows
- `packages/consent` — Patient consent, query specificity
- `packages/ai-governance` — Transparency, classification, audit
- `apps/clinician-review` — AI conversation oversight dashboard

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SOC 2 Type II >12 months | Medium | High | Start immediately; accelerated auditors |
| CMS changes requirements | Medium | Medium | Pursue both DiMe + CARIN-CFA |
| FHIR implementation overrun | Medium | High | Use Firely SDK; consider Azure FHIR Service |
| Azure SMART proxy retirement | High | High | Migrate to Enhanced in Phase 1 |
| FDA regulatory classification | Medium | Very High | Monitor FDA TEMPO; engage counsel |

---

## 11. This Week's Actions

1. Sign CMS Interoperability Pledge
2. Self-attest CARIN Code of Conduct (MyHealthApplication.com)
3. Register for DiMe Seal developer info
4. Request ID.me sandbox access
5. Begin SOC 2 Type II scoping (Drata/Vanta/Secureframe)
6. Start DirectTrust CARIN-CFA application

---

*Review quarterly as CMS HTE requirements evolve.*
