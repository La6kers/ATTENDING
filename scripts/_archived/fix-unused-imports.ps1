# =============================================================================
# ATTENDING AI - Unused Imports Cleanup Script
# Fixes ESLint warnings by prefixing unused variables/imports with underscore
# =============================================================================

Write-Host "🧹 ATTENDING AI - Fixing Unused Imports" -ForegroundColor Cyan
Write-Host "=" * 60

$rootPath = Split-Path -Parent $PSScriptRoot

# Files with unused imports from the build output
$filesToFix = @{
    # Patient Portal
    "apps/patient-portal/pages/api/chat/compass.ts" = @(
        @{ old = "const PHASE_QUESTIONS"; new = "const _PHASE_QUESTIONS" }
        @{ old = "const sessionId ="; new = "const _sessionId =" }
    )
    "apps/patient-portal/pages/api/patient/assessments/index.ts" = @(
        @{ old = "const { clinicalData, redFlags"; new = "const { clinicalData: _clinicalData, redFlags: _redFlags" }
    )
    "apps/patient-portal/pages/health-summary.tsx" = @(
        @{ old = "Activity,"; new = "Activity as _Activity," }
        @{ old = "Calendar,"; new = "Calendar as _Calendar," }
        @{ old = "Filter,"; new = "Filter as _Filter," }
        @{ old = "Clock,"; new = "Clock as _Clock," }
        @{ old = "CheckCircle,"; new = "CheckCircle as _CheckCircle," }
    )
    "apps/patient-portal/pages/profile.tsx" = @(
        @{ old = "Pill,"; new = "Pill as _Pill," }
        @{ old = "AlertTriangle,"; new = "AlertTriangle as _AlertTriangle," }
    )
    "apps/patient-portal/components/chat/ChatInput.tsx" = @(
        @{ old = "Paperclip"; new = "Paperclip as _Paperclip" }
    )
    "apps/patient-portal/components/chat/ProgressTracker.tsx" = @(
        @{ old = "Circle,"; new = "Circle as _Circle," }
        @{ old = "Heart,"; new = "Heart as _Heart," }
        @{ old = "Users,"; new = "Users as _Users," }
    )
}

Write-Host "`n📝 This script needs to be run with care." -ForegroundColor Yellow
Write-Host "The recommended approach is to REMOVE unused imports entirely." -ForegroundColor Yellow
Write-Host "`nBetter approach: Use your IDE's 'Organize Imports' feature or run:" -ForegroundColor Green
Write-Host "  npx eslint --fix 'apps/**/*.{ts,tsx}'" -ForegroundColor White

Write-Host "`n📋 Files that need attention:" -ForegroundColor Cyan

# Patient Portal files
@(
    "pages/api/chat/compass.ts - PHASE_QUESTIONS, sessionId, phase, existing, clinicalData"
    "pages/api/patient/assessments/index.ts - clinicalData, redFlags"
    "pages/health-summary.tsx - Activity, Calendar, Filter, Clock, CheckCircle"
    "pages/profile.tsx - Pill, AlertTriangle"
    "components/assessment/AssessmentChat.tsx - MessageSquare, Loader2, ChevronDown, onComplete, urgencyLevel, chiefComplaint, hpiData"
    "components/chat/ChatInput.tsx - Paperclip"
    "components/chat/ProgressTracker.tsx - Circle, Heart, Users"
    "components/ImprovedPatientPortal.tsx - setUser, setAiConsent, checkUrgency, isLoading"
) | ForEach-Object { Write-Host "  • patient-portal/$_" -ForegroundColor Gray }

# Provider Portal files
@(
    "pages/api/* - Multiple session parameters, assessment, messageIds, etc."
    "pages/assessments/[id].tsx - PatientAssessment, Clock, Info"
    "pages/clinical-hub.tsx - router"
    "pages/component-demo.tsx - ClinicalCard"
    "pages/help.tsx - AlertCircle"
    "pages/imaging.tsx - Settings, Zap"
    "pages/index.tsx - Settings"
    "pages/labs.tsx - Settings, loadingId"
    "pages/referrals.tsx - PatientBanner"
    "pages/settings.tsx - ChevronRight, Trash2"
    "pages/treatment-plan.tsx - Clock, setOrders"
    "components/* - Multiple unused imports"
) | ForEach-Object { Write-Host "  • provider-portal/$_" -ForegroundColor Gray }

Write-Host "`n✨ Quick fix command:" -ForegroundColor Green
Write-Host @"
# From project root, run:
cd $rootPath
npx eslint --fix 'apps/**/*.{ts,tsx}' 2>$null

# Or use VS Code's "Organize Imports" on each file (Shift+Alt+O)
"@ -ForegroundColor White

Write-Host "`n📌 Note: Some 'unused' parameters are intentionally kept for API signatures." -ForegroundColor Yellow
Write-Host "   Prefix these with underscore (e.g., session -> _session) to silence warnings." -ForegroundColor Yellow
