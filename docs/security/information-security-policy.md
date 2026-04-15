# Information Security Policy

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**Review Cadence:** Annual, or upon material change to the system or threat landscape
**Supersedes:** None (initial)

---

## 1. Purpose

This policy establishes the information security program of **ATTENDING AI LLC**. It defines the principles, responsibilities, and minimum controls required to protect the confidentiality, integrity, and availability of systems and data — particularly **Protected Health Information (PHI)** — that ATTENDING AI stores, processes, or transmits in connection with the COMPASS clinical decision support platform and related services.

## 2. Scope

This policy applies to:

- All personnel, contractors, and agents acting on behalf of ATTENDING AI LLC
- All ATTENDING AI-owned or managed information systems, including the GitHub repository `La6kers/ATTENDING`, Azure subscriptions, SaaS vendor accounts, and development endpoints
- All data classified as **PHI**, **Confidential**, **Internal**, or **Public** (see `data-classification-policy.md`)
- All third-party vendors and processors that access ATTENDING AI data (see `vendor-management.md`)

## 3. Security Principles

ATTENDING AI's information security program is grounded in:

1. **Defense in depth** — multiple independent controls rather than reliance on any single safeguard
2. **Least privilege** — users and services are granted only the minimum access required to perform their function
3. **Secure by default** — systems are configured to their most secure setting first; exceptions require justification
4. **HIPAA Security Rule alignment** (45 CFR §164.306 et seq.) — administrative, physical, and technical safeguards
5. **NIST SP 800-53 Rev. 5** control alignment where applicable
6. **NIST AI Risk Management Framework (AI RMF 1.0)** for AI-specific controls
7. **Physician-designed, clinically validated** — security controls must not impede urgent clinical workflows

## 4. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **CEO / Founder (Scott Isbell, MD)** | Overall accountability for information security. Approves this policy and material exceptions. |
| **Security Officer** *(currently the Founder)* | Implements and maintains the security program. Reviews controls, incidents, and audit findings. Until headcount grows, this role is held by the Founder. |
| **Privacy Officer** *(currently the Founder)* | HIPAA Privacy Rule compliance, breach notification, patient rights. |
| **All Personnel** | Complete annual security awareness training. Report suspected incidents immediately. Adhere to the Acceptable Use Policy. |
| **Contractors / Business Associates** | Sign a Business Associate Agreement (BAA) before receiving access to PHI. Comply with all policies in this bundle. |

## 5. Minimum Controls

### 5.1 Access control
- Multi-factor authentication (MFA) is required on all admin and developer accounts for GitHub, Azure, Google Workspace, and any SaaS holding ATTENDING AI data.
- Production data access is role-based and least-privilege; see `access-control-policy.md`.
- Access is reviewed quarterly.
- Personnel who leave the company have access revoked within 24 hours.

### 5.2 Encryption
- **In transit:** TLS 1.2 minimum (TLS 1.3 preferred) for all external interfaces. HSTS enforced on public domains.
- **At rest:** AES-256 disk-level encryption on all production storage. PHI fields additionally encrypted at the application layer with AES-256-GCM using keys managed via Azure Key Vault.
- Development laptops encrypt local disks (BitLocker on Windows, FileVault on macOS).

### 5.3 Software development lifecycle
- All production code changes flow through GitHub Pull Requests on `La6kers/ATTENDING`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build verification on every PR.
- Security scanning (`.github/workflows/security-scan.yaml`) runs **npm audit**, **GitHub CodeQL** (JavaScript/TypeScript and C#), and **Gitleaks** secret scanning on every push to `main` / `mockup-2` and weekly on a schedule.
- Husky pre-commit hook runs local lint and type checks before every commit.
- See `change-management-policy.md` for full SDLC controls.

### 5.4 Vulnerability management
- Dependabot alerts are enabled on the GitHub repository.
- `npm audit --omit=dev --audit-level=high` runs in CI on every push.
- CodeQL static analysis runs on every push covering JavaScript/TypeScript/C#.
- Critical severity findings are remediated within **7 days**; high within **30 days**; medium within **90 days**.
- Third-party penetration testing is performed at least **annually** and prior to any production launch.

### 5.5 Logging and monitoring
- All PHI access is logged through the Prisma audit-trail mechanism with append-only semantics.
- Application, authentication, and access logs are retained for a minimum of **6 years** to satisfy HIPAA documentation requirements.
- Failed authentication attempts and privilege escalations trigger operator alerts.

### 5.6 Incident response
- Security incidents are managed under `incident-response-plan.md`.
- Breach notification follows HIPAA Breach Notification Rule (45 CFR §§164.400–414): affected individuals notified within **60 days** of discovery.

### 5.7 Backup and recovery
- Production databases are backed up daily with point-in-time recovery for 7 days minimum.
- Backups are encrypted at rest.
- Restore procedures are tested at least annually. See `backup-and-recovery-plan.md`.

### 5.8 Risk management
- A formal risk assessment is conducted annually or upon material change. See `risk-assessment.md`.
- Vendor risks are reviewed annually. See `vendor-management.md`.

### 5.9 Personnel security
- All personnel sign the Acceptable Use Policy before receiving system access.
- Personnel with PHI access complete HIPAA and security awareness training annually.
- Background checks are performed on personnel with access to production PHI (required once the company hires employees or contractors).

### 5.10 AI governance
- All AI model versions are recorded in the `AIModelVersion` registry with validation data, bias assessment, and safety record.
- AI-generated clinical guidance is classified (`emergency`, `clinical-guidance`, `educational`, `informational`) and subject to clinician review under the `AIConversationReview` workflow.
- The AI governance controls are implemented in `packages/ai-governance` and covered by automated tests.

## 6. Exceptions

Exceptions to this policy must be:

1. Documented in writing with justification, compensating controls, and expiration date
2. Approved by the Security Officer
3. Reviewed at least quarterly

## 7. Enforcement

Violations of this policy may result in loss of system access, contract termination, or legal action depending on severity and intent. Willful violations involving PHI are subject to HIPAA civil and criminal penalties.

## 8. Related Documents

- `access-control-policy.md`
- `acceptable-use-policy.md`
- `backup-and-recovery-plan.md`
- `business-continuity-plan.md`
- `change-management-policy.md`
- `data-classification-policy.md`
- `incident-response-plan.md`
- `risk-assessment.md`
- `vendor-management.md`

## 9. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy |
