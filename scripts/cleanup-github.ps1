# GitHub Directory Cleanup Script
# Run this script to remove malformed placeholder directories
# Usage: .\scripts\cleanup-github.ps1

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $projectRoot) {
    $projectRoot = "C:\Users\la6ke\Projects\ATTENDING"
}

Write-Host "ATTENDING AI - GitHub Directory Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Directories to remove (these are malformed - should be files, not directories)
$malformedDirs = @(
    ".github\workflows\ci.yml",
    ".github\workflows\deploy-production.yml",
    ".github\workflows\deploy-staging.yml",
    ".github\workflows\security-scan",
    ".github\ISSUE_TEMPLATE\bug_report.md",
    ".github\ISSUE_TEMPLATE\feature_request.md",
    ".github\ISSUE_TEMPLATE\Medical_accuracy_issue.md",
    ".github\pull_request_template.md"
)

$removedCount = 0
$errorCount = 0

foreach ($dir in $malformedDirs) {
    $fullPath = Join-Path $projectRoot $dir
    
    if (Test-Path $fullPath -PathType Container) {
        try {
            Remove-Item -Path $fullPath -Recurse -Force
            Write-Host "[REMOVED] $dir" -ForegroundColor Green
            $removedCount++
        } catch {
            Write-Host "[ERROR] Failed to remove $dir : $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "[SKIP] $dir (not found or already a file)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "  Removed: $removedCount directories" -ForegroundColor Green
Write-Host "  Errors:  $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Now let's create proper template files
Write-Host "Creating proper GitHub template files..." -ForegroundColor Cyan

# Bug Report Template
$bugReportContent = @'
---
name: Bug Report
about: Report a bug in the ATTENDING AI platform
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

## Screenshots
If applicable, add screenshots.

## Environment
- Portal: [Provider / Patient]
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]

## Clinical Impact
- [ ] Could affect patient safety
- [ ] Affects clinical workflow
- [ ] Minor inconvenience

## Additional Context
Add any other context about the problem here.
'@

# Feature Request Template
$featureRequestContent = @'
---
name: Feature Request
about: Suggest a new feature for ATTENDING AI
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
A clear description of the feature you'd like.

## Problem It Solves
What clinical or workflow problem does this address?

## Proposed Solution
How would you like this to work?

## Alternatives Considered
Any alternative solutions you've considered.

## Clinical Use Case
Describe the clinical scenario where this would be used.

## Priority
- [ ] Critical - Blocking clinical workflow
- [ ] High - Significant improvement
- [ ] Medium - Nice to have
- [ ] Low - Future consideration
'@

# Medical Accuracy Template
$medicalAccuracyContent = @'
---
name: Medical Accuracy Issue
about: Report an issue with clinical accuracy or medical content
title: '[MEDICAL] '
labels: medical-accuracy, high-priority
assignees: ''
---

## ⚠️ CRITICAL: Medical Accuracy Issue

### Issue Type
- [ ] Incorrect clinical recommendation
- [ ] Missing red flag detection
- [ ] Wrong medication dosing/interaction
- [ ] Incorrect lab/imaging interpretation
- [ ] Outdated clinical guideline
- [ ] Other medical concern

### Description
Detailed description of the medical accuracy issue.

### Current Behavior
What is the system currently showing/recommending?

### Expected Behavior (Evidence-Based)
What should it show based on current medical evidence?

### Source/Reference
Link to clinical guideline, medical literature, or expert reference.

### Patient Safety Impact
- [ ] HIGH - Could cause immediate patient harm
- [ ] MEDIUM - Could lead to suboptimal care
- [ ] LOW - Minor accuracy issue

### Specialty Area
- [ ] Emergency Medicine
- [ ] Internal Medicine
- [ ] Cardiology
- [ ] Neurology
- [ ] Other: _______

### Additional Context
Any other relevant clinical context.
'@

# Pull Request Template
$prTemplateContent = @'
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Clinical content update

## Clinical Impact Assessment
- [ ] No clinical impact
- [ ] Affects clinical recommendations
- [ ] Affects emergency detection
- [ ] Requires medical review

## Testing Completed
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Clinical scenario testing (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] HIPAA compliance verified (if applicable)

## Screenshots (if UI change)

## Related Issues
Fixes #
'@

# Create the files
$templateDir = Join-Path $projectRoot ".github\ISSUE_TEMPLATE"
if (-not (Test-Path $templateDir)) {
    New-Item -ItemType Directory -Path $templateDir -Force | Out-Null
}

Set-Content -Path (Join-Path $templateDir "bug_report.md") -Value $bugReportContent
Set-Content -Path (Join-Path $templateDir "feature_request.md") -Value $featureRequestContent
Set-Content -Path (Join-Path $templateDir "medical_accuracy_issue.md") -Value $medicalAccuracyContent
Set-Content -Path (Join-Path $projectRoot ".github\pull_request_template.md") -Value $prTemplateContent

Write-Host "[CREATED] .github/ISSUE_TEMPLATE/bug_report.md" -ForegroundColor Green
Write-Host "[CREATED] .github/ISSUE_TEMPLATE/feature_request.md" -ForegroundColor Green
Write-Host "[CREATED] .github/ISSUE_TEMPLATE/medical_accuracy_issue.md" -ForegroundColor Green
Write-Host "[CREATED] .github/pull_request_template.md" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All done! Run 'git status' to see changes." -ForegroundColor Cyan
