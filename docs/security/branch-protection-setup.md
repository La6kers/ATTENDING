# Branch Protection Setup — `main`

**Purpose:** Enforce the change-management controls defined in `change-management-policy.md` §5 on the `main` branch of the `La6kers/ATTENDING` repository.

**Prerequisite:** The `gh` CLI is not available in the current dev environment, so this must be configured via the GitHub web UI. The GitHub user performing the configuration must have **Admin** access to the repository.

---

## Step-by-step

1. Open https://github.com/La6kers/ATTENDING/settings/branches
2. Under **Branch protection rules**, click **Add branch protection rule**
3. In **Branch name pattern**, enter:
   ```
   main
   ```

### Required toggles

Enable **all** of the following:

- [x] **Require a pull request before merging**
  - [x] Require approvals — set to `1` (increase to `2` once the team has more than one reviewer)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners *(enable once `CODEOWNERS` is set up)*

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Search and add each of these required checks:
    - `CI / lint-and-typecheck` (or the equivalent job name from `.github/workflows/ci.yml`)
    - `CI / test`
    - `CI / build`
    - `Security Scan / dependency-audit`
    - `Security Scan / codeql-analysis`
    - `Security Scan / secrets-scan`
    - *(Add any additional per-area checks that must pass, e.g. `backend-ci / test`, `ehr-integration-tests`)*

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits** *(recommended — requires contributors to set up GPG or SSH commit signing)*

- [x] **Require linear history**

- [x] **Do not allow bypassing the above settings** *(this makes the rules apply to repo administrators too — critical for audit credibility)*

- [x] **Restrict who can push to matching branches** — enable and leave empty (no one can push directly; everyone goes through PRs)

- [x] **Block force pushes**

- [x] **Block deletions**

4. Click **Create** (or **Save changes** if editing an existing rule)

---

## Verification checklist (complete after saving)

- [ ] Attempt a direct `git push origin main` from a clean clone — it should be rejected
- [ ] Attempt to merge a PR that has failing CI — the merge button should be disabled
- [ ] Attempt to merge a PR without a review — the merge button should be disabled
- [ ] Attempt a force-push to `main` — should be rejected
- [ ] Confirm the branch protection rule is visible to you as an Admin but cannot be bypassed

If any of these tests fail, adjust the rule settings until the protection behaves as documented.

---

## Once done

1. Add a note to `docs/security/evidence/branch-protection-YYYY-MM-DD.md` with a screenshot of the configured rule and the date of activation
2. Record the configuration in this file if any of the exact check names diverged from the list above
3. Revisit the rule after every material CI workflow change to ensure the required-checks list still matches reality

---

## Why this matters for compliance

Branch protection is the single highest-leverage SOC 2 / HIPAA control you can enable in GitHub:

- **CC8.1 (Change Management)** in SOC 2 is satisfied in large part by demonstrating that production code cannot change without PR review and CI pass
- **§164.312(c)(1)** (Integrity) in HIPAA requires controls to protect PHI from improper alteration — PR review is the primary such control in a Git-based workflow
- **NIST SP 800-53 CM-3** (Configuration Change Control) aligns with PR-based approval and automated testing gates

This setup takes about 5 minutes and closes roughly 30% of the SOC 2 change-management control family in a single action.
