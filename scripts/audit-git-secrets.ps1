# ============================================================
# ATTENDING AI - Git History Secrets Audit (PowerShell)
# scripts/audit-git-secrets.ps1
#
# Run from repository root: .\scripts\audit-git-secrets.ps1
# ============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " ATTENDING AI - Git History Secrets Audit" -ForegroundColor Cyan
Write-Host "============================================================`n"

$foundSecrets = 0
$warnings = 0

# Patterns to search for
$patterns = @(
    @{ Name = "NEXTAUTH_SECRET (hardcoded)"; Pattern = "NEXTAUTH_SECRET=[A-Za-z0-9+/=]{16,}" },
    @{ Name = "SESSION_ENCRYPTION_KEY"; Pattern = "SESSION_ENCRYPTION_KEY=[A-Za-z0-9+/=]{16,}" },
    @{ Name = "Azure AD Client Secret"; Pattern = "AZURE_AD_CLIENT_SECRET=[A-Za-z0-9_\-]{20,}" },
    @{ Name = "OpenAI API Key"; Pattern = "OPENAI_API_KEY=sk-" },
    @{ Name = "Anthropic API Key"; Pattern = "ANTHROPIC_API_KEY=sk-ant-" },
    @{ Name = "Database URL with password"; Pattern = "DATABASE_URL=postgresql://\w+:\w+@(?!postgres:)" },
    @{ Name = "AWS Access Key"; Pattern = "AKIA[0-9A-Z]{16}" },
    @{ Name = "Private Key"; Pattern = "BEGIN.*PRIVATE KEY" },
    @{ Name = "Hardcoded password"; Pattern = "PASSWORD=[A-Za-z0-9!@#$%^&*]{8,}" }
)

# 1. Search git log for secrets
Write-Host "--- Scanning git history for secret patterns ---"

foreach ($p in $patterns) {
    try {
        $matches = git log --all -p --no-color 2>$null | Select-String -Pattern $p.Pattern -AllMatches
        $count = if ($matches) { @($matches).Count } else { 0 }
        
        if ($count -gt 0) {
            Write-Host "  FOUND: $($p.Name) ($count occurrences)" -ForegroundColor Red
            $foundSecrets += $count
        }
    } catch {
        # Pattern may not match, that's fine
    }
}

Write-Host ""

# 2. Check for .env files in history
Write-Host "--- Checking for .env files in git history ---"

$envFiles = git log --all --diff-filter=A --name-only --pretty=format:"" 2>$null | 
    Where-Object { $_ -match '\.env($|\.)' } | 
    Sort-Object -Unique

if ($envFiles) {
    Write-Host "  WARNING: .env files found in git history:" -ForegroundColor Yellow
    foreach ($file in $envFiles) {
        Write-Host "    - $file"
        $warnings++
    }
} else {
    Write-Host "  CLEAN: No .env files found in history" -ForegroundColor Green
}

Write-Host ""

# 3. Check .gitignore
Write-Host "--- Verifying .gitignore coverage ---"

$requiredIgnores = @('.env', '.env.local', '.env.production', '*.pem', '*.key')

foreach ($pattern in $requiredIgnores) {
    if (Get-Content .gitignore -ErrorAction SilentlyContinue | Select-String -SimpleMatch $pattern) {
        Write-Host "  OK: .gitignore covers '$pattern'" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: .gitignore does NOT cover '$pattern'" -ForegroundColor Red
        $warnings++
    }
}

Write-Host ""

# 4. Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AUDIT SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================"

if ($foundSecrets -gt 0) {
    Write-Host "  CRITICAL: $foundSecrets secret(s) found in git history" -ForegroundColor Red
    Write-Host "  ACTION: Rotate credentials, then use git-filter-repo to purge"
} else {
    Write-Host "  PASSED: No secrets found in git history" -ForegroundColor Green
}

if ($warnings -gt 0) {
    Write-Host "  WARNINGS: $warnings potential issue(s)" -ForegroundColor Yellow
}

Write-Host ""
exit $foundSecrets
