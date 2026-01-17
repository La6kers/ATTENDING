# =============================================================================
# ATTENDING AI - Streamlining Cleanup Script
# scripts/streamline-cleanup.ps1
# 
# Date: January 15, 2026
# Purpose: Clean up redundant files and consolidate the codebase
# =============================================================================

$ErrorActionPreference = "Continue"
$RootPath = Split-Path -Parent $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Streamlining Cleanup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Track changes
$removedFiles = @()
$archivedFiles = @()
$errors = @()

# =============================================================================
# 1. REMOVE STALE BACKUP FILES
# =============================================================================

Write-Host "[1/4] Removing stale backup files..." -ForegroundColor Yellow

$backupFiles = @(
    "$RootPath\apps\provider-portal\store\referralOrderingStore.backup.ts"
)

foreach ($file in $backupFiles) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            $removedFiles += $file
            Write-Host "  Removed: $file" -ForegroundColor Green
        }
        catch {
            $errors += "Failed to remove: $file - $_"
            Write-Host "  Failed: $file" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  Already removed: $file" -ForegroundColor Gray
    }
}

# =============================================================================
# 2. REMOVE DEPRECATED STORE DIRECTORY
# =============================================================================

Write-Host ""
Write-Host "[2/4] Removing deprecated store directory..." -ForegroundColor Yellow

$deprecatedDir = "$RootPath\apps\provider-portal\store\_deprecated"
if (Test-Path $deprecatedDir) {
    try {
        Remove-Item $deprecatedDir -Recurse -Force
        $removedFiles += $deprecatedDir
        Write-Host "  Removed: $deprecatedDir" -ForegroundColor Green
    }
    catch {
        $errors += "Failed to remove: $deprecatedDir - $_"
        Write-Host "  Failed: $deprecatedDir" -ForegroundColor Red
    }
}
else {
    Write-Host "  Already removed: $deprecatedDir" -ForegroundColor Gray
}

# =============================================================================
# 3. REMOVE DUPLICATE TREATMENT PAGE
# =============================================================================

Write-Host ""
Write-Host "[3/4] Removing duplicate treatment-plan page..." -ForegroundColor Yellow

$duplicatePage = "$RootPath\apps\provider-portal\pages\treatment-plan.tsx"
if (Test-Path $duplicatePage) {
    try {
        Remove-Item $duplicatePage -Force
        $removedFiles += $duplicatePage
        Write-Host "  Removed: $duplicatePage" -ForegroundColor Green
        Write-Host "    (Keeping treatment-plans.tsx as the canonical version)" -ForegroundColor Gray
    }
    catch {
        $errors += "Failed to remove: $duplicatePage - $_"
        Write-Host "  Failed: $duplicatePage" -ForegroundColor Red
    }
}
else {
    Write-Host "  Already removed: $duplicatePage" -ForegroundColor Gray
}

# =============================================================================
# 4. CREATE ARCHIVE DIRECTORY
# =============================================================================

Write-Host ""
Write-Host "[4/4] Setting up archive directory..." -ForegroundColor Yellow

$archiveDir = "$RootPath\docs\archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "  Created: $archiveDir" -ForegroundColor Green
}
else {
    Write-Host "  Already exists: $archiveDir" -ForegroundColor Gray
}

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "CLEANUP SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Files Removed: $($removedFiles.Count)" -ForegroundColor Green
foreach ($file in $removedFiles) {
    Write-Host "  - $file" -ForegroundColor Gray
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors: $($errors.Count)" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
