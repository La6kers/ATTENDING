# =============================================================================
# ATTENDING AI - Comprehensive ESLint Warning Fixer
# Fixes common unused variable patterns across the codebase
# =============================================================================

param(
    [switch]$DryRun = $false
)

Write-Host "🔧 ATTENDING AI - Fixing ESLint Warnings" -ForegroundColor Cyan
Write-Host "=" * 60

$rootPath = "C:\Users\la6ke\Projects\ATTENDING"
$changes = @()

# Define patterns to fix
$patterns = @(
    # Fix unused session parameters in API handlers
    @{
        Pattern = 'async function \w+\([^)]*,\s*res:\s*NextApiResponse[^,]*,\s*session:\s*any\)'
        Replacement = { param($match) $match.Value -replace ',\s*session:\s*any\)', ', _session: any)' }
        Description = "Unused 'session' parameter in API handlers"
    },
    # Fix unused session in destructured handler exports
    @{
        Pattern = 'handler\(req,\s*res,\s*session\)'
        Replacement = { param($match) $match.Value -replace 'session\)', '_session)' }
        Description = "Unused 'session' in handler calls"
    }
)

# Files to process - Provider Portal API routes with unused session
$apiFiles = @(
    "apps/provider-portal/pages/api/imaging/index.ts",
    "apps/provider-portal/pages/api/labs/index.ts",
    "apps/provider-portal/pages/api/prescriptions/index.ts",
    "apps/provider-portal/pages/api/referrals/index.ts",
    "apps/provider-portal/pages/api/chat/conversations/index.ts",
    "apps/provider-portal/pages/api/treatment-plans/index.ts",
    "apps/provider-portal/pages/api/treatment-plans/[id].ts"
)

Write-Host "`n📋 Files that need manual review:" -ForegroundColor Yellow

foreach ($file in $apiFiles) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        Write-Host "  • $file" -ForegroundColor Gray
    }
}

Write-Host "`n💡 Quick Fix:" -ForegroundColor Green
Write-Host @"
To fix all unused 'session' parameters, run these sed-like replacements:

# PowerShell approach - for each file with unused session:
`$content = Get-Content "path/to/file.ts" -Raw
`$content = `$content -replace ', session: any\)', ', _session: any)'
Set-Content "path/to/file.ts" `$content

# Or use VS Code's Find & Replace (Ctrl+H) with regex:
Find:    , session: any)
Replace: , _session: any)

# For unused Lucide icons, use "Organize Imports" (Shift+Alt+O)
"@ -ForegroundColor White

Write-Host "`n📊 Summary of Common Issues:" -ForegroundColor Cyan
Write-Host @"
┌─────────────────────────────────────────────────────────────────────┐
│ Pattern                              │ Count │ Fix                  │
├─────────────────────────────────────────────────────────────────────┤
│ Unused 'session' parameter           │ ~15   │ Prefix with _        │
│ Unused Lucide icon imports           │ ~25   │ Remove or use        │
│ Unused destructured variables        │ ~10   │ Prefix with _        │
│ Unused function parameters           │ ~5    │ Prefix with _        │
└─────────────────────────────────────────────────────────────────────┘
"@ -ForegroundColor White

Write-Host "`n✅ Recommended Actions:" -ForegroundColor Green
Write-Host @"
1. Run: npm run lint -- --fix
2. For remaining warnings, use IDE's "Organize Imports" feature
3. For API routes, add _ prefix to unused session parameters
4. Consider removing truly unnecessary code rather than just prefixing
"@ -ForegroundColor White
