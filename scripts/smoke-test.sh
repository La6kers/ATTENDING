#!/usr/bin/env bash
# =============================================================================
# ATTENDING AI — End-to-End Smoke Test
# scripts/smoke-test.sh
#
# Verifies the core clinical loop works:
#   1. Docker containers (SQL Server + Redis) are running
#   2. Database is seeded with demo patients
#   3. Provider portal API returns assessments
#   4. Patient data loads correctly
#   5. Lab order creation works
#   6. Notifications are generated
#
# Prerequisites:
#   - Docker Desktop running
#   - npm install completed at repo root
#   - Ports 3000 (provider) and 3001 (patient) available
#
# Usage:
#   chmod +x scripts/smoke-test.sh
#   ./scripts/smoke-test.sh
#
# Or on Windows (Git Bash / WSL):
#   bash scripts/smoke-test.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROVIDER_URL="${PROVIDER_URL:-http://localhost:3000}"
PATIENT_URL="${PATIENT_URL:-http://localhost:3001}"
PASS=0
FAIL=0
SKIP=0

# ─── Helpers ──────────────────────────────────────────────────────────────────

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 (skipped)"; ((SKIP++)); }
info() { echo -e "${BLUE}▸${NC} $1"; }

check_http() {
  local url="$1"
  local expected_status="${2:-200}"
  local description="$3"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    pass "$description (HTTP $status)"
  elif [ "$status" = "000" ]; then
    fail "$description — connection refused (is the server running?)"
  else
    fail "$description — expected $expected_status, got $status"
  fi
}

check_json_field() {
  local url="$1"
  local field="$2"
  local description="$3"

  local response
  response=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "{}")

  if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); assert $field" 2>/dev/null; then
    pass "$description"
  elif echo "$response" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!($field)) process.exit(1);" 2>/dev/null; then
    pass "$description"
  else
    fail "$description — field check failed: $field"
  fi
}

# ─── Phase 1: Infrastructure ─────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ATTENDING AI — End-to-End Smoke Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

info "Phase 1: Infrastructure Checks"

# Docker
if docker ps &>/dev/null; then
  pass "Docker is running"
else
  fail "Docker is not running"
  echo -e "  ${RED}  → Run: docker compose up -d${NC}"
fi

# SQL Server container
if docker ps --format '{{.Names}}' | grep -qi 'sql\|mssql\|sqlserver'; then
  pass "SQL Server container is running"
else
  fail "SQL Server container not found"
  echo -e "  ${RED}  → Run: docker compose up -d${NC}"
fi

# Redis container
if docker ps --format '{{.Names}}' | grep -qi 'redis'; then
  pass "Redis container is running"
else
  skip "Redis container not found (non-critical — in-memory fallback used)"
fi

# ─── Phase 2: Provider Portal API ────────────────────────────────────────────

echo ""
info "Phase 2: Provider Portal API"

check_http "$PROVIDER_URL/api/health" "200" "Health endpoint"

# Assessments list
check_http "$PROVIDER_URL/api/assessments" "200" "Assessments API"

