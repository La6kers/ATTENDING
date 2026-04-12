#!/usr/bin/env bash
# ============================================================
# ATTENDING AI - Git History Secrets Audit
# scripts/audit-git-secrets.sh
#
# Scans git history for accidentally committed secrets.
# Run from repository root: bash scripts/audit-git-secrets.sh
#
# HIPAA Requirement: Ensure no PHI, credentials, or secrets
# remain in version control history.
#
# If secrets are found:
#   1. Rotate all compromised credentials immediately
#   2. Use git-filter-repo or BFG to purge from history
#   3. Force-push and notify all collaborators
# ============================================================

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "============================================================"
echo " ATTENDING AI - Git History Secrets Audit"
echo "============================================================"
echo ""

FOUND_SECRETS=0
WARNINGS=0

# ============================================================
# 1. Check for common secret patterns in git history
# ============================================================
echo "--- Scanning git history for secret patterns ---"

PATTERNS=(
  # API keys and tokens
  'NEXTAUTH_SECRET=(?!.*\$\{)(?!.*dev-secret)'
  'SESSION_ENCRYPTION_KEY=[A-Za-z0-9+/=]{16,}'
  'AZURE_AD_CLIENT_SECRET=[A-Za-z0-9_\-]{20,}'
  'OPENAI_API_KEY=sk-[A-Za-z0-9]{20,}'
  'ANTHROPIC_API_KEY=sk-ant-[A-Za-z0-9]{20,}'
  'BIOM[iI]STRAL_API_KEY=[A-Za-z0-9]{20,}'
  # Database URLs with passwords
  'DATABASE_URL=postgresql://[^:]+:[^@]+@(?!postgres:)'
  'REDIS_URL=redis://:[^@]+@'
  # AWS
  'AKIA[0-9A-Z]{16}'
  'aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}'
  # Private keys
  'BEGIN RSA PRIVATE KEY'
  'BEGIN EC PRIVATE KEY'
  'BEGIN PRIVATE KEY'
  # .env files with real values
  'PASSWORD=[A-Za-z0-9!@#$%^&*]{8,}'
)

PATTERN_NAMES=(
  "NEXTAUTH_SECRET (hardcoded)"
  "SESSION_ENCRYPTION_KEY (raw value)"
  "Azure AD Client Secret"
  "OpenAI API Key"
  "Anthropic API Key"
  "BioMistral API Key"
  "Database URL with password"
  "Redis URL with password"
  "AWS Access Key ID"
  "AWS Secret Access Key"
  "RSA Private Key"
  "EC Private Key"
  "Generic Private Key"
  "Hardcoded password"
)

for i in "${!PATTERNS[@]}"; do
  PATTERN="${PATTERNS[$i]}"
  NAME="${PATTERN_NAMES[$i]}"
  
  # Search git log diffs for the pattern
  MATCHES=$(git log --all --diff-filter=A -p --no-color 2>/dev/null | grep -cP "$PATTERN" 2>/dev/null || true)
  
  if [ "$MATCHES" -gt 0 ]; then
    echo -e "  ${RED}FOUND${NC}: $NAME ($MATCHES occurrences)"
    FOUND_SECRETS=$((FOUND_SECRETS + MATCHES))
  fi
done

echo ""

# ============================================================
# 2. Check for .env files ever committed
# ============================================================
echo "--- Checking for .env files in git history ---"

ENV_FILES=$(git log --all --diff-filter=A --name-only --pretty=format: 2>/dev/null | grep -E '\.env($|\.)' | sort -u || true)

if [ -n "$ENV_FILES" ]; then
  echo -e "  ${YELLOW}WARNING${NC}: .env files found in git history:"
  while IFS= read -r file; do
    echo "    - $file"
    WARNINGS=$((WARNINGS + 1))
  done <<< "$ENV_FILES"
else
  echo -e "  ${GREEN}CLEAN${NC}: No .env files found in history"
fi

echo ""

# ============================================================
# 3. Check for certificate/key files
# ============================================================
echo "--- Checking for certificate/key files in git history ---"

KEY_FILES=$(git log --all --diff-filter=A --name-only --pretty=format: 2>/dev/null | grep -E '\.(pem|key|p12|pfx|jks|keystore)$' | sort -u || true)

if [ -n "$KEY_FILES" ]; then
  echo -e "  ${YELLOW}WARNING${NC}: Key/certificate files found in history:"
  while IFS= read -r file; do
    echo "    - $file"
    WARNINGS=$((WARNINGS + 1))
  done <<< "$KEY_FILES"
else
  echo -e "  ${GREEN}CLEAN${NC}: No key files found in history"
fi

echo ""

# ============================================================
# 4. Check current .gitignore coverage
# ============================================================
echo "--- Verifying .gitignore coverage ---"

REQUIRED_IGNORES=('.env' '.env.local' '.env.production' '*.pem' '*.key' 'node_modules')

for pattern in "${REQUIRED_IGNORES[@]}"; do
  if grep -q "$pattern" .gitignore 2>/dev/null; then
    echo -e "  ${GREEN}OK${NC}: .gitignore covers '$pattern'"
  else
    echo -e "  ${RED}MISSING${NC}: .gitignore does NOT cover '$pattern'"
    WARNINGS=$((WARNINGS + 1))
  fi
done

echo ""

# ============================================================
# 5. Check for secrets in current working tree
# ============================================================
echo "--- Checking current working tree ---"

CURRENT_SECRETS=0
for i in "${!PATTERNS[@]}"; do
  PATTERN="${PATTERNS[$i]}"
  NAME="${PATTERN_NAMES[$i]}"
  
  MATCHES=$(grep -rP "$PATTERN" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.yml' --include='*.yaml' --include='*.json' --include='*.env*' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | wc -l || true)
  
  if [ "$MATCHES" -gt 0 ]; then
    echo -e "  ${RED}FOUND${NC}: $NAME in current tree ($MATCHES files)"
    CURRENT_SECRETS=$((CURRENT_SECRETS + MATCHES))
  fi
done

if [ "$CURRENT_SECRETS" -eq 0 ]; then
  echo -e "  ${GREEN}CLEAN${NC}: No secrets in current working tree"
fi

echo ""

# ============================================================
# SUMMARY
# ============================================================
echo "============================================================"
echo " AUDIT SUMMARY"
echo "============================================================"

if [ "$FOUND_SECRETS" -gt 0 ]; then
  echo -e "  ${RED}CRITICAL${NC}: $FOUND_SECRETS secret(s) found in git history"
  echo "  ACTION REQUIRED:"
  echo "    1. Rotate ALL compromised credentials immediately"
  echo "    2. Install git-filter-repo: pip install git-filter-repo"
  echo "    3. Purge secrets from history"
  echo "    4. Force-push and notify all collaborators"
else
  echo -e "  ${GREEN}PASSED${NC}: No secrets found in git history"
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo -e "  ${YELLOW}WARNINGS${NC}: $WARNINGS potential issue(s) found"
fi

if [ "$CURRENT_SECRETS" -gt 0 ]; then
  echo -e "  ${RED}CURRENT TREE${NC}: $CURRENT_SECRETS secret(s) in working directory"
fi

echo ""
exit $FOUND_SECRETS
