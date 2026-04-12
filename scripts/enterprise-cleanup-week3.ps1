# =============================================================================
# ATTENDING AI - Week 3 Enterprise Cleanup Script
# scripts/enterprise-cleanup-week3.ps1
#
# Commits:
#   1. Drug interaction safety tests  (tests/clinical-safety/drug-interactions.test.ts)
#   2. Assessment machine safety tests (tests/clinical-safety/assessment-machine.test.ts)
#   3. Clinical safety vitest config   (tests/clinical-safety/vitest.config.ts)
#   4. Critical-path E2E test          (apps/provider-portal/e2e/critical-path.spec.ts)
#   5. ProviderShell JSX syntax fix    (apps/provider-portal/components/layout/ProviderShell.tsx)
#   6. Updated CLINICAL_SAFETY.md checklist
#   7. Updated package.json (test:clinical-safety scripts)
#
# Run from repo root:
#   .\scripts\enterprise-cleanup-week3.ps1
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---- Guard: confirm branch ----------------------------------------------

$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($branch -ne 'mockup-2') {
    Write-Warning "Current branch is '$branch', expected 'mockup-2'."
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') { exit 1 }
}

Write-Host ""
Write-Host "=== ATTENDING AI - Week 3 Enterprise Cleanup ===" -ForegroundColor Cyan
Write-Host "Branch: $branch"
Write-Host ""

# ---- Stage all Week 3 deliverables --------------------------------------

$filesToStage = @(
    "tests/clinical-safety/drug-interactions.test.ts",
    "tests/clinical-safety/assessment-machine.test.ts",
    "tests/clinical-safety/vitest.config.ts",
    "apps/provider-portal/e2e/critical-path.spec.ts",
    "apps/provider-portal/components/layout/ProviderShell.tsx",
    "docs/CLINICAL_SAFETY.md",
    "package.json"
)

foreach ($file in $filesToStage) {
    if (Test-Path $file) {
        git add $file
        Write-Host "  staged: $file" -ForegroundColor Green
    } else {
        Write-Warning "  MISSING (skipped): $file"
    }
}

# ---- Commit (plain string - no here-string to avoid encoding issues) ----

$msg = "feat(safety): Week 3 - clinical safety test suite + critical-path E2E`n`n"
$msg += "CLINICAL SAFETY TESTS (tests/clinical-safety/)`n"
$msg += "  drug-interactions.test.ts`n"
$msg += "    14 critical drug pairs: warfarin/NSAIDs, SSRI+MAOI (contraindicated),`n"
$msg += "    SSRI+tramadol, ACE+spironolactone, digoxin+amiodarone,`n"
$msg += "    methotrexate/NSAIDs, lithium/NSAIDs, statin+fibrate,`n"
$msg += "    benzo+opioid, metformin+contrast, ciprofloxacin+theophylline`n"
$msg += "    Cross-reactivity: penicillin, sulfa, NSAIDs, cephalosporin`n"
$msg += "    Pregnancy Category X, renal dose adjustment, false-positive prevention`n"
$msg += "`n"
$msg += "  assessment-machine.test.ts (XState v4 - uses interpret())`n"
$msg += "    All 18 state nodes verified in machine definition`n"
$msg += "    All OLDCARTS phases visited in correct sequence`n"
$msg += "    Emergency transition reachable from 7 different phases`n"
$msg += "    Emergency invariants: urgencyLevel=high, urgencyScore=100`n"
$msg += "    All 7 HPI fields populated after full assessment`n"
$msg += "    Mid-assessment red-flag detection (ACS + thunderclap headache)`n"
$msg += "    BACK / SKIP / NO event paths`n"
$msg += "    Urgency scoring calibration`n"
$msg += "`n"
$msg += "E2E CRITICAL PATH (apps/provider-portal/e2e/critical-path.spec.ts)`n"
$msg += "    COMPASS submission, provider dashboard, lab ordering,`n"
$msg += "    SignalR client health, clinical intelligence endpoints,`n"
$msg += "    security headers, performance benchmarks`n"
$msg += "`n"
$msg += "BUG FIX`n"
$msg += "    ProviderShell.tsx: unclosed ternary in className template literal`n"
$msg += "`n"
$msg += "DOCUMENTATION`n"
$msg += "    CLINICAL_SAFETY.md: 23/27 checklist items now checked`n"
$msg += "`n"
$msg += "BUILD`n"
$msg += "    package.json: test:clinical-safety, :watch, :coverage scripts added"

