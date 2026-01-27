# ============================================================
# ATTENDING AI - Codebase Streamlining Script
# scripts/streamline-codebase.ps1
#
# Run modes:
#   .\streamline-codebase.ps1           # Analysis only (safe)
#   .\streamline-codebase.ps1 -Execute  # Perform cleanup
# ============================================================

param(
    [switch]$Execute = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = "C:\Users\la6ke\Projects\ATTENDING"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ATTENDING AI - Codebase Streamlining Script              ║" -ForegroundColor Cyan
Write-Host "║     Mode: $(if($Execute){'EXECUTE - Changes will be made'}else{'ANALYSIS - Safe mode'})" -ForegroundColor $(if($Execute){'Yellow'}else{'Green'})
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot

$issues = @()
$warnings = @()
$fixes = @()

# ============================================================
# 1. Check for duplicate catalog system
# ============================================================
Write-Host "[1/8] Checking duplicate catalog systems..." -ForegroundColor Yellow

$oldCatalogPath = "apps/shared/data/catalogs"
$newCatalogPath = "apps/shared/catalogs"

if (Test-Path $oldCatalogPath) {
    # Search for imports from old catalog
    $oldImports = Get-ChildItem -Path . -Include "*.ts","*.tsx" -Recurse -ErrorAction SilentlyContinue | 
                  Where-Object { $_.FullName -notmatch "node_modules" } |
                  Select-String -Pattern "from ['\"].*data/catalogs" 2>$null
    
    if ($oldImports -and $oldImports.Count -gt 0) {
        $issues += "DUPLICATE CATALOGS: $($oldImports.Count) files import from old catalog location"
        foreach ($import in $oldImports) {
            $warnings += "  → $($import.Path):$($import.LineNumber)"
        }
        
        if ($Execute) {
            Write-Host "  Updating imports from data/catalogs to catalogs..." -ForegroundColor Yellow
            foreach ($file in ($oldImports | Select-Object -ExpandProperty Path -Unique)) {
                $content = Get-Content $file -Raw
                $newContent = $content -replace "from ['\"](.*)data/catalogs", "from `"`$1catalogs"
                $newContent = $newContent -replace "from ['\"]@attending/shared/data/catalogs", "from '@attending/shared/catalogs"
                Set-Content $file -Value $newContent -NoNewline
                $fixes += "Updated imports in: $file"
            }
        }
    } else {
        Write-Host "  ✓ No imports from old catalog found" -ForegroundColor Green
        
        if ($Execute) {
            Write-Host "  Removing old catalog directory..." -ForegroundColor Yellow
            Remove-Item -Path $oldCatalogPath -Recurse -Force
            $fixes += "Removed: $oldCatalogPath"
        }
    }
} else {
    Write-Host "  ✓ Old catalog already removed" -ForegroundColor Green
}

# ============================================================
# 2. Check for duplicate HealthCompanion
# ============================================================
Write-Host "[2/8] Checking duplicate HealthCompanion components..." -ForegroundColor Yellow

$oldCompanion = "apps/patient-portal/components/health-companion"
$newCompanion = "apps/patient-portal/components/companion"

if ((Test-Path $oldCompanion) -and (Test-Path $newCompanion)) {
    $issues += "DUPLICATE: HealthCompanion exists in both companion/ and health-companion/"
    
    # Check for imports
    $oldImports = Get-ChildItem -Path "apps/patient-portal" -Include "*.ts","*.tsx" -Recurse |
                  Select-String -Pattern "from ['\"].*health-companion" 2>$null
    
    if ($oldImports) {
        $warnings += "  Files importing from health-companion:"
        foreach ($import in $oldImports) {
            $warnings += "    → $($import.Path):$($import.LineNumber)"
        }
    }
    
    if ($Execute) {
        # Update imports
        foreach ($file in ($oldImports | Select-Object -ExpandProperty Path -Unique)) {
            $content = Get-Content $file -Raw
            $newContent = $content -replace "health-companion", "companion"
            Set-Content $file -Value $newContent -NoNewline
            $fixes += "Updated import in: $file"
        }
        
        # Remove old directory
        Remove-Item -Path $oldCompanion -Recurse -Force
        $fixes += "Removed: $oldCompanion"
    }
} else {
    Write-Host "  ✓ No duplicate HealthCompanion" -ForegroundColor Green
}

# ============================================================
# 3. Check for duplicate PopulationHealthDashboard
# ============================================================
Write-Host "[3/8] Checking duplicate PopulationHealthDashboard..." -ForegroundColor Yellow

$oldPopulation = "apps/provider-portal/components/population"
$newPopulation = "apps/provider-portal/components/population-health"

if ((Test-Path $oldPopulation) -and (Test-Path $newPopulation)) {
    $issues += "DUPLICATE: PopulationHealthDashboard exists in both population/ and population-health/"
    
    $oldImports = Get-ChildItem -Path "apps/provider-portal" -Include "*.ts","*.tsx" -Recurse |
                  Select-String -Pattern "from ['\"].*components/population['\"/](?!-health)" 2>$null
    
    if ($oldImports) {
        $warnings += "  Files importing from population/:"
        foreach ($import in $oldImports) {
            $warnings += "    → $($import.Path):$($import.LineNumber)"
        }
    }
    
    if ($Execute) {
        foreach ($file in ($oldImports | Select-Object -ExpandProperty Path -Unique)) {
            $content = Get-Content $file -Raw
            $newContent = $content -replace "components/population(['\"/])", "components/population-health`$1"
            Set-Content $file -Value $newContent -NoNewline
            $fixes += "Updated import in: $file"
        }
        
        Remove-Item -Path $oldPopulation -Recurse -Force
        $fixes += "Removed: $oldPopulation"
    }
} else {
    Write-Host "  ✓ No duplicate PopulationHealthDashboard" -ForegroundColor Green
}

# ============================================================
# 4. Check for _archived directories
# ============================================================
Write-Host "[4/8] Checking _archived directories..." -ForegroundColor Yellow

$archivedDirs = Get-ChildItem -Path . -Directory -Recurse -Filter "_archived" -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch "node_modules" }

if ($archivedDirs) {
    foreach ($dir in $archivedDirs) {
        $issues += "ARCHIVED: $($dir.FullName)"
        
        if ($Execute) {
            Remove-Item -Path $dir.FullName -Recurse -Force
            $fixes += "Removed: $($dir.FullName)"
        }
    }
} else {
    Write-Host "  ✓ No _archived directories found" -ForegroundColor Green
}

# ============================================================
# 5. Check for backup files
# ============================================================
Write-Host "[5/8] Checking for backup files (.bak, .old, .backup)..." -ForegroundColor Yellow

$backupFiles = Get-ChildItem -Path . -Include "*.bak","*.old","*.backup" -Recurse -ErrorAction SilentlyContinue |
               Where-Object { $_.FullName -notmatch "node_modules" }

if ($backupFiles) {
    foreach ($file in $backupFiles) {
        $issues += "BACKUP FILE: $($file.FullName)"
        
        if ($Execute) {
            Remove-Item -Path $file.FullName -Force
            $fixes += "Removed: $($file.FullName)"
        }
    }
} else {
    Write-Host "  ✓ No backup files found" -ForegroundColor Green
}

# ============================================================
# 6. Check for orphan files (accidental command outputs)
# ============================================================
Write-Host "[6/8] Checking for orphan files..." -ForegroundColor Yellow

$orphanPatterns = @("h origin *", "tatus", "text", "ISO", "e 1 *")
$orphanFiles = @()

foreach ($pattern in $orphanPatterns) {
    $found = Get-ChildItem -Path . -Filter $pattern -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -notmatch "node_modules" }
    if ($found) {
        $orphanFiles += $found
    }
}

