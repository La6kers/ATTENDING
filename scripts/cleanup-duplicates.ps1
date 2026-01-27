# ============================================================
# ATTENDING AI - Cleanup Script
# Run this in PowerShell from the project root
# ============================================================

Write-Host "ATTENDING AI - Cleanup Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "C:\Users\la6ke\Projects\ATTENDING"

# Check if we're in the right directory
if (-not (Test-Path $projectRoot)) {
    Write-Host "ERROR: Project root not found at $projectRoot" -ForegroundColor Red
    exit 1
}

Write-Host "Cleaning up orphaned duplicate directories..." -ForegroundColor Yellow
Write-Host ""

# 1. Delete orphaned data/catalogs (moved to apps/shared/catalogs/)
$dataCatalogs = "$projectRoot\apps\shared\data\catalogs"
if (Test-Path $dataCatalogs) {
    Write-Host "  Removing: apps\shared\data\catalogs\ (orphaned - moved to apps\shared\catalogs\)" -ForegroundColor Gray
    Remove-Item -Recurse -Force $dataCatalogs
    Write-Host "  [OK] Deleted" -ForegroundColor Green
} else {
    Write-Host "  [OK] apps\shared\data\catalogs\ already removed" -ForegroundColor Green
}

# 2. Delete orphaned health-companion (companion/ is active)
$healthCompanion = "$projectRoot\apps\patient-portal\components\health-companion"
if (Test-Path $healthCompanion) {
    Write-Host "  Removing: apps\patient-portal\components\health-companion\ (orphaned - companion\ is active)" -ForegroundColor Gray
    Remove-Item -Recurse -Force $healthCompanion
    Write-Host "  [OK] Deleted" -ForegroundColor Green
} else {
    Write-Host "  [OK] apps\patient-portal\components\health-companion\ already removed" -ForegroundColor Green
}

# 3. Delete orphaned population (population-health/ is active)
$population = "$projectRoot\apps\provider-portal\components\population"
if (Test-Path $population) {
    Write-Host "  Removing: apps\provider-portal\components\population\ (orphaned - population-health\ is active)" -ForegroundColor Gray
    Remove-Item -Recurse -Force $population
    Write-Host "  [OK] Deleted" -ForegroundColor Green
} else {
    Write-Host "  [OK] apps\provider-portal\components\population\ already removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Summary of active directories:" -ForegroundColor Yellow
Write-Host "  [OK] apps\shared\catalogs\                            - Clinical catalogs" -ForegroundColor Green
Write-Host "  [OK] apps\shared\data\mock\                           - Mock data for dev" -ForegroundColor Green
Write-Host "  [OK] apps\patient-portal\components\companion\        - HealthCompanion" -ForegroundColor Green
Write-Host "  [OK] apps\provider-portal\components\population-health\ - PopulationHealth" -ForegroundColor Green
Write-Host ""
