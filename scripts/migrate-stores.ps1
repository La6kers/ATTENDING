# ============================================================
# ATTENDING AI - Store Migration Script
# scripts/migrate-stores.ps1
#
# Replaces old ordering stores with refactored versions
# ============================================================

$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\Scott\source\repos\La6kers\ATTENDING"
$storeDir = "$repoRoot\apps\provider-portal\store"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Store Migration Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if refactored files exist
$refactoredFiles = @(
    "labOrderingStore.refactored.ts",
    "imagingOrderingStore.refactored.ts",
    "medicationOrderingStore.refactored.ts"
)

$originalFiles = @(
    "labOrderingStore.ts",
    "imagingOrderingStore.ts",
    "medicationOrderingStore.ts"
)

Write-Host "Checking for refactored files..." -ForegroundColor Yellow
foreach ($file in $refactoredFiles) {
    $path = Join-Path $storeDir $file
    if (!(Test-Path $path)) {
        Write-Host "ERROR: Missing refactored file: $file" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Found: $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Creating backup of original stores..." -ForegroundColor Yellow

$backupDir = "$storeDir\_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

foreach ($file in $originalFiles) {
    $src = Join-Path $storeDir $file
    if (Test-Path $src) {
        $dst = Join-Path $backupDir $file
        Copy-Item $src $dst
        Write-Host "  Backed up: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Step 2: Replacing original stores with refactored versions..." -ForegroundColor Yellow

for ($i = 0; $i -lt $originalFiles.Count; $i++) {
    $original = Join-Path $storeDir $originalFiles[$i]
    $refactored = Join-Path $storeDir $refactoredFiles[$i]
    
    # Remove original
    if (Test-Path $original) {
        Remove-Item $original -Force
    }
    
    # Rename refactored to original name
    Rename-Item $refactored $originalFiles[$i]
    Write-Host "  Replaced: $($originalFiles[$i])" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Verifying migration..." -ForegroundColor Yellow

foreach ($file in $originalFiles) {
    $path = Join-Path $storeDir $file
    if (Test-Path $path) {
        $content = Get-Content $path -First 5 | Out-String
        if ($content -match "REFACTORED") {
            Write-Host "  Verified: $file (refactored version)" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: $file may not be the refactored version" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ERROR: $file not found after migration" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: npm run typecheck:all" -ForegroundColor White
Write-Host "  2. Run: npm run test" -ForegroundColor White
Write-Host "  3. Test the application manually" -ForegroundColor White
Write-Host ""
Write-Host "To rollback, copy files from backup:" -ForegroundColor Gray
Write-Host "  Copy-Item '$backupDir\*' '$storeDir\' -Force" -ForegroundColor Gray
