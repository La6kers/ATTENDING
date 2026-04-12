# =============================================================================
# ATTENDING AI - Git Cleanup and Commit Script
# Run this script from the ATTENDING repository root directory
# =============================================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " ATTENDING AI - Git Commit Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Not in a Git repository. Please run from ATTENDING root." -ForegroundColor Red
    exit 1
}

# Step 1: Show current status
Write-Host "Step 1: Current Git Status" -ForegroundColor Yellow
Write-Host "-------------------------------------------"
git status --short
Write-Host ""

# Step 2: Remove broken workflow directories (they should be files)
Write-Host "Step 2: Cleaning up broken workflow directories..." -ForegroundColor Yellow

$brokenWorkflows = @(
    ".github\workflows\ci.yml",
    ".github\workflows\deploy-production.yml",
    ".github\workflows\deploy-staging.yml",
    ".github\workflows\security-scan"
)

foreach ($path in $brokenWorkflows) {
    if (Test-Path $path -PathType Container) {
        Write-Host "  Removing directory: $path" -ForegroundColor Gray
        Remove-Item -Recurse -Force $path
    }
}
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

# Step 3: Remove abandoned monorepo scaffolding
Write-Host "Step 3: Removing abandoned scaffolding..." -ForegroundColor Yellow

if (Test-Path "attending-medical-ai" -PathType Container) {
    Write-Host "  Removing: attending-medical-ai/" -ForegroundColor Gray
    Remove-Item -Recurse -Force "attending-medical-ai"
    Write-Host "  Done." -ForegroundColor Green
} else {
    Write-Host "  attending-medical-ai/ not found (already removed)" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Stage all changes
Write-Host "Step 4: Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

# Step 5: Show what will be committed
Write-Host "Step 5: Changes to be committed:" -ForegroundColor Yellow
Write-Host "-------------------------------------------"
git status --short
Write-Host ""

# Step 6: Commit with comprehensive message
Write-Host "Step 6: Creating commit..." -ForegroundColor Yellow

$commitMessage = @"
feat: Major platform update - Provider & Patient Portals functional

## Summary
Complete development snapshot of ATTENDING AI platform with functional 
provider and patient portals, COMPASS chat integration, and infrastructure setup.

## Provider Portal (apps/provider-portal)
- Next.js 14 with React 18 and TypeScript
- Zustand state management
- Dashboard with AI insights and patient queue
- Labs, Imaging, Medications, Treatment Plans pages
- COMPASS integration for clinical decision support

## Patient Portal (apps/patient-portal)
- Next.js 14 with XState for workflow management
- Comprehensive patient dashboard with health score
- COMPASS Health Assistant integration
- Session management and emergency handling
- Vitals tracking and medication adherence

## Shared Package (apps/shared)
- TypeScript types and interfaces
- XState machines for workflow orchestration
- Shared services layer

## HTML Prototypes (apps/frontend)
- COMPASS Chat (175KB) - Complete symptom assessment
- Lab ordering interface
- Imaging, medications, referrals interfaces
- Pre-visit dashboard

## Infrastructure
- GitHub Actions CI/CD workflows
- Docker configurations
- Kubernetes manifests (placeholder)
- Terraform configurations (placeholder)

## Documentation
- Comprehensive README
- API documentation structure
- Development guides
- Medical protocols

## Cleanup
- Removed abandoned attending-medical-ai/ scaffolding
- Fixed broken GitHub workflow configurations
- Updated .gitignore for comprehensive coverage

Co-authored-by: Claude <claude@anthropic.com>
"@

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host " Commit successful!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review the commit: git log -1" -ForegroundColor White
    Write-Host "  2. Push to remote: git push origin main" -ForegroundColor White
    Write-Host "     (or: git push origin <your-branch>)" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Note: If nothing to commit, all changes are already committed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Git log (last commit):" -ForegroundColor Yellow
Write-Host "-------------------------------------------"
git log -1 --oneline
