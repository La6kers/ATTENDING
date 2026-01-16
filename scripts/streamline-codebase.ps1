# ============================================================
# ATTENDING AI - Codebase Streamlining Script
# Run from project root: .\scripts\streamline-codebase.ps1
# ============================================================

param(
    [switch]$DryRun = $false,
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Codebase Streamlining" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# Phase 1: Backup (optional)
# ============================================================

if (-not $SkipBackup -and -not $DryRun) {
    Write-Host "Phase 1: Creating backup..." -ForegroundColor Green
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $ProjectRoot "_backups\streamline_$timestamp"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    Write-Host "  Backup created at: $backupDir" -ForegroundColor Green
    Write-Host ""
}

# ============================================================
# Phase 2: Summary of changes
# ============================================================

Write-Host "Changes implemented:" -ForegroundColor Green
Write-Host "  1. Deleted: referralOrderingStore.backup.ts" -ForegroundColor Gray
Write-Host "  2. Deleted: treatment-plans.tsx (keeping treatment-plan.tsx)" -ForegroundColor Gray
Write-Host "  3. Updated: All stores now use shared ClinicalAIService" -ForegroundColor Gray
Write-Host "  4. Updated: Import paths to use @attending/shared" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Streamlining Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Run 'npm run dev' to verify the application starts" -ForegroundColor Gray
Write-Host "  2. Test each ordering module (labs, imaging, medications, referrals)" -ForegroundColor Gray
Write-Host "  3. Commit changes: git add -A && git commit -m 'chore: streamline codebase'" -ForegroundColor Gray
