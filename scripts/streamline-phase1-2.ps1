# ============================================================================
# ATTENDING AI - Phase 1 & 2 Streamlining Cleanup Script
# Run from: C:\Users\la6ke\Projects\ATTENDING
# Date: February 19, 2026
# ============================================================================
# SAFETY: This script only deletes files that are tracked in Git history.
# Run 'git status' after execution to verify changes.
# To undo: 'git checkout -- .' restores everything.
# ============================================================================

param(
    [switch]$DryRun = $false,
    [switch]$Phase1Only = $false
)

$root = "C:\Users\la6ke\Projects\ATTENDING"
$deleted = 0
$errors = @()

function Remove-SafeItem {
    param([string]$Path, [string]$Description)
    
    if (Test-Path $Path) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would delete: $Path" -ForegroundColor Yellow
        } else {
            try {
                Remove-Item -Path $Path -Recurse -Force
                Write-Host "  [DELETED] $Path" -ForegroundColor Green
                $script:deleted++
            } catch {
                Write-Host "  [ERROR] Failed to delete $Path : $_" -ForegroundColor Red
                $script:errors += $Path
            }
        }
    } else {
        Write-Host "  [SKIP] Not found: $Path" -ForegroundColor DarkGray
    }
}

# ============================================================================
# PHASE 1: Dead Weight Removal
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 1: Dead Weight Removal" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- 1.1 Delete .bak files ---
Write-Host "1.1 Removing .bak files..." -ForegroundColor White
Remove-SafeItem "$root\apps\provider-portal\pages\auth\signin.tsx.bak" ".bak file"
Remove-SafeItem "$root\apps\provider-portal\pages\auth\signin.tsx.bak2" ".bak file"
Remove-SafeItem "$root\apps\provider-portal\pages\index.tsx.bak" ".bak file"
Remove-SafeItem "$root\apps\provider-portal\pages\_app.tsx.bak2" ".bak file"
Remove-SafeItem "$root\packages\clinical-types\index.ts.bak" ".bak file"

# --- 1.2 Delete _archived directories ---
Write-Host "`n1.2 Removing _archived directories..." -ForegroundColor White
Remove-SafeItem "$root\apps\provider-portal\components\inbox\_archived" "_archived dir (12 files)"
Remove-SafeItem "$root\apps\provider-portal\components\layout\_archived" "_archived dir (6 files)"
Remove-SafeItem "$root\apps\provider-portal\store\_archived" "_archived dir (3 files)"
Remove-SafeItem "$root\apps\provider-portal\pages\_archived" "_archived dir (3 files + .bak)"
Remove-SafeItem "$root\scripts\_archived" "_archived dir (10 files)"

# --- 1.3 Remove mobile app placeholder ---
Write-Host "`n1.3 Removing mobile app placeholder..." -ForegroundColor White
Remove-SafeItem "$root\apps\mobile" "Placeholder mobile app (dirs-as-files)"

# --- 1.4 Remove empty component directories ---
Write-Host "`n1.4 Removing empty component directories..." -ForegroundColor White
Remove-SafeItem "$root\apps\provider-portal\components\command-center" "Empty directory"
Remove-SafeItem "$root\apps\provider-portal\components\voice" "Empty directory"
Remove-SafeItem "$root\apps\shared\services\learning-engine" "Empty directory"

