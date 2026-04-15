# Incident Response Plan

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**Aligned with:** NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide)
**HIPAA:** 45 CFR §164.308(a)(6), §§164.400–414

---

## 1. Purpose

This plan defines how ATTENDING AI LLC identifies, contains, eradicates, recovers from, and learns from security incidents — particularly those involving Protected Health Information (PHI).

## 2. Definitions

- **Event:** any observable occurrence in a system or network.
- **Security event:** an event with negative security implications (e.g., failed login burst, malware signature).
- **Security incident:** a confirmed violation or imminent threat of violation of security policies, acceptable use, or standard security practices.
- **Breach:** under HIPAA, an unauthorized acquisition, access, use, or disclosure of unsecured PHI that compromises its security or privacy (45 CFR §164.402).

## 3. Roles

| Role | Current Holder | Responsibility |
|---|---|---|
| **Incident Commander** | Scott Isbell, MD | Declares incidents, coordinates response, decides on external notification. |
| **Security Officer** | Scott Isbell, MD | Technical investigation and containment. |
| **Privacy Officer** | Scott Isbell, MD | HIPAA breach analysis, patient notification decisions. |
| **Legal** | External counsel (on retainer) | Legal review of disclosures, law enforcement liaison. |
| **Communications** | Founder + external PR (if needed) | Public statements, customer notification. |

When headcount grows, these roles will be split and documented on the `docs/security/contacts.md` page.

## 4. Incident Severity Classification

| Severity | Definition | Example | Response time (acknowledgment) |
|---|---|---|---|
| **SEV-1 (Critical)** | Active compromise of PHI, ransomware, public exposure, or clinical safety impact | Ransomware in production, database dump published, red-flag detection misfiring | **15 minutes** |
| **SEV-2 (High)** | Confirmed compromise or exploit with contained blast radius | Stolen developer credentials, successful SQL injection on non-prod | **1 hour** |
| **SEV-3 (Medium)** | Suspicious activity requiring investigation but no confirmed compromise | Unusual login pattern, failing CodeQL finding, phishing email received | **4 hours** |
| **SEV-4 (Low)** | Policy violation or minor misconfiguration | Missing MFA on a non-prod account, outdated dep with no known exploit | **1 business day** |

## 5. Response Lifecycle (NIST SP 800-61)

### 5.1 Preparation
- This plan is reviewed annually.
- Contact list (`docs/security/contacts.md`) is kept current.
- CI security scanning (`.github/workflows/security-scan.yaml`) runs weekly and on every push.
- Developer machines have disk encryption, MFA, and automatic security updates.
- Backups are tested quarterly per `backup-and-recovery-plan.md`.

### 5.2 Detection & Analysis
Sources of detection include:
- Automated alerts from GitHub Dependabot, CodeQL, and Gitleaks
- Azure Defender for Cloud alerts
- Application audit logs (Prisma audit trails)
- User reports (personnel, customers, patients)
- Third-party disclosures (security researchers, ID.me, FHIR partners)

Upon detection, the Security Officer:
1. Logs the event in `docs/security/incidents/YYYY-MM-DD-{slug}.md`
2. Assigns a severity per §4
3. Notifies the Incident Commander (severity SEV-1 and SEV-2 always; SEV-3 if escalating)
4. Collects preliminary evidence (logs, snapshots, affected resources)

### 5.3 Containment
**Short-term containment** (stop the bleeding):
- Revoke compromised credentials via GitHub, Azure AD, and NextAuth sessions
- Rotate affected secrets (Azure Key Vault, NEXTAUTH_SECRET, API keys)
- Isolate affected containers or App Service instances
- Block malicious IPs at the Azure Front Door / WAF layer
- Freeze deployments on `main` until root cause is understood

**Long-term containment** (before eradication):
- Create forensic snapshots of affected systems before any cleanup
- Preserve logs with timestamps intact
- Document every action taken and by whom

### 5.4 Eradication
- Remove malware, backdoors, unauthorized accounts, and malicious code
- Patch the root cause vulnerability
- Re-deploy clean container images from known-good git commits
- Confirm Gitleaks, CodeQL, and `npm audit` pass on the remediated code

### 5.5 Recovery
- Restore production from verified-clean backups where necessary (see `backup-and-recovery-plan.md`)
- Monitor for recurrence for a minimum of 7 days
- Return to normal operations only after the Incident Commander explicitly declares recovery

### 5.6 Post-Incident (Lessons Learned)
Within **14 days** of incident closure, a post-incident review produces:
- Timeline of detection, response, and resolution
- Root cause analysis (5 whys or similar)
- Control failures and gaps
- Corrective actions with owners and due dates
- Update to this plan if deficiencies are found

## 6. HIPAA Breach Determination Workflow

If PHI may have been involved, the Privacy Officer performs a **four-factor risk assessment** per 45 CFR §164.402:

1. Nature and extent of PHI involved (identifiers, clinical sensitivity)
2. Unauthorized person who used or received the PHI
3. Whether the PHI was actually acquired or viewed
4. Extent to which the risk has been mitigated

If the assessment concludes there is **more than a low probability** that PHI was compromised, a breach is declared and the Breach Notification Rule applies:

| Audience | Deadline | Method |
|---|---|---|
| **Affected individuals** | Within **60 calendar days** of discovery | First-class mail, or email if the individual has agreed |
| **HHS Office for Civil Rights** | Within **60 days** (breach affecting fewer than 500) as an annual summary; immediately if ≥500 | https://ocrportal.hhs.gov/ocr/breach/ |
| **Prominent media outlets** | Within **60 days** if ≥500 residents of a state/jurisdiction affected | Press release |
| **Business associates must notify covered entities** | Within **60 days** | Written notification |

All notifications and determinations are logged in the incident file.

## 7. Communication Protocols

- **Internal channel:** encrypted messaging (Signal or equivalent) during active SEV-1/SEV-2. Never discuss incident specifics in public repositories, issue comments, or unencrypted email.
- **Customer notification:** drafted by Privacy Officer, reviewed by legal, approved by Incident Commander before sending.
- **Law enforcement:** engaged if the incident involves suspected criminal activity, at the discretion of the Incident Commander with legal counsel.
- **Regulators:** OCR (HHS) for HIPAA breaches; CMS if the incident impacts CMS HTE participation; state AGs where state breach laws apply.

## 8. Tabletop Exercises

The Security Officer runs a tabletop exercise at least **annually** using a fabricated SEV-1 scenario. Findings are treated as real gaps and tracked to closure.

## 9. Related Documents

- `information-security-policy.md`
- `backup-and-recovery-plan.md`
- `business-continuity-plan.md`
- `data-classification-policy.md`
- `risk-assessment.md`

## 10. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial plan |
