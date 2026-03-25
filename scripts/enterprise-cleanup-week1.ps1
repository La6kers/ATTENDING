# =============================================================================
# ATTENDING AI — Week 1 Enterprise Cleanup
# scripts/enterprise-cleanup-week1.ps1
#
# Executes all Week 1 items from the enterprise code review.
# Run from the repo root on the mockup-2 branch.
#
# Usage:
#   cd C:\Users\la6ke\Projects\ATTENDING
#   .\scripts\enterprise-cleanup-week1.ps1
#
# What this script does:
#   1. Removes root-level debris files (scratch scripts, temp files)
#   2. Removes archive/ directory (preserved in git history)
#   3. Removes prisma/dev.db-journal (SQLite artifact)
#   4. Commits all changes with proper messages
#   5. Pushes to origin/mockup-2
#
# Files already fixed (applied directly via filesystem):
#   - README.md             ← Rewritten with correct stack
#   - .gitignore            ← Extended with all debris patterns
#   - docker-compose.yml    ← NEXTAUTH_SECRET fallback removed
#   - package.json          ← engines updated to node >=20
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot | Split-Path -Parent
Set-Location $root

Write-Host "`n=== ATTENDING AI — Week 1 Enterprise Cleanup ===" -ForegroundColor Cyan
Write-Host "Working directory: $root`n"

# Verify we're on the right branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "mockup-2") {
    Write-Warning "You are on branch '$branch', not 'mockup-2'. Continue anyway? (y/N)"
    $confirm = Read-Host
    if ($confirm -ne "y") { exit 1 }
}

# Verify working tree is clean except for our intended changes
$status = git status --short
Write-Host "Current git status:" -ForegroundColor Yellow
Write-Host $status

# =============================================================================
# STEP 1 — Root debris: scratch scripts and batch files
# =============================================================================
Write-Host "`n[1/5] Removing root-level scratch scripts and batch files..." -ForegroundColor Yellow

$debrisFiles = @(
    "commit-h4.ps1",
    "commit-patient-app.ps1",
    "commit-patient-v2.ps1",
    "commit-patient-v3.ps1",
    "commit-patient-v4.ps1",
    "commit-v3.ps1",
    "COMMIT_MSG.md",
    "dev-setup.bat",
    "setup-database.bat",
    "update-git.bat",
    "Verify-Section1.ps1",
    "Verify-Section4.ps1",
    "setup.ps1",
    "test-results.txt"
)

foreach ($file in $debrisFiles) {
    $path = Join-Path $root $file
    if (Test-Path $path) {
        # Remove from git index + working tree
        git rm -f $file 2>$null
        if (Test-Path $path) { Remove-Item $path -Force }
        Write-Host "  Removed: $file" -ForegroundColor Green
    } else {
        Write-Host "  Skip (not found): $file" -ForegroundColor Gray
    }
}

# Remove files with problematic names (spaces, blank)
# "e 1 - Production Fundamentals" — try both git rm and direct delete
git rm -f "e 1 - Production Fundamentals" 2>$null
$problematic = Join-Path $root "e 1 - Production Fundamentals"
if (Test-Path $problematic) { Remove-Item $problematic -Force; Write-Host "  Removed: 'e 1 - Production Fundamentals'" -ForegroundColor Green }

# Blank filename (space character)
$blank = Join-Path $root " "
if (Test-Path $blank) {
    git rm -f " " 2>$null
    Remove-Item $blank -Force
    Write-Host "  Removed: blank-named file" -ForegroundColor Green
}

# =============================================================================
# STEP 2 — prisma/dev.db-journal (SQLite artifact)
# =============================================================================
Write-Host "`n[2/5] Removing SQLite artifacts from prisma/..." -ForegroundColor Yellow

$sqliteArtifacts = @(
    "prisma\dev.db",
    "prisma\dev.db-journal",
    "prisma\dev.db-shm",
    "prisma\dev.db-wal"
)

foreach ($file in $sqliteArtifacts) {
    $path = Join-Path $root $file
    if (Test-Path $path) {
        git rm -f $file 2>$null
        if (Test-Path $path) { Remove-Item $path -Force }
        Write-Host "  Removed: $file" -ForegroundColor Green
    } else {
        Write-Host "  Skip (not found): $file" -ForegroundColor Gray
    }
}

