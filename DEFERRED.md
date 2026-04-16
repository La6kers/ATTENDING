# Deferred — Staged for Scale

These improvements are recognized as valuable but are **intentionally not activated** while the program is still in the lean build-out phase. Each item below is queued with enough context that future-us can revive it without re-discovering the motivation.

Updated: 2026-04-15

---

## Infrastructure & CI/CD

### OIDC migration for `deploy-demo.yml`
- **Status:** Deferred
- **Current state:** `deploy-demo.yml` still uses legacy `creds: ${{ secrets.AZURE_CREDENTIALS }}` (service principal JSON).
- **Why defer:** The production workflow `main_attending-compass.yml` already uses OIDC federated identity (`azure/login@v2` with `client-id`/`tenant-id`/`subscription-id`). `deploy-demo.yml` is workflow-dispatch only and rarely fires. Migrating requires provisioning a new federated credential in Azure AD and rotating the demo service principal, which is ceremony we don't need yet.
- **Activate when:** Demo env is used routinely by more than one person, OR the existing service principal is up for rotation.

### ACR retention policy
- **Status:** Deferred
- **Current state:** Every `main` push pushes a `:sha`-tagged image to `compassacr2026.azurecr.io`. Nothing reaps old tags.
- **Why defer:** ACR Basic tier includes 10 GB; we're far under that. Retention rules cost tier-uplift money and operator mental load.
- **Activate when:** ACR storage approaches 7 GB, or we have more than ~200 accumulated `:sha` tags. Rule of thumb: `keep last 30 days OR last 20 tags, whichever is larger`.

### App Insights uptime monitoring
- **Status:** Deferred
- **Current state:** Post-deploy smoke test in `main_attending-compass.yml` runs once after deploy. Nothing watches the site between deploys.
- **Why defer:** Single-instance, single-region, pre-launch. We'd notice an outage within a business day and there are no paying users yet.
- **Activate when:** First paid customer signs. Add Azure Monitor availability test hitting `/` every 5 min from 2+ regions with email alerts.

### Deploy workflow concurrency guard
- **Status:** Deferred (nice-to-have)
- **Current state:** `main_attending-compass.yml` has no `concurrency:` group. Two rapid merges to main could race each other through build+deploy.
- **Why defer:** Merges to main are currently infrequent and manual. The worst case is a slightly wasted ACR push.
- **Activate when:** Merge cadence hits >3/day OR a race is actually observed.

---

## Code health

### Root `.csproj` transitive vulnerability pinning
- **Status:** Deferred
- **Current state:** `dotnet list package --vulnerable --include-transitive` reports 8 high-severity advisories (Azure.Identity, System.Text.Json, etc.) pulled transitively from older Azure SDK packages.
- **Why defer:** None of the vulnerable code paths are exercised in the current endpoints. Pinning top-level `<PackageReference>` overrides risks breaking the Azure SDK dependency tree and the fix is easier after we upgrade Azure.* packages to their 2026 releases.
- **Activate when:** First security audit from a customer, OR pre-launch hardening sprint, OR a CVE appears on our actual call path.

### Encounter page component split
- **Status:** Deferred (refactor, not a fix)
- **Current state:** `apps/provider-portal/src/app/encounters/[id]/page.tsx` is a single very large component.
- **Why defer:** It works, it's shipped, and splitting it has zero user-visible benefit. Only pays off when multiple devs edit it simultaneously.
- **Activate when:** Second engineer joins frontend work, or the file crosses 1500 lines.

### Patient portal DDx engine refactor
- **Status:** Deferred
- **Current state:** COMPASS DDx logic is spread across several files in `apps/compass-standalone/`.
- **Why defer:** The DDx engine was recently expanded (see commit history on `main`). Premature consolidation would fight that in-flight work.
- **Activate when:** DDx content stabilizes and we want test coverage numbers before a clinical validation study.

### Test framework unification (vitest → single toolchain)
- **Status:** Deferred
- **Current state:** Frontend uses vitest, backend uses xUnit, clinical-safety tests use vitest with a custom config.
- **Why defer:** The current split matches language boundaries (TS/C#) and switching costs more than it saves.
- **Activate when:** Never, probably. Leave the note here so nobody re-raises it.

---

## Product

### Mobile app (React Native)
- **Status:** Deferred
- **Why defer:** COMPASS web app is mobile-responsive and we have no distribution story for an app store release. Physical app adds App Store review cycles, notarization, and push-notification infra.
- **Activate when:** First rural health system partnership asks for it, OR we have a concrete push-notification use case (e.g., lab result alerts).

### `archive/` folder removal from git
- **Status:** Deferred
- **Current state:** `archive/` is gitignored (line 311 of `.gitignore`) but existing tracked files are still in history.
- **Why defer:** Cleaning git history requires `git filter-repo` or BFG and a force-push — too risky during active development.
- **Activate when:** Next scheduled history cleanup, or if repo size becomes an onboarding complaint.

### Orphaned `services/cds-hooks` and `services/notification-service`
- **Status:** Staged
- **Current state:** Source files remain on disk under `services/` but are no longer listed in the root `package.json` workspaces array. `npm install` will skip them, freeing ~30s and avoiding extra `node_modules` churn.
- **Why defer deletion:** The scaffolding may be revived for the cds-hooks/notification roadmap items. Keeping source costs ~0 on disk.
- **Activate when:** Either (a) use them → re-add to `workspaces` array in `package.json`, or (b) formally decide against them → delete `services/cds-hooks` and `services/notification-service` directories.

---

## Staged packages (source on disk, excluded from workspaces)

### `packages/ai-governance/`
- **Status:** Staged
- **Current state:** Source files remain. Not in `package.json` workspaces (glob switched to explicit list).
- **Why defer:** CMS HTE Phase 2. No imports anywhere.
- **Activate when:** CMS HTE governance work begins → re-add `"packages/ai-governance"` to workspaces array.

### `packages/fhir-client/`
- **Status:** Staged
- **Current state:** Source on disk, not in workspaces.
- **Why defer:** CMS HTE Phase 1. No imports anywhere.
- **Activate when:** FHIR integration work begins → re-add to workspaces.

### `packages/consent/`
- **Status:** Staged
- **Current state:** Source on disk, not in workspaces.
- **Why defer:** CMS HTE Phase 1. No imports anywhere.
- **Activate when:** Patient consent workflow begins → re-add to workspaces.

### `apps/compass-admin/`
- **Status:** Staged
- **Current state:** Source on disk (~21 files), not in workspaces. No deploy workflow.
- **Why defer:** Admin dashboard stub with no active roadmap item.
- **Activate when:** Admin features needed → re-add to workspaces, create Dockerfile + deploy workflow.

---

## How to revive a deferred item

1. Open this file, find the section, confirm the "Activate when" trigger actually fired.
2. Create a branch named `deferred/<short-name>`.
3. Implement the change.
4. Remove the entry from this file in the same PR.
5. Mention the removal in the PR description so the change is traceable.