if ($orphanFiles) {
    foreach ($file in $orphanFiles) {
        $issues += "ORPHAN FILE: $($file.FullName)"
        
        if ($Execute) {
            Remove-Item -Path $file.FullName -Force
            $fixes += "Removed: $($file.FullName)"
        }
    }
} else {
    Write-Host "  ✓ No orphan files found" -ForegroundColor Green
}

# ============================================================
# 7. Check for duplicate WebSocket implementations
# ============================================================
Write-Host "[7/8] Checking duplicate WebSocket implementations..." -ForegroundColor Yellow

$wsFiles = @(
    "apps/patient-portal/hooks/useWebSocket.ts",
    "apps/provider-portal/hooks/useWebSocket.ts",
    "apps/shared/hooks/useWebSocket.ts",
    "apps/shared/lib/websocket/hooks.ts"
)

$existingWs = $wsFiles | Where-Object { Test-Path $_ }
if ($existingWs.Count -gt 1) {
    $issues += "DUPLICATE WEBSOCKET: $($existingWs.Count) WebSocket implementations found"
    foreach ($ws in $existingWs) {
        $warnings += "  → $ws"
    }
}

# ============================================================
# 8. Check for duplicate Prisma instances
# ============================================================
Write-Host "[8/8] Checking duplicate Prisma instances..." -ForegroundColor Yellow

$prismaFiles = Get-ChildItem -Path . -Include "prisma.ts" -Recurse -ErrorAction SilentlyContinue |
               Where-Object { $_.FullName -notmatch "node_modules" }

if ($prismaFiles.Count -gt 1) {
    $issues += "DUPLICATE PRISMA: $($prismaFiles.Count) Prisma client files found"
    foreach ($pf in $prismaFiles) {
        $warnings += "  → $($pf.FullName)"
    }
}

# ============================================================
# Summary Report
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        SUMMARY REPORT                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "✅ No issues found! Codebase is clean." -ForegroundColor Green
} else {
    Write-Host "Found $($issues.Count) issue(s):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($issue in $issues) {
        Write-Host "  ❌ $issue" -ForegroundColor Red
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "Warnings:" -ForegroundColor Yellow
        foreach ($warn in $warnings) {
            Write-Host $warn -ForegroundColor DarkYellow
        }
    }
}

if ($Execute -and $fixes.Count -gt 0) {
    Write-Host ""
    Write-Host "Fixes applied:" -ForegroundColor Green
    foreach ($fix in $fixes) {
        Write-Host "  ✓ $fix" -ForegroundColor Green
    }
}

if (-not $Execute -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "To apply fixes, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\streamline-codebase.ps1 -Execute" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
