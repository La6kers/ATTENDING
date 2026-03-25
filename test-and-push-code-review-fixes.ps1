# =============================================================================
# ATTENDING AI -- Code Review Fix: Test & Push Script
# Generated 2025-03-05
#
# Changes implemented:
#   Fix 1  - Removed duplicate audit logic from DbContext (interceptor is sole owner)
#   Fix 2  - Domain events now dispatched on ALL SaveChangesAsync overloads
#   Fix 3  - COMPASS no longer creates duplicate patients (name+DOB dedup)
#   Fix 4  - Medications, allergies, medical/surgical/family/social history now persisted
#   Fix 5  - COMPASS submissions require ClinicSlug for proper tenant assignment
#   Fix 6  - Notification blocks in AssessmentsController extracted to single helper
#   Fix 7  - Global string default raised from 500 to 2000 chars
#   Fix 8  - Patient.CalculateAge() uses DateTime.UtcNow.Date (was DateTime.Today)
#   Fix 10 - Stopwatch moved inside Handle() in PerformanceBehavior
#   Fix 11 - Backend junk files added to .gitignore; git-untracked below
#   Fix 14 - X-Powered-By header removed from ApiVersionHeaderMiddleware
#   Fix 15 - GetPendingReviewCountAsync added (SELECT COUNT vs full materialization)
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$BackendDir = "$PSScriptRoot\backend"
$RootDir    = $PSScriptRoot

