# =============================================================================
# ATTENDING AI - PowerShell Setup Script
# =============================================================================
# Run this script to set up ATTENDING AI for development
# Usage: .\setup.ps1 [-Mode dev|prod] [-SkipOllama]
# =============================================================================

param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev",
    [switch]$SkipOllama
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ATTENDING AI - Setup Script" -ForegroundColor Cyan
Write-Host "  Mode: $Mode" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }

# =============================================================================
# Check Prerequisites
# =============================================================================

Write-Host "Checking prerequisites..." -ForegroundColor White

# Node.js
try {
    $nodeVersion = (node -v) -replace 'v', ''
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 18) {
        Write-Error "Node.js 18+ required. Current: v$nodeVersion"
        exit 1
    }
    Write-Success "Node.js v$nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js 18+"
    Write-Info "Download from: https://nodejs.org/"
    exit 1
}

# npm
try {
    $npmVersion = npm -v
    Write-Success "npm v$npmVersion"
} catch {
    Write-Error "npm is not installed"
    exit 1
}

# Git
try {
    $gitVersion = (git --version) -replace 'git version ', ''
    Write-Success "Git $gitVersion"
} catch {
    Write-Warning "Git not found - version control unavailable"
}

# Ollama (optional)
$ollamaInstalled = $false
if (-not $SkipOllama) {
    try {
        $ollamaVersion = ollama --version 2>$null
        if ($ollamaVersion) {
            Write-Success "Ollama installed"
            $ollamaInstalled = $true
        }
    } catch {
        Write-Warning "Ollama not installed (AI features will use rule-based fallback)"
    }
}

Write-Host ""

# =============================================================================
# Setup Environment
# =============================================================================

Write-Host "Setting up environment..." -ForegroundColor White

$envExample = "apps\provider-portal\.env.example"
$envLocal = "apps\provider-portal\.env.local"

if (-not (Test-Path $envLocal)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envLocal
        
        # Generate secure secret
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $secret = [Convert]::ToBase64String($bytes)
        
        # Replace placeholder
        $content = Get-Content $envLocal -Raw
        $content = $content -replace 'your-secure-secret-here-generate-with-openssl', $secret
        Set-Content $envLocal $content -NoNewline
        
        Write-Success "Created .env.local with secure secret"
    } else {
        Write-Warning ".env.example not found, skipping environment setup"
    }
} else {
    Write-Info ".env.local already exists, skipping"
}

Write-Host ""

# =============================================================================
# Install Dependencies
# =============================================================================

Write-Host "Installing dependencies..." -ForegroundColor White

try {
    npm install 2>&1 | Out-Null
    Write-Success "Dependencies installed"
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

Write-Host ""

# =============================================================================
# Setup Database
# =============================================================================

Write-Host "Setting up database..." -ForegroundColor White

try {
    # Generate Prisma client
    npx prisma generate 2>&1 | Out-Null
    Write-Success "Prisma client generated"
    
    # Run migrations
    try {
        npx prisma migrate dev --name init 2>&1 | Out-Null
        Write-Success "Database migrations applied"
    } catch {
        npx prisma db push 2>&1 | Out-Null
        Write-Success "Database schema pushed"
    }
    
    # Seed if available
    if (Test-Path "prisma\seed.ts") {
        try {
            npx prisma db seed 2>&1 | Out-Null
            Write-Success "Database seeded"
        } catch {
            Write-Warning "Seeding skipped (may already be seeded)"
        }
    }
} catch {
    Write-Error "Database setup failed: $_"
}

Write-Host ""

# =============================================================================
# Setup Ollama (Optional)
# =============================================================================

if ($ollamaInstalled -and -not $SkipOllama) {
    Write-Host "Setting up AI services..." -ForegroundColor White
    
    # Check if BioMistral is already pulled
    $models = ollama list 2>$null
    if ($models -match "biomistral") {
        Write-Success "BioMistral model already installed"
    } else {
        Write-Info "Downloading BioMistral model (this may take a few minutes)..."
        try {
            ollama pull biomistral:7b 2>&1 | Out-Null
            Write-Success "BioMistral model installed"
        } catch {
            Write-Warning "Could not download BioMistral, trying mistral..."
            try {
                ollama pull mistral:7b 2>&1 | Out-Null
                Write-Success "Mistral model installed as fallback"
            } catch {
                Write-Warning "Model download failed - AI will use rule-based fallback"
            }
        }
    }
    
    # Check if Ollama is running
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Success "Ollama service is running"
    } catch {
        Write-Info "Starting Ollama service..."
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Success "Ollama service started"
    }
} elseif (-not $SkipOllama) {
    Write-Host ""
    Write-Warning "Ollama not installed - using rule-based AI fallback"
    Write-Info "To enable full AI features:"
    Write-Info "  1. Install Ollama: winget install Ollama.Ollama"
    Write-Info "  2. Run: ollama pull biomistral:7b"
}

Write-Host ""

# =============================================================================
# Build (Production Only)
# =============================================================================

if ($Mode -eq "prod") {
    Write-Host "Building for production..." -ForegroundColor White
    try {
        npm run build 2>&1 | Out-Null
        Write-Success "Production build complete"
    } catch {
        Write-Error "Build failed: $_"
        exit 1
    }
    Write-Host ""
}

# =============================================================================
# Health Check
# =============================================================================

Write-Host "Running health checks..." -ForegroundColor White

# Database check
try {
    $result = npx prisma db execute --stdin 2>&1 <<< "SELECT 1"
    Write-Success "Database connection OK"
} catch {
    Write-Warning "Database connection check failed"
}

# Ollama check
if ($ollamaInstalled) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Success "Ollama API OK"
    } catch {
        Write-Warning "Ollama API not responding"
    }
}

Write-Host ""

# =============================================================================
# Done!
# =============================================================================

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host ""

if ($Mode -eq "prod") {
    Write-Host "  Start production server:" -ForegroundColor Cyan
    Write-Host "    npm run start" -ForegroundColor White
} else {
    Write-Host "  Start development server:" -ForegroundColor Cyan
    Write-Host "    npm run dev" -ForegroundColor White
}

Write-Host ""
Write-Host "  Access the application:" -ForegroundColor Cyan
Write-Host "    Provider Portal: http://localhost:3000" -ForegroundColor White
Write-Host "    Patient App:     http://localhost:3001" -ForegroundColor White
Write-Host ""

if (-not $ollamaInstalled -and -not $SkipOllama) {
    Write-Host "  For full AI capabilities:" -ForegroundColor Yellow
    Write-Host "    winget install Ollama.Ollama" -ForegroundColor White
    Write-Host "    ollama pull biomistral:7b" -ForegroundColor White
    Write-Host ""
}

Write-Host "  Documentation: .\docs\README.md" -ForegroundColor Cyan
Write-Host ""
