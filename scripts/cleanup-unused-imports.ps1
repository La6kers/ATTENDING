# ============================================================
# ATTENDING AI - Unused Import Cleanup Script
# scripts/cleanup-unused-imports.ps1
#
# Cleans up unused imports from provider-portal components
# Run from project root: .\scripts\cleanup-unused-imports.ps1
# ============================================================

param(
    [switch]$DryRun = $false
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI - Unused Import Cleanup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
}

# Define cleanup patterns for each file
$cleanupPatterns = @(
    @{
        Path = "apps/provider-portal/components/lab-ordering/AIRecommendationsPanel.tsx"
        Patterns = @(
            @{ Find = "import { EmptyState } from '@attending/ui-primitives';`r?`n"; Replace = "" },
            @{ Find = ", AIBadge"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/lab-ordering/LabOrderSummary.tsx"
        Patterns = @(
            @{ Find = ", LabPriority"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/lab-ordering/LabPanelsSelector.tsx"
        Patterns = @(
            @{ Find = ", Clock"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/layout/Header.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*Activity,"; Replace = "" },
            @{ Find = "Activity,\s*"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/medication-ordering/AIMedicationRecommendationsPanel.tsx"
        Patterns = @(
            @{ Find = ", ShieldCheck"; Replace = "" },
            @{ Find = "ShieldCheck, "; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/medication-ordering/DrugInteractionAlert.tsx"
        Patterns = @(
            @{ Find = "onDismiss,"; Replace = "_onDismiss," }
        )
    },
    @{
        Path = "apps/provider-portal/components/medication-ordering/MedicationCard.tsx"
        Patterns = @(
            @{ Find = ", Clock"; Replace = "" },
            @{ Find = "Clock, "; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/medication-ordering/MedicationOrderSummary.tsx"
        Patterns = @(
            @{ Find = ", CheckCircle"; Replace = "" },
            @{ Find = ", PrescriptionPriority"; Replace = "" },
            @{ Find = ", DosageForm"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/PatientMessaging.tsx"
        Patterns = @(
            @{ Find = ", CheckCircle"; Replace = "" },
            @{ Find = ", FileText"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/previsit/PreVisitSummary.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*Phone,"; Replace = "" },
            @{ Find = "Phone,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*Thermometer,"; Replace = "" },
            @{ Find = "Thermometer,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*Droplets,"; Replace = "" },
            @{ Find = "Droplets,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*X,"; Replace = "" },
            @{ Find = "\bX,\s*"; Replace = "" },
            @{ Find = "\(label\)"; Replace = "(_label)" }
        )
    },
    @{
        Path = "apps/provider-portal/components/referral-ordering/AIRecommendationsPanel.tsx"
        Patterns = @(
            @{ Find = ", ChevronRight"; Replace = "" },
            @{ Find = "ChevronRight, "; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/referral-ordering/PatientContextBanner.tsx"
        Patterns = @(
            @{ Find = ", FileText"; Replace = "" },
            @{ Find = "FileText, "; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/referral-ordering/ProviderSearchModal.tsx"
        # This is a react-hooks/exhaustive-deps warning, not an unused import
        # Requires manual fix to add useCallback or add dependency
        Patterns = @()
    },
    @{
        Path = "apps/provider-portal/components/referral-ordering/ReferralStatusSidebar.tsx"
        Patterns = @(
            @{ Find = "import { useState } from 'react';`r?`n"; Replace = "" },
            @{ Find = "useState, "; Replace = "" },
            @{ Find = ", useState"; Replace = "" },
            @{ Find = "`r?`n\s*Clock,"; Replace = "" },
            @{ Find = "Clock,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*AlertTriangle,"; Replace = "" },
            @{ Find = "AlertTriangle,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*ExternalLink,"; Replace = "" },
            @{ Find = "ExternalLink,\s*"; Replace = "" },
            @{ Find = "\(referral, index\)"; Replace = "(referral, _index)" }
        )
    },
    @{
        Path = "apps/provider-portal/components/shared/EmergencyProtocolModal.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*Ambulance,"; Replace = "" },
            @{ Find = "Ambulance,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*Heart,"; Replace = "" },
            @{ Find = "Heart,\s*"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/shared/FloatingActionButton.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*MessageSquare,"; Replace = "" },
            @{ Find = "MessageSquare,\s*"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/shared/NotificationCenter.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*Check,"; Replace = "" },
            @{ Find = "Check,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*AlertTriangle,"; Replace = "" },
            @{ Find = "AlertTriangle,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*Clock,"; Replace = "" },
            @{ Find = "Clock,\s*"; Replace = "" },
            @{ Find = "`r?`n\s*FileText,"; Replace = "" },
            @{ Find = "FileText,\s*"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/components/shared/PatientBanner.tsx"
        Patterns = @(
            @{ Find = "`r?`n\s*Clock,"; Replace = "" },
            @{ Find = "Clock,\s*"; Replace = "" }
        )
    },
    @{
        Path = "apps/provider-portal/lib/api/auth.ts"
        Patterns = @(
            @{ Find = ", User\b"; Replace = ", _User" },
            @{ Find = "User, "; Replace = "_User, " },
            @{ Find = "\(account\)"; Replace = "(_account)" },
            @{ Find = "\(user\)"; Replace = "(_user)" }
        )
    },
    @{
        Path = "apps/provider-portal/lib/api/middleware.ts"
        Patterns = @(
            @{ Find = "const startTime = "; Replace = "const _startTime = " }
        )
    },
    @{
        Path = "apps/provider-portal/lib/mockData.ts"
        Patterns = @(
            @{ Find = "const statuses = "; Replace = "const _statuses = " }
        )
    }
)

$totalFiles = 0
$totalChanges = 0

foreach ($item in $cleanupPatterns) {
    $filePath = Join-Path $ProjectRoot $item.Path
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  [SKIP] File not found: $($item.Path)" -ForegroundColor Yellow
        continue
    }
    
    if ($item.Patterns.Count -eq 0) {
        Write-Host "  [SKIP] No patterns for: $($item.Path)" -ForegroundColor DarkGray
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    $changeCount = 0
    
    foreach ($pattern in $item.Patterns) {
        $newContent = $content -replace $pattern.Find, $pattern.Replace
        if ($newContent -ne $content) {
            $changeCount++
            $content = $newContent
        }
    }
    
    if ($changeCount -gt 0) {
        $totalFiles++
        $totalChanges += $changeCount
        
        if ($DryRun) {
            Write-Host "  [WOULD FIX] $($item.Path) - $changeCount changes" -ForegroundColor Cyan
        } else {
            Set-Content $filePath $content -NoNewline
            Write-Host "  [FIXED] $($item.Path) - $changeCount changes" -ForegroundColor Green
        }
    } else {
        Write-Host "  [OK] $($item.Path) - no changes needed" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Files modified: $totalFiles"
Write-Host "Total changes: $totalChanges"

if ($DryRun) {
    Write-Host ""
    Write-Host "Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Done! Run 'npm run build:provider' to verify build." -ForegroundColor Green
}