git commit -m $msg

if ($LASTEXITCODE -ne 0) {
    Write-Error "git commit failed. Check staged files and try again."
    exit 1
}

Write-Host ""
Write-Host "  Committed successfully." -ForegroundColor Green

# ---- Push ---------------------------------------------------------------

Write-Host ""
Write-Host "Pushing to origin/mockup-2 ..."
git push origin mockup-2

if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed."
    exit 1
}

Write-Host "  Pushed successfully." -ForegroundColor Green

# ---- Summary ------------------------------------------------------------

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  WEEK 3 COMPLETE - Committed and Pushed" -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host ""
Write-Host "FILES COMMITTED:" -ForegroundColor Yellow
Write-Host "  tests/clinical-safety/drug-interactions.test.ts"
Write-Host "  tests/clinical-safety/assessment-machine.test.ts  (XState v4 fixed)"
Write-Host "  tests/clinical-safety/vitest.config.ts"
Write-Host "  apps/provider-portal/e2e/critical-path.spec.ts"
Write-Host "  apps/provider-portal/components/layout/ProviderShell.tsx  (JSX fix)"
Write-Host "  docs/CLINICAL_SAFETY.md  (23/27 items checked)"
Write-Host "  package.json  (test:clinical-safety scripts)"
Write-Host ""
Write-Host "RUN THE NEW TESTS:" -ForegroundColor Yellow
Write-Host "  npm run test:clinical-safety"
Write-Host "  npm run test:e2e"
Write-Host ""
Write-Host "================================================================"
Write-Host "  REMAINING MANUAL WORK (Week 3 / Week 4)"
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. APPLICATION INSIGHTS / OPENTELEMETRY  (~1 day)"
Write-Host "   File: backend/src/ATTENDING.Orders.Api/appsettings.Production.json"
Write-Host "   Set OtlpEndpoint to Azure Monitor OTLP endpoint"
Write-Host "   Env:  APPLICATIONINSIGHTS_CONNECTION_STRING"
Write-Host ""
Write-Host "2. REDIS DISTRIBUTED LOCK  (~2 days)"
Write-Host "   File: backend/src/ATTENDING.Orders.Api/Middleware/IdempotencyMiddleware.cs"
Write-Host "   Replace ConcurrentDictionary with RedLock.net or StackExchange.Redis SETNX"
Write-Host ""
Write-Host "3. MFA ENFORCEMENT  (~1 day)"
Write-Host "   File: apps/shared/lib/auth/ssoProviders.ts"
Write-Host "   Check mfaEnabled in jwt() callback, set mfaRequired=true if incomplete"
Write-Host "   File: apps/provider-portal/middleware.ts"
Write-Host "   Redirect to /auth/mfa if token.mfaRequired"
Write-Host ""
Write-Host "4. .NET DOMAIN SAFETY TESTS  (~2 days)"
Write-Host "   Create: backend/tests/ATTENDING.Domain.Tests/RedFlagEvaluatorTests.cs"
Write-Host "   Create: backend/tests/ATTENDING.Domain.Tests/DrugInteractionServiceTests.cs"
Write-Host "   Mirror all pairs and patterns from docs/CLINICAL_SAFETY.md"
Write-Host ""
Write-Host "Run when ready for Week 4:"
Write-Host "  .\scripts\enterprise-cleanup-week4.ps1" -ForegroundColor Cyan
Write-Host ""
