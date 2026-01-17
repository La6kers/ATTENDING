# ============================================================
# ATTENDING AI - Quick-Win Streamlining Script
# scripts/streamline-quick-wins.ps1
# 
# Run: .\scripts\streamline-quick-wins.ps1
# ============================================================

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Quick-Win Cleanup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Track cleanup stats
$removedCount = 0
$archivedCount = 0

# --------------------------------------------
# 1. Fix GitHub Workflow Structure
# --------------------------------------------
Write-Host "1. Fixing GitHub workflow structure..." -ForegroundColor Yellow

$workflowDirs = @(
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-production.yml",
    ".github/workflows/deploy-staging.yml",
    ".github/workflows/security-scan"
)

foreach ($dir in $workflowDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath -PathType Container) {
        if (-not $DryRun) {
            Remove-Item -Recurse -Force $fullPath
        }
        Write-Host "   [REMOVED] $dir" -ForegroundColor Green
        $removedCount++
    }
}

# Also fix ISSUE_TEMPLATE structure
$issueTemplateDirs = @(
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/ISSUE_TEMPLATE/Medical_accuracy_issue.md",
    ".github/pull_request_template.md"
)

foreach ($dir in $issueTemplateDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath -PathType Container) {
        if (-not $DryRun) {
            Remove-Item -Recurse -Force $fullPath
        }
        Write-Host "   [REMOVED] $dir (was directory)" -ForegroundColor Green
        $removedCount++
    }
}

Write-Host ""

# --------------------------------------------
# 2. Remove Backup Files
# --------------------------------------------
Write-Host "2. Removing backup files..." -ForegroundColor Yellow

$backupFiles = @(
    "apps/provider-portal/lib/prisma.ts.bak",
    "apps/provider-portal/store/referralOrderingStore.backup.ts"
)

foreach ($file in $backupFiles) {
    $fullPath = Join-Path $projectRoot $file
    if (Test-Path $fullPath) {
        if (-not $DryRun) {
            Remove-Item $fullPath -Force
        }
        Write-Host "   [REMOVED] $file" -ForegroundColor Green
        $removedCount++
    }
}

Write-Host ""

# --------------------------------------------
# 3. Archive Dashboard Variants
# --------------------------------------------
Write-Host "3. Archiving dashboard variants..." -ForegroundColor Yellow

$archiveDir = Join-Path $projectRoot "apps/provider-portal/pages/_archived"

if (-not (Test-Path $archiveDir)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    }
    Write-Host "   [CREATED] _archived directory" -ForegroundColor Green
}

$dashboardVariants = @(
    "apps/provider-portal/pages/index.original.tsx",
    "apps/provider-portal/pages/index.resizable.tsx"
)

foreach ($file in $dashboardVariants) {
    $fullPath = Join-Path $projectRoot $file
    $fileName = Split-Path $file -Leaf
    $archivePath = Join-Path $archiveDir $fileName
    
    if (Test-Path $fullPath) {
        if (-not $DryRun) {
            Move-Item $fullPath $archivePath -Force
        }
        Write-Host "   [ARCHIVED] $file" -ForegroundColor Green
        $archivedCount++
    }
}

Write-Host ""

# --------------------------------------------
# 4. Clean Empty Placeholder Directories
# --------------------------------------------
Write-Host "4. Identifying placeholder-only directories..." -ForegroundColor Yellow

$placeholderDirs = @(
    "infrastructure/docker",
    "infrastructure/kubernetes",
    "infrastructure/terraform"
)

foreach ($dir in $placeholderDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath) {
        # Count non-Readme files
        $realFiles = Get-ChildItem -Path $fullPath -Recurse -File | Where-Object { $_.Name -notlike "Readme.md" -and $_.Name -notlike "README.md" }
        if ($realFiles.Count -eq 0) {
            Write-Host "   [PLACEHOLDER] $dir (only contains Readme.md files)" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""

# --------------------------------------------
# 5. Summary
# --------------------------------------------
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CLEANUP SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files/Dirs Removed: $removedCount" -ForegroundColor $(if ($removedCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Files Archived:     $archivedCount" -ForegroundColor $(if ($archivedCount -gt 0) { "Green" } else { "Gray" })
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Run without -DryRun flag to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "Cleanup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'npm run build' to verify everything works"
    Write-Host "  2. Commit changes: git add -A && git commit -m 'chore: cleanup dead code and archive dashboard variants'"
    Write-Host "  3. Push to remote: git push origin mockup-2"
}
