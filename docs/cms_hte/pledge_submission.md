# CMS Health Technology Ecosystem — Pledge Submission

**Organization:** ATTENDING AI LLC
**Contact:** Scott Isbell, MD — Founder
**Website:** https://attendingai.health
**Pledge Category:** IV. Patient Facing Apps
**Use Cases:** Conversational AI Assistants + Kill the Clipboard
**Target Inclusion:** Medicare App Library — July 2026

---

## Organization overview (≤150 words)

ATTENDING AI is a physician-founded clinical decision support platform designed for rural and resource-constrained healthcare settings. Built by a practicing family physician, our mission is to enhance — not replace — clinical expertise by automating the information-gathering burden that consumes 80% of a physician's day.

Our flagship product, COMPASS (Clinical Orientation and Multi-symptom Patient Acuity Screening System), enables patients to arrive at visits with their complete symptom history, red-flag screening, and longitudinal record already assembled. Physicians receive a pre-visit clinical summary; patients never repeat their history. The system is covered by USPTO Application #19/215,389 and is aligned with the Rural Healthcare Transformation Program (Initiative 6: Digital Health & Technology).

ATTENDING AI is designed to meet every CMS Interoperability Framework criterion from day one, with rural physicians as the primary beneficiaries.

---

## Use Case 1 — Conversational AI Assistants

### How we meet each criterion

**"Personalized AI-driven support across the patient's clinical record — including symptom checking, care planning, coordination, and chronic disease support."**

COMPASS provides a structured, physician-designed symptom intake flow that adapts to the patient's presenting concern, medical history, medications, and prior encounters. The system performs:

- **Symptom checking** with 14 evidence-based red-flag patterns across 18 emergency conditions (stroke, MI, sepsis, anaphylaxis, PE, ectopic pregnancy, DKA, meningitis, etc.)
- **Care planning** via differential diagnosis generation surfaced to the clinician (never the patient) using physician-validated Bayesian reasoning
- **Coordination** through pre-visit summaries delivered to the provider before the patient walks in
- **Chronic disease support** via longitudinal symptom trend analysis and medication adherence tracking

**"Must either connect to a CMS Aligned Network directly or via a personal health record application."**

ATTENDING AI implements SMART on FHIR 2.0 with PKCE in the `@attending/fhir-client` package. The client supports US Core 6.1.0 profiles and queries the 12 CMS HTE data categories (demographics, conditions, medications, allergies, labs, vitals, encounters, procedures, immunizations, documents, claims, imaging). We will connect directly to CMS Aligned Networks as they are designated, and will publish our network participation list publicly.

**"Responses must clearly indicate when results are AI-generated and include appropriate disclaimers when not intended to replace clinical judgment."**

Every AI-generated response is tagged with a machine-readable `contentClassification` (`emergency`, `clinical-guidance`, `educational`, `informational`) and a human-readable disclaimer emitted by the `@attending/ai-governance` package. Disclaimers are category-specific: educational content carries a "general health information" notice; clinical-guidance content displays "AI-assisted — review with your clinician"; emergency-classified content displays "Call 911 immediately" and escalates to the physician dashboard in real time. All disclaimers include the model name, version, and confidence score. This is implemented in `packages/ai-governance/src/disclaimers.ts` and covered by 16 unit tests.

**"Conversational AI tools will clearly distinguish educational content from clinical guidance, assist patients directly when appropriate, and guide them to care from a health professional when needed."**

The `ContentClassifier` in `@attending/ai-governance` classifies every AI output into one of four categories before it reaches the patient. Emergency-classified content triggers immediate escalation to a clinician and displays crisis resources. Clinical-guidance content requires clinician review (tracked in the `AIConversationReview` table) before patient delivery. Educational content is auto-approved with disclaimers. The classifier is deterministic (keyword + context signals) and covered by 15 unit tests.

**"Be implemented and operate in a manner consistent with HIPAA Rules."**

