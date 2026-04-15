# Annual Risk Assessment

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**Next Review:** 2027-04-11 (or upon material change)
**Method:** Qualitative threat/likelihood/impact analysis aligned with NIST SP 800-30 Rev. 1

---

## 1. Scope

This assessment covers systems, data, and processes associated with ATTENDING AI LLC's COMPASS clinical decision support platform, including:

- GitHub repository `La6kers/ATTENDING` (source, CI, secrets management)
- Azure production environment (Container Registry `attendingacr`, App Services, Azure SQL — planned)
- Development endpoints (Founder laptop, local Docker stack)
- SaaS vendors holding ATTENDING AI data (see `vendor-management.md`)
- PHI processed by patient-facing COMPASS assessments

## 2. Assets

| Asset | Classification | Location | Owner |
|---|---|---|---|
| Source code | Internal | GitHub (private) | Founder |
| CI/CD pipelines | Internal | GitHub Actions | Founder |
| Application secrets (NEXTAUTH_SECRET, DB credentials, API keys) | Confidential | Azure Key Vault (prod), `.env.local` (dev, git-ignored) | Founder |
| Production PHI | **PHI (regulated)** | Azure SQL (planned), Prisma ORM access | Founder |
| AI model credentials (Anthropic API key, BioMistral access) | Confidential | Azure Key Vault | Founder |
| Patent portfolio (#19/215,389 + CIP 12–16) | Confidential | Local + counsel's secure portal | Founder |
| Brand assets and documentation | Public/Internal | `docs/`, `docs/cms_hte/` | Founder |
| Founder laptop | Internal | Physical custody | Founder |

## 3. Threat Sources

| Category | Sources |
|---|---|
| **External adversarial** | Opportunistic malware, ransomware groups, credential stuffing botnets, targeted healthcare attackers (APT groups known to target hospitals and health tech) |
| **External accidental** | Third-party vendor breach, dependency supply-chain compromise, cloud provider outage |
| **Insider adversarial** | Disgruntled contractor (future risk once hiring), social engineering of the Founder |
| **Insider accidental** | Misconfiguration, accidental `.env` commit, credential reuse, phishing click |
| **Environmental** | Azure region outage, fire/flood at Founder's workspace, loss of laptop |
| **Regulatory/legal** | CMS HTE criteria change, HIPAA enforcement action, state breach law conflict |

## 4. Likelihood and Impact Scales

**Likelihood** (annual probability): Rare (<5%), Unlikely (5–20%), Possible (20–50%), Likely (50–80%), Almost Certain (>80%)
**Impact**: Negligible, Minor, Moderate, Major, Catastrophic (where "catastrophic" includes PHI breach affecting >500 individuals, loss of HIPAA safe harbor, or clinical safety harm)

## 5. Risk Register

| # | Risk | Likelihood | Impact | Inherent Risk | Existing Controls | Residual Risk | Treatment | Owner |
|---|---|---|---|---|---|---|---|---|
| R-01 | Accidental commit of secrets to GitHub | Possible | Major | High | `.gitignore` covers `.env*`, Gitleaks weekly + PR scan, Husky pre-commit, private repo | Low | Accept | Founder |
| R-02 | Compromised GitHub personal access token (PAT) | Possible | Major | High | MFA on GitHub, short-lived tokens, no PATs stored in CI, OIDC federation for Azure | Medium | Mitigate — migrate fully to OIDC, eliminate long-lived PATs | Founder |
| R-03 | Dependency supply-chain attack (malicious npm package) | Possible | Major | High | `npm audit` in CI, Dependabot, CodeQL, lockfile enforced, review PRs that add deps | Medium | Mitigate — enable Socket.dev or similar typosquat detection | Founder |
| R-04 | Ransomware on Founder laptop | Unlikely | Moderate | Medium | BitLocker disk encryption, Windows Defender, MFA, no production PHI on local disk, source in GitHub | Low | Accept | Founder |
| R-05 | Azure credential compromise (subscription owner) | Unlikely | Catastrophic | High | MFA, break-glass emergency account, conditional access (planned), audit logging | Medium | Mitigate — implement privileged-access workstation and conditional access policy | Founder |
| R-06 | Anthropic / BioMistral API key exfiltration | Possible | Moderate | Medium | Keys in Azure Key Vault, rate-limited, rotation planned quarterly | Low | Accept | Founder |
| R-07 | PHI field encryption key loss | Unlikely | Catastrophic | High | Key Vault with soft-delete and purge protection, documented rotation procedure | Low | Accept; verify restore quarterly | Founder |
| R-08 | AI model harmful output (unsafe clinical advice reaches patient) | Possible | Major | High | `ContentClassifier`, `@attending/ai-governance` disclaimers, `AIConversationReview` clinician review, 14 red-flag patterns as deterministic backstop, harm-potential tracking | Medium | Mitigate — add red-team suite of adversarial prompts to CI | Founder |
| R-09 | SQL injection / ORM bypass | Unlikely | Catastrophic | High | Prisma parameterized queries, no raw SQL in business logic, CodeQL SAST | Low | Accept | Founder |
| R-10 | IAL2 identity provider outage (ID.me) | Possible | Moderate | Medium | Planned fallback to Login.gov; architecture supports multiple providers via `@attending/identity` | Low | Accept once production | Founder |
| R-11 | Azure region outage | Unlikely | Major | Medium | Multi-region backup planned; DR documented in `backup-and-recovery-plan.md` | Low | Accept | Founder |
| R-12 | Loss of Founder (single-person-of-failure) | Unlikely | Catastrophic | High | Documentation in repo, patent portfolio in escrow with counsel, operational runbooks | High | Mitigate — document succession plan, dead-man-switch for key vault access | Founder |
| R-13 | CMS HTE criteria change mid-stream | Possible | Moderate | Medium | Active monitoring of CMS.gov HTE page, CMS Aligned Network participation tracking | Low | Accept | Founder |
| R-14 | Phishing attack on Founder | Likely | Major | High | MFA everywhere, password manager, security awareness (annual), hardware security key (planned) | Medium | Mitigate — acquire YubiKey / Titan, enforce WebAuthn on GitHub/Azure | Founder |
| R-15 | Unpatched vulnerability in Node.js runtime or Docker base image | Possible | Major | High | Dependabot, Docker image rebuilt on every deploy, weekly security scan | Low | Accept | Founder |
| R-16 | BAA gap — PHI accessed by vendor without BAA in place | Unlikely | Major | Medium | Vendor register, BAA checklist in onboarding, policy in `vendor-management.md` | Low | Accept | Founder |
| R-17 | Legal discovery / subpoena of PHI | Possible | Moderate | Medium | Legal counsel on retainer, incident response plan includes legal notification path | Low | Accept | Founder |
| R-18 | Insider accidental deletion of production data | Unlikely | Major | Medium | Soft-delete pattern enforced at Prisma layer, audit trails, daily backups | Low | Accept | Founder |
| R-19 | CI secrets leaked via build logs | Unlikely | Moderate | Low | GitHub Actions secret masking, CI avoids echoing env | Low | Accept | Founder |
| R-20 | Rural ISP / bandwidth outage blocking patient access | Possible | Minor | Low | COMPASS offline-capable by design, progressive sync | Low | Accept | Founder |

## 6. Top Priority Treatments

1. **R-02** — Migrate all remaining GitHub PATs to OIDC federation for Azure Deploy (Target: 2026-06-01)
2. **R-05** — Implement Azure conditional access + break-glass account (Target: 2026-06-01)
3. **R-08** — Red-team adversarial prompt suite in CI for AI governance (Target: 2026-07-01)
4. **R-12** — Document succession / dead-man-switch (Target: 2026-05-15)
5. **R-14** — Hardware security key for Founder accounts (Target: 2026-05-01)

## 7. Risk Acceptance

Risks marked "Accept" in the residual column have been judged tolerable given the effectiveness of existing controls relative to the cost of additional mitigation. Acceptance is re-evaluated annually.

## 8. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial assessment |