# --- 1.5 Remove placeholder infrastructure ---
Write-Host "`n1.5 Removing placeholder infrastructure directories..." -ForegroundColor White
# These are directories named as files (e.g., Dockerfile/) containing only Readme.md
$placeholderInfra = @(
    "$root\infrastructure\docker\ai-services.Dockerfile",
    "$root\infrastructure\docker\backend.Dockerfile",
    "$root\infrastructure\docker\docker-compose.dev.yml",
    "$root\infrastructure\docker\docker-compose.yml",
    "$root\infrastructure\docker\patient-portal.Dockerfile",
    "$root\infrastructure\docker\provider-portal.Dockerfile",
    "$root\infrastructure\terraform\main.tf",
    "$root\infrastructure\terraform\outputs.tf",
    "$root\infrastructure\terraform\variables.tf",
    "$root\infrastructure\terraform\aws",
    "$root\infrastructure\terraform\gcp",
    "$root\infrastructure\kubernetes\namespace.yaml",
    "$root\infrastructure\kubernetes\backend\configmap.yaml",
    "$root\infrastructure\kubernetes\backend\deployment.yaml",
    "$root\infrastructure\kubernetes\backend\service.yaml",
    "$root\infrastructure\kubernetes\patient-portal\deployment.yaml",
    "$root\infrastructure\kubernetes\patient-portal\ingress.yaml",
    "$root\infrastructure\kubernetes\patient-portal\service.yaml"
)
foreach ($item in $placeholderInfra) {
    # Only delete if it's a directory containing just Readme.md
    if ((Test-Path $item) -and (Test-Path "$item\Readme.md")) {
        $children = Get-ChildItem $item -Force
        if ($children.Count -eq 1 -and $children[0].Name -eq "Readme.md") {
            Remove-SafeItem $item "Placeholder dir with only Readme.md"
        }
    }
}

# Also remove placeholder service dirs (dirs-as-files pattern)
$placeholderServices = @(
    "$root\services\ai-service\Dockerfile",
    "$root\services\ai-service\requirements.txt",
    "$root\services\ai-service\src\main.py",
    "$root\services\ai-service\src\__init__.py",
    "$root\services\ai-service\src\endpoints\analysis.py",
    "$root\services\ai-service\src\endpoints\predictions.py",
    "$root\services\ai-service\src\endpoints\__init__.py",
    "$root\services\ai-service\src\models\clinical_predictor.py",
    "$root\services\ai-service\src\models\symptom_analyzer.py",
    "$root\services\ai-service\src\models\__init__.py",
    "$root\services\ai-service\src\utils\medical_nlp.py",
    "$root\services\ai-service\src\utils\__init__.py",
    "$root\services\notification-service\Dockerfile"
)
foreach ($item in $placeholderServices) {
    if ((Test-Path $item) -and (Test-Path "$item\Readme.md")) {
        $children = Get-ChildItem $item -Force
        if ($children.Count -eq 1 -and $children[0].Name -eq "Readme.md") {
            Remove-SafeItem $item "Placeholder dir with only Readme.md"
        }
    }
}

# Also placeholder docs dirs
$placeholderDocs = @(
    "$root\docs\contributing.md",
    "$root\docs\deployment\production.md",
    "$root\docs\deployment\staging.md",
    "$root\docs\development\api-documentation.md",
    "$root\docs\development\component-library.md",
    "$root\docs\development\contributing.md",
    "$root\docs\development\getting-started.md",
    "$root\docs\scripts\deploy.sh",
    "$root\docs\scripts\generate-types.js",
    "$root\docs\scripts\setup.sh",
    "$root\docs\scripts\test-medical.sh",
    "$root\docs\medical\assessment-protocols.md",
    "$root\docs\medical\clinical-workflows.md",
    "$root\docs\medical\emergency-procedures.md"
)
foreach ($item in $placeholderDocs) {
    if ((Test-Path $item) -and (Test-Path "$item\Readme.md")) {
        $children = Get-ChildItem $item -Force
        if ($children.Count -eq 1 -and $children[0].Name -eq "Readme.md") {
            Remove-SafeItem $item "Placeholder docs dir"
        }
    }
}

# --- 1.6 Archive root-level session docs ---
Write-Host "`n1.6 Archiving root-level session documents..." -ForegroundColor White
$archiveDir = "$root\docs\archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -Path $archiveDir -ItemType Directory -Force | Out-Null
    Write-Host "  [CREATED] docs\archive\" -ForegroundColor Green
}