ATTENDING AI operates under HIPAA as a business associate. We will execute BAAs with all CMS Aligned Networks and patient-facing deployments. Our infrastructure implements field-level PHI encryption (AES-256-GCM), soft-delete audit trails, SOC 2 Type II controls (in progress via Vanta), and role-based access with short-lived JWTs.

### Beyond the minimum

- **Clinician oversight of AI outputs** — every clinical-guidance recommendation is logged to `AIConversationReview` with review status, harm indicators, and reviewer identity. This satisfies the CMS "human oversight — clinician review of conversations to identify potential harm" requirement.
- **AI model registry** — the `AIModelVersion` table tracks every deployed model with validation data (accuracy, precision, recall, F1, AUC), bias assessment, and safety record, satisfying NIST AI RMF documentation requirements.
- **Red flag detection** — 14 patterns across 18 emergency conditions are hard-coded and never rely on LLM reasoning alone; deterministic rules fire regardless of model availability.

---

## Use Case 2 — Kill the Clipboard

### How we meet each criterion

**"Digital credentials generated through a CMS-approved service for IAL2 or equivalent (e.g., mDLs) and AAL2 (e.g., passkeys)."**

- **IAL2** is implemented via ID.me OIDC integration in `@attending/identity` (`packages/identity/src/providers/idme.ts`). The provider validates the `ial` claim against NIST 800-63A IAL2, with 14 unit tests covering success, IAL1 rejection, provider errors, and verified-credential fallback. Login.gov support is architected in the same package for government-issued alternatives.
- **AAL2** is implemented via WebAuthn Level 3 / FIDO2 passkeys in `@attending/identity/passkeys` (`packages/identity/src/passkeys/webauthn-service.ts`). The service orchestrates registration and authentication ceremonies with user-verification enforced, counter-replay detection, and single-use challenges. Covered by 16 unit tests.

**"Enable patients to transmit information using FHIR, including their digital insurance card and health history."**

SMART on FHIR 2.0 client in `@attending/fhir-client` supports the full US Core 6.1.0 profile set. Patients authorize data access via the `@attending/consent` package, which tracks granular consent by data category (12 CMS HTE categories) and by network. Consent is immutable-append audit-logged and backed by the `PatientConsent` table.

**"Allow patients to retrieve a summary of their visit from the provider at the end of the encounter in FHIR format."**

The COMPASS post-visit workflow delivers a FHIR `DocumentReference` + `Encounter` + `Observation` bundle to the patient's consented destination (personal health record app, provider portal, or direct download). Visit summaries are generated from the physician's signed note and include diagnoses (Condition), orders (ServiceRequest), and instructions (CommunicationRequest).

**"Must retrieve patient health records from a CMS Aligned Network using FHIR."**

Same `SmartFhirClient` discovery → PKCE → token exchange → FHIR Bundle fetch pipeline used for Conversational AI data access. Authentication is unified: one IAL2 verification, one AAL2 session, consent grants scoped per network.

### Beyond the minimum

- **Zero-keystroke check-in** — patients who complete COMPASS before their visit have zero intake paperwork at the clinic. The provider receives a pre-populated encounter draft via FHIR `Encounter.preAdmissionIdentifier`, eliminating duplicate data entry.
- **Offline-capable** — COMPASS operates in low-bandwidth rural settings with progressive sync, so patients in broadband-limited areas are not excluded from the CMS HTE ecosystem.

---

## Technical readiness snapshot (as of 2026-04-11)

