# Vendor Management Policy & Register

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**Review Cadence:** Annual, or upon onboarding/offboarding of any vendor touching PHI

---

## 1. Purpose

This policy governs how ATTENDING AI LLC selects, contracts with, and monitors third-party vendors, SaaS providers, and open-source dependencies that process or could impact the confidentiality, integrity, or availability of ATTENDING AI data.

## 2. Vendor Classification

| Tier | Definition | Requirements |
|---|---|---|
| **Tier 1 — PHI-touching** | Vendor that stores, processes, or transmits Protected Health Information | BAA executed; SOC 2 Type II or equivalent; annual security review; breach notification clause; HIPAA compliance attestation |
| **Tier 2 — Infrastructure / Confidential** | Vendor hosting source, CI, secrets, or confidential business data (no PHI) | MFA enforced; security program documented; SOC 2 or ISO 27001 preferred; annual review |
| **Tier 3 — Operational** | Vendor providing tools, libraries, or services with limited data exposure (e.g., OSS registries, email) | Security questionnaire or public trust page review; remove if alternatives available |
| **Tier 4 — OSS runtime dependency** | Open-source package consumed at runtime | Automated dependency scanning (Dependabot, npm audit, CodeQL); SBOM tracked via lockfile; vetted via `package.json` PR review |

## 3. Onboarding Checklist

Before any vendor receives access to ATTENDING AI data:

- [ ] Tier classification assigned
- [ ] Security documentation reviewed (SOC 2 report, trust page, or questionnaire response)
- [ ] BAA executed for Tier 1 vendors (before any PHI is transmitted)
- [ ] MFA enforced on all ATTENDING AI-owned accounts with the vendor
- [ ] Least-privilege role assigned
- [ ] Entry added to §5 Vendor Register
- [ ] Vendor-issued credentials stored in password manager or Azure Key Vault, never committed to source

## 4. Ongoing Monitoring

- **Annual review** of all Tier 1 and Tier 2 vendors. Verify SOC 2 report is current, BAA is still in force, and contact information is accurate.
- **Dependency scanning** runs continuously via GitHub Dependabot, weekly via `.github/workflows/security-scan.yaml` (npm audit + CodeQL).
- **Breach notification** — vendors are required contractually (Tier 1, Tier 2) to notify ATTENDING AI within 72 hours of discovering a security incident affecting ATTENDING AI data.

## 5. Vendor Register (Current)

### Tier 1 — PHI-touching (BAA required)

| Vendor | Purpose | BAA Status | Data Elements | Review Due |
|---|---|---|---|---|
| *(Microsoft Azure)* | Production hosting (Container Registry, App Services, Azure SQL planned) | BAA: Microsoft OEA (Online Services Terms) covers HIPAA when configured per Microsoft HIPAA/HITECH implementation guide | All PHI at rest and in transit | 2027-04 |
| *(ID.me)* — planned | IAL2 identity verification | BAA: Required before production; pending sandbox approval | Patient identity attributes (name, DOB, address, verified credentials) | Upon production activation |
| *(Anthropic)* — planned | Claude LLM for clinical decision support | BAA: Available under Anthropic's healthcare/HIPAA program; must be executed before PHI is transmitted | No PHI in current dev; PHI de-identified or minimum necessary when wired | Upon production activation |

### Tier 2 — Infrastructure / Confidential (no PHI)

| Vendor | Purpose | Security Posture | Review Due |
|---|---|---|---|
| GitHub (Microsoft) | Source control, CI/CD, CodeQL, Dependabot, Gitleaks Action | SOC 2 Type II; private repo; MFA enforced on org | 2027-04 |
| Microsoft Azure | Container registry `attendingacr`, deployment pipelines | SOC 2 Type II; HIPAA-eligible services only | 2027-04 |
| USPTO | Patent filing (#19/215,389 + CIP 12–16) | Federal government; no ATTENDING AI data transmitted beyond filings | N/A |
| Legal counsel (TBD) | Corporate, IP, healthcare regulatory | Professional responsibility rules; NDA and engagement letter | 2027-04 |

### Tier 3 — Operational

| Vendor | Purpose | Notes |
|---|---|---|
| Docker Hub | Base images for container builds | Public images only; pinned by digest in Dockerfiles |
| npm registry | JavaScript package distribution | Lockfile committed; integrity hashes enforced |
| NuGet | .NET package distribution | Lockfile committed for backend |

### Tier 4 — OSS Runtime Dependencies (selected)

Dependencies are tracked in full via lockfiles (`package-lock.json`, `.csproj` references). Notable runtime packages consumed by ATTENDING AI apps:

**Frontend / Monorepo apps:**
- `next`, `react`, `react-dom` — core framework
- `next-auth` — authentication
- `@prisma/client` — ORM client
- `zod` — schema validation
- `zustand`, `xstate`, `@xstate/react`, `immer` — state management
- `@radix-ui/react-*` — accessible UI primitives
- `class-variance-authority`, `clsx`, `tailwind-merge` — styling
- `lucide-react` — icons
- `leaflet`, `react-leaflet` — mapping (EMS portal)
- `react-grid-layout` — dashboard layouts
- `react-router-dom` — routing (non-Next apps)
- `@microsoft/signalr` — real-time backend channel

**Identity & security (CMS HTE):**
- `jose` — JWT and OIDC token handling
- `openid-client` — OIDC client for ID.me / Login.gov

**Test & dev (not shipped to prod):**
- `vitest`, `@vitejs/plugin-react`, `jsdom`, `husky`, `turbo`, `typescript`, `eslint`

A full SBOM is generable on demand via `npm ls --all --json`.

## 6. Offboarding Checklist

When a vendor is decommissioned:

- [ ] Revoke all ATTENDING AI-owned credentials
- [ ] Request deletion of ATTENDING AI data (especially PHI) per contract terms
- [ ] Obtain written confirmation of data destruction where contractually required
- [ ] Update §5 register
- [ ] Update DNS, secrets, and configuration to remove vendor references

## 7. Related Documents

- `information-security-policy.md`
- `risk-assessment.md`
- `data-classification-policy.md`

## 8. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy + register |
