# Data Classification Policy

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11

---

## 1. Purpose

This policy defines how ATTENDING AI LLC classifies data according to sensitivity so that appropriate handling, encryption, access, retention, and disposal controls are applied consistently.

## 2. Classification Levels

| Level | Definition | Examples | Minimum Controls |
|---|---|---|---|
| **PHI (Regulated)** | Protected Health Information as defined by HIPAA 45 CFR §160.103 — individually identifiable health information | Patient symptoms, diagnoses, medications, labs, vitals, encounter notes, FHIR bundles, AI conversation transcripts that reference a specific patient | Field-level AES-256-GCM encryption at rest; TLS 1.2+ in transit; BAA with every processor; audit trail on every access; 6-year retention minimum per HIPAA; breach notification if compromised |
| **Confidential** | Non-PHI data whose disclosure would harm ATTENDING AI LLC or its partners | Application secrets, API keys, encryption keys, unreleased patent material, financial records, customer contracts, employee records (future) | Azure Key Vault or equivalent secrets manager; least-privilege access; MFA required; no committing to source; encrypted at rest |
| **Internal** | Day-to-day operational data not intended for public release | Source code, architecture docs, CI logs, internal meeting notes, business metrics | Private GitHub repo; signed-in access only; encrypted at rest on Azure; no public sharing |
| **Public** | Information intentionally published | Marketing site (`attendingai.health`), public pledge documents, press releases, patent-application public filings | No confidentiality controls; integrity verified via version control |

## 3. Handling Rules

### 3.1 PHI-specific rules
- PHI is never written to application logs, stdout, stderr, error reports, or crash dumps. Application logging utilities MUST use the PHI-redaction helpers (`apps/shared/logging` or equivalent) before emitting.
- PHI is never transmitted to third-party services without an executed BAA and a least-necessary data contract.
- AI prompts sent to LLMs (Claude, BioMistral) must be assessed for whether they contain PHI; if they do, the destination LLM provider must have a BAA, or the prompt must be de-identified per HIPAA §164.514(b).
- PHI is never placed in URLs, query strings, referrer headers, or HTTP GET requests.
- PHI in analytics, telemetry, or error tracking is strictly prohibited.

### 3.2 Confidential-specific rules
- Secrets are stored in Azure Key Vault in production and `.env.local` (git-ignored) in development
- Secrets are loaded via environment variables at process start; they are not logged, printed, or serialized
- Gitleaks in `.github/workflows/security-scan.yaml` scans for accidental secret commits on every push and weekly
- Secrets are rotated at least annually and immediately upon suspected compromise

### 3.3 Internal-specific rules
- Source code lives in the private GitHub repository `La6kers/ATTENDING`
- Forks and public mirrors are prohibited without Founder approval
- Internal documentation is stored in-repo under `docs/`

### 3.4 Public-specific rules
- Content on `attendingai.health` is subject to the brand and messaging guidelines in the project `CLAUDE.md`
- Public documents must not contain PHI, secrets, or unreleased patent details

## 4. Labeling

Documents containing Confidential or PHI data SHOULD carry a header labeling the sensitivity. File paths under `docs/security/`, `docs/cms_hte/`, and `prisma/` are implicitly classified as Internal unless a stricter level applies.

## 5. Retention & Disposal

| Data type | Retention | Disposal method |
|---|---|---|
| PHI | Minimum 6 years from the later of creation or last effective use (HIPAA §164.530(j)) | Cryptographic erasure (delete encryption keys) + logical deletion |
| Audit logs | Minimum 6 years (HIPAA) | Archive then cryptographic erasure |
| Backups | 30 days point-in-time + quarterly archival for 6 years | Encrypted backup deletion; storage media is cloud-managed (Azure) |
| Application logs (non-PHI) | 90 days operational, 1 year archival | Automated rotation |
| Source code | Retained indefinitely | N/A |
| Financial / tax records | 7 years | Shredding / secure deletion |
| Confidential business records | Per contractual obligation | Secure deletion |

## 6. Cross-Border Transfers

PHI is processed in Azure US regions only. Data is not transferred outside the United States without an explicit data transfer agreement and a documented legal basis.

## 7. Related Documents

- `information-security-policy.md`
- `access-control-policy.md`
- `vendor-management.md`
- `backup-and-recovery-plan.md`

## 8. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy |
