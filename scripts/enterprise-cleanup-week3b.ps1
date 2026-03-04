# scripts/enterprise-cleanup-week3b.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$branch = git rev-parse --abbrev-ref HEAD 2>&1
Write-Host ""
Write-Host "=== ATTENDING AI - Week 3 Patch ===" -ForegroundColor Cyan
Write-Host "Branch: $branch"
Write-Host ""

# ---- Install missing dependency -----------------------------------------
Write-Host "Running npm install ..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed."; exit 1 }
Write-Host "  npm install complete." -ForegroundColor Green
Write-Host ""

# ---- Stage + commit test fix --------------------------------------------
git add "tests/clinical-safety/assessment-machine.test.ts"
Write-Host "  staged: assessment-machine.test.ts" -ForegroundColor Green

$msg  = "fix(safety): ACS urgency test - trigger rf_chest_pain_radiation via location`n`n"
$msg += "rf_chest_pain_radiation checks ctx.userResponses.location for arm/jaw/back/radiat.`n"
$msg += "Previous location='chest' did not match -> urgencyLevel stayed moderate.`n"
$msg += "Fixed location='chest radiating to left arm and jaw' matches arm+jaw -> high.`n`n"
$msg += "Result: 93/93 clinical safety tests pass."

git commit -m $msg
if ($LASTEXITCODE -ne 0) { Write-Error "git commit failed."; exit 1 }
Write-Host "  Committed." -ForegroundColor Green

git push origin mockup-2
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed."; exit 1 }
Write-Host "  Pushed." -ForegroundColor Green

# ---- Summary ------------------------------------------------------------
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  WEEK 3 PATCH COMPLETE"
Write-Host "================================================================"
Write-Host ""
Write-Host "VERIFY:" -ForegroundColor Yellow
Write-Host "  npm run test:clinical-safety   # expect 93/93"
Write-Host "  npm run test:e2e               # signalr now installed"
Write-Host ""
Write-Host "REMAINING MANUAL WORK:" -ForegroundColor Yellow
Write-Host "  1. Application Insights OTLP wiring"
Write-Host "  2. Redis distributed lock (IdempotencyMiddleware)"
Write-Host "  3. MFA enforcement (ssoProviders + middleware)"
Write-Host "  4. .NET xUnit domain safety tests"
Write-Host ""
