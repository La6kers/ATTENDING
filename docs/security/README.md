# ATTENDING AI — Security Program Documentation

**Maintainer:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Effective:** 2026-04-11

This directory contains the ATTENDING AI LLC information security program. It is designed to satisfy:

- **HIPAA Security Rule** (45 CFR §§164.302–318) — administrative, physical, and technical safeguards
- **CMS Health Technology Ecosystem** security checklist requirement for Patient Facing Apps
- **NIST SP 800-53 Rev. 5** control alignment where applicable
- **NIST SP 800-61 Rev. 2** incident response handling
- **NIST AI RMF 1.0** — AI-specific governance
- **SOC 2 Type II readiness** — prepared to import into a compliance platform (Vanta, Drata, Secureframe) once funded

## Policy Index

| # | Document | Purpose |
|---|---|---|
| 1 | [Information Security Policy](./information-security-policy.md) | Umbrella policy: principles, roles, minimum controls |
| 2 | [Access Control Policy](./access-control-policy.md) | How access is granted, reviewed, and revoked |
| 3 | [Acceptable Use Policy](./acceptable-use-policy.md) | Personnel rules and prohibited uses |
| 4 | [Change Management Policy](./change-management-policy.md) | SDLC, PR workflow, deploy controls, rollback |
| 5 | [Data Classification Policy](./data-classification-policy.md) | PHI, Confidential, Internal, Public — handling rules |
| 6 | [Incident Response Plan](./incident-response-plan.md) | Detect → contain → eradicate → recover, HIPAA breach workflow |
| 7 | [Backup & Recovery Plan](./backup-and-recovery-plan.md) | RTO/RPO, backup mechanisms, restore procedures |
| 8 | [Business Continuity Plan](./business-continuity-plan.md) | Emergency mode, succession, clinical-safety continuity |
| 9 | [Risk Assessment](./risk-assessment.md) | Annual risk register with 20 identified risks and treatments |
| 10 | [Vendor Management](./vendor-management.md) | Policy + live vendor register including Tier 4 OSS deps |

## Operational References

- [Branch Protection Setup](./branch-protection-setup.md) — exact GitHub UI steps to enforce the change-management requirements
- `docs/cms_hte/pledge_submission.md` — CMS HTE Category IV pledge narrative
- `packages/identity/` — IAL2 + AAL2 implementation (ID.me, WebAuthn passkeys)
- `packages/ai-governance/` — AI content classification, disclaimers, clinician review, model registry
- `packages/consent/` — Patient consent management with Prisma adapter
- `packages/fhir-client/` — SMART on FHIR 2.0 client with US Core 6.1.0 resource mapping

## Review Cadence

| Artifact | Cadence | Next Due |
|---|---|---|
| All policies | Annual | 2027-04-11 |
| Risk assessment | Annual or on material change | 2027-04-11 |
| Vendor review (Tier 1 & 2) | Annual | 2027-04-11 |
| Access review | Quarterly | 2026-07-11 |
| DR restore test | Quarterly | 2026-07-11 |
| Tabletop exercise (IR + BCP) | Annual | 2027-04-11 |
| Penetration test | Annual or pre-production launch | TBD |
| Security awareness training | Annual | 2027-04-11 |

## Evidence Collection

Evidence of control operation should be filed under:

- `docs/security/access-reviews/YYYY-QN.md`
- `docs/security/dr-tests/YYYY-QN.md`
- `docs/security/incidents/YYYY-MM-DD-{slug}.md`
- `docs/changes/YYYY-MM-DD-{slug}.md`

These folders are intentionally not yet created — they will be populated as real evidence is generated.

## Roadmap to Full Compliance

This documentation represents the **control design** phase. The control operation phase requires:

1. **Short term (0–30 days)** — enable branch protection, run tabletop exercise, complete first access review, complete first DR restore test
2. **Medium term (30–90 days)** — sign BAAs with Microsoft, ID.me, Anthropic before production PHI; engage penetration tester; publish `trust.attendingai.health`
3. **Long term (90+ days, post-funding)** — engage compliance automation platform; engage AICPA-licensed auditor; begin SOC 2 Type II observation window
