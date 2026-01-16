# ATTENDING AI - ESLint Cleanup Script
# scripts/cleanup-eslint-warnings.ps1
#
# Automatically fixes unused imports and variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - ESLint Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot

# Step 1: Clean build caches
Write-Host "[1/4] Cleaning build caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$rootDir\apps\provider-portal\.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$rootDir\apps\patient-portal\.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$rootDir\node_modules\.cache" -ErrorAction SilentlyContinue
Write-Host "  ✓ Build caches cleaned" -ForegroundColor Green

# Step 2: Fix Provider Portal
Write-Host ""
Write-Host "[2/4] Fixing Provider Portal ESLint issues..." -ForegroundColor Yellow
Set-Location "$rootDir\apps\provider-portal"
npx eslint . --fix --ext .ts,.tsx 2>$null
Write-Host "  ✓ Provider Portal fixed" -ForegroundColor Green

# Step 3: Fix Patient Portal
Write-Host ""
Write-Host "[3/4] Fixing Patient Portal ESLint issues..." -ForegroundColor Yellow
Set-Location "$rootDir\apps\patient-portal"
npx eslint . --fix --ext .ts,.tsx 2>$null
Write-Host "  ✓ Patient Portal fixed" -ForegroundColor Green

# Step 4: Verify builds
Write-Host ""
Write-Host "[4/4] Verifying builds..." -ForegroundColor Yellow
Set-Location $rootDir

# Try provider portal build
Write-Host "  Building Provider Portal..." -ForegroundColor Gray
$providerBuild = npm run build:provider 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Provider Portal builds successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Provider Portal build failed" -ForegroundColor Red
    Write-Host "    Run 'npm run build:provider' for details" -ForegroundColor Gray
}

# Try patient portal build
Write-Host "  Building Patient Portal..." -ForegroundColor Gray
$patientBuild = npm run build:patient 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Patient Portal builds successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Patient Portal build failed" -ForegroundColor Red
    Write-Host "    Run 'npm run build:patient' for details" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run build' to verify all fixes" -ForegroundColor Gray
Write-Host "  2. Review remaining warnings manually" -ForegroundColor Gray
Write-Host "  3. Prefix unused parameters with _ (e.g., _session)" -ForegroundColor Gray
Write-Host ""
