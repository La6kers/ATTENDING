# ============================================================
# ATTENDING AI - Unified Maintenance Script
# scripts/maintain.ps1
#
# Consolidates all cleanup, fix, and build tasks into one script
# ============================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("clean", "lint", "build", "test", "full", "help")]
    [string]$Command = "help",
    
    [switch]$Force,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
$script:StepNum = 1

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[$script:StepNum] $Message" -ForegroundColor Yellow
    $script:StepNum++
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "  -> $Message" -ForegroundColor Cyan
}

function Write-Err {
    param([string]$Message)
    Write-Host "  [X] $Message" -ForegroundColor Red
}

# ============================================================
# CLEAN: Remove build caches and generated files
# ============================================================
function Invoke-Clean {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ATTENDING AI - Clean" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $script:StepNum = 1
    
    Write-Step "Cleaning Next.js build caches..."
    $paths = @(
        "$rootDir\apps\provider-portal\.next",
        "$rootDir\apps\patient-portal\.next",
        "$rootDir\.next"
    )
    foreach ($path in $paths) {
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
            Write-Info "Removed $path"
        }
    }
    Write-Success "Next.js caches cleaned"
    
    Write-Step "Cleaning Turbo caches..."
    $turboPaths = @(
        "$rootDir\.turbo",
        "$rootDir\apps\provider-portal\.turbo",
        "$rootDir\apps\patient-portal\.turbo"
    )
    foreach ($path in $turboPaths) {
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
            Write-Info "Removed $path"
        }
    }
    Write-Success "Turbo caches cleaned"
    
    Write-Step "Cleaning TypeScript build info..."
    Get-ChildItem -Path $rootDir -Recurse -Filter "*.tsbuildinfo" -ErrorAction SilentlyContinue | 
        ForEach-Object { 
            Remove-Item $_.FullName -Force
            if ($Verbose) { Write-Info "Removed $($_.FullName)" }
        }
    Write-Success "TypeScript build info cleaned"
    
    Write-Step "Cleaning npm cache..."
    if (Test-Path "$rootDir\node_modules\.cache") {
        Remove-Item -Recurse -Force "$rootDir\node_modules\.cache" -ErrorAction SilentlyContinue
    }
    Write-Success "npm cache cleaned"
    
    Write-Host ""
    Write-Host "[DONE] Clean complete!" -ForegroundColor Green
}

# ============================================================
# LINT: Run ESLint with auto-fix
# ============================================================
function Invoke-Lint {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ATTENDING AI - Lint" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $script:StepNum = 1
    
    Write-Step "Linting Provider Portal..."
    Set-Location "$rootDir\apps\provider-portal"
    npx eslint . --fix --ext .ts,.tsx 2>$null
    Write-Success "Provider Portal linted"
    
    Write-Step "Linting Patient Portal..."
    Set-Location "$rootDir\apps\patient-portal"
    npx eslint . --fix --ext .ts,.tsx 2>$null
    Write-Success "Patient Portal linted"
    
    Write-Step "Linting Shared Package..."
    Set-Location "$rootDir\apps\shared"
    if (Test-Path ".eslintrc.json") {
        npx eslint . --fix --ext .ts,.tsx 2>$null
    }
    Write-Success "Shared package linted"
    
    Set-Location $rootDir
    Write-Host ""
    Write-Host "[DONE] Lint complete!" -ForegroundColor Green
}

# ============================================================
# BUILD: Clean and rebuild the project
# ============================================================
function Invoke-Build {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ATTENDING AI - Build" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $script:StepNum = 1
    
    if ($Force) {
        Write-Step "Cleaning before build..."
        Invoke-Clean
    }
    
    Write-Step "Generating Prisma client..."
    Set-Location $rootDir
    npx prisma generate --schema=prisma/schema.prisma
    Write-Success "Prisma client generated"
    
    Write-Step "Building with Turbo..."
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[DONE] Build successful!" -ForegroundColor Green
    } else {
        Write-Err "Build failed with exit code $LASTEXITCODE"
        exit 1
    }
}

# ============================================================
# TEST: Run all tests
# ============================================================
function Invoke-Test {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ATTENDING AI - Test" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $script:StepNum = 1
    
    Write-Step "Running unit tests..."
    Set-Location $rootDir
    npm run test:unit 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Unit tests passed"
    } else {
        Write-Err "Unit tests failed"
    }
    
    Write-Host ""
    Write-Host "[DONE] Tests complete!" -ForegroundColor Green
}

# ============================================================
# FULL: Run clean, lint, build, and test
# ============================================================
function Invoke-Full {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "ATTENDING AI - Full Maintenance" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Invoke-Clean
    Invoke-Lint
    Invoke-Build
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[DONE] Full maintenance complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

# ============================================================
# HELP: Show usage
# ============================================================
function Show-Help {
    Write-Host ""
    Write-Host "ATTENDING AI - Maintenance Script" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\maintain.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  clean     Remove build caches and generated files"
    Write-Host "  lint      Run ESLint with auto-fix on all packages"
    Write-Host "  build     Build the project (add -Force to clean first)"
    Write-Host "  test      Run unit tests"
    Write-Host "  full      Run clean, lint, build (full maintenance cycle)"
    Write-Host "  help      Show this help message"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Force    Force clean before build"
    Write-Host "  -Verbose  Show detailed output"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\maintain.ps1 clean              # Clean all caches"
    Write-Host "  .\maintain.ps1 lint               # Fix ESLint issues"
    Write-Host "  .\maintain.ps1 build -Force       # Clean and rebuild"
    Write-Host "  .\maintain.ps1 full               # Full maintenance cycle"
    Write-Host ""
}

# ============================================================
# MAIN
# ============================================================

Set-Location $rootDir

switch ($Command) {
    "clean" { Invoke-Clean }
    "lint" { Invoke-Lint }
    "build" { Invoke-Build }
    "test" { Invoke-Test }
    "full" { Invoke-Full }
    "help" { Show-Help }
    default { Show-Help }
}

Set-Location $rootDir
