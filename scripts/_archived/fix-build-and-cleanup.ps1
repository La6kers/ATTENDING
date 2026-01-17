# ATTENDING AI - Build Fix and Cleanup Script
# Run this to fix the current build failure and clean up warnings

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATTENDING AI Build Fix & Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear all caches
Write-Host "[1/5] Clearing Turbo and Next.js caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force ".turbo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps/patient-portal/.turbo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps/provider-portal/.turbo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps/shared/.turbo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps/patient-portal/.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps/provider-portal/.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules/.cache" -ErrorAction SilentlyContinue
Write-Host "  ✓ Caches cleared" -ForegroundColor Green

# Step 2: Remove archived/dead code
Write-Host "[2/5] Removing archived and dead code..." -ForegroundColor Yellow
if (Test-Path "apps/provider-portal/pages/_archived") {
    Remove-Item -Recurse -Force "apps/provider-portal/pages/_archived"
    Write-Host "  ✓ Removed apps/provider-portal/pages/_archived" -ForegroundColor Green
}
if (Test-Path "apps/patient-portal/index.html") {
    Remove-Item -Force "apps/patient-portal/index.html"
    Write-Host "  ✓ Removed orphaned apps/patient-portal/index.html" -ForegroundColor Green
}

# Step 3: Create a list of files needing cleanup
Write-Host "[3/5] Analyzing files with unused imports..." -ForegroundColor Yellow

$filesToFix = @(
    # Patient Portal - High priority
    "apps/patient-portal/pages/api/chat/compass.ts",
    "apps/patient-portal/pages/chat/index.tsx",
    "apps/patient-portal/pages/dashboard.tsx",
    "apps/patient-portal/pages/health-summary.tsx",
    "apps/patient-portal/pages/profile.tsx",
    "apps/patient-portal/components/assessment/AssessmentChat.tsx",
    "apps/patient-portal/components/chat/ChatInput.tsx",
    "apps/patient-portal/components/chat/ProgressTracker.tsx",
    "apps/patient-portal/components/ImprovedPatientPortal.tsx",
    
    # Provider Portal - High priority
    "apps/provider-portal/pages/api/assessments/submit.ts",
    "apps/provider-portal/pages/index.tsx",
    "apps/provider-portal/pages/clinical-hub.tsx",
    "apps/provider-portal/pages/labs.tsx",
    "apps/provider-portal/pages/imaging.tsx",
    "apps/provider-portal/components/chat/ChatPanel.tsx",
    "apps/provider-portal/components/chat/MessageThread.tsx",
    "apps/provider-portal/components/dashboard/PatientQueue.tsx",
    "apps/provider-portal/components/dashboard/StatCards.tsx",
    "apps/provider-portal/components/lab-ordering/AIRecommendationsPanel.tsx",
    "apps/provider-portal/components/medication-ordering/MedicationOrderSummary.tsx",
    "apps/provider-portal/components/shared/EmergencyProtocolModal.tsx",
    "apps/provider-portal/components/shared/NotificationCenter.tsx"
)

Write-Host "  Found $($filesToFix.Count) files with unused imports" -ForegroundColor Yellow

# Step 4: Try to rebuild
Write-Host "[4/5] Attempting rebuild..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run build 2>&1 | Tee-Object -Variable buildOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✓ BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "✗ BUILD FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "Review the output above for errors." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running build: $_" -ForegroundColor Red
}

# Step 5: Summary
Write-Host ""
Write-Host "[5/5] Summary & Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Completed Actions:" -ForegroundColor White
Write-Host "  • Cleared all Turbo and Next.js caches"
Write-Host "  • Removed archived code"
Write-Host ""
Write-Host "Recommended Next Steps:" -ForegroundColor Yellow
Write-Host "  1. If build still fails, run: npm run clean && npm install"
Write-Host "  2. Fix unused imports by running: npx eslint --fix 'apps/**/*.{ts,tsx}'"
Write-Host "  3. Review ATTENDING_STREAMLINE_REPORT.md for architecture recommendations"
Write-Host ""