# ─── Color helpers ────────────────────────────────────────────────────────────
function Write-Step   { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok     { param($msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "    WARN: $msg" -ForegroundColor Yellow }
function Write-Fail   { param($msg) Write-Host "    FAIL: $msg" -ForegroundColor Red }

# =============================================================================
# STEP 1 -- Remove accidentally-committed junk files from git tracking
# =============================================================================
Write-Step "Removing junk files from git tracking (not deleting from disk)"

$JunkFiles = @(
    "backend\test-results.txt",
    "backend\test-results-fixed.txt",
    "backend\test-results-fixed2.txt",
    "backend\test-results-fixed3.txt",
    "backend\test-results-fixed4.txt",
    "backend\test-results-fixed5.txt",
    "backend\test-results-full.txt",
    "backend\test-results-full-api.txt",
    "backend\test-results-intelligence.txt",
    "backend\test-results-tier0.txt",
    "backend\build-results-api-wiring.txt",
    "backend\build-results-tier0.txt",
    "backend\git-commit-api-wiring.ps1",
    "backend\build-and-test-api.ps1",
    "backend\verify-h4.ps1",
    "commit-h4.ps1",
    "commit-patient-app.ps1",
    "commit-patient-v2.ps1",
    "commit-patient-v3.ps1",
    "commit-patient-v4.ps1",
    "commit-v3.ps1",
    "COMMIT_MSG.md"
)

Push-Location $RootDir
foreach ($f in $JunkFiles) {
    # git ls-files (without --error-unmatch) always exits 0.
    # It returns the filename if tracked, empty string if not.
    # This avoids any non-zero exit that would trip $ErrorActionPreference = "Stop".
    $normalized = $f -replace '\\', '/'
    $tracked = & git ls-files $normalized
    if ($tracked) {
        & git rm --cached $normalized
        Write-Ok "Untracked from index: $f"
    } else {
        Write-Warn "Already untracked (skip): $f"
    }
}
Pop-Location

# =============================================================================
# STEP 2 -- Build the backend
# =============================================================================
Write-Step "Building backend (dotnet build)"

Push-Location $BackendDir
dotnet build ATTENDING.Backend.sln --configuration Debug --nologo -warnaserror:nullable
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build failed. Fix errors above before continuing."
    exit 1
}
Write-Ok "Build succeeded"
Pop-Location

# =============================================================================
# STEP 3 -- Run unit + integration tests (non-Docker)
# =============================================================================
Write-Step "Running tests (excluding Docker-only category)"

Push-Location $BackendDir
dotnet test ATTENDING.Backend.sln `
    --configuration Debug `
    --no-build `
    --nologo `
    --filter "Category!=Docker" `
    --logger "console;verbosity=minimal"

if ($LASTEXITCODE -ne 0) {
    Write-Fail "One or more tests failed. Fix failures before pushing."
    exit 1
}
Write-Ok "All non-Docker tests passed"
Pop-Location

# =============================================================================
# STEP 4 -- Verify key changed files exist and are non-empty
# =============================================================================
Write-Step "Spot-checking changed files"

$ChangedFiles = @{
    "Domain BaseEntities (UTC age fix)"          = "backend\src\ATTENDING.Domain\Entities\BaseEntities.cs"
    "Domain Assessment (new setters)"            = "backend\src\ATTENDING.Domain\Entities\Assessment.cs"
    "Domain Repositories interface (new methods)"= "backend\src\ATTENDING.Domain\Interfaces\Repositories.cs"
    "Infrastructure DbContext (audit+events)"    = "backend\src\ATTENDING.Infrastructure\Data\AttendingDbContext.cs"
    "Infrastructure Repositories (dedup+count)"  = "backend\src\ATTENDING.Infrastructure\Repositories\Repositories.cs"
    "Infrastructure AdditionalRepos (count impl)"= "backend\src\ATTENDING.Infrastructure\Repositories\AdditionalRepositories.cs"
    "Application SubmitCompassCommand (full fix)"= "backend\src\ATTENDING.Application\Commands\Assessments\SubmitCompassAssessmentCommand.cs"
    "Application PipelineBehaviors (stopwatch)"  = "backend\src\ATTENDING.Application\Behaviors\PipelineBehaviors.cs"
    "API AssessmentsController (notify extract)" = "backend\src\ATTENDING.Orders.Api\Controllers\AssessmentsController.cs"
    "API Middleware (X-Powered-By removed)"      = "backend\src\ATTENDING.Orders.Api\Middleware\Middleware.cs"
    ".gitignore (junk patterns added)"           = ".gitignore"
}

Push-Location $RootDir
$allOk = $true
foreach ($desc in $ChangedFiles.Keys) {
    $path = $ChangedFiles[$desc]
    if (Test-Path $path) {
        Write-Ok $desc
    } else {
        Write-Fail "MISSING: $path  ($desc)"
        $allOk = $false
    }
}
Pop-Location

if (-not $allOk) {
    Write-Fail "Some expected files are missing. Aborting."
    exit 1
}

# =============================================================================
# STEP 5 -- Quick content smoke tests (grep for key patterns)
# =============================================================================
Write-Step "Smoke-testing key content changes"

function Assert-Contains {
    param($File, $Pattern, $Description)
    $content = Get-Content "$RootDir\$File" -Raw
    if ($content -match [regex]::Escape($Pattern)) {
        Write-Ok $Description
    } else {
        Write-Fail "MISSING pattern in ${File}: $Description"
        Write-Fail "  Expected: $Pattern"
        $script:smokeOk = $false
    }
}

$smokeOk = $true

Assert-Contains `
    "backend\src\ATTENDING.Domain\Entities\BaseEntities.cs" `
    "DateTime.UtcNow.Date" `
    "Age calc uses UTC (Fix 8)"

Assert-Contains `
    "backend\src\ATTENDING.Infrastructure\Data\AttendingDbContext.cs" `
    "DispatchDomainEventsAndSaveAsync" `
    "Single domain-event dispatch helper (Fix 2)"

Assert-Contains `
    "backend\src\ATTENDING.Infrastructure\Data\AttendingDbContext.cs" `
    "HaveMaxLength(2000)" `
    "Global string limit raised to 2000 (Fix 7)"

Assert-Contains `
    "backend\src\ATTENDING.Infrastructure\Data\AttendingDbContext.cs" `
    "StampAuditFields" `
    "Duplicate audit logic removed (Fix 1)"

Assert-Contains `
    "backend\src\ATTENDING.Domain\Interfaces\Repositories.cs" `
    "GetPendingReviewCountAsync" `
    "IAssessmentRepository count method (Fix 15)"

Assert-Contains `
    "backend\src\ATTENDING.Domain\Interfaces\Repositories.cs" `
    "FindByNameAndDobAsync" `
    "IPatientRepository dedup method (Fix 3)"

Assert-Contains `
    "backend\src\ATTENDING.Application\Commands\Assessments\SubmitCompassAssessmentCommand.cs" `
    "ClinicSlug" `
    "COMPASS requires ClinicSlug for org context (Fix 5)"

Assert-Contains `
    "backend\src\ATTENDING.Application\Commands\Assessments\SubmitCompassAssessmentCommand.cs" `
    "SetMedicationsJson" `
    "Medications persisted in COMPASS (Fix 4)"

Assert-Contains `
    "backend\src\ATTENDING.Application\Commands\Assessments\SubmitCompassAssessmentCommand.cs" `
    "SetAllergiesJson" `
    "Allergies persisted in COMPASS (Fix 4)"

Assert-Contains `
    "backend\src\ATTENDING.Application\Commands\Assessments\SubmitCompassAssessmentCommand.cs" `
    "FindByNameAndDobAsync" `
    "COMPASS dedup call (Fix 3)"

Assert-Contains `
    "backend\src\ATTENDING.Application\Behaviors\PipelineBehaviors.cs" `
    "Stopwatch.StartNew()" `
    "Stopwatch moved inside Handle (Fix 10)"

Assert-Contains `
    "backend\src\ATTENDING.Orders.Api\Middleware\Middleware.cs" `
    "X-Powered-By is intentionally omitted" `
    "X-Powered-By removed (Fix 14)"

Assert-Contains `
    "backend\src\ATTENDING.Orders.Api\Controllers\AssessmentsController.cs" `
    "FireAssessmentNotificationsAsync" `
    "Notification helper extracted in controller (Fix 6)"

if (-not $smokeOk) {
    Write-Fail "Smoke tests detected missing content. Review changes above."
    exit 1
}

Write-Ok "All smoke tests passed"

# =============================================================================
# STEP 6 -- Git commit
# =============================================================================
Write-Step "Staging and committing changes"

Push-Location $RootDir

git add `
    backend/src/ATTENDING.Domain/Entities/BaseEntities.cs `
    backend/src/ATTENDING.Domain/Entities/Assessment.cs `
    backend/src/ATTENDING.Domain/Interfaces/Repositories.cs `
    backend/src/ATTENDING.Infrastructure/Data/AttendingDbContext.cs `
    backend/src/ATTENDING.Infrastructure/Repositories/Repositories.cs `
    backend/src/ATTENDING.Infrastructure/Repositories/AdditionalRepositories.cs `
    backend/src/ATTENDING.Application/Commands/Assessments/SubmitCompassAssessmentCommand.cs `
    backend/src/ATTENDING.Application/Behaviors/PipelineBehaviors.cs `
    backend/src/ATTENDING.Orders.Api/Controllers/AssessmentsController.cs `
    backend/src/ATTENDING.Orders.Api/Middleware/Middleware.cs `
    .gitignore

$CommitMessage = @"
fix: address 12 code review findings from expert audit

Critical (pre-launch):
- fix(compass): require ClinicSlug for org context -- anonymous submissions
  were written with OrganizationId=Guid.Empty and invisible in provider queues
- fix(compass): persist medications, allergies, medical/surgical/family/social
  history that were previously collected but silently discarded
- fix(compass): deduplicate patients by name+DOB before creating new records;
  add IPatientRepository.FindByNameAndDobAsync + implementation

High priority:
- fix(dbcontext): remove duplicate UpdateAuditFields() -- AuditSaveChangesInterceptor
  is now the sole owner of audit stamping logic
- fix(dbcontext): domain events now dispatched from all SaveChangesAsync overloads
  via single DispatchDomainEventsAndSaveAsync helper (previously only one overload)
- fix(dbcontext): raise global string default from 500 to 2000 chars to prevent
  silent truncation of clinical text (JSON/free-text fields already nvarchar(max))

Medium priority:
- fix(repo): add IAssessmentRepository.GetPendingReviewCountAsync (SELECT COUNT
  vs full row materialization for queue-position calculation)
- fix(controller): extract FireAssessmentNotificationsAsync helper -- eliminates
  3x duplicated 30-line notification block in AssessmentsController

Low/cleanup:
- fix(entities): Patient.CalculateAge uses DateTime.UtcNow.Date (not DateTime.Today)
  to prevent off-by-one errors near birthdays on non-UTC servers
- fix(behaviors): move Stopwatch creation inside Handle() -- field-level instance
  is not safe under concurrent requests
- fix(middleware): remove X-Powered-By response header (information disclosure;
  contradicts Kestrel AddServerHeader=false)
- chore(git): add backend junk files to .gitignore and untrack from history
"@

git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Fail "git commit failed."
    exit 1
}

Write-Ok "Committed successfully"

# =============================================================================
# STEP 7 -- Push
# =============================================================================
Write-Step "Pushing to origin"

git push

if ($LASTEXITCODE -ne 0) {
    Write-Fail "git push failed. Check remote access and try: git push origin HEAD"
    exit 1
}

Write-Ok "Pushed successfully"
Pop-Location

# =============================================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " All 12 code review fixes committed + pushed " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "REMINDER -- two follow-up items NOT covered by this script:" -ForegroundColor Yellow
Write-Host "  1. Add an EF migration for the string length change (500 -> 2000):" -ForegroundColor Yellow
Write-Host "     cd backend" -ForegroundColor White
Write-Host "     dotnet ef migrations add Fix_GlobalStringLength_2000 --project src\ATTENDING.Infrastructure --startup-project src\ATTENDING.Orders.Api" -ForegroundColor White
Write-Host ""
Write-Host "  2. Update the patient portal COMPASS form to pass 'clinicSlug' in the" -ForegroundColor Yellow
Write-Host "     request body so anonymous submissions resolve to the correct org." -ForegroundColor Yellow
Write-Host "     The API will return 400 with a clear error message until this is done." -ForegroundColor Yellow
