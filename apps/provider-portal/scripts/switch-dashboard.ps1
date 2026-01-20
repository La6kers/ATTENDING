# Switch Dashboard Version Script
# apps/provider-portal/scripts/switch-dashboard.ps1
#
# Usage: .\scripts\switch-dashboard.ps1 -Version [original|basic|enhanced|final]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("original", "basic", "enhanced", "final")]
    [string]$Version
)

$basePath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pagesPath = Join-Path $basePath "pages"
$indexPath = Join-Path $pagesPath "index.tsx"
$backupPath = Join-Path $pagesPath "index.backup.tsx"

# Version file mappings
$versionFiles = @{
    "original" = "index.backup.tsx"
    "basic" = "index.new.tsx"
    "enhanced" = "index.enhanced.tsx"
    "final" = "index.final.tsx"
}

Write-Host "Switching to dashboard version: $Version" -ForegroundColor Cyan

# Check if current index.tsx exists and is not already backed up
if ((Test-Path $indexPath) -and !(Test-Path $backupPath)) {
    Write-Host "Creating backup of current index.tsx..." -ForegroundColor Yellow
    Copy-Item $indexPath $backupPath
}

$sourceFile = Join-Path $pagesPath $versionFiles[$Version]

if (!(Test-Path $sourceFile)) {
    Write-Host "Error: Source file not found: $sourceFile" -ForegroundColor Red
    exit 1
}

# Copy the selected version to index.tsx
Write-Host "Copying $($versionFiles[$Version]) to index.tsx..." -ForegroundColor Green
Copy-Item $sourceFile $indexPath -Force

Write-Host "Dashboard switched to '$Version' version successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Version descriptions:" -ForegroundColor Cyan
Write-Host "  original  - Original static grid layout"
Write-Host "  basic     - Basic resizable/draggable grid"
Write-Host "  enhanced  - Full-featured with registry and sync"
Write-Host "  final     - Clean implementation with all features"
Write-Host ""
Write-Host "Run 'npm run dev' to see the changes." -ForegroundColor Yellow