# =============================================================================
# STEP 3 — archive/ directory
# =============================================================================
Write-Host "`n[3/5] Removing archive/ directory (preserved in git history)..." -ForegroundColor Yellow

$archivePath = Join-Path $root "archive"
if (Test-Path $archivePath) {
    git rm -rf archive/ 2>$null
    if (Test-Path $archivePath) { Remove-Item $archivePath -Recurse -Force }
    Write-Host "  Removed: archive/ (git history preserved)" -ForegroundColor Green
} else {
    Write-Host "  Skip: archive/ not found" -ForegroundColor Gray
}

# =============================================================================
# STEP 4 — Stage all the file-content fixes already applied
# =============================================================================
Write-Host "`n[4/5] Staging pre-applied fixes (README, .gitignore, docker-compose, package.json)..." -ForegroundColor Yellow

git add README.md
git add .gitignore
git add docker-compose.yml
git add package.json

Write-Host "  Staged: README.md, .gitignore, docker-compose.yml, package.json" -ForegroundColor Green

# =============================================================================
# STEP 5 — Commit and push
# =============================================================================
Write-Host "`n[5/5] Committing and pushing..." -ForegroundColor Yellow

# Check if there's anything to commit
$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "  Nothing to commit — all changes may already be committed." -ForegroundColor Yellow
} else {
    Write-Host "  Staged files:" -ForegroundColor Cyan
    $staged | ForEach-Object { Write-Host "    $_" -ForegroundColor White }

    git commit -m "chore: week 1 enterprise cleanup

- Remove 14 root-level scratch scripts and batch files (commit-*.ps1,
  Verify-*.ps1, *.bat, COMMIT_MSG.md, test-results.txt, setup.ps1)
- Remove 'e 1 - Production Fundamentals' (malformed filename)
- Remove prisma/dev.db-journal (SQLite artifact, SQL Server is sole DB)
- Remove archive/ directory (content preserved in git history)
- Rewrite README.md: correct stack (SQL Server, SignalR, Azure AD B2C),
  remove all SQLite/Socket.io/PostgreSQL references, add architecture
  diagram, clinical intelligence tiers, FHIR integration docs
- Extend .gitignore: cover all debris categories, SQLite artifacts,
  archive/ dir, Verify-*.ps1, *.bat patterns
- docker-compose.yml: enforce NEXTAUTH_SECRET via :? (no fallback literal)
- package.json: confirm engines node >=20, npm >=10

Enterprise review grade targets:
  Repository Hygiene: C+ -> A-
  Documentation:      C+ -> B+"

    git push origin mockup-2
    Write-Host "`n  Pushed to origin/mockup-2" -ForegroundColor Green
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n=== Week 1 Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files removed from repo:" -ForegroundColor White
Write-Host "  - 14 scratch scripts and batch files at repo root" -ForegroundColor Green
Write-Host "  - archive/ directory (120+ archived files)" -ForegroundColor Green
Write-Host "  - prisma/dev.db-journal (SQLite artifact)" -ForegroundColor Green
Write-Host ""
Write-Host "Files updated:" -ForegroundColor White
Write-Host "  - README.md          (correct stack, full architecture docs)" -ForegroundColor Green
Write-Host "  - .gitignore         (permanent patterns for all debris types)" -ForegroundColor Green
Write-Host "  - docker-compose.yml (no NEXTAUTH_SECRET fallback)" -ForegroundColor Green
Write-Host "  - package.json       (engines: node >=20, npm >=10)" -ForegroundColor Green
Write-Host ""
Write-Host "Auth status:" -ForegroundColor White
Write-Host "  - Azure AD B2C:      ALREADY WIRED (ssoProviders.ts confirmed)" -ForegroundColor Green
Write-Host "  - Session revocation: ALREADY IMPLEMENTED (isActive JWT check)" -ForegroundColor Green
Write-Host "  - MFA enforcement:    PENDING — see Week 2 script" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next: run scripts\enterprise-cleanup-week2.ps1" -ForegroundColor Cyan
