# Access Control Policy

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**HIPAA:** 45 CFR §164.308(a)(3), §164.308(a)(4), §164.312(a)(1), §164.312(d)

---

## 1. Purpose

This policy defines how access to ATTENDING AI LLC systems and data is granted, maintained, reviewed, and revoked.

## 2. Principles

1. **Least privilege** — grant the minimum access required to perform an authorized function
2. **Need to know** — PHI access is restricted to personnel with a legitimate clinical or operational need
3. **Separation of duties** — where feasible, split sensitive operations across multiple approvers (e.g., production deploy requires PR review + CI pass)
4. **Unique identification** — every user has an individual account; shared credentials are prohibited
5. **Strong authentication** — all accounts require MFA; high-risk accounts require hardware-backed authenticators

## 3. Account Types

| Account type | Purpose | MFA | Review cadence |
|---|---|---|---|
| **Personal developer** | Individual personnel for day-to-day work | Required | Quarterly |
| **Privileged / admin** | Azure subscription owner, GitHub org owner, DB admin | Required (hardware key preferred) | Quarterly |
| **Service** | Non-interactive (CI runners, deploy pipelines) | OIDC federation preferred; secrets rotated quarterly | Quarterly |
| **Break-glass** | Emergency-only admin account | Hardware key; credentials sealed in password manager with monitored access log | Annually + post-use review |
| **Patient** | End-user of COMPASS | IAL2 (ID.me / Login.gov) + AAL2 (WebAuthn passkey) | Per patient session |
| **Clinician** | Provider portal user | MFA via Azure AD B2C; IAL2 where operationally required | Quarterly |

## 4. Authentication Requirements

| System | Minimum | Preferred |
|---|---|---|
| GitHub org `La6kers` | MFA (TOTP) | WebAuthn security key |
| Azure subscription | MFA | Privileged Identity Management + conditional access |
| NextAuth sessions (provider portal) | Azure AD B2C with MFA | Same |
| Patient portal | IAL2 + AAL2 passkey via `@attending/identity` | Same |
| CI/CD deploys | OIDC federation (no long-lived PAT) | Same |
| Local development DB | Strong password (rotated on check-in) | Docker-scoped only; no external exposure |

## 5. Provisioning Workflow

1. Request submitted via signed Acceptable Use Policy acknowledgment
2. Role assigned based on job function (least privilege)
3. MFA enrollment verified before first production access
4. Entry recorded in access register

## 6. Access Review

- **Quarterly** access review of all user and service accounts
- Reviewer verifies: account still needed, role still appropriate, MFA still enrolled, last-used date reasonable
- Orphaned or unused accounts are disabled immediately and deleted after 90 days
- Review results logged in `docs/security/access-reviews/YYYY-QN.md`

## 7. Deprovisioning Workflow

Upon termination, role change, or contract end:

- [ ] All accounts disabled within **24 hours** of notice
- [ ] Session tokens revoked (GitHub, Azure AD, NextAuth)
- [ ] Personal access tokens, SSH keys, API keys rotated or revoked
- [ ] MFA devices de-enrolled
- [ ] Physical keys / badges recovered (if applicable)
- [ ] Access register updated

## 8. Role-Based Access Control (RBAC) — Application Layer

ATTENDING AI applications enforce RBAC at multiple layers:

- **Azure AD B2C** issues short-lived JWTs with role claims
- **NextAuth** middleware validates JWTs and attaches role to the request context
- **Backend API** enforces claims-based authorization on every endpoint
- **Prisma** queries are scoped by `organizationId` to prevent cross-tenant data leakage
- **Soft-delete middleware** filters `deletedAt: null` so revoked records are invisible to routine queries

PHI access is additionally logged through the append-only audit trail on the `PatientConsent`, `AIConversationReview`, and related Prisma models.

## 9. Remote Access

- Production access occurs only from personnel endpoints with disk encryption, current OS patches, and an active endpoint protection agent
- No public SSH or RDP exposure to production resources; management plane access is via Azure Portal / az CLI with MFA
- VPN is not currently required (no private network ranges exposed); if added, split-tunnel configuration with device posture check will be required

## 10. Physical Access

- Production is fully cloud-hosted (Azure); no on-premises production infrastructure
- Founder laptop is the only development endpoint touching source code; it is kept in physical custody of the Founder and uses full-disk encryption and auto-lock after 5 minutes of inactivity
- Printed materials containing PHI are prohibited except where clinically necessary; any printed PHI is shredded after use

## 11. Related Documents

- `information-security-policy.md`
- `acceptable-use-policy.md`
- `incident-response-plan.md`

## 12. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy |
