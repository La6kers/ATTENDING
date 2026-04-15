# Acceptable Use Policy

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11

---

## 1. Purpose

This Acceptable Use Policy (AUP) defines the acceptable and prohibited uses of ATTENDING AI LLC information systems, data, and accounts. All personnel and contractors must read, understand, and sign this policy before receiving access.

## 2. Scope

This policy applies to every individual with access to ATTENDING AI systems, including employees, contractors, consultants, temporary workers, and any third parties acting on behalf of ATTENDING AI.

## 3. General Principles

- Use ATTENDING AI systems only for authorized business purposes
- Protect the confidentiality, integrity, and availability of ATTENDING AI data
- Protect patient privacy as a clinical and ethical obligation, not merely a legal one
- Report any observed security issue, policy violation, or suspected incident immediately
- When in doubt, ask — assume nothing

## 4. Acceptable Uses

You may:

- Use ATTENDING AI accounts, code, infrastructure, and data to perform your assigned work
- Install standard developer tooling (IDEs, Git clients, Docker, CLI utilities) on your work endpoint
- Use approved SaaS vendors (see `vendor-management.md`) for business communication and collaboration
- Discuss non-confidential technical problems in public forums without disclosing proprietary or PHI details
- Use the company's Claude, BioMistral, or other approved AI tools for permitted work tasks, respecting data-classification rules

## 5. Prohibited Uses

You may not:

### 5.1 Data handling
- Access or view PHI unless you have a legitimate need-to-know for clinical or operational purposes
- Share PHI, secrets, or confidential data with unauthorized parties, including family members, friends, or personal accounts
- Store PHI, secrets, or confidential data on personal devices, personal cloud storage, or personal email
- Transmit PHI over unencrypted channels (SMS, personal email, public chat)
- Include PHI or secrets in AI prompts sent to providers who do not have an executed BAA
- Copy PHI to local storage beyond what is strictly required and authorized

### 5.2 Accounts and authentication
- Share usernames, passwords, or MFA tokens with any person
- Reuse ATTENDING AI credentials on personal accounts or vice versa
- Disable MFA on any account
- Use weak passwords or passwords shorter than 12 characters for any system
- Use personal access tokens (PATs) that persist beyond the minimum necessary time

### 5.3 Infrastructure and code
- Deploy changes directly to production without going through the PR review process
- Install unapproved SaaS tools that would process ATTENDING AI data
- Disable security scanning, CI checks, or policy enforcement to "make the build pass"
- Commit secrets, API keys, or credentials to source control, even in test files
- Run unvetted third-party code on endpoints that can access production systems
- Use unauthorized AI tools to process PHI

### 5.4 Behavior
- Harass, discriminate against, or threaten colleagues, patients, or partners
- Use company systems to view or distribute unlawful, harassing, or discriminatory content
- Attempt to circumvent authorization, policy, or access controls
- Conduct unauthorized security testing, scanning, or exploitation against company or third-party systems
- Use ATTENDING AI resources to compete with ATTENDING AI
- Misrepresent your identity or authority when interacting with vendors, regulators, or partners

### 5.5 Privacy
- Photograph, screen-record, or otherwise capture PHI without authorization
- Discuss patient-specific information in public areas (coffee shops, transit, social media)
- Look up records of yourself, family members, friends, or public figures without a clinical or operational need (including in any EHR integration)

## 6. Monitoring & Privacy Expectations

ATTENDING AI reserves the right to monitor systems and activity for security, compliance, and operational purposes, subject to applicable law. You should have **no expectation of privacy** for activity conducted on ATTENDING AI systems except where privacy is guaranteed by law (e.g., union communications, legally protected activity). Access to audit logs is restricted to the Security Officer and authorized counsel.

## 7. Endpoint Requirements

Personal endpoints used for ATTENDING AI work must have:

- Full-disk encryption (BitLocker on Windows, FileVault on macOS, LUKS on Linux)
- Current OS security updates
- An active endpoint protection agent (Windows Defender is acceptable for the Founder; future hires may require a managed agent)
- Auto-lock after no more than 5 minutes of inactivity
- MFA enabled on the OS login or device unlock mechanism

## 8. Reporting Obligations

Report immediately to the Security Officer if you:

- Suspect or observe any unauthorized access, breach, or loss of confidentiality/integrity
- Lose a device that contains or can access ATTENDING AI data
- Receive a phishing attempt targeting ATTENDING AI systems
- Observe a policy violation by yourself or others
- Encounter an ambiguity where you're unsure whether an action is permitted

## 9. Consequences of Violation

Violations may result in:

- Revocation of system access
- Termination of employment or contract
- Referral to law enforcement for criminal violations
- HIPAA civil and criminal penalties for willful PHI violations
- Civil liability under federal and state law

## 10. Acknowledgment

By signing below, I acknowledge that I have read, understand, and agree to comply with this policy. I understand that violations may result in the consequences described in §9.

| Name | Role | Date | Signature |
|---|---|---|---|
| Scott Isbell, MD | Founder / CEO / Security Officer | 2026-04-11 | _on file_ |

Future personnel will sign this policy during onboarding and annually thereafter.

## 11. Related Documents

- `information-security-policy.md`
- `access-control-policy.md`
- `data-classification-policy.md`

## 12. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy |
