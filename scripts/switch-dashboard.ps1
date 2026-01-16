# Switch Dashboard Script
# Usage:
#   .\scripts\switch-dashboard.ps1 -Version original
#   .\scripts\switch-dashboard.ps1 -Version resizable

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('original', 'resizable')]
    [string]$Version
)

$dashboardDir = 'apps/provider-portal/pages'
$currentIndex = Join-Path $dashboardDir 'index.tsx'
$originalBackup = Join-Path $dashboardDir 'index.original.tsx'
$resizableFile = Join-Path $dashboardDir 'index.resizable.tsx'

# Backup original if not exists
if (-not (Test-Path $originalBackup)) {
    if (Test-Path $currentIndex) {
        Copy-Item $currentIndex $originalBackup
        Write-Host 'Backed up original index.tsx' -ForegroundColor Green
    }
}

# Switch version
if ($Version -eq 'original') {
    if (Test-Path $originalBackup) {
        Copy-Item $originalBackup $currentIndex -Force
        Write-Host 'Switched to ORIGINAL static dashboard' -ForegroundColor Cyan
    }
    else {
        Write-Host 'Original backup not found' -ForegroundColor Yellow
    }
}
elseif ($Version -eq 'resizable') {
    if (Test-Path $resizableFile) {
        Copy-Item $resizableFile $currentIndex -Force
        Write-Host 'Switched to RESIZABLE grid dashboard' -ForegroundColor Cyan
    }
    else {
        Write-Host 'Resizable file not found' -ForegroundColor Red
        exit 1
    }
}

Write-Host ''
Write-Host "Dashboard version: $Version"
Write-Host 'Restart dev server to see changes'
