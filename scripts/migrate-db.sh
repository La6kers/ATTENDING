#!/bin/bash
# ============================================================
# ATTENDING AI - Safe Database Migration Script
# scripts/migrate-db.sh
#
# Runs Prisma migrations with safety checks:
#   1. Pre-flight: verify connectivity, backup reminder
#   2. Migration: apply pending migrations
#   3. Post-flight: verify schema, run smoke test
#
# Usage:
#   ./scripts/migrate-db.sh              # Interactive
#   ./scripts/migrate-db.sh --yes        # Non-interactive (CI)
#   ./scripts/migrate-db.sh --dry-run    # Preview only
#   ./scripts/migrate-db.sh --rollback   # Rollback last migration
# ============================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse args
DRY_RUN=false
AUTO_YES=false
ROLLBACK=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --yes|-y) AUTO_YES=true ;;
    --rollback) ROLLBACK=true ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ATTENDING AI - Database Migration                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================

echo -e "${YELLOW}[1/5] Pre-flight checks...${NC}"

# Check DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}✗ DATABASE_URL is not set${NC}"
  exit 1
fi
echo "  ✓ DATABASE_URL is set"

# Check it's not the dev default in production
if [ "${NODE_ENV:-}" = "production" ]; then
  if echo "$DATABASE_URL" | grep -q "attending_dev_password"; then
    echo -e "${RED}✗ CRITICAL: Default dev password detected in production!${NC}"
    exit 1
  fi
  echo "  ✓ Production credentials verified (not default)"
fi

# Check Prisma CLI is available
if ! npx prisma --version &>/dev/null; then
  echo -e "${RED}✗ Prisma CLI not available${NC}"
  exit 1
fi
echo "  ✓ Prisma CLI available"

# Check database connectivity
echo -n "  Checking database connectivity... "
if npx prisma db execute --stdin <<< "SELECT 1" &>/dev/null; then
  echo -e "${GREEN}connected${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo -e "${RED}✗ Cannot connect to database. Check DATABASE_URL.${NC}"
  exit 1
fi

# Show pending migrations
echo ""
echo -e "${YELLOW}[2/5] Migration status:${NC}"
npx prisma migrate status --schema=prisma/schema.prisma 2>/dev/null || true
echo ""

# ============================================================
# BACKUP REMINDER
# ============================================================

echo -e "${YELLOW}[3/5] Backup verification${NC}"

if [ "${NODE_ENV:-}" = "production" ] && [ "$AUTO_YES" = false ]; then
  echo -e "${RED}  ⚠ PRODUCTION DATABASE DETECTED${NC}"
  echo ""
  echo "  Before proceeding, ensure you have:"
  echo "    1. A recent database backup (pg_dump or Azure backup)"
  echo "    2. Tested the migration on a staging environment"
  echo "    3. A rollback plan"
  echo ""
  read -p "  Have you completed a backup? (yes/no): " BACKUP_CONFIRMED
  if [ "$BACKUP_CONFIRMED" != "yes" ]; then
    echo -e "${RED}  Migration cancelled. Create a backup first.${NC}"
    exit 1
  fi
fi

echo "  ✓ Backup confirmed (or non-production)"

# ============================================================
# DRY RUN
# ============================================================

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${YELLOW}[4/5] Dry run — showing what would be applied:${NC}"
  npx prisma migrate diff \
    --from-schema-datasource prisma/schema.prisma \
    --to-schema-datamodel prisma/schema.prisma \
    --script 2>/dev/null || echo "  (No pending schema changes)"
  echo ""
  echo -e "${GREEN}Dry run complete. No changes applied.${NC}"
  exit 0
fi

# ============================================================
# ROLLBACK
# ============================================================

if [ "$ROLLBACK" = true ]; then
  echo ""
  echo -e "${YELLOW}[4/5] Rolling back last migration...${NC}"
  echo -e "${RED}  ⚠ This will mark the last migration as rolled back.${NC}"
  echo "  You may need to manually reverse schema changes."
  
  if [ "$AUTO_YES" = false ]; then
    read -p "  Continue with rollback? (yes/no): " ROLLBACK_CONFIRMED
    if [ "$ROLLBACK_CONFIRMED" != "yes" ]; then
      echo "  Rollback cancelled."
      exit 0
    fi
  fi
  
  npx prisma migrate resolve --rolled-back --schema=prisma/schema.prisma
  echo -e "${GREEN}  ✓ Last migration marked as rolled back${NC}"
  exit 0
fi

# ============================================================
# APPLY MIGRATIONS
# ============================================================

echo ""
echo -e "${YELLOW}[4/5] Applying migrations...${NC}"

if [ "$AUTO_YES" = false ] && [ "${NODE_ENV:-}" = "production" ]; then
  read -p "  Apply pending migrations to PRODUCTION? (yes/no): " APPLY_CONFIRMED
  if [ "$APPLY_CONFIRMED" != "yes" ]; then
    echo "  Migration cancelled."
    exit 0
  fi
fi

# Run migrations
if [ "${NODE_ENV:-}" = "production" ]; then
  npx prisma migrate deploy --schema=prisma/schema.prisma
else
  npx prisma migrate dev --schema=prisma/schema.prisma
fi

echo -e "${GREEN}  ✓ Migrations applied successfully${NC}"

# ============================================================
# POST-FLIGHT
# ============================================================

echo ""
echo -e "${YELLOW}[5/5] Post-migration verification...${NC}"

# Verify Prisma client matches schema
echo -n "  Generating Prisma client... "
npx prisma generate --schema=prisma/schema.prisma &>/dev/null
echo -e "${GREEN}done${NC}"

# Basic smoke test — verify tables exist
echo -n "  Verifying core tables... "
TABLES=$(npx prisma db execute --stdin <<< "
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY tablename;
" 2>/dev/null | grep -c "^" || echo "0")
echo -e "${GREEN}${TABLES} tables found${NC}"

# Check for soft-delete columns (from Batch 3)
echo -n "  Checking soft-delete schema... "
SOFT_DELETE=$(npx prisma db execute --stdin <<< "
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE column_name = 'deletedAt' AND table_schema = 'public';
" 2>/dev/null | tail -1 || echo "?")
echo "${SOFT_DELETE} models with deletedAt"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration complete!                                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