$rootDocs = @(
    "CLEANUP_COMPLETE.md",
    "CODE_REVIEW_FIXES.md",
    "COMPREHENSIVE_APPLICATION_REVIEW.md",
    "EXPERT_CODE_REVIEW.md",
    "IMPLEMENTATION_PROGRESS.md",
    "NEXT_STEPS.md",
    "PATIENT_PORTAL_FIXED.md",
    "PATIENT_PORTAL_STATUS.md",
    "PHASE_1_IMPLEMENTATION.md",
    "PHASE_2_IMPLEMENTATION.md",
    "PHASE_3_IMPLEMENTATION.md",
    "REPOSITORY_STRUCTURE.md",
    "SECURITY_IMPROVEMENTS_SUMMARY.md",
    "STREAMLINING_GUIDE.md",
    "STREAMLINING_SESSION_6.md",
    "TYPE_FIXES_AND_PORTAL_IMPLEMENTATION.md",
    "TYPESCRIPT_FIXES_APPLIED.md"
)

foreach ($doc in $rootDocs) {
    $src = "$root\$doc"
    $dst = "$archiveDir\$doc"
    if (Test-Path $src) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would move: $doc -> docs\archive\" -ForegroundColor Yellow
        } else {
            try {
                Move-Item -Path $src -Destination $dst -Force
                Write-Host "  [MOVED] $doc -> docs\archive\" -ForegroundColor Green
                $script:deleted++
            } catch {
                Write-Host "  [ERROR] Failed to move $doc : $_" -ForegroundColor Red
            }
        }
    }
}

# Move loose test/utility files from root
Write-Host "`n1.7 Removing loose root files..." -ForegroundColor White
Remove-SafeItem "$root\check-db.ts" "Loose test file"
Remove-SafeItem "$root\final-test.ts" "Loose test file"
Remove-SafeItem "$root\test-all.ts" "Loose test file"
Remove-SafeItem "$root\test-endpoints.ts" "Loose test file"
Remove-SafeItem "$root\test-prisma.ts" "Loose test file"
Remove-SafeItem "$root\e 1 - Production Fundamentals" "Loose file"

# --- 1.8 Clean up redundant scripts ---
Write-Host "`n1.8 Cleaning up redundant scripts..." -ForegroundColor White
$redundantScripts = @(
    "$root\scripts\cleanup-complete.ps1",
    "$root\scripts\cleanup-duplicates.ps1",
    "$root\scripts\cleanup-github.ps1",
    "$root\scripts\cleanup-orphan-files.bat",
    "$root\scripts\cleanup-orphans.ps1",
    "$root\scripts\cleanup-structure.ps1",
    "$root\scripts\cleanup-unused-imports.ps1",
    "$root\scripts\cleanup.bat",
    "$root\scripts\fix-build.bat",
    "$root\scripts\fix-imports.ps1",
    "$root\scripts\git-push-fixes.bat",
    "$root\scripts\streamline-codebase.ps1",
    "$root\scripts\switch-dashboard.ps1",
    "$root\scripts\migrate-stores.ps1",
    "$root\scripts\check-patient-portal.bat",
    "$root\scripts\verify-build.bat"
)
foreach ($script in $redundantScripts) {
    Remove-SafeItem $script "Redundant maintenance script"
}

# Also remove duplicate switch-dashboard in provider-portal
Remove-SafeItem "$root\apps\provider-portal\scripts\switch-dashboard.ps1" "Duplicate script"

# Remove provider-portal session docs
Remove-SafeItem "$root\apps\provider-portal\CHAT_IMPROVEMENTS_SUMMARY.md" "Session doc"
Remove-SafeItem "$root\apps\provider-portal\DASHBOARD_SUMMARY.md" "Session doc"
Remove-SafeItem "$root\apps\provider-portal\ENHANCEMENT_SUMMARY.md" "Session doc"
Remove-SafeItem "$root\apps\provider-portal\build-verification.html" "One-off verification file"
Remove-SafeItem "$root\apps\provider-portal\test-build.js" "One-off test file"
Remove-SafeItem "$root\apps\provider-portal\README-BIOMISTRAL.md" "Session doc"

if ($Phase1Only) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " Phase 1 Complete" -ForegroundColor Cyan
    Write-Host " Deleted/moved: $deleted items" -ForegroundColor Green
    if ($errors.Count -gt 0) {
        Write-Host " Errors: $($errors.Count)" -ForegroundColor Red
    }
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit
}

