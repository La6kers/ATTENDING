# Change Management Policy

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11

---

## 1. Purpose

This policy defines how changes to ATTENDING AI LLC production systems, source code, infrastructure, and configuration are proposed, reviewed, tested, approved, deployed, and documented — with emphasis on preventing unintended disruption to clinical workflows.

## 2. Scope

Covers all changes to:

- Application source code in the `La6kers/ATTENDING` repository
- Database schema (Prisma migrations)
- Infrastructure-as-code and CI/CD pipelines (`.github/workflows/*`, Azure deployment scripts, Dockerfiles)
- Production configuration (environment variables, feature flags, Azure App Service settings)
- Third-party integrations (ID.me, FHIR endpoints, Anthropic, BioMistral, etc.)

## 3. Change Categories

| Category | Definition | Approvals |
|---|---|---|
| **Standard** | Pre-approved, low-risk, well-tested pattern (e.g., dependency version bump via Dependabot, documentation edit) | Merged PR with CI pass |
| **Normal** | Most feature work, bug fixes, schema changes, new endpoints | Merged PR with CI pass + reviewer approval |
| **Major** | New application, deprecation of a major feature, cross-cutting schema migration, new third-party integration, anything affecting clinical decision logic or red-flag detection | Merged PR with CI pass + reviewer approval + explicit change record in `docs/changes/YYYY-MM-DD-{slug}.md` |
| **Emergency** | Immediate production fix for a SEV-1/SEV-2 incident | Shortened review per §7; full documentation within 24 hours of deployment |

## 4. Workflow

1. **Plan** — describe the change and its intent in a ticket, GitHub issue, or PR description. For Major changes, include rollback plan.
2. **Branch** — create a feature branch from `main` (or `mockup-2` for the current sprint)
3. **Implement** — follow the project's code style (lint, formatting, typecheck)
4. **Test** — add or update unit, integration, or end-to-end tests as appropriate. All new clinical logic MUST have test coverage.
5. **Pre-commit** — Husky pre-commit hook runs local lint and typecheck
6. **PR** — open a Pull Request against the target branch. Include a clear description of intent, test evidence, and rollback steps.
7. **CI** — GitHub Actions runs:
   - `.github/workflows/ci.yml` (lint, typecheck, unit/integration tests, build verification)
   - `.github/workflows/security-scan.yaml` (npm audit, CodeQL, Gitleaks)
   - Additional per-area workflows (backend-ci, mobile-ci, ehr-integration-tests, etc.)
8. **Review** — at least one reviewer (the Founder currently; a second reviewer when the team grows) approves the PR. Reviewer verifies intent, test coverage, security impact, and adherence to policies.
9. **Merge** — squash-merge preferred for clean history. Direct commits to `main` are prohibited; branch protection enforces this.
10. **Deploy** — `.github/workflows/deploy-azure.yml` handles deployment to Azure upon merge to `main` (paths-filtered to provider-portal, shared, backend, prisma, Dockerfile changes). Blue/green deployment strategy via `blue-green.yml` for zero-downtime.
11. **Verify** — post-deploy smoke checks; verify health endpoints, critical user journeys, and any feature flag rollout
12. **Document** — Major changes get a `docs/changes/` entry with date, author, risk assessment, deploy timestamp, and outcome

## 5. Branch Protection Requirements

The `main` branch of `La6kers/ATTENDING` enforces the following protections (to be configured in GitHub repository settings — see §8):

- Require pull request review before merging (minimum 1 approver)
- Require status checks to pass before merging: `CI / lint-and-typecheck`, `CI / test`, `CI / build`, `Security Scan / dependency-audit`, `Security Scan / codeql-analysis`, `Security Scan / secrets-scan`
- Require branches to be up to date before merging
- Require signed commits (preferred; target once GPG/SSH signing is set up)
- Require linear history (no merge commits)
- Include administrators (no bypass)
- Block force-push and direct push to `main`
- Block branch deletion

## 6. Database Migrations

- All schema changes flow through Prisma migrations in `prisma/migrations/`
- Migrations are additive whenever possible; destructive operations (DROP, RENAME, column type change) require an explicit Major change record and a two-phase deploy (add new, backfill, switch reads, retire old)
- Every migration SQL file is committed to the repo and reviewed in the PR
- Production migration execution uses `prisma migrate deploy` from the CI pipeline, never `migrate dev`
- Shadow-database diffing is used in CI to verify parity with `schema.prisma`

## 7. Emergency Changes

For a SEV-1/SEV-2 production incident:

1. Incident Commander authorizes an emergency fix
2. Developer creates a minimal PR containing only the fix
3. CI still runs and must pass; do not bypass security scanning
4. Reviewer approves via expedited path (can be async if necessary, but must be recorded)
5. Merge and deploy
6. Within **24 hours**, a full post-incident record is created in `docs/changes/` documenting the fix, rationale, and any follow-up work
7. A proper root-cause fix (if the emergency change was a mitigation rather than a root-cause fix) is scheduled as a Normal change within 7 days

## 8. Enabling Branch Protection (GitHub UI)

Until programmatic configuration is adopted, branch protection is set manually:

1. Navigate to `https://github.com/La6kers/ATTENDING/settings/branches`
2. Under "Branch protection rules", click **Add rule**
3. Apply to `main`
4. Configure per §5
5. Save

The same procedure is documented in `docs/security/branch-protection-setup.md` with screenshots-to-follow guidance.

## 9. Rollback

- **Application rollback:** re-deploy the prior container image from Azure Container Registry (tags are retained per `backup-and-recovery-plan.md`)
- **Database rollback:** use Prisma "down" migration, or restore the last known-good backup if the migration is irreversible (see `backup-and-recovery-plan.md`)
- **Configuration rollback:** revert the Git commit that introduced the change and re-run the deploy workflow
- **Incident-driven rollback:** the Incident Commander may authorize an immediate rollback without the normal review path during an active incident; documentation follows under §7

## 10. Related Documents

- `information-security-policy.md`
- `incident-response-plan.md`
- `backup-and-recovery-plan.md`
- `access-control-policy.md`

## 11. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial policy |