| Capability | Package | Test coverage | Status |
|---|---|---|---|
| IAL2 OIDC (ID.me) | `@attending/identity` | 14 tests | Code complete; ID.me sandbox pending |
| IAL2 middleware | `@attending/identity` | 16 tests | Ready |
| AAL2 WebAuthn passkeys | `@attending/identity` | 16 tests | Ceremony logic complete; crypto verifier pluggable |
| SMART on FHIR 2.0 client | `@attending/fhir-client` | 14 tests | Ready |
| US Core resource mapping | `@attending/fhir-client` | 7 tests | Ready |
| Patient consent management | `@attending/consent` | 18 tests | Ready |
| Consent Prisma adapter | `@attending/consent` | 12 tests | Ready |
| AI content classification | `@attending/ai-governance` | 15 tests | Ready |
| AI disclaimers | `@attending/ai-governance` | 16 tests | Ready |
| Clinician review logging | `@attending/ai-governance` | 10 tests | Ready |
| AI model registry | `@attending/ai-governance` | 15 tests | Ready |
| CMS HTE database models | Prisma | — | Migration authored |

**Total: 153 passing tests across 4 CMS HTE-aligned packages.**

### Gaps to production (pre-July 2026 deadline)

- [ ] ID.me sandbox organization provisioning (contact form submitted 2026-04-11)
- [ ] ID.me production partnership agreement + BAA
- [ ] CMS Aligned Network partner identified + integration tested
- [ ] SOC 2 Type II audit (Vanta engagement pending)
- [ ] CARIN CFA Code of Conduct self-attestation
- [ ] Patient-facing WebAuthn verifier wired to `@simplewebauthn/server` (or equivalent)
- [ ] CMS discovery experience integration (app store listing)
- [ ] Medicare beneficiary free-tier policy published

---

## Security checklist (required by pledge)

| Control | Implementation |
|---|---|
| Encryption in transit | TLS 1.3 minimum, HSTS enforced |
| Encryption at rest | AES-256-GCM field-level for PHI |
| Identity proofing | IAL2 via ID.me (NIST SP 800-63A) |
| Authentication | AAL2 via WebAuthn passkeys (NIST SP 800-63B) |
| Audit logging | Append-only audit trail on consent, FHIR access, AI recommendations |
| Access control | RBAC with short-lived JWTs, claims-based tool authorization |
| Vulnerability management | Dependabot + npm audit in CI |
| Penetration testing | Third-party engagement scheduled pre-production launch |
| Incident response | Documented runbook aligned with NIST SP 800-61 |
| Risk assessment | Annual, documented, vendor register maintained |
| SOC 2 Type II | Control design complete; audit observation window planned Q3 2026, report Q4 2026 |
| HIPAA compliance | BAA template prepared; field-level PHI encryption enforced; audit trails mandatory |
| NIST AI RMF | AI model registry, bias assessment, harm tracking |

---

## Data source disclosure

ATTENDING AI will disclose all data sources accessed via CMS Aligned Networks in our privacy policy and app store listing, per CMS transparency requirements:

- **FHIR R4 data sources:** Partner CMS Aligned Networks (TBD), SMART on FHIR 2.0 with US Core 6.1.0
- **AI models:** Anthropic Claude (Claude Sonnet 4.6), BioMistral-7B (self-hosted), deterministic rule engines for red-flag detection
- **No third-party data sale** — all patient data access is strictly for the patient's own care

---

## Commitment

ATTENDING AI LLC commits to:

1. Meet every CMS Interoperability Framework criterion for Patient Facing Apps — Conversational AI Assistants and Kill the Clipboard — by the July 2026 Medicare App Library launch
2. Publish our data sources, terms of service, privacy policy, and security checklist publicly
3. Participate in CMS review and respond to any remediation requests within 30 days
4. Offer free trial access to Medicare beneficiaries
5. Participate in the CMS discovery experience and app store listing
6. Operate in a manner consistent with HIPAA Rules as a HIPAA business associate
7. Maintain IAL2 + AAL2 identity assurance for all patient data access
8. Publish disclaimers on all AI-generated clinical guidance
9. Track and act on clinician harm review signals
10. Report adverse events through the AI governance pipeline

**Pledge authorized by:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Date:** 2026-04-11
