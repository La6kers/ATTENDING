# ============================================================
# ATTENDING AI - Directory Structure Cleanup Script
# scripts/cleanup-structure.ps1
#
# Fixes .github structure and removes placeholder files
# Run: powershell -ExecutionPolicy Bypass -File scripts/cleanup-structure.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\la6ke\Projects\ATTENDING"

Write-Host "ATTENDING AI Structure Cleanup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# ============================================================
# Fix .github directory structure
# ============================================================

Write-Host "`nFixing .github structure..." -ForegroundColor Yellow

$githubDir = Join-Path $ProjectRoot ".github"

# Directories that should be files - remove them
$dirsToRemove = @(
    ".github\ISSUE_TEMPLATE\bug_report.md",
    ".github\ISSUE_TEMPLATE\feature_request.md",
    ".github\ISSUE_TEMPLATE\Medical_accuracy_issue.md",
    ".github\pull_request_template.md",
    ".github\workflows\ci.yml",
    ".github\workflows\deploy-production.yml",
    ".github\workflows\deploy-staging.yml",
    ".github\workflows\security-scan"
)

foreach ($dir in $dirsToRemove) {
    $dirPath = Join-Path $ProjectRoot $dir
    if (Test-Path $dirPath -PathType Container) {
        Write-Host "  Removing directory: $dir" -ForegroundColor Red
        Remove-Item -Recurse -Force $dirPath
    }
}

# ============================================================
# Create proper issue templates if missing
# ============================================================

$issueTemplateDir = Join-Path $githubDir "ISSUE_TEMPLATE"
if (-not (Test-Path $issueTemplateDir)) {
    New-Item -ItemType Directory -Path $issueTemplateDir -Force | Out-Null
}

# Bug Report Template
$bugReportPath = Join-Path $issueTemplateDir "bug_report.md"
if (-not (Test-Path $bugReportPath -PathType Leaf)) {
    Write-Host "  Creating: ISSUE_TEMPLATE\bug_report.md" -ForegroundColor Green
    $bugContent = @'
---
name: Bug Report
about: Report a bug in ATTENDING AI
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Portal: [Provider/Patient]

## Screenshots
If applicable, add screenshots.

## Clinical Impact
- [ ] This affects clinical decision making
- [ ] This affects patient safety
- [ ] This is a display/UI issue only
'@
    Set-Content -Path $bugReportPath -Value $bugContent -Encoding UTF8
}

# Feature Request Template
$featureRequestPath = Join-Path $issueTemplateDir "feature_request.md"
if (-not (Test-Path $featureRequestPath -PathType Leaf)) {
    Write-Host "  Creating: ISSUE_TEMPLATE\feature_request.md" -ForegroundColor Green
    $featureContent = @'
---
name: Feature Request
about: Suggest a new feature for ATTENDING AI
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
A clear description of the feature.

## Use Case
Describe the clinical or workflow scenario this addresses.

## Proposed Solution
How you envision this working.

## Alternatives Considered
Other solutions you've considered.

## Clinical Priority
- [ ] Critical - Affects patient safety
- [ ] High - Improves diagnostic accuracy  
- [ ] Medium - Improves workflow efficiency
- [ ] Low - Nice to have
'@
    Set-Content -Path $featureRequestPath -Value $featureContent -Encoding UTF8
}

# Medical Accuracy Template
$medicalAccuracyPath = Join-Path $issueTemplateDir "medical_accuracy_issue.md"
if (-not (Test-Path $medicalAccuracyPath -PathType Leaf)) {
    Write-Host "  Creating: ISSUE_TEMPLATE\medical_accuracy_issue.md" -ForegroundColor Green
    $medicalContent = @'
---
name: Medical Accuracy Issue
about: Report incorrect clinical information or recommendations
title: '[MEDICAL] '
labels: medical-accuracy, high-priority
assignees: ''
---

## Issue Summary
Brief description of the medical accuracy concern.

## Clinical Context
- Chief Complaint: 
- Patient Demographics:
- Relevant History:

## Incorrect Information
What ATTENDING AI showed/recommended that was incorrect.

## Correct Information
What the correct clinical guidance should be.

## Evidence/References
- Clinical guidelines:
- UpToDate/other sources:

## Severity
- [ ] CRITICAL - Could cause patient harm
- [ ] HIGH - Significant clinical impact
- [ ] MEDIUM - May affect decision making
- [ ] LOW - Minor inaccuracy
'@
    Set-Content -Path $medicalAccuracyPath -Value $medicalContent -Encoding UTF8
}

# ============================================================
# Create PR template if missing
# ============================================================

$prTemplatePath = Join-Path $githubDir "pull_request_template.md"
if (-not (Test-Path $prTemplatePath -PathType Leaf)) {
    Write-Host "  Creating: pull_request_template.md" -ForegroundColor Green
    $prContent = @'
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Medical/clinical update
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Clinical Review (if applicable)
- [ ] Medical content reviewed
- [ ] Clinical workflows validated
- [ ] No patient safety concerns

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Added/updated documentation
- [ ] No new warnings introduced
'@
    Set-Content -Path $prTemplatePath -Value $prContent -Encoding UTF8
}

# ============================================================
# Remove placeholder README files
# ============================================================

Write-Host "`nRemoving placeholder README files..." -ForegroundColor Yellow

$placeholderDirs = @(
    "apps\mobile",
    "infrastructure\docker",
    "infrastructure\kubernetes",
    "infrastructure\terraform",
    "services\ai-service\src",
    "docs\scripts"
)

$removedCount = 0
foreach ($dir in $placeholderDirs) {
    $fullPath = Join-Path $ProjectRoot $dir
    if (Test-Path $fullPath) {
        Get-ChildItem -Path $fullPath -Recurse -Filter "Readme.md" | ForEach-Object {
            $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content -or $content.Trim().Length -lt 50) {
                Write-Host "  Removing: $($_.FullName.Replace($ProjectRoot, '.'))" -ForegroundColor Red
                Remove-Item $_.FullName -Force
                $removedCount++
            }
        }
    }
}

Write-Host "  Removed $removedCount placeholder files" -ForegroundColor Cyan

# ============================================================
# Summary
# ============================================================

Write-Host "`nCleanup Complete!" -ForegroundColor Green
Write-Host "Run 'git status' to see changes" -ForegroundColor Gray
