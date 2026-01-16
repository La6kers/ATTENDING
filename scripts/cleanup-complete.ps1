# ============================================================
# ATTENDING AI - Complete Cleanup Script
# Run from project root: .\scripts\cleanup-complete.ps1
# ============================================================

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Complete Cleanup" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# Phase 1: Delete deprecated store/page files
# ============================================================

Write-Host "Phase 1: Deleting deprecated files..." -ForegroundColor Green

$filesToDelete = @(
    "apps\provider-portal\store\referralOrderingStore.backup.ts",
    "apps\provider-portal\pages\treatment-plans.tsx"
)

foreach ($file in $filesToDelete) {
    $path = Join-Path $ProjectRoot $file
    if (Test-Path $path) {
        if ($DryRun) {
            Write-Host "  [Would delete] $file" -ForegroundColor Yellow
        } else {
            Remove-Item $path -Force
            Write-Host "  [Deleted] $file" -ForegroundColor Red
        }
    } else {
        Write-Host "  [Not found] $file" -ForegroundColor DarkGray
    }
}

Write-Host ""

# ============================================================
# Phase 2: Delete duplicate utility files in patient-portal
# ============================================================

Write-Host "Phase 2: Removing duplicate utilities from patient-portal..." -ForegroundColor Green

$duplicateFiles = @(
    "apps\patient-portal\lib\prisma.ts",
    "apps\patient-portal\lib\utils.ts"
)

foreach ($file in $duplicateFiles) {
    $path = Join-Path $ProjectRoot $file
    if (Test-Path $path) {
        if ($DryRun) {
            Write-Host "  [Would delete] $file" -ForegroundColor Yellow
        } else {
            Remove-Item $path -Force
            Write-Host "  [Deleted] $file" -ForegroundColor Red
        }
    } else {
        Write-Host "  [Not found] $file" -ForegroundColor DarkGray
    }
}

Write-Host ""

# ============================================================
# Phase 3: Clean malformed GitHub workflow directories
# ============================================================

Write-Host "Phase 3: Cleaning malformed GitHub workflow directories..." -ForegroundColor Green

$malformedDirs = @(
    ".github\workflows\ci.yml",
    ".github\workflows\deploy-production.yml",
    ".github\workflows\deploy-staging.yml",
    ".github\workflows\security-scan"
)

foreach ($dir in $malformedDirs) {
    $path = Join-Path $ProjectRoot $dir
    if ((Test-Path $path) -and (Test-Path $path -PathType Container)) {
        if ($DryRun) {
            Write-Host "  [Would remove dir] $dir" -ForegroundColor Yellow
        } else {
            Remove-Item $path -Recurse -Force
            Write-Host "  [Removed dir] $dir" -ForegroundColor Red
        }
    } else {
        Write-Host "  [Not found/Not dir] $dir" -ForegroundColor DarkGray
    }
}

Write-Host ""

# ============================================================
# Phase 4: Clean empty directories
# ============================================================

Write-Host "Phase 4: Cleaning empty directories..." -ForegroundColor Green

$dirsToCheck = @(
    "apps\patient-portal\lib"
)

foreach ($dir in $dirsToCheck) {
    $path = Join-Path $ProjectRoot $dir
    if (Test-Path $path) {
        $items = Get-ChildItem $path -File -Recurse -ErrorAction SilentlyContinue
        if ($items.Count -eq 0) {
            if ($DryRun) {
                Write-Host "  [Would remove empty dir] $dir" -ForegroundColor Yellow
            } else {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  [Removed empty] $dir" -ForegroundColor Red
            }
        } else {
            Write-Host "  [Has files] $dir ($($items.Count) files)" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""

# ============================================================
# Phase 5: Verify build
# ============================================================

Write-Host "Phase 5: Verifying TypeScript..." -ForegroundColor Green

if (-not $DryRun) {
    Push-Location $ProjectRoot
    try {
        Write-Host "  Running typecheck..." -ForegroundColor Gray
        $result = & npm run typecheck 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [PASS] TypeScript compilation successful" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] TypeScript errors found - review output" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [SKIP] Could not run typecheck" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Summary of actions:" -ForegroundColor White
Write-Host "  - Deleted deprecated backup files" -ForegroundColor Gray
Write-Host "  - Removed duplicate utility files" -ForegroundColor Gray
Write-Host "  - Cleaned malformed workflow directories" -ForegroundColor Gray
Write-Host "  - Cleaned empty directories" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "This was a DRY RUN. Run without -DryRun to apply changes:" -ForegroundColor Yellow
    Write-Host "  .\scripts\cleanup-complete.ps1" -ForegroundColor White
} else {
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Run 'npm run dev' to verify the app starts" -ForegroundColor Gray
    Write-Host "  2. Test all modules (labs, imaging, meds, referrals)" -ForegroundColor Gray
    Write-Host "  3. Commit: git add -A && git commit -m 'chore: complete codebase cleanup'" -ForegroundColor Gray
}
