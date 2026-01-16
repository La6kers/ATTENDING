# ============================================================
# Fix Import Paths Script
# scripts/fix-imports.ps1
#
# This script updates all imports to use the shared package
# instead of local lib/prisma.ts and lib/utils.ts files
# ============================================================

Write-Host "Starting import fix process..." -ForegroundColor Cyan

# Define the apps to process
$appPaths = @(
    "apps/provider-portal",
    "apps/patient-portal"
)

# Counter for changes
$filesChanged = 0
$totalReplacements = 0

foreach ($appPath in $appPaths) {
    $fullPath = Join-Path $PSScriptRoot ".." $appPath
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "Path not found: $fullPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`nProcessing $appPath..." -ForegroundColor Green
    
    # Get all TypeScript and TSX files
    $files = Get-ChildItem -Path $fullPath -Recurse -Include "*.ts","*.tsx" -File
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # Fix prisma imports
        $content = $content -replace "from\s+['""]@/lib/prisma['""]", "from '@attending/shared/lib/prisma'"
        $content = $content -replace "from\s+['""]\.\.?/lib/prisma['""]", "from '@attending/shared/lib/prisma'"
        $content = $content -replace "from\s+['""]\.\.?/\.\.?/lib/prisma['""]", "from '@attending/shared/lib/prisma'"
        
        # Fix utils imports
        $content = $content -replace "from\s+['""]@/lib/utils['""]", "from '@attending/shared/lib/utils'"
        $content = $content -replace "from\s+['""]\.\.?/lib/utils['""]", "from '@attending/shared/lib/utils'"
        $content = $content -replace "from\s+['""]\.\.?/\.\.?/lib/utils['""]", "from '@attending/shared/lib/utils'"
        
        # Check if content changed
        if ($content -ne $originalContent) {
            Set-Content $file.FullName $content -NoNewline
            $filesChanged++
            
            # Count replacements
            $replacements = 0
            if ($originalContent -match "@/lib/prisma") { $replacements++ }
            if ($originalContent -match "\./lib/prisma") { $replacements++ }
            if ($originalContent -match "\.\./lib/prisma") { $replacements++ }
            if ($originalContent -match "@/lib/utils") { $replacements++ }
            if ($originalContent -match "\./lib/utils") { $replacements++ }
            if ($originalContent -match "\.\./lib/utils") { $replacements++ }
            
            $totalReplacements += $replacements
            
            Write-Host "  Fixed: $($file.Name)" -ForegroundColor White
        }
    }
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Import fix complete!" -ForegroundColor Green
Write-Host "Files modified: $filesChanged" -ForegroundColor White
Write-Host "Total replacements: $totalReplacements" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

# Recommend next steps
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Delete local lib/prisma.ts and lib/utils.ts files:" -ForegroundColor White
Write-Host "   Remove-Item apps/provider-portal/lib/prisma.ts -Force" -ForegroundColor Gray
Write-Host "   Remove-Item apps/provider-portal/lib/utils.ts -Force" -ForegroundColor Gray
Write-Host "   Remove-Item apps/patient-portal/lib/prisma.ts -Force" -ForegroundColor Gray
Write-Host "   Remove-Item apps/patient-portal/lib/utils.ts -Force" -ForegroundColor Gray
Write-Host "2. Run: npm run build" -ForegroundColor White
Write-Host "3. Run: npm run typecheck" -ForegroundColor White