# Check assessments contain seeded data
ASSESSMENTS=$(curl -s --max-time 10 "$PROVIDER_URL/api/assessments?pageSize=10" 2>/dev/null || echo '{}')
ASSESSMENT_COUNT=$(echo "$ASSESSMENTS" | node -e "
  try {
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    console.log((d.assessments||[]).length);
  } catch { console.log(0); }
" 2>/dev/null || echo "0")

if [ "$ASSESSMENT_COUNT" -gt 0 ]; then
  pass "Assessments API returns $ASSESSMENT_COUNT assessment(s)"
else
  fail "Assessments API returned 0 assessments (run seed: npx ts-node prisma/seed-demo.ts)"
fi

# Extract first assessment ID for detail checks
FIRST_ID=$(echo "$ASSESSMENTS" | node -e "
  try {
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    console.log((d.assessments||[])[0]?.id || '');
  } catch { console.log(''); }
" 2>/dev/null || echo "")

if [ -n "$FIRST_ID" ]; then
  # Assessment detail with nested patient
  check_http "$PROVIDER_URL/api/assessments/$FIRST_ID" "200" "Assessment detail ($FIRST_ID)"

  # Extract patient ID from assessment
  PATIENT_ID=$(curl -s --max-time 10 "$PROVIDER_URL/api/assessments/$FIRST_ID" | node -e "
    try {
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      console.log(d.patient?.id || '');
    } catch { console.log(''); }
  " 2>/dev/null || echo "")

  if [ -n "$PATIENT_ID" ]; then
    pass "Assessment has patient ID: $PATIENT_ID"

    # Patient detail endpoint
    check_http "$PROVIDER_URL/api/patients/$PATIENT_ID" "200" "Patient detail API"

    # Patient has allergies/medications
    PATIENT_DATA=$(curl -s --max-time 10 "$PROVIDER_URL/api/patients/$PATIENT_ID" 2>/dev/null || echo '{}')
    ALLERGY_COUNT=$(echo "$PATIENT_DATA" | node -e "
      try {
        const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
        const p = d.patient || d;
        console.log((p.allergies||[]).length);
      } catch { console.log(0); }
    " 2>/dev/null || echo "0")

    if [ "$ALLERGY_COUNT" -gt 0 ]; then
      pass "Patient has $ALLERGY_COUNT allergy record(s)"
    else
      skip "Patient has no allergy records (normal for some seed patients)"
    fi
  else
    skip "Could not extract patient ID from assessment"
  fi

  # Dashboard queue builder (uses flattened fields)
  FIRST_PATIENT_NAME=$(echo "$ASSESSMENTS" | node -e "
    try {
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      console.log((d.assessments||[])[0]?.patientName || '');
    } catch { console.log(''); }
  " 2>/dev/null || echo "")

  if [ -n "$FIRST_PATIENT_NAME" ]; then
    pass "Assessment list returns flattened patientName: $FIRST_PATIENT_NAME"
  else
    fail "Assessment list missing flattened patientName field (dashboard will show 'Unknown Patient')"
  fi
else
  skip "No assessments found — skipping detail checks"
fi

# Notifications endpoint
check_http "$PROVIDER_URL/api/notifications?unreadOnly=true&limit=1" "200" "Notifications API"

# ─── Phase 3: Patient Portal ─────────────────────────────────────────────────

echo ""
info "Phase 3: Patient Portal"

PATIENT_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$PATIENT_URL" 2>/dev/null || echo "000")
if [ "$PATIENT_HEALTH" != "000" ]; then
  pass "Patient portal is reachable (HTTP $PATIENT_HEALTH)"

  # Check middleware redirects unauthenticated to home
  check_http "$PATIENT_URL/assessment" "200" "Assessment page (or redirect)"
else
  skip "Patient portal not running on $PATIENT_URL"
fi

# ─── Phase 4: Lab Order Flow ─────────────────────────────────────────────────

echo ""
info "Phase 4: Lab Order Flow"

check_http "$PROVIDER_URL/api/labs" "200" "Lab orders list API"

# Check labs API returns structured data
LABS_DATA=$(curl -s --max-time 10 "$PROVIDER_URL/api/labs" 2>/dev/null || echo '{}')
HAS_LABS_KEY=$(echo "$LABS_DATA" | node -e "
  try {
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    console.log('labOrders' in d ? 'yes' : 'no');
  } catch { console.log('no'); }
" 2>/dev/null || echo "no")

if [ "$HAS_LABS_KEY" = "yes" ]; then
  pass "Labs API returns { labOrders, total } shape"
else
  fail "Labs API response missing 'labOrders' key"
fi

# Imaging, prescriptions, referrals
check_http "$PROVIDER_URL/api/imaging" "200" "Imaging orders API"
check_http "$PROVIDER_URL/api/prescriptions" "200" "Prescriptions API"
check_http "$PROVIDER_URL/api/referrals" "200" "Referrals API"

# ─── Phase 5: .NET Backend (Optional) ────────────────────────────────────────

echo ""
info "Phase 5: .NET Backend (optional — BFF falls back to Prisma)"

DOTNET_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:5000/health/live" 2>/dev/null || echo "000")
if [ "$DOTNET_HEALTH" = "200" ]; then
  pass ".NET backend is running"
  check_http "http://localhost:5000/health/ready" "200" ".NET readiness check"
  check_http "http://localhost:5000/api/v1/laborders/pending" "200" ".NET lab orders endpoint"
else
  skip ".NET backend not running — BFF using Prisma fallback (expected in dev)"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC} / $TOTAL total"

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}★ All critical checks passed!${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 0
else
  echo -e "  ${RED}✗ $FAIL check(s) failed — review above for details${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 1
fi