# ============================================================================
# PHASE 2: Service Tier Pruning (file moves)
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 2: Service Tier Pruning" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- 2.1 Move stub services to _future ---
Write-Host "2.1 Moving stub services to _future/..." -ForegroundColor White
$futureDir = "$root\apps\shared\services\_future"
if (-not (Test-Path $futureDir)) {
    New-Item -Path $futureDir -ItemType Directory -Force | Out-Null
    Write-Host "  [CREATED] apps\shared\services\_future\" -ForegroundColor Green
}

$stubServices = @(
    "interpreter",
    "wearables",
    "social-support",
    "end-of-life",
    "mental-health",
    "smart-scheduling",
    "population-health",
    "peer-consult"
)

$stubPatientEngagement = @(
    "FamilyHealthHubService.ts",
    "HealthCoachingService.ts",
    "MedicationBuddyService.ts",
    "PostDischargeConciergeService.ts"
)

foreach ($svc in $stubServices) {
    $src = "$root\apps\shared\services\$svc"
    $dst = "$futureDir\$svc"
    if (Test-Path $src) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would move: services\$svc -> services\_future\$svc" -ForegroundColor Yellow
        } else {
            try {
                Move-Item -Path $src -Destination $dst -Force
                Write-Host "  [MOVED] services\$svc -> services\_future\" -ForegroundColor Green
                $script:deleted++
            } catch {
                Write-Host "  [ERROR] Failed to move $svc : $_" -ForegroundColor Red
            }
        }
    }
}

# Move stub patient-engagement services
$peFutureDir = "$futureDir\patient-engagement"
if (-not (Test-Path $peFutureDir)) {
    New-Item -Path $peFutureDir -ItemType Directory -Force | Out-Null
}
foreach ($file in $stubPatientEngagement) {
    $src = "$root\apps\shared\services\patient-engagement\$file"
    $dst = "$peFutureDir\$file"
    if (Test-Path $src) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would move: $file -> _future\patient-engagement\" -ForegroundColor Yellow
        } else {
            try {
                Move-Item -Path $src -Destination $dst -Force
                Write-Host "  [MOVED] $file -> _future\patient-engagement\" -ForegroundColor Green
                $script:deleted++
            } catch {
                Write-Host "  [ERROR] Failed to move $file : $_" -ForegroundColor Red
            }
        }
    }
}

# --- 2.2 Remove duplicate patient portal components ---
Write-Host "`n2.2 Removing duplicate patient portal chat components..." -ForegroundColor White
# The assessment/ directory duplicates chat/ which duplicates shared/
# Keep shared/ versions as canonical, keep assessment/ (actively used), remove chat/ duplicates
$dupChatFiles = @(
    "$root\apps\patient-portal\components\chat\ChatContainer.tsx",
    "$root\apps\patient-portal\components\chat\EmergencyModal.tsx",
    "$root\apps\patient-portal\components\chat\QuickReplies.tsx",
    "$root\apps\patient-portal\components\chat\MessageBubble.tsx"
)
foreach ($file in $dupChatFiles) {
    Remove-SafeItem $file "Duplicate of assessment/ or shared/ version"
}
# Keep ChatInput.tsx and ProgressTracker.tsx as they may be unique

# Remove duplicate CameraCapture
Remove-SafeItem "$root\apps\patient-portal\components\CameraCapture.tsx" "Duplicate of media/CameraCapture.tsx"

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Cleanup Complete" -ForegroundColor Cyan
Write-Host " Items processed: $deleted" -ForegroundColor Green
if ($errors.Count -gt 0) {
    Write-Host " Errors: $($errors.Count)" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "   - $e" -ForegroundColor Red }
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "  1. Run 'git status' to review all changes" -ForegroundColor White
Write-Host "  2. Run 'git add -A && git commit -m `"chore: Phase 1+2 streamlining cleanup`"'" -ForegroundColor White
Write-Host "  3. Run 'npm run type-check' to verify no imports broke" -ForegroundColor White
Write-Host "  4. The registerServices.ts file has been updated separately" -ForegroundColor White
