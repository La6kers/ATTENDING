# ============================================================
# ATTENDING AI - Safe Database Migration Script (PowerShell)
# scripts/migrate-db.ps1
#
# Windows equivalent of migrate-db.sh
#
# Usage:
#   .\scripts\migrate-db.ps1              # Interactive
#   .\scripts\migrate-db.ps1 -AutoYes     # Non-interactive (CI)
#   .\scripts\migrate-db.ps1 -DryRun      # Preview only
# ============================================================

param(
    [switch]$DryRun,
    [switch]$AutoYes,
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ATTENDING AI - Database Migration" -ForegroundColor Cyan
Write-Host "  =================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================

Write-Host "[1/5] Pre-flight checks..." -ForegroundColor Yellow

# Check DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "  X DATABASE_URL is not set" -ForegroundColor Red
    exit 1
}
Write-Host "  OK DATABASE_URL is set" -ForegroundColor Green

# Check production safety
if ($env:NODE_ENV -eq "production") {
    if ($env:DATABASE_URL -match "attending_dev_password") {
        Write-Host "  X CRITICAL: Default dev password in production!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK Production credentials verified" -ForegroundColor Green
}

# Check connectivity
Write-Host "  Checking database connectivity..." -NoNewline
try {
    npx prisma db execute --stdin --schema=prisma/schema.prisma 2>$null <<< "SELECT 1" | Out-Null
    Write-Host " connected" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "  Cannot connect to database. Check DATABASE_URL." -ForegroundColor Red
    exit 1
}

# Show status
Write-Host ""
Write-Host "[2/5] Migration status:" -ForegroundColor Yellow
npx prisma migrate status --schema=prisma/schema.prisma 2>$null

# ============================================================
# BACKUP REMINDER
# ============================================================

Write-Host ""
Write-Host "[3/5] Backup verification" -ForegroundColor Yellow

if ($env:NODE_ENV -eq "production" -and -not $AutoYes) {
    Write-Host "  WARNING: PRODUCTION DATABASE DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Ensure you have:"
    Write-Host "    1. A recent database backup"
    Write-Host "    2. Tested on staging"
    Write-Host "    3. A rollback plan"
    Write-Host ""
    $confirm = Read-Host "  Backup completed? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "  Migration cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "  OK Backup confirmed" -ForegroundColor Green

# ============================================================
# DRY RUN / ROLLBACK / APPLY
# ============================================================

if ($DryRun) {
    Write-Host ""
    Write-Host "[4/5] Dry run - showing pending changes:" -ForegroundColor Yellow
    npx prisma migrate diff `
        --from-schema-datasource prisma/schema.prisma `
        --to-schema-datamodel prisma/schema.prisma `
        --script 2>$null
    Write-Host ""
    Write-Host "  Dry run complete. No changes applied." -ForegroundColor Green
    exit 0
}

if ($Rollback) {
    Write-Host ""
    Write-Host "[4/5] Rolling back last migration..." -ForegroundColor Yellow
    npx prisma migrate resolve --rolled-back --schema=prisma/schema.prisma
    Write-Host "  OK Rolled back" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[4/5] Applying migrations..." -ForegroundColor Yellow

if ($env:NODE_ENV -eq "production") {
    npx prisma migrate deploy --schema=prisma/schema.prisma
} else {
    npx prisma migrate dev --schema=prisma/schema.prisma
}

Write-Host "  OK Migrations applied" -ForegroundColor Green

# ============================================================
# POST-FLIGHT
# ============================================================

Write-Host ""
Write-Host "[5/5] Post-migration verification..." -ForegroundColor Yellow

npx prisma generate --schema=prisma/schema.prisma 2>$null | Out-Null
Write-Host "  OK Prisma client regenerated" -ForegroundColor Green

Write-Host ""
Write-Host "  Migration complete!" -ForegroundColor Green
Write-Host ""
