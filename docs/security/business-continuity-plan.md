# Business Continuity Plan

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**HIPAA:** 45 CFR §164.308(a)(7) (Contingency Plan — Emergency Mode Operation)

---

## 1. Purpose

This plan defines how ATTENDING AI LLC sustains critical operations during disruptions, preserves clinical safety for patients using COMPASS, and returns to normal operations after an event.

## 2. Scope

This plan covers disruptions that affect any combination of:

- Production availability (Azure outage, DDoS, cyberattack, regional failure)
- Workforce availability (Founder incapacitation, team illness at scale)
- Third-party service availability (ID.me, Anthropic, GitHub, CMS Aligned Network partners)
- Physical workspace availability (fire, flood, extended power outage)

## 3. Critical Business Functions

| Function | Criticality | Max tolerable downtime |
|---|---|---|
| COMPASS red-flag detection (clinical safety) | **Critical** | **0 hours** (must degrade gracefully, never silently fail) |
| Patient intake / symptom capture | High | 4 hours |
| Provider portal encounter view | High | 8 hours |
| FHIR data exchange (post-production) | High | 24 hours |
| AI-generated clinical summaries | Medium | 24 hours |
| Marketing website | Low | 72 hours |
| Internal development CI | Low | 72 hours |

## 4. Emergency Mode Operation

Emergency mode is the reduced-capability state in which ATTENDING AI continues operating core clinical safety functions when primary systems are unavailable.

**Emergency mode requirements (enforced in code and process):**

1. **Red-flag detection must fail safe, not silent.** If the LLM-based reasoning layer is unavailable, the deterministic 14-pattern rule engine (in `@attending/clinical-services`) continues to operate and displays the emergency disclaimer without LLM augmentation.
2. **Offline-capable patient intake.** COMPASS is designed with progressive sync; a patient filling in symptoms offline will queue their assessment and submit it when connectivity returns.
3. **Graceful AI degradation.** If Anthropic/BioMistral are unavailable, the provider portal shows a banner: "AI-assisted features are temporarily unavailable. Clinical documentation and red-flag detection remain operational." Clinical decisions never depend on LLM availability.
4. **Read-only fallback.** If the write path is impaired but reads are available, the provider portal drops to read-only mode with a clear banner rather than silently losing writes.

## 5. Succession & Single-Person-of-Failure

ATTENDING AI LLC is currently founder-operated. To mitigate the single-person risk:

- **Documentation is the plan.** All operational procedures, credentials inventories, and system diagrams live in this repository so a successor can resume operations.
- **Patent and IP portfolio** is held with external legal counsel.
- **Key Vault emergency access.** A break-glass procedure gives designated trusted parties (to be named in a sealed letter held by counsel) access to Azure Key Vault in the event of Founder incapacitation.
- **Succession letter.** A signed letter naming the succession sequence is held by counsel and updated annually.
- **Deadman-switch** on critical communications will be implemented as a mitigation for R-12 in the Risk Assessment (target: 2026-05-15).

These controls are a work-in-progress while the company is solo-operated and will be formalized before hiring.

## 6. Communication Plan

| Audience | Channel | Trigger |
|---|---|---|
| Internal (future team) | Signal (encrypted messenger) + backup SMS | Any SEV-1/SEV-2 incident |
| Customers (providers, hospitals) | Email from `security@attendingai.health`; status page at `status.attendingai.health` (planned) | Service disruption >15 minutes; breach determination |
| Patients using COMPASS | In-app banner; email if a BAA+consent exists | Service disruption affecting patient workflow; breach |
| CMS HTE | Email to the CMS HTE program contact | Material non-compliance or extended outage |
| Regulators (OCR) | HIPAA breach portal | Breach affecting PHI |
| Media | Press release through counsel | Breach affecting ≥500 individuals in a state |

## 7. Activation

The Business Continuity Plan is activated by the Incident Commander (Scott Isbell, MD) when any of the following occurs:

- A SEV-1 incident is declared under `incident-response-plan.md`
- A confirmed outage of a critical business function (per §3) exceeds its max tolerable downtime
- The Founder is unable to perform duties for more than 24 hours (triggers succession provisions in §5)

## 8. Recovery & Resumption

Following an event, the Incident Commander:

1. Declares the event contained (per incident response plan)
2. Restores each critical function per its priority in §3, drawing on `backup-and-recovery-plan.md` procedures
3. Communicates restored status to affected audiences
4. Schedules a post-event review within 14 days
5. Updates this plan with any corrective actions

## 9. Testing

- **Annually** — tabletop exercise simulating one of: regional Azure outage, Founder incapacitation, ransomware, third-party LLM provider outage
- Findings are treated as real risks and tracked to closure in the Risk Register

## 10. Related Documents

- `incident-response-plan.md`
- `backup-and-recovery-plan.md`
- `risk-assessment.md`

## 11. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial plan |
