<# 
.SYNOPSIS
    ATTENDING AI - Orphan File Detection and Cleanup Script
    
.DESCRIPTION
    This script identifies and safely removes orphaned files that are no longer 
    imported anywhere in the codebase. It performs thorough verification before
    any deletions.
    
.PARAMETER Execute
    When specified, actually removes orphaned files. Without this flag, only analysis is performed.
    
.EXAMPLE
    .\cleanup-orphans.ps1           # Analysis only (safe)
    .\cleanup-orphans.ps1 -Execute  # Actually remove files
#>

param(
    [switch]$Execute = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = "C:\Users\la6ke\Projects\ATTENDING"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ATTENDING AI - Orphan File Detection & Cleanup          ║" -ForegroundColor Cyan
Write-Host "║     Mode: $(if($Execute){'EXECUTE - Will delete files'}else{'ANALYSIS - Safe preview'})" -ForegroundColor $(if($Execute){'Yellow'}else{'Green'})
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot

# Define potential orphans to check
$potentialOrphans = @(
    @{
        Path = "apps/shared/data/catalogs"
        Description = "Old catalog location (replaced by apps/shared/catalogs/)"
        SearchPattern = "shared/data/catalogs|from ['\"]\..*data/catalogs"
    },
    @{
        Path = "apps/patient-portal/components/health-companion"
        Description = "Old HealthCompanion (replaced by components/companion/)"
        SearchPattern = "health-companion"
    },
    @{
        Path = "apps/provider-portal/components/population"
        Description = "Old PopulationHealth (replaced by components/population-health/)"
        SearchPattern = "components/population['\"/](?!-health)"
    },
    @{
        Path = "apps/patient-portal/components/assessment"
        Description = "Old assessment components (replaced by components/chat/)"
        SearchPattern = "components/assessment"
    },
    @{
        Path = "apps/patient-portal/components/CameraCapture.tsx"
        Description = "Root-level CameraCapture (duplicate of media/CameraCapture.tsx)"
        SearchPattern = "from ['\"]\.+/CameraCapture['\"]|from ['\"]\.+/components/CameraCapture['\"]"
    },
    @{
        Path = "apps/provider-portal/store/_archived"
        Description = "Archived store files"
        SearchPattern = "_archived"
    },
    @{
        Path = "apps/provider-portal/pages/_archived"
        Description = "Archived page files"  
        SearchPattern = "_archived"
    }
)

$orphanedFiles = @()
$usedFiles = @()

Write-Host "Scanning for orphaned files..." -ForegroundColor Yellow
Write-Host ""

foreach ($item in $potentialOrphans) {
    $fullPath = Join-Path $projectRoot $item.Path
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  [SKIP] $($item.Path) - Does not exist" -ForegroundColor DarkGray
        continue
    }
    
    Write-Host "  Checking: $($item.Path)" -ForegroundColor White
    
    # Search for imports in all .ts and .tsx files
    $importFound = $false
    $searchDirs = @("apps/patient-portal", "apps/provider-portal", "apps/shared")
    
    foreach ($searchDir in $searchDirs) {
        $searchPath = Join-Path $projectRoot $searchDir
        if (Test-Path $searchPath) {
            $files = Get-ChildItem -Path $searchPath -Include "*.ts","*.tsx" -Recurse -ErrorAction SilentlyContinue |
                     Where-Object { $_.FullName -notmatch "node_modules|\.next|_archived" }
            
            foreach ($file in $files) {
                # Skip checking files within the potential orphan directory itself
                if ($file.FullName -like "$fullPath*") { continue }
                
                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                if ($content -match $item.SearchPattern) {
                    $importFound = $true
                    Write-Host "    → Found import in: $($file.FullName -replace [regex]::Escape($projectRoot), '')" -ForegroundColor DarkYellow
                    break
                }
            }
        }
        if ($importFound) { break }
    }
    
    if ($importFound) {
        Write-Host "    [USED] Import found - keeping" -ForegroundColor Green
        $usedFiles += $item
    } else {
        Write-Host "    [ORPHAN] No imports found - can be removed" -ForegroundColor Red
        $orphanedFiles += $item
    }
    Write-Host ""
}

# Summary
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($orphanedFiles.Count -eq 0) {
    Write-Host "✅ No orphaned files found! Codebase is clean." -ForegroundColor Green
} else {
    Write-Host "Found $($orphanedFiles.Count) orphaned item(s):" -ForegroundColor Yellow
    Write-Host ""
    
    $totalSize = 0
    foreach ($orphan in $orphanedFiles) {
        $fullPath = Join-Path $projectRoot $orphan.Path
        $size = 0
        
        if (Test-Path $fullPath -PathType Container) {
            $size = (Get-ChildItem $fullPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
            $fileCount = (Get-ChildItem $fullPath -Recurse -File).Count
            Write-Host "  📁 $($orphan.Path)" -ForegroundColor Red
            Write-Host "     $($orphan.Description)" -ForegroundColor DarkGray
            Write-Host "     $fileCount files, $([math]::Round($size/1KB, 1)) KB" -ForegroundColor DarkGray
        } else {
            $size = (Get-Item $fullPath).Length
            Write-Host "  📄 $($orphan.Path)" -ForegroundColor Red
            Write-Host "     $($orphan.Description)" -ForegroundColor DarkGray
            Write-Host "     $([math]::Round($size/1KB, 1)) KB" -ForegroundColor DarkGray
        }
        $totalSize += $size
        Write-Host ""
    }
    
    Write-Host "Total size to be freed: $([math]::Round($totalSize/1KB, 1)) KB" -ForegroundColor Yellow
    Write-Host ""
    
    if ($Execute) {
        Write-Host "Removing orphaned files..." -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($orphan in $orphanedFiles) {
            $fullPath = Join-Path $projectRoot $orphan.Path
            try {
                Remove-Item -Path $fullPath -Recurse -Force
                Write-Host "  ✓ Removed: $($orphan.Path)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to remove: $($orphan.Path) - $_" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "Cleanup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor White
        Write-Host "  1. Run: npm run build" -ForegroundColor White
        Write-Host "  2. Run: npm run test" -ForegroundColor White
        Write-Host "  3. If all passes, commit changes:" -ForegroundColor White
        Write-Host "     git add -A" -ForegroundColor DarkGray
        Write-Host "     git commit -m 'chore: remove orphaned files'" -ForegroundColor DarkGray
        Write-Host "     git push origin mockup-2" -ForegroundColor DarkGray
    } else {
        Write-Host "To remove these files, run:" -ForegroundColor Cyan
        Write-Host "  .\scripts\cleanup-orphans.ps1 -Execute" -ForegroundColor White
    }
}

Write-Host ""
