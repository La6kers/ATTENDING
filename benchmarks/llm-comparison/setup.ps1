# =============================================================
# COMPASS vs LLM Benchmark — Windows setup script
# =============================================================
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "COMPASS vs Medical LLM Benchmark - setup" -ForegroundColor Cyan
Write-Host "========================================="
Write-Host ""

# 1. Check node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org (v18+)" -ForegroundColor Red
    exit 1
}
$nodeVer = node -v
Write-Host "Node.js $nodeVer" -ForegroundColor Green

# 2. Check ollama
$hasOllama = [bool] (Get-Command ollama -ErrorAction SilentlyContinue)
if (-not $hasOllama) {
    Write-Host ""
    Write-Host "ollama not found. Install from https://ollama.com/download" -ForegroundColor Yellow
    $ans = Read-Host "Continue without ollama? (COMPASS-only benchmarks possible) [y/N]"
    if ($ans -notmatch '^[Yy]') { exit 1 }
} else {
    Write-Host "ollama found" -ForegroundColor Green

    # Ensure daemon running
    try { Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 2 | Out-Null }
    catch {
        Write-Host "Starting ollama daemon..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }

    # Pull models
    Write-Host ""
    Write-Host "Pulling medical LLMs (~14 GB each)..." -ForegroundColor Cyan
    foreach ($model in @("cniongolo/biomistral", "meditron", "llama3.1:8b")) {
        Write-Host ""
        Write-Host "  ollama pull $model"
        try { ollama pull $model } catch { Write-Host "WARN: failed to pull $model" -ForegroundColor Yellow }
    }
}

# 3. Extract cases if needed
Set-Location $PSScriptRoot
if (-not (Test-Path "cases.json")) {
    Write-Host ""
    Write-Host "Extracting 600 test cases..." -ForegroundColor Cyan
    node extract-cases.mjs
}

# 4. Results dir
if (-not (Test-Path "results")) { New-Item -ItemType Directory -Path "results" | Out-Null }
if (-not (Test-Path "results/.gitkeep")) { New-Item -ItemType File -Path "results/.gitkeep" | Out-Null }

Write-Host ""
Write-Host "========================================="  -ForegroundColor Cyan
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  # Start COMPASS dev server in another terminal (from repo root):"
Write-Host "    npm install"
Write-Host "    npm run --workspace=compass-standalone dev"
Write-Host ""
Write-Host "  # Quick sanity test (5 cases, ~20 sec):"
Write-Host "    node run-benchmark.mjs --provider compass --limit 5"
Write-Host ""
Write-Host "  # Full run per provider (600 cases each):"
Write-Host "    node run-benchmark.mjs --provider compass      # ~35 min"
Write-Host "    node run-benchmark.mjs --provider biomistral   # ~40 min on GPU, 3+ hrs on CPU"
Write-Host "    node run-benchmark.mjs --provider meditron     # ~40 min on GPU"
Write-Host "    node run-benchmark.mjs --provider llama3       # ~40 min on GPU"
Write-Host ""
Write-Host "  # Compare all four:"
Write-Host "    node run-benchmark.mjs --compare compass,biomistral,meditron,llama3"
Write-Host ""
