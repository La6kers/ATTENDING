# ATTENDING AI - Build Issues Fix Script
# Run this script to clean caches and fix common issues

Write-Host "========================================"
Write-Host "ATTENDING AI - Build Fixer"
Write-Host "========================================"

# Step 1: Clear turbo cache
Write-Host ""
Write-Host "[1/4] Clearing Turbo cache..."
if (Test-Path ".turbo") {
    Remove-Item -Recurse -Force ".turbo"
    Write-Host "  Removed .turbo cache"
}
if (Test-Path "apps\patient-portal\.turbo") {
    Remove-Item -Recurse -Force "apps\patient-portal\.turbo"
    Write-Host "  Removed patient-portal .turbo cache"
}
if (Test-Path "apps\provider-portal\.turbo") {
    Remove-Item -Recurse -Force "apps\provider-portal\.turbo"
    Write-Host "  Removed provider-portal .turbo cache"
}

# Step 2: Clear Next.js caches
Write-Host ""
Write-Host "[2/4] Clearing Next.js caches..."
if (Test-Path "apps\patient-portal\.next") {
    Remove-Item -Recurse -Force "apps\patient-portal\.next"
    Write-Host "  Removed patient-portal .next cache"
}
if (Test-Path "apps\provider-portal\.next") {
    Remove-Item -Recurse -Force "apps\provider-portal\.next"
    Write-Host "  Removed provider-portal .next cache"
}

# Step 3: Clear TypeScript build info
Write-Host ""
Write-Host "[3/4] Clearing TypeScript build info..."
Get-ChildItem -Recurse -Filter "tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -ErrorAction SilentlyContinue
    Write-Host "  Removed $($_.FullName)"
}

# Step 4: Rebuild
Write-Host ""
Write-Host "[4/4] Running fresh build..."
Write-Host "  Running: npm run build"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "BUILD SUCCESSFUL!"
    Write-Host "========================================"
}
else {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "BUILD FAILED - Check errors above"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Common fixes:"
    Write-Host "  1. Check for missing imports"
    Write-Host "  2. Run npm install to ensure dependencies"
    Write-Host "  3. Check for TypeScript errors in the output"
}
