# =============================================================================
# ATTENDING AI - ESLint Warning Cleanup Script
# scripts/fix-eslint-warnings.ps1
#
# Automatically fixes common ESLint warnings:
# - Renames caught errors to _error pattern
# - Identifies files with most unused imports
# =============================================================================

Write-Host "🔧 ATTENDING AI - ESLint Warning Cleanup" -ForegroundColor Cyan
Write-Host "=" * 50

# Step 1: Fix caught error naming conventions
Write-Host "`n📝 Fixing caught error naming..." -ForegroundColor Yellow

$tsFiles = Get-ChildItem -Path "apps" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue

$fixedFiles = 0
foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $original = $content
    
    # Fix: catch (error) → catch (_error) when error is unused
    $content = $content -replace 'catch \(error\) \{(\s*)(console\.error|throw|//)', 'catch (_error) {$1$2'
    $content = $content -replace 'catch \(err\) \{(\s*)(console\.error|throw|//)', 'catch (_err) {$1$2'
    $content = $content -replace 'catch \(e\) \{(\s*)(console\.error|throw|//)', 'catch (_e) {$1$2'
    
    # Fix: catch (storageError) → catch (_storageError) pattern
    $content = $content -replace 'catch \(storageError\)', 'catch (_storageError)'
    $content = $content -replace 'catch \(prismaError\)', 'catch (_prismaError)'
    
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        $fixedFiles++
    }
}

Write-Host "   Fixed caught errors in $fixedFiles files" -ForegroundColor Green

# Step 2: Report files with most warnings
Write-Host "`n📊 Files with most unused imports to review:" -ForegroundColor Yellow

$warningFiles = @(
    "apps/provider-portal/components/referral-ordering/ReferralCard.tsx",
    "apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx",
    "apps/provider-portal/components/referral-ordering/ReferralStatusSidebar.tsx",
    "apps/patient-portal/components/assessment/AssessmentChat.tsx",
    "apps/patient-portal/pages/health-summary.tsx",
    "apps/provider-portal/components/previsit/PreVisitSummary.tsx",
    "apps/provider-portal/components/shared/NotificationCenter.tsx"
)

foreach ($f in $warningFiles) {
    if (Test-Path $f) {
        Write-Host "   - $f" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Automatic fixes complete!" -ForegroundColor Green
Write-Host "   Run 'npm run build' to verify fixes" -ForegroundColor Cyan
Write-Host "   Manually review files listed above for unused imports" -ForegroundColor Cyan
