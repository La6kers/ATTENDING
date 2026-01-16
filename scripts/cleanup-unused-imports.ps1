# ============================================================
# Remove Unused Imports Script
# scripts/cleanup-unused-imports.ps1
#
# This script removes commonly unused imports identified
# in the build output. Run after fix-imports.ps1
# ============================================================

Write-Host "Starting unused import cleanup..." -ForegroundColor Cyan

# Files and their unused imports (from build output analysis)
$unusedImports = @{
    # Pages
    "apps/provider-portal/pages/assessments/[id].tsx" = @("PatientAssessment", "Clock", "Info")
    "apps/provider-portal/pages/auth/signin.tsx" = @("getProviders")
    "apps/provider-portal/pages/clinical-hub.tsx" = @("useEffect", "Activity", "Clock", "TrendingUp", "ChevronRight", "FileText")
    "apps/provider-portal/pages/component-demo.tsx" = @("ClinicalCard")
    "apps/provider-portal/pages/imaging.tsx" = @("Settings", "Zap")
    "apps/provider-portal/pages/index.tsx" = @("AlertTriangle", "Clock", "Keyboard")
    "apps/provider-portal/pages/labs.tsx" = @("Settings")
    "apps/provider-portal/pages/patient-assessment.tsx" = @("ChevronDown", "ChevronUp")
    "apps/provider-portal/pages/referrals.tsx" = @("PatientBanner")
    "apps/provider-portal/pages/treatment-plan.tsx" = @("Clock")
    "apps/provider-portal/pages/_app.tsx" = @("useCallback")
    
    # Components - Chat
    "apps/provider-portal/components/chat/ChatPanel.tsx" = @("AlertTriangle")
    
    # Components - Dashboard
    "apps/provider-portal/components/dashboard/PatientQueue.tsx" = @("AlertTriangle")
    "apps/provider-portal/components/dashboard/StatCards.tsx" = @("Users", "MessageSquare")
    
    # Components - Imaging
    "apps/provider-portal/components/imaging-ordering/ImagingOrderSummary.tsx" = @("DollarSign")
    
    # Components - Lab Ordering
    "apps/provider-portal/components/lab-ordering/AIRecommendationsPanel.tsx" = @("EmptyState", "AIBadge")
    "apps/provider-portal/components/lab-ordering/LabOrderSummary.tsx" = @("LabPriority")
    "apps/provider-portal/components/lab-ordering/LabPanelsSelector.tsx" = @("Clock")
    
    # Components - Layout
    "apps/provider-portal/components/layout/Header.tsx" = @("Activity")
    "apps/provider-portal/components/layout/Navigation.tsx" = @("Users", "Calendar", "BarChart3", "MessageSquare")
    
    # Components - Medication
    "apps/provider-portal/components/medication-ordering/AIMedicationRecommendationsPanel.tsx" = @("ShieldCheck")
    "apps/provider-portal/components/medication-ordering/MedicationCard.tsx" = @("Clock")
    "apps/provider-portal/components/medication-ordering/MedicationOrderSummary.tsx" = @("CheckCircle", "PrescriptionPriority", "DosageForm")
    
    # Components - Referral
    "apps/provider-portal/components/referral-ordering/AIRecommendationsPanel.tsx" = @("ChevronRight")
    "apps/provider-portal/components/referral-ordering/PatientContextBanner.tsx" = @("FileText")
    "apps/provider-portal/components/referral-ordering/ReferralCard.tsx" = @("useState", "Building2", "Clock", "Shield", "Provider", "URGENCY_CONFIG", "CATEGORY_CONFIG")
    "apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx" = @("useCallback", "UserPlus", "ChevronDown", "ChevronRight", "COMMON_REFERRALS")
    "apps/provider-portal/components/referral-ordering/ReferralStatusSidebar.tsx" = @("useState", "Clock", "AlertTriangle", "ExternalLink")
    
    # Components - Shared
    "apps/provider-portal/components/shared/EmergencyProtocolModal.tsx" = @("Ambulance", "Heart")
    "apps/provider-portal/components/shared/FloatingActionButton.tsx" = @("MessageSquare")
    "apps/provider-portal/components/shared/NotificationCenter.tsx" = @("Check", "AlertTriangle", "Clock", "FileText")
    "apps/provider-portal/components/shared/PatientBanner.tsx" = @("Clock")
    
    # Components - Treatment Plan
    "apps/provider-portal/components/treatment-plan/TreatmentPlanPanel.tsx" = @("ChevronDown", "ChevronRight", "TreatmentProtocol")
    
    # Components - UI
    "apps/provider-portal/components/ui/button.tsx" = @("Button", "VariantProps")
    
    # Components - Other
    "apps/provider-portal/components/PatientMessaging.tsx" = @("CheckCircle", "FileText")
    
    # API Routes
    "apps/provider-portal/pages/api/clinical/drug-check.ts" = @("DrugInteractionResult")
    "apps/provider-portal/pages/api/clinical/red-flags.ts" = @("RedFlagResult")
    "apps/provider-portal/pages/api/imaging/index.ts" = @("CreateImagingOrder")
    "apps/provider-portal/pages/api/labs/index.ts" = @("CreateLabOrder")
    
    # Lib
    "apps/provider-portal/lib/api/auth.ts" = @("User")
}

$filesProcessed = 0
$importsRemoved = 0

foreach ($filePath in $unusedImports.Keys) {
    $fullPath = Join-Path $PSScriptRoot ".." $filePath
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  Skipping (not found): $filePath" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $fullPath -Raw
    $originalContent = $content
    $imports = $unusedImports[$filePath]
    
    foreach ($import in $imports) {
        # Remove from named imports: { X, Y, Z } or { X }
        # Pattern: Remove ", X" or "X, " or standalone "X" in import braces
        $content = $content -replace ",\s*$import(?=\s*[,}])", ""  # Remove ", X"
        $content = $content -replace "$import\s*,\s*", ""         # Remove "X, "
        $content = $content -replace "{\s*$import\s*}", "{ }"     # Remove sole import
    }
    
    # Clean up empty imports like: import { } from '...'
    $content = $content -replace "import\s*{\s*}\s*from\s*['""][^'""]+['""];\s*\n?", ""
    
    # Clean up double commas and trailing commas in imports
    $content = $content -replace ",\s*,", ","
    $content = $content -replace ",(\s*})", '$1'
    $content = $content -replace "({\s*),", '$1'
    
    if ($content -ne $originalContent) {
        Set-Content $fullPath $content -NoNewline
        $filesProcessed++
        $importsRemoved += $imports.Count
        Write-Host "  Cleaned: $filePath ($($imports.Count) imports)" -ForegroundColor Green
    }
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Unused import cleanup complete!" -ForegroundColor Green
Write-Host "Files processed: $filesProcessed" -ForegroundColor White
Write-Host "Imports removed: $importsRemoved" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`nNote: Some unused variables may need manual review." -ForegroundColor Yellow
Write-Host "Run 'npm run lint' to see remaining issues." -ForegroundColor White
