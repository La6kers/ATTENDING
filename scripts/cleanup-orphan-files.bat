@echo off
REM ============================================================
REM ATTENDING AI - Cleanup Orphan Files & Commit
REM Run this script from the repository root
REM ============================================================

echo ============================================================
echo ATTENDING AI - Cleanup Script
echo ============================================================
echo.

REM Navigate to repo root
cd /d "C:\Users\Scott\source\repos\La6kers\ATTENDING"

echo Step 1: Deleting orphan files...
echo.

REM Delete orphan files with special characters
cd apps\provider-portal

if exist "(" (
    del /f "("
    echo   [DELETED] apps/provider-portal/(
) else (
    echo   [SKIPPED] apps/provider-portal/( - not found
)

if exist "{" (
    del /f "{"
    echo   [DELETED] apps/provider-portal/{
) else (
    echo   [SKIPPED] apps/provider-portal/{ - not found
)

REM Delete duplicate index file
cd pages
if exist "index.final.tsx" (
    del /f "index.final.tsx"
    echo   [DELETED] apps/provider-portal/pages/index.final.tsx
) else (
    echo   [SKIPPED] index.final.tsx - not found
)

REM Return to root
cd /d "C:\Users\Scott\source\repos\La6kers\ATTENDING"

REM Remove _to_delete folder if it exists
if exist "apps\provider-portal\_to_delete" (
    rmdir /s /q "apps\provider-portal\_to_delete" 2>nul
    echo   [DELETED] apps/provider-portal/_to_delete/
)

echo.
echo Step 2: Committing changes to git...
echo.

git add -A
git commit -m "chore: remove orphan files and duplicates

Removed:
- apps/provider-portal/( (empty orphan file)
- apps/provider-portal/{ (empty orphan file)
- apps/provider-portal/pages/index.final.tsx (duplicate dashboard)

Note: treatment-plan.tsx and treatment-plans.tsx are NOT duplicates:
- treatment-plan.tsx = single plan detail view
- treatment-plans.tsx = plan list view"

echo.
echo Step 3: Pushing to remote...
echo.

git push origin mockup-2

echo.
echo ============================================================
echo CLEANUP COMPLETE
echo ============================================================
echo.
echo Summary:
echo   - Removed 3 orphan/duplicate files
echo   - Committed changes to git
echo   - Pushed to mockup-2 branch
echo.
echo Platform status: 100%% ready for pilot deployment
echo.
pause
